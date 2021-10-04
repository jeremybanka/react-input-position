import React, { Component, CSSProperties, ReactElement, RefObject } from "react"
import mouseActivation from "./mouseActivation"
import touchActivation from "./touchActivation"
import { MOUSE_ACTIVATION, TOUCH_ACTIVATION } from "./constants"
import utils from "./utils"

export const ORIGIN_POINT: point2d = { x: 0, y: 0 }
export const NULL_SCALE: scale2d = { height: 0, width: 0 }
export const ORIGIN_PLACE: place2d = { left: 0, top: 0 }

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

export interface childState extends inputPositionState {
  itemRef: React.RefObject<HTMLElement>
  onLoadRefresh: VoidFunction
}

const defaultState: inputPositionState = {
  active: false,
  activePosition: ORIGIN_POINT,
  prevActivePosition: ORIGIN_POINT,
  passivePosition: ORIGIN_POINT,
  elementDimensions: NULL_SCALE,
  elementOffset: ORIGIN_PLACE,
  itemPosition: ORIGIN_POINT,
  itemDimensions: NULL_SCALE,
}

interface InputPositionProps {
  children: ReactElement[]
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
  itemPositionMinX: number
  itemPositionMaxX: number
  itemPositionMinY: number
  itemPositionMaxY: number
  itemPositionLimitBySize: boolean
  itemPositionLimitInternal: boolean
  tapDurationInMs: number
  doubleTapDurationInMs: number
  longTouchDurationInMs: number
  style: CSSProperties
  className: string
  cursorStyle: string
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
  mouseOutside = true
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

  updateState(
    changes: Partial<inputPositionState>,
    callback?: VoidFunction
  ): void {
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
      callback && callback.call(this)
      return
    }

    this.setState(
      () => changes,
      () => {
        callback && callback.call(this)
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

  onLoadRefresh(): void {
    this.refreshPosition()
  }

  refreshPosition(): void {
    const { trackItemPosition, centerItemOnLoad } = this.props

    this.setPosition(ORIGIN_POINT, trackItemPosition, false, centerItemOnLoad)
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

  handleResize(): void {
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
      itemPosition: ORIGIN_POINT,
      itemDimensions: this.itemRef.current
        ? { ...this.itemRef.current.getBoundingClientRect() }
        : NULL_SCALE,
      activePosition: {
        x: Math.min(Math.max(0, position.x - left), width),
        y: Math.min(Math.max(0, position.y - top), height),
      },
      prevActivePosition:
        trackPreviousPosition || trackItemPosition
          ? activePosition
            ? { ...activePosition }
            : ORIGIN_POINT
          : ORIGIN_POINT,
      passivePosition: trackPassivePosition
        ? {
            x: position.x - left,
            y: position.y - top,
          }
        : ORIGIN_POINT,
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
      : ORIGIN_PLACE

    this.updateState({
      passivePosition: {
        x: position.x - left,
        y: position.y - top,
      },
    })
  }

  toggleActive(position = ORIGIN_POINT): void {
    if (!this.getState().active) {
      this.activate(position)
    } else {
      this.deactivate()
    }
  }

  activate(position = ORIGIN_POINT): void {
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
