import ReactInputPosition from ".."

function touchStart(this: ReactInputPosition, e: TouchEvent): void {
  this.touched = true
  this.justTouched = true

  const touch = e.touches[0]
  const position = { x: touch.clientX, y: touch.clientY }
  this.activate(position)
}

function touchEnd(this: ReactInputPosition, e: TouchEvent): void {
  if (e.cancelable) e.preventDefault()

  this.touched = false
  this.justTouched = false

  this.deactivate()
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
