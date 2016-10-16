import * as loop from './loop';
import * as ppe from 'ppe';

export let size: p5.Vector;
export let canvas: HTMLCanvasElement;

let p5 = loop.p5;
let p: p5;

export function init(x: number = 128, y: number = 128) {
  p = loop.p;
  size = new p5.Vector(x, y);
  canvas = p.createCanvas(size.x, size.y).canvas;
  canvas.setAttribute('style', null);
  canvas.setAttribute('id', 'main');
  ppe.options.canvas = canvas;
}
