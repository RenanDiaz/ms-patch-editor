import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { CATALOG } from '../model/catalog'
import { readableLabel } from './paramControl'
import { TypePicker } from './TypePicker'

/** Demo bank (FAKE data): 01 FAKE Clean = M Comp · Ba GEQ · SVT; 02 FAKE Drive = OptComp · BassDrive (Gain 60) · Ba Chorus (off) · Delay. */
const pill = () => document.querySelector('.pill.dirty')!.textContent
const current = () => document.querySelector('.now-num')!.textContent
const selectedBlock = () => document.querySelector('.slot-badge')!.textContent
const key = (k: string, mods: Partial<KeyboardEventInit> = {}) => fireEvent.keyDown(window, { key: k, ...mods })

beforeEach(() => {
  window.location.hash = '#/demo'
})
afterEach(() => {
  window.location.hash = ''
})

describe('changes vs pedal', () => {
  it('a value that differs from its default but matches the pedal is not marked changed', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /^02\s*FAKE Drive/ }))
    fireEvent.click(screen.getByRole('button', { name: 'BassDrive' }))
    const gain = screen.getByRole('slider', { name: 'Gain' }) // 60 on the pedal, default differs
    expect(gain).toHaveAttribute('aria-valuetext', '60')
    expect(gain.closest('.param')).not.toHaveClass('changed')
    fireEvent.keyDown(gain, { key: 'ArrowUp' })
    expect(screen.getByRole('slider', { name: 'Gain' })).toHaveAttribute('aria-valuetext', '61 (on pedal: 60)')
    expect(screen.getByText('on pedal:').closest('.param')).toHaveClass('changed')
  })

  it('lists each change with its own Undo, which puts back the pedal value', () => {
    render(<App />)
    const level = screen.getByRole('slider', { name: 'Level' })
    fireEvent.keyDown(level, { key: 'ArrowUp' })
    fireEvent.click(screen.getByRole('button', { name: 'M Comp: on' }))
    expect(pill()).toBe('2 unsaved changes')
    const list = screen.getByRole('complementary', { name: /Changes vs pedal/ })
    expect(list.textContent).toMatch(/1 · M Comp · Level.*100.*101/)
    fireEvent.click(within(list).getByRole('button', { name: 'Undo 1 · M Comp · Level' }))
    expect(screen.getByRole('slider', { name: 'Level' })).toHaveAttribute('aria-valuetext', '100')
    expect(pill()).toBe('1 unsaved change')
  })
})

describe('undo / redo and revert', () => {
  it('Cmd/Ctrl+Z undoes one step, Shift+Cmd/Ctrl+Z redoes it', () => {
    render(<App />)
    const level = () => screen.getByRole('slider', { name: 'Level' })
    fireEvent.keyDown(level(), { key: 'ArrowUp' })
    fireEvent.click(screen.getByRole('button', { name: 'M Comp: on' }))
    key('z', { metaKey: true })
    expect(screen.getByRole('button', { name: 'M Comp: on' })).toBeInTheDocument()
    expect(level()).toHaveAttribute('aria-valuetext', '101 (on pedal: 100)')
    key('z', { ctrlKey: true, shiftKey: true })
    expect(screen.getByRole('button', { name: 'M Comp: bypassed' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(pill()).toBe('No unsaved changes')
  })

  it('Revert asks first when there are several changes, and can be undone', () => {
    render(<App />)
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Level' }), { key: 'ArrowUp' })
    fireEvent.click(screen.getByRole('button', { name: 'M Comp: on' }))
    fireEvent.click(screen.getByRole('button', { name: 'Revert' }))
    const dialog = screen.getByRole('dialog', { hidden: true })
    expect(dialog.textContent).toMatch(/Revert 2 changes to 01\?/)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Revert 2 changes', hidden: true }))
    expect(pill()).toBe('No unsaved changes')
    key('z', { metaKey: true })
    expect(pill()).toBe('2 unsaved changes')
  })
})

describe('keyboard shortcuts', () => {
  it('↑/↓ change patch, 1-4 select a block, B toggles bypass, Cmd/Ctrl+S saves and confirms', async () => {
    render(<App />)
    key('ArrowDown')
    expect(current()).toBe('02')
    key('3')
    expect(selectedBlock()).toBe('3')
    expect(screen.getByRole('heading', { level: 2 }).textContent).toMatch(/^Ba Chorus/)
    key('b')
    expect(screen.getByRole('button', { name: 'Ba Chorus: on' })).toBeInTheDocument()
    key('s', { metaKey: true })
    expect(pill()).toBe('No unsaved changes')
    expect(await screen.findByText('Saved to 02 ✓')).toBeInTheDocument()
    key('ArrowUp')
    expect(current()).toBe('01')
  })

  it('arrow keys on a knob change the value, not the patch; nothing fires while typing a name', () => {
    render(<App />)
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Level' }), { key: 'ArrowDown' })
    expect(current()).toBe('01')
    fireEvent.click(screen.getByRole('button', { name: 'FAKE Clean' }))
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Patch name' }), { key: 'b' })
    expect(screen.getByRole('button', { name: 'M Comp: on' })).toBeInTheDocument()
  })
})

describe('patch name limit', () => {
  it('a full name field refuses more keys and says why (found in a real test)', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'FAKE Clean' }))
    const input = screen.getByRole('textbox', { name: 'Patch name' }) as HTMLInputElement
    expect(input.maxLength).toBe(10)
    fireEvent.change(input, { target: { value: 'NanchoBass' } })
    input.setSelectionRange(10, 10)
    fireEvent.keyDown(input, { key: 's' })
    expect(screen.getByText(/The pedal allows 10 characters: “s” was not added/)).toBeInTheDocument()
  })
})

describe('effect picker', () => {
  const pick = (dsp = 0) => {
    const onPick = vi.fn()
    render(<TypePicker title="Add effect" firmware={2.1} dspUsedByOthers={dsp} onPick={onPick} onClose={() => {}} />)
    return onPick
  }
  const shown = () => Array.from(document.querySelectorAll('.pick-name')).map((n) => n.firstChild?.textContent)

  it('search covers the category; Enter picks the first result', () => {
    const onPick = pick()
    const box = screen.getByRole('searchbox', { name: 'Search effects', hidden: true })
    fireEvent.change(box, { target: { value: 'delay' } })
    expect(shown()).toEqual(expect.arrayContaining(['AnalogDly', 'TapeEcho']))
    expect(shown()[0]).toBe('Delay')
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(onPick).toHaveBeenCalledWith(CATALOG.find((e) => e.name === 'Delay')!.id)
    fireEvent.change(box, { target: { value: 'driveecho' } })
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(onPick).toHaveBeenLastCalledWith(CATALOG.find((e) => e.name === 'DriveEcho')!.id)
  })

  it("marks the effects that would take the patch over 100% DSP", () => {
    pick(0.95)
    expect(document.querySelectorAll('.picker-list button.over').length).toBeGreaterThan(0)
    expect(screen.getAllByText("won't fit", { exact: false }).length).toBeGreaterThan(0)
  })
})

describe('tempo-synced values', () => {
  it('note symbols are written as text the fonts can show', () => {
    expect(readableLabel('\u{1D15F} x16')).toBe('1/4 ×16')
    expect(readableLabel('\u{1D161}.')).toBe('1/16D')
    expect(readableLabel('\u{1D15E} 3')).toBe('1/2T')
    expect(readableLabel('560')).toBe('560')
  })
})
