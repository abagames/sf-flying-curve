import * as _ from 'lodash';
import * as loop from './loop';
import Actor from './actor';

let p5 = loop.p5;
let p: p5;
let screenSize: p5.Vector;

loop.init(init, update);

function init() {
  p = loop.p;
  screenSize = new p5.Vector(96, 128);
  const p5Canvas = p.createCanvas(screenSize.x, screenSize.y);
  p5Canvas.canvas.setAttribute('style', null);
  p5Canvas.canvas.setAttribute('id', 'main');
  p.fill(255);
  p.noStroke();
}

function update() {
  if (loop.ticks % 30 === 0) {
    new Enemy();
  }
}

class Enemy extends Actor {
  constructor() {
    super();
    this.pos.x = 50;
  }

  update() {
    this.pos.y++;
    p.rect(this.pos.x, this.pos.y, 5, 5);
  }
}
