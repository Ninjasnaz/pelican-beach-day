import { describe, it, expect } from 'vitest';
import { createDragTracker } from '../src/camera/drag.js';

function target() {
  const l = {};
  return { addEventListener: (t, fn) => { (l[t] ||= []).push(fn); }, fire: (t, e = {}) => (l[t] || []).forEach((fn) => fn(e)) };
}

describe('createDragTracker', () => {
  it('drags with the left button', () => {
    const dom = target(), win = target(), moves = [];
    createDragTracker(dom, win, (dx, dy) => moves.push([dx, dy]));
    dom.fire('pointerdown', { button: 0, clientX: 10, clientY: 10, pointerId: 1 });
    dom.fire('pointermove', { buttons: 1, clientX: 15, clientY: 8 });
    expect(moves).toEqual([[5, -2]]);
  });
  it('ignores right-clicks (context menu would swallow the pointerup)', () => {
    const dom = target(), win = target(), moves = [];
    createDragTracker(dom, win, (dx, dy) => moves.push([dx, dy]));
    dom.fire('pointerdown', { button: 2, clientX: 10, clientY: 10 });
    dom.fire('pointermove', { buttons: 0, clientX: 50, clientY: 50 });
    expect(moves).toEqual([]);
  });
  it('ends a drag when no button is held anymore', () => {
    const dom = target(), win = target(), moves = [];
    createDragTracker(dom, win, (dx, dy) => moves.push([dx, dy]));
    dom.fire('pointerdown', { button: 0, clientX: 0, clientY: 0 });
    dom.fire('pointermove', { buttons: 0, clientX: 30, clientY: 0 });
    dom.fire('pointermove', { buttons: 0, clientX: 60, clientY: 0 });
    expect(moves).toEqual([]);
  });
  it('ends a drag on lost pointer capture and on window blur', () => {
    for (const [who, ev] of [['dom', 'lostpointercapture'], ['win', 'blur']]) {
      const dom = target(), win = target(), moves = [];
      createDragTracker(dom, win, (dx, dy) => moves.push([dx, dy]));
      dom.fire('pointerdown', { button: 0, clientX: 0, clientY: 0 });
      (who === 'dom' ? dom : win).fire(ev);
      dom.fire('pointermove', { buttons: 1, clientX: 30, clientY: 0 });
      expect(moves).toEqual([]);
    }
  });
});
