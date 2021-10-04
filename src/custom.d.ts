interface point2d {
  x: number
  y: number
}
interface scale2d {
  width: number
  height: number
}
interface place2d {
  top: number
  left: number
}

type interactionSet = [keyof HTMLElementEventMap, EventListener][]

interface handler {
  event: keyof HTMLElementEventMap
  handler: EventListenerOrEventListenerObject
}
