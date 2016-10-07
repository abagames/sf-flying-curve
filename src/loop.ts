declare const require: any;
export const p5 = require('p5');
export let p: p5;

export function init(initFunc: () => void, updateFunc: () => void) {
  new p5(_p => {
    p = _p;
    p.setup = initFunc;
    p.draw = updateFunc;
  });
}
