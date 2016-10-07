import * as _ from 'lodash';
import * as loop from './loop';

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
  p.background(0);
  _.times(5, i => {
    p.rect(i * 20, i * 30, 5, 5);
  });
}
