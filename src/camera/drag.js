// Left-button drag tracking that can't get stuck: right-click/context menu,
// lost pointer capture, released buttons, and window blur all end the drag.
export function createDragTracker(dom, win, onDrag) {
  let last = null;
  const end = () => { last = null; };
  dom.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    last = { x: e.clientX, y: e.clientY };
    dom.setPointerCapture?.(e.pointerId);
  });
  dom.addEventListener('pointermove', (e) => {
    if (!last) return;
    if (!e.buttons) return end();
    const dx = e.clientX - last.x, dy = e.clientY - last.y;
    last = { x: e.clientX, y: e.clientY };
    onDrag(dx, dy);
  });
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture', 'contextmenu']) dom.addEventListener(t, end);
  win.addEventListener('blur', end);
}
