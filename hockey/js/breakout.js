// Scenario: Breakout.
//
// OUR D has the puck deep in our zone (corner or behind net). We're
// attacking — getting OUT of the zone. Three forwards take three support
// spots so the D has clean breakout options:
//   WALL    — strong-side wing along the half-boards, ready for the wall pass
//   CURL    — center curls in the mid-zone (high slot area)
//   STRETCH — weak-side wing high, ready for the long stretch pass
//
// Visual: gold D-token in the corner with the puck. Three red forecheckers
// SKATING IN under pressure (mirrors lane_coverage.js v0.12 rush-in pattern).
// Three gold forwards to position. The forechecker pressure animation conveys
// "they're closing — set your outlets fast" — static forecheckers killed the
// urgency. Skipped if the kid grabs a token before the animation finishes
// (kid already knows what to do, don't get in their way).

window.IceQ = window.IceQ || {};

window.IceQ.Breakout = (function () {
  // Three rushes — D in different positions deep in our zone.
  const RUSHES = [
    { side: 'R', dX:  24, dY: 60, label: "D in the right corner" },
    { side: 'L', dX: -24, dY: 60, label: "D in the left corner" },
    { side: 'B', dX:   0, dY: 68, label: "D behind the net" },
  ];

  function targetsForRush(rush) {
    // Shape-aware tolerances (v0.15.1 per Will): each role has a SHAPE that
    // matches its job, not a generic circle. Same logic as Forecheck v0.12
    // and Lane Coverage v0.12.
    //   Wall    = vertical RECT along the boards (~8x16 ft) — pinned outside,
    //             can vary depth but not stray inside
    //   Curl    = circle radius 9 ft — middle support, has flexibility
    //   Stretch = horizontal OVAL along the high zone (~22x7 ft) — anywhere
    //             across the high blue line, can't sag low
    //
    // Wall position pulled UP per Coach round-2 (was y=50, too low — wall pass
    // had to travel too short a distance). y=42 = high half-boards / hash-mark
    // area, real wall-pass receive spot.
    if (rush.side === 'B') {
      return {
        wall:    { x:  22, y: 42, shape: 'rect',  w: 8,  h: 16, desc: 'Strong-side wall — high half-boards, ready for the chip up the boards.' },
        curl:    { x:   0, y: 36, shape: 'circle', radius: 9, desc: 'Center curl in the middle — soft outlet for D, opens passing lanes.' },
        stretch: { x: -18, y: 12, shape: 'oval',  radiusX: 22, radiusY: 7, desc: 'Stretch high on the weak side — long pass option for a fast zone exit.' },
      };
    }
    const sign = rush.dX >= 0 ? 1 : -1;
    return {
      wall:    { x:  sign * 28, y: 42, shape: 'rect',  w: 8,  h: 16, desc: 'Wall play — strong-side wing at the high half-boards. Real catchable pass distance.' },
      curl:    { x:  sign * 4,  y: 36, shape: 'circle', radius: 9, desc: 'Center curls in the slot — soft inside outlet. Comes BACK to support D.' },
      stretch: { x: -sign * 16, y: 12, shape: 'oval',  radiusX: 22, radiusY: 7, desc: 'Stretch the play — weak-side wing high, anticipate the cross-ice.' },
    };
  }

  // Shape-aware containment test. Falls back to legacy circle (TOL_FT) for any
  // target without a shape spec.
  function inTarget(xFt, yFt, t) {
    if (t.shape === 'rect') {
      return Math.abs(xFt - t.x) <= t.w / 2 && Math.abs(yFt - t.y) <= t.h / 2;
    }
    if (t.shape === 'oval') {
      const dx = (xFt - t.x) / t.radiusX;
      const dy = (yFt - t.y) / t.radiusY;
      return dx * dx + dy * dy <= 1;
    }
    const r = t.radius != null ? t.radius : 11;  // legacy fallback
    return Math.hypot(xFt - t.x, yFt - t.y) <= r;
  }

  const POSITION_INFO = {
    wall:    { text: 'W',  label: 'Wall (LW or RW)' },
    curl:    { text: 'C',  label: 'Curl (Center)'   },
    stretch: { text: 'S',  label: 'Stretch (weak-side wing)' },
  };

  const TOL_FT = 11;
  // Game-realistic starts — forwards roughly in their D-zone coverage spots
  // when the puck was lost. The kid moves them OUT to support the breakout.
  // Visual previews where forwards collapse on D-zone, then reads "now get
  // up the ice."
  const START_POSITIONS = {
    wall:    { x:  18, y: 28 },   // strong-side wing, mid-zone
    curl:    { x:  -2, y: 32 },   // center, slot
    stretch: { x: -22, y: 22 },   // weak-side wing, slot shoulder
  };

  function init(rinkContainer) {
    const rink = IceQ.Rink.create(rinkContainer);
    const { toCanvasX, toCanvasY, scale, overlayLayer, gridLayer } = rink;

    let rushIdx = 0;
    let players = {};
    let dToken = null;
    // Track puck + forecheckers separately so contrast animations can read
    // their LIVE positions instead of recomputing from rush coords (kid may
    // have a stale copy if the scene was nudged). Mirrors lane_coverage.js
    // and forecheck.js patterns.
    let puckNode = null;
    let forecheckerNodes = [];
    let rushSceneNodes = [];
    // In-flight forechecker pressure tweens + scheduled timeouts. Cancelled
    // on Reset/nextRush via cancelForecheckerPressure() — mirrors the
    // rushTweens / rushTimeouts / cancelRushAnimation pattern from
    // lane_coverage.js v0.12. Without this, a half-skated forechecker keeps
    // gliding after the kid hits Reset / Next Rush.
    let forecheckerTweens = [];
    let forecheckerTimeouts = [];
    // First-drag flag — once the kid touches ANY of the three forwards, the
    // pressure animation aborts (cancelForecheckerPressure snaps remaining
    // forecheckers to their pressure positions instantly). Reasoning: if the
    // kid is already setting outlets, the animation was supposed to convey
    // urgency — it's already done its job, don't get in the way.
    let kidHasMoved = false;
    // Show-Me sprite-glide tweens + scheduled timeouts. The glide moves the
    // three forwards into their correct breakout positions BEFORE the puck
    // animation runs (so the kid sees the supports arrive, then the pass
    // sequence flows through them). Cancelled on Reset/nextRush so a
    // partially-glided forward doesn't continue moving after the kid bails.
    let showMeTweens = [];
    let showMeTimeouts = [];

    function cancelShowMeGlide() {
      showMeTimeouts.forEach(id => clearTimeout(id));
      showMeTimeouts = [];
      showMeTweens.forEach(node => {
        if (node && typeof node.stop === 'function') {
          try { node.stop(); } catch (e) { /* noop */ }
        }
      });
      showMeTweens = [];
    }

    function currentRush() { return RUSHES[rushIdx]; }
    function currentTargets() { return targetsForRush(currentRush()); }

    function cancelForecheckerPressure(snapToPressure) {
      forecheckerTimeouts.forEach(id => clearTimeout(id));
      forecheckerTimeouts = [];
      forecheckerTweens.forEach(node => {
        if (node && typeof node.stop === 'function') {
          try { node.stop(); } catch (e) { /* noop */ }
        }
      });
      forecheckerTweens = [];
      // If the cancel is due to "kid started placing", snap remaining
      // forecheckers straight to their pressure spots so the visual stays
      // coherent (no half-skated forechecker frozen mid-glide).
      if (snapToPressure) {
        forecheckerNodes.forEach(rec => {
          if (!rec || !rec.node || rec.node.isDestroyed()) return;
          rec.node.position({
            x: toCanvasX(rec.pressureX),
            y: toCanvasY(rec.pressureY),
          });
        });
        gridLayer.batchDraw();
      }
    }

    function drawDWithPuck() {
      // Cancel any in-flight pressure tweens from the prior rush — otherwise
      // a half-skated forechecker from rush N-1 can stomp on the new scene.
      cancelForecheckerPressure(false);
      rushSceneNodes.forEach(n => n.destroy());
      rushSceneNodes = [];
      forecheckerNodes = [];

      const rush = currentRush();
      // OUR D in gold (Spartans color), with the puck
      dToken = IceQ.Player.create({
        x: toCanvasX(rush.dX), y: toCanvasY(rush.dY),
        scale: Math.max(0.6, scale * 0.085),
        color: 'spartan',
        label: 'D',
        stickSide: rush.dX >= 0 ? 'R' : 'L',  // stick toward the open ice
      });
      puckNode = new Konva.Circle({
        x: toCanvasX(rush.dX - (rush.dX >= 0 ? 2 : -2)),
        y: toCanvasY(rush.dY - 4),
        radius: Math.max(5, scale * 0.7),
        fill: '#0A0A0A', stroke: '#E0C68A', strokeWidth: 1.5,
      });
      // Three opposing forecheckers in red — F1 first (closest pressure on
      // the puck-carrier D), F2 second (cuts off the strong-side outlet),
      // F3 third (high middle, cuts the Curl / center support lane). Each
      // has a PRESSURE position (final spot — mid-zone, threatening the
      // breakout) and a START position ~15 ft FURTHER from the puck (high
      // / wide — they're entering the zone). Tween: start → pressure over
      // 2.0s with EaseOut, staggered by 100ms so the pressure reads as a
      // wave, not a coordinated formation. Mirrors lane_coverage.js v0.12.
      const sign = rush.dX >= 0 ? 1 : -1;
      const F_OUT = 15;  // ft each forechecker is "further out" pre-rush
      // F1 — close pressure on D, on the puck side
      const f1Pressure = {
        x: rush.dX - (rush.dX >= 0 ? 14 : -14),
        y: rush.dY - 10,
      };
      const f1Start = {
        x: f1Pressure.x - sign * F_OUT,   // wider toward boards
        y: f1Pressure.y - F_OUT,          // higher in the zone
      };
      // F2 — cuts strong-side outlet (or weak-side if D is behind net)
      const f2Pressure = {
        x: rush.side === 'B' ? -10 : -rush.dX * 0.4,
        y: rush.dY - 22,
      };
      const f2Start = {
        x: f2Pressure.x - sign * (F_OUT * 0.6),
        y: f2Pressure.y - F_OUT,
      };
      // F3 — high middle, cuts Curl / center lane. New (was 2 forecheckers
      // before; per Will, three is realistic for a true 1-2-2 / 2-1-2
      // forecheck pressure pattern).
      const f3Pressure = {
        x: rush.side === 'B' ? 10 : sign * 10,
        y: rush.dY - 30,
      };
      const f3Start = {
        x: f3Pressure.x + sign * (F_OUT * 0.4),
        y: f3Pressure.y - F_OUT,
      };

      const fScale = Math.max(0.55, scale * 0.075);
      const f1 = IceQ.Player.create({
        x: toCanvasX(f1Start.x), y: toCanvasY(f1Start.y),
        scale: fScale, color: 'opponent',
        stickSide: rush.dX >= 0 ? 'L' : 'R',
      });
      const f2 = IceQ.Player.create({
        x: toCanvasX(f2Start.x), y: toCanvasY(f2Start.y),
        scale: fScale, color: 'opponent',
        stickSide: 'L',
      });
      const f3 = IceQ.Player.create({
        x: toCanvasX(f3Start.x), y: toCanvasY(f3Start.y),
        scale: fScale, color: 'opponent',
        stickSide: rush.dX >= 0 ? 'L' : 'R',
      });
      // Track per-forechecker pressure spot (in feet) so
      // cancelForecheckerPressure can snap them when the kid grabs a token.
      forecheckerNodes = [
        { node: f1, pressureX: f1Pressure.x, pressureY: f1Pressure.y },
        { node: f2, pressureX: f2Pressure.x, pressureY: f2Pressure.y },
        { node: f3, pressureX: f3Pressure.x, pressureY: f3Pressure.y },
      ];
      gridLayer.add(puckNode, dToken, f1, f2, f3);
      rushSceneNodes.push(puckNode, dToken, f1, f2, f3);

      // Reset the kid-moved flag for this rush, then schedule the staggered
      // pressure skate. F1 first (puck pressure registers immediately), F2
      // 100ms later, F3 100ms after that — feels like a wave closing.
      kidHasMoved = false;
      const PRESSURE_DURATION = 2.0;
      const STAGGER_MS = 100;
      forecheckerNodes.forEach((rec, idx) => {
        const tid = setTimeout(() => {
          // If kid grabbed a token before this forechecker's tween fires,
          // snap into pressure instantly instead of starting a 2s glide
          // (kid is already focused on placing — don't get in the way).
          if (kidHasMoved || rec.node.isDestroyed()) {
            if (!rec.node.isDestroyed()) {
              rec.node.position({
                x: toCanvasX(rec.pressureX),
                y: toCanvasY(rec.pressureY),
              });
              gridLayer.batchDraw();
            }
            return;
          }
          rec.node.to({
            x: toCanvasX(rec.pressureX),
            y: toCanvasY(rec.pressureY),
            duration: PRESSURE_DURATION,
            easing: Konva.Easings.EaseOut,
          });
          forecheckerTweens.push(rec.node);
        }, idx * STAGGER_MS);
        forecheckerTimeouts.push(tid);
      });
    }

    function drawForward(role) {
      const start = START_POSITIONS[role];
      const node = IceQ.Player.create({
        x: toCanvasX(start.x), y: toCanvasY(start.y),
        scale: Math.max(0.7, scale * 0.09),
        color: 'spartan',
        label: POSITION_INFO[role].text,
        stickSide: 'L',
        draggable: true,
      });
      node.on('dragmove', () => {
        // First touch on ANY forward kills the forechecker pressure tween
        // — the animation existed to convey "set outlets fast", and the kid
        // is now doing exactly that. cancelForecheckerPressure(true) snaps
        // any not-yet-arrived forecheckers to their pressure spots so the
        // visual stays coherent.
        if (!kidHasMoved) {
          kidHasMoved = true;
          cancelForecheckerPressure(true);
        }
        const pos = node.position();
        const minX = toCanvasX(-40), maxX = toCanvasX(40);
        const minY = toCanvasY(2),   maxY = toCanvasY(70);
        node.x(Math.max(minX, Math.min(maxX, pos.x)));
        node.y(Math.max(minY, Math.min(maxY, pos.y)));
      });
      node._role = role;
      players[role] = node;
      gridLayer.add(node);
    }

    function drawAllForwards() {
      Object.values(players).forEach(b => b.destroy());
      players = {};
      ['wall', 'curl', 'stretch'].forEach(drawForward);
    }

    function evaluate() {
      const results = {};
      const targets = currentTargets();
      for (const role of ['wall', 'curl', 'stretch']) {
        const node = players[role];
        if (!node) continue;
        const t = { ...targets[role], label: POSITION_INFO[role].label };
        const pos = node.position();
        const xFt = (pos.x - rink.width / 2) / scale;
        const yFt = pos.y / scale;
        const dist = Math.hypot(xFt - t.x, yFt - t.y);  // still used for contrast severity
        results[role] = { pass: inTarget(xFt, yFt, t), dist, target: t };
      }
      return results;
    }

    // Animate the breakout pass sequence: puck travels D → Wall → Curl → out.
    // Shows the kid the actual play that the positions enable.
    function animateBreakoutPlay(targets) {
      const rush = currentRush();
      const dPos = { x: toCanvasX(rush.dX - (rush.dX >= 0 ? 2 : -2)), y: toCanvasY(rush.dY - 4) };
      const wallPos = { x: toCanvasX(targets.wall.x), y: toCanvasY(targets.wall.y) };
      const curlPos = { x: toCanvasX(targets.curl.x), y: toCanvasY(targets.curl.y) };
      const stretchPos = { x: toCanvasX(targets.stretch.x), y: toCanvasY(targets.stretch.y) };
      // Direction OUT of zone — past the curl, toward the blue line area
      const outPos = { x: curlPos.x, y: toCanvasY(0) };

      // Pass-1 arrow (D → Wall) drawn first as a faint dashed line
      function drawArrow(from, to, color, delay) {
        setTimeout(() => {
          const arr = new Konva.Arrow({
            points: [from.x, from.y, to.x, to.y],
            stroke: color, fill: color,
            strokeWidth: 2.2, dash: [5, 4],
            pointerLength: 8, pointerWidth: 8,
            opacity: 0,
          });
          overlayLayer.add(arr);
          arr.to({ opacity: 0.85, duration: 0.25 });
          overlayLayer.batchDraw();
        }, delay);
      }

      // Hide the STATIC puck on D before the animated puck starts traveling —
      // otherwise the kid sees TWO pucks (the static one stuck on D + the
      // moving one). Restored at the end (and on Reset/Next via puckNode
      // reconstruction in drawDWithPuck()).
      const origPuckVisible = puckNode && !puckNode.isDestroyed() ? puckNode.visible() : true;
      if (puckNode && !puckNode.isDestroyed()) {
        puckNode.visible(false);
        gridLayer.batchDraw();
      }

      // Animated puck token. Solid fill + bright gold stroke so it reads
      // clearly against the rink as it travels along the 3-leg pass sequence.
      const animPuck = new Konva.Circle({
        x: dPos.x, y: dPos.y,
        radius: Math.max(5, scale * 0.7),
        fill: '#0A0A0A', stroke: '#FFD84D', strokeWidth: 2,
        opacity: 0,
      });
      overlayLayer.add(animPuck);

      // Sequence: D pauses (set up), arrow to Wall draws, puck flies to Wall,
      // pause, arrow Wall→Curl draws, puck flies, etc.
      const T0 = 100;          // initial pause
      const T_DRAW = 350;      // arrow draws
      const T_PASS = 400;      // puck travels each leg

      // Show initial puck on D
      setTimeout(() => animPuck.to({ opacity: 1, duration: 0.2 }), T0);

      // Arrow D → Wall, then puck D → Wall
      drawArrow(dPos, wallPos, '#E0C68A', T0 + 200);
      setTimeout(() => {
        animPuck.to({
          x: wallPos.x, y: wallPos.y,
          duration: T_PASS / 1000, easing: Konva.Easings.EaseInOut,
        });
      }, T0 + 200 + T_DRAW);

      // Arrow Wall → Curl, then puck
      const t2 = T0 + 200 + T_DRAW + T_PASS + 250;
      drawArrow(wallPos, curlPos, '#2E7D3F', t2);
      setTimeout(() => {
        animPuck.to({
          x: curlPos.x, y: curlPos.y,
          duration: T_PASS / 1000, easing: Konva.Easings.EaseInOut,
        });
      }, t2 + T_DRAW);

      // Arrow Curl → out (toward blue line — exit the zone), then puck
      const t3 = t2 + T_DRAW + T_PASS + 250;
      drawArrow(curlPos, outPos, '#0D5EAB', t3);
      setTimeout(() => {
        animPuck.to({
          x: outPos.x, y: outPos.y,
          duration: T_PASS / 1000, easing: Konva.Easings.EaseInOut,
          onFinish: () => {
            animPuck.to({ opacity: 0.5, duration: 0.4 });
            // Restore the static puck on D once the Show Me sequence
            // completes — the scene returns to its "kid is positioning
            // forwards" state. Reset/Next will rebuild it anyway, but this
            // keeps the visual consistent if the kid lingers on the result.
            if (puckNode && !puckNode.isDestroyed()) {
              puckNode.visible(origPuckVisible);
              gridLayer.batchDraw();
            }
          },
        });
      }, t3 + T_DRAW);
    }

    function showCorrectPositions() {
      // Belt + suspenders: if kid spams Show Me, cancel any in-flight glide
      // from a prior invocation before starting a new one. Without this, two
      // overlapping glides could fight each other on the same forward node.
      cancelShowMeGlide();
      overlayLayer.destroyChildren();
      const targets = currentTargets();
      const roleColors = { wall: '#E0C68A', curl: '#2E7D3F', stretch: '#0D5EAB' };
      const roles = ['wall', 'curl', 'stretch'];
      roles.forEach((role, idx) => {
        const t = targets[role];
        const c = roleColors[role];
        const node = players[role];
        const delay = idx * 220;
        setTimeout(() => {
          if (node) {
            const cur = node.position();
            const targetX = toCanvasX(t.x);
            const targetY = toCanvasY(t.y);
            if (Math.hypot(targetX - cur.x, targetY - cur.y) > 8) {
              const arrow = new Konva.Arrow({
                points: [cur.x, cur.y, targetX, targetY],
                stroke: c, fill: c,
                strokeWidth: 1.8, dash: [4, 4],
                pointerLength: 8, pointerWidth: 8,
                opacity: 0,
              });
              overlayLayer.add(arrow);
              arrow.to({ opacity: 0.6, duration: 0.3 });
            }
          }
          // Shape-aware ring rendering — rect/oval/circle per target.shape.
          // Falls back to circle if shape is undefined (legacy compat).
          let ring;
          let halfH;  // for label vertical positioning below the shape
          if (t.shape === 'rect') {
            ring = new Konva.Rect({
              x: toCanvasX(t.x) - (t.w / 2) * scale,
              y: toCanvasY(t.y) - (t.h / 2) * scale,
              width: t.w * scale, height: t.h * scale,
              stroke: c, strokeWidth: 2.2, dash: [6, 4],
              opacity: 0,
            });
            halfH = (t.h / 2) * scale;
          } else if (t.shape === 'oval') {
            ring = new Konva.Ellipse({
              x: toCanvasX(t.x), y: toCanvasY(t.y),
              radiusX: t.radiusX * scale, radiusY: t.radiusY * scale,
              stroke: c, strokeWidth: 2.2, dash: [6, 4],
              opacity: 0,
            });
            halfH = t.radiusY * scale;
          } else {
            ring = new Konva.Circle({
              x: toCanvasX(t.x), y: toCanvasY(t.y),
              radius: (t.radius != null ? t.radius : TOL_FT) * scale,
              stroke: c, strokeWidth: 2.2, dash: [6, 4],
              opacity: 0,
            });
            halfH = (t.radius != null ? t.radius : TOL_FT) * scale;
          }
          const labelY = t.y < 16
            ? toCanvasY(t.y) - halfH - 18
            : toCanvasY(t.y) + halfH + 4;
          const lbl = new Konva.Text({
            x: toCanvasX(t.x) - 70, y: labelY,
            text: POSITION_INFO[role].label, width: 140, align: 'center',
            fontSize: 12, fontStyle: '800', fill: c,
            opacity: 0,
          });
          overlayLayer.add(ring, lbl);
          ring.to({ opacity: 0.85, duration: 0.4, easing: Konva.Easings.EaseOut });
          lbl.to({ opacity: 1, duration: 0.4, easing: Konva.Easings.EaseOut });
          overlayLayer.batchDraw();
        }, delay);
      });

      // After all 3 target rings reveal, slide the kid's forwards into their
      // correct breakout positions (~600ms each, staggered by 180ms). The
      // puck animation that follows then flies THROUGH the now-positioned
      // forwards instead of past kid tokens that are still parked in the
      // D-zone. Reset/nextRush cancels these glides via cancelShowMeGlide.
      const glideStart = roles.length * 220 + 200;
      const glideTid = setTimeout(() => {
        ['wall', 'curl', 'stretch'].forEach((role, idx) => {
          const innerTid = setTimeout(() => {
            const node = players[role];
            if (!node || node.isDestroyed()) return;
            const t = targets[role];
            node.to({
              x: toCanvasX(t.x), y: toCanvasY(t.y),
              duration: 0.6, easing: Konva.Easings.EaseInOut,
            });
            showMeTweens.push(node);
          }, idx * 180);
          showMeTimeouts.push(innerTid);
        });
      }, glideStart);
      showMeTimeouts.push(glideTid);

      // Puck-pass animation fires AFTER the sprite glide finishes. Sprites
      // start at glideStart and last ~600ms (last sprite triggers at
      // glideStart + 360ms, finishes at glideStart + 360 + 600 = +960). Add
      // ~1000ms buffer so the puck animation doesn't race the last forward.
      const passTid = setTimeout(() => animateBreakoutPlay(targets), glideStart + 1000);
      showMeTimeouts.push(passTid);
    }

    function clearOverlay() {
      overlayLayer.destroyChildren();
      overlayLayer.batchDraw();
    }

    function resetForwards() {
      for (const role of ['wall', 'curl', 'stretch']) {
        const node = players[role];
        if (!node) continue;
        const start = START_POSITIONS[role];
        node.to({
          x: toCanvasX(start.x),
          y: toCanvasY(start.y),
          duration: 0.4, easing: Konva.Easings.EaseInOut,
        });
      }
    }

    // ----- v0.14 contrast replay support ----------------------------------
    // Breakout's pedagogical twist: placing Wall/Curl/Stretch badly means the
    // D has NO clean outlet, the forecheck strips the puck, and the opposing
    // play scores on our empty-handed goalie. Right placement = Wall→Curl→
    // clean exit. Contrast animation makes the consequence vivid.
    //
    // Mirrors lane_coverage.js's contrast architecture (snapshotKid /
    // restoreKid / lastEvalResults cache) and forecheck.js's
    // playWrong/playRight/resetPositionsForContrast/showContrastReplay
    // surface area.

    // Snapshot of the kid's placements at Check time, so we can REPLAY the
    // broken breakout with the kid's actual (bad) outlets — that's the
    // lesson. Without the snapshot, a mid-animation Reset or tween could
    // move the tokens and we'd lose the wrong-way story.
    let kidSnapshot = null;
    // Cached evaluation from the most recent check() — lets playWrong pick
    // the most-broken outlet without the caller threading results through.
    let lastEvalResults = null;
    // In-flight animation handles + timeouts so stopContrast can cancel
    // cleanly if the kid hits Skip. Handles: anything with .stop(). Timeouts:
    // setTimeout IDs.
    let contrastHandles = [];
    let contrastTimeouts = [];

    function snapshotKidPositions() {
      kidSnapshot = {};
      for (const role of ['wall', 'curl', 'stretch']) {
        const node = players[role];
        if (!node) continue;
        kidSnapshot[role] = node.position();
      }
    }

    function restoreKidPositions() {
      if (!kidSnapshot) return;
      for (const role of ['wall', 'curl', 'stretch']) {
        const node = players[role];
        const snap = kidSnapshot[role];
        if (node && snap) node.position(snap);
      }
      gridLayer.batchDraw();
    }

    // Lock dragging during contrast so the kid can't grab a token and yank
    // it mid-animation. Restored when contrast ends (success or skip).
    function setForwardsDraggable(on) {
      for (const role of ['wall', 'curl', 'stretch']) {
        const node = players[role];
        if (node) node.draggable(on);
      }
    }

    // Identify the "most broken" outlet — the role whose token is FURTHEST
    // from its target (in feet) among the failing ones. The wrong-way
    // animation attempts THIS outlet and fails there, pedagogically pointing
    // at the kid's specific mistake. Matches lane_coverage's brokenLaneRole.
    function brokenOutletRole(results) {
      let worst = null;
      let worstDist = -Infinity;
      for (const role of ['wall', 'curl', 'stretch']) {
        const r = results[role];
        if (!r || r.pass) continue;
        if (r.dist > worstDist) {
          worstDist = r.dist;
          worst = role;
        }
      }
      // Default to 'wall' if somehow everything passed (shouldn't happen —
      // caller only invokes playWrong on failure) so the animation still
      // runs rather than no-oping silently.
      return worst || 'wall';
    }

    // Where the D's puck currently sits (live, in case the draw position
    // has drifted — we prefer reading puckNode over recomputing from rush).
    function dPuckPos() {
      if (puckNode && !puckNode.isDestroyed()) {
        return { x: puckNode.x(), y: puckNode.y() };
      }
      const rush = currentRush();
      return {
        x: toCanvasX(rush.dX - (rush.dX >= 0 ? 2 : -2)),
        y: toCanvasY(rush.dY - 4),
      };
    }

    // Where the kid PLACED the given outlet (NOT the target — the kid's
    // actual spot). This is the "bad pass destination" in the wrong-way
    // story: D tries to hit the outlet WHERE THE KID PUT IT, but the
    // forecheck intercepts en route because the spot is in traffic / too
    // far / too tight.
    function kidOutletPos(role) {
      const node = players[role];
      if (node) return node.position();
      // Fallback to target if token somehow missing.
      const t = currentTargets()[role];
      return { x: toCanvasX(t.x), y: toCanvasY(t.y) };
    }

    // Intercept point for playWrong — ~60% along the puck-travel line from
    // D toward the kid's bad outlet. This reads as "forecheck stepped into
    // the lane before the pass arrived." We could anchor on a live f1/f2
    // position, but a line-fraction point is more consistent across rushes
    // (the forechecker placements drift based on rush side).
    function interceptPointOnLine(from, to) {
      const t = 0.6;
      return {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
      };
    }

    // Where the opposing play scores after the strip: our goal line at y=64,
    // center-ish. We use a shot landing just inside the net so the puck
    // visibly crosses the line before the GOAL flash fires.
    function oppGoalTarget() {
      const goalLineY = rink.RINK ? rink.RINK.goalLineY : 64;
      return { x: toCanvasX(0), y: toCanvasY(goalLineY + 1) };
    }

    // Named setTimeout wrapper — pushes the id onto contrastTimeouts so
    // stopContrast can clear them. Not strictly required (all our async
    // waits go through IceQ.Path.wait which is a Promise), but future-proof
    // in case we add setTimeout-driven phases later.
    function trackTimeout(fn, ms) {
      const id = setTimeout(fn, ms);
      contrastTimeouts.push(id);
      return id;
    }

    function stopContrast() {
      contrastHandles.forEach(function (h) {
        if (h && typeof h.stop === 'function') {
          try { h.stop(); } catch (e) { /* noop */ }
        }
      });
      contrastHandles = [];
      contrastTimeouts.forEach(function (id) { clearTimeout(id); });
      contrastTimeouts = [];
    }

    // playWrong: kid's broken outlets stand. D attempts the worst outlet,
    // forecheck intercepts at the 60% mark, forecheck shoots on our net,
    // GOAL. Horn + red flash + shake.
    function playWrong(skipSignal) {
      skipSignal = skipSignal || { skipped: false };
      const role = brokenOutletRole(lastEvalResults || {});
      const fromPos = dPuckPos();
      const badOutletPos = kidOutletPos(role);
      const interceptPos = interceptPointOnLine(fromPos, badOutletPos);
      const netPos = oppGoalTarget();
      // Slightly larger puck for the consequence animations — easier to
      // see at small phone scale than the default 6px. Matches the puck
      // size used in lane_coverage / forecheck consequence visuals.
      const PUCK_R = Math.max(6, scale * 0.85);

      // Hide the static puck on D so the only puck on screen during the
      // contrast is the animated copy. Restored at the end / on skip.
      const origPuckVisible = puckNode && !puckNode.isDestroyed() ? puckNode.visible() : true;
      function hideStaticPuck() {
        if (puckNode && !puckNode.isDestroyed()) {
          puckNode.visible(false);
          gridLayer.batchDraw();
        }
      }
      function restoreStaticPuck() {
        if (puckNode && !puckNode.isDestroyed()) {
          puckNode.visible(origPuckVisible);
          gridLayer.batchDraw();
        }
      }

      return (async function () {
        if (skipSignal.skipped) return;
        hideStaticPuck();
        // Step a: D attempts the pass toward the kid's bad outlet — but the
        // puck "stops short" at the intercept point. No arc (this is a rim
        // or a straight pass that gets tipped, not a saucer). persist:false
        // so the puck node auto-cleans at end of each leg.
        const pass1 = IceQ.Path.animatePuckPass(gridLayer, fromPos, interceptPos, {
          duration: 0.5, radius: PUCK_R,
        });
        contrastHandles.push(pass1);
        await pass1.promise;
        if (skipSignal.skipped) { restoreStaticPuck(); return; }

        // Beat — forecheck controls the loose puck. Without this pause the
        // second pass reads as one continuous motion and the "strip" moment
        // doesn't register.
        await IceQ.Path.wait(180);
        if (skipSignal.skipped) { restoreStaticPuck(); return; }

        // Step b: forecheck shoots / passes toward our net. Slight arc — a
        // realistic odd-man-rush shot has some lift. Longer duration
        // because the travel distance is larger (intercept point is deep
        // in our zone; net is at y=64).
        const pass2 = IceQ.Path.animatePuckPass(gridLayer, interceptPos, netPos, {
          duration: 0.75, radius: PUCK_R, arcHeight: 12,
        });
        contrastHandles.push(pass2);
        await pass2.promise;
        if (skipSignal.skipped) { restoreStaticPuck(); return; }

        // Step c+d: GOAL flash + horn. horn first so audio leads the flash
        // by a frame — matches the felt experience of "puck in" then
        // "crowd reacts." Flash/shake overlay for emotional weight.
        IceQ.Audio.goalHorn();
        await IceQ.Path.animateGoalConsequence(rink, { kind: 'goal', duration: 1.3 });
        restoreStaticPuck();
      })();
    }

    // playRight: snap forwards to optimal targets, then sequence the
    // breakout: D→Wall (gold), Wall→Curl (green), Curl→out (blue). Ends
    // with CLEARED flash + savePling. Mirrors animateBreakoutPlay visually
    // (same three-leg sequence, same role colors), but uses the shared
    // IceQ.Path.animatePuckPass plumbing so handles can be cancelled on Skip.
    function playRight(skipSignal) {
      skipSignal = skipSignal || { skipped: false };
      const targets = currentTargets();
      const fromPos = dPuckPos();
      const wallPos = { x: toCanvasX(targets.wall.x), y: toCanvasY(targets.wall.y) };
      const curlPos = { x: toCanvasX(targets.curl.x), y: toCanvasY(targets.curl.y) };
      // "Out of zone" destination — above the blue line, centered on the
      // curl's x so the exit reads as a natural skate-out, not a teleport.
      const outPos = { x: curlPos.x, y: toCanvasY(0) };
      const PUCK_R = Math.max(6, scale * 0.85);
      const moveDur = 0.4;

      // Same hide/restore pattern as playWrong — kill the static puck so the
      // animated 3-leg breakout sequence is the only puck on the ice.
      const origPuckVisible = puckNode && !puckNode.isDestroyed() ? puckNode.visible() : true;
      function hideStaticPuck() {
        if (puckNode && !puckNode.isDestroyed()) {
          puckNode.visible(false);
          gridLayer.batchDraw();
        }
      }
      function restoreStaticPuck() {
        if (puckNode && !puckNode.isDestroyed()) {
          puckNode.visible(origPuckVisible);
          gridLayer.batchDraw();
        }
      }

      return (async function () {
        if (skipSignal.skipped) return;
        // Step a: animate kid's tokens to the optimal targets (0.4s each,
        // parallel). The kid literally sees "oh — those forwards SHOULD be
        // HERE." This is the BUT INSTEAD reveal.
        for (const role of ['wall', 'curl', 'stretch']) {
          const node = players[role];
          if (!node) continue;
          const t = targets[role];
          node.to({
            x: toCanvasX(t.x),
            y: toCanvasY(t.y),
            duration: moveDur,
            easing: Konva.Easings.EaseInOut,
          });
        }
        // Let the tokens arrive before passes start — otherwise Wall
        // receives the puck mid-skate which reads as chaotic, not as
        // "support was in position for the D."
        await IceQ.Path.wait(moveDur * 1000 + 200);
        if (skipSignal.skipped) return;
        hideStaticPuck();

        // Step b1: D → Wall pass. Gold color (Wall's role color in
        // showCorrectPositions). Short duration — the wall pass is the
        // quickest outlet, already only ~15-20 ft of travel.
        const passDtoW = IceQ.Path.animatePuckPass(gridLayer, fromPos, wallPos, {
          duration: 0.4, radius: PUCK_R, stroke: '#E0C68A',
        });
        contrastHandles.push(passDtoW);
        await passDtoW.promise;
        if (skipSignal.skipped) { restoreStaticPuck(); return; }
        await IceQ.Path.wait(100);
        if (skipSignal.skipped) { restoreStaticPuck(); return; }

        // Step b2: Wall → Curl pass. Green (Curl's role color).
        const passWtoC = IceQ.Path.animatePuckPass(gridLayer, wallPos, curlPos, {
          duration: 0.4, radius: PUCK_R, stroke: '#2E7D3F',
        });
        contrastHandles.push(passWtoC);
        await passWtoC.promise;
        if (skipSignal.skipped) { restoreStaticPuck(); return; }
        await IceQ.Path.wait(100);
        if (skipSignal.skipped) { restoreStaticPuck(); return; }

        // Step b3: Curl → out of zone. Blue (the "exit" leg — reuses the
        // color from animateBreakoutPlay's Curl→out arrow). Longer
        // duration because the travel is longer and we want the kid to
        // watch the puck LEAVE the zone, which is the whole point.
        const passCtoO = IceQ.Path.animatePuckPass(gridLayer, curlPos, outPos, {
          duration: 0.55, radius: PUCK_R, stroke: '#0D5EAB',
        });
        contrastHandles.push(passCtoO);
        await passCtoO.promise;
        if (skipSignal.skipped) { restoreStaticPuck(); return; }

        // Step c+d: CLEARED flash + savePling. Pling before flash so audio
        // leads (matches lane_coverage / forecheck convention).
        IceQ.Audio.savePling();
        await IceQ.Path.animateGoalConsequence(rink, { kind: 'cleared', duration: 1.1 });
        restoreStaticPuck();
      })();
    }

    // resetPositionsForContrast: between wrong and right replays, restore
    // the kid's SNAPSHOTTED (broken) positions. The playRight closure then
    // tweens them to optimal targets as part of its reveal. We snap back
    // here so there's a stable "this is what you chose" frame before the
    // right-way fix animates. Mirrors lane_coverage's resetPositions.
    function resetPositionsForContrast(skipSignal) {
      skipSignal = skipSignal || { skipped: false };
      return (async function () {
        if (skipSignal.skipped) return;
        if (kidSnapshot) {
          for (const role of ['wall', 'curl', 'stretch']) {
            const node = players[role];
            const snap = kidSnapshot[role];
            if (node && snap) node.position(snap);
          }
          gridLayer.batchDraw();
        }
        await IceQ.Path.wait(120);
      })();
    }

    // showContrastReplay: orchestrates wrong→BUT INSTEAD→right using the
    // shared IceQ.Path.showContrast plumbing. Caller passes eval results
    // (so we cache them for playWrong's role-selection) and a skipSignal
    // object whose .skipped the orchestrator polls.
    function showContrastReplay(results, skipSignal) {
      lastEvalResults = results;
      snapshotKidPositions();
      setForwardsDraggable(false);
      stopContrast();    // clean slate in case a prior replay left handles
      const sig = skipSignal || { skipped: false };
      return IceQ.Path.showContrast({
        rink: rink,
        skipSignal: sig,
        playWrong: function () { return playWrong(sig); },
        resetPositions: function () { return resetPositionsForContrast(sig); },
        playRight: function () { return playRight(sig); },
        wrongLabel: 'FORECHECK STRIPS IT\u2026',
        middleLabel: 'BUT INSTEAD\u2026',
        rightLabel: 'CLEAN EXIT.',
      }).then(function (outcome) {
        // Whatever happens (skip or completion), give control back: stop
        // any lingering handles, restore kid positions, re-enable drag.
        // Belt-and-suspenders: also force the static puck visible — playWrong/
        // playRight restore it themselves but a mid-flight skip path could
        // miss it.
        stopContrast();
        restoreKidPositions();
        if (puckNode && !puckNode.isDestroyed()) {
          puckNode.visible(true);
          gridLayer.batchDraw();
        }
        setForwardsDraggable(true);
        return outcome;
      });
    }

    // Check wrapper that caches results — lets playWrong pick the broken
    // outlet without main.js having to plumb the eval object through every
    // call. Matches lane_coverage's evaluateWithCache convention.
    const evaluateWithCache = function () {
      const r = evaluate();
      lastEvalResults = r;
      return r;
    };

    drawDWithPuck();
    drawAllForwards();
    gridLayer.batchDraw();

    function nextRush() {
      stopContrast();
      cancelShowMeGlide();
      // drawDWithPuck cancels forechecker pressure internally, so no
      // explicit cancelForecheckerPressure needed here.
      rushIdx = (rushIdx + 1) % RUSHES.length;
      clearOverlay();
      drawDWithPuck();
      resetForwards();
      gridLayer.batchDraw();
      return { rushIdx, rush: currentRush(), totalRushes: RUSHES.length };
    }

    return {
      rink,
      check: evaluateWithCache,
      showMe: showCorrectPositions,
      reset: () => {
        stopContrast();
        cancelShowMeGlide();
        // Snap any in-flight forecheckers to their pressure spots so a
        // half-skated forechecker isn't frozen mid-glide on the reset.
        cancelForecheckerPressure(true);
        clearOverlay();
        resetForwards();
        // If reset fires mid-Show-Me (animateBreakoutPlay) the static puck
        // on D may still be hidden because the onFinish never ran. Force
        // it visible so the kid sees the puck in its proper start spot.
        if (puckNode && !puckNode.isDestroyed()) {
          puckNode.visible(true);
          gridLayer.batchDraw();
        }
      },
      nextRush,
      currentRushInfo: () => ({ rushIdx, rush: currentRush(), totalRushes: RUSHES.length }),
      isDone: () => {
        const r = evaluate();
        return r.wall?.pass && r.curl?.pass && r.stretch?.pass;
      },
      // v0.14 contrast-replay API. main.js wireBreakout invokes these on
      // a failed Check to drive the wrong→BUT INSTEAD→right teaching loop.
      playWrongConsequence: playWrong,
      playRightAnswer: playRight,
      showContrastReplay: showContrastReplay,
      stopContrast: stopContrast,
    };
  }

  function phrasedFeedback(results) {
    const passes = ['wall', 'curl', 'stretch'].filter(r => results[r]?.pass);
    if (passes.length === 3) {
      return "Wall, Curl, Stretch — all three breakout options. The D can pick any of you. Forecheckers can pressure but can't take all three lanes away.";
    }
    if (passes.length === 2) {
      const missed = ['wall', 'curl', 'stretch'].find(r => !results[r]?.pass);
      const t = results[missed]?.target;
      return `Two of three in support. ${POSITION_INFO[missed].label} is off — ${t.desc}`;
    }
    if (passes.length === 1) {
      return "Only one breakout option available — the forecheck takes that away and we're stuck. Three positions, three lanes out.";
    }
    return "No breakout support. Tap Show Me to see Wall, Curl, and Stretch positions.";
  }

  return { init, phrasedFeedback, RUSHES, targetsForRush, POSITION_INFO };
})();
