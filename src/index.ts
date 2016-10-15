import * as _ from 'lodash';
import * as loop from './loop';
import Actor from './actor';
import Random from './random';
import * as ui from './ui';

let p5 = loop.p5;
let p: p5;
let screenSize: p5.Vector;
let random = new Random();

loop.init(init, update);

let scrollScreenSizeX: number;
let scrollOffsetX = 0;
let player: Player;
let flyingCurve: FlyingCurve;

function init() {
  p = loop.p;
  screenSize = new p5.Vector(96, 128);
  scrollScreenSizeX = 128;
  const p5Canvas = p.createCanvas(screenSize.x, screenSize.y).canvas;
  p5Canvas.setAttribute('style', null);
  p5Canvas.setAttribute('id', 'main');
  ui.init(p5Canvas, screenSize);
  p.fill(255);
  p.noStroke();
  loop.enableDebug(() => {
    player.setPixels();
    Shot.pixels = null;
    Bullet.pixels = null;
  });
  player = new Player();
}

function update() {
  if (loop.ticks % 200 === 0) {
    flyingCurve = new FlyingCurve();
  }
  if (loop.ticks % 200 < 120 && loop.ticks % 12 === 0) {
    const e = new Enemy();
    e.flyingCurve = flyingCurve;
    e.spawn();
  }
}

class Player extends Actor {
  normalizedPos: p5.Vector = new p5.Vector();
  fireInterval = 5;
  fireTicks = 0;
  chasingSpeed = 2;
  ofs: p5.Vector = new p5.Vector();

  constructor() {
    super();
    this.pos.set(screenSize.x / 2, screenSize.y * 0.8);
    ui.setCurrentTargetPos(this.pos);
    this.setPixels();
    this.angle = -p.HALF_PI;
  }

  setPixels() {
    this.pixels = Actor.generatePixels([' x', 'xxxx']);
  }

  update() {
    this.ofs.set(ui.targetPos);
    this.ofs.sub(this.pos);
    let d = this.ofs.mag();
    if (d <= this.chasingSpeed) {
      this.pos.set(ui.targetPos);
    } else {
      this.ofs.div(d / this.chasingSpeed);
      this.pos.add(this.ofs);
    }
    this.pos.set(
      p.constrain(this.pos.x, 0, screenSize.x),
      p.constrain(this.pos.y, 0, screenSize.y)
    );
    scrollOffsetX =
      (this.pos.x / screenSize.x) * (scrollScreenSizeX - screenSize.x);
    this.normalizedPos.set(this.pos.x / screenSize.x, this.pos.y / screenSize.y);
    super.update();
    this.fireTicks--;
    if (this.fireTicks <= 0) {
      new Shot(this.normalizedPos);
      this.fireTicks = this.fireInterval;
    }
  }
}

class Shot extends Actor {
  static pixels;
  normalizedPos: p5.Vector = new p5.Vector();

  constructor(pos: p5.Vector) {
    super();
    if (Shot.pixels == null) {
      Shot.pixels = Actor.generatePixels(['xx', ''], { isMirrorX: true });
    }
    this.pixels = Shot.pixels;
    this.normalizedPos.set(pos);
    this.angle = -p.HALF_PI;
    this.collision.set(10, 10);
  }

  update() {
    this.normalizedPos.y -= 0.04;
    setPosFromNormalizedPos(this);
    _.forEach(this.testCollision('Enemy'), a => {
      this.remove();
      a.remove();
    });
    super.update();
  }
}

class Enemy extends Actor {
  flyingCurve: FlyingCurve;
  stepIndex = -1;
  sineAngle: number;
  sineCenterX: number;
  yWay = 1;
  firingTicks: number;
  firingInterval: number;
  normalizedPos: p5.Vector = new p5.Vector();

  spawn() {
    this.pixels = this.flyingCurve.pixels;
    this.angle = p.HALF_PI;
    switch (this.flyingCurve.spawnType) {
      case SpawnType.random:
        this.normalizedPos.x = random.get();
        this.sineAngle = random.get() < 0.5 ? - p.PI / 2 : p.PI / 2;
        break;
      case SpawnType.oppositeX:
        if (player.normalizedPos.x > 0.5) {
          this.normalizedPos.x = 0.25;
          this.sineAngle = -p.PI / 2;
        } else {
          this.normalizedPos.x = 0.75;
          this.sineAngle = p.PI / 2;
        }
        break;
    }
    this.normalizedPos.y = -0.04;
    this.firingInterval = 120 / Math.sqrt(loop.ticks * 0.01 + 1);
    this.firingTicks = random.getInt(this.firingInterval);
    this.collision.set(8, 8);
    this.goToNextStep();
  }

  goToNextStep() {
    this.stepIndex++;
    const step = this.flyingCurve.steps[this.stepIndex];
    let t;
    switch (step.curve.type) {
      case CurveType.sine:
        const w = p.sin(this.sineAngle) * step.curve.width;
        this.sineCenterX = this.normalizedPos.x - w;
        break;
      case CurveType.aimX:
      case CurveType.opposite:
        t = this.yWay > 0 ? (1 - this.normalizedPos.y) / step.ySpeed : this.normalizedPos.y / step.ySpeed;
        t = p.constrain(t, 1, 9999999);
        let ax = step.curve.type === CurveType.aimX ? player.normalizedPos.x :
          (this.normalizedPos.x < 0.5 ? 0.75 : 0.25);
        this.vel.x = (ax - this.normalizedPos.x) / t;
        break;
      case CurveType.aim:
        const ox = player.normalizedPos.x - this.normalizedPos.x;
        const oy = player.normalizedPos.y - this.normalizedPos.y;
        t = p.mag(ox, oy) / step.ySpeed;
        t = p.constrain(t, 1, 9999999);
        this.vel.set(ox, oy);
        this.vel.div(t);
        break;
    }
  }

  update() {
    const step = this.flyingCurve.steps[this.stepIndex];
    switch (step.curve.type) {
      case CurveType.sine:
        this.normalizedPos.x = p.sin(this.sineAngle) * step.curve.width + this.sineCenterX;
        this.sineAngle += step.curve.angleSpeed * this.flyingCurve.velScale.x;
        break;
      case CurveType.aimX:
      case CurveType.opposite:
        this.normalizedPos.x += this.vel.x * this.flyingCurve.velScale.x;
        break;
      case CurveType.aim:
        this.normalizedPos.x += this.vel.x * this.flyingCurve.velScale.x;
        this.normalizedPos.y += this.vel.y * this.flyingCurve.velScale.y;
        break;
    }
    if (step.curve.type !== CurveType.aim) {
      this.normalizedPos.y += step.ySpeed * this.yWay * this.flyingCurve.velScale.y;
    }
    if (step.isFiring) {
      this.firingTicks--;
      if (this.firingTicks <= 0) {
        new Bullet(this.normalizedPos);
        this.firingTicks = this.firingInterval;
      }
    }
    setPosFromNormalizedPos(this);
    this.checkTrigger();
    super.update();
  }

  checkTrigger() {
    const trigger = this.flyingCurve.steps[this.stepIndex].trigger;
    let isFired = false;
    switch (trigger.type) {
      case TriggerType.crossHalf:
        isFired = (this.normalizedPos.y - 0.5) * this.yWay > 0;
        break;
      case TriggerType.crossPlayer:
        isFired = (this.normalizedPos.y - player.normalizedPos.y) * this.yWay > 0;
        break;
      case TriggerType.hitTopBottom:
        isFired = (this.yWay > 0 && this.normalizedPos.y > 1) ||
          (this.yWay < 0 && this.normalizedPos.y < 0);
        break;
    }
    if (isFired) {
      if (trigger.isReverseYWay) {
        this.yWay *= -1;
      }
      this.goToNextStep();
    }
  }
}

class FlyingCurve {
  steps: Step[];
  spawnType: SpawnType;
  velScale: p5.Vector = new p5.Vector(1, 1);
  pixels;

  constructor() {
    this.generate();
    this.pixels = Actor.generatePixels([' --', '-xx-'],
      { seed: random.getToMaxInt(), hue: 0.2 });
  }

  generate() {
    this.steps = [];
    const sc = random.getInt(1, 4);
    this.steps = _.times(sc, () => {
      const step = new Step();
      step.curve.type = getRandomEnum(CurveType);
      step.curve.angleSpeed = get2DRandom(0.01, 0.15);
      step.curve.width = get2DRandom(0.1, 0.5);
      step.ySpeed = get2DRandom(0.005, 0.015);
      step.trigger.type = getRandomEnum(TriggerType, 1);
      step.trigger.isReverseYWay = random.get() < 0.5;
      step.isFiring = sc === 1 || random.get() < 0.75;
      return step;
    });
    this.steps[this.steps.length - 1].trigger.type = TriggerType.none;
    this.spawnType = getRandomEnum(SpawnType);
    this.velScale.x = get2DRandom(0.5, 1.5);
    this.velScale.y = get2DRandom(0.5, 1.5);
  }
}

class Step {
  curve = new Curve();
  trigger = new Trigger();
  ySpeed: number;
  isFiring: boolean;
}

class Curve {
  type: CurveType;
  width: number;
  angleSpeed: number;
}

enum CurveType {
  down, opposite, aim, aimX, sine
}

class Trigger {
  type: TriggerType;
  isReverseYWay = false;
}

enum TriggerType {
  crossHalf, crossPlayer, hitTopBottom, none
}

enum SpawnType {
  random, oppositeX
}

function get2DRandom(from: number, to: number) {
  const o = (to - from) / 2;
  return random.get() * o + random.get() * o + from;
}

function getRandomEnum(obj, offset = 0) {
  return obj[obj[random.getInt(_.keys(obj).length / 2 - offset)]];
}

class Bullet extends Actor {
  static pixels;
  normalizedPos: p5.Vector = new p5.Vector();
  normalizedAngle: number;
  normalizedSpeed: number;

  constructor(pos: p5.Vector) {
    super();
    if (Bullet.pixels == null) {
      Bullet.pixels = Actor.generatePixels([' x', 'xx'],
        { scale: 1, hue: 0.1, isMirrorX: true });
    }
    this.pixels = Bullet.pixels;
    this.normalizedPos.set(pos);
    let ofs: p5.Vector = new p5.Vector();
    ofs.set(player.normalizedPos);
    ofs.sub(pos);
    this.normalizedAngle = ofs.heading();
    this.normalizedSpeed = get2DRandom(0.01, Math.sqrt(loop.ticks * 0.005 + 1) * 0.01);
  }

  update() {
    this.normalizedPos.x += Math.cos(this.normalizedAngle) * this.normalizedSpeed;
    this.normalizedPos.y += Math.sin(this.normalizedAngle) * this.normalizedSpeed;
    setPosFromNormalizedPos(this);
    this.angle += 0.1;
    super.update();
  }
}

function setPosFromNormalizedPos(actor) {
  actor.pos.x = actor.normalizedPos.x * scrollScreenSizeX - scrollOffsetX;
  actor.pos.y = actor.normalizedPos.y * screenSize.y;
  if (actor.pos.x < screenSize.x * -0.05 || actor.pos.x > screenSize.x * 1.05 ||
    actor.normalizedPos.y < -0.05 || actor.normalizedPos.y > 1.05) {
    actor.remove();
  }
}