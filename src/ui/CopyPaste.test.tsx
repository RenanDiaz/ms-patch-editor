import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '../App'

/** Demo bank (FAKE data): 01 FAKE Clean = M Comp · Ba GEQ · SVT; 02 FAKE Drive = OptComp · BassDrive (Gain 60) · Ba Chorus (off) · Delay. */
const chain = () => Array.from(document.querySelectorAll('.slot.block .block-name')).map((b) => b.textContent)
const block = (name: string) => Array.from(document.querySelectorAll('.slot.block')).find((s) => s.querySelector('.block-name')?.textContent === name) as HTMLElement
const openPatch = (label: RegExp) => fireEvent.click(screen.getByRole('button', { name: label }))

beforeEach(() => {
  window.location.hash = '#/demo'
})
afterEach(() => {
  window.location.hash = ''
})

describe('copy and paste a block between patches (P1)', () => {
  it('copies BassDrive with its params from FAKE Drive and replaces a block of FAKE Clean', () => {
    render(<App />)
    openPatch(/^02\s*FAKE Drive/)
    fireEvent.click(within(block('BassDrive')).getByRole('button', { name: 'Copiar bloque' }))
    openPatch(/^01\s*FAKE Clean/)
    const bar = screen.getByRole('region', { name: 'Portapapeles' })
    expect(bar.textContent).toMatch(/BassDrive.*bloque 2 de 02 FAKE Drive/)
    fireEvent.click(block('Ba GEQ').querySelector('.block-name')!)
    fireEvent.click(within(bar).getByRole('button', { name: 'Reemplazar bloque 2' }))
    expect(chain()).toEqual(['M Comp', 'BassDrive', 'SVT'])
    expect(screen.getByRole('slider', { name: 'Gain' })).toHaveAttribute('aria-valuenow', '60')
    expect(screen.getByText('sin guardar')).toBeInTheDocument()
  })

  it('inserts, and with 4 blocks says which one is dropped', () => {
    render(<App />)
    openPatch(/^02\s*FAKE Drive/)
    fireEvent.click(within(block('Delay')).getByRole('button', { name: 'Copiar bloque' }))
    openPatch(/^01\s*FAKE Clean/)
    const bar = screen.getByRole('region', { name: 'Portapapeles' })
    fireEvent.click(block('M Comp').querySelector('.block-name')!)
    fireEvent.click(within(bar).getByRole('button', { name: 'Insertar después de 1' }))
    expect(chain()).toEqual(['M Comp', 'Delay', 'Ba GEQ', 'SVT'])
    fireEvent.click(within(bar).getByRole('button', { name: /Insertar antes de 2 \(se quita SVT\)/ }))
    expect(chain()).toEqual(['M Comp', 'Delay', 'Delay', 'Ba GEQ'])
  })

  it('keyboard: Cmd/Ctrl+C copies the selected block, Cmd/Ctrl+V replaces the selected block', () => {
    render(<App />)
    fireEvent.click(block('SVT').querySelector('.block-name')!)
    fireEvent.keyDown(window, { key: 'c', metaKey: true })
    fireEvent.click(block('M Comp').querySelector('.block-name')!)
    fireEvent.keyDown(window, { key: 'v', ctrlKey: true })
    expect(chain()).toEqual(['SVT', 'Ba GEQ', 'SVT'])
  })
})
