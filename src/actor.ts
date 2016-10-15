import * as _ from 'lodash';
import * as pag from 'pag';
import * as loop from './loop';
let p5 = loop.p5;
let p: p5;

const rotationNum = 16;

export default class Actor {
  pos: p5.Vector = new p5.Vector();
  vel: p5.Vector = new p5.Vector();
  angle = 0;
  speed = 0;
  isAlive = true;
  priority = 1;
  ticks = 0;
  pixels: pag.Pixel[][][];

  constructor() {
    Actor.add(this);
  }

  update() {
    this.pos.add(this.vel);
    this.pos.x += Math.cos(this.angle) * this.speed;
    this.pos.y += Math.sin(this.angle) * this.speed;
    if (this.pixels != null) {
      this.drawPixels();
    }
    this.ticks++;
  }

  remove() {
    this.isAlive = false;
  }

  drawPixels() {
    let a = this.angle;
    if (a < 0) {
      a = Math.PI * 2 - Math.abs(a % (Math.PI * 2));
    }
    const pxs: pag.Pixel[][] =
      this.pixels[Math.round(a / (Math.PI * 2 / rotationNum)) % rotationNum];
    const pw = pxs.length;
    const ph = pxs[0].length;
    const sbx = p.floor(this.pos.x - pw / 2);
    const sby = p.floor(this.pos.y - ph / 2);
    p.noStroke();
    for (let y = 0, sy = sby; y < ph; y++ , sy++) {
      for (let x = 0, sx = sbx; x < pw; x++ , sx++) {
        var px = pxs[x][y];
        if (!px.isEmpty) {
          p.fill(px.style);
          p.rect(sx, sy, 1, 1);
        }
      }
    }
  }

  static actors: any[];

  static init() {
    p = loop.p;
    pag.defaultOptions.isMirrorY = true;
    pag.defaultOptions.rotationNum = rotationNum;
    pag.defaultOptions.scale = 2;
    Actor.clear();
  }

  static add(actor) {
    Actor.actors.push(actor);
  }

  static clear() {
    Actor.actors = [];
  }

  static update() {
    Actor.actors.sort((a, b) => a.priority - b.priority);
    _.forEach(Actor.actors, a => {
      a.update();
    });
    for (let i = 0; i < Actor.actors.length;) {
      if (Actor.actors[i].isAlive === false) {
        Actor.actors.splice(i, 1);
      } else {
        i++;
      }
    }
  }

  static generatePixels(pattern: string[], options = {}): pag.Pixel[][][] {
    return pag.generate(pattern, options);
  }
}
