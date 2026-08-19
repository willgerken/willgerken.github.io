// Scenario: Breakout Reads (from the 10U team playbook — "Defensive Breakouts").
//
// DIFFERENT mechanic from the `breakout` scenario. Breakout = "place the three
// support forwards." Breakout READS = "the D has the puck; READ the forecheck
// and pick which of our FOUR named breakouts to run." A decision game, in the
// team's own vocabulary:
//   D-WHEEL       — soft/late forecheck: you have time, skate (wheel) it out.
//   D-TO-D        — F1 is on YOU but your partner D is open: pass it across.
//   REVERSE       — forecheck cheats hard to your strong side expecting the
//                   wheel: fake up, reverse the puck behind the net the other way.
//   WEAK-SIDE RIM — they jam your strong-side wall: rim it hard around the
//                   boards to the open weak-side wing.
//
// The kid reads the pressure picture + a one-line cue, then TAPS a breakout.
// Correct = the play reveals (gold path) + credit. Wrong = why-it-fails coaching
// + retry. Pure read — the IQ is mapping pressure → outlet. Also the natural
// "name-the-breakout" mini-game seed.
//
// API parity with the drag scenarios where it helps main.js (currentRushInfo /
// nextRush), plus a choice-specific surface (choose, cue).

window.IceQ = window.IceQ || {};

window.IceQ.BreakoutReads = (function () {
  const BREAKOUTS = {
    'd-wheel': { label: 'D-Wheel' },
    'd-to-d':  { label: 'D-to-D' },
    'reverse': { label: 'Reverse' },
    'weak-rim':{ label: 'Weak-Side Rim' },
  };
  const ORDER = ['d-wheel', 'd-to-d', 'reverse', 'weak-rim'];

  // Each read: the pressure picture + the correct call + the reveal path.
  //   d/d2     — our retrieving D (with puck) and partner D (feet coords)
  //   outlets  — context gold forwards to draw {x,y,label}
  //   pressure — red forecheckers {x,y}
  //   answer   — correct breakout key
  //   path     — feet polyline for the gold reveal arrow (starts at the puck)
  //   cue      — one-line SITUATION (not the answer)
  const READS = [
    {
      key: 'soft',
      answer: 'd-wheel',
      label: 'soft forecheck — you have time',
      d:  { x: 6, y: 69 }, d2: { x: -16, y: 60 },
      // Breakout wingers live ON THE WALL at the hash marks (boards x=±42.5).
      // They were 18-20 ft off it, sitting inside the dots, which is the exact
      // habit a coach spends September fixing.
      outlets: [ { x: 37, y: 24, label: 'RW' }, { x: -37, y: 30, label: 'LW' } ],
      pressure: [ { x: 4, y: 30 } ],
      // "Up the boards" means up the boards: out of the corner, onto the
      // wall, carry it out. The RW has moved up to the top of the circle so
      // the D is not skating into him. (QC 2026-08-18: the route used to run
      // up the dot line through the middle of the circle.)
      path: [ [6, 69], [22, 70], [36, 60], [38, 46], [36, 34] ],
      carryLegs: 4,        // D-Wheel: the D skates the whole route with the puck
      cue: "Read the pressure: one forechecker, still high. Space behind the net.",
      teach: "No pressure yet, so you've got time — skate it out yourself, up the boards, and start the rush with speed.",
    },
    {
      key: 'on-you',
      answer: 'd-to-d',
      label: 'F1 on you, partner open',
      // The original path ran [24,61] straight to [-22,60] — a 46 ft pass whose
      // line passes 3.5 ft from the goal, i.e. THROUGH our own crease. That is
      // the banned pass in every room in hockey and it was the gold "correct"
      // answer. It only looked clean because no forechecker was drawn in the
      // lane. D-to-D now goes BELOW the goal line, behind the net, in two short
      // legs (33 ft total) that a 10U D can actually make.
      d:  { x: 26, y: 60 }, d2: { x: -12, y: 64 },
      outlets: [ { x: 37, y: 46, label: 'RW' } ],
      // F1 right on the D, F2 taking the wall winger away, D2 alone across.
      pressure: [ { x: 23, y: 54 }, { x: 35, y: 50 } ],
      // Behind the net means BEHIND it: the cage sits x=-3..3, y=64..67.5, so
      // the pass crosses the goal-line axis at y~71, two feet clear of the back
      // bar. (An earlier version clipped the cage at y~66.)
      path: [ [26, 61], [16, 70], [0, 71.5], [-12, 66] ],
      carryLegs: 1,        // D takes one stride below the goal line, then moves it
      cue: "Read the pressure: where is F1, and who is covered?",
      teach: "F1 is right on you, but your partner D is wide open — move it across to him. The simplest play beats the pressure.",
    },
    {
      key: 'overcommit',
      answer: 'reverse',
      label: 'forecheck cheats your strong side',
      d:  { x: 20, y: 60 }, d2: { x: -20, y: 60 },
      outlets: [ { x: 37, y: 44, label: 'RW' }, { x: -37, y: 44, label: 'LW' } ],
      // F1 angles in from the WALL side above the D, F2 shades to the strong
      // wall: the wheel lane is dead, the back side is the out. (Before, both
      // forecheckers were inside the D and the picture said "wheel".)
      pressure: [ { x: 30, y: 52 }, { x: 36, y: 40 } ],
      // A reverse has a FAKE: a stride up the wall to sell the wheel, then cut
      // back below the goal line and reverse it to the partner.
      path: [ [20, 60], [26, 54], [16, 65], [4, 71], [-14, 66], [-18, 58] ],
      carryLegs: 3,        // fake up, cut back, carry behind the net, then reverse it
      cue: "Read the pressure: which way are they leaning?",
      teach: "They've cheated hard to your strong side expecting the wheel — so fake up, then reverse it behind the net the OTHER way.",
    },
    {
      key: 'jammed',
      answer: 'weak-rim',
      label: 'strong-side wall jammed',
      d:  { x: 24, y: 60 }, d2: { x: -18, y: 58 },
      // A rim RIDES THE WALL — that's the entire mechanic: the puck stays glued
      // to the boards where no forechecker can pick it, and the winger waits on
      // the wall to trap it. The old path ran 16.5 ft off the boards at its
      // widest with the LW standing 16.5 ft off too, which isn't a rim, it's a
      // slow cross-ice pass through the middle: exactly what a rim exists to
      // avoid. Boards are at x=±42.5.
      // "Jammed" means jammed: RW on his wall with a red on him, F1 on the D,
      // a red on D2. Only the weak-side wall is open.
      outlets: [ { x: 37, y: 44, label: 'RW' }, { x: -37, y: 44, label: 'LW' } ],
      pressure: [ { x: 21, y: 55 }, { x: 35, y: 48 }, { x: -13, y: 55 } ],
      // The rim rides the end boards (y~74) and the corner (the drawn corner
      // radius is small, so the waypoint sits at the wall), then the wall.
      path: [ [24, 61], [14, 73], [0, 74], [-18, 73.5], [-38, 70], [-40.5, 56], [-38, 46] ],
      carryLegs: 0,        // a rim: puck leaves the stick and rides the wall
      cue: "Read the pressure: which wall is open?",
      teach: "They've jammed your strong-side wall — don't force it. Rim it hard around the boards to the open weak-side wing.",
    },
  ];

  function init(rinkContainer) {
    const rink = IceQ.Rink.create(rinkContainer);
    if (rink.labelNet) rink.labelNet('ours');   // zone cue: whose net is this
    const { toCanvasX: cx0, toCanvasY, scale, overlayLayer, gridLayer } = rink;

    // Variety without changing the lesson (Will 2026-08-18: "not repetitive,
    // vary positions, keep the hockey-IQ logic"): each visit is either the
    // authored side or its mirror image. Every read is left/right symmetric
    // in meaning (strong side / weak side), so flipping x and swapping the
    // RW/LW labels keeps the read identical while the picture changes.
    const MIRROR = Math.random() < 0.5;
    const toCanvasX = (ftX) => cx0(MIRROR ? -ftX : ftX);
    const sideLabel = (l) => MIRROR ? (l === 'RW' ? 'LW' : l === 'LW' ? 'RW' : l) : l;

    let readIdx = 0;
    let sceneNodes = [];
    let dNode = null;        // our puck-carrying D (drives the carry legs)
    let puckNode = null;     // the static puck on his blade
    let goalieNode = null;
    // Read ORDER is shuffled per session; the demo walks READS in authored
    // order (goToRead(i) with i from the demo loop indexes the shuffled
    // sequence too, which is fine: the demo shows all four either way).
    const SEQ = (() => { const a = READS.map((_, i) => i); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; })();
    function currentRead() { return READS[SEQ[readIdx]]; }

    function clearScene() {
      sceneNodes.forEach(n => { try { n.destroy(); } catch (e) {} });
      sceneNodes = [];
    }
    function clearOverlay() {
      overlayLayer.destroyChildren();
      overlayLayer.batchDraw();
    }

    // color 'spartan' = us, breaking OUT, so we face up-ice ('y-'); the
    // forecheckers attack our net and keep the authored +y facing. Stick side
    // is chosen so the blade points to the middle of the ice, which is where
    // a breakout D actually holds the puck (away from the wall/forechecker).
    function addPlayer(o, color, label, withPuck) {
      const ours = color === 'spartan';
      const xEff = MIRROR ? -o.x : o.x;
      // Facing y-, the sprite is flipped, so the side that points to the middle
      // swaps relative to the authored (+y) orientation.
      // QC 2026-08-18: this was 'L'/'R' the other way round, which put every
      // one of our blades toward the BOARDS after the 180 deg face('y-').
      const stickSide = ours ? (xEff >= 0 ? 'R' : 'L') : (xEff >= 0 ? 'R' : 'L');
      const node = IceQ.Player.create({
        x: toCanvasX(o.x), y: toCanvasY(o.y),
        scale: Math.max(0.55, scale * (label ? 0.08 : 0.07)),
        color, label: label || '',
        stickSide,
      });
      if (ours) IceQ.Player.face(node, 'y-');
      gridLayer.add(node);
      sceneNodes.push(node);
      if (withPuck) {
        dNode = node;
        const pp = IceQ.Player.puckPosFor(node);
        puckNode = new Konva.Circle({
          x: pp.x, y: pp.y,
          radius: Math.max(5, scale * 0.7),
          fill: '#0A0A0A', stroke: '#E0C68A', strokeWidth: 1.5,
          listening: false,
        });
        gridLayer.add(puckNode);
        sceneNodes.push(puckNode);
      }
      return node;
    }

    function drawScene() {
      const r = currentRead();
      // OUR goalie in OUR net: the zone cue (this is our end, we are getting
      // out) and the reason nobody rims a puck through the crease.
      goalieNode = IceQ.Player.create({
        x: toCanvasX(0), y: toCanvasY(62.5),
        scale: Math.max(0.55, scale * 0.07), color: 'spartan', kind: 'goalie',
      });
      IceQ.Player.face(goalieNode, 'y-');
      gridLayer.add(goalieNode); sceneNodes.push(goalieNode);
      // Our D with the puck + partner D
      addPlayer(r.d, 'spartan', 'D', true);
      addPlayer(r.d2, 'spartan', 'D2', false);
      // Open outlet forwards (context)
      (r.outlets || []).forEach(o => addPlayer(o, 'spartan', sideLabel(o.label), false));
      // Forecheck pressure (red) + a pressure arrow from the lead forechecker
      (r.pressure || []).forEach((p, i) => {
        addPlayer(p, 'opponent', '', false);
        if (i === 0) {
          const arr = new Konva.Arrow({
            points: [toCanvasX(p.x), toCanvasY(p.y), toCanvasX(r.d.x), toCanvasY(r.d.y)],
            stroke: 'rgba(206,32,46,0.55)', fill: 'rgba(206,32,46,0.55)',
            strokeWidth: 2, dash: [5, 4], pointerLength: 8, pointerWidth: 8,
            listening: false,
          });
          gridLayer.add(arr);
          sceneNodes.push(arr);
        }
      });
      gridLayer.batchDraw();
    }

    // Reveal the correct breakout as a gold multi-segment arrow + label.
    function showCorrect() {
      clearOverlay();
      const r = currentRead();
      const pts = [];
      r.path.forEach(([x, y], i) => {
        // The route starts where the puck IS (on the D's blade), not at the
        // D's centre, so the arrow leaves the stick instead of the sweater.
        if (i === 0 && puckNode) { pts.push(puckNode.x(), puckNode.y()); return; }
        pts.push(toCanvasX(x), toCanvasY(y));
      });
      const arrow = new Konva.Arrow({
        points: pts,
        stroke: '#E0C68A', fill: '#E0C68A',
        strokeWidth: 3, pointerLength: 11, pointerWidth: 11,
        lineJoin: 'round', tension: 0.3,
        opacity: 0,
        listening: false,
      });
      overlayLayer.add(arrow);
      arrow.to({ opacity: 0.95, duration: 0.35 });
      // Label at the END of the path (receiver side), lifted off the ice a
      // little: the midpoint of three of the four routes is behind the cage,
      // right on top of the OUR NET tag.
      const endPt = r.path[r.path.length - 1];
      const lbl = new Konva.Text({
        x: toCanvasX(endPt[0]) - 60, y: toCanvasY(Math.min(endPt[1], 60)) - 34,
        width: 120, align: 'center',
        text: BREAKOUTS[r.answer].label.toUpperCase(),
        fontSize: 13, fontStyle: '900', fill: '#E0C68A',
        stroke: '#1A1F2E', strokeWidth: 0.6,
        opacity: 0, listening: false,
      });
      overlayLayer.add(lbl);
      lbl.to({ opacity: 1, duration: 0.35 });
      overlayLayer.batchDraw();
    }

    // Send the scene to a specific read (for the Watch & Learn demo to step
    // through them in order). Mirrors nextRead but jumps to an index.
    function goToRead(i) {
      readIdx = ((i % READS.length) + READS.length) % READS.length;
      clearScene();
      clearOverlay();
      drawScene();
      return { rushIdx: readIdx, rush: currentRead(), totalRushes: READS.length };
    }

    // Animate a puck travelling the breakout route, segment by segment. Timing
    // is driven by IceQ.Path.wait (setTimeout) — NOT tween onFinish — so the
    // demo loop never stalls even if rAF is throttled; the .to() tweens drive
    // the visual on a real device. Fire-and-forget, self-cleaning.
    // Speeds in ft/s (same constants O-Zone Entry settled on): a D carrying
    // the puck, a pass, a rim off the wall. Per-leg time is distance / speed,
    // clamped, so a 10 ft leg snaps and a 40 ft rim carries.
    const CARRY_FTPS = 18, PASS_FTPS = 42, RIM_FTPS = 38;
    const LEG_MIN = 0.18, LEG_MAX = 1.3;
    const legSec = (aFt, bFt, ftps) => Math.max(LEG_MIN, Math.min(LEG_MAX, Math.hypot(bFt[0] - aFt[0], bFt[1] - aFt[1]) / ftps));

    // Play the route: on the CARRY legs the D sprite skates the path and the
    // puck rides his blade (Player.puckPosFor every frame); after that the
    // puck leaves the stick and travels alone (pass or rim), only the last
    // leg easing out (a rim does not stop dead at every vertex). The static
    // puck is the one that moves, so there is never a second puck on the ice.
    async function travelPuck(featPts, carryLegs, kind) {
      if (!featPts || featPts.length < 2 || typeof Konva === 'undefined') return;
      const d = dNode, puck = puckNode;
      if (!d || !puck) return;
      const dStart = d.position();
      const canvas = featPts.map(([x, y]) => ({ x: toCanvasX(x), y: toCanvasY(y) }));
      // Where the D's blade is relative to his centre, so a carry keeps the
      // puck ON the blade and the route stays the puck's route.
      const off = { x: IceQ.Player.puckPosFor(d).x - dStart.x, y: IceQ.Player.puckPosFor(d).y - dStart.y };
      const nCarry = Math.max(0, Math.min(carryLegs | 0, featPts.length - 1));
      // Carry legs: move D so his blade follows the path.
      for (let i = 1; i <= nCarry; i++) {
        const sec = legSec(featPts[i - 1], featPts[i], CARRY_FTPS);
        await tweenPair(d, { x: canvas[i].x - off.x, y: canvas[i].y - off.y }, puck, canvas[i], sec, i === nCarry ? 'out' : 'linear');
      }
      // Pass / rim legs: puck alone.
      for (let i = nCarry + 1; i < featPts.length; i++) {
        const sec = legSec(featPts[i - 1], featPts[i], kind === 'rim' ? RIM_FTPS : PASS_FTPS);
        await tweenPair(null, null, puck, canvas[i], sec, i === featPts.length - 1 ? 'out' : 'linear');
      }
      await IceQ.Path.wait(350);
      // Back to the start picture (D and puck), so the quiz starts clean.
      if (!d.isDestroyed() && !puck.isDestroyed()) {
        d.position(dStart); puck.position(IceQ.Player.puckPosFor(d)); gridLayer.batchDraw();
      }
    }
    // Tween a skater and/or the puck to a point; resolves on a timer (not a
    // tween callback) so a throttled tab cannot stall the demo loop.
    function tweenPair(skater, skaterTo, puck, puckTo, sec, ease) {
      const easing = ease === 'out' ? Konva.Easings.EaseOut : Konva.Easings.Linear;
      // A scene change (Next / Reset / route away) mid-play destroys these
      // nodes; tweening a detached node makes Konva log an error, so check.
      const alive = (n) => n && !n.isDestroyed() && n.getLayer();
      if (skater && skaterTo && alive(skater)) skater.to({ x: skaterTo.x, y: skaterTo.y, duration: sec, easing });
      if (puck && puckTo && alive(puck)) puck.to({ x: puckTo.x, y: puckTo.y, duration: sec, easing });
      return IceQ.Path.wait(Math.round(sec * 1000) + 20);
    }

    // Demo reveal: draw the gold route arrow + label, then run the play.
    // Returns a promise that resolves when the puck finishes.
    function playReveal() {
      showCorrect();
      const r = currentRead();
      return travelPuck(r.path, r.carryLegs, r.answer === 'weak-rim' ? 'rim' : 'pass');
    }

    function choose(key) {
      const r = currentRead();
      return {
        correct: key === r.answer,
        chosen: key,
        chosenLabel: (BREAKOUTS[key] || {}).label || key,
        answer: r.answer,
        answerLabel: BREAKOUTS[r.answer].label,
        readKey: r.key,
      };
    }

    function nextRead() {
      readIdx = (readIdx + 1) % READS.length;
      clearScene();
      clearOverlay();
      drawScene();
      return { rushIdx: readIdx, rush: currentRead(), totalRushes: READS.length };
    }

    drawScene();

    return {
      rink,
      choose,
      showMe: showCorrect,
      reset: () => { clearOverlay(); },
      nextRush: nextRead,
      goToRead,
      playReveal,
      currentRushInfo: () => ({ rushIdx: readIdx, rush: currentRead(), totalRushes: READS.length }),
      cue: () => currentRead().cue,
      isDone: () => false,   // completion tracked in wiring (all reads correct)
    };
  }

  function phrasedFeedback(res) {
    if (res.correct) {
      switch (res.answer) {
        case 'd-wheel':
          return "D-Wheel — right call. No pressure, so you skate it out yourself and start the play with speed.";
        case 'd-to-d':
          return "D-to-D — right call. F1 committed to you, so the simplest play beats the pressure: move it to your open partner.";
        case 'reverse':
          return "Reverse — right call. They overloaded your strong side, so you go back the OTHER way behind the net. Beat the pressure with the reverse.";
        case 'weak-rim':
          return "Weak-Side Rim — right call. Strong side's jammed, so rim it hard around to the open weak-side wing. Simple and safe.";
        default:
          return "Right call.";
      }
    }
    // Wrong — coach the read without just handing over the answer.
    switch (res.readKey) {
      case 'soft':
        return `Not ${res.chosenLabel} here. Look again — there's no forechecker on you yet. When you have time and space, what's the simplest play?`;
      case 'on-you':
        return `Not ${res.chosenLabel} here. F1 is right on top of you — forcing a play under pressure is how turnovers happen. Where's your partner?`;
      case 'overcommit':
        return `Not ${res.chosenLabel} here. They're leaning hard to your strong side. If you go where they expect, you skate into the pressure. How do you go the other way?`;
      case 'jammed':
        return `Not ${res.chosenLabel} here. Your strong-side wall is packed. Forcing it there gets stripped. Where's the open ice?`;
      default:
        return `Not quite. Read where the pressure is, then pick the breakout that avoids it.`;
    }
  }

  return { init, phrasedFeedback, READS, BREAKOUTS, ORDER };
})();
