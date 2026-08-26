import { PointerEvent, RefObject, useEffect, useRef, useState } from 'react'

const MIN_SCALE = 1
const MAX_SCALE = 2.5
const ZOOM_SENSITIVITY = 0.0015
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
  onZoomChange?: (zoomPct: number) => void
}

export function ImageViewer({ src, alt, className = '', imageRef, interactive = true, cropChoroplethFrame = false, onZoomGesture, onZoomStart, onZoomEnd, onZoomChange }: ImageViewerProps) {
  const [scale, setScale] = useState(MIN_SCALE)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const scaleRef = useRef(MIN_SCALE)
  const offsetRef = useRef(offset)
  const viewer = useRef<HTMLDivElement | null>(null)
  const drag = useRef<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null)
  const lastWheel = useRef(-Infinity)

  useEffect(() => {
    const node = viewer.current
    if (!node) return
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      if (!interactive) return
      const current = scaleRef.current
      const delta = event.deltaY * (event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? node.clientHeight : 1)
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number((current * Math.exp(-delta * ZOOM_SENSITIVITY)).toFixed(4))))
      if (next === current) return
      const now = performance.now()
      if (now - lastWheel.current >= GESTURE_GAP_MS) onZoomGesture?.()
      lastWheel.current = now
      const rect = node.getBoundingClientRect()
      const cursor = { x: event.clientX - rect.left - rect.width / 2, y: event.clientY - rect.top - rect.height / 2 }
      const ratio = next / current
      const currentOffset = offsetRef.current
      const nextOffset = next === MIN_SCALE ? { x: 0, y: 0 } : {
        x: cursor.x - ratio * (cursor.x - currentOffset.x),
        y: cursor.y - ratio * (cursor.y - currentOffset.y),
      }
      if (current === MIN_SCALE && next > MIN_SCALE) onZoomStart?.()
      if (current > MIN_SCALE && next === MIN_SCALE) onZoomEnd?.()
      scaleRef.current = next
      offsetRef.current = nextOffset
      setOffset(nextOffset)
      setScale(next)
      onZoomChange?.(Math.round(next * 1000) / 10)
    }
    node.addEventListener('wheel', wheel, { passive: false })
    return () => node.removeEventListener('wheel', wheel)
  }, [interactive, onZoomChange, onZoomEnd, onZoomGesture, onZoomStart])
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactive || scale === MIN_SCALE) return
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: offset.x, originY: offset.y }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return
    const next = { x: drag.current.originX + event.clientX - drag.current.x, y: drag.current.originY + event.clientY - drag.current.y }
    offsetRef.current = next; setOffset(next)
  }
  const pointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === event.pointerId) drag.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  return <div
    ref={viewer}
    className={`image-viewer ${scale > MIN_SCALE ? 'zoomed' : ''} ${cropChoroplethFrame ? 'crop-choropleth-frame' : ''} ${className}`.trim()}
    data-scale={scale.toFixed(4)}
    onPointerDown={pointerDown}
    onPointerMove={pointerMove}
    onPointerUp={pointerUp}
    onPointerCancel={pointerUp}
  >
    <img ref={imageRef} src={src} alt={alt} draggable={false} style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }} />
  </div>
}
