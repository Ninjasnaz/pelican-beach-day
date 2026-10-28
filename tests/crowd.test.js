import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { mulberry32, SEED } from '../src/util/rng.js';
import { createTrack } from '../src/track/trackPath.js';
import { createLayout } from '../src/util/layout.js';
import { heightAt } from '../src/world/terrain.js';
import { createCrowd } from '../src/people/crowd.js';
import { createPerson } from '../src/people/person.js';

function stubCtx() {
  const track = createTrack();
  const layout = createLayout(track);
  const updaters = [];
  return {
    scene: new THREE.Scene(),
    rng: mulberry32(SEED),
    heightAt,
    zone: layout.zone,
    track,
    reserve: layout.reserve,
    addUpdater: (fn) => updaters.push(fn),
    updaters,
  };
}

describe('createPerson', () => {
  it('builds a group with separately animatable head and right arm', () => {
    for (const age of ['kid', 'adult', 'senior'])
      for (const pose of ['stand', 'sit', 'lie']) {
        const p = createPerson(mulberry32(7), { age, pose });
        expect(p.group.isObject3D).toBe(true);
        for (const k of ['torso', 'head', 'armL', 'armR', 'legL', 'legR']) expect(p.parts[k].isObject3D).toBe(true);
        expect(p.parts.head).not.toBe(p.parts.armR);
        expect(p.parts.head).not.toBe(p.parts.torso);
        expect(p.parts.armR).not.toBe(p.parts.torso);
        expect(p.look.skinTone).toBeTypeOf('number');
      }
  });
  it('scales kids to about 0.6 of an adult', () => {
    const size = (age) => new THREE.Box3().setFromObject(createPerson(mulberry32(3), { age, pose: 'stand' }).group).getSize(new THREE.Vector3()).y;
    expect(size('kid') / size('adult')).toBeLessThan(0.75);
  });
});

describe('createCrowd', () => {
  const ctx = stubCtx();
  const { people } = createCrowd(ctx, 60);

  it('returns 60 people and registers exactly one updater', () => {
    expect(people.length).toBe(60);
    expect(ctx.updaters.length).toBe(1);
    for (const p of people) expect(['pacer', 'looker', 'waver', 'sitter']).toContain(p.kind);
  });
  it('includes kids, adults and seniors', () => {
    expect(new Set(people.map((p) => p.age))).toEqual(new Set(['kid', 'adult', 'senior']));
  });
  it('uses at least 6 skin tones and 6 outfit colors', () => {
    expect(new Set(people.map((p) => p.look.skinTone)).size).toBeGreaterThanOrEqual(6);
    expect(new Set(people.map((p) => p.look.outfit)).size).toBeGreaterThanOrEqual(6);
  });
  it('keeps everyone out of the water and off the boardwalk, even while idling', () => {
    const check = () => {
      for (const p of people) {
        const { x, z } = p.group.position;
        expect(ctx.zone(x, z)).not.toBe('water');
        expect(heightAt(x, z)).toBeGreaterThan(0);
        expect(ctx.track.distanceTo(x, z)).toBeGreaterThan(ctx.track.width / 2 + 1);
      }
    };
    check();
    for (let t = 0; t < 40; t += 0.5) {
      ctx.updaters[0](0.5, t);
      check();
    }
  });
  it('is deterministic for a given seed', () => {
    const snap = () => createCrowd(stubCtx(), 30).people.map((p) => [p.group.position.x, p.group.position.z, p.kind, p.age]);
    expect(snap()).toEqual(snap());
  });
  it('puts some people in line at provided queue spots', () => {
    const c = stubCtx();
    const spots = [0, 1, 2, 3].map((i) => ({ x: 20, z: -34 + i * 1.0, facing: Math.PI }));
    const { people: ps } = createCrowd(c, 40, { queueSpots: spots });
    expect(ps.length).toBe(40);
    const near = spots.filter((s) => ps.some((p) => Math.hypot(p.group.position.x - s.x, p.group.position.z - s.z) < 0.6));
    expect(near.length).toBeGreaterThanOrEqual(3);
  });
});
