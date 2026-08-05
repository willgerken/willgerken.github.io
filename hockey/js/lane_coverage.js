// Scenario: Lane Coverage.
//
// When the opposing rush comes into OUR defensive zone, the three forwards
// fill THREE LANES — not three different jobs that rotate. This is the
// structural / positional teaching that pairs with Forecheck's role-based
// teaching: keep the lanes integral so nobody finds a seam.
//
// Lanes (defensive zone, looking from blue line down to net):
//   Left lane:    x in [-40, -14]
//   Middle lane:  x in [-14, 14]
//   Right lane:   x in [14, 40]

window.IceQ = window.IceQ || {};

window.IceQ.LaneCoverage = (function () {
  // v0.17 (per Will): TEACH-then-TEST pedagogy. First-time visitors see an
  // empty rink with the 3 lane targets glowing — kid drags forwards into
  // their lanes (no rush pressure, no time pressure). Once all 3 placed,
  // the rush spawns and normal play begins. Subsequent visits skip TEACH.
  //
  // Belfry / Hockey Think Tank teaching pattern: introduce the CONCEPT
  // (here: 3 lanes), then APPLY the concept (rush comes in). Mixing both
  // in the first encounter overloaded newer kids.
  const TEACH_STORAGE_KEY = 'iceq.teach-done.lane-coverage.v1';
  function isTeachDone() {
    try { return localStorage.getItem(TEACH_STORAGE_KEY) === '1'; }
    catch (e) { return false; }
  }
  function markTeachDone() {
    try { localStorage.setItem(TEACH_STORAGE_KEY, '1'); } catch (e) {}
  }

  // Three rushes — puck enters at different lanes. Same three forwards
  // (LW, C, RW) but the STRONG-side wing tightens up while the WEAK-side
  // wing holds his lane.
  //
  // Each rush is a 3-attacker rush (carrier + 2 receivers). Lane coverage
  // ONLY makes sense when there are multiple attackers who could receive a
  // cross-ice pass — with a single carrier the kid's correct read is "all 3
  // collapse." So every rush has receivers in the OTHER lanes, making the
  // cross-ice pass a visible threat that the lanes prevent.
  //
  // Y-depths are varied so the rush has texture (carrier ~10, receivers at
  // 8 and 14) — looks like a real moving rush, not a frozen line.
  const RUSHES = [
    {
      side: 'R', puckX:  22, puckY: 10, label: 'right-wing carry',
      receivers: [
        { x:   2, y:  8, side: 'C' },  // center driving the slot
        { x: -22, y: 14, side: 'L' },  // weak-side LW trailing — cross-ice option
      ],
    },
    {
      side: 'L', puckX: -22, puckY: 10, label: 'left-wing carry',
      receivers: [
        { x:  -2, y:  8, side: 'C' },  // center driving the slot
        { x:  22, y: 14, side: 'R' },  // weak-side RW trailing — cross-ice option
      ],
    },
    {
      side: 'C', puckX:   0, puckY: 12, label: 'middle drive',
      receivers: [
        { x: -22, y:  9, side: 'L' },  // LW wide on the wing
        { x:  22, y: 14, side: 'R' },  // RW wide on the wing — staggered depth
      ],
    },
  ];

  // Lane geometry — wings defend a vertical STRIP of ice, not a circle.
  // Width 12 ft ≈ width of an outside lane (40 - 14 = 26 ft total per side,
  // we want the kid in the inner half closer to the slot). Height 18 ft
  // covers from just below blue line down to the top of the circles.
  const LANE_W = 12;
  const LANE_H = 18;
  const C_RADIUS = 10;

  function targetsForRush(rush) {
    if (rush.side === 'C') {
      // Middle drive — center pressures, wings WIDEN to take away cross-ice
      // outlets (per Coach round-2: previous values had wings collapsing too
      // far inside, giving up the wide pass).
      return {
        lw: { x: -20, y: 28, shape: 'rect', w: LANE_W, h: LANE_H, desc: 'Cover the wide LEFT lane — take away the cross-ice option.' },
        c:  { x:   0, y: 22, shape: 'circle', radius: C_RADIUS, desc: 'Pressure the puck carrier head-on. Force him to a side.' },
        rw: { x:  20, y: 28, shape: 'rect', w: LANE_W, h: LANE_H, desc: 'Cover the wide RIGHT lane — mirror LW.' },
      };
    }
    const sign = rush.puckX >= 0 ? 1 : -1;
    return {
      lw: { x: -sign * 22, y: 26, shape: 'rect', w: LANE_W, h: LANE_H, desc: sign > 0 ? 'Weak-side wing — protect the cross-ice option.' : 'On the puck-side wing — close the gap, force outside.' },
      c:  { x:  sign * 6,  y: 22, shape: 'circle', radius: C_RADIUS, desc: 'Center high — read the next pass, support strong side.' },
      rw: { x:  sign * 22, y: 26, shape: 'rect', w: LANE_W, h: LANE_H, desc: sign > 0 ? 'On the puck-side wing — close the gap, force outside.' : 'Weak-side wing — protect the cross-ice option.' },
    };
  }

  const POSITION_INFO = {
    lw: { letter: 'L', text: 'LW', label: 'Left Wing' },
    c:  { letter: 'C', text: 'C',  label: 'Center'   },
    rw: { letter: 'R', text: 'RW', label: 'Right Wing' },
  };

  // Legacy circle tolerance — still used as fallback if a target lacks
  // shape/dims. Real shape-based tolerance handled by inTarget().
  const TOL_FT = 11;

  function inTarget(xFt, yFt, t) {
    if (t.shape === 'rect') {
      return Math.abs(xFt - t.x) <= t.w / 2 && Math.abs(yFt - t.y) <= t.h / 2;
    }
    // default circle (also handles t.shape === 'circle')
    const r = t.radius != null ? t.radius : TOL_FT;
    return Math.hypot(xFt - t.x, yFt - t.y) <= r;
  }

  // Game-realistic starts — wings in their lanes already, center high middle.
  // Visual previews "lane integrity" before the kid even drags. Coach: this
  // is what positions LOOK like; kid's job is to react to the rush.
  //
  // v0.17 FIX (Will, hockey dad): previous starts (y=8-12) were AT the
  // attacker entry line — kid's gold defenders ended up overlapping the
  // red attackers visually as the rush settled. Worse, y=8-12 is OUR
  // OFFENSIVE end (or just below blue line) — backcheckers don't start
  // there. Real backcheckers retreat into the defensive zone (y=20-30 in
  // this coord system) before engaging. New starts: deeper, separated
  // from attackers, aligned with realistic backcheck posture.
  const START_POSITIONS = {
    lw: { x: -28, y: 22 },   // left wing retreating into defensive zone
    c:  { x:   0, y: 20 },   // center middle, slightly higher to read
    rw: { x:  28, y: 22 },   // right wing mirror
  };

  function init(rinkContainer) {
    const rink = IceQ.Rink.create(rinkContainer);
    const { toCanvasX, toCanvasY, scale, overlayLayer, gridLayer } = rink;

    let rushIdx = 0;
    let players = {};
    let puckCarrier = null;
    // Track the static rush puck so contrast animations (playWrong/playRight)
    // can hide it before the animated copy travels — otherwise we end up with
    // TWO pucks on the ice (the static one + the moving one). Restored on
    // reset / nextRush. Mirrors two_on_one.js's puckNode pattern.
    let puckNode = null;
    let rushSceneNodes = [];
    // Tracks any in-flight rush-in tweens / scheduled timeouts so reset can
    // cancel them (otherwise a half-skated carrier keeps animating after
    // the kid hits Reset / Next Rush).
    let rushTweens = [];
    let rushTimeouts = [];
    // Same idea, but for Show Me — we now animate the kid's sprites to
    // their target positions as part of Show Me, and Reset/Next must be
    // able to cancel mid-flight tweens AND scheduled stagger timeouts so
    // the snap-back doesn't fight the demo animation.
    let showMeTweens = [];
    let showMeTimeouts = [];

    function currentRush() { return RUSHES[rushIdx]; }
    function currentTargets() { return targetsForRush(currentRush()); }

    function cancelRushAnimation() {
      rushTimeouts.forEach(id => clearTimeout(id));
      rushTimeouts = [];
      rushTweens.forEach(node => {
        if (node && typeof node.stop === 'function') {
          try { node.stop(); } catch (e) { /* noop */ }
        }
      });
      rushTweens = [];
    }

    function cancelShowMeAnimation() {
      showMeTimeouts.forEach(id => clearTimeout(id));
      showMeTimeouts = [];
      showMeTweens.forEach(node => {
        if (node && typeof node.stop === 'function') {
          try { node.stop(); } catch (e) { /* noop */ }
        }
      });
      showMeTweens = [];
    }

    function drawLaneDividers() {
      // Vertical lane dividers at x=-14 and x=14, dark enough to actually
      // SEE the three lanes the kid is supposed to defend.
      [-14, 14].forEach(x => {
        const line = new Konva.Line({
          points: [toCanvasX(x), toCanvasY(0), toCanvasX(x), toCanvasY(64)],
          stroke: 'rgba(13, 94, 171, 0.45)',
          strokeWidth: 1.8, dash: [6, 5],
          listening: false,
        });
        gridLayer.add(line);
        rushSceneNodes.push(line);
      });
    }

    function drawAttackerCarrying() {
      cancelRushAnimation();
      rushSceneNodes.forEach(n => n.destroy());
      rushSceneNodes = [];
      drawLaneDividers();

      const rush = currentRush();
      // Rush ENTERS from above the blue line — start off-canvas (~30 ft up)
      // and skate INTO position. Kid sees the play develop instead of a
      // frozen carrier. EaseOut so the carrier "decelerates" as he reads
      // the defenders, like a real attacker stickhandling into the zone.
      const RUSH_DURATION = 2.0;
      const ATTACKER_SCALE = Math.max(0.6, scale * 0.085);
      const puckOffsetX = rush.puckX >= 0 ? -2 : 2;
      const puckOffsetY = 5;

      // ----- Carrier (gets the puck + arrow) -------------------------------
      const carrierStartY = rush.puckY - 30;
      puckCarrier = IceQ.Player.create({
        x: toCanvasX(rush.puckX), y: toCanvasY(carrierStartY),
        scale: ATTACKER_SCALE,
        color: 'opponent',
        stickSide: rush.puckX >= 0 ? 'L' : 'R',
      });
      puckNode = new Konva.Circle({
        x: toCanvasX(rush.puckX + puckOffsetX),
        y: toCanvasY(carrierStartY + puckOffsetY),
        radius: Math.max(5, scale * 0.7),
        fill: '#0A0A0A', stroke: '#E0C68A', strokeWidth: 1.5,
      });
      gridLayer.add(puckNode, puckCarrier);
      rushSceneNodes.push(puckNode, puckCarrier);

      puckCarrier.to({
        x: toCanvasX(rush.puckX), y: toCanvasY(rush.puckY),
        duration: RUSH_DURATION, easing: Konva.Easings.EaseOut,
      });
      puckNode.to({
        x: toCanvasX(rush.puckX + puckOffsetX),
        y: toCanvasY(rush.puckY + puckOffsetY),
        duration: RUSH_DURATION, easing: Konva.Easings.EaseOut,
      });
      rushTweens.push(puckCarrier, puckNode);

      // ----- Receivers (no puck, no arrow) ---------------------------------
      // Two MORE attackers in the other lanes — the cross-ice pass threats
      // that justify holding lanes. Each starts off-canvas above the blue
      // line at its own x and skates INTO its target spot. Slight stagger
      // (delays of ~120ms and ~240ms) so the rush looks dynamic rather than
      // synchronized — feels like three separate skaters reading the play.
      const receivers = rush.receivers || [];
      receivers.forEach((rec, idx) => {
        const startY = rec.y - 30;  // off-canvas above the blue line
        const recNode = IceQ.Player.create({
          x: toCanvasX(rec.x), y: toCanvasY(startY),
          scale: ATTACKER_SCALE,
          color: 'opponent',
          // Stick side mirrors carrier convention: outside hand carries the
          // stick, so right-side attackers stick on left and vice versa.
          stickSide: rec.x >= 0 ? 'L' : 'R',
        });
        gridLayer.add(recNode);
        rushSceneNodes.push(recNode);

        // Stagger entrances — first receiver delayed ~120ms, second ~240ms.
        // The carrier already started immediately above; this gives a
        // visible "wave" effect without anyone arriving way late.
        const staggerMs = 120 * (idx + 1);
        const recDelay = setTimeout(() => {
          if (!rushSceneNodes.includes(recNode)) return;
          recNode.to({
            x: toCanvasX(rec.x), y: toCanvasY(rec.y),
            duration: RUSH_DURATION, easing: Konva.Easings.EaseOut,
          });
          rushTweens.push(recNode);
        }, staggerMs);
        rushTimeouts.push(recDelay);
      });

      // After the rush settles, draw the direction-of-motion arrow (so it
      // doesn't compete with the skating-in motion). Mirrors how
      // two_on_one.js stages its post-rush helper visuals. Arrow only on
      // the carrier — receivers are threats but the puck is what scores.
      const arrowDelay = setTimeout(() => {
        // If the scene was reset mid-tween, bail — nodes may be gone.
        if (!rushSceneNodes.includes(puckCarrier)) return;
        const arrow = new Konva.Arrow({
          points: [
            toCanvasX(rush.puckX), toCanvasY(rush.puckY + 12),
            toCanvasX(rush.puckX), toCanvasY(rush.puckY + 24),
          ],
          stroke: 'rgba(206, 32, 46, 0.55)', fill: 'rgba(206, 32, 46, 0.55)',
          strokeWidth: 2.5, pointerLength: 8, pointerWidth: 8,
          opacity: 0,
        });
        gridLayer.add(arrow);
        rushSceneNodes.push(arrow);
        arrow.to({ opacity: 1, duration: 0.3 });
      }, RUSH_DURATION * 1000);
      rushTimeouts.push(arrowDelay);
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
        const pos = node.position();
        const minX = toCanvasX(-40), maxX = toCanvasX(40);
        const minY = toCanvasY(2),   maxY = toCanvasY(60);
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
      ['lw', 'c', 'rw'].forEach(drawForward);
    }

    function evaluate() {
      const results = {};
      const targets = currentTargets();
      for (const role of ['lw', 'c', 'rw']) {
        const node = players[role];
        if (!node) continue;
        const t = { ...targets[role], label: POSITION_INFO[role].label };
        const pos = node.position();
        const xFt = (pos.x - rink.width / 2) / scale;
        const yFt = pos.y / scale;
        // Keep dist for phrasedFeedback's "way off" thresholding — but the
        // pass/fail decision uses the lane-shaped tolerance.
        const dist = Math.hypot(xFt - t.x, yFt - t.y);
        results[role] = { pass: inTarget(xFt, yFt, t), dist, target: t };
      }
      return results;
    }

    function showCorrectPositions() {
      // Cancel any prior Show Me run before starting a new one. Without
      // this, hitting Show Me twice in quick succession stacks tweens and
      // the sprites do a confusing dance.
      cancelShowMeAnimation();
      overlayLayer.destroyChildren();
      const targets = currentTargets();
      // Differentiated colors per Coach round-2 (was both wings = blue;
      // confusing for kids).
      const roleColors = { lw: '#3D6CB8', c: '#E0C68A', rw: '#9C2C8A' };
      const roles = ['lw', 'c', 'rw'];
      roles.forEach((role, idx) => {
        const t = targets[role];
        const c = roleColors[role];
        const node = players[role];
        const delay = idx * 220;
        setTimeout(() => {
          // Arrow from current position to target (if kid moved them)
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
          // Shape-aware target marker. Wings get a TALL RECTANGLE (the
          // lane); center gets a CIRCLE (head-on pressure, not a lane).
          let marker;
          let labelY;
          if (t.shape === 'rect') {
            const wPx = t.w * scale;
            const hPx = t.h * scale;
            marker = new Konva.Rect({
              x: toCanvasX(t.x) - wPx / 2,
              y: toCanvasY(t.y) - hPx / 2,
              width: wPx, height: hPx,
              stroke: c, strokeWidth: 2.2, dash: [6, 4],
              opacity: 0,
            });
            labelY = toCanvasY(t.y) + hPx / 2 + 4;
          } else {
            const r = (t.radius != null ? t.radius : TOL_FT) * scale;
            marker = new Konva.Circle({
              x: toCanvasX(t.x), y: toCanvasY(t.y),
              radius: r,
              stroke: c, strokeWidth: 2.2, dash: [6, 4],
              opacity: 0,
            });
            labelY = toCanvasY(t.y) + r + 4;
          }
          const lbl = new Konva.Text({
            x: toCanvasX(t.x) - 60,
            y: labelY,
            text: POSITION_INFO[role].label, width: 120, align: 'center',
            fontSize: 12, fontStyle: '800', fill: c,
            opacity: 0,
          });
          overlayLayer.add(marker, lbl);
          marker.to({ opacity: 0.85, duration: 0.4, easing: Konva.Easings.EaseOut });
          lbl.to({ opacity: 1, duration: 0.4, easing: Konva.Easings.EaseOut });
          overlayLayer.batchDraw();
        }, delay);
      });

      // ---- Sprite slide phase ---------------------------------------------
      // After the rings + labels are drawn (last ring fires at idx=2 *
      // 220ms = 440ms; fade completes ~400ms later), animate the kid's
      // tokens INTO the target positions so Show Me is a DEMONSTRATION,
      // not just a diagram. Sprites slide on top of their rings and HOLD,
      // so the kid sees the "right answer" frozen on the ice. Mirrors how
      // playRight() animates tokens to targets in the contrast replay.
      //
      // Stagger by 150ms so the three forwards don't all jolt at once —
      // reads as a coordinated reposition rather than a teleport.
      const SPRITE_SLIDE_START = 700;
      const SPRITE_STAGGER = 150;
      const SPRITE_DURATION = 0.6;
      roles.forEach((role, idx) => {
        const node = players[role];
        if (!node) return;
        const t = targets[role];
        const targetX = toCanvasX(t.x);
        const targetY = toCanvasY(t.y);
        const tid = setTimeout(() => {
          // If reset/next was hit between schedule and fire, skip — the
          // sprite has already been snapped back and we don't want to
          // steal it away again.
          if (!players[role]) return;
          node.to({
            x: targetX, y: targetY,
            duration: SPRITE_DURATION, easing: Konva.Easings.EaseInOut,
          });
          showMeTweens.push(node);
        }, SPRITE_SLIDE_START + idx * SPRITE_STAGGER);
        showMeTimeouts.push(tid);
      });
    }

    function clearOverlay() {
      overlayLayer.destroyChildren();
      overlayLayer.batchDraw();
    }

    function resetForwards() {
      // Cancel any in-flight Show Me sprite tweens BEFORE issuing the
      // snap-back. Otherwise the snap-back tween and the Show Me slide
      // tween race each other and the sprites end up wherever the last
      // tween's onFrame fired — usually mid-rink, not at start.
      cancelShowMeAnimation();
      for (const role of ['lw', 'c', 'rw']) {
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

    // ----- Contrast replay support (v0.13) -------------------------------
    // Snapshot of the kid's positions captured at the moment they hit Check.
    // We need this so we can REPLAY the wrong play with the kid's actual
    // tokens in their actual (broken) lanes — not the START_POSITIONS, not
    // the targets. The wrong-way story is THEIR positions giving up the
    // cross-ice. After the wrong play, we move tokens to the targets to
    // tell the right-way story.
    let kidSnapshot = null;
    // Cached evaluation from the most recent check() — lets playWrong /
    // playRight identify the broken lane without the caller needing to
    // plumb results through every call. Hoisted here (vs inline with
    // evaluateWithCache below) so the contrast helper closures capture
    // the binding, not undefined.
    let lastEvalResults = null;

    function snapshotKidPositions() {
      kidSnapshot = {};
      for (const role of ['lw', 'c', 'rw']) {
        const node = players[role];
        if (!node) continue;
        kidSnapshot[role] = node.position();
      }
    }

    // Lock dragging during contrast replay so the kid can't grab a token
    // mid-animation and yank it. We restore draggability when the contrast
    // ends (or is skipped).
    function setForwardsDraggable(on) {
      for (const role of ['lw', 'c', 'rw']) {
        const node = players[role];
        if (node) node.draggable(on);
      }
    }

    // Move forwards to a named target set with a short tween. Used both for
    // the right-way replay (move from kid spots -> optimal targets) and for
    // resetPositions (snap back to whatever spots we want for the next
    // phase). `instant: true` skips the tween (used between phases when we
    // want a hard cut, not an animated drift).
    function moveForwardsTo(positions, opts) {
      opts = opts || {};
      const dur = opts.instant ? 0 : (opts.duration != null ? opts.duration : 0.5);
      const promises = [];
      for (const role of ['lw', 'c', 'rw']) {
        const node = players[role];
        if (!node) continue;
        const target = positions[role];
        if (!target) continue;
        const targetX = toCanvasX(target.x);
        const targetY = toCanvasY(target.y);
        if (dur === 0) {
          node.position({ x: targetX, y: targetY });
        } else {
          promises.push(new Promise(function (resolve) {
            node.to({
              x: targetX, y: targetY,
              duration: dur, easing: Konva.Easings.EaseInOut,
              onFinish: resolve,
            });
          }));
        }
      }
      gridLayer.batchDraw();
      return Promise.all(promises);
    }

    // Identify the "broken lane" — the role whose token is FURTHEST from
    // its target (in feet). When multiple lanes fail, this is the lane the
    // imaginary opposing forward attacks because it's the widest seam. If
    // no lane is broken (defensive — caller shouldn't invoke playWrong in
    // that case) we default to LW so the animation still runs.
    function brokenLaneRole(results) {
      let worst = null;
      let worstDist = -Infinity;
      for (const role of ['lw', 'c', 'rw']) {
        const r = results[role];
        if (!r || r.pass) continue;
        if (r.dist > worstDist) {
          worstDist = r.dist;
          worst = role;
        }
      }
      return worst || 'lw';
    }

    // The vacated spot — where the lane SHOULD have been defended. The
    // cross-ice pass goes there because nobody is home. Pulled from the
    // role's target for the current rush.
    function vacatedSpotFor(role) {
      const t = currentTargets()[role];
      return { x: toCanvasX(t.x), y: toCanvasY(t.y) };
    }

    // Receiver tap-in destination. Strong-side tap-ins go far-post (the
    // shot the goalie can't slide across for in time). Middle drives go
    // straight at the net.
    function tapInTarget(role) {
      // RINK.netHalfWidth = 3, goalLineY = 64. Tuck just inside the post,
      // a hair behind the line so it visually reads as "in the net."
      const goalLineY = rink.RINK.goalLineY;
      const postOffset = rink.RINK.netHalfWidth - 0.6;
      if (role === 'lw') {
        // Left lane was broken → puck enters from left side, taps in far
        // post = right post.
        return { x: toCanvasX(postOffset), y: toCanvasY(goalLineY + 1) };
      }
      if (role === 'rw') {
        // Right lane broken → tap-in to left post.
        return { x: toCanvasX(-postOffset), y: toCanvasY(goalLineY + 1) };
      }
      // Middle broken → straight to net center (slightly off-center so the
      // puck visibly travels rather than sitting on top of the carrier line).
      return { x: toCanvasX(0), y: toCanvasY(goalLineY + 1) };
    }

    // Carrier position — the cross-ice pass starts at the puck carrier the
    // kid's currently watching. drawAttackerCarrying() places the carrier
    // at (rush.puckX, rush.puckY); puck offset matches.
    function carrierPuckPos() {
      const rush = currentRush();
      const puckOffsetX = rush.puckX >= 0 ? -2 : 2;
      const puckOffsetY = 5;
      return {
        x: toCanvasX(rush.puckX + puckOffsetX),
        y: toCanvasY(rush.puckY + puckOffsetY),
      };
    }

    // Intercept point for the right-way replay — we pick a spot INSIDE the
    // held lane so the puck visibly enters the lane and dies there. Picked
    // along the line from carrier to vacated-spot, but stopped at ~70% of
    // the way so the interception happens in the lane defender's body, not
    // at the carrier's stick (which would read as "the carrier didn't even
    // try to pass") nor at the vacated spot (which would read as "the lane
    // wasn't defended").
    function interceptPointFor(role) {
      const from = carrierPuckPos();
      const target = currentTargets()[role];
      const to = { x: toCanvasX(target.x), y: toCanvasY(target.y) };
      const t = 0.7;
      return {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
      };
    }

    // playWrong: kid's broken-lane positions stand. Carrier passes cross-
    // ice through the seam to a phantom receiver, who taps it in. Goal.
    function playWrong(skipSignal) {
      skipSignal = skipSignal || { skipped: false };
      const role = brokenLaneRole(lastEvalResults || {});
      const carrierPos = carrierPuckPos();
      const lanePos = vacatedSpotFor(role);
      const tapPos = tapInTarget(role);
      // Slightly larger puck for the consequence animations — easier to
      // see at small phone scale than the default 6px.
      const PUCK_R = Math.max(6, scale * 0.85);

      // Hide the static rush puck while the animated copy travels — otherwise
      // the kid sees TWO pucks (the static one on the carrier + the moving
      // one). Restored at the end (or on skip) so the post-replay scene
      // shows the original puck again.
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
        // Step a: cross-ice pass from carrier to the vacated lane spot.
        // Slight arc to read as a heads-up cross-ice feed, not a dump.
        const pass1 = IceQ.Path.animatePuckPass(gridLayer, carrierPos, lanePos, {
          duration: 0.6, radius: PUCK_R, arcHeight: 18,
        });
        await pass1.promise;
        if (skipSignal.skipped) { restoreStaticPuck(); return; }

        // Brief pause — the imaginary receiver "catches" the puck. Without
        // this beat the second pass reads as one continuous motion, which
        // doesn't telegraph "puck arrived in the seam" -> "now it's a tap-in".
        await IceQ.Path.wait(160);
        if (skipSignal.skipped) { restoreStaticPuck(); return; }

        // Step b: tap-in to the far/back post.
        const pass2 = IceQ.Path.animatePuckPass(gridLayer, lanePos, tapPos, {
          duration: 0.35, radius: PUCK_R,
        });
        await pass2.promise;
        if (skipSignal.skipped) { restoreStaticPuck(); return; }

        // Step c+d: GOAL flash + horn.
        IceQ.Audio.goalHorn();
        await IceQ.Path.animateGoalConsequence(rink, { kind: 'goal', duration: 1.3 });
        restoreStaticPuck();
      })();
    }

    // playRight: forwards now in their lanes. Carrier ATTEMPTS the same
    // cross-ice pass — but the held lane intercepts it.
    function playRight(skipSignal) {
      skipSignal = skipSignal || { skipped: false };
      const carrierPos = carrierPuckPos();
      // Pick the SAME role we just used in playWrong so the contrast is
      // truly "the same pass that scored is now picked off." Use the kid's
      // broken lane (from snapshot) — that's the lesson.
      const role = brokenLaneRole(lastEvalResults || {});
      const interceptPos = interceptPointFor(role);
      const PUCK_R = Math.max(6, scale * 0.85);

      // Same hide/restore pattern as playWrong — kill the static puck so the
      // animated intercept attempt is the only puck on the ice.
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
        // The cross-ice pass attempt — same arc, but it dies in the lane.
        const pass = IceQ.Path.animatePuckPass(gridLayer, carrierPos, interceptPos, {
          duration: 0.55, radius: PUCK_R, arcHeight: 14,
        });
        await pass.promise;
        if (skipSignal.skipped) { restoreStaticPuck(); return; }

        // Save pling FIRST so the audio leads the visual flash by a beat —
        // matches the felt experience of "stick on puck" then "crowd reacts."
        IceQ.Audio.savePling();
        await IceQ.Path.animateGoalConsequence(rink, { kind: 'intercepted', duration: 1.1 });
        restoreStaticPuck();
      })();
    }

    // resetPositions: between wrong and right replays, snap the kid's
    // (broken) tokens back to where they were when they hit Check, then
    // animate them into the OPTIMAL target positions so the right-way
    // replay has the held lanes the lesson requires. We snap-then-animate
    // so the kid sees the move ("oh — those forwards SHOULD be HERE").
    function resetPositions() {
      return (async function () {
        // Snap to kid's spots (instant, no tween — the wrong-way replay
        // didn't move tokens, so this is a no-op visually unless we want
        // to be explicit. We do it for safety.)
        if (kidSnapshot) {
          for (const role of ['lw', 'c', 'rw']) {
            const node = players[role];
            const snap = kidSnapshot[role];
            if (node && snap) node.position(snap);
          }
          gridLayer.batchDraw();
        }
        await IceQ.Path.wait(120);
        // Now move them to the targets — this is the "watch how it should
        // have been set up" beat.
        const targets = currentTargets();
        await moveForwardsTo({
          lw: { x: targets.lw.x, y: targets.lw.y },
          c:  { x: targets.c.x,  y: targets.c.y  },
          rw: { x: targets.rw.x, y: targets.rw.y },
        }, { duration: 0.55 });
      })();
    }

    // Restore the kid's tokens to their pre-contrast positions (so the
    // post-replay state matches what they had on screen when they hit
    // Check — they can adjust and try again without surprise jumps).
    function restoreKidPositions() {
      if (!kidSnapshot) return;
      for (const role of ['lw', 'c', 'rw']) {
        const node = players[role];
        const snap = kidSnapshot[role];
        if (node && snap) node.position(snap);
      }
      gridLayer.batchDraw();
    }

    // showContrastReplay: orchestrates the full wrong->BUT INSTEAD->right
    // sequence using IceQ.Path.showContrast. Caller passes the eval
    // results (from .check()) and a skipSignal object whose .skipped
    // boolean the caller flips when btn-skip is clicked.
    function showContrastReplay(results, skipSignal) {
      lastEvalResults = results;
      snapshotKidPositions();
      setForwardsDraggable(false);
      // Hide the lane-divider arrow while the contrast plays — the arrow
      // is a "rush is coming" affordance, not a "consequence is playing"
      // one. We just let the rest of the rush scene stay (carrier, puck,
      // dividers) so the kid sees the play context.
      return IceQ.Path.showContrast({
        rink: rink,
        playWrong: function () { return playWrong(skipSignal); },
        resetPositions: resetPositions,
        playRight: function () { return playRight(skipSignal); },
        skipSignal: skipSignal,
      }).then(function (outcome) {
        // Whatever happens (skipped or completed), put the kid back in
        // control with their original positions. Also belt-and-suspenders
        // make sure the static rush puck is visible — playWrong/playRight
        // restore it themselves but a mid-flight skip path could miss it.
        restoreKidPositions();
        if (puckNode && !puckNode.isDestroyed()) {
          puckNode.visible(true);
          gridLayer.batchDraw();
        }
        setForwardsDraggable(true);
        return outcome;
      });
    }

    // Check wrapper that caches the most recent results so playWrong /
    // playRight can pick the broken lane without the caller needing to
    // plumb the eval object through every call.
    const evaluateWithCache = function () {
      const r = evaluate();
      lastEvalResults = r;
      return r;
    };

    // -------- TEACH STAGE (v0.17) -----------------------------------------
    // First-time visitors: present the 3 lane targets WITHOUT the rush.
    // Kid drags forwards into the lanes at their own pace. Once all 3 are
    // in their target lanes, fade the teach overlay and trigger the rush.
    // Subsequent visits skip teach and go straight to the normal flow.

    let teachOverlayNodes = [];
    let teachActive = false;

    function clearTeachOverlay() {
      teachOverlayNodes.forEach(n => { try { n.destroy(); } catch (e) {} });
      teachOverlayNodes = [];
      overlayLayer.batchDraw();
    }

    function drawTeachTargets() {
      // Draw glowing dashed lane targets matching the targets the kid will
      // need to fill. We use the C-rush targets here as a generic "show all
      // 3 lanes" since the rush hasn't spawned yet — the actual TEST rush
      // (which sets the side) starts AFTER teach completes.
      const teachTargets = targetsForRush({ side: 'C', puckX: 0, puckY: 12 });
      const roleColors = { lw: '#3D6CB8', c: '#E0C68A', rw: '#9C2C8A' };
      ['lw', 'c', 'rw'].forEach(role => {
        const t = teachTargets[role];
        const c = roleColors[role];
        let ring;
        if (t.shape === 'rect') {
          ring = new Konva.Rect({
            x: toCanvasX(t.x) - (t.w / 2) * scale,
            y: toCanvasY(t.y) - (t.h / 2) * scale,
            width: t.w * scale, height: t.h * scale,
            stroke: c, strokeWidth: 2.5, dash: [6, 4],
            fill: c, fillEnabled: true,
            opacity: 0,
          });
          ring.fill(c);
          // Konva fill alpha — separate from stroke opacity. Use a paint helper:
          ring.setAttr('opacity', 0);
        } else {
          ring = new Konva.Circle({
            x: toCanvasX(t.x), y: toCanvasY(t.y),
            radius: (t.radius || 10) * scale,
            stroke: c, strokeWidth: 2.5, dash: [6, 4],
            opacity: 0,
          });
        }
        // Soft fill for visibility — separate from stroke
        ring.setAttr('opacity', 0);
        // Label below
        const halfH = t.shape === 'rect' ? (t.h / 2) * scale : (t.radius || 10) * scale;
        const lbl = new Konva.Text({
          x: toCanvasX(t.x) - 70,
          y: toCanvasY(t.y) + halfH + 6,
          width: 140, align: 'center',
          text: POSITION_INFO[role].label.toUpperCase() + ' LANE',
          fontSize: 11, fontStyle: '900', fill: c,
          opacity: 0,
        });
        overlayLayer.add(ring, lbl);
        teachOverlayNodes.push(ring, lbl);
        // Pulse the rings — fade in to ~0.85, then a gentle 0.55 ↔ 0.95 oscillation
        ring.to({ opacity: 0.85, duration: 0.4 });
        lbl.to({ opacity: 1, duration: 0.4 });
      });
    }

    function drawTeachInstruction(text) {
      const t = new Konva.Text({
        x: 0, y: 8, width: rink.width, align: 'center',
        text: text,
        fontSize: 14, fontStyle: '900',
        fill: '#E0C68A', letterSpacing: 0.8,
        shadowColor: '#000', shadowBlur: 6, shadowOpacity: 0.7,
        opacity: 0,
      });
      overlayLayer.add(t);
      teachOverlayNodes.push(t);
      t.to({ opacity: 1, duration: 0.4 });
      return t;
    }

    function checkTeachProgress() {
      // Use C-rush targets (the generic "all 3 lanes shown") for the teach
      // check. Kid passes when all 3 forwards are inside their respective
      // lane shapes.
      const teachTargets = targetsForRush({ side: 'C', puckX: 0, puckY: 12 });
      const placed = ['lw', 'c', 'rw'].filter(role => {
        const node = players[role];
        if (!node) return false;
        const pos = node.position();
        const xFt = (pos.x - rink.width / 2) / scale;
        const yFt = pos.y / scale;
        return inTarget(xFt, yFt, teachTargets[role]);
      });
      return { placed: placed.length, total: 3 };
    }

    async function runTeachStage() {
      teachActive = true;
      drawTeachTargets();
      const instr = drawTeachInstruction('LEARN THE LANES — drag each forward into its lane');
      // Listen to dragmove on each forward; check progress; when all 3
      // placed, end teach.
      let teachResolved = false;
      return new Promise((resolve) => {
        function onProgress() {
          if (teachResolved) return;
          const { placed, total } = checkTeachProgress();
          // Update instruction text to show progress
          if (placed > 0 && placed < total) {
            instr.text(`LEARN THE LANES — ${placed} of ${total} placed`);
            overlayLayer.batchDraw();
          }
          if (placed === total) {
            teachResolved = true;
            instr.text("✓ NOW LET'S SEE IT UNDER PRESSURE");
            instr.fill('#3DB46A');
            overlayLayer.batchDraw();
            // Brief pause for kid to see the success message, then clear
            setTimeout(() => {
              clearTeachOverlay();
              markTeachDone();
              teachActive = false;
              resolve();
            }, 1400);
          }
        }
        // Wire dragend on each forward to check progress. v0.17.x perf fix
        // (per Will): we used to also listen on dragmove which fired 60x per
        // second and made drags feel laggy on phone hardware. dragend alone
        // is enough — kid still gets the "X of N placed" feedback the moment
        // they release a token in a target.
        ['lw', 'c', 'rw'].forEach(role => {
          const node = players[role];
          if (!node) return;
          node.on('dragend.teach', onProgress);
        });
        // Initial check (in case kid starts somehow already in place)
        setTimeout(onProgress, 100);
      }).then(() => {
        // Clean up teach event listeners
        ['lw', 'c', 'rw'].forEach(role => {
          const node = players[role];
          if (!node) return;
          node.off('dragend.teach');
        });
      });
    }

    // -------- INIT FLOW ---------------------------------------------------
    if (isTeachDone()) {
      // Returning visitor — go straight to TEST mode
      drawAttackerCarrying();
      drawAllForwards();
      gridLayer.batchDraw();
    } else {
      // First visit — TEACH first, THEN spawn the rush
      drawLaneDividers();   // dividers visible during teach
      drawAllForwards();    // forwards present, draggable
      gridLayer.batchDraw();
      runTeachStage().then(() => {
        // Teach complete — now bring on the rush
        drawAttackerCarrying();
        gridLayer.batchDraw();
      });
    }

    function nextRush() {
      rushIdx = (rushIdx + 1) % RUSHES.length;
      clearOverlay();
      drawAttackerCarrying();
      resetForwards();
      gridLayer.batchDraw();
      return { rushIdx, rush: currentRush(), totalRushes: RUSHES.length };
    }

    return {
      rink,
      check: evaluateWithCache,
      showMe: showCorrectPositions,
      reset: () => { cancelRushAnimation(); clearOverlay(); resetForwards(); },
      nextRush,
      currentRushInfo: () => ({ rushIdx, rush: currentRush(), totalRushes: RUSHES.length }),
      isDone: () => {
        const r = evaluate();
        return r.lw?.pass && r.c?.pass && r.rw?.pass;
      },
      // v0.13 contrast-replay API. Callers (main.js) invoke these after
      // a failed Check to drive the wrong-way -> BUT INSTEAD -> right-way
      // teaching loop.
      playWrongConsequence: playWrong,
      playRightAnswer: playRight,
      showContrastReplay: showContrastReplay,
    };
  }

  function phrasedFeedback(results) {
    const passes = ['lw', 'c', 'rw'].filter(r => results[r]?.pass);
    if (passes.length === 3) {
      return "All three lanes covered. Strong-side wing closes the puck carrier. Center high. Weak-side wing holds his lane. No seam for the cross-ice pass.";
    }
    if (passes.length === 2) {
      const missed = ['lw', 'c', 'rw'].find(r => !results[r]?.pass);
      const t = results[missed]?.target;
      return `Two of three in their lane. ${POSITION_INFO[missed].label} is off — ${t.desc}`;
    }
    if (passes.length === 1) {
      return "Only one in their lane. Don't all chase the puck — each wing has a side, the center has the middle.";
    }
    return "Lanes broken. Tap Show Me to see where Left Wing, Center, and Right Wing belong.";
  }

  return { init, phrasedFeedback, RUSHES, targetsForRush, POSITION_INFO };
})();
