import ReactInputPosition from ".."
import utils from "../utils"

function mouseDown(this: ReactInputPosition, e: MouseEvent): void {
  this.mouseDown = true

  this.clickMoveStartRef = e.clientX + e.clientY
}

function mouseUp(this: ReactInputPosition, e: MouseEvent): void {
  if (!this.mouseDown) return

  this.mouseDown = false

  const position = { x: e.clientX, y: e.clientY }

  const clickMoveEnd = position.x + position.y
  const diff = Math.abs(this.clickMoveStartRef - clickMoveEnd)

  if (diff < this.props.clickMoveLimit) {
    this.toggleActive(position)
  }
}

function mouseMove(this: ReactInputPosition, e: MouseEvent): void {
  const position = { x: e.clientX, y: e.clientY }

  if (!this.getState().active) {
    return this.setPassivePosition(position)
  }

  this.setPosition(position, this.mouseDown)
}

function mouseLeave(this: ReactInputPosition): void {
  this.mouseDown = false
}

export const mouseDownInteractions = {
  mouseDown,
  mouseUp,
  mouseMove,
  mouseLeave,
  dragStart: utils.preventDefault,
}
export default [
  [`mousedown`, mouseDown],
  [`mouseup`, mouseUp],
  [`mousemove`, mouseMove],
  [`mouseleave`, mouseLeave],
  [`dragstart`, utils.preventDefault],
]
