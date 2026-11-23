// prng.js
//
// Replaces Math.random with a deterministic generator (Blum Blum Shub):
// each call squares the state modulo m = p * q and returns state / m.
// There is no seed: it always starts from state 1234, so everything drawn
// from Math.random (the paper's grain, the noise table) is the same on
// every load.

var Prng = {
  s: 1234,                  // current state
  p: 999979,                // two primes, both 3 mod 4
  q: 999983,
  m: 999979 * 999983,       // modulus
  next: function () {
    Prng.s = (Prng.s * Prng.s) % Prng.m;
    return Prng.s / Prng.m; // a number in [0, 1)
  }
};

Math.random = function () {
  return Prng.next();
};
