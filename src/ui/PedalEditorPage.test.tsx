import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  fireEvent.click(screen.getByRole('button', { name: 'Conectar' }))
  await screen.findByText(/PEDAL · fw 2.10/)
  pedal.sent.length = 0
  return { pedal, view }
}

const firstKnob = () => screen.getAllByRole('slider')[0]
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
    fireEvent.click(screen.getByRole('button', { name: /BassDrive activo/ }))
    await waitFor(() => expect(writes(pedal.sent).map((m) => m[4])).toEqual([0x28]))
    expect(decodePatch60B(pedal.buffer).effects[0].on).toBe(false)
  })

  it('switching patch and discarding restores the original before leaving', async () => {
    const { pedal } = await connected()
    fireEvent.keyDown(firstKnob(), { key: 'ArrowUp' })
    await waitFor(() => expect(writes(pedal.sent).length).toBe(1))
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^06\\s*${nameOf(5)}`) }))
    fireEvent.click(await screen.findByRole('button', { name: 'Descartar', hidden: true }))
    await waitFor(() => expect(pedal.program).toBe(5))
    await waitFor(() => expect(readPending()).toBeNull())
    expect(pedal.memory[active]).toEqual(original[active])
  })

  it('Save writes the edited patch with Store and leaves it clean', async () => {
    const { pedal } = await connected()
    fireEvent.keyDown(firstKnob(), { key: 'ArrowUp' })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled())
    await settle()
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(screen.queryByText('sin guardar')).not.toBeInTheDocument())
    expect(decodePatch60B(pedal.memory[active]).effects[0].params[0]).toBe(15)
    expect(writes(pedal.sent).map((m) => m[4])).toContain(0x32)
    expect(readPending()).toBeNull()
  })

  it('Revert puts the original back in the buffer', async () => {
    const { pedal } = await connected()
    fireEvent.keyDown(firstKnob(), { key: 'ArrowUp' })
    await waitFor(() => expect(writes(pedal.sent).length).toBe(1))
    fireEvent.click(screen.getByRole('button', { name: 'Revertir' }))
    await waitFor(() => expect(screen.queryByText('sin guardar')).not.toBeInTheDocument())
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
    expect(screen.getByLabelText('cambios sin guardar')).toBeInTheDocument() // 28 still edited in the app
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
    expect(screen.getByText('sin guardar')).toBeInTheDocument()
  })

  it('switching live off puts the original back in the buffer', async () => {
    const { pedal } = await connected()
    fireEvent.keyDown(firstKnob(), { key: 'ArrowUp' })
    await waitFor(() => expect(writes(pedal.sent).length).toBe(1))
    fireEvent.click(screen.getByLabelText(/En vivo/))
    await waitFor(() => expect(pedal.buffer).toEqual(original[active]))
    expect(screen.getByText('sin guardar')).toBeInTheDocument()
  })

  it('after an abrupt close with live changes, the next connection offers to restore the slot', async () => {
    const pedal = fakePedal()
    const first = await connected({ pedal })
    fireEvent.keyDown(firstKnob(), { key: 'ArrowUp' })
    await waitFor(() => expect(readPending()?.slot).toBe(active))
    first.view.unmount()
    act(() => pedal.selectOnPedal(5)) // nobody restores: slot 28 keeps the edit
    await connected({ pedal })
    expect(await screen.findByText(/pudo quedar con cambios sin guardar/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar' }))
    await waitFor(() => expect(pedal.memory[active]).toEqual(original[active]))
    await waitFor(() => expect(readPending()).toBeNull())
  })
})

describe('rename on the pedal (simulated)', () => {
  it('live: the new name goes to the buffer as a 0x28; Save keeps it', async () => {
    const { pedal } = await connected()
    fireEvent.click(screen.getByRole('button', { name: nameOf(active) }))
    const input = screen.getByRole('textbox', { name: 'Nombre del patch' })
    fireEvent.change(input, { target: { value: 'Mi Fuzz' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(decodePatch60B(pedal.buffer).name).toBe('Mi Fuzz'))
    expect(writes(pedal.sent).map((m) => m[4])).toEqual([0x28])
    await settle()
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(screen.queryByText('sin guardar')).not.toBeInTheDocument())
    expect(decodePatch60B(pedal.memory[active]).name).toBe('Mi Fuzz')
  })
})

describe('live listening off (simulated pedal)', () => {
  it('sends nothing while editing; a knob turned on the pedal with unsaved changes is a conflict', async () => {
    const { pedal } = await connected({ live: false })
    fireEvent.click(screen.getByRole('button', { name: /BassDrive activo/ }))
    await settle()
    expect(writes(pedal.sent)).toEqual([])
    act(() => pedal.turnKnob(0, 2, 10))
    expect(await screen.findByText(/Conflicto en 28/, {}, { timeout: 2000 })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Usar la del pedal' }))
    await waitFor(() => expect(screen.queryByText('sin guardar')).not.toBeInTheDocument())
  })

  it('a patch change on the pedal is shown in the header, the app stays', async () => {
    const { pedal } = await connected({ live: false })
    act(() => pedal.selectOnPedal(4))
    expect(await screen.findByText(/pedal en 05/)).toBeInTheDocument()
    expect(screen.getAllByText(nameOf(active)).length).toBeGreaterThan(0)
  })
})

