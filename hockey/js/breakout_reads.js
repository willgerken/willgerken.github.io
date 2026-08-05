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
      outlets: [ { x: 37, y: 42, label: 'RW' }, { x: -37, y: 28, label: 'LW' } ],
      pressure: [ { x: 4, y: 30 } ],
      path: [ [6, 69], [16, 60], [22, 46], [22, 34] ],
      cue: "No real pressure yet — you've got time and space behind the net.",
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
      pressure: [ { x: 22, y: 53 }, { x: 8, y: 45 } ],
      path: [ [26, 61], [10, 68], [-12, 65] ],
      cue: "F1 is all over you. Your partner D is wide open across the ice.",
      teach: "F1 is right on you, but your partner D is wide open — move it across to him. The simplest play beats the pressure.",
    },
    {
      key: 'overcommit',
      answer: 'reverse',
      label: 'forecheck cheats your strong side',
      d:  { x: 20, y: 60 }, d2: { x: -20, y: 60 },
      outlets: [ { x: 37, y: 44, label: 'RW' }, { x: -37, y: 44, label: 'LW' } ],
      pressure: [ { x: 13, y: 55 }, { x: 6, y: 47 } ],
      path: [ [20, 60], [12, 66], [0, 70], [-14, 64], [-18, 58] ],
      cue: "They're leaning hard to your strong side, expecting you to wheel up the boards.",
      teach: "They've cheated hard to your strong side expecting the wheel — so fake up, then reverse it behind the net the OTHER way.",
    },
    {
      key: 'jammed',
      answer: 'weak-rim',
      label: 'strong-side wall jammed',
      d:  { x: 24, y: 60 }, d2: { x: -20, y: 60 },
      // A rim RIDES THE WALL — that's the entire mechanic: the puck stays glued
      // to the boards where no forechecker can pick it, and the winger waits on
      // the wall to trap it. The old path ran 16.5 ft off the boards at its
      // widest with the LW standing 16.5 ft off too, which isn't a rim, it's a
      // slow cross-ice pass through the middle: exactly what a rim exists to
      // avoid. Boards are at x=±42.5.
      outlets: [ { x: -37, y: 44, label: 'LW' } ],
      pressure: [ { x: 19, y: 56 }, { x: 28, y: 50 } ],
      path: [ [24, 61], [14, 71], [0, 73], [-16, 71], [-34, 65], [-39, 52], [-37, 45] ],
      cue: "They've jammed your strong-side wall. The weak-side wing is open up the far boards.",
      teach: "They've jammed your strong-side wall — don't force it. Rim it hard around the boards to the open weak-side wing.",
    },
  ];

  function init(rinkContainer) {
    const rink = IceQ.Rink.create(rinkContainer);
    const { toCanvasX, toCanvasY, scale, overlayLayer, gridLayer } = rink;

    let readIdx = 0;
    let sceneNodes = [];
    function currentRead() { return READS[readIdx]; }

    function clearScene() {
      sceneNodes.forEach(n => { try { n.destroy(); } catch (e) {} });
      sceneNodes = [];
    }
    function clearOverlay() {
      overlayLayer.destroyChildren();
      overlayLayer.batchDraw();
    }

    function addPlayer(o, color, label, withPuck) {
      const node = IceQ.Player.create({
        x: toCanvasX(o.x), y: toCanvasY(o.y),
        scale: Math.max(0.55, scale * (label ? 0.08 : 0.07)),
        color, label: label || '',
        stickSide: o.x >= 0 ? 'R' : 'L',
      });
      gridLayer.add(node);
      sceneNodes.push(node);
      if (withPuck) {
        const puck = new Konva.Circle({
          x: toCanvasX(o.x - (o.x >= 0 ? 2 : -2)), y: toCanvasY(o.y - 3),
          radius: Math.max(5, scale * 0.7),
          fill: '#0A0A0A', stroke: '#E0C68A', strokeWidth: 1.5,
          listening: false,
        });
        gridLayer.add(puck);
        sceneNodes.push(puck);
      }
      return node;
    }

    function drawScene() {
      const r = currentRead();
      // Our D with the puck + partner D
      addPlayer(r.d, 'spartan', 'D', true);
      addPlayer(r.d2, 'spartan', 'D2', false);
      // Open outlet forwards (context)
      (r.outlets || []).forEach(o => addPlayer(o, 'spartan', o.label, false));
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
      r.path.forEach(([x, y]) => { pts.push(toCanvasX(x), toCanvasY(y)); });
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
      // Label near the path midpoint
      const mid = r.path[Math.floor(r.path.length / 2)];
      const lbl = new Konva.Text({
        x: toCanvasX(mid[0]) - 60, y: toCanvasY(mid[1]) - 26,
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
    async function travelPuck(canvasPts) {
      if (!canvasPts || canvasPts.length < 2 || typeof Konva === 'undefined') return;
      const puck = new Konva.Circle({
        x: canvasPts[0].x, y: canvasPts[0].y,
        radius: Math.max(5, scale * 0.75),
        fill: '#0A0A0A', stroke: '#FFD84D', strokeWidth: 2,
        opacity: 0, listening: false,
      });
      overlayLayer.add(puck);
      puck.to({ opacity: 1, duration: 0.15 });
      await IceQ.Path.wait(170);
      for (let i = 1; i < canvasPts.length; i++) {
        puck.to({ x: canvasPts[i].x, y: canvasPts[i].y, duration: 0.34, easing: Konva.Easings.EaseInOut });
        await IceQ.Path.wait(360);
      }
      puck.to({ opacity: 0, duration: 0.3 });
      await IceQ.Path.wait(320);
      try { puck.destroy(); overlayLayer.batchDraw(); } catch (e) {}
    }

    // Demo reveal: draw the gold route arrow + label, then send the puck down
    // it. Returns a promise that resolves when the puck finishes.
    function playReveal() {
      showCorrect();
      const r = currentRead();
      const canvasPts = r.path.map(([x, y]) => ({ x: toCanvasX(x), y: toCanvasY(y) }));
      return travelPuck(canvasPts);
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
