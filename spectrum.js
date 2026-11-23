// spectrum.js
//
// The clip in the frequency domain: the magnitude of its DFT, drawn as one
// ink shape. Needs FFT (fft.js) and poly() (brush.js).

// DFT of the whole clip (decks 03-04), using the FFT from fft.js.
// The FFT needs a power-of-two length, so the clip is padded with zeros
// (661,500 samples -> 1,048,576). Returns the magnitude |X[m]| of bins
// 0..size/2; the upper half of the bins mirrors these, so it is not needed.
function magnitudeSpectrum(samples) {
  var size = 1;
  while (size < samples.length) size *= 2;        // next power of two
  var input = new Array(size).fill(0);            // zeros after the clip
  for (var i = 0; i < samples.length; i++) input[i] = samples[i];
  var fft = new FFT(size);
  var out = fft.createComplexArray();             // [re0, im0, re1, im1, ...]
  fft.realTransform(out, input);
  var mag = new Float32Array(size / 2 + 1);
  for (var m = 0; m <= size / 2; m++) {
    var re = out[2 * m], im = out[2 * m + 1];
    mag[m] = Math.sqrt(re * re + im * im);         // |X[m]|
  }
  return { mag: mag, size: size };
}

// Return the outline of the spectrum as [x, y] points.
//   spec      result of magnitudeSpectrum
//   fs        sample rate (bin m is frequency m * fs / size)
//   W         width in px; x runs from fmin to fmax on a log scale
//   base      y of the baseline; height  px from silence to the loudest bin
//   fmin, fmax  frequency range in Hz; floorDb  quietest level shown (e.g. -80)
// Levels are in dB relative to the loudest bin: 20 * log10(|X| / max).
// Each column covers many bins, so it shows the loudest bin in its range.
function spectrumPoints(spec, fs, W, base, height, fmin, fmax, floorDb) {
  var mag = spec.mag, size = spec.size, max = 0, m;
  for (m = 1; m < mag.length; m++) if (mag[m] > max) max = mag[m];
  var curve = [];
  var ratio = Math.log(fmax / fmin);
  for (var x = 0; x < W; x++) {
    var f0 = fmin * Math.exp(ratio * x / W);       // column's lowest frequency
    var f1 = fmin * Math.exp(ratio * (x + 1) / W); // and highest
    var m0 = Math.floor(f0 * size / fs);           // frequency -> bin number
    var m1 = Math.max(m0 + 1, Math.ceil(f1 * size / fs));
    var peak = 0;
    for (m = m0; m < m1 && m < mag.length; m++) if (mag[m] > peak) peak = mag[m];
    var db = peak > 0 ? 20 * Math.log10(peak / max) : floorDb;
    var level = Math.max(0, (db - floorDb) / -floorDb); // 0 at floorDb, 1 at 0 dB
    curve.push([x, base - level * height]);
  }
  // Closed shape: along the curve, then back along the baseline.
  return curve.concat([[W - 1, base], [0, base]]);
}

// x position of frequency f on the same log scale (for tick labels).
function freqToX(f, W, fmin, fmax) {
  return W * Math.log(f / fmin) / Math.log(fmax / fmin);
}
