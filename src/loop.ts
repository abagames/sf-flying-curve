import Actor from './actor';
import * as debug from './debug';
import * as pag from 'pag';

declare const require: any;
export const p5 = require('p5');
export let p: p5;
export let options = {
  backgroundColor: 0
};
export let ticks = 0;

let initFunc: Function;
let updateFunc: Function;
let onSeedChangedFunc: Function;

export function init(_initFunc: () => void, _updateFunc: () => void) {
  initFunc = _initFunc;
  updateFunc = _updateFunc;
  new p5(_p => {
    p = _p;
    p.setup = setup;
    p.draw = draw;
  });
}

export function enableDebug(onSeedChanged = null) {
  onSeedChangedFunc = onSeedChanged;
  debug.initSeedUi(sestSeeds);
}

function setup() {
  Actor.init();
  initFunc();
}

function draw() {
  p.background(options.backgroundColor);
  updateFunc();
  Actor.update();
  ticks++;
}

function sestSeeds(seed: number) {
  pag.setSeed(seed);
  /*sss.reset();
  sss.setSeed(seed);
  ppe.setSeed(seed);
  ppe.reset();
  if (scene === Scene.game) {
    sss.playBgm();
  }*/
  onSeedChangedFunc();
}
