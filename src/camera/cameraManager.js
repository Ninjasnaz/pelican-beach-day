import * as THREE from 'three';
import { stepFly, clampCamera, createInputState, MAX_PITCH, LOOK_SPEED } from './flyControls.js';
import { createFollowCam } from './followCam.js';
import { createDragTracker } from './drag.js';

const EASE_TIME = 0.8;
const ease = (t) => t * t * (3 - 2 * t);

// Owns the camera: free flight on desktop, follow mode on demand (F) or always
// on touch devices. Esc or F drops back to free flight from wherever you are.
export function createCameraManager(ctx, camera, rider, { touch = false, dom = ctx.renderer.domElement, onMode = () => {} } = {}) {
  const input = createInputState(window);
  const follow = createFollowCam(rider);
  let fly = poseToFly();
  let mode = 'free';
  let transition = null; // { t, fromPos, fromQuat }
  const tmp = new THREE.Camera(); // cameras look down -Z, so lookAt matches the real camera

  function poseToFly() {
    const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    return { pos: camera.position.clone(), yaw: e.y, pitch: e.x };
  }

  function setMode(next, { instant = false } = {}) {
    if (touch) next = 'follow';
    if (next === mode) return;
    mode = next;
    if (mode === 'follow') {
      followInit = false; // start from where he is now, not where we left him
      transition = instant ? null : { t: 0, fromPos: camera.position.clone(), fromQuat: camera.quaternion.clone() };
    } else {
      transition = null;
      fly = poseToFly();
    }
    onMode(mode);
  }

  // Mouse drag looks around (free) or orbits the pelican (follow).
  if (!touch) {
    createDragTracker(dom, window, (dx, dy) => {
      if (mode === 'follow') follow.drag(dx, dy);
      else {
        fly.yaw -= dx * LOOK_SPEED;
        fly.pitch = THREE.MathUtils.clamp(fly.pitch - dy * LOOK_SPEED, -MAX_PITCH, MAX_PITCH);
      }
    });
    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (mode === 'follow') follow.zoom(e.deltaY);
      else {
        const step = THREE.MathUtils.clamp(-e.deltaY * 0.03, -8, 8);
        fly = stepFly(fly, { forward: Math.sign(step), right: 0, up: 0, boost: false }, Math.abs(step) / 12);
        clampCamera(fly.pos, ctx.heightAt);
      }
    }, { passive: false });
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.code === 'KeyF') setMode(mode === 'follow' ? 'free' : 'follow');
      else if (e.code === 'Escape') setMode('free');
    });
  }

  const followPos = new THREE.Vector3();
  let followInit = false;

  function update(dt) {
    if (mode === 'free') {
      fly = stepFly(fly, input.read(), dt);
      clampCamera(fly.pos, ctx.heightAt);
      camera.position.copy(fly.pos);
      camera.rotation.set(fly.pitch, fly.yaw, 0, 'YXZ');
      return;
    }
    const { position, target } = follow.desiredPose();
    clampCamera(position, ctx.heightAt);
    if (!followInit) { followPos.copy(position); followInit = true; }
    followPos.lerp(position, 1 - Math.exp(-dt * 5));
    tmp.position.copy(followPos);
    tmp.lookAt(target);
    if (transition) {
      transition.t = Math.min(1, transition.t + dt / EASE_TIME);
      const k = ease(transition.t);
      camera.position.lerpVectors(transition.fromPos, followPos, k);
      camera.quaternion.slerpQuaternions(transition.fromQuat, tmp.quaternion, k);
      if (transition.t >= 1) transition = null;
    } else {
      camera.position.copy(followPos);
      camera.quaternion.copy(tmp.quaternion);
    }
  }

  if (touch) {
    mode = 'follow';
    onMode(mode);
  }

  return { get mode() { return mode; }, setMode, update };
}
