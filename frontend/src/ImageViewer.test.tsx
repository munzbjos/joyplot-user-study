import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ImageViewer } from './ImageViewer'

describe('ImageViewer', () => {
  it('starts fitted, zooms continuously and caps at 250%', () => {
    render(<ImageViewer src="/map.png" alt="Map" />)
    const viewer = screen.getByRole('img').parentElement!
    expect(viewer).toHaveAttribute('data-scale', '1.0000')
    for (let i = 0; i < 100; i += 1) fireEvent.wheel(viewer, { deltaY: -100 })
    expect(viewer).toHaveAttribute('data-scale', '2.5000')
    expect(screen.getByRole('img')).toHaveStyle({ transform: 'translate(0px, 0px) scale(2.5)' })
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
    expect(screen.getByRole('img').getAttribute('style')).toContain('translate(20px, 30px) scale(1.0356')
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

  it('starts a new gesture after a 500ms gap', () => {
    const gesture = vi.fn()
    let now = 100
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => now)
    render(<ImageViewer src="/map.png" alt="Map" onZoomGesture={gesture} />)
    const viewer = screen.getByRole('img').parentElement!
    fireEvent.wheel(viewer, { deltaY: -5 }); now = 599; fireEvent.wheel(viewer, { deltaY: -5 }); now = 1100; fireEvent.wheel(viewer, { deltaY: -5 })
    expect(gesture).toHaveBeenCalledTimes(2)
    clock.mockRestore()
  })

  it('keeps the point under the cursor anchored and reports continuous zoom precision', () => {
    const changed = vi.fn()
    render(<ImageViewer src="/map.png" alt="Map" onZoomChange={changed} />)
    const viewer = screen.getByRole('img').parentElement!
    vi.spyOn(viewer, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 1000, bottom: 700, width: 1000, height: 700, toJSON: () => ({}) })
    fireEvent.wheel(viewer, { deltaY: -100, clientX: 750, clientY: 350 })
    expect(viewer).toHaveAttribute('data-scale', '1.0356')
    const translatedX = Number(screen.getByRole('img').getAttribute('style')!.match(/translate\(([-\d.]+)px/)![1])
    expect(translatedX).toBeCloseTo(-8.905, 3)
    expect(changed).toHaveBeenLastCalledWith(103.6)
  })

  it('produces many unsnapped intermediate values for small trackpad deltas', () => {
    const values: number[] = []
    render(<ImageViewer src="/map.png" alt="Map" onZoomChange={value => values.push(value)} />)
    const viewer = screen.getByRole('img').parentElement!
    for (let i = 0; i < 20; i += 1) fireEvent.wheel(viewer, { deltaY: -2 })
    expect(new Set(values).size).toBeGreaterThan(10)
    expect(Number(viewer.getAttribute('data-scale'))).toBeGreaterThan(1)
    expect(Number(viewer.getAttribute('data-scale'))).toBeLessThan(1.02)
  })

  it('does not log a zoom gesture when the scale cannot change', () => {
    const gesture = vi.fn()
    render(<ImageViewer src="/map.png" alt="Map" onZoomGesture={gesture} />)
    fireEvent.wheel(screen.getByRole('img').parentElement!, { deltaY: 100 })
    expect(gesture).not.toHaveBeenCalled()
  })

  it('cancels wheel scrolling only inside the viewer', () => {
    render(<><ImageViewer src="/map.png" alt="Map" /><div data-testid="outside" /></>)
    const inside = new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true })
    screen.getByRole('img').parentElement!.dispatchEvent(inside)
    expect(inside.defaultPrevented).toBe(true)
    const outside = new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true })
    screen.getByTestId('outside').dispatchEvent(outside)
    expect(outside.defaultPrevented).toBe(false)
  })

  it('applies the measured fixed frame crop only when explicitly requested', () => {
    const { rerender } = render(<ImageViewer src="/map.png" alt="Map" />)
    expect(screen.getByRole('img').parentElement).not.toHaveClass('crop-choropleth-frame')
    rerender(<ImageViewer src="/map.png" alt="Map" cropChoroplethFrame />)
    expect(screen.getByRole('img').parentElement).toHaveClass('crop-choropleth-frame')
  })

  it.each([
    { src: '/training/T0a01_J.png', alt: 'T0 Joy' },
    { src: '/training/T0a01_CH.png', alt: 'T0 Choropleth' },
    { src: '/stimuli/T1a01_CZP1_J.png', alt: 'measured Joy' },
    { src: '/stimuli/T1a01_CZP1_CH.png', alt: 'measured Choropleth' },
  ])('supports continuous zoom QA for $alt ($src)', ({ src, alt }) => {
    render(<ImageViewer src={src} alt={alt} />)
    const viewer = screen.getByRole('img').parentElement!
    expect(viewer).toHaveAttribute('data-scale', '1.0000')
    fireEvent.wheel(viewer, { deltaY: -1342.87 })
    expect(Number(viewer.getAttribute('data-scale'))).toBeCloseTo(1.6, 2)
    fireEvent.pointerDown(viewer, { pointerId: 7, clientX: 10, clientY: 10 })
    fireEvent.pointerMove(viewer, { pointerId: 7, clientX: 25, clientY: 30 })
    fireEvent.pointerUp(viewer, { pointerId: 7, clientX: 25, clientY: 30 })
    expect(screen.getByRole('img').getAttribute('style')).toContain('translate(15px, 20px)')
    fireEvent.wheel(viewer, { deltaY: -909.97 })
    expect(Number(viewer.getAttribute('data-scale'))).toBeCloseTo(2.2, 2)
    fireEvent.wheel(viewer, { deltaY: -500 })
    expect(viewer).toHaveAttribute('data-scale', '2.5000')
    fireEvent.wheel(viewer, { deltaY: 10000 })
    expect(viewer).toHaveAttribute('data-scale', '1.0000')
    expect(screen.getByRole('img')).toHaveStyle({ transform: 'translate(0px, 0px) scale(1)' })
    expect(screen.getByRole('img')).toHaveAttribute('src', src)
  })
})
