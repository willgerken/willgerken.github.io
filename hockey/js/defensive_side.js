// Scenario #2: Defensive Side of the Puck.
//
// Mechanic: multiple puck positions on the ice. For each, the kid drags
// their defender token so the defender sits between the puck and the net.
// "Check" scores each position against a simple rule:
//   defender's position should be on the line segment from puck to net-front,
//   roughly halfway (give the kid a tolerance band).
//
// Pedagogy: not prescriptive. Kid can choose ANY point on the line —
// tight to the attacker, loose gap — as long as they're on the defensive side.
// Show Me reveals the full "defensive side" corridor for each puck.

window.IceQ = window.IceQ || {};

window.IceQ.DefensiveSide = (function () {
  // Puck spawn ZONES — each session samples one position per zone for variety,
  // but every session covers the same conceptual locations so kids hit key
  // moments (corner, slot, behind net, etc.). Kid-labels stay constant.
  const PUCK_ZONES = [
    { label: 'strong-side corner',     xRange: [16, 26],  yRange: [55, 64] },
    { label: 'weak-side corner',       xRange: [-26, -16], yRange: [55, 64] },
    { label: 'high slot',              xRange: [-10, 10], yRange: [35, 46] },
    { label: 'behind the net',         xRange: [-12, 12], yRange: [66, 72] },
    { label: 'half-boards (strong)',   xRange: [20, 28],  yRange: [42, 52] },
    { label: 'low slot',               xRange: [-6, 6],   yRange: [54, 62] },
  ];

  const NET = { x: 0, y: 66 };  // just behind goal line, center of net
  const DEFENDER_START_Y = 32;  // high slot starting position

  // Tolerance (ft) for how close the defender needs to be to the ideal segment
  const TOL_BAND_FT = 8;
  // Gap control — defender's distance from the puck. "Good gap" is roughly
  // 5-12 ft. Closer = smothered (one move beats you). Farther = giving up the
  // shooting lane. Tight gap is part of the "right answer."
  const GOOD_GAP_MIN = 4;
  const GOOD_GAP_MAX = 13;
  const ABS_MIN = 1;
  const ABS_MAX = 20;

  function sampleInRange([lo, hi]) {
    return lo + Math.random() * (hi - lo);
  }

  function generatePucks() {
    // Always include the four "anchor" zones (cover key teaching moments).
    // Pick a fifth/sixth from the bonus pool randomly to keep things fresh.
    const anchors = ['strong-side corner', 'weak-side corner', 'high slot', 'behind the net'];
    const zones = anchors.map(name => PUCK_ZONES.find(z => z.label === name));
    return zones.map(z => ({
      x: Math.round(sampleInRange(z.xRange) * 10) / 10,
      y: Math.round(sampleInRange(z.yRange) * 10) / 10,
      label: z.label,
    }));
  }

  function distPointToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(px - ax, py - ay);
    let t = ((px - ax) * dx + (py - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const qx = ax + t * dx;
    const qy = ay + t * dy;
    return Math.hypot(px - qx, py - qy);
  }

  function init(rinkContainer) {
    const rink = IceQ.Rink.create(rinkContainer);
    if (rink.labelNet) rink.labelNet('ours');   // zone cue: whose net is this
    const { toCanvasX, toCanvasY, scale, overlayLayer, gridLayer } = rink;

    let pucks = generatePucks();
    let defender = null;
    let attackerNode = null;
    let activeIdx = 0;
    let results = [];
    let stickHand = 'L';         // 'L' or 'R' — which hand the defender holds
    let reachLine = null;        // "feeling your check" line from defender's stick to puck

    function drawPuckMarker(p, idx) {
      // Only render the ACTIVE puck. Hide the others to keep the rink clean
      // and focus the kid on one decision at a time.
      const isActive = idx === activeIdx;
      if (!isActive) return null;
      const g = new Konva.Group({ x: toCanvasX(p.x), y: toCanvasY(p.y) });
      g.add(new Konva.Circle({
        x: 0, y: 0, radius: Math.max(7, scale * 0.9),
        fill: '#0A0A0A',
        stroke: '#E0C68A',
        strokeWidth: 2,
      }));
      g.add(new Konva.Circle({
        x: 0, y: 0, radius: Math.max(11, scale * 1.4),
        stroke: '#E0C68A',
        strokeWidth: 2,
        opacity: 0.5,
        dash: [3, 3],
      }));
      return g;
    }

    function drawNet() {
      const g = new Konva.Rect({
        x: toCanvasX(-3), y: toCanvasY(64),
        width: 6 * scale, height: 3.5 * scale,
        stroke: '#CE202E', strokeWidth: 2, fill: 'rgba(214,35,40,0.05)',
      });
      gridLayer.add(g);
    }

    function drawAttackerAtPuck() {
      // Opponent player rendered in red, holding puck
      if (attackerNode) attackerNode.destroy();
      const p = pucks[activeIdx];
      attackerNode = IceQ.Player.create({
        x: toCanvasX(p.x),
        y: toCanvasY(p.y) - 4,  // body slightly above puck
        scale: Math.max(0.55, scale * 0.07),
        color: 'opponent',
        stickSide: p.x > 0 ? 'L' : 'R',  // stick toward middle
        draggable: false,
      });
      gridLayer.add(attackerNode);
    }

    function drawDefender() {
      defender = IceQ.Player.create({
        x: toCanvasX(0),
        y: toCanvasY(DEFENDER_START_Y),
        scale: Math.max(0.65, scale * 0.085),
        color: 'spartan',
        label: 'YOU',
        stickSide: stickHand,
        draggable: true,
      });
      defender.on('dragmove', () => {
        const pos = defender.position();
        const minX = toCanvasX(-40);
        const maxX = toCanvasX(40);
        const minY = toCanvasY(2);
        const maxY = toCanvasY(73);
        defender.x(Math.max(minX, Math.min(maxX, pos.x)));
        defender.y(Math.max(minY, Math.min(maxY, pos.y)));
        updateReachLine();
      });
      gridLayer.add(defender);
      updateReachLine();
    }

    // "Feeling your check" — a faint dashed line from the defender's stick blade
    // toward the puck, showing that the stick reaches into the passing/shooting lane.
    function updateReachLine() {
      if (reachLine) { reachLine.destroy(); reachLine = null; }
      if (!defender) return;
      const p = pucks[activeIdx];
      if (!p) return;
      const defPos = defender.position();
      const stickDir = stickHand === 'L' ? -1 : 1;
      // Approximate stick blade end in canvas coords (matches player.js geometry)
      const S = Math.max(0.65, scale * 0.085);
      const bladeX = defPos.x + stickDir * 28 * S;
      const bladeY = defPos.y - 4 * S;
      const puckX = toCanvasX(p.x);
      const puckY = toCanvasY(p.y);
      reachLine = new Konva.Line({
        points: [bladeX, bladeY, puckX, puckY],
        stroke: 'rgba(224,198,138,0.55)',
        strokeWidth: 1.5,
        dash: [4, 4],
        listening: false,
      });
      gridLayer.add(reachLine);
      reachLine.moveToBottom();
      // Keep grid lines (rink) below the reach line for visibility
      defender.moveToTop();
      gridLayer.batchDraw();
    }

    function setStickHand(hand) {
      stickHand = hand;
      // Re-render the defender with the new stick side
      const oldPos = defender ? defender.position() : null;
      if (defender) defender.destroy();
      drawDefender();
      if (oldPos) defender.position(oldPos);
      gridLayer.batchDraw();
    }

    function resetDefenderToStart() {
      if (!defender) return;
      // Smooth tween back to start
      defender.to({
        x: toCanvasX(0),
        y: toCanvasY(DEFENDER_START_Y),
        duration: 0.4,
        easing: Konva.Easings.EaseInOut,
      });
    }

    // Draw initial state
    drawNet();
    pucks.forEach((p, i) => {
      p.node = drawPuckMarker(p, i);
      if (p.node) gridLayer.add(p.node);
    });
    drawAttackerAtPuck();
    drawDefender();
    gridLayer.batchDraw();

    function currentPuck() {
      return pucks[activeIdx];
    }

    function evaluateCurrent() {
      const p = currentPuck();
      const defCanvas = defender.position();
      const defFtX = (defCanvas.x - rink.width / 2) / scale;
      const defFtY = defCanvas.y / scale;

      const distFromSegment = distPointToSegment(
        defFtX, defFtY, p.x, p.y, NET.x, NET.y
      );
      const distFromPuck = Math.hypot(defFtX - p.x, defFtY - p.y);

      const onTheLine = distFromSegment <= TOL_BAND_FT;
      const goodGap = distFromPuck >= GOOD_GAP_MIN && distFromPuck <= GOOD_GAP_MAX;
      const tooClose = distFromPuck < GOOD_GAP_MIN;
      const tooFar = distFromPuck > GOOD_GAP_MAX;

      return {
        puckLabel: p.label,
        distFromSegment,
        distFromPuck,
        pass: onTheLine && goodGap,
        onLineButBadGap: onTheLine && !goodGap,
        tooClose,
        tooFar,
      };
    }

    function drawDefensiveCorridor(puck) {
      const points = [toCanvasX(puck.x), toCanvasY(puck.y), toCanvasX(NET.x), toCanvasY(NET.y)];
      // The "corridor" — wider gold band along the puck-to-net line
      const line = new Konva.Line({
        points,
        stroke: '#E0C68A',
        strokeWidth: TOL_BAND_FT * scale * 2 * 0.7,
        opacity: 0.25,
        lineCap: 'round',
      });
      overlayLayer.add(line);
      const core = new Konva.Line({
        points,
        stroke: '#CE202E',
        strokeWidth: 2,
        dash: [6, 4],
        opacity: 0.75,
      });
      overlayLayer.add(core);
      // "Good gap" markers along the corridor — show kid where the sweet-spot
      // distance from puck is. Two short perpendicular ticks at GOOD_GAP_MIN
      // and GOOD_GAP_MAX from the puck along the line.
      const dx = NET.x - puck.x;
      const dy = NET.y - puck.y;
      const len = Math.hypot(dx, dy);
      const ux = dx / len, uy = dy / len;
      const perpX = -uy, perpY = ux;
      for (const gapDist of [GOOD_GAP_MIN, GOOD_GAP_MAX]) {
        if (gapDist > len) continue;
        const cx = puck.x + ux * gapDist;
        const cy = puck.y + uy * gapDist;
        const tickHalf = 4;  // ft
        overlayLayer.add(new Konva.Line({
          points: [
            toCanvasX(cx + perpX * tickHalf), toCanvasY(cy + perpY * tickHalf),
            toCanvasX(cx - perpX * tickHalf), toCanvasY(cy - perpY * tickHalf),
          ],
          stroke: '#0D5EAB', strokeWidth: 2,
        }));
      }
      // Label
      const midX = puck.x + ux * (GOOD_GAP_MIN + GOOD_GAP_MAX) / 2;
      const midY = puck.y + uy * (GOOD_GAP_MIN + GOOD_GAP_MAX) / 2;
      overlayLayer.add(new Konva.Text({
        x: toCanvasX(midX) - 40,
        y: toCanvasY(midY) - 24,
        text: 'good gap',
        width: 80, align: 'center',
        fontSize: 10, fontStyle: '700',
        fill: '#0D5EAB',
      }));
      overlayLayer.batchDraw();
    }

    function clearOverlay() {
      overlayLayer.destroyChildren();
      overlayLayer.batchDraw();
    }

    function cyclePuck() {
      // Redraw puck markers with new active state (only the new active puck draws)
      pucks.forEach((p) => { if (p.node) p.node.destroy(); });
      pucks.forEach((p, i) => {
        p.node = drawPuckMarker(p, i);
        if (p.node) gridLayer.add(p.node);
      });
      drawAttackerAtPuck();
      defender.moveToTop();
      gridLayer.batchDraw();
    }

    function regeneratePucks() {
      pucks.forEach((p) => { if (p.node) p.node.destroy(); });
      pucks = generatePucks();
      pucks.forEach((p, i) => {
        p.node = drawPuckMarker(p, i);
        if (p.node) gridLayer.add(p.node);
      });
      drawAttackerAtPuck();
      defender.moveToTop();
      gridLayer.batchDraw();
    }

    // ------- Motion → Consequence -------
    // After Check, animate the attacker's attempt:
    //   - if defender on the right side: attacker bumps into defender, BLOCKED
    //   - if defender on the wrong side: attacker skates past, shoots, GOAL
    function animateConsequence(passed, onComplete) {
      const p = pucks[activeIdx];
      const defPos = defender.position();
      const netX = toCanvasX(NET.x);
      const netY = toCanvasY(NET.y - 2);

      if (passed) {
        // Attacker takes a stride toward the defender, then BUMPS
        const bumpX = (toCanvasX(p.x) + defPos.x) / 2;
        const bumpY = (toCanvasY(p.y) + defPos.y) / 2;
        attackerNode.to({
          x: bumpX, y: bumpY,
          duration: 0.55,
          easing: Konva.Easings.EaseOut,
          onFinish: () => {
            // Defender pulse + attacker rebound
            defender.to({ scaleX: 1.12, scaleY: 1.12, duration: 0.12,
              onFinish: () => defender.to({ scaleX: 1, scaleY: 1, duration: 0.2 }),
            });
            attackerNode.to({
              x: attackerNode.x() - (defPos.x - toCanvasX(p.x)) * 0.15,
              y: attackerNode.y() - (defPos.y - toCanvasY(p.y)) * 0.15,
              duration: 0.25, easing: Konva.Easings.EaseOut,
            });
            showOverlayText('BLOCKED!', '#2A9D3F', false);
            setTimeout(() => onComplete && onComplete(), 900);
          },
        });
      } else {
        // Attacker skates past defender straight to the front of the net
        attackerNode.to({
          x: netX, y: netY - 8,
          duration: 0.85,
          easing: Konva.Easings.EaseInOut,
          onFinish: () => {
            // Puck shoots into net (small black dot flies)
            const puckShot = new Konva.Circle({
              x: attackerNode.x() + 6, y: attackerNode.y() - 2,
              radius: Math.max(4, scale * 0.6),
              fill: '#0A0A0A',
            });
            overlayLayer.add(puckShot);
            puckShot.to({
              x: netX, y: toCanvasY(67),
              duration: 0.18, easing: Konva.Easings.EaseIn,
              onFinish: () => {
                showOverlayText('GOAL!', '#CE202E', true);
                // Net shake
                setTimeout(() => onComplete && onComplete(), 1100);
              },
            });
          },
        });
      }
    }

    function showOverlayText(text, color, big) {
      const fontSize = big ? Math.max(46, scale * 6.5) : Math.max(34, scale * 4.5);
      const w = rink.width;
      const h = rink.height;
      const t = new Konva.Text({
        x: w / 2 - w * 0.35, y: h / 2 - fontSize / 2 - 30,
        width: w * 0.7,
        text, align: 'center',
        fontSize, fontStyle: '900',
        fill: color,
        stroke: '#FFFFFF', strokeWidth: 2.5,
        opacity: 0,
        listening: false,
        shadowColor: '#000', shadowBlur: 10, shadowOpacity: 0.5,
      });
      overlayLayer.add(t);
      t.to({ opacity: 1, scaleX: 1.0, scaleY: 1.0, duration: 0.18, easing: Konva.Easings.EaseOut });
      // Pulse + fade
      setTimeout(() => {
        t.to({
          scaleX: 1.18, scaleY: 1.18, opacity: 0,
          duration: 0.6, easing: Konva.Easings.EaseIn,
          onFinish: () => t.destroy(),
        });
      }, 700);
    }

    return {
      rink,
      check: () => {
        const res = evaluateCurrent();
        results[activeIdx] = res;
        return res;
      },
      animateConsequence,
      showMe: () => {
        clearOverlay();
        drawDefensiveCorridor(currentPuck());
      },
      reset: () => {
        clearOverlay();
        results = [];
        activeIdx = 0;
        regeneratePucks();
        resetDefenderToStart();
        updateReachLine();
      },
      nextPuck: () => {
        if (activeIdx < pucks.length - 1) {
          activeIdx += 1;
          clearOverlay();
          cyclePuck();
          resetDefenderToStart();
          updateReachLine();
          return true;
        }
        return false;
      },
      setStickHand,
      isDone: () => activeIdx === pucks.length - 1 && results[activeIdx],
      totalPucks: () => pucks.length,
      currentIdx: () => activeIdx,
    };
  }

  function phrasedFeedback(res, idx, total) {
    const label = res.puckLabel;
    if (res.pass) {
      const more = idx < total - 1
        ? ' Next puck — same idea, different spot.'
        : ' You handled all the puck spots. Knock that target off the goal.';
      return `You're on the defensive side AND your gap is good for the ${label}.${more}`;
    }
    if (res.onLineButBadGap) {
      if (res.tooClose) {
        return `You're on the right side — but you're SMOTHERING the puck. One move beats you. Back off a couple feet so you can read his next play.`;
      }
      return `You're on the right side — but your gap is too LOOSE. He has a clean shot through. Tighten up to about 6-10 ft from the puck.`;
    }
    if (res.distFromSegment > 18) {
      return `You're on the wrong side of the puck. Your body needs to be BETWEEN the puck (${label}) and the net. Hit Show Me to see the corridor.`;
    }
    return `Close — you're a bit off the line. Slide so the puck → you → net is a straight line.`;
  }

  return { init, phrasedFeedback, PUCK_ZONES };
})();
