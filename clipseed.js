// clipseed.js
//
// Makes the clip the seed, using the DFT (decks 03-04): the seed is the
// clip's strongest frequency bin. Every Math.random() and Noise.noise()
// value that follows comes from it instead of the fixed start (1234).
// Needs Prng (prng.js) and Noise (noise.js).

// Seed everything from the clip's spectrum.
//   spec        result of magnitudeSpectrum (spectrum.js): { mag, size }
//   sampleRate  samples per second
// Returns { bin, freq }: the strongest bin m, and its frequency m * fs / N.
function seedFromClip(spec, sampleRate) {
  var bin = 1;                              // skip bin 0 (the average, 0 Hz)
  for (var m = 2; m < spec.mag.length; m++) {
    if (spec.mag[m] > spec.mag[bin]) bin = m;   // the largest |X[m]|
  }

  // Start Prng from the bin number. Prng's state must not be 0 or 1, or a
  // multiple of p or q, or squaring would get stuck, so move past those.
  var s = bin;
  while (s < 2 || s % Prng.p === 0 || s % Prng.q === 0) s++;
  Prng.s = s;
  for (var i = 0; i < 10; i++) Prng.next();  // skip the first values

  // Refill the Perlin noise table from the same number.
  Noise.noiseSeed(bin);

  return { bin: bin, freq: (bin * sampleRate) / spec.size };
}
