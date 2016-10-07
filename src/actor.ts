import * as _ from 'lodash';
declare const require: any;
export const p5 = require('p5');

export default class Actor {
  pos = new p5.Vector();
  vel = new p5.Vector();
  angle = 0;
  speed = 1;
  isAlive = true;
  priority = 1;

  constructor() {
    Actor.add(this);
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
