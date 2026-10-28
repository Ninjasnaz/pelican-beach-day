// Phones and tablets: a coarse pointer and no fine pointer anywhere.
// Touch laptops with a trackpad or mouse still get desktop controls.
export function isTouchPrimary(matchMedia = globalThis.matchMedia) {
  if (typeof matchMedia !== 'function') return false;
  return matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
}
