import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Training } from './App'

describe('locked training specification', () => {
  it('uses the approved Joy asset, wording and Region 3 answer', async () => {
    render(<Training index={0} onContinue={vi.fn()} />)
    expect(screen.getByRole('img')).toHaveAttribute('src', '/training/T0a01_J.png')
    expect(screen.getByRole('heading', { name: 'At which marked region is Variable B higher than Variable A?' })).toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('Region 3'))
    await userEvent.click(screen.getByRole('button', { name: 'Check answer' }))
    expect(screen.getByText('Correct.')).toBeInTheDocument()
  })

  it('uses the approved choropleth asset, wording and Region 2 answer', async () => {
    render(<Training index={1} onContinue={vi.fn()} />)
    expect(screen.getByRole('img')).toHaveAttribute('src', '/training/T0a01_CH.png')
    expect(screen.getByRole('heading', { name: 'Which marked region shows a low value of Variable A and a high value of Variable B?' })).toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('Region 2'))
    await userEvent.click(screen.getByRole('button', { name: 'Check answer' }))
    expect(screen.getByText('Correct.')).toBeInTheDocument()
  })
})
