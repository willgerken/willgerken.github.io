// Half-rink renderer (defensive zone view, portrait).
// Coordinate system (feet):
//   x: -42.5 (left board) ... +42.5 (right board)  [width = 85 ft]
//   y: 0 (blue line, TOP of canvas) ... 75 (end boards, BOTTOM of canvas)
//       Goal line at y=64. Behind the goal line from y=64 to y=75.
//       Face-off dots at y=55, x=±22. Face-off circle radius = 15 ft.

window.IceQ = window.IceQ || {};

window.IceQ.Rink = (function() {
  const RINK = {
    widthFt: 85,
    lengthFt: 75,        // half-rink: blue line to end boards
    goalLineY: 64,       // 11 ft from end boards (75 - 11 = 64 ft from blue line)
    faceoffDotY: 44,     // 20 ft from GOAL LINE (44 = 64 - 20); 31 ft from end boards
    faceoffDotX: 22,
    faceoffCircleR: 15,  // 30 ft diameter; circle extends y=29 to y=59 (5 ft off goal line)
    creaseR: 6,          // USA Hockey 6 ft radius crease
    creaseHeight: 4.5,   // arc depth
    netHalfWidth: 3,     // 6 ft net
    netDepth: 3.5,
  };

  function create(container) {
    const width = container.clientWidth;
    const height = Math.round(width * RINK.lengthFt / RINK.widthFt);
    const scale = width / RINK.widthFt;

    const stage = new Konva.Stage({
      container,
      width,
      height,
      listening: true,
    });

    const iceLayer = new Konva.Layer({ listening: false });
    const gridLayer = new Konva.Layer();
    const overlayLayer = new Konva.Layer({ listening: false });

    stage.add(iceLayer, gridLayer, overlayLayer);

    // --- coordinate helpers ---
    function toCanvasX(ft) { return width / 2 + ft * scale; }
    function toCanvasY(ft) { return ft * scale; }

    // --- ice surface ---
    iceLayer.add(new Konva.Rect({
      x: 0, y: 0, width, height,
      fill: '#F0F7FC',
      cornerRadius: 12,
    }));

    // --- blue line ---
    iceLayer.add(new Konva.Line({
      points: [0, toCanvasY(0) + 1, width, toCanvasY(0) + 1],
      stroke: '#0D5EAB',
      strokeWidth: Math.max(3, scale * 1),
    }));

    // --- goal line ---
    iceLayer.add(new Konva.Line({
      points: [
        toCanvasX(-RINK.widthFt / 2), toCanvasY(RINK.goalLineY),
        toCanvasX(RINK.widthFt / 2), toCanvasY(RINK.goalLineY),
      ],
      stroke: '#D62328',
      strokeWidth: Math.max(2, scale * 0.5),
    }));

    // --- face-off dots + circles (left and right) ---
    // NHL/USA Hockey: face-off dot 20 ft from GOAL LINE (not end boards). Circle
    // radius 15 ft, so circle sits entirely in the zone with 5 ft clearance from
    // the goal line. Full circles are drawn — no clipping needed.
    const HASH_HALF = 5.583 / 2;  // 5'7" apart = 2.79 ft each side of dot
    const HASH_LEN = 2;
    for (const sideX of [-RINK.faceoffDotX, RINK.faceoffDotX]) {
      const cx = toCanvasX(sideX);
      const cy = toCanvasY(RINK.faceoffDotY);

      // Full face-off circle
      iceLayer.add(new Konva.Circle({
        x: cx, y: cy,
        radius: RINK.faceoffCircleR * scale,
        stroke: '#D62328',
        strokeWidth: Math.max(1.8, scale * 0.4),
      }));

      // Face-off dot (2 ft diameter → 1 ft radius)
      iceLayer.add(new Konva.Circle({
        x: cx, y: cy,
        radius: 1 * scale,
        fill: '#D62328',
      }));

      // Inner alignment marks — small "+" at the dot (4 small ticks N/S/E/W, 1 ft long)
      const tickLen = 1.5;
      const tickGap = 1.5;  // distance from dot center to start of tick
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        iceLayer.add(new Konva.Line({
          points: [
            toCanvasX(sideX + dx * tickGap), toCanvasY(RINK.faceoffDotY + dy * tickGap),
            toCanvasX(sideX + dx * (tickGap + tickLen)), toCanvasY(RINK.faceoffDotY + dy * (tickGap + tickLen)),
          ],
          stroke: '#D62328',
          strokeWidth: Math.max(1.5, scale * 0.35),
          lineCap: 'round',
        }));
      }

      // Hash marks — 4 pairs of vertical 2-ft lines outside the circle at top + bottom
      for (const dir of [-1, 1]) {  // -1 = top pair, +1 = bottom pair
        const yStart = RINK.faceoffDotY + dir * RINK.faceoffCircleR;
        for (const offset of [-HASH_HALF, HASH_HALF]) {
          iceLayer.add(new Konva.Line({
            points: [
              toCanvasX(sideX + offset), toCanvasY(yStart),
              toCanvasX(sideX + offset), toCanvasY(yStart + dir * HASH_LEN),
            ],
            stroke: '#D62328',
            strokeWidth: Math.max(2.5, scale * 0.5),
            lineCap: 'round',
          }));
        }
      }
    }

    // --- crease (semicircle + rectangle base) ---
    const creaseGroup = new Konva.Group();
    creaseGroup.add(new Konva.Arc({
      x: toCanvasX(0),
      y: toCanvasY(RINK.goalLineY),
      innerRadius: 0,
      outerRadius: RINK.creaseR * scale,
      angle: 180,
      rotation: 180,  // arc opens toward blue line
      fill: 'rgba(13, 94, 171, 0.22)',
      stroke: '#D62328',
      strokeWidth: 1.5,
    }));
    iceLayer.add(creaseGroup);

    // --- goal: net (white interior) + diagonal mesh + red frame + skirt ---
    const goalX1 = toCanvasX(-RINK.netHalfWidth);
    const goalX2 = toCanvasX(RINK.netHalfWidth);
    const goalY1 = toCanvasY(RINK.goalLineY);
    const goalY2 = toCanvasY(RINK.goalLineY + RINK.netDepth);
    const goalW = goalX2 - goalX1;
    const goalH = goalY2 - goalY1;
    // White net interior
    iceLayer.add(new Konva.Rect({
      x: goalX1, y: goalY1,
      width: goalW, height: goalH,
      fill: '#FAFAFA',
    }));
    // Diagonal mesh weave — clipped to the net interior
    const meshGroup = new Konva.Group({
      clipFunc: (ctx) => {
        ctx.rect(goalX1, goalY1, goalW, goalH);
      },
    });
    const meshStep = Math.max(3, scale * 0.6);
    const meshDim = goalH;
    // Down-right diagonals
    for (let off = goalX1 - meshDim; off <= goalX2; off += meshStep) {
      meshGroup.add(new Konva.Line({
        points: [off, goalY1, off + meshDim, goalY2],
        stroke: 'rgba(140,140,140,0.55)', strokeWidth: 0.5,
      }));
    }
    // Down-left diagonals
    for (let off = goalX1; off <= goalX2 + meshDim; off += meshStep) {
      meshGroup.add(new Konva.Line({
        points: [off, goalY1, off - meshDim, goalY2],
        stroke: 'rgba(140,140,140,0.55)', strokeWidth: 0.5,
      }));
    }
    iceLayer.add(meshGroup);
    // Red goal frame — posts + crossbar
    const postW = Math.max(1.5, scale * 0.35);
    iceLayer.add(new Konva.Rect({
      x: goalX1 - postW, y: goalY1 - postW,
      width: postW, height: goalH + postW,
      fill: '#CE202E',
    }));
    iceLayer.add(new Konva.Rect({
      x: goalX2, y: goalY1 - postW,
      width: postW, height: goalH + postW,
      fill: '#CE202E',
    }));
    // Curved skirt at the bottom (where net meets ice — extends slightly forward)
    const skirtDepth = Math.max(3, scale * 0.7);
    iceLayer.add(new Konva.Shape({
      sceneFunc: (ctx, shape) => {
        ctx.beginPath();
        ctx.moveTo(goalX1 - postW, goalY1);
        ctx.quadraticCurveTo(goalX1, goalY1 - skirtDepth, goalX1 + 4 * scale * 0.5, goalY1 - skirtDepth + 1);
        ctx.lineTo(goalX2 - 4 * scale * 0.5, goalY1 - skirtDepth + 1);
        ctx.quadraticCurveTo(goalX2, goalY1 - skirtDepth, goalX2 + postW, goalY1);
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      },
      fill: 'rgba(234,234,234,0.85)',
      stroke: 'rgba(140,140,140,0.55)',
      strokeWidth: 0.6,
    }));

    // --- end boards outline ---
    iceLayer.add(new Konva.Rect({
      x: 1, y: 1, width: width - 2, height: height - 2,
      stroke: '#1A1F2E',
      strokeWidth: 2,
      cornerRadius: 12,
      fill: null,
    }));

    iceLayer.draw();

    return {
      stage,
      iceLayer,
      gridLayer,
      overlayLayer,
      width,
      height,
      scale,
      toCanvasX,
      toCanvasY,
      RINK,
    };
  }

  return { create, RINK };
})();
