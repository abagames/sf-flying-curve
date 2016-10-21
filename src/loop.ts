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
let initGameFunc: Function;
let updateFunc: Function;
let onSeedChangedFunc: Function;
let actorGeneratorFunc: Function;
let getReplayStatusFunc: Function;
let setReplayStatusFunc: Function;
let title: string = 'N/A';
let isDebugEnabled = false;

export enum Scene {
  title, game, gameover, replay
};

export function init
  (_initFunc: () => void, _initGameFunc: () => void, _updateFunc: () => void) {
  initFunc = _initFunc;
  initGameFunc = _initGameFunc;
  updateFunc = _updateFunc;
  random = new Random();
  sss.init();
  new p5(_p => {
    p = _p;
    p.setup = setup;
    p.draw = draw;
  });
}

export function setTitle(_title: string) {
  title = _title;
}

export function setReplayFuncs(_actorGeneratorFunc: (type: string, status: any) => void,
  _getReplayStatusFunc: () => any, _setReplayStatusFunc: (status: any) => void) {
  actorGeneratorFunc = _actorGeneratorFunc;
  getReplayStatusFunc = _getReplayStatusFunc;
  setReplayStatusFunc = _setReplayStatusFunc;
}

export function enableDebug(_onSeedChangedFunc = null) {
  onSeedChangedFunc = _onSeedChangedFunc;
  debug.initSeedUi(setSeeds);
  debug.enableShowingErrors();
  isDebugEnabled = true;
}

export function beginGame() {
  scene = Scene.game;
  score = ticks = 0;
  sss.playBgm();
  ir.startRecord();
  Actor.clear();
  initGameFunc();
}

export function endGame() {
  if (scene === Scene.gameover) {
    return;
  }
  let isReplay = scene === Scene.replay;
  scene = Scene.gameover;
  ticks = 0;
  sss.stopBgm();
  if (!isReplay) {
    ir.saveAsUrl();
  }
}

export function beginTitle() {
  scene = Scene.title;
  ticks = 0;
}

export function beginReplay() {
  const status = ir.startReplay();
  if (status !== false) {
    scene = Scene.replay;
    Actor.clear();
    initGameFunc();
    setStatus(status);
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
  ui.init(screen.canvas, screen.size);
  if (isDebugEnabled) {
    beginGame();
  } else {
    if (ir.loadFromUrl() === true) {
      beginReplay();
    } else {
      beginTitle();
      initGameFunc();
    }
  }
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
    text.draw('GAME OVER', screen.size.x / 2, screen.size.y * 0.45, true);
    if (ticks === 60) {
      beginTitle();
    }
  }
  if (scene === Scene.title) {
    text.draw(title, screen.size.x / 2, screen.size.y * 0.45, true);
    if (ticks === 120) {
      beginReplay();
    }
  }
  if (scene === Scene.replay) {
    text.draw('REPLAY', screen.size.x / 2, screen.size.y * 0.55, true);
    const events = ir.getEvents();
    if (events !== false) {
      ui.setReplayEvents(events);
    } else {
      beginTitle();
    }
  }
}

function getStatus() {
  return [ticks, score, random.getStatus(), Actor.getReplayStatus(), getReplayStatusFunc()];
}

function setStatus(status) {
  Actor.setReplayStatus(status[3], actorGeneratorFunc);
  setReplayStatusFunc(status[4]);
  ticks = status[0];
  score = status[1];
  random.setStatus(status[2]);
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
