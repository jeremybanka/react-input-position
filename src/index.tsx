import React, { Component, CSSProperties, ReactElement, RefObject } from "react"
import mouseActivation from "./mouseActivation"
import touchActivation from "./touchActivation"
import { MOUSE_ACTIVATION, TOUCH_ACTIVATION } from "./constants"
import utils from "./utils"

interface inputPositionState {
  active?: boolean
  activePosition?: point2d
  prevActivePosition?: point2d
  passivePosition?: point2d
  elementDimensions?: scale2d
  elementOffset?: place2d
  itemPosition?: point2d
  itemDimensions?: scale2d
}
const defaultState = {
  active: false,
  activePosition: { x: 0, y: 0 },
  prevActivePosition: { x: 0, y: 0 },
  passivePosition: { x: 0, y: 0 },
  elementDimensions: { width: 0, height: 0 },
  elementOffset: { left: 0, top: 0 },
  itemPosition: { x: 0, y: 0 },
  itemDimensions: { width: 0, height: 0 },
}

export type interactionSet = [keyof HTMLElementEventMap, EventListener][]

interface handler {
  event: keyof HTMLElementEventMap
  handler: EventListenerOrEventListenerObject
}

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

interface InputPositionProps {
  mouseActivationMethod?: string
  touchActivationMethod?: string
  onUpdate: CallableFunction
  onActivate: CallableFunction
  onDeactivate: CallableFunction
  overrideState: Partial<inputPositionState>
  trackItemPosition: boolean
  centerItemOnLoad: boolean
  minUpdateSpeedInMs: number
  trackPassivePosition: boolean
  trackPreviousPosition: boolean
  centerItemOnActivate: boolean
  centerItemOnActivatePos: boolean
  linkItemToActive: boolean
  itemMovementMultiplier: number
  alignItemOnActivePos: boolean
  itemPositionMinX?: number
  itemPositionMaxX?: number
  itemPositionMinY?: number
  itemPositionMaxY?: number
  itemPositionLimitBySize?: number
  itemPositionLimitInternal?: number
  tapDurationInMs: number
  doubleTapDurationInMs: number
  longTouchDurationInMs: number
  style: CSSProperties
  className
  cursorStyle
  mouseDownAllowOutside?: boolean
  cursorStyleActive?: string
  clickMoveLimit: number
  longTouchMoveLimit: number
}

class ReactInputPosition extends Component<InputPositionProps> {
  static defaultProps = {
    tapDurationInMs: 180,
    doubleTapDurationInMs: 400,
    longTouchDurationInMs: 500,
    longTouchMoveLimit: 5,
    clickMoveLimit: 5,
    style: {},
    minUpdateSpeedInMs: 1,
    itemMovementMultiplier: 1,
    cursorStyle: `crosshair`,
    mouseActivationMethod: MOUSE_ACTIVATION.CLICK,
    touchActivationMethod: TOUCH_ACTIVATION.TAP,
    mouseDownAllowOutside: false,
  }

  state = defaultState

  componentDidMount(): void {
    this.init()
    this.refreshPosition()
  }
  componentDidUpdate(prevProps: InputPositionProps): void {
    if (prevProps.mouseActivationMethod !== this.props.mouseActivationMethod) {
      this.removeMouseEventListeners()
      this.setMouseInteractionMethods()
      this.addMouseEventListeners()
    }
    if (prevProps.touchActivationMethod !== this.props.touchActivationMethod) {
      this.removeTouchEventListeners()
      this.setTouchInteractionMethods()
      this.addTouchEventListeners()
    }
  }
  componentWillUnmount(): void {
    this.removeMouseEventListeners()
    this.removeTouchEventListeners()
    this.removeOtherEventListeners()
  }

  containerRef: RefObject<HTMLDivElement> = React.createRef()
  itemRef: RefObject<HTMLElement> = React.createRef()
  mouseDown = false
  touched = false
  justTouched = false
  tapped = false
  tapTimer?: NodeJS.Timeout = undefined
  tapTimedOut = false
  doubleTapTimer?: NodeJS.Timeout = undefined
  doubleTapTimedOut = false
  longTouchTimer?: NodeJS.Timeout = undefined
  longTouchTimedOut = false
  refresh = true
  clickMoveStartRef = 0
  longTouchStartRef = 0

  supportsPassive = false
  mouseOutside?: boolean
  mouseHandlers: handler[] = []
  touchHandlers: handler[] = []

  init(): void {
    this.checkPassiveEventSupport()
    this.setInputInteractionMethods()
    this.addMouseEventListeners()
    this.addTouchEventListeners()
    this.addOtherEventListeners()
  }

  checkPassiveEventSupport(): void {
    this.supportsPassive = false
    try {
      const options = Object.defineProperty({}, `passive`, {
        get: () => (this.supportsPassive = true),
      })
      window.addEventListener(`testPassive`, () => undefined, options)
      window.removeEventListener(`testPassive`, () => undefined, options)
    } catch (e) {
      return undefined
    }
  }

  updateState(changes: inputPositionState, cb?: VoidFunction): void {
    const { onUpdate } = this.props

    let activationCallback
    if (Object.prototype.hasOwnProperty.call(changes, `active`)) {
      if (changes.active) {
        activationCallback = this.props.onActivate
      } else {
        activationCallback = this.props.onDeactivate
      }
    }

    if (this.props.overrideState) {
      onUpdate && onUpdate(changes)
      activationCallback && activationCallback()
      cb && cb.call(this)
      return
    }

    this.setState(
      () => changes,
      () => {
        cb && cb.call(this)
        activationCallback && activationCallback()
        onUpdate && onUpdate(this.getStateClone())
      }
    )
  }

  getState(): inputPositionState {
    if (this.props.overrideState) {
      return this.props.overrideState
    }
    return this.state
  }

  getStateClone(): inputPositionState {
    const state = this.getState()
    const clonedState = {}

    for (const key in state) {
      if (typeof state[key] === `object`) {
        clonedState[key] = { ...state[key] }
      } else {
        clonedState[key] = state[key]
      }
    }

    return clonedState
  }

  onLoadRefresh = (): void => {
    this.refreshPosition()
  }

  refreshPosition(): void {
    const { trackItemPosition, centerItemOnLoad } = this.props

    this.setPosition({ x: 0, y: 0 }, trackItemPosition, false, centerItemOnLoad)
  }

  setInputInteractionMethods(): void {
    this.setMouseInteractionMethods()
    this.setTouchInteractionMethods()
  }

  setMouseInteractionMethods(): void {
    if (this.props.mouseActivationMethod) {
      const mouseInteractionMethods: interactionSet =
        mouseActivation[this.props.mouseActivationMethod]
      this.mouseHandlers = []

      for (const interactionMethod of mouseInteractionMethods) {
        this.mouseHandlers.push({
          event: interactionMethod[0],
          handler: interactionMethod[1].bind(this),
        })
      }
    }
  }

  setTouchInteractionMethods(): void {
    if (this.props.touchActivationMethod) {
      const touchInteractionMethods: interactionSet =
        touchActivation[this.props.touchActivationMethod]
      this.touchHandlers = []

      for (const interactionMethod of touchInteractionMethods) {
        this.touchHandlers.push({
          event: interactionMethod[0],
          handler: interactionMethod[1].bind(this),
        })
      }
    }
  }

  handleResize = (): void => {
    this.refreshPosition()
  }

  setPosition(
    position: point2d,
    updateItemPosition: boolean,
    activate?: boolean,
    centerItem?: boolean
  ): void {
    if (this.props.minUpdateSpeedInMs && !this.refresh) return
    this.refresh = false

    const { left, top, width, height } = this.containerRef.current
      ? this.containerRef.current.getBoundingClientRect()
      : { left: 0, top: 0, width: 0, height: 0 }

    const {
      trackItemPosition,
      trackPassivePosition,
      trackPreviousPosition,
      centerItemOnActivate,
      centerItemOnActivatePos,
      linkItemToActive,
      itemMovementMultiplier,
      alignItemOnActivePos,
      itemPositionMinX,
      itemPositionMaxX,
      itemPositionMinY,
      itemPositionMaxY,
      itemPositionLimitBySize,
      itemPositionLimitInternal,
    } = this.props

    const { activePosition, itemPosition } = this.getState()

    // Set container div info and active position
    const stateUpdate = {
      active: !!activate,
      elementOffset: { left, top },
      elementDimensions: { width, height },
      itemPosition: { x: 0, y: 0 },
      itemDimensions: this.itemRef.current
        ? { ...this.itemRef.current.getBoundingClientRect() }
        : undefined,
      activePosition: {
        x: Math.min(Math.max(0, position.x - left), width),
        y: Math.min(Math.max(0, position.y - top), height),
      },
      prevActivePosition:
        trackPreviousPosition || trackItemPosition
          ? activePosition
            ? {
                ...activePosition,
              }
            : { x: 0, y: 0 }
          : undefined,
      passivePosition: trackPassivePosition
        ? {
            x: position.x - left,
            y: position.y - top,
          }
        : undefined,
    }

    // Create adjusted limits
    const limits = utils.createAdjustedLimits(
      itemPositionMinX,
      itemPositionMaxX,
      itemPositionMinY,
      itemPositionMaxY,
      stateUpdate.elementDimensions,
      stateUpdate.itemDimensions,
      itemPositionLimitBySize,
      itemPositionLimitInternal
    )

    // Center item
    if (centerItem || (activate && centerItemOnActivate)) {
      const centerX = (limits.maxX + limits.minX) / 2
      const centerY = (limits.maxY + limits.minY) / 2

      stateUpdate.itemPosition = {
        x: centerX || 0,
        y: centerY || 0,
      }

      return this.updateState(stateUpdate, this.startRefreshTimer)
    }

    let shouldLimitItem = true

    // Set item position
    if (trackItemPosition && linkItemToActive) {
      stateUpdate.itemPosition = { ...stateUpdate.activePosition }
    } else if (trackItemPosition && alignItemOnActivePos) {
      stateUpdate.itemPosition = utils.alignItemOnPosition(
        stateUpdate.elementDimensions,
        stateUpdate.itemDimensions,
        stateUpdate.activePosition
      )
    } else if (trackItemPosition && activate && centerItemOnActivatePos) {
      stateUpdate.itemPosition = utils.centerItemOnPosition(
        stateUpdate.elementDimensions,
        stateUpdate.itemDimensions,
        stateUpdate.activePosition
      )
    } else if (trackItemPosition && updateItemPosition) {
      stateUpdate.itemPosition = utils.calculateItemPosition(
        itemPosition,
        stateUpdate.prevActivePosition,
        stateUpdate.activePosition,
        itemMovementMultiplier
      )
    } else {
      shouldLimitItem = false
    }

    // Apply position limits
    if (shouldLimitItem) {
      stateUpdate.itemPosition = utils.limitPosition(
        limits.minX,
        limits.maxX,
        limits.minY,
        limits.maxY,
        stateUpdate.itemPosition
      )
    }

    this.updateState(stateUpdate, this.startRefreshTimer)
  }

  setPassivePosition(position: point2d): void {
    if (!this.props.trackPassivePosition) return

    const { left, top } = this.containerRef.current
      ? this.containerRef.current.getBoundingClientRect()
      : { left: 0, top: 0 }

    this.updateState({
      passivePosition: {
        x: position.x - left,
        y: position.y - top,
      },
    })
  }

  toggleActive(position = { x: 0, y: 0 }): void {
    if (!this.getState().active) {
      this.activate(position)
    } else {
      this.deactivate()
    }
  }

  activate(position = { x: 0, y: 0 }): void {
    this.setPosition(position, false, true)
  }

  deactivate(): void {
    this.updateState({ active: false })
  }

  startRefreshTimer(): void {
    if (!this.props.minUpdateSpeedInMs) return

    setTimeout(() => {
      this.refresh = true
    }, this.props.minUpdateSpeedInMs)
  }

  startTapTimer(): void {
    this.tapTimer = setTimeout(() => {
      this.tapTimedOut = true
    }, this.props.tapDurationInMs)
  }

  startDoubleTapTimer(): void {
    this.doubleTapTimer = setTimeout(() => {
      this.doubleTapTimedOut = true
    }, this.props.doubleTapDurationInMs)
  }

  startLongTouchTimer(e: point2d): void {
    this.longTouchTimer = setTimeout(() => {
      if (this.touched) {
        this.toggleActive(e)
      }
    }, this.props.longTouchDurationInMs)
  }

  addMouseEventListeners(): void {
    this.mouseHandlers.forEach(mouse => {
      this.containerRef.current?.addEventListener(mouse.event, mouse.handler)
    })
  }

  addTouchEventListeners(): void {
    this.touchHandlers.forEach(touch => {
      this.containerRef.current?.addEventListener(
        touch.event,
        touch.handler,
        this.supportsPassive ? { passive: false } : false
      )
    })
  }

  removeMouseEventListeners(): void {
    this.mouseHandlers.forEach(mouse => {
      this.containerRef.current?.removeEventListener(mouse.event, mouse.handler)
    })
  }

  removeTouchEventListeners(): void {
    this.touchHandlers.forEach(touch => {
      this.containerRef.current?.removeEventListener(
        touch.event,
        touch.handler,
        this.supportsPassive
      )
    })
  }

  addOtherEventListeners(): void {
    window.addEventListener(`resize`, this.handleResize)
    window.addEventListener(`load`, this.onLoadRefresh)
  }

  removeOtherEventListeners(): void {
    window.removeEventListener(`resize`, this.handleResize)
    window.removeEventListener(`load`, this.onLoadRefresh)
  }

  render(): ReactElement {
    const { style, className, children, cursorStyle, cursorStyleActive } =
      this.props
    const { active } = this.getState()

    const combinedStyle: CSSProperties = {
      ...style,
      WebkitUserSelect: `none`,
      MozUserSelect: `none`,
      msUserSelect: `none`,
      userSelect: `none`,
      cursor: active ? cursorStyleActive || cursorStyle : cursorStyle,
    }

    return (
      <div style={combinedStyle} className={className} ref={this.containerRef}>
        {utils.decorateChildren(children, {
          ...this.getState(),
          itemRef: this.itemRef,
          onLoadRefresh: this.onLoadRefresh,
        })}
      </div>
    )
  }
}

export { MOUSE_ACTIVATION, TOUCH_ACTIVATION, defaultState }
export default ReactInputPosition
