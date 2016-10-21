import * as _ from 'lodash';
import * as ppe from 'ppe';
import * as loop from './loop';
import Actor from './actor';
import Random from './random';
import * as ui from './ui';
import * as screen from './screen';

let p5 = loop.p5;
let p: p5;
let random: Random;

loop.init(init, initGame, update);

const scrollScreenSizeX = 128;
let scrollOffsetX: number;
let player: Player;
let flyingCurve: FlyingCurve;

function init() {
  p = loop.p;
  random = loop.random;
  screen.init(96, 128);
  loop.setTitle('SF FLYING CURVE');
  loop.setReplayFuncs(generateActor, getReplayStatus, setReplayStatus);
  loop.enableDebug(() => {
    player.setPixels();
    Shot.pixels = null;
    Bullet.pixels = null;
  });
}

function initGame() {
  if (loop.scene !== loop.Scene.replay) {
    player = new Player();
  }
  if (loop.scene === loop.Scene.title) {
    player.isVisible = false;
  }
  scrollOffsetX = 0;
  flyingCurve = new FlyingCurve();
  _.times(64, () => {
    new Star();
  });
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
  fireInterval = 7;
  fireTicks = 0;
  chasingSpeed = 1.5;
  ofs: p5.Vector = new p5.Vector();
  isVisible = true;

  constructor() {
    super();
    this.replayPropertyNames = ['pos.x', 'pos.y', 'fireTicks'];
    this.pos.set(screen.size.x / 2, screen.size.y * 0.8);
    ui.setCurrentTargetPos(this.pos);
    this.setPixels();
    this.angle = -p.HALF_PI;
    this.collision.set(1, 1);
  }

  setPixels() {
    this.pixels = Actor.generatePixels([' x', 'xxxx']);
  }

  update() {
    if (!this.isVisible) {
      this.normalizedPos.set(this.pos.x / screen.size.x, this.pos.y / screen.size.y);
      return;
    }
    this.ofs.set(ui.getTargetPos());
    this.ofs.sub(this.pos);
    let d = this.ofs.mag();
    if (d <= this.chasingSpeed) {
      this.pos.set(ui.getTargetPos());
    } else {
      this.ofs.div(d / this.chasingSpeed);
      this.pos.add(this.ofs);
    }
    this.pos.set(
      p.constrain(this.pos.x, 0, screen.size.x),
      p.constrain(this.pos.y, 0, screen.size.y)
    );
    scrollOffsetX =
      (this.pos.x / screen.size.x) * (scrollScreenSizeX - screen.size.x);
    this.normalizedPos.set(this.pos.x / screen.size.x, this.pos.y / screen.size.y);
    super.update();
    this.fireTicks--;
    if (this.fireTicks <= 0) {
      new Shot(this.normalizedPos);
      this.fireTicks = this.fireInterval;
    }
    if (this.testCollision('Enemy').length > 0 ||
      this.testCollision('Bullet').length > 0) {
      this.remove();
      ppe.emit('e2', this.pos.x, this.pos.y, 0, 2, 2);
      loop.endGame();
    }
  }
}

class Shot extends Actor {
  static pixels;
  normalizedPos: p5.Vector = new p5.Vector();

  constructor(pos: p5.Vector = null) {
    super();
    this.replayPropertyNames = ['normalizedPos.x', 'normalizedPos.y'];
    if (Shot.pixels == null) {
      Shot.pixels = Actor.generatePixels(['xx', ''], { isMirrorX: true });
    }
    this.pixels = Shot.pixels;
    if (pos != null) {
      this.normalizedPos.set(pos);
    }
    this.angle = -p.HALF_PI;
    this.collision.set(10, 10);
    setPosFromNormalizedPos(this);
    ppe.emit('m1', this.pos.x - 4, this.pos.y - 2, -p.HALF_PI, 0.25);
    ppe.emit('m1', this.pos.x + 4, this.pos.y - 2, -p.HALF_PI, 0.25);
  }

  update() {
    this.normalizedPos.y -= 0.04;
    setPosFromNormalizedPos(this);
    _.forEach<Enemy>(this.testCollision('Enemy') as Enemy[], a => {
      this.remove();
      a.destroy();
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
  prevPos: p5.Vector = new p5.Vector();

  constructor() {
    super();
    this.replayPropertyNames =
      ['normalizedPos.x', 'normalizedPos.y', 'vel.x', 'vel.y',
        'flyingCurve.seed',
        'stepIndex', 'sineAngle', 'sineCenterX', 'yWay',
        'firingTicks', 'firingInterval'];
    this.collision.set(8, 8);
    this.angle = p.HALF_PI;
  }

  spawn() {
    this.setPixels();
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
    this.firingInterval = Math.floor(150 / Math.sqrt(loop.ticks * 0.007 + 1));
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

  setPixels() {
    this.pixels = this.flyingCurve.pixels;
  }

  update() {
    this.prevPos.set(this.pos);
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

  destroy() {
    this.remove();
    this.prevPos.sub(this.pos);
    ppe.emit('e1', this.pos.x, this.pos.y,
      0, 1, 1, null, -this.prevPos.x, -this.prevPos.y);
    loop.addScore(1);
  }
}

class FlyingCurve {
  steps: Step[];
  spawnType: SpawnType;
  velScale: p5.Vector = new p5.Vector(1, 1);
  pixels;
  seed: number;
  random: Random;

  constructor(seed: number = null) {
    this.seed = seed == null ? random.getToMaxInt() : seed;
    console.log(this.seed);
    this.random = new Random();
    this.random.setSeed(this.seed);
    this.generate();
    this.pixels = Actor.generatePixels([' --', '-xx-'],
      { seed: this.random.getToMaxInt(), hue: 0.2 });
  }

  generate() {
    this.steps = [];
    const sc = this.random.getInt(1, 4);
    this.steps = _.times(sc, () => {
      const step = new Step();
      step.curve.type = this.getRandomEnum(CurveType);
      step.curve.angleSpeed = this.get2DRandom(0.01, 0.15);
      step.curve.width = this.get2DRandom(0.1, 0.5);
      step.ySpeed = this.get2DRandom(0.005, 0.015);
      step.trigger.type = this.getRandomEnum(TriggerType, 1);
      step.trigger.isReverseYWay = this.random.get() < 0.5;
      step.isFiring = sc === 1 || this.random.get() < 0.75;
      return step;
    });
    this.steps[this.steps.length - 1].trigger.type = TriggerType.none;
    this.spawnType = this.getRandomEnum(SpawnType);
    this.velScale.x = this.get2DRandom(0.5, 1.5);
    this.velScale.y = this.get2DRandom(0.5, 1.5);
  }

  get2DRandom(from: number, to: number) {
    const o = (to - from) / 2;
    return this.random.get() * o + this.random.get() * o + from;
  }

  getRandomEnum(obj, offset = 0) {
    return obj[obj[this.random.getInt(_.keys(obj).length / 2 - offset)]];
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

class Bullet extends Actor {
  static pixels;
  normalizedPos: p5.Vector = new p5.Vector();
  normalizedAngle: number;
  normalizedSpeed: number;

  constructor(pos: p5.Vector = null) {
    super();
    this.replayPropertyNames =
      ['normalizedPos.x', 'normalizedPos.y', 'normalizedAngle', 'normalizedSpeed'];
    if (Bullet.pixels == null) {
      Bullet.pixels = Actor.generatePixels([' x', 'xx'],
        { scale: 1, hue: 0.1, isMirrorX: true });
    }
    this.pixels = Bullet.pixels;
    this.context = screen.overlayContext;
    if (pos != null) {
      this.normalizedPos.set(pos);
      let ofs: p5.Vector = new p5.Vector();
      ofs.set(player.normalizedPos);
      ofs.sub(pos);
      this.normalizedAngle = ofs.heading();
      this.normalizedSpeed = random.get(0.01, Math.sqrt(loop.ticks * 0.002 + 1) * 0.01);
    }
    this.collision.set(4, 4);
    setPosFromNormalizedPos(this);
    ppe.emit('m2', this.pos.x, this.pos.y, this.normalizedAngle, 0.5);
  }

  update() {
    this.normalizedPos.x += Math.cos(this.normalizedAngle) * this.normalizedSpeed;
    this.normalizedPos.y += Math.sin(this.normalizedAngle) * this.normalizedSpeed;
    setPosFromNormalizedPos(this);
    this.angle += 0.1;
    super.update();
  }
}

class Star extends Actor {
  color: string;

  constructor() {
    super();
    this.pos.set(random.get(0, scrollScreenSizeX), random.get(0, screen.size.y));
    this.vel.y = random.get(0.5, 2);
    this.priority = 0;
    this.color =
      `rgb(${random.getInt(180, 250)},${random.getInt(180, 250)},${random.getInt(180, 250)})`;
  }

  update() {
    super.update();
    screen.context.fillStyle = this.color;
    screen.context.fillRect(this.pos.x - scrollOffsetX, this.pos.y, 1, 1);
    if (this.pos.y > screen.size.y) {
      this.pos.y -= screen.size.y;
    }
  }
}

function setPosFromNormalizedPos(actor) {
  actor.pos.x = actor.normalizedPos.x * scrollScreenSizeX - scrollOffsetX;
  actor.pos.y = actor.normalizedPos.y * screen.size.y;
  if (actor.pos.x < screen.size.x * -0.05 || actor.pos.x > screen.size.x * 1.05 ||
    actor.normalizedPos.y < -0.05 || actor.normalizedPos.y > 1.05) {
    actor.remove();
  }
}

function generateActor(type, status) {
  let actor: any;
  switch (type) {
    case 'Player':
      player = actor = new Player();
      break;
    case 'Shot':
      actor = new Shot();
      break;
    case 'Enemy':
      actor = new Enemy();
      actor.setReplayStatus(status);
      actor.flyingCurve = new FlyingCurve(actor.flyingCurve.seed);
      actor.setPixels();
      break;
    case 'Bullet':
      actor = new Bullet();
      break;
  }
  actor.setReplayStatus(status);
}

function getReplayStatus() {
  return [flyingCurve.seed];
}

function setReplayStatus(status) {
  flyingCurve = new FlyingCurve(status[0]);
}
