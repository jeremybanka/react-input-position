import ReactInputPosition from ".."
import utils from "../utils"

function mouseDown(this: ReactInputPosition, e: MouseEvent): void {
  const position = { x: e.clientX, y: e.clientY }
  this.activate(position)
}

function mouseUp(this: ReactInputPosition): void {
  this.deactivate()

  if (this.mouseOutside) {
    addRemoveOutsideHandlers.call(this, this)
  }
}

function mouseMove(this: ReactInputPosition, e: MouseEvent): void {
  const position = { x: e.clientX, y: e.clientY }

  if (!this.getState().active) {
    return this.setPassivePosition(position)
  }

  this.setPosition(position, true)
}

function mouseEnter(this: ReactInputPosition): void {
  if (this.mouseOutside) {
    this.mouseOutside = false
    addRemoveOutsideHandlers.call(this, this)
  }
}

function mouseLeave(this: ReactInputPosition): void {
  if (!this.getState().active) {
    return
  }

  if (!this.props.mouseDownAllowOutside) {
    return this.deactivate()
  }

  this.mouseOutside = true
  addRemoveOutsideHandlers.call(this, true)
}

function addRemoveOutsideHandlers(this: ReactInputPosition, add): void {
  this.mouseHandlers
    .filter(h => h.event === `mouseup` || h.event === `mousemove`)
    .forEach(({ event, handler }) => {
      if (add) {
        window.addEventListener(event, handler)
      } else {
        window.removeEventListener(event, handler)
      }
    })
}

export const mouseDownInteractions = {
  mouseDown,
  mouseUp,
  mouseMove,
  mouseLeave,
  mouseEnter,
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
