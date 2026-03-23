/**
 * Geminus Ratio — Seeded pseudo-random number generator (LCG).
 * Shared across renderer and game logic for deterministic randomness.
 */
/* eslint-disable no-unused-vars */
function seedRng(seed) {
  var s = seed;
  return function () {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}
