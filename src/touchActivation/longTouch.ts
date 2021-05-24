import ReactInputPosition from ".."

function touchStart(this: ReactInputPosition, e: TouchEvent): void {
  this.touched = true
  this.justTouched = true

  if (this.longTouchTimer) clearTimeout(this.longTouchTimer)

  const touch = e.touches[0]
  const position = { x: touch.clientX, y: touch.clientY }
  this.longTouchStartRef = position.x + position.y
  this.startLongTouchTimer(position)
}

function touchEnd(this: ReactInputPosition, e: TouchEvent): void {
  if (e.cancelable) e.preventDefault()

  this.touched = false
  this.justTouched = false
}

function touchMove(this: ReactInputPosition, e: TouchEvent): void {
  const touch = e.touches[0]
  const position = { x: touch.clientX, y: touch.clientY }
  const end = position.x + position.y
  const diff = Math.abs(this.longTouchStartRef - end)

  if (diff > this.props.longTouchMoveLimit) {
    if (this.longTouchTimer) clearTimeout(this.longTouchTimer)
  }

  if (!this.getState().active) return
  if (e.cancelable) e.preventDefault()

  this.setPosition(position, this.touched && !this.justTouched)
  this.justTouched = false
}

function touchCancel(this: ReactInputPosition): void {
  this.deactivate()
}

export const interactions = {
  touchStart,
  touchEnd,
  touchMove,
  touchCancel,
}
export default [
  [`touchstart`, touchStart],
  [`touchend`, touchEnd],
  [`touchmove`, touchMove],
  [`touchcancel`, touchCancel],
]
