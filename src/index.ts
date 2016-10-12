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
  player = new Player();
}

function update() {
  if (loop.ticks % 200 === 0) {
    flyingCurve = new FlyingCurve();
  }
  if (loop.ticks % 20 === 0) {
    const e = new Enemy();
    e.flyingCurve = flyingCurve;
    e.spawn();
  }
}

class Player extends Actor {
  screenPos: p5.Vector = new p5.Vector();

  constructor() {
    super();
    this.screenPos.set(screenSize.x / 2, screenSize.y * 0.8);
    ui.setCurrentTargetPos(this.screenPos);
  }

  update() {
    this.screenPos.set(ui.targetPos);
    this.screenPos.set(
      p.constrain(this.screenPos.x, 0, screenSize.x),
      p.constrain(this.screenPos.y, 0, screenSize.y)
    );
    scrollOffsetX =
      (this.screenPos.x / screenSize.x) * (scrollScreenSizeX - screenSize.x);
    this.pos.set(
      this.screenPos.x / screenSize.x,
      this.screenPos.y / screenSize.y
    );
    p.rect(this.screenPos.x - 2.5, this.screenPos.y - 2.5, 5, 5);
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
  firingInterval = 60;

  spawn() {
    switch (this.flyingCurve.spawnType) {
      case SpawnType.random:
        this.pos.x = random.get();
        this.pos.y = -0.05;
        this.sineAngle = random.get() < 0.5 ? - p.PI / 2 : p.PI / 2;
        break;
      case SpawnType.oppositeX:
        if (player.pos.x > 0.5) {
          this.pos.x = 0.25;
          this.sineAngle = -p.PI / 2;
        } else {
          this.pos.x = 0.75;
          this.sineAngle = p.PI / 2;
        }
        break;
    }
    this.firingTicks = random.getInt(this.firingInterval);
    this.goToNextStep();
  }

  goToNextStep() {
    this.stepIndex++;
    const step = this.flyingCurve.steps[this.stepIndex];
    let t;
    switch (step.curve.type) {
      case CurveType.sine:
        const w = p.sin(this.sineAngle) * step.curve.width;
        this.sineCenterX = this.pos.x - w;
        break;
      case CurveType.aimX:
      case CurveType.opposite:
        t = this.yWay > 0 ? (1 - this.pos.y) / step.ySpeed : this.pos.y / step.ySpeed;
        t = p.constrain(t, 1, 9999999);
        let ax = step.curve.type === CurveType.aimX ? player.pos.x :
          (this.pos.x < 0.5 ? 0.75 : 0.25);
        this.vel.x = (ax - this.pos.x) / t;
        break;
      case CurveType.aim:
        const ox = player.pos.x - this.pos.x;
        const oy = player.pos.y - this.pos.y;
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
        this.pos.x = p.sin(this.sineAngle) * step.curve.width + this.sineCenterX;
        this.sineAngle += step.curve.angleSpeed * this.flyingCurve.velScale.x;
        break;
      case CurveType.aimX:
      case CurveType.opposite:
        this.pos.x += this.vel.x * this.flyingCurve.velScale.x;
        break;
      case CurveType.aim:
        this.pos.x += this.vel.x * this.flyingCurve.velScale.x;
        this.pos.y += this.vel.y * this.flyingCurve.velScale.y;
        break;
    }
    if (step.curve.type !== CurveType.aim) {
      this.pos.y += step.ySpeed * this.yWay * this.flyingCurve.velScale.y;
    }
    if (step.isFiring) {
      this.firingTicks--;
      if (this.firingTicks <= 0) {
        new Bullet(this.pos);
        this.firingTicks = this.firingInterval;
      }
    }
    const sx = this.pos.x * scrollScreenSizeX - scrollOffsetX;
    const sy = this.pos.y * screenSize.y;
    if (sx < scrollScreenSizeX * -0.1 || sx > scrollScreenSizeX * 1.1 ||
      this.pos.y < -0.1 || this.pos.y > 1.1) {
      this.remove();
    }
    p.rect(sx - 2.5, sy - 2.5, 5, 5);
    this.checkTrigger();
    super.update();
  }

  checkTrigger() {
    const trigger = this.flyingCurve.steps[this.stepIndex].trigger;
    let isFired = false;
    switch (trigger.type) {
      case TriggerType.crossHalf:
        isFired = (this.pos.y - 0.5) * this.yWay > 0;
        break;
      case TriggerType.crossPlayer:
        isFired = (this.pos.y - player.pos.y) * this.yWay > 0;
        break;
      case TriggerType.hitTopBottom:
        isFired = (this.yWay > 0 && this.pos.y > 1) || (this.yWay < 0 && this.pos.y < 0);
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

  constructor() {
    this.generate();
  }

  generate() {
    this.steps = [];
    const sc = random.getInt(1, 4);
    this.steps = _.times(sc, () => {
      const step = new Step();
      step.curve.type = getRandomEnum(CurveType);
      step.curve.angleSpeed = get2DRandom(0.02, 0.2);
      step.curve.width = get2DRandom(0.1, 0.5);
      step.ySpeed = get2DRandom(0.01, 0.02);
      step.trigger.type = getRandomEnum(TriggerType, 1);
      step.trigger.isReverseYWay = random.get() < 0.5;
      step.isFiring = random.get() < 0.75;
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
  constructor(pos: p5.Vector) {
    super();
    this.pos.set(pos);
    let ofs: p5.Vector = new p5.Vector();
    ofs.set(player.pos);
    ofs.sub(pos);
    this.angle = ofs.heading();
    this.speed = random.get(0.01, 0.03);
  }

  update() {
    const sx = this.pos.x * scrollScreenSizeX - scrollOffsetX;
    const sy = this.pos.y * screenSize.y;
    if (sx < scrollScreenSizeX * -0.1 || sx > scrollScreenSizeX * 1.1 ||
      this.pos.y < -0.1 || this.pos.y > 1.1) {
      this.remove();
    }
    p.rect(sx - 1.5, sy - 1.5, 3, 3);
    super.update();
  }
}