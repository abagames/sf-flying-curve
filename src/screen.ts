import * as loop from './loop';
import * as ppe from 'ppe';

export let size: p5.Vector;
export let canvas: HTMLCanvasElement;
export let context: CanvasRenderingContext2D;
export let bloomContext: CanvasRenderingContext2D;
export let overlayContext: CanvasRenderingContext2D;
export let options = {
  backgroundColor: 0,
  bloomIntensity: 0.2
};

let p5;
let p: p5;

export function init(x: number = 128, y: number = 128) {
  p5 = loop.p5;
  p = loop.p;
  size = new p5.Vector(x, y);
  canvas = p.createCanvas(size.x, size.y).canvas;
  canvas.setAttribute('style', null);
  canvas.setAttribute('id', 'main');
  context = canvas.getContext('2d');
  ppe.options.canvas = canvas;
  const bloomCanvas = <HTMLCanvasElement>document.getElementById('bloom');
  bloomCanvas.width = size.x / 2;
  bloomCanvas.height = size.y / 2;
  bloomContext = bloomCanvas.getContext('2d');
  const overlayCanvas = <HTMLCanvasElement>document.getElementById('overlay');
  overlayCanvas.width = size.x;
  overlayCanvas.height = size.y;
  overlayContext = overlayCanvas.getContext('2d');
}

export function clear() {
  p.background(options.backgroundColor);
  bloomContext.clearRect(0, 0, size.x / 2, size.y / 2);
  overlayContext.clearRect(0, 0, size.x, size.y);
}

export function drawBloomParticles() {
  const pts = ppe.getParticles();
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const r = Math.floor(Math.sqrt(p.color.r) * 255);
    const g = Math.floor(Math.sqrt(p.color.g) * 255);
    const b = Math.floor(Math.sqrt(p.color.b) * 255);
    const a = Math.max(p.color.r, p.color.g, p.color.b) * options.bloomIntensity;
    bloomContext.fillStyle = `rgba(${r},${g},${b}, ${a})`;
    bloomContext.fillRect((p.pos.x - p.size) / 2, (p.pos.y - p.size) / 2, p.size, p.size);
  }
}
