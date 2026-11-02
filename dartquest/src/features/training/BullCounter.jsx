import { useLayoutEffect, useRef } from 'react'

export default function BullCounter({ value }) {
  const text = useRef(null)
  useLayoutEffect(() => {
    let active = true
    const center = () => {
      if (!active || !text.current) return
      const style = getComputedStyle(text.current)
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      // Match SVG spacing: tabular numeral substitution changes the width of 11.
      context.fontKerning = 'none'
      const ink = context.measureText(String(value))
      const width = ink.actualBoundingBoxLeft + ink.actualBoundingBoxRight
      const scale = Math.min(1, 96 / Math.max(1, width))
      const x = (ink.actualBoundingBoxLeft - ink.actualBoundingBoxRight) / 2
      const y = (ink.actualBoundingBoxAscent - ink.actualBoundingBoxDescent) / 2
      text.current.setAttribute('transform', `translate(58 58) scale(${scale}) translate(${x} ${y})`)
    }
    center()
    document.fonts?.ready.then(center)
    return () => { active = false }
  }, [value])
  return <strong aria-label={String(value)}><svg className="custom-bull-number" viewBox="0 0 116 116" aria-hidden="true"><text ref={text} x="0" y="0">{value}</text></svg></strong>
}

