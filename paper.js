// Draw the paper tile on the hidden canvas and return it as a PNG data URL.
function makePaper() {
  var canvas = document.getElementById("bgcanv"); // the hidden 512 x 512 canvas
  var ctx = canvas.getContext("2d");              // 2D drawing context for it
  var reso = 512;                                 // tile size in pixels

  // Compute one quarter of the tile (257 x 257 pixels, i and j = 0..256);
  // each value is copied into the other three quarters by mirroring.
  for (var i = 0; i < reso / 2 + 1; i++) {        // column in the quarter
    for (var j = 0; j < reso / 2 + 1; j++) {      // row in the quarter
      // Base tone 245-255: Perlin noise sampled every 0.1 units changes
      // slowly, so neighbouring pixels are similar -> soft blotches ~10 px.
      var c = 245 + Noise.noise(i * 0.1, j * 0.1) * 10;
      // Grain: darken each pixel by an independent 0-20 -> fine speckle.
      c -= Math.random() * 20;

      var r = c.toFixed(0);            // red   = c        (rounded)
      var g = (c * 0.95).toFixed(0);   // green = 95% of c
      var b = (c * 0.85).toFixed(0);   // blue  = 85% of c: least blue -> cream
      ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")"; // colour to paint

      // Write the same colour to 4 mirrored positions, so the tile is
      // symmetric left-right and top-bottom and its edges match when tiled.
      ctx.fillRect(i, j, 1, 1);                    // top-left quarter
      ctx.fillRect(reso - i, j, 1, 1);             // mirrored left-right
      ctx.fillRect(i, reso - j, 1, 1);             // mirrored top-bottom
      ctx.fillRect(reso - i, reso - j, 1, 1);      // mirrored both ways
      // (when i or j is 0, the mirrored copy lands at 512, off the canvas,
      //  and is dropped; row and column 256 mirror onto themselves)
    }
  }
  return canvas.toDataURL("image/png");            // canvas -> PNG data URL
}

var img = makePaper();
// Use the tile as the background of the painting area; CSS repeats it.
document.getElementById("BG").style.backgroundImage = "url(" + img + ")";
// ...and of the whole page, so the margins match.
document.getElementsByTagName("body")[0].style.backgroundImage =
  "url(" + img + ")";