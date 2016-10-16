import Actor from './actor';
import * as screen from './screen';
import * as debug from './debug';
import * as pag from 'pag';
import * as ppe from 'ppe';

declare const require: any;
export const p5 = require('p5');
export let p: p5;
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
  screen.clear();
  ppe.update();
  screen.drawBloomParticles();
  updateFunc();
  Actor.update();
  ticks++;
}

function sestSeeds(seed: number) {
  pag.setSeed(seed);
  ppe.setSeed(seed);
  ppe.reset();
  /*sss.reset();
  sss.setSeed(seed);
  if (scene === Scene.game) {
    sss.playBgm();
  }*/
  onSeedChangedFunc();
}
