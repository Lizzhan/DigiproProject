// brush.js
//
// Ink and brush strokes. Needs Noise (noise.js) and Math.random (prng.js).
//
//   poly(points, opts)    write one SVG <polyline>. The only function that
//                         outputs SVG: every mark in the painting ends up here.
//   stroke(points, opts)  turn a centre line into a brush stroke: a filled
//                         shape whose width tapers and wavers along the line.
//
// Ink: marks are grey, rgba(100,100,100,a), at low opacity a. The SVG they go
// into is drawn with mix-blend-mode: multiply over the paper, so ink darkens
// the paper instead of covering it, overlapping marks build up like washes,
// and white shapes show as plain paper (used to hide what is behind them).

// Write a list of points as one SVG <polyline> and return it as a string.
//   opts.xof, opts.yof  shift every point right / down (default 0)
//   opts.fil            fill colour (default transparent)
//   opts.str            outline colour (default: same as the fill)
//   opts.wid            outline width in px (default 0: no outline)
function poly(plist, args) {
  var args = args != undefined ? args : {};
  var xof = args.xof != undefined ? args.xof : 0;              // x shift
  var yof = args.yof != undefined ? args.yof : 0;              // y shift
  var fil = args.fil != undefined ? args.fil : "rgba(0,0,0,0)"; // fill colour
  var str = args.str != undefined ? args.str : fil;            // outline colour
  var wid = args.wid != undefined ? args.wid : 0;              // outline width

  var canv = "<polyline points='";
  for (var i = 0; i < plist.length; i++) {
    canv +=
      " " +
      (plist[i][0] + xof).toFixed(1) +      // x, rounded to 0.1 px
      "," +
      (plist[i][1] + yof).toFixed(1);       // y, rounded to 0.1 px
  }
  canv +=
    "' style='fill:" + fil +                // inside colour
    ";stroke:" + str +                      // edge colour
    ";stroke-width:" + wid +                // edge width
    "'/>";
  return canv;
}

// Turn a centre line (a list of [x, y] points) into a brush stroke.
//   opts.wid  maximum half-width in px (default 2)
//   opts.col  ink colour (default rgba(200,200,200,0.9))
//   opts.noi  how much the width wavers, 0 to 1 (default 0.5)
//   opts.out  width of the same-colour edge line in px (default 1)
//   opts.fun  width profile along the stroke, t = 0..1 (default sin(pi t):
//             zero at both ends, full in the middle, like a brush pressed
//             down and lifted)
//   opts.xof, opts.yof  shift the finished stroke
function stroke(ptlist, args) {
  var args = args != undefined ? args : {};
  var xof = args.xof != undefined ? args.xof : 0;              // x shift
  var yof = args.yof != undefined ? args.yof : 0;              // y shift
  var wid = args.wid != undefined ? args.wid : 2;              // max half-width
  var col = args.col != undefined ? args.col : "rgba(200,200,200,0.9)"; // ink
  var noi = args.noi != undefined ? args.noi : 0.5;            // waver amount
  var out = args.out != undefined ? args.out : 1;              // edge width
  var fun =
    args.fun != undefined
      ? args.fun
      : function(x) {
          return Math.sin(x * Math.PI);     // taper: 0 at the ends, 1 mid-way
        };

  if (ptlist.length == 0) {
    return "";                              // nothing to draw
  }
  var vtxlist0 = [];                        // points along one edge
  var vtxlist1 = [];                        // points along the other edge
  var vtxlist = [];                         // the closed outline
  var n0 = Math.random() * 10;              // where this stroke starts in the
                                            // noise, so no two waver alike
  for (var i = 1; i < ptlist.length - 1; i++) {   // every point but the ends
    var w = wid * fun(i / ptlist.length);   // width from the profile
    // Waver: keep (1 - noi) of the width fixed and let the rest follow noise,
    // which changes smoothly from point to point like a hand's pressure.
    w = w * (1 - noi) + w * noi * Noise.noise(i * 0.5, n0);

    // Direction to the previous point and to the next point.
    var a1 = Math.atan2(
      ptlist[i][1] - ptlist[i - 1][1],
      ptlist[i][0] - ptlist[i - 1][0],
    );
    var a2 = Math.atan2(
      ptlist[i][1] - ptlist[i + 1][1],
      ptlist[i][0] - ptlist[i + 1][0],
    );
    var a = (a1 + a2) / 2;                  // bisector: splits the corner evenly,
                                            // so it points straight out sideways
    if (a < a2) {
      a += Math.PI;                         // keep it on the same side each time
    }
    // Push the point out by w on each side to get the two edges.
    vtxlist0.push([
      ptlist[i][0] + w * Math.cos(a),
      ptlist[i][1] + w * Math.sin(a),
    ]);
    vtxlist1.push([
      ptlist[i][0] - w * Math.cos(a),
      ptlist[i][1] - w * Math.sin(a),
    ]);
  }

  // Closed outline: first point, along one edge, back along the other edge,
  // last point, and back to the first point.
  vtxlist = [ptlist[0]]
    .concat(
      vtxlist0.concat(vtxlist1.concat([ptlist[ptlist.length - 1]]).reverse()),
    )
    .concat([ptlist[0]]);

  // Fill it with the ink, and edge it in the same colour: the edge gives the
  // zero-width ends a fine hairline, so the stroke tapers to a point.
  var canv = poly(
    vtxlist.map(function(x) {
      return [x[0] + xof, x[1] + yof];
    }),
    { fil: col, str: col, wid: out },
  );
  return canv;
}
