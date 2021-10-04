import ReactInputPosition from ".."
import utils from "../utils"

function mouseDown(this: ReactInputPosition, e: MouseEvent): void {
  const position = { x: e.clientX, y: e.clientY }
  this.activate(position)
}

function mouseUp(this: ReactInputPosition): void {
  this.deactivate()
  if (this.mouseOutside) removeOutsideHandlers(this)
}

function mouseMove(this: ReactInputPosition, e: MouseEvent): void {
  const position = { x: e.clientX, y: e.clientY }

  const isInactive = !this.getState().active
  if (isInactive) return this.setPassivePosition(position)

  this.setPosition(position, true)
}

function mouseEnter(this: ReactInputPosition): void {
  if (this.mouseOutside) {
    this.mouseOutside = false
    removeOutsideHandlers(this)
  }
}

function mouseLeave(this: ReactInputPosition): void {
  if (!this.getState().active) return
  if (!this.props.mouseDownAllowOutside) return this.deactivate()

  this.mouseOutside = true
  addOutsideHandlers(this)
}

const addOutsideHandlers = (target: ReactInputPosition): void =>
  toggleOutsideHandlers(target, true)
const removeOutsideHandlers = (target: ReactInputPosition): void =>
  toggleOutsideHandlers(target, false)
function toggleOutsideHandlers(target: ReactInputPosition, on: boolean): void {
  target.mouseHandlers
    .filter(h => h.event === `mouseup` || h.event === `mousemove`)
    .forEach(({ event, handler }) => {
      on && window.addEventListener(event, handler)
      !on && window.removeEventListener(event, handler)
    })
}

export default [
  [`mousedown`, mouseDown],
  [`mouseup`, mouseUp],
  [`mousemove`, mouseMove],
  [`mouseleave`, mouseLeave],
  [`mouseenter`, mouseEnter],
  [`dragstart`, utils.preventDefault],
]
