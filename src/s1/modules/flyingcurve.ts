import * as _ from 'lodash';
import * as pag from 'pag';
import * as s1 from '../index';

export class FlyingCurve {
  steps: Step[];
  spawnType: SpawnType;
  velScale = s1.createVector();
  pixels;
  random: s1.Random;
  normalizedPos = s1.createVector();
  vel = s1.createVector();
  stepIndex = -1;
  sineAngle = 0;
  sineCenterX = 0;
  yWay = 1;
  currentStep: Step;

  constructor(public player: any, public seed: number) {
    this.random = new s1.Random();
    this.random.setSeed(this.seed);
    this.generate();
    this.pixels = pag.generate([' --', '-xx-'],
      { seed: this.random.getToMaxInt(), hue: 0.2 });
    this.spawn();
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

  spawn() {
    switch (this.spawnType) {
      case SpawnType.random:
        this.normalizedPos.x = s1.random.get();
        this.sineAngle = s1.random.get() < 0.5 ? - s1.p.PI / 2 : s1.p.PI / 2;
        break;
      case SpawnType.oppositeX:
        if (this.player.normalizedPos.x > 0.5) {
          this.normalizedPos.x = 0.25;
          this.sineAngle = -s1.p.PI / 2;
        } else {
          this.normalizedPos.x = 0.75;
          this.sineAngle = s1.p.PI / 2;
        }
        break;
    }
    this.normalizedPos.y = -0.04;
    this.goToNextStep();
  }

  goToNextStep() {
    this.stepIndex++;
    const step = this.steps[this.stepIndex];
    let t;
    switch (step.curve.type) {
      case CurveType.sine:
        const w = s1.p.sin(this.sineAngle) * step.curve.width;
        this.sineCenterX = this.normalizedPos.x - w;
        break;
      case CurveType.aimX:
      case CurveType.opposite:
        t = this.yWay > 0 ?
          (1 - this.normalizedPos.y) / step.ySpeed :
          this.normalizedPos.y / step.ySpeed;
        t = s1.p.constrain(t, 1, 9999999);
        let ax = step.curve.type === CurveType.aimX ?
          this.player.normalizedPos.x :
          (this.normalizedPos.x < 0.5 ? 0.75 : 0.25);
        this.vel.x = (ax - this.normalizedPos.x) / t;
        break;
      case CurveType.aim:
        const ox = this.player.normalizedPos.x - this.normalizedPos.x;
        const oy = this.player.normalizedPos.y - this.normalizedPos.y;
        t = s1.p.mag(ox, oy) / step.ySpeed;
        t = s1.p.constrain(t, 1, 9999999);
        this.vel.set(ox, oy);
        this.vel.div(t);
        break;
    }
    this.currentStep = step;
  }

  update() {
    const step = this.steps[this.stepIndex];
    switch (step.curve.type) {
      case CurveType.sine:
        this.normalizedPos.x =
          s1.p.sin(this.sineAngle) * step.curve.width + this.sineCenterX;
        this.sineAngle += step.curve.angleSpeed * this.velScale.x;
        break;
      case CurveType.aimX:
      case CurveType.opposite:
        this.normalizedPos.x += this.vel.x * this.velScale.x;
        break;
      case CurveType.aim:
        this.normalizedPos.x += this.vel.x * this.velScale.x;
        this.normalizedPos.y += this.vel.y * this.velScale.y;
        break;
    }
    if (step.curve.type !== CurveType.aim) {
      this.normalizedPos.y += step.ySpeed * this.yWay * this.velScale.y;
    }
    this.checkTrigger();
  }

  checkTrigger() {
    const trigger = this.steps[this.stepIndex].trigger;
    let isFired = false;
    switch (trigger.type) {
      case TriggerType.crossHalf:
        isFired = (this.normalizedPos.y - 0.5) * this.yWay > 0;
        break;
      case TriggerType.crossPlayer:
        isFired =
          (this.normalizedPos.y - this.normalizedPos.y) *
          this.yWay > 0;
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
