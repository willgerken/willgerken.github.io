// "The House" scenario.
// Mechanic: kid taps grid cells over the ice to identify the house. Check compares
// each selected cell's CENTER against the canonical house polygon. No numeric score;
// color-coded feedback only (ok/err/miss) + process-praise message.

window.IceQ = window.IceQ || {};

window.IceQ.House = (function() {
  // Canonical "house" polygon in rink coordinates (feet).
  //
  // Six points, not four. The old trapezoid was widest at the TOP of the circles
  // (±22 at y=29) and narrowed to ±14 at the goal line — which has the danger
  // gradient backwards. Danger falls off with ANGLE as well as distance, and
  // ±14 ON the goal line is 11 ft outside the post: a zero-angle shot, close to
  // the least dangerous place on the ice. Meanwhile the shape called the widest
  // part of the house a 35 ft shot from the top of the circle.
  //
  // Real "home plate" pinches in tight at the posts, flares out to the face-off
  // dots (y=44), and holds that width up to the tops of the circles. That also
  // finally matches what vocab.js has always told the kids: "from the tops of
  // the face-off circles down through the goal posts."
  //
  // Why ±8 at the goal line and not ±3 (the actual posts): the grid grades by
  // CELL CENTER, and the low-slot cell centers sit at x=±14, y=54. The polygon
  // edge at y=54 is x=±15, so those cells stay in-house and the game keeps its
  // 6 correct cells. Pinching to the literal posts would silently drop it to 4
  // and re-tune the difficulty of the app's first game. ±8 is also defensible
  // hockey: the net-front rebound area is genuinely high danger.
  const HOUSE_POLY = [
    [-22, 29],   // top of the circles, weak side
    [22, 29],    // top of the circles, strong side
    [22, 44],    // face-off dot line — the widest part
    [8, 64],     // pinching in toward the post
    [-8, 64],
    [-22, 44],
  ];

  // Grid aligned to rink landmarks:
  //   columns: outer board bands | slot shoulders | center slot | slot shoulders | outer
  //   rows: above-zone | high-slot | low-slot | behind-goal
  // Boundaries at: face-off dot x (±22), just outside goalposts (±6), blue line,
  // top of circles (y=29), face-off dot row (y=44), goal line (y=64), end boards (y=75).
  // 5 cols × 5 rows = 25 cells; 6 cells fall inside the canonical house.
  const COL_EDGES = [-42.5, -22, -6, 6, 22, 42.5];
  const ROW_EDGES = [0, 15, 29, 44, 64, 75];

  function pointInPolygon(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      const intersects = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi);
      if (intersects) inside = !inside;
    }
    return inside;
  }

  function buildGrid(rink) {
    const { toCanvasX, toCanvasY, gridLayer, scale } = rink;

    const cells = [];
    for (let r = 0; r < ROW_EDGES.length - 1; r++) {
      for (let c = 0; c < COL_EDGES.length - 1; c++) {
        const x1Ft = COL_EDGES[c];
        const x2Ft = COL_EDGES[c + 1];
        const y1Ft = ROW_EDGES[r];
        const y2Ft = ROW_EDGES[r + 1];
        const centerXFt = (x1Ft + x2Ft) / 2;
        const centerYFt = (y1Ft + y2Ft) / 2;

        const rect = new Konva.Rect({
          x: toCanvasX(x1Ft) + 1.5,
          y: toCanvasY(y1Ft) + 1.5,
          width: (x2Ft - x1Ft) * scale - 3,
          height: (y2Ft - y1Ft) * scale - 3,
          fill: 'rgba(13, 94, 171, 0.03)',
          stroke: 'rgba(13, 94, 171, 0.22)',
          strokeWidth: 0.8,
          cornerRadius: 3,
          listening: true,
        });

        const cell = {
          rect,
          centerXFt,
          centerYFt,
          selected: false,
          inHouse: pointInPolygon(centerXFt, centerYFt, HOUSE_POLY),
        };

        rect.on('tap click', () => {
          cell.selected = !cell.selected;
          paintCell(cell, 'idle');
        });
        gridLayer.add(rect);
        cells.push(cell);
      }
    }
    gridLayer.draw();
    return cells;
  }

  function paintCell(cell, mode) {
    const colors = {
      idle: cell.selected ? 'rgba(179, 27, 27, 0.35)' : 'rgba(13, 94, 171, 0.04)',
      ok:   'rgba(42, 157, 63, 0.55)',
      err:  'rgba(197, 49, 43, 0.45)',
      miss: 'rgba(230, 168, 23, 0.45)',
    };
    cell.rect.fill(colors[mode] || colors.idle);
    cell.rect.getLayer().batchDraw();
  }

  function check(cells) {
    let correct = 0, incorrect = 0, missed = 0, totalHouse = 0;
    cells.forEach(c => {
      if (c.inHouse) totalHouse++;
      if (c.selected && c.inHouse) { paintCell(c, 'ok'); correct++; }
      else if (c.selected && !c.inHouse) { paintCell(c, 'err'); incorrect++; }
      else if (!c.selected && c.inHouse) { paintCell(c, 'miss'); missed++; }
      else { paintCell(c, 'idle'); }
    });
    return { correct, incorrect, missed, totalHouse };
  }

  function reset(cells) {
    cells.forEach(c => {
      c.selected = false;
      paintCell(c, 'idle');
    });
  }

  function drawHousePolygon(rink) {
    const { toCanvasX, toCanvasY, overlayLayer } = rink;
    overlayLayer.destroyChildren();
    const points = HOUSE_POLY.flatMap(([x, y]) => [toCanvasX(x), toCanvasY(y)]);

    // Soft fill (appears first)
    const polyFill = new Konva.Line({
      points, closed: true,
      fill: 'rgba(206, 32, 46, 0.20)',
      opacity: 0, listening: false,
    });
    // Dashed outline (second, with optional pulse)
    const polyStroke = new Konva.Line({
      points, closed: true,
      stroke: '#CE202E', strokeWidth: 2.5, dash: [7, 4],
      opacity: 0, listening: false,
      shadowColor: '#CE202E', shadowBlur: 0, shadowOpacity: 0,
    });
    overlayLayer.add(polyFill, polyStroke);

    // Zone labels positioned inside the polygon (new geometry: top y=29, bottom y=64)
    const labels = [
      { text: 'HIGH SLOT', x: 0, y: 36 },
      { text: 'LOW SLOT',  x: 0, y: 52 },
      { text: 'NET FRONT', x: 0, y: 62 },
    ];
    const labelNodes = labels.map((l) => {
      const bg = new Konva.Rect({
        x: toCanvasX(l.x) - 42, y: toCanvasY(l.y) - 8,
        width: 84, height: 16,
        fill: 'rgba(224, 198, 138, 0.95)',
        cornerRadius: 3, opacity: 0, listening: false,
      });
      const txt = new Konva.Text({
        x: toCanvasX(l.x) - 50, y: toCanvasY(l.y) - 6,
        text: l.text, fontSize: 11, fontStyle: '800',
        letterSpacing: 1.2, fill: '#202020', width: 100,
        align: 'center', opacity: 0, listening: false,
      });
      return { bg, txt };
    });
    labelNodes.forEach(n => overlayLayer.add(n.bg, n.txt));
    overlayLayer.batchDraw();

    // Stagger reveal: fill → outline → labels top-to-bottom → pulse glow
    polyFill.to({ opacity: 1, duration: 0.4, easing: Konva.Easings.EaseOut });
    polyStroke.to({
      opacity: 1, duration: 0.5, easing: Konva.Easings.EaseOut,
      onFinish: () => {
        polyStroke.to({
          shadowBlur: 14, shadowOpacity: 0.7, duration: 0.7,
          easing: Konva.Easings.EaseInOut,
          onFinish: () => polyStroke.to({ shadowBlur: 0, shadowOpacity: 0, duration: 0.7 }),
        });
      },
    });
    labelNodes.forEach((n, i) => {
      const delayMs = (0.55 + i * 0.22) * 1000;
      setTimeout(() => {
        n.bg.to({ opacity: 1, duration: 0.35, easing: Konva.Easings.EaseOut });
        n.txt.to({ opacity: 1, duration: 0.35, easing: Konva.Easings.EaseOut });
      }, delayMs);
    });

    return { polyFill, polyStroke, labelNodes };
  }

  function clearOverlay(rink) {
    rink.overlayLayer.destroyChildren();
    rink.overlayLayer.batchDraw();
  }

  // Process-praise phrasing per Dweck. Avoids person praise, numeric scores.
  function phrasedFeedback({ correct, incorrect, missed, totalHouse }) {
    if (correct === totalHouse && incorrect === 0) {
      return "You mapped the whole house. That's the exact area to protect when you don't have the puck.";
    }
    if (correct >= totalHouse * 0.75 && incorrect <= 2) {
      return `You found most of the house — ${correct} of ${totalHouse} danger zones. A few spots were a little high or wide. Hit Show Me to see the full shape.`;
    }
    if (correct >= totalHouse * 0.5) {
      return `Good start — you got ${correct} of ${totalHouse}. The house is bigger than most kids guess. Try again or hit Show Me.`;
    }
    return "The house is the area right in front of the net, from the tops of the face-off circles down to the goal posts. Hit Show Me to see it, then try again.";
  }

  return {
    buildGrid,
    check,
    reset,
    drawHousePolygon,
    clearOverlay,
    phrasedFeedback,
    HOUSE_POLY,
  };
})();
