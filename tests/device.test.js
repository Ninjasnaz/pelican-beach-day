import { describe, it, expect } from 'vitest';
import { isTouchPrimary } from '../src/camera/device.js';

const mm = (matches) => (q) => ({ matches: !!matches[q] });

describe('isTouchPrimary', () => {
  it('is true for phones and tablets (coarse only)', () => {
    expect(isTouchPrimary(mm({ '(pointer: coarse)': true }))).toBe(true);
  });
  it('is false for touch laptops that also have a mouse', () => {
    expect(isTouchPrimary(mm({ '(pointer: coarse)': true, '(any-pointer: fine)': true }))).toBe(false);
  });
  it('is false for desktops', () => {
    expect(isTouchPrimary(mm({ '(pointer: fine)': true, '(any-pointer: fine)': true }))).toBe(false);
  });
});
