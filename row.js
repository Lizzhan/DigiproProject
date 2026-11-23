// row.js
//
// One mountain with one row, from the clip:
//   1. sample 48 values from the clip (time or frequency domain)
//   2. pin both ends to 0, giving 50 values
//   3. fill the gaps between them with Perlin bumps
//   4. paint the row: white fill + brush outline
// Needs Noise (noise.js), Math.random (prng.js) and poly/stroke (brush.js).

var ROW_POINTS = 50;   // points in the row, as in the original mountain
var FILL = 10;         // steps per gap: 9 new points between each pair
var BUMP = 0.5;        // bump size, as a share of the local height (+-50%)
var BUMP_SCALE = 16;   // noise read 16x finer: about one bump per gap

// Time domain: cut the clip into `count` slices and take the loudest sample
// (ignoring sign) in each. Values 0..1, in time order.
function rowValuesTime(samples, count) {
  var vals = [];
  for (var k = 0; k < count; k++) {
    var a = Math.floor((k * samples.length) / count);      // slice start
    var b = Math.floor(((k + 1) * samples.length) / count); // slice end
    var peak = 0;
    for (var i = a; i < b; i++) {
      var v = Math.abs(samples[i]);
      if (v > peak) peak = v;
    }
    vals.push(peak);
  }
  return vals;
}

// Frequency domain: the level in dB at `count` frequencies spaced by octave,
// between fmin and the Nyquist frequency. -80 dB and below -> 0, the
// strongest bin -> 1. Values 0..1, from low to high frequency.
//   spec  result of magnitudeSpectrum: { mag, size }
function rowValuesFrequency(spec, sampleRate, count, fmin, floorDb) {
  var mag = spec.mag, max = 0, m;
  for (m = 1; m < mag.length; m++) if (mag[m] > max) max = mag[m];
  var fmax = sampleRate / 2;                // Nyquist frequency
  var res = sampleRate / spec.size;         // Hz per bin
  var vals = [];
  for (var i = 1; i <= count; i++) {
    // Point i of count + 2 points spread from fmin to fmax, equal ratios.
    var f = fmin * Math.pow(fmax / fmin, i / (count + 1));
    var bin = Math.min(mag.length - 1, Math.round(f / res));  // nearest bin
    var db = 20 * Math.log10(Math.max(mag[bin], 1e-12) / max);
    vals.push(Math.min(1, Math.max(0, (db - floorDb) / -floorDb)));
  }
  return vals;
}

// Add a 0 at both ends and fill each gap with Perlin bumps.
// Each new point: base + base * BUMP * (2 * noise - 1) * sin(pi * t)
//   base       straight line between the two clip values
//   noise      Perlin noise, 0..1, read BUMP_SCALE times finer along the row
//   sin(pi t)  0 at both clip values, so they never move
// Returns (ROW_POINTS - 1) * FILL + 1 heights, 0..about 1.5.
function rowHeights(values) {
  var v = [0].concat(values, [0]);           // 50 values, ends on the ground
  var seed = Math.random() * 10;             // which part of the noise to read
  var gaps = v.length - 1;
  var h = [];
  for (var k = 0; k < gaps; k++) {
    for (var s = 0; s < FILL; s++) {
      var t = s / FILL;                       // 0..0.9 across the gap
      var u = (k + t) / gaps;                 // 0..1 along the whole row
      var x = (u - 0.5) * Math.PI;            // same x range as the original
      var base = v[k] * (1 - t) + v[k + 1] * t;
      var n = Noise.noise((x + 10) * BUMP_SCALE, 0, seed);
      h.push(base + base * BUMP * (2 * n - 1) * Math.sin(Math.PI * t));
    }
  }
  h.push(v[gaps]);                            // last point: 0
  return h;
}

// Paint the mountain from its heights.
//   cx, by   centre x and base y on the painting
//   wid, hei width in px, and px per unit of height
function drawMountain(heights, cx, by, wid, hei) {
  var pts = heights.map(function (h, i) {
    return [cx - wid / 2 + (wid * i) / (heights.length - 1), by - h * hei];
  });
  // White fill: the row plus a point below the base, so it hides what is behind.
  var canv = poly(pts.concat([[cx, by + 30]]), { fil: "white", str: "none" });
  // Outline: the original mountain's brush settings, a little darker.
  canv += stroke(pts, { col: "rgba(100,100,100,0.6)", wid: 3, noi: 1 });
  return canv;
}
