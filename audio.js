// audio.js
//
// Turns an audio file into a waveform the generator can read.
// Defines one global, AudioClip, with:
//
//   load(file, opts)      decode a File/Blob into mono samples at a fixed rate;
//                         clips from 1 s up are accepted, longer ones cut to 15 s
//   normalize(samples)    scale so the loudest sample is exactly ±1
//   toIntegers(samples)   quantize floats back to signed integers (deck 02)
//   reader(samples)       wrap samples as a function of position u in [0, 1]
//   drawWaveform(...)     plot samples on a canvas, one min/max line per pixel
//
// Uses only the Web Audio API built into browsers.

var AudioClip = (function () {
  var DEFAULTS = {
    sampleRate: 44100, // every clip is converted to this rate
    seconds: 15,       // longer clips are cut to this length
    minSeconds: 1,     // shorter clips are rejected
    fit: "keep"        // what to do with a clip shorter than `seconds`:
                       //   "keep" use it at its own length
                       //   "loop" repeat it until it fills `seconds`
                       //   "pad"  fill the rest with silence
  };

  // Decode a File or Blob into one channel of samples.
  // Returns a Promise of:
  //   { samples: Float32Array, sampleRate, N, seconds,
  //     sourceSeconds, sourceChannels, cut, fit }
  // `seconds` is the length of `samples`; `fit` says how a short clip was
  // handled ("none" when the clip was long enough).
  function load(file, opts) {
    opts = Object.assign({}, DEFAULTS, opts || {});
    var maxN = Math.round(opts.seconds * opts.sampleRate);
    var minN = Math.round(opts.minSeconds * opts.sampleRate);

    return file.arrayBuffer().then(function (bytes) {
      // decodeAudioData converts to the context's sample rate, so a context
      // with a fixed rate gives every clip the same rate whatever the file had.
      var ctx = new OfflineAudioContext(1, 1, opts.sampleRate);
      return ctx.decodeAudioData(bytes);
    }).then(function (buffer) {
      var mono = toMono(buffer);
      if (mono.length < minN) {
        throw new Error("The clip is " + buffer.duration.toFixed(2) +
          " s long; it needs to be at least " + opts.minSeconds + " s.");
      }
      var fit = mono.length >= maxN ? "none" : opts.fit;
      var samples;
      if (fit === "none") {
        samples = mono.slice(0, maxN);
      } else if (fit === "loop") {
        samples = new Float32Array(maxN);
        for (var i = 0; i < maxN; i += mono.length) {
          samples.set(mono.subarray(0, Math.min(mono.length, maxN - i)), i);
        }
      } else if (fit === "pad") {
        samples = new Float32Array(maxN); // zeros after the clip
        samples.set(mono);
      } else if (fit === "keep") {
        samples = mono.slice();
      } else {
        throw new Error('Unknown fit "' + opts.fit + '": use "keep", "loop" or "pad".');
      }
      return {
        samples: samples,
        sampleRate: opts.sampleRate,
        N: samples.length,
        seconds: samples.length / opts.sampleRate,
        sourceSeconds: buffer.duration,
        sourceChannels: buffer.numberOfChannels,
        cut: mono.length > maxN,
        fit: fit
      };
    });
  }

  // Average all channels into one.
  function toMono(buffer) {
    var C = buffer.numberOfChannels;
    if (C === 1) return buffer.getChannelData(0);
    var out = new Float32Array(buffer.length);
    for (var c = 0; c < C; c++) {
      var ch = buffer.getChannelData(c);
      for (var i = 0; i < out.length; i++) out[i] += ch[i] / C;
    }
    return out;
  }

  // Peak-normalize to ±1. Returns a new array; silence stays silence.
  function normalize(samples) {
    var peak = 0;
    for (var i = 0; i < samples.length; i++) {
      var a = Math.abs(samples[i]);
      if (a > peak) peak = a;
    }
    var out = new Float32Array(samples.length);
    if (peak === 0) return out;
    for (var j = 0; j < samples.length; j++) out[j] = samples[j] / peak;
    return out;
  }

  // Quantize to signed integers with the given bit depth (default 16).
  // Returns an Int32Array so later differences (deck 09) can't overflow:
  // the difference of two 16-bit samples needs 17 bits.
  function toIntegers(samples, bits) {
    bits = bits || 16;
    var max = Math.pow(2, bits - 1) - 1;
    var min = -max - 1;
    var out = new Int32Array(samples.length);
    for (var i = 0; i < samples.length; i++) {
      var v = Math.round(samples[i] * max);
      out[i] = v > max ? max : v < min ? min : v;
    }
    return out;
  }

  // Return f(u) for u in [0, 1]: the signal at that fraction of the clip,
  // blended linearly between the two nearest samples. Values of u outside
  // [0, 1] are clamped. Works for any array, whatever its length.
  function reader(samples) {
    var last = samples.length - 1;
    return function (u) {
      if (!(u > 0)) return samples[0];   // also catches NaN
      if (u >= 1) return samples[last];
      var p = u * last;
      var i = Math.floor(p);
      var t = p - i;
      return samples[i] * (1 - t) + samples[i + 1] * t;
    };
  }

  // Draw the waveform: for each pixel column, a line from the minimum to the
  // maximum sample in that column's slice of the clip.
  function drawWaveform(canvas, samples, color) {
    var g = canvas.getContext("2d");
    var W = canvas.width, H = canvas.height, mid = H / 2;
    g.clearRect(0, 0, W, H);
    g.strokeStyle = color || "#555";
    g.beginPath();
    for (var x = 0; x < W; x++) {
      var a = Math.floor((x / W) * samples.length);
      var b = Math.max(a + 1, Math.floor(((x + 1) / W) * samples.length));
      var lo = 1, hi = -1;
      for (var i = a; i < b && i < samples.length; i++) {
        if (samples[i] < lo) lo = samples[i];
        if (samples[i] > hi) hi = samples[i];
      }
      g.moveTo(x + 0.5, mid - hi * mid);
      g.lineTo(x + 0.5, mid - lo * mid + 1);
    }
    g.stroke();
  }

  return {
    load: load,
    normalize: normalize,
    toIntegers: toIntegers,
    reader: reader,
    drawWaveform: drawWaveform
  };
})();
