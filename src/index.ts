import * as _ from 'lodash';
declare const require: any;
const p5_js = require('p5');
let p: p5;
new p5_js(_p => {
  p = _p;
  p.setup = init;
  p.draw = update;
});
const Vector = p5_js.Vector;

const screenSize = new Vector(96, 128);

function init() {
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
