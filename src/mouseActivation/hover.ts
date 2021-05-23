import ReactInputPosition from ".."
import utils from "../utils"

function mouseDown(this: ReactInputPosition): void {
  this.mouseDown = true
}

function mouseUp(this: ReactInputPosition): void {
  this.mouseDown = false
}

function mouseMove(this: ReactInputPosition, e: MouseEvent): void {
  const position = { x: e.clientX, y: e.clientY }

  if (!this.getState().active) {
    return this.activate(position)
  }

  this.setPosition(position, this.mouseDown)
}

function mouseEnter(this: ReactInputPosition, e: MouseEvent): void {
  const position = { x: e.clientX, y: e.clientY }
  this.activate(position)
}

function mouseLeave(this: ReactInputPosition): void {
  this.deactivate()
  this.mouseDown = false
}

export const mouseDownInteractions = {
  mouseDown,
  mouseUp,
  mouseMove,
  mouseEnter,
  mouseLeave,
  dragStart: utils.preventDefault,
}
export default [
  [`mousedown`, mouseDown],
  [`mouseup`, mouseUp],
  [`mousemove`, mouseMove],
  [`mouseleave`, mouseLeave],
  [`mouseenter`, mouseEnter],
  [`dragstart`, utils.preventDefault],
]
