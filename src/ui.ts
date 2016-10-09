import * as sss from 'sss';
import * as loop from './loop';

let p5 = loop.p5;
let p: p5;

export let cursorPos: p5.Vector = new p5.Vector();
export let targetPos: p5.Vector = new p5.Vector();
export let isPressing = false;
export let isPressed = false;
let canvas: HTMLCanvasElement;
let pixelSize: p5.Vector;
let currentTargetPos: p5.Vector = new p5.Vector();
let prevCursorPos: p5.Vector = new p5.Vector();

export function init(_canvas: HTMLCanvasElement, _pixelSize: p5.Vector) {
  canvas = _canvas;
  pixelSize = _pixelSize;
  document.onmousedown = (e) => {
    onMouseTouchDown(e.pageX, e.pageY);
  };
  document.ontouchstart = (e) => {
    onMouseTouchDown(e.touches[0].pageX, e.touches[0].pageY);
  };
  document.onmousemove = (e) => {
    onMouseTouchMove(e.pageX, e.pageY);
  };
  document.ontouchmove = (e) => {
    e.preventDefault();
    onMouseTouchMove(e.touches[0].pageX, e.touches[0].pageY);
  };
  document.onmouseup = (e) => {
    onMouseTouchUp(e);
  };
  document.ontouchend = (e) => {
    onMouseTouchUp(e);
  };
}

export function setCurrentTargetPos(_currentTargetPos: p5.Vector) {
  currentTargetPos = _currentTargetPos;
}

function onMouseTouchDown(x, y) {
  calcCursorPos(x, y, cursorPos);
  targetPos.set(currentTargetPos != null ? currentTargetPos : cursorPos);
  prevCursorPos.set(cursorPos);
  sss.playEmpty();
  isPressing = isPressed = true;
}

function onMouseTouchMove(x, y) {
  calcCursorPos(x, y, cursorPos);
  if (isPressing) {
    prevCursorPos.sub(cursorPos);
    targetPos.sub(prevCursorPos);
  } else {
    targetPos.set(cursorPos);
  }
  prevCursorPos.set(cursorPos);
}

function calcCursorPos(x, y, v) {
  v.set(
    ((x - canvas.offsetLeft) / canvas.clientWidth + 0.5) * pixelSize.x,
    ((y - canvas.offsetTop) / canvas.clientHeight + 0.5) * pixelSize.y
  );
}

function onMouseTouchUp(e) {
  isPressing = false;
}
