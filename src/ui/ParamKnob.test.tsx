import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CATALOG } from '../model/catalog'
import { ParamKnob } from './ParamKnob'
import { paramKind, paramScale, parseTyped } from './paramControl'

const effect = (n: string) => CATALOG.find((e) => e.name === n)!
const param = (e: string, p: string) => effect(e).params.find((x) => x.name === p)!
const FW = 2.1

describe('paramControl', () => {
  it('kind: two values → toggle, labels/cabinets → list, else number', () => {
    expect(paramKind(param('D Comp', 'ATTCK'), FW)).toBe('toggle')
    expect(paramKind(param('SVT', 'CAB'), FW)).toBe('list')
    expect(paramKind(param('D Comp', 'Level'), FW)).toBe('number')
  })
  it('parseTyped: exact label, else closest shown number', () => {
    const lvl = paramScale(param('D Comp', 'Level'), FW)
    expect(parseTyped(lvl, '120')).toBe(120)
    expect(parseTyped(lvl, '999')).toBe(150) // clamped to the range
    expect(parseTyped(lvl, 'abc')).toBeNull()
    const att = paramScale(param('D Comp', 'ATTCK'), FW)
    expect(parseTyped(att, 'fast')).toBe(1)
  })
})

describe('ParamKnob', () => {
  it('double-click on the value lets you type it; Enter applies, Escape cancels', () => {
    const onChange = vi.fn()
    render(<ParamKnob def={param('D Comp', 'Level')} raw={100} firmware={FW} onChange={onChange} />)
    fireEvent.doubleClick(screen.getByText('100'))
    const input = screen.getByRole('textbox', { name: /escribir valor/ })
    fireEvent.change(input, { target: { value: '120' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith(120)
    fireEvent.doubleClick(screen.getByText('100'))
    fireEvent.change(screen.getByRole('textbox', { name: /escribir valor/ }), { target: { value: '5' } })
    fireEvent.keyDown(screen.getByRole('textbox', { name: /escribir valor/ }), { key: 'Escape' })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('double-click, Alt+click and Delete on the knob reset to the default', () => {
    const onChange = vi.fn()
    const def = param('D Comp', 'Level')
    render(<ParamKnob def={def} raw={140} firmware={FW} onChange={onChange} />)
    const knob = screen.getByRole('slider', { name: 'Level' })
    fireEvent.doubleClick(knob)
    fireEvent.pointerDown(knob, { altKey: true, pointerId: 1 })
    fireEvent.keyDown(knob, { key: 'Delete' })
    expect(onChange.mock.calls).toEqual([[def.def], [def.def], [def.def]])
  })

  it('a two-state parameter is a switch: click toggles', () => {
    const onChange = vi.fn()
    render(<ParamKnob def={param('D Comp', 'ATTCK')} raw={1} firmware={FW} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /ATTCK: Fast/ }))
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('a cabinet parameter is a drop-down of the firmware table', () => {
    const onChange = vi.fn()
    const def = param('SVT', 'CAB')
    const scale = paramScale(def, FW)
    render(<ParamKnob def={def} raw={scale.toRaw(0)} firmware={FW} onChange={onChange} />)
    const select = screen.getByRole('combobox', { name: /CAB/ })
    expect(select.querySelectorAll('option')).toHaveLength(scale.steps)
    fireEvent.change(select, { target: { value: '2' } })
    expect(onChange).toHaveBeenCalledWith(scale.toRaw(2))
  })
})
