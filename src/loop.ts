import Actor from './actor';

declare const require: any;
export const p5 = require('p5');
export let p: p5;
export let options = {
  backgroundColor: 0
};
export let ticks = 0;

let initFunc: Function;
let updateFunc: Function;

export function init(_initFunc: () => void, _updateFunc: () => void) {
  initFunc = _initFunc;
  updateFunc = _updateFunc;
  Actor.clear();
  new p5(_p => {
    p = _p;
    p.setup = setup;
    p.draw = draw;
  });
}

function setup() {
  initFunc();
}

function draw() {
  p.background(options.backgroundColor);
  updateFunc();
  Actor.update();
  ticks++;
}
