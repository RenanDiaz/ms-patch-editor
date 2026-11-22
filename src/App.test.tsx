import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(() => {
  window.location.hash = ''
})

describe('App routing', () => {
  it('default route is the real-pedal editor: connect screen, no writes', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Connect' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /demo/i })).toHaveAttribute('href', '#/demo')
  })

  it('#/s1 shows the read-only S1 page with no write controls', () => {
    window.location.hash = '#/s1'
    render(<App />)
    expect(screen.getByRole('button', { name: /^connect$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /save|store|write/i })).not.toBeInTheDocument()
  })
})

describe('editor demo (fake data, #/demo)', () => {
  beforeEach(() => {
    window.location.hash = '#/demo'
  })

  it('is labelled as a demo and starts clean: Save and Revert disabled', () => {
    render(<App />)
    expect(screen.getByText('Demo')).toBeInTheDocument()
    expect(screen.getByText('No unsaved changes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Save to 01/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Revert' })).toBeDisabled()
  })

  it('bypass marks the patch dirty; Revert clears it', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'M Comp: on' }))
    expect(screen.getByText('1 unsaved change')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'M Comp: bypassed' })).toHaveTextContent('Bypass')
    fireEvent.click(screen.getByRole('button', { name: 'Revert' }))
    expect(screen.getByText('No unsaved changes')).toBeInTheDocument()
  })

  it('keyboard edits a parameter value', () => {
    render(<App />)
    const level = screen.getByRole('slider', { name: 'Level' })
    expect(level).toHaveAttribute('aria-valuetext', '100')
    fireEvent.keyDown(level, { key: 'ArrowUp' })
    expect(screen.getByRole('slider', { name: 'Level' })).toHaveAttribute('aria-valuetext', '101 (on pedal: 100)')
  })

  it('switching patch with changes asks save / revert / keep editing', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'M Comp: on' }))
    const nav = screen.getByRole('navigation', { name: 'Patches' })
    fireEvent.click(within(nav).getByRole('button', { name: /02\s*FAKE Drive/ }))
    const dialog = screen.getByRole('dialog', { hidden: true })
    expect(within(dialog).getByText(/has 1 unsaved change/)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Save and open 02', hidden: true })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Revert and open 02', hidden: true })).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep editing', hidden: true }))
    expect(screen.getByText('FAKE Clean', { selector: '.pname' })).toBeInTheDocument()
  })

  it('renames the patch from the header (Enter applies, Esc cancels)', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'FAKE Clean' }))
    const input = screen.getByRole('textbox', { name: 'Patch name' })
    fireEvent.change(input, { target: { value: 'Ñu Slap' } })
    expect(screen.getByText(/“Ñ” is not available on the pedal/)).toBeInTheDocument()
    expect(screen.getByText('6/10')).toBeInTheDocument()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByRole('button', { name: 'u Slap' })).toBeInTheDocument()
    expect(screen.getByText('1 unsaved change')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'u Slap' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Patch name' }), { target: { value: 'Otro' } })
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Patch name' }), { key: 'Escape' })
    expect(screen.getByRole('button', { name: 'u Slap' })).toBeInTheDocument()
  })
})
