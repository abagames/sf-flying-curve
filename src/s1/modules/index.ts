import * as s1 from '../index';
export { FlyingCurve } from './flyingcurve';

export class ChaseCursor {
  ofs = s1.createVector();

  constructor(public actor: s1.Actor, public chasingSpeed = 1.5) {
    s1.ui.setCurrentTargetPos(actor.pos);
  }

  update() {
    this.ofs.set(s1.ui.getTargetPos());
    this.ofs.sub(this.actor.pos);
    let d = this.ofs.mag();
    if (d <= this.chasingSpeed) {
      this.actor.pos.set(s1.ui.getTargetPos());
    } else {
      this.ofs.div(d / this.chasingSpeed);
      this.actor.pos.add(this.ofs);
    }
    this.actor.pos.set(
      s1.p.constrain(this.actor.pos.x, 0, s1.screen.size.x),
      s1.p.constrain(this.actor.pos.y, 0, s1.screen.size.y)
    );
  }
}

export class DoInterval {
  ticks: number;
  isEnabled = true;

  constructor(public actor: s1.Actor, public func: Function,
    public interval = 60, isStartRandomized = false) {
    this.ticks = isStartRandomized ? s1.random.getInt(interval) : interval;
  }

  update() {
    this.ticks--;
    if (this.ticks <= 0) {
      if (this.isEnabled) {
        this.func();
      }
      this.ticks += this.interval;
    }
  }

  setEnabled(isEnabled = true) {
    this.isEnabled = isEnabled;
  }
}

export class RemoveWhenOut {
  constructor(public actor: s1.Actor, public padding = 0) { }

  update() {
    if (!isIn(this.actor.pos.x, -this.padding, s1.screen.size.x + this.padding) ||
      !isIn(this.actor.pos.y, -this.padding, s1.screen.size.y + this.padding)) {
      this.actor.remove();
    }
  }
}

export class WrapPos {
  constructor(public actor: s1.Actor, public padding = 0) { }

  update() {
    this.actor.pos.x =
      wrap(this.actor.pos.x, -this.padding, s1.screen.size.x + this.padding);
    this.actor.pos.y =
      wrap(this.actor.pos.y, -this.padding, s1.screen.size.y + this.padding);
  }
}

export function isIn(v: number, low: number, high: number) {
  return v >= low && v <= high;
}

export function wrap(v: number, low: number, high: number) {
  const w = high - low;
  const o = v - low;
  if (o >= 0) {
    return o % w + low;
  } else {
    return w + o % w + low;
  }
}

export function getVectorAngle(v: p5.Vector) {
  return Math.atan2(v.y, v.x);
}

export function constrainVector
  (v: p5.Vector, lowX: number, highX: number, lowY: number, highY: number) {
  v.x = s1.p.constrain(v.x, lowX, highX);
  v.y = s1.p.constrain(v.y, lowY, highY);
}
