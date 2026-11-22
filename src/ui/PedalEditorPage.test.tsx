import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import cap from '../protocol/__fixtures__/ms60b-bank-2026-11-10-fw2.10.json'
import { isAllowedReadMessage } from '../protocol/messages'
import { decodePatch60B } from '../protocol/patch60b'
import { fakePedal } from '../test/fakePedal'
import { PedalEditorPage } from './PedalEditorPage'
import { readPending } from './pendingRestore'

/*
 * Simulated pedal (src/test/fakePedal.ts): starts from the real capture, keeps
 * the edit buffer when leaving a patch, 0x31 only on effects 1-3.
 * Active patch at start: 28 "D Std Fuzz" (BassDrive, BaFzSmile, PitchSHFT, RackComp).
 */
const fast = { gapMs: 0, timeoutMs: 50, sleep: () => Promise.resolve(), now: () => 0 }
const bytes = (h: string) => h.split(' ').map((x) => parseInt(x, 16))
const original = cap.patches.map(bytes)
const active = cap.originalProgram
const nameOf = (i: number) => decodePatch60B(original[i]).name
const writes = (sent: number[][]) => sent.filter((m) => !isAllowedReadMessage(m))

afterEach(() => localStorage.clear())

async function connected(opts: { live?: boolean; pedal?: ReturnType<typeof fakePedal> } = {}) {
  const pedal = opts.pedal ?? fakePedal()
  const view = render(
    <PedalEditorPage
      sessionOptions={fast}
      liveDefault={opts.live ?? true}
      connect={async () => ({ transport: pedal.transport, inputName: 'ZOOM MS Series', outputName: 'ZOOM MS Series' })}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Connect' }))
  await screen.findByText(/MS-60B · firmware 2.10 · USB/)
  pedal.sent.length = 0
  return { pedal, view }
}

/** First knob of effect 1 (BassDrive); the app opens the patch on the pedal's selected effect, so select it first. */
const firstKnob = () => {
  const b = screen.getAllByRole('button', { name: 'BassDrive' }).find((x) => x.classList.contains('block-name'))!
  if (!screen.queryByLabelText('Block 1')) fireEvent.click(b)
  return screen.getAllByRole('slider')[0]
}
/** The "N unsaved changes" pill shows a number (vs "No unsaved changes"). */
const dirtyShown = () => /^\d+ unsaved/.test(document.querySelector('.pill.dirty')?.textContent ?? '')
const openBankMenu = () => fireEvent.click(screen.getByRole('button', { name: /^Bank/ }))
const settle = () => act(() => new Promise((r) => setTimeout(r, 150)))

describe('live listening (simulated pedal)', () => {
  it('a knob on effect 1 is sent with 0x31 to the buffer; the slot memory is untouched', async () => {
    const { pedal } = await connected()
    fireEvent.keyDown(firstKnob(), { key: 'ArrowUp' }) // BassDrive Gain 14 → 15
    await waitFor(() => expect(writes(pedal.sent)).toEqual([[0xf0, 0x52, 0x00, 0x5f, 0x31, 0, 2, 15, 0, 0xf7]]))
    expect(decodePatch60B(pedal.buffer).effects[0].params[0]).toBe(15)
    expect(pedal.memory[active]).toEqual(original[active])
    expect(readPending()?.slot).toBe(active)
  })

  it('bypass is sent as a whole patch (0x28)', async () => {
    const { pedal } = await connected()
    fireEvent.click(screen.getByRole('button', { name: /BassDrive: on/ }))
    await waitFor(() => expect(writes(pedal.sent).map((m) => m[4])).toEqual([0x28]))
    expect(decodePatch60B(pedal.buffer).effects[0].on).toBe(false)
  })

  it('switching patch and discarding restores the original before leaving', async () => {
    const { pedal } = await connected()
    fireEvent.keyDown(firstKnob(), { key: 'ArrowUp' })
    await waitFor(() => expect(writes(pedal.sent).length).toBe(1))
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^06\\s*${nameOf(5)}`) }))
    fireEvent.click(await screen.findByRole('button', { name: 'Revert and open 06', hidden: true }))
    await waitFor(() => expect(pedal.program).toBe(5))
    await waitFor(() => expect(readPending()).toBeNull())
    expect(pedal.memory[active]).toEqual(original[active])
  })

  it('Save writes the edited patch with Store and leaves it clean', async () => {
    const { pedal } = await connected()
    fireEvent.keyDown(firstKnob(), { key: 'ArrowUp' })
    await waitFor(() => expect(screen.getByRole('button', { name: /^Save to/ })).toBeEnabled())
    await settle()
    fireEvent.click(screen.getByRole('button', { name: /^Save to/ }))
    await waitFor(() => expect(dirtyShown()).toBe(false))
    expect(decodePatch60B(pedal.memory[active]).effects[0].params[0]).toBe(15)
    expect(writes(pedal.sent).map((m) => m[4])).toContain(0x32)
    expect(readPending()).toBeNull()
  })

  it('Revert puts the original back in the buffer', async () => {
    const { pedal } = await connected()
    fireEvent.keyDown(firstKnob(), { key: 'ArrowUp' })
    await waitFor(() => expect(writes(pedal.sent).length).toBe(1))
    fireEvent.click(screen.getByRole('button', { name: 'Revert' }))
    await waitFor(() => expect(dirtyShown()).toBe(false))
    expect(pedal.buffer).toEqual(original[active])
    expect(readPending()).toBeNull()
  })

  it('changing patch on the pedal: the app follows and restores the slot left behind, keeping the edit unsaved', async () => {
    const { pedal } = await connected()
    fireEvent.keyDown(firstKnob(), { key: 'ArrowUp' })
    await waitFor(() => expect(writes(pedal.sent).length).toBe(1))
    act(() => pedal.selectOnPedal(5)) // the pedal keeps the edited buffer in slot 28
    expect(decodePatch60B(pedal.memory[active]).effects[0].params[0]).toBe(15)
    await waitFor(() => expect(pedal.memory[active]).toEqual(original[active]))
    await waitFor(() => expect(pedal.program).toBe(5))
    expect(screen.getAllByText(nameOf(5)).length).toBeGreaterThan(0)
    expect(screen.getByLabelText('unsaved changes')).toBeInTheDocument() // 28 still edited in the app
  })

  it('a knob turned on the pedal becomes part of the edit', async () => {
    const { pedal } = await connected()
    const edited = Array.from(original[active])
    const d = decodePatch60B(edited)
    const { encodePatch60B } = await import('../protocol/patch60b')
    const next = Array.from(
      encodePatch60B(edited, { name: d.name, effects: d.effects.slice(0, d.maxFx).map((e, i) => (i === 0 ? { ...e, params: e.params.map((v, j) => (j === 0 ? 3 : v)) } : e)) }),
    )
    act(() => pedal.turnKnob(0, 2, 3, next))
    await waitFor(() => expect(firstKnob()).toHaveAttribute('aria-valuenow', '3'), { timeout: 2000 })
    expect(dirtyShown()).toBe(true)
  })

  it('switching live off puts the original back in the buffer', async () => {
    const { pedal } = await connected()
    fireEvent.keyDown(firstKnob(), { key: 'ArrowUp' })
    await waitFor(() => expect(writes(pedal.sent).length).toBe(1))
    fireEvent.click(screen.getByRole('button', { name: 'Live' }))
    await waitFor(() => expect(pedal.buffer).toEqual(original[active]))
    expect(dirtyShown()).toBe(true)
  })

  it('after an abrupt close with live changes, the next connection offers to restore the slot', async () => {
    const pedal = fakePedal()
    const first = await connected({ pedal })
    fireEvent.keyDown(firstKnob(), { key: 'ArrowUp' })
    await waitFor(() => expect(readPending()?.slot).toBe(active))
    first.view.unmount()
    act(() => pedal.selectOnPedal(5)) // nobody restores: slot 28 keeps the edit
    await connected({ pedal })
    expect(await screen.findByText(/may still hold unsaved live edits/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Restore the original', hidden: true }))
    await waitFor(() => expect(pedal.memory[active]).toEqual(original[active]))
    await waitFor(() => expect(readPending()).toBeNull())
  })
})

describe('pedal selection (simulated)', () => {
  it('opens the patch on the effect the pedal has selected', async () => {
    await connected()
    const focus = decodePatch60B(original[active]).focus
    expect(screen.getByLabelText(`Block ${focus + 1}`)).toBeInTheDocument()
  })

  it('a change made on the pedal that it does not announce is picked up by re-reading its buffer', async () => {
    const { pedal } = await connected()
    const d = decodePatch60B(pedal.buffer)
    const { encodePatch60B } = await import('../protocol/patch60b')
    // Effect 4 switched on/off on the pedal: no 0x31 is emitted.
    const edited = Array.from(encodePatch60B(pedal.buffer, { name: d.name, effects: d.effects.slice(0, d.maxFx).map((e, i) => (i === 3 ? { ...e, on: !e.on } : e)) }))
    pedal.silentEdit(edited)
    pedal.sent.length = 0
    await waitFor(() => expect(dirtyShown()).toBe(true), { timeout: 3000 })
    expect(screen.getByRole('button', { name: /RackComp: (on|bypassed)/ })).toHaveAttribute('aria-pressed', String(!d.effects[3].on))
  })
})

describe('rename on the pedal (simulated)', () => {
  it('live: the new name goes to the buffer as a 0x28; Save keeps it', async () => {
    const { pedal } = await connected()
    fireEvent.click(screen.getByRole('button', { name: nameOf(active) }))
    const input = screen.getByRole('textbox', { name: 'Patch name' })
    fireEvent.change(input, { target: { value: 'Mi Fuzz' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(decodePatch60B(pedal.buffer).name).toBe('Mi Fuzz'))
    expect(writes(pedal.sent).map((m) => m[4])).toEqual([0x28])
    await settle()
    fireEvent.click(screen.getByRole('button', { name: /^Save to/ }))
    await waitFor(() => expect(dirtyShown()).toBe(false))
    expect(decodePatch60B(pedal.memory[active]).name).toBe('Mi Fuzz')
  })
})

describe('bank backup and restore (simulated pedal)', () => {
  const mockDownloads = () => {
    const texts: string[] = []
    const blobs = new Map<string, Blob>()
    let n = 0
    URL.createObjectURL = (b: Blob) => {
      const u = `blob:${n++}`
      blobs.set(u, b)
      void b.text().then((t) => texts.push(t))
      return u
    }
    URL.revokeObjectURL = () => {}
    HTMLAnchorElement.prototype.click = function () {}
    return texts
  }

  it('Back up bank re-reads the pedal and downloads a backup file of what it holds', async () => {
    const texts = mockDownloads()
    const { pedal } = await connected()
    openBankMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: /Back up bank/ }))
    await waitFor(() => expect(texts).toHaveLength(1))
    const { parseBackupJson } = await import('../protocol/backupFile')
    expect(parseBackupJson(texts[0]).patches).toEqual(pedal.memory)
    expect(writes(pedal.sent)).toEqual([])
  })

  it('after a backup message, saving still shows "Saved to NN ✓" (found on the pedal)', async () => {
    const texts = mockDownloads()
    await connected()
    openBankMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: /Back up bank/ }))
    await waitFor(() => expect(texts).toHaveLength(1))
    fireEvent.keyDown(firstKnob(), { key: 'ArrowUp' })
    await settle()
    fireEvent.keyDown(window, { key: 's', metaKey: true })
    expect(await screen.findByText(`Saved to ${String(active + 1).padStart(2, '0')} ✓`)).toBeInTheDocument()
  })

  it('Restore bank writes only the chosen slots that differ, verifies them and returns to the active patch', async () => {
    mockDownloads()
    const { pedal } = await connected()
    const backup = { ...cap, patches: cap.patches.map((h, i) => (i === 32 ? cap.patches[6] : i === 10 ? cap.patches[7] : h)) }
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' })] } })
    const dialog = await screen.findByRole('dialog', { hidden: true })
    expect(dialog.textContent).toMatch(/33.*Empty.*Octaver/)
    expect(dialog.textContent).toMatch(/11.*Phase/)
    // Keep slot 11 as it is: write only 33.
    fireEvent.click(within(dialog).getAllByRole('checkbox', { hidden: true })[0]) // slot 11 is listed first
    fireEvent.click(screen.getByRole('button', { name: /Restore 1 patch/, hidden: true }))
    await waitFor(() => expect(screen.getByText(/1 of 1 patches restored and checked/)).toBeInTheDocument())
    expect(pedal.memory[32]).toEqual(original[6])
    expect(pedal.memory[10]).toEqual(original[10])
    expect(writes(pedal.sent).filter((m) => m[4] === 0x32).map((m) => m[8])).toEqual([32])
    expect(pedal.program).toBe(active)
  })

  it('after saving and then restoring the active patch, no false "unsaved changes" note is left behind', async () => {
    mockDownloads()
    const { pedal } = await connected()
    fireEvent.keyDown(firstKnob(), { key: 'ArrowUp' })
    await settle()
    fireEvent.click(screen.getByRole('button', { name: /^Save to/ }))
    await waitFor(() => expect(dirtyShown()).toBe(false))
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File([JSON.stringify(cap)], 'orig.json', { type: 'application/json' })] } })
    const dialog = await screen.findByRole('dialog', { hidden: true })
    fireEvent.click(within(dialog).getByRole('button', { name: /Restore 1 patch/, hidden: true }))
    await waitFor(() => expect(within(dialog).getByText(/1 of 1 patches restored/)).toBeInTheDocument())
    expect(pedal.memory[active]).toEqual(original[active])
    await act(() => new Promise((r) => setTimeout(r, 1300))) // let the buffer poll run
    expect(readPending()).toBeNull()
    expect(dirtyShown()).toBe(false)
  })

  it('refuses to back up or restore while there are unsaved changes', async () => {
    mockDownloads()
    const { pedal } = await connected({ live: false })
    fireEvent.click(screen.getByRole('button', { name: /BassDrive: on/ }))
    openBankMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: /Back up bank/ }))
    expect(await screen.findByText(/Save or revert the patches/)).toBeInTheDocument()
    expect(writes(pedal.sent)).toEqual([])
  })
})

describe('live listening off (simulated pedal)', () => {
  it('sends nothing while editing; a knob turned on the pedal with unsaved changes is a conflict', async () => {
    const { pedal } = await connected({ live: false })
    fireEvent.click(screen.getByRole('button', { name: /BassDrive: on/ }))
    await settle()
    expect(writes(pedal.sent)).toEqual([])
    act(() => pedal.turnKnob(0, 2, 10))
    expect(await screen.findByText(/Patch 28 was changed on the pedal/, {}, { timeout: 2000 })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: "Use the pedal's version", hidden: true }))
    await waitFor(() => expect(dirtyShown()).toBe(false))
  })

  it('a patch change on the pedal is shown in the header, the app stays', async () => {
    const { pedal } = await connected({ live: false })
    act(() => pedal.selectOnPedal(4))
    expect(await screen.findByText((_, el) => !!el?.classList.contains('now-sub') && /The pedal is on 05/.test(el.textContent ?? ''))).toBeInTheDocument()
    expect(screen.getAllByText(nameOf(active)).length).toBeGreaterThan(0)
  })
})

