import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import cap from '../protocol/__fixtures__/ms60b-bank-2026-11-10-fw2.10.json'
import { isAllowedReadMessage } from '../protocol/messages'
import { decodePatch60B } from '../protocol/patch60b'
import { fakePedal } from '../test/fakePedal'
import { PedalEditorPage } from './PedalEditorPage'

const fast = { gapMs: 0, timeoutMs: 50, sleep: () => Promise.resolve(), now: () => 0 }
const active = cap.originalProgram // 27 → patch 28
const activeName = decodePatch60B(cap.patches[active].split(' ').map((x) => parseInt(x, 16))).name

async function connected() {
  const pedal = fakePedal()
  render(
    <PedalEditorPage
      sessionOptions={fast}
      connect={async () => ({ transport: pedal.transport, inputName: 'ZOOM MS Series', outputName: 'ZOOM MS Series' })}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Conectar' }))
  await screen.findByText(/PEDAL · fw 2.10/)
  return pedal
}

describe('editor on the pedal (simulated, read-only)', () => {
  it('loads the real bank, opens the active patch, Save is disabled with a reason', async () => {
    const pedal = await connected()
    expect(screen.getAllByText(activeName).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Guardar' })).toHaveAttribute('title', expect.stringMatching(/solo lectura/))
    pedal.sent.forEach((m) => expect(isAllowedReadMessage(m)).toBe(true))
  })

  it('Revert re-reads the slot from the pedal', async () => {
    const pedal = await connected()
    fireEvent.click(screen.getAllByRole('button', { name: /activo|bypass/ }).find((b) => b.classList.contains('led'))!)
    expect(screen.getByText('sin guardar')).toBeInTheDocument()
    pedal.sent.length = 0
    fireEvent.click(screen.getByRole('button', { name: 'Revertir' }))
    await waitFor(() => expect(screen.queryByText('sin guardar')).not.toBeInTheDocument())
    expect(pedal.sent).toEqual([[0xf0, 0x52, 0x00, 0x5f, 0x29, 0xf7]])
  })

  it('a knob turned on the pedal with unsaved changes here shows a conflict; "use the pedal" takes its version', async () => {
    const pedal = await connected()
    fireEvent.click(screen.getAllByRole('button', { name: /activo|bypass/ }).find((b) => b.classList.contains('led'))!)
    const renamed = pedal.memory[active].slice()
    ;'PEDALEDIT '.split('').forEach((c, i) => (renamed[[91, 92, 94, 95, 96, 97, 98, 99, 100, 102][i]] = c.charCodeAt(0)))
    pedal.turnKnob(0, 2, 10, renamed)
    expect(await screen.findByText(/Conflicto en 28/, {}, { timeout: 2000 })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Usar la del pedal' }))
    await waitFor(() => expect(screen.getAllByText('PEDALEDIT').length).toBeGreaterThan(0))
    expect(screen.queryByText('sin guardar')).not.toBeInTheDocument()
    pedal.sent.forEach((m) => expect(isAllowedReadMessage(m)).toBe(true))
  })

  it('without unsaved changes, a knob turned on the pedal just refreshes the patch', async () => {
    const pedal = await connected()
    const renamed = pedal.memory[active].slice()
    ;'FROMPEDAL '.split('').forEach((c, i) => (renamed[[91, 92, 94, 95, 96, 97, 98, 99, 100, 102][i]] = c.charCodeAt(0)))
    pedal.turnKnob(0, 2, 10, renamed)
    await waitFor(() => expect(screen.getAllByText('FROMPEDAL').length).toBeGreaterThan(0), { timeout: 2000 })
    expect(screen.queryByText(/Conflicto/)).not.toBeInTheDocument()
  })

  it('a patch change on the pedal is shown in the header', async () => {
    const pedal = await connected()
    pedal.selectOnPedal(4)
    expect(await screen.findByText(/pedal en 05/)).toBeInTheDocument()
  })
})
