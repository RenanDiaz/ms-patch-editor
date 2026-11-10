import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the S1 read page with a connect button and no write controls', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /conectar/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /guardar|store|escribir/i })).not.toBeInTheDocument()
  })
})
