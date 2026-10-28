// Size the drawing buffer and camera from the canvas's real box. On phones,
// window.innerHeight and CSS 100vh disagree while the URL bar shows.
export function syncViewport(renderer, camera, canvas, devicePixelRatio = 1) {
  const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
