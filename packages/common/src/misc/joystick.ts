/**
 * @author       Yannick Deubel (https://github.com/yandeu)
 * @copyright    Copyright (c) 2020 Yannick Deubel; Project Url: https://github.com/enable3d/enable3d
 * @license      {@link https://github.com/enable3d/enable3d/blob/master/LICENSE|LGPL-3.0}
 */

import { Events } from '@yandeu/events'

interface JoyStickButton {
  id: number
  domElement: HTMLElement
  offset: {
    x: number
    y: number
  }
}

interface JoyStickAxis extends JoyStickButton {
  maxRadius: number
  maxRadiusSquared: number
  origin: {
    left: number
    top: number
  }
  rotationDamping: number
  moveDamping: number
}

type Styles = {
  top: number
  bottom: number
  right: number
  left: number
  size: number
}

export type AddAxisConfig = {
  styles?: Partial<Styles>
  maxRadius?: number
  rotationDamping?: number
  moveDamping?: number
}

export type AddButtonConfig = {
  styles?: Partial<Styles>
  letter?: string
}

export type Delta = { x: number; y: number }
export type Data = { top: number; right: number }

// This class is based on a file I found online called toon3d.js
// Unfortunately I could not find its license or author.
// I just ported it to TypeScript and improved the code.
export class JoyStick extends Events {
  id = -1

  constructor(public parent: HTMLElement = document.body) {
    super()
  }

  get add() {
    return {
      axis: (config: AddAxisConfig) => this.addAxis(config),
      button: (config: AddButtonConfig) => this.addButton(config)
    }
  }

  private addAxis(config: AddAxisConfig) {
    this.id++

    if (!config.styles) {
      config.styles = { left: 20, bottom: 20, size: 100 }
    }

    const circle = this.circle(config.styles)
    const thumb = this.thumb(config?.styles?.size)

    circle.appendChild(thumb)
    this.parent.appendChild(circle)

    const { maxRadius = 40, rotationDamping = 0.06, moveDamping = 0.01 } = config

    // element
    const element: JoyStickAxis = {
      id: this.id,
      domElement: thumb,
      maxRadius: maxRadius,
      maxRadiusSquared: maxRadius * maxRadius,
      origin: { left: thumb.offsetLeft, top: thumb.offsetTop },
      offset: { x: 0, y: 0 },
      rotationDamping: rotationDamping,
      moveDamping: moveDamping
    }

    if (element?.domElement) {
      const { domElement } = element
      if ('ontouchstart' in window) {
        domElement.addEventListener('touchstart', evt => {
          evt.preventDefault()
          this.tap(evt, element)
          evt.stopPropagation()
        })
      } else {
        domElement.addEventListener('mousedown', evt => {
          evt.preventDefault()
          this.tap(evt, element)
          evt.stopPropagation()
        })
      }
    }

    return {
      onMove: (event: (delta: Delta) => void) => {
        this.on(`axis_onmove_${element.id}`, (delta: Delta) => {
          event(delta)
        })
      }
    }
  }

  private addButton(config: AddButtonConfig) {
    this.id++

    if (!config.styles) {
      config.styles = { right: 20, bottom: 20, size: 80 }
    }

    const circle = this.circle(config.styles)
    const letter = this.letter(config.letter)

    circle.appendChild(letter)
    this.parent.appendChild(circle)

    // element
    const element: JoyStickButton = {
      id: this.id,
      domElement: circle,
      offset: { x: 0, y: 0 }
    }

    if (element?.domElement) {
      this.click(element)
    }

    return {
      onClick: (event: (data: Data) => void) => {
        this.on(`button_onclick_${element.id}`, (data: Data) => {
          event(data)
        })
      },
      onRelease: (event: (data: { top: number; right: number }) => void) => {
        this.on(`button_onrelease_${element.id}`, (data: Data) => {
          event(data)
        })
      }
    }
  }

  private circle(styles: Partial<Styles> = {}) {
    const { top, right, bottom, left, size = 100 } = styles

    const circle = document.createElement('div')

    let css = `user-select:none ;display:flex; align-items:center; justify-content:center; position:absolute; width:${size}px; height:${size}px; background:rgba(126, 126, 126, 0.5); border:#444 solid medium; border-radius:50%; cursor: pointer; `

    if (typeof top === 'number') css += `top:${top}px; `
    if (typeof right === 'number') css += `right:${right}px; `
    if (typeof bottom === 'number') css += `bottom:${bottom}px; `
    if (typeof left === 'number') css += `left:${left}px; `

    circle.style.cssText = css
    return circle
  }

  private thumb(size: number = 100) {
    const thumb = document.createElement('div')
    thumb.style.cssText = `position: absolute; left: ${size / 4}px; top: ${size / 4}px; width: ${size / 2}px; height: ${
      size / 2
    }px; border-radius: 50%; background: #fff; `
    return thumb
  }

  private letter(letter: string = 'A') {
    const el = document.createElement('span')
    el.innerText = letter
    el.style.cssText = 'font-size: 64px; color: #fff; font-family: system-ui,sans-serif;'
    return el
  }

  private click(element: JoyStickButton) {
    const { id, domElement } = element

    if ('ontouchstart' in window) {
      domElement.addEventListener('touchstart', evt => {
        evt.preventDefault()
        this.emit(`button_onclick_${id}`)
      })
      domElement.addEventListener('touchend', evt => {
        evt.preventDefault()
        this.emit(`button_onrelease_${id}`)
      })
    } else {
      domElement.addEventListener('mousedown', evt => {
        evt.preventDefault()
        this.emit(`button_onclick_${id}`)
        evt.stopPropagation()
      })
      domElement.addEventListener('mouseup', evt => {
        evt.preventDefault()
        this.emit(`button_onrelease_${id}`)
        evt.stopPropagation()
      })
    }
  }

  private tap(evt: MouseEvent | TouchEvent, element: JoyStickAxis) {
    evt = evt || window.event
    // get the mouse cursor position at startup:
    element.offset = this.getMousePosition(evt)

    if ('ontouchstart' in window) {
      document.ontouchmove = evt => {
        if (evt.target === element.domElement) this.move(evt, element)
      }
      document.ontouchend = evt => {
        if (evt.target === element.domElement) this.up(element)
      }
    } else {
      document.onmousemove = evt => {
        if (evt.target === element.domElement) this.move(evt, element)
      }
      document.onmouseup = _evt => {
        this.up(element)
      }
    }
  }

  private move(evt: MouseEvent | TouchEvent, element: JoyStickAxis) {
    const { domElement, maxRadius, maxRadiusSquared, origin, offset, id } = element
    evt = evt || window.event
    const mouse = this.getMousePosition(evt)
    // calculate the new cursor position:
    let left = mouse.x - offset.x
    let top = mouse.y - offset.y
    //this.offset = mouse;

    const sqMag = left * left + top * top
    if (sqMag > maxRadiusSquared) {
      //Only use sqrt if essential
      const magnitude = Math.sqrt(sqMag)
      left /= magnitude
      top /= magnitude
      left *= maxRadius
      top *= maxRadius
    }
    // set the element's new position:
    domElement.style.top = `${top + domElement.clientHeight / 2}px`
    domElement.style.left = `${left + domElement.clientWidth / 2}px`

    const forward = -(top - origin.top + domElement.clientHeight / 2) / maxRadius
    const turn = (left - origin.left + domElement.clientWidth / 2) / maxRadius

    this.emit(`axis_onmove_${id}`, { top: forward, right: turn })
  }

  private up(element: JoyStickAxis) {
    const { domElement, origin, id } = element
    if ('ontouchstart' in window) {
      document.ontouchmove = null
      // @ts-expect-error: Not sure why we use touches. Document has no property called touchend.
      document.touchend = null
    } else {
      document.onmousemove = null
      document.onmouseup = null
    }
    domElement.style.top = `${origin.top}px`
    domElement.style.left = `${origin.left}px`

    this.emit(`axis_onmove_${id}`, { top: 0, right: 0 })
  }

  private getMousePosition(evt: MouseEvent | TouchEvent) {
    // @ts-expect-error: Of course MouseEvent and TouchEvent don't have the same properties.
    const clientX = evt.targetTouches ? evt.targetTouches[0].pageX : evt.clientX
    // @ts-expect-error: Of course MouseEvent and TouchEvent don't have the same properties.
    const clientY = evt.targetTouches ? evt.targetTouches[0].pageY : evt.clientY

    return { x: clientX, y: clientY }
  }
}
