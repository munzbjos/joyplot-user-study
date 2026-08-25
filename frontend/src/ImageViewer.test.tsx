import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ImageViewer } from './ImageViewer'

describe('ImageViewer', () => {
  it('starts fitted, preserves the image, zooms by wheel and caps at 200%', () => {
    render(<ImageViewer src="/map.png" alt="Map" />)
    const viewer = screen.getByRole('img').parentElement!
    expect(viewer).toHaveAttribute('data-scale', '1.0')
    for (let i = 0; i < 20; i += 1) fireEvent.wheel(viewer, { deltaY: -100 })
    expect(viewer).toHaveAttribute('data-scale', '2.0')
    expect(screen.getByRole('img')).toHaveStyle({ transform: 'translate(0px, 0px) scale(2)' })
  })

  it('supports click-drag pan only while zoomed', () => {
    render(<ImageViewer src="/map.png" alt="Map" />)
    const viewer = screen.getByRole('img').parentElement!
    fireEvent.pointerDown(viewer, { pointerId: 1, clientX: 10, clientY: 10 })
    fireEvent.pointerMove(viewer, { pointerId: 1, clientX: 30, clientY: 40 })
    expect(screen.getByRole('img')).toHaveStyle({ transform: 'translate(0px, 0px) scale(1)' })
    fireEvent.wheel(viewer, { deltaY: -100 })
    fireEvent.pointerDown(viewer, { pointerId: 1, clientX: 10, clientY: 10 })
    fireEvent.pointerMove(viewer, { pointerId: 1, clientX: 30, clientY: 40 })
    expect(screen.getByRole('img')).toHaveStyle({ transform: 'translate(20px, 30px) scale(1.1)' })
  })

  it('groups wheel events into gestures and reports zoom lifecycle', () => {
    const gesture = vi.fn(); const start = vi.fn(); const end = vi.fn()
    render(<ImageViewer src="/map.png" alt="Map" onZoomGesture={gesture} onZoomStart={start} onZoomEnd={end} />)
    const viewer = screen.getByRole('img').parentElement!
    fireEvent.wheel(viewer, { deltaY: -100 }); fireEvent.wheel(viewer, { deltaY: -100 })
    expect(gesture).toHaveBeenCalledTimes(1); expect(start).toHaveBeenCalledTimes(1)
    fireEvent.wheel(viewer, { deltaY: 100 }); fireEvent.wheel(viewer, { deltaY: 100 })
    expect(end).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('img')).toHaveStyle({ transform: 'translate(0px, 0px) scale(1)' })
  })

  it('does not log a zoom gesture when the scale cannot change', () => {
    const gesture = vi.fn()
    render(<ImageViewer src="/map.png" alt="Map" onZoomGesture={gesture} />)
    fireEvent.wheel(screen.getByRole('img').parentElement!, { deltaY: 100 })
    expect(gesture).not.toHaveBeenCalled()
  })

  it.each([
    ['/training/T0a01_J.png', 'T0 Joy'],
    ['/training/T0a01_CH.png', 'T0 Choropleth'],
    ['/stimuli/T1a01_CZP1_J.png', 'measured Joy'],
    ['/stimuli/T1a01_CZP1_CH.png', 'measured Choropleth'],
  ])('supports the 100%%, 150%% and 200%% QA sequence for %s', (src, alt) => {
    render(<ImageViewer src={src} alt={alt} />)
    const viewer = screen.getByRole('img').parentElement!
    expect(viewer).toHaveAttribute('data-scale', '1.0')
    for (let i = 0; i < 5; i += 1) fireEvent.wheel(viewer, { deltaY: -100 })
    expect(viewer).toHaveAttribute('data-scale', '1.5')
    fireEvent.pointerDown(viewer, { pointerId: 7, clientX: 10, clientY: 10 })
    fireEvent.pointerMove(viewer, { pointerId: 7, clientX: 25, clientY: 30 })
    fireEvent.pointerUp(viewer, { pointerId: 7, clientX: 25, clientY: 30 })
    expect(screen.getByRole('img')).toHaveStyle({ transform: 'translate(15px, 20px) scale(1.5)' })
    for (let i = 0; i < 5; i += 1) fireEvent.wheel(viewer, { deltaY: -100 })
    expect(viewer).toHaveAttribute('data-scale', '2.0')
    for (let i = 0; i < 10; i += 1) fireEvent.wheel(viewer, { deltaY: 100 })
    expect(viewer).toHaveAttribute('data-scale', '1.0')
    expect(screen.getByRole('img')).toHaveStyle({ transform: 'translate(0px, 0px) scale(1)' })
    expect(screen.getByRole('img')).toHaveAttribute('src', src)
  })
})
