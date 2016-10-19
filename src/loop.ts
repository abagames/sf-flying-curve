import Actor from './actor';
import * as screen from './screen';
import * as text from './text';
import * as ui from './ui';
import Random from './random';
import * as debug from './debug';
import * as pag from 'pag';
import * as ppe from 'ppe';
import * as sss from 'sss';
import * as ir from 'ir';

declare const require: any;
export const p5 = require('p5');
export let p: p5;
export let ticks = 0;
export let score = 0;
export let random: Random;
export let scene: Scene;

let initFunc: Function;
let updateFunc: Function;
let onSeedChangedFunc: Function;
let classGeneratorFunc: Function;
let title: string = 'N/A';
let isDebugEnabled = false;

enum Scene {
  title, game, gameover, replay
};

export function init(_initFunc: () => void, _updateFunc: () => void) {
  initFunc = _initFunc;
  updateFunc = _updateFunc;
  random = new Random();
  sss.init();
  scene = Scene.title;
  new p5(_p => {
    p = _p;
    p.setup = setup;
    p.draw = draw;
  });
}

export function setTitle(_title: string) {
  title = _title;
}

export function setClassGeneratorFunc(_classGeneratorFunc) {
  classGeneratorFunc = _classGeneratorFunc;
}

export function enableDebug(_onSeedChangedFunc = null) {
  onSeedChangedFunc = _onSeedChangedFunc;
  debug.initSeedUi(setSeeds);
  debug.enableShowingErrors();
  isDebugEnabled = true;
  beginGame();
}

export function beginGame() {
  scene = Scene.game;
  score = ticks = 0;
  sss.playBgm();
  ir.startRecord();
  Actor.clear();
}

export function endGame() {
  if (scene === Scene.gameover || scene === Scene.replay) {
    return;
  }
  scene = Scene.gameover;
  ticks = 0;
  sss.stopBgm();
  ir.saveAsUrl();
}

export function beginTitle() {
  scene = Scene.title;
  ticks = 0;
}

export function beginReplay() {
  const status = ir.startReplay();
  if (status !== false) {
    setStatus(status);
    scene = Scene.replay;
  } else {
    beginTitle();
  }
}

export function addScore(v: number) {
  if (scene === Scene.game || scene === Scene.replay) {
    score += v;
  }
}

function setup() {
  Actor.init();
  initFunc();
}

function draw() {
  screen.clear();
  handleScene();
  sss.update();
  ppe.update();
  screen.drawBloomParticles();
  updateFunc();
  Actor.update();
  text.draw(`${score}`, 1, 1);
  ticks++;
}

function handleScene() {
  if (scene !== Scene.game && ui.isPressed) {
    beginGame();
  }
  ui.resetPressed();
  if (scene === Scene.game) {
    ir.record(getStatus(), ui.getReplayEvents());
  }
  if (scene === Scene.gameover) {
    text.draw('GAME OVER', 64, 60, true);
    if (ticks >= 60) {
      beginTitle();
    }
  }
  if (scene === Scene.title) {
    text.draw(title, 64, 60, true);
    if (ticks >= 120) {
      beginReplay();
    }
  }
  if (scene === Scene.replay) {
    text.draw('REPLAY', 64, 70, true);
    const events = ir.getEvents();
    if (events !== false) {
      ui.setReplayEvents(events);
    } else {
      beginTitle();
    }
  }
}

function getStatus() {
  return [ticks, score, random.getStatus(), Actor.getReplayStatus()];
}

function setStatus(status) {
  ticks = status[0];
  score = status[1];
  random.setStatus(status[2]);
  Actor.setReplayStatus(status[3], classGeneratorFunc);
}

function setSeeds(seed: number) {
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
