import { describe, expect, it, vi } from 'vitest'
import { afterVisiblePaint, preloadAndDecode } from './timing'

describe('afterVisiblePaint', () => {
  it('starts timing only after two animation frames', () => {
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(performance, 'now').mockReturnValue(42.5)
    const callback = vi.fn()
    afterVisiblePaint(callback)
    expect(callback).not.toHaveBeenCalled()
    frames.shift()!(0)
    expect(callback).not.toHaveBeenCalled()
    frames.shift()!(16)
    expect(callback).toHaveBeenCalledWith(42.5)
  })
})

describe('preloadAndDecode', () => {
  it('waits for decode for every image', async () => {
    const decodes: Array<ReturnType<typeof vi.fn>> = []
    class MockImage {
      onload: null | (() => void) = null
      onerror: null | (() => void) = null
      decode = vi.fn().mockResolvedValue(undefined)
      set src(_value: string) { decodes.push(this.decode); queueMicrotask(() => this.onload?.()) }
    }
    vi.stubGlobal('Image', MockImage)
    await preloadAndDecode(['/one.png', '/two.png'])
    expect(decodes).toHaveLength(2)
    expect(decodes.every(decode => decode.mock.calls.length === 1)).toBe(true)
  })
})
