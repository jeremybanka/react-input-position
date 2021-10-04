import { Children, cloneElement, ReactElement, ReactNode } from "react"
import { childState, NULL_SCALE, ORIGIN_POINT } from "."

function isReactComponent(
  element: React.DetailedReactHTMLElement<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  >
): boolean {
  return typeof element.type === `function`
}

function decorateChild(child: ReactElement, props: childState): ReactNode {
  return cloneElement(child, props)
}

function shouldDecorateChild(child) {
  return !!child && isReactComponent(child) && !!child.props.usePosition
}

function decorateChildren(
  children: ReactElement[],
  props: childState
): ReactNode {
  return Children.map(children, child =>
    shouldDecorateChild(child) ? decorateChild(child, props) : child
  )
}

const preventDefault = (e: Event): void => e.preventDefault()

function convertRange(
  oldMin: number,
  oldMax: number,
  newMin: number,
  newMax: number,
  oldValue: number
): number {
  const percent = (oldValue - oldMin) / (oldMax - oldMin)
  return percent * (newMax - newMin) + newMin
}

function limitPosition(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  itemPosition = ORIGIN_POINT
): point2d {
  const position = { ...itemPosition }

  if (minX !== undefined && position.x < minX) {
    position.x = minX
  } else if (maxX !== undefined && position.x > maxX) {
    position.x = maxX
  }

  if (minY !== undefined && position.y < minY) {
    position.y = minY
  } else if (maxY !== undefined && position.y > maxY) {
    position.y = maxY
  }

  return position
}

function createAdjustedLimits(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  elemDimensions = NULL_SCALE,
  itemDimensions = NULL_SCALE,
  limitBySize: boolean,
  internal: boolean
): {
  minX: number
  maxX: number
  minY: number
  maxY: number
} {
  const limits = { minX, maxX, minY, maxY }

  if (limits.maxX < 0) {
    limits.maxX = elemDimensions.width + limits.maxX
  }

  if (limits.maxY < 0) {
    limits.maxY = elemDimensions.height + limits.maxY
  }

  if (!limitBySize) {
    return limits
  }

  if (internal) {
    limits.minX = 0
    limits.minY = 0
    limits.maxX = elemDimensions.width - itemDimensions.width
    limits.maxY = elemDimensions.height - itemDimensions.height

    if (
      itemDimensions.width > elemDimensions.width ||
      itemDimensions.height > elemDimensions.height
    ) {
      limits.maxX = 0
      limits.maxY = 0
    }
  } else if (itemDimensions.width || itemDimensions.height) {
    limits.maxX = 0
    limits.maxY = 0
    limits.minX = -itemDimensions.width + elemDimensions.width
    limits.minY = -itemDimensions.height + elemDimensions.height

    if (
      itemDimensions.width < elemDimensions.width ||
      itemDimensions.height < elemDimensions.height
    ) {
      limits.minX = 0
      limits.minY = 0
    }
  }

  return limits
}

function calculateItemPosition(
  itemPosition = ORIGIN_POINT,
  prevActivePosition = ORIGIN_POINT,
  activePosition = ORIGIN_POINT,
  multiplier: number
): { x: number; y: number } {
  const newItemPosition = { ...itemPosition }

  const moveX = (activePosition.x - prevActivePosition.x) * multiplier
  const moveY = (activePosition.y - prevActivePosition.y) * multiplier

  newItemPosition.x += moveX
  newItemPosition.y += moveY

  return newItemPosition
}

function alignItemOnPosition(
  elemDimensions = NULL_SCALE,
  itemDimensions = NULL_SCALE,
  position: point2d
): point2d {
  const oldMaxX = elemDimensions.width
  const newMaxX = -(itemDimensions.width || 0) + elemDimensions.width
  const oldMaxY = elemDimensions.height
  const newMaxY = -(itemDimensions.height || 0) + elemDimensions.height

  return {
    x: convertRange(0, oldMaxX, 0, newMaxX, position.x),
    y: convertRange(0, oldMaxY, 0, newMaxY, position.y),
  }
}

function centerItemOnPosition(
  elemDimensions = NULL_SCALE,
  itemDimensions = NULL_SCALE,
  position: point2d
): point2d {
  const itemPosition = alignItemOnPosition(
    elemDimensions,
    itemDimensions,
    position
  )

  itemPosition.x += elemDimensions.width / 2 - position.x
  itemPosition.y += elemDimensions.height / 2 - position.y

  return itemPosition
}

export default {
  decorateChildren,
  preventDefault,
  convertRange,
  limitPosition,
  createAdjustedLimits,
  calculateItemPosition,
  alignItemOnPosition,
  centerItemOnPosition,
}
