import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(() => {
  window.location.hash = ''
})

describe('App routing', () => {
  it('#/s1 shows the read-only S1 page with no write controls', () => {
    window.location.hash = '#/s1'
    render(<App />)
    expect(screen.getByRole('button', { name: /conectar/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /guardar|store|escribir/i })).not.toBeInTheDocument()
  })
})

describe('S2 editor prototype (fake data)', () => {
  it('is labelled as fake data and starts clean: Save and Revert disabled', () => {
    render(<App />)
    expect(screen.getByText('DATOS FALSOS')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Revertir' })).toBeDisabled()
  })

  it('bypass marks the patch dirty; Revert clears it', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /M Comp activo/ }))
    expect(screen.getByText('sin guardar')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /M Comp en bypass/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Revertir' }))
    expect(screen.queryByText('sin guardar')).not.toBeInTheDocument()
  })

  it('keyboard edits a parameter value', () => {
    render(<App />)
    const level = screen.getByRole('slider', { name: 'Level' })
    expect(level).toHaveAttribute('aria-valuetext', '100')
    fireEvent.keyDown(level, { key: 'ArrowUp' })
    expect(screen.getByRole('slider', { name: 'Level' })).toHaveAttribute('aria-valuetext', '101')
  })

  it('switching patch with changes asks save / discard / cancel', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /M Comp activo/ }))
    const nav = screen.getByRole('navigation', { name: 'Patches' })
    fireEvent.click(within(nav).getByRole('button', { name: /02\s*FAKE Drive/ }))
    const dialog = screen.getByRole('dialog', { hidden: true })
    expect(within(dialog).getByText(/tiene cambios sin guardar/)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar', hidden: true }))
    expect(screen.getByText('FAKE Clean', { selector: '.pname' })).toBeInTheDocument()
  })
})
