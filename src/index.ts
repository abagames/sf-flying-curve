import * as _ from 'lodash';
import * as pag from 'pag';
import * as ppe from 'ppe';
import * as sss from 'sss';
import * as s1 from './s1/index';

s1.init(init, initGame, update);

const scrollScreenSizeX = 128;
let scrollOffsetX: number;
let player: Player;
let flyingCurveSeed: number;

function init() {
  s1.screen.init(96, 128);
  s1.setTitle('SF FLYING CURVE');
  s1.setReplayFuncs(generateActor, getReplayStatus, setReplayStatus);
  s1.setSeeds(7589781);
  /*s1.enableDebug(() => {
    player.setPixels();
    Shot.pixels = null;
    Bullet.pixels = null;
  });*/
  pag.setDefaultOptions({
    isLimitingColors: true
  });
  ppe.setOptions({
    isLimitingColors: true
  });
}

function initGame() {
  if (s1.scene !== s1.Scene.replay) {
    player = new Player();
  }
  if (s1.scene === s1.Scene.title) {
    player.isVisible = false;
  }
  scrollOffsetX = 0;
  _.times(64, () => {
    new Star();
  });
}

function update() {
  if (s1.ticks % 240 === 0) {
    flyingCurveSeed = s1.random.getToMaxInt();
  }
  if (s1.ticks % 240 < 120 && s1.ticks % 12 === 0) {
    new Enemy();
  }
}

class Player extends s1.Actor {
  normalizedPos = s1.createVector();
  chasingSpeed = 1.5;
  ofs = s1.createVector();
  isVisible = true;

  constructor() {
    super();
    this.replayPropertyNames = ['pos.x', 'pos.y', 'fireTicks'];
    this.pos.set(s1.screen.size.x / 2, s1.screen.size.y * 0.8);
    this.setPixels();
    this.angle = -s1.p.HALF_PI;
    this.collision.set(1, 1);
    this.addModule(new s1.m.ChaseCursor(this));
    this.addModule(new s1.m.DoInterval(this, () => new Shot(this.normalizedPos), 7));
    this.priority = 0.5;
  }

  setPixels() {
    this.pixels = pag.generate([' x', 'xxxx']);
  }

  update() {
    if (!this.isVisible) {
      this.normalizedPos.set
        (this.pos.x / s1.screen.size.x, this.pos.y / s1.screen.size.y);
      return;
    }
    scrollOffsetX =
      (this.pos.x / s1.screen.size.x) * (scrollScreenSizeX - s1.screen.size.x);
    this.normalizedPos.set(this.pos.x / s1.screen.size.x, this.pos.y / s1.screen.size.y);
    super.update();
    if (this.testCollision('Enemy').length > 0 ||
      this.testCollision('Bullet').length > 0) {
      this.remove();
      ppe.emit('e2', this.pos.x, this.pos.y, 0,
        { sizeScale: 2, countScale: 2 });
      sss.play('u1', 4);
      s1.endGame();
    }
  }
}

class Shot extends s1.Actor {
  static pixels;
  normalizedPos = s1.createVector();

  constructor(pos: p5.Vector = null) {
    super();
    this.replayPropertyNames = ['normalizedPos.x', 'normalizedPos.y'];
    if (Shot.pixels == null) {
      Shot.pixels = pag.generate(['xx', ''], { isMirrorX: true });
    }
    this.pixels = Shot.pixels;
    if (pos != null) {
      this.normalizedPos.set(pos);
    }
    this.angle = -s1.p.HALF_PI;
    this.collision.set(10, 10);
    setPosFromNormalizedPos(this, this.normalizedPos);
    ppe.emit('m1', this.pos.x - 4, this.pos.y - 2, -s1.p.HALF_PI, { sizeScale: 0.25 });
    ppe.emit('m1', this.pos.x + 4, this.pos.y - 2, -s1.p.HALF_PI, { sizeScale: 0.25 });
    sss.play('l1');
  }

  update() {
    this.normalizedPos.y -= 0.04;
    setPosFromNormalizedPos(this, this.normalizedPos);
    _.forEach<Enemy>(this.testCollision('Enemy') as Enemy[], a => {
      this.remove();
      a.destroy();
    });
    super.update();
  }
}

class Enemy extends s1.Actor {
  flyingCurve: s1.m.FlyingCurve;
  prevPos = s1.createVector();

  constructor() {
    super();
    this.replayPropertyNames =
      ['flyingCurve.normalizedPos.x', 'flyingCurve.normalizedPos.y',
        'flyingCurve.vel.x', 'flyingCurve.vel.y',
        'flyingCurve.seed',
        'flyingCurve.stepIndex',
        'flyingCurve.sineAngle', 'flyingCurve.sineCenterX', 'flyingCurve.yWay',
        'firingTicks', 'firingInterval'];
    this.collision.set(8, 8);
    this.angle = s1.p.HALF_PI;
    this.flyingCurve = new s1.m.FlyingCurve(player, flyingCurveSeed);
    this.addModule(this.flyingCurve);
    this.setPixels();
    this.addModule(new s1.m.DoInterval(this,
      () => {
        if (this.flyingCurve.currentStep.isFiring) {
          new Bullet(this.flyingCurve.normalizedPos);
        }
      },
      Math.floor(150 / Math.sqrt(s1.ticks * 0.007 + 1)), true));
  }

  setPixels() {
    this.pixels = this.flyingCurve.pixels;
  }

  update() {
    this.prevPos.set(this.pos);
    setPosFromNormalizedPos(this, this.flyingCurve.normalizedPos);
    super.update();
  }

  destroy() {
    this.remove();
    this.prevPos.sub(this.pos).mult(0.5);
    ppe.emit('e1', this.pos.x, this.pos.y, 0,
      { velX: -this.prevPos.x, velY: -this.prevPos.y, slowdownRatio: 0.1 });
    s1.addScore(1);
    sss.play('e1');
  }
}

class Bullet extends s1.Actor {
  static pixels;
  normalizedPos = s1.createVector();
  normalizedAngle: number;
  normalizedSpeed: number;

  constructor(pos: p5.Vector = null) {
    super();
    this.replayPropertyNames =
      ['normalizedPos.x', 'normalizedPos.y', 'normalizedAngle', 'normalizedSpeed'];
    if (Bullet.pixels == null) {
      Bullet.pixels = pag.generate([' x', 'xx'],
        { scale: 1, hue: 0.1, isMirrorX: true });
    }
    this.pixels = Bullet.pixels;
    if (pos != null) {
      this.normalizedPos.set(pos);
      let ofs = s1.createVector();
      ofs.set(player.normalizedPos);
      ofs.sub(pos);
      this.normalizedAngle = ofs.heading();
      this.normalizedSpeed = s1.random.get(0.01, Math.sqrt(s1.ticks * 0.002 + 1) * 0.01);
    }
    this.collision.set(4, 4);
    setPosFromNormalizedPos(this, this.normalizedPos);
    ppe.emit('m2', this.pos.x, this.pos.y, this.normalizedAngle, 0.75);
    sss.play('l2', 3);
    this.priority = 2;
  }

  update() {
    this.normalizedPos.x += Math.cos(this.normalizedAngle) * this.normalizedSpeed;
    this.normalizedPos.y += Math.sin(this.normalizedAngle) * this.normalizedSpeed;
    setPosFromNormalizedPos(this, this.normalizedPos);
    this.angle += 0.1;
    super.update();
  }
}

class Star extends s1.Actor {
  color: string;

  constructor() {
    super();
    this.pos.set(s1.random.get(0, scrollScreenSizeX), s1.random.get(0, s1.screen.size.y));
    this.vel.y = s1.random.get(0.5, 2);
    this.priority = 0;
    this.color =
      `rgb(${s1.random.getInt(180, 250)},${s1.random.getInt(180, 250)},${s1.random.getInt(180, 250)})`;
    this.addModule(new s1.m.WrapPos(this));
  }

  update() {
    super.update();
    s1.screen.context.fillStyle = this.color;
    s1.screen.context.fillRect(this.pos.x - scrollOffsetX, this.pos.y, 1, 1);
  }
}

function setPosFromNormalizedPos(actor, normalizedPos) {
  actor.pos.x = normalizedPos.x * scrollScreenSizeX - scrollOffsetX;
  actor.pos.y = normalizedPos.y * s1.screen.size.y;
  if (actor.pos.x < s1.screen.size.x * -0.05 || actor.pos.x > s1.screen.size.x * 1.05 ||
    normalizedPos.y < -0.05 || normalizedPos.y > 1.05) {
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
      actor.flyingCurve = new s1.m.FlyingCurve(player, actor.flyingCurve.seed);
      actor.clearModules();
      actor.addModule(actor.flyingCurve);
      actor.setPixels();
      break;
    case 'Bullet':
      actor = new Bullet();
      break;
  }
  actor.setReplayStatus(status);
}

function getReplayStatus() {
  return [flyingCurveSeed];
}

function setReplayStatus(status) {
  flyingCurveSeed = status[0];
}
