import { PointerEvent, RefObject, useEffect, useRef, useState } from 'react'

const MIN_SCALE = 1
const MAX_SCALE = 2
const SCALE_STEP = 0.1
const GESTURE_GAP_MS = 500

interface ImageViewerProps {
  src: string
  alt: string
  className?: string
  imageRef?: RefObject<HTMLImageElement | null>
  interactive?: boolean
  cropChoroplethFrame?: boolean
  onZoomGesture?: () => void
  onZoomStart?: () => void
  onZoomEnd?: () => void
}

export function ImageViewer({ src, alt, className = '', imageRef, interactive = true, cropChoroplethFrame = false, onZoomGesture, onZoomStart, onZoomEnd }: ImageViewerProps) {
  const [scale, setScale] = useState(MIN_SCALE)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const viewer = useRef<HTMLDivElement | null>(null)
  const drag = useRef<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null)
  const lastWheel = useRef(-Infinity)

  useEffect(() => {
    const node = viewer.current
    if (!node) return
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      if (!interactive) return
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number((scale + (event.deltaY < 0 ? SCALE_STEP : -SCALE_STEP)).toFixed(1))))
      if (next === scale) return
      const now = performance.now()
      if (now - lastWheel.current >= GESTURE_GAP_MS) onZoomGesture?.()
      lastWheel.current = now
      if (scale === MIN_SCALE && next > MIN_SCALE) onZoomStart?.()
      if (scale > MIN_SCALE && next === MIN_SCALE) { setOffset({ x: 0, y: 0 }); onZoomEnd?.() }
      setScale(next)
    }
    node.addEventListener('wheel', wheel, { passive: false })
    return () => node.removeEventListener('wheel', wheel)
  }, [interactive, onZoomEnd, onZoomGesture, onZoomStart, scale])
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactive || scale === MIN_SCALE) return
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: offset.x, originY: offset.y }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return
    setOffset({ x: drag.current.originX + event.clientX - drag.current.x, y: drag.current.originY + event.clientY - drag.current.y })
  }
  const pointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === event.pointerId) drag.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  return <div
    ref={viewer}
    className={`image-viewer ${scale > MIN_SCALE ? 'zoomed' : ''} ${cropChoroplethFrame ? 'crop-choropleth-frame' : ''} ${className}`.trim()}
    data-scale={scale.toFixed(1)}
    onPointerDown={pointerDown}
    onPointerMove={pointerMove}
    onPointerUp={pointerUp}
    onPointerCancel={pointerUp}
  >
    <img ref={imageRef} src={src} alt={alt} draggable={false} style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }} />
  </div>
}
