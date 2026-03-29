/**
 * Geminus Ratio — Seeded pseudo-random number generator (LCG).
 * Shared across renderer and game logic for deterministic randomness.
 *
 * Uses Math.imul for correct 32-bit multiplication (avoids IEEE 754
 * precision loss that would degrade the period with plain `*`).
 * Output range is [0, 1) to match Math.random() semantics.
 */
/* eslint-disable no-unused-vars */
function seedRng(seed) {
  var s = seed | 0;
  for (var i = 0; i < 3; i++) s = (Math.imul(s, 1103515245) + 12345) | 0;
  return function () {
    s = (Math.imul(s, 1103515245) + 12345) | 0;
    return (s >>> 0) / 0x100000000;
  };
}
