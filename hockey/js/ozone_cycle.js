// O-Zone Cycle: "Time the Drop". Veterans (13U+) module, 2026-08-18.
//
// MECHANIC (timing tap, like Offside, not drag): the cycle ANIMATES. F1
// carries the puck up the strong-side wall with a D on his hip; the trailer
// swoops underneath. The kid taps DROP at the moment the trailer is in the
// pocket: behind and below F1, lane clean, D committed to F1. Too early = the
// puck goes to empty wall and their D eats it. Too late = F1 gets pinned on
// the wall and the puck is poked off the glass. Two plays are DECOYS: the
// lane is covered (a backchecker jumps it) or the trailer never comes, and
// the right read is to keep it and cut to the middle. So the kid cannot just
// tap on a rhythm; he has to read the trailer AND the lane, same as a real
// cycle.
//
// HOCKEY: cycle = F1 carries up the wall, F2 curls under him and F1 bumps
// the puck back down the wall to F2, who now has it with speed and options
// (carry up, low-to-high, net drive). The timing is the whole skill: the bump
// has to arrive after the trailer is there and before the D closes. F3 stays
// high as the release valve and the conscience.
//
// Coordinates: feet, x -42.5..42.5 (boards at ±42.5), y 0 = blue line,
// y 64 = goal line, net x ±3. We attack +y (THEIR net). Authored on the RIGHT
// wall; a session mirror flips x and swaps left/right in the copy.

window.IceQ = window.IceQ || {};

window.IceQ.OzoneCycle = (function () {
  const WALL_X = 39.5;             // F1's lane, a stick off the boards
  const MID = 42.5;

  // Keyframe helper: {t, x, y} list, linear between keys, clamped outside.
  function kf(keys, t) {
    if (t <= keys[0].t) return { x: keys[0].x, y: keys[0].y };
    for (let i = 1; i < keys.length; i++) {
      const a = keys[i - 1], b = keys[i];
      if (t <= b.t) {
        const u = (t - a.t) / (b.t - a.t || 1);
        return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
      }
    }
    const l = keys[keys.length - 1];
    return { x: l.x, y: l.y };
  }

  // F1 carries from the corner up the wall, slowing as the D closes.
  const F1_ROUTE = [
    { t: 0.00, x: 36.5, y: 67 },
    { t: 0.25, x: WALL_X, y: 58 },
    { t: 0.75, x: WALL_X, y: 40 },
    { t: 1.00, x: WALL_X, y: 35 },   // pinned here if nothing happens
  ];
  // Standard trailer: from the slot, swings down INSIDE F1 into the corner.
  const TRAILER_STD = [
    { t: 0.00, x: 22, y: 38 },
    { t: 0.30, x: 30, y: 50 },
    { t: 0.55, x: 35, y: 62 },
    { t: 0.75, x: 37, y: 66 },
    { t: 1.00, x: 38, y: 67 },
  ];
  const PLAYS = [
    {
      key: 'basic',
      label: 'F1 carries up the wall, F2 swings under',
      cue: 'F1 has it on the wall with a D on him. F2 is coming underneath. Tap DROP when F2 is in the pocket.',
      trailer: TRAILER_STD,
      trailerLabel: 'F2',
      window: [0.44, 0.70],
      noDrop: false,
    },
    {
      key: 'quick',
      label: 'quick trailer',
      cue: 'Same cycle, but F2 is already low. The pocket opens EARLY. Read it, do not wait for a rhythm.',
      trailer: [
        { t: 0.00, x: 28, y: 48 },
        { t: 0.22, x: 34, y: 60 },
        { t: 0.45, x: 37, y: 66 },
        { t: 1.00, x: 38, y: 67 },
      ],
      trailerLabel: 'F2',
      window: [0.30, 0.56],
      noDrop: false,
    },
    {
      key: 'late',
      label: 'late trailer, D closing',
      cue: 'F2 is late getting under and the D is closing fast. The pocket is SHORT. Wait for it, then do not miss it.',
      trailer: [
        { t: 0.00, x: 16, y: 32 },
        { t: 0.35, x: 26, y: 46 },
        { t: 0.62, x: 35, y: 62 },
        { t: 0.80, x: 37, y: 66 },
        { t: 1.00, x: 38, y: 67 },
      ],
      trailerLabel: 'F2',
      window: [0.58, 0.78],
      pinAt: 0.84,
      noDrop: false,
    },
    {
      key: 'covered',
      label: 'backchecker jumps the lane',
      cue: 'F2 is coming under, but watch their forward: he is backchecking right into the lane. If the lane is covered, there is NO drop. Keep it.',
      trailer: TRAILER_STD,
      trailerLabel: 'F2',
      // Their backchecking forward slides down between F1 and the trailer
      // and parks in the bump lane from t=0.40 on.
      jumper: [
        { t: 0.00, x: 14, y: 26 },
        { t: 0.40, x: 33, y: 52 },
        { t: 0.60, x: 37, y: 60 },
        { t: 1.00, x: 37, y: 61 },
      ],
      window: [0.44, 0.70],   // where a drop WOULD go, for the decoy replay
      noDrop: true,
      holdRoute: [               // what F1 does instead: cuts off the wall
        { t: 0.75, x: WALL_X, y: 40 },
        { t: 1.00, x: 24, y: 36 },
      ],
    },
    {
      key: 'd-pinch',
      label: 'your D pinches down as the trailer',
      cue: 'F2 went to the net. Your strong-side D is pinching DOWN the wall behind you to keep the cycle alive. Bump it to him when he is under you.',
      trailer: [
        { t: 0.00, x: 30, y: 9 },
        { t: 0.30, x: 39, y: 22 },
        { t: 0.60, x: 40.5, y: 48 },
        { t: 0.80, x: 40.5, y: 56 },
        { t: 1.00, x: 40.5, y: 58 },
      ],
      trailerLabel: 'D',
      trailerIsD: true,
      // F2 is at the net front in this one.
      f2Static: { x: 4, y: 56 },
      window: [0.52, 0.76],
      noDrop: false,
      // The D coming down the wall trails ABOVE F1, so the bump goes up the
      // wall, not down into the corner.
      bumpUp: true,
    },
    {
      key: 'no-trailer',
      label: 'no trailer, F2 goes to the net',
      cue: 'F2 is driving the net, not coming under. Nobody is behind you. No drop here: carry it and cut to the middle.',
      trailer: [
        { t: 0.00, x: 22, y: 38 },
        { t: 0.50, x: 8, y: 54 },
        { t: 1.00, x: 5, y: 57 },
      ],
      trailerLabel: 'F2',
      window: [0.44, 0.70],
      noDrop: true,
      holdRoute: [
        { t: 0.75, x: WALL_X, y: 40 },
        { t: 1.00, x: 24, y: 36 },
      ],
    },
  ];

  const DURATION_S = 3.3;

  function init(rinkContainer) {
    const rink = IceQ.Rink.create(rinkContainer);
    const { toCanvasX: cx0, toCanvasY, scale, overlayLayer, gridLayer } = rink;
    if (rink.labelNet) rink.labelNet('theirs');

    // Session mirror: authored on the right wall, half the time we play it
    // on the left. x flips, stick sides flip, copy swaps left/right words.
    const MIRROR = Math.random() < 0.5;
    const mx = (x) => MIRROR ? -x : x;
    const toCanvasX = (xFt) => cx0(mx(xFt));
    const flipSide = (sd) => (sd === 'L' ? 'R' : 'L');
    const swapLR = (t) => t.replace(/\b(right|left)\b/gi, (m) => {
      const up = m[0] === m[0].toUpperCase();
      const w = m.toLowerCase() === 'right' ? 'left' : 'right';
      return up ? w[0].toUpperCase() + w.slice(1) : w;
    });
    const tokenScale = Math.max(0.62, scale * 0.085);

    let playIdx = 0;
    let nodes = {};          // f1, f2, f3, d1, d2, od1, od2, goalie, jumper, puck
    let animation = null;
    let startTime = 0;
    let isPlaying = false;
    let finished = false;
    let result = null;
    let tappedAt = null;
    let loose = [];          // extra pucks / overlays to clear
    let contrastHandles = [];

    function currentPlay() { return PLAYS[playIdx]; }

    function mk(opts) {
      const g = IceQ.Player.create(Object.assign({ scale: tokenScale }, opts, {
        stickSide: MIRROR ? flipSide(opts.stickSide || 'R') : (opts.stickSide || 'R'),
      }));
      gridLayer.add(g);
      return g;
    }
    function place(g, ft) { g.position({ x: toCanvasX(ft.x), y: toCanvasY(ft.y) }); }

    function clearLoose() { loose.forEach(n => { try { n.destroy(); } catch (e) {} }); loose = []; }

    function drawScene() {
      Object.values(nodes).forEach(n => { try { n && n.destroy(); } catch (e) {} });
      nodes = {};
      clearLoose();
      const p = currentPlay();
      // Their goalie and their two D (one pressures F1, one net-front).
      nodes.goalie = mk({ color: 'opponent', kind: 'goalie' });
      place(nodes.goalie, { x: 0, y: 62.5 });
      IceQ.Player.face(nodes.goalie, 'y-');
      nodes.od1 = mk({ color: 'opponent', stickSide: 'R' });       // pressure D
      IceQ.Player.face(nodes.od1, 'y-');
      nodes.od2 = mk({ color: 'opponent', stickSide: 'L' });       // net-front D
      place(nodes.od2, { x: -4, y: 57 });
      IceQ.Player.face(nodes.od2, 'y-');
      // Our guys.
      nodes.f1 = mk({ color: 'spartan', label: 'F1', stickSide: 'R' });
      IceQ.Player.face(nodes.f1, 'y-');
      nodes.f2 = mk({ color: 'spartan', label: p.trailerLabel === 'F2' ? 'F2' : 'F2', stickSide: 'R' });
      nodes.f3 = mk({ color: 'spartan', label: 'F3', stickSide: 'L' });
      place(nodes.f3, { x: 14, y: 30 });
      nodes.d1 = mk({ color: 'spartan', label: 'D', stickSide: 'R' });   // strong-side point
      nodes.d2 = mk({ color: 'spartan', label: 'D', stickSide: 'L' });   // weak-side point
      place(nodes.d2, { x: -20, y: 9 });
      if (p.jumper) {
        nodes.jumper = mk({ color: 'opponent', stickSide: 'L' });
        IceQ.Player.face(nodes.jumper, 'y+');
      }
      // Puck, drawn last so it sits on top of every sweater.
      nodes.puck = new Konva.Circle({
        radius: Math.max(5, scale * 0.7), fill: '#0A0A0A', stroke: '#E0C68A', strokeWidth: 1.5,
      });
      gridLayer.add(nodes.puck);
      positionAt(0);
      gridLayer.batchDraw();
    }

    // Who is the trailer this play: F2 (usual) or the strong-side D.
    function trailerNode() { return currentPlay().trailerIsD ? nodes.d1 : nodes.f2; }

    // Put everybody where they are at raw time t of the play.
    function positionAt(t, opts) {
      opts = opts || {};
      const p = currentPlay();
      // F1: carry route, or the "hold and cut" route after the no-drop read.
      let f1 = kf(F1_ROUTE, t);
      if (opts.hold && p.holdRoute && t >= p.holdRoute[0].t) f1 = kf(p.holdRoute, t);
      place(nodes.f1, f1);
      // F1 faces his direction of travel.
      IceQ.Player.face(nodes.f1, (opts.hold && t >= 0.78) ? 'x-' : 'y-');
      if (MIRROR && opts.hold && t >= 0.78) IceQ.Player.face(nodes.f1, 'x+');
      // Trailer.
      const tr = kf(p.trailer, t);
      if (p.trailerIsD) {
        place(nodes.d1, tr);
        IceQ.Player.face(nodes.d1, 'y+');
        if (p.f2Static) { place(nodes.f2, p.f2Static); IceQ.Player.face(nodes.f2, 'y+'); }
      } else {
        place(nodes.f2, tr);
        IceQ.Player.face(nodes.f2, t < 0.6 ? 'y+' : 'y+');
        place(nodes.d1, { x: 28, y: 9 });
        IceQ.Player.face(nodes.d1, 'y+');
      }
      // Their pressure D rides F1's inside hip, then pins him.
      const pinAt = p.pinAt || 0.80;
      const pinU = Math.max(0, Math.min(1, (t - pinAt) / 0.12));
      place(nodes.od1, { x: f1.x - 7 + 4 * pinU, y: f1.y + 2 - 2 * pinU });
      // Backchecker (decoy play).
      if (nodes.jumper && p.jumper) place(nodes.jumper, kf(p.jumper, t));
      // Puck on F1's blade.
      if (!opts.puckFree) nodes.puck.position(IceQ.Player.puckPosFor(nodes.f1));
    }

    // ---- live play -------------------------------------------------------
    function startPlay(onComplete) {
      if (isPlaying) return;
      if (finished || result || tappedAt != null) reset();
      isPlaying = true; finished = false; result = null; tappedAt = null;
      startTime = performance.now();
      const p = currentPlay();
      animation = new Konva.Animation(() => {
        const t = (performance.now() - startTime) / (DURATION_S * 1000);
        if (t >= 1) {
          positionAt(1, { hold: p.noDrop });
          animation.stop(); isPlaying = false; finished = true;
          evaluateAtEnd().then(() => { if (onComplete) onComplete(); });
          return false;
        }
        positionAt(t, { hold: p.noDrop });
      }, gridLayer);
      animation.start();
    }

    function tapDrop() {
      if (result || !isPlaying) return null;
      const t = Math.max(0, Math.min(1, (performance.now() - startTime) / (DURATION_S * 1000)));
      tappedAt = t;
      animation.stop(); isPlaying = false; finished = true;
      const p = currentPlay();
      let kind;
      if (p.noDrop) kind = 'dropped-covered';
      else if (t < p.window[0]) kind = 'too-early';
      else if (t > p.window[1]) kind = 'too-late';
      else kind = 'good-drop';
      result = { kind, correct: kind === 'good-drop', pass: kind === 'good-drop', t, play: p.key, noDrop: p.noDrop, trailer: p.trailerLabel };
      // The consequence plays out live; the UI awaits consequencePromise.
      result.consequence = playConsequence(result);
      return result;
    }

    async function evaluateAtEnd() {
      const p = currentPlay();
      if (p.noDrop) {
        result = { kind: 'good-hold', correct: true, pass: true, t: 1, play: p.key, noDrop: true, trailer: p.trailerLabel };
      } else {
        result = { kind: 'missed', correct: false, pass: false, t: 1, play: p.key, noDrop: false, trailer: p.trailerLabel };
      }
      result.consequence = playConsequence(result);
      await result.consequence;
    }

    // ---- puck movement helpers (feet polyline, rate-limited, boards-aware) --
    const PASS_FTPS = 44, RIM_FTPS = 50, SHOT_FTPS = 62, CARRY_FTPS = 19;
    async function slidePuck(puck, ptsFt, ftps, opts) {
      opts = opts || {};
      for (let i = 1; i < ptsFt.length; i++) {
        if (!puck.getStage()) return;          // scene torn down: stop quietly
        const a = ptsFt[i - 1], b = ptsFt[i];
        const d = Math.max(0.12, Math.min(1.4, Math.hypot(b.x - a.x, b.y - a.y) / ftps));
        const last = i === ptsFt.length - 1;
        puck.to({ x: toCanvasX(b.x), y: toCanvasY(b.y), duration: d, easing: last && opts.easeLast ? Konva.Easings.EaseOut : Konva.Easings.Linear });
        await IceQ.Path.wait(d * 1000 + 15);
        if (opts.sig && opts.sig.skipped) { try { puck.stop(); } catch (e) {} return; }
      }
    }
    // Feet position of a node (un-mirrored, authored frame).
    function nodeFt(node) {
      const xCanvas = node.x(), yCanvas = node.y();
      const xFt = (xCanvas - rink.width / 2) / scale;
      return { x: MIRROR ? -xFt : xFt, y: yCanvas / scale };
    }
    function bladeFt(node) {
      const p = IceQ.Player.puckPosFor(node);
      const xFt = (p.x - rink.width / 2) / scale;
      return { x: MIRROR ? -xFt : xFt, y: p.y / scale };
    }
    // Move a skater along feet points with the puck on his blade.
    async function carry(node, ptsFt, ftps, sig) {
      for (let i = 1; i < ptsFt.length; i++) {
        if (!node.getStage()) return;
        const a = ptsFt[i - 1], b = ptsFt[i];
        const d = Math.max(0.15, Math.min(1.4, Math.hypot(b.x - a.x, b.y - a.y) / ftps));
        const t0 = performance.now();
        let done = false;
        const anim = new Konva.Animation(() => {
          const u = Math.min(1, (performance.now() - t0) / (d * 1000));
          place(node, { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
          nodes.puck.position(IceQ.Player.puckPosFor(node));
          if (u >= 1) { done = true; anim.stop(); return false; }
        }, gridLayer);
        anim.start();
        while (!done) { await IceQ.Path.wait(30); if (sig && sig.skipped) { anim.stop(); return; } }
      }
    }

    // Move a skater along feet points WITHOUT the puck.
    async function skate(node, ptsFt, ftps, sig) {
      for (let i = 1; i < ptsFt.length; i++) {
        if (!node.getStage()) return;
        const a = ptsFt[i - 1], b = ptsFt[i];
        const d = Math.max(0.15, Math.min(1.4, Math.hypot(b.x - a.x, b.y - a.y) / ftps));
        node.to({ x: toCanvasX(b.x), y: toCanvasY(b.y), duration: d, easing: Konva.Easings.Linear });
        await IceQ.Path.wait(d * 1000 + 15);
        if (sig && sig.skipped) { try { node.stop(); } catch (e) {} return; }
      }
    }
    // Goalie tracks the puck side before a shot, so a far-side finish beats
    // him instead of passing through him.
    function goalieTo(xFt, sec) {
      try { nodes.goalie.to({ x: toCanvasX(xFt), duration: sec || 0.35, easing: Konva.Easings.EaseOut }); } catch (e) {}
    }

    // ---- consequences --------------------------------------------------
    // Plays out what the kid's decision caused. Returns a promise.
    function playConsequence(res, sig) {
      sig = sig || { skipped: false };
      const p = currentPlay();
      const puck = nodes.puck;
      return (async function () {
        const f1 = nodes.f1;
        const tr = trailerNode();
        if (res.kind === 'good-drop') {
          // Bump down (or up) the wall to the trailer's blade. The puck hugs
          // the boards: from F1's blade to the wall line, then along it.
          const from = bladeFt(f1);
          const to = bladeFt(tr);
          const wallX = WALL_X + 1.5;
          await slidePuck(puck, [from, { x: wallX, y: from.y + (p.bumpUp ? -2 : 3) }, { x: wallX, y: to.y }, to], PASS_FTPS, { sig });
          if (sig.skipped) return;
          // Trailer takes it and goes: F2 carries up and hits F3 in the slot
          // for a one-timer; the D (pinch play) walks it up and shoots.
          goalieTo(3.0, 0.6);   // goalie squares to the strong side
          if (p.trailerIsD) {
            await carry(tr, [to, { x: 36, y: 44 }], CARRY_FTPS, sig);
            if (sig.skipped) return;
            const shotFrom = bladeFt(tr);
            await slidePuck(puck, [shotFrom, { x: -2.3, y: 65.5 }], SHOT_FTPS, { sig, easeLast: true });
          } else {
            await carry(tr, [to, { x: 34, y: 52 }], CARRY_FTPS, sig);
            if (sig.skipped) return;
            const passFrom = bladeFt(tr);
            const f3 = bladeFt(nodes.f3);
            await slidePuck(puck, [passFrom, f3], PASS_FTPS, { sig });
            if (sig.skipped) return;
            await IceQ.Path.wait(90);
            // One-timer far side, past a goalie who is still on the strong post.
            await slidePuck(puck, [f3, { x: -2.3, y: 65.5 }], SHOT_FTPS, { sig, easeLast: true });
          }
          if (sig.skipped) return;
          try { IceQ.Audio && IceQ.Audio.goalHorn && IceQ.Audio.goalHorn(); } catch (e) {}
          await IceQ.Path.animateGoalConsequence(rink, { kind: 'saved', message: 'CLEAN BUMP. CYCLE ROLLS, GOAL.', duration: 1.1 });
          return;
        }
        if (res.kind === 'good-hold') {
          // F1 already cut to the middle on the hold route; he shoots.
          const from = bladeFt(f1);
          await slidePuck(puck, [from, { x: 0.8, y: 60.3 }], SHOT_FTPS, { sig, easeLast: true });   // into the goalie's pad: a shot, not a gift
          if (sig.skipped) return;
          await IceQ.Path.animateGoalConsequence(rink, { kind: 'saved', message: 'GOOD READ. KEPT IT, CUT TO THE MIDDLE, SHOT ON NET.', duration: 1.1 });
          return;
        }
        if (res.kind === 'too-early') {
          // Puck goes down the wall to nobody; their pressure D peels and eats it.
          const from = bladeFt(f1);
          const wallX = WALL_X + 1.5;
          const dead = { x: wallX, y: Math.min(70, from.y + 14) };
          await slidePuck(puck, [from, { x: wallX, y: from.y + 3 }, dead], PASS_FTPS, { sig, easeLast: true });
          if (sig.skipped) return;
          await skate(nodes.od1, [nodeFt(nodes.od1), { x: dead.x - 2.5, y: dead.y - 1 }], CARRY_FTPS + 4, sig);
          if (sig.skipped) return;
          const g = nodeFt(nodes.od1);
          await carry(nodes.od1, [g, { x: g.x - 6, y: g.y - 16 }], CARRY_FTPS + 4, sig);
          if (sig.skipped) return;
          await IceQ.Path.animateGoalConsequence(rink, { kind: 'goal', message: 'NOBODY THERE YET. TURNOVER.', duration: 1.1 });
          return;
        }
        if (res.kind === 'too-late' || res.kind === 'missed') {
          // D pins F1 on the wall, pokes it loose, off the glass and out.
          positionAt(1);
          const from = bladeFt(f1);
          const wallX = WALL_X + 2;
          await IceQ.Path.wait(120);
          await slidePuck(puck, [from, { x: wallX, y: from.y - 3 }, { x: wallX, y: 2 }, { x: wallX - 1, y: -2 }], RIM_FTPS, { sig });
          if (sig.skipped) return;
          await IceQ.Path.animateGoalConsequence(rink, { kind: 'goal', message: res.kind === 'missed' ? 'PINNED ON THE WALL. YOU NEVER DROPPED IT.' : 'TOO LATE, PINNED. OFF THE GLASS AND OUT.', duration: 1.1 });
          return;
        }
        if (res.kind === 'dropped-covered') {
          // The bump goes straight onto the backchecker's (or nobody's) stick
          // and they go the other way.
          const from = bladeFt(f1);
          const wallX = WALL_X + 1.5;
          const thief = nodes.jumper || nodes.od1;
          const thiefFt = nodeFt(thief);
          const to = nodes.jumper ? bladeFt(thief) : { x: wallX, y: from.y + 12 };
          await slidePuck(puck, [from, { x: wallX, y: from.y + 3 }, to], PASS_FTPS, { sig, easeLast: true });
          if (sig.skipped) return;
          if (!nodes.jumper) { await skate(thief, [thiefFt, { x: to.x - 2.5, y: to.y - 1 }], CARRY_FTPS + 4, sig); if (sig.skipped) return; }
          const grab = nodeFt(thief);
          await carry(thief, [grab, { x: grab.x - 8, y: Math.max(6, grab.y - 30) }], CARRY_FTPS + 5, sig);
          if (sig.skipped) return;
          await IceQ.Path.animateGoalConsequence(rink, { kind: 'goal', message: nodes.jumper ? 'DROPPED IT TO THEIR GUY. GONE THE OTHER WAY.' : 'DROPPED IT TO NOBODY. GONE THE OTHER WAY.', duration: 1.1 });
          return;
        }
      })();
    }

    // ---- contrast: BUT INSTEAD -> the right moment, then the good outcome --
    function showContrastReplay(res, skipSignal) {
      const sig = skipSignal || { skipped: false };
      const p = currentPlay();
      return (async function () {
        if (!res || res.correct) return { completed: true };
        await raceSkip(IceQ.Path.flashLabel(rink, { text: 'BUT INSTEAD…', color: '#E0C68A', fontSize: 30, holdMs: 420, fadeMs: 160, skipSignal: sig }), sig, 2500);
        if (sig.skipped) return { skipped: true };
        // Replay to the right moment and freeze it.
        overlayLayer.destroyChildren();
        positionAt(0, { hold: p.noDrop });
        gridLayer.batchDraw();
        const tStop = p.noDrop ? 0.60 : (p.window[0] + p.window[1]) / 2;
        const t0 = performance.now();
        let done = false;
        const anim = new Konva.Animation(() => {
          const t = Math.min(tStop, (performance.now() - t0) / (DURATION_S * 1000));
          positionAt(t, { hold: p.noDrop });
          if (t >= tStop) { done = true; anim.stop(); return false; }
        }, gridLayer);
        anim.start();
        contrastHandles.push({ stop: () => { try { anim.stop(); } catch (e) {} done = true; } });
        while (!done) { await IceQ.Path.wait(40); if (sig.skipped) { anim.stop(); return { skipped: true }; } }
        // Freeze-frame label at the moment.
        const lbl = new Konva.Text({
          x: 0, y: rink.height * 0.30, width: rink.width, align: 'center',
          text: p.noDrop ? 'LANE COVERED. KEEP IT.' : 'DROP HERE', fontSize: Math.max(22, rink.width * 0.06),
          fontStyle: '900', fill: p.noDrop ? '#E0C68A' : '#3DB46A', stroke: '#1A1F2E', strokeWidth: 2, listening: false,
        });
        overlayLayer.add(lbl); overlayLayer.batchDraw(); loose.push(lbl);
        // Pocket ring around the trailer (or the covered lane).
        if (!p.noDrop) {
          const tr = trailerNode();
          const ring = new Konva.Circle({ x: tr.x(), y: tr.y(), radius: 6 * scale, stroke: '#3DB46A', strokeWidth: 3, dash: [6, 4], listening: false });
          overlayLayer.add(ring); loose.push(ring);
        }
        overlayLayer.batchDraw();
        await raceSkip(IceQ.Path.wait(900), sig, 1500);
        if (sig.skipped) return { skipped: true };
        try { lbl.destroy(); } catch (e) {}
        // Then the good outcome from that moment. For a no-drop play, run the
        // hold route to the end first.
        if (p.noDrop) {
          const t1 = performance.now(); let d2 = false;
          const anim2 = new Konva.Animation(() => {
            const t = Math.min(1, tStop + (performance.now() - t1) / (DURATION_S * 1000));
            positionAt(t, { hold: true });
            if (t >= 1) { d2 = true; anim2.stop(); return false; }
          }, gridLayer);
          anim2.start();
          while (!d2) { await IceQ.Path.wait(40); if (sig.skipped) { anim2.stop(); return { skipped: true }; } }
          await raceSkip(playConsequence({ kind: 'good-hold' }, sig), sig, 7000);
        } else {
          await raceSkip(playConsequence({ kind: 'good-drop' }, sig), sig, 9000);
        }
        return { completed: !sig.skipped, skipped: sig.skipped };
      })();
    }

    function raceSkip(promise, sig, maxMs) {
      return new Promise((resolve) => {
        let settled = false;
        const finish = () => { if (settled) return; settled = true; clearInterval(poll); clearTimeout(cap); resolve(); };
        const poll = setInterval(() => { if (sig && sig.skipped) finish(); }, 80);
        const cap = setTimeout(finish, maxMs);
        Promise.resolve(promise).then(finish, finish);
      });
    }

    function stopContrast() {
      contrastHandles.forEach(h => { try { h.stop(); } catch (e) {} });
      contrastHandles = [];
    }

    // Show Me: run the play to the pocket and freeze with the ring.
    function showMe() {
      return showContrastReplay({ correct: false, kind: 'demo' }, { skipped: false });
    }

    function reset() {
      if (animation) { try { animation.stop(); } catch (e) {} animation = null; }
      stopContrast();
      isPlaying = false; finished = false; result = null; tappedAt = null;
      overlayLayer.destroyChildren(); overlayLayer.batchDraw();
      drawScene();
    }
    function nextPlay() {
      playIdx = (playIdx + 1) % PLAYS.length;
      reset();
      return info();
    }
    function info() {
      return { rushIdx: playIdx, rush: currentPlay(), totalRushes: PLAYS.length, cue: swapLR(currentPlay().cue) };
    }

    drawScene();

    return {
      rink,
      startPlay, tapDrop,
      result: () => result,
      check: () => result,
      showContrastReplay, stopContrast,
      showMe, reset,
      nextRush: nextPlay,
      goTo: (i) => { playIdx = ((i % PLAYS.length) + PLAYS.length) % PLAYS.length; reset(); return info(); },
      currentRushInfo: info,
      cue: () => swapLR(currentPlay().cue),
      isDone: () => !!(result && result.correct),
    };
  }

  function phrasedFeedback(res) {
    if (!res) return 'Hit Play, watch the trailer, tap DROP in the pocket.';
    const who = res.trailer === 'D' ? 'your D' : 'F2';
    switch (res.kind) {
      case 'good-drop':
        return res.trailer === 'D'
          ? 'That is the pocket. Your D came down the wall behind you while their D was on you, and the bump got there clean. Cycle stays alive, and he has a lane.'
          : 'That is the pocket. F2 was under you with speed, their D was on you, and the bump got there clean. That is how a cycle keeps the puck.';
      case 'good-hold':
        return res.play === 'covered'
          ? 'Right read. The lane was covered, so there was no drop. You kept it and took it to the middle.'
          : 'Right read. Nobody was under you, so there was nothing to drop to. You kept it and took it to the middle.';
      case 'too-early':
        return `Too early. ${who} was not in the pocket yet, so the bump went to empty wall and their D was first to it. Let the trailer get UNDER you before you give it up.`;
      case 'too-late':
        return 'Too late. The D sealed you on the wall before you bumped it, and the puck got poked off the glass. The pocket closes when the D arrives; give it up before that.';
      case 'missed':
        return `You never dropped it. ${who} was right there under you and you carried it into the D instead. When the trailer is in the pocket and the D is on you, the bump is the play.`;
      case 'dropped-covered':
        return res.play === 'no-trailer'
          ? 'Nobody was under you. A bump to empty ice is a turnover. When there is no trailer, keep it and find the middle.'
          : 'That lane was covered: their backchecker was sitting right where the bump goes. Read the LANE, not just the trailer. Covered means keep it.';
      default:
        return 'Hit Play and read the cycle.';
    }
  }

  return { init, phrasedFeedback, PLAYS };
})();
