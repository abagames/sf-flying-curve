import * as _ from 'lodash';
declare const require: any;
export const p5 = require('p5');

export default class Actor {
  pos: p5.Vector = new p5.Vector();
  vel: p5.Vector = new p5.Vector();
  angle = 0;
  speed = 0;
  isAlive = true;
  priority = 1;
  ticks = 0;

  constructor() {
    Actor.add(this);
  }

  update() {
    this.pos.add(this.vel);
    this.pos.x += Math.cos(this.angle) * this.speed;
    this.pos.y += Math.sin(this.angle) * this.speed;
    this.ticks++;
  }

  remove() {
    this.isAlive = false;
  }

  static actors: any[];

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
}
