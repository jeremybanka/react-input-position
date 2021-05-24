import ReactInputPosition from ".."
import utils from "../utils"

function mouseDown(this: ReactInputPosition): void {
  this.mouseDown = true
}

function mouseUp(this: ReactInputPosition): void {
  this.mouseDown = false
}

function dblClick(this: ReactInputPosition, e: MouseEvent): void {
  const position = { x: e.clientX, y: e.clientY }

  this.toggleActive(position)
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
  dblClick,
  mouseMove,
  mouseLeave,
  dragStart: utils.preventDefault,
}
export default [
  [`mousedown`, mouseDown],
  [`mouseup`, mouseUp],
  [`dblclick`, dblClick],
  [`mousemove`, mouseMove],
  [`mouseleave`, mouseLeave],
  [`dragstart`, utils.preventDefault],
]
