import ReactInputPosition from ".."

function touchStart(this: ReactInputPosition): void {
  this.touched = true
  this.justTouched = true
  this.startTapTimer()
}

function touchEnd(this: ReactInputPosition, e: TouchEvent): void {
  if (e.cancelable) e.preventDefault()

  this.touched = false
  this.justTouched = false

  if (this.tapTimedOut) {
    this.tapTimedOut = false
    return
  }
  if (this.tapTimer) clearTimeout(this.tapTimer)

  const touch = e.changedTouches[0]
  const position = { x: touch.clientX, y: touch.clientY }
  this.toggleActive(position)

  this.tapTimedOut = false
}

function touchMove(this: ReactInputPosition, e: TouchEvent): void {
  if (!this.getState().active) return
  if (e.cancelable) e.preventDefault()

  const touch = e.touches[0]
  const position = { x: touch.clientX, y: touch.clientY }
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
