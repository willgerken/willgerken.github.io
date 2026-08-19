// Pinch or Peel. Veterans (13U+) module, 2026-08-18.
//
// THE READ: you are the strong-side D at the point in THEIR end. Their D
// rims the puck around the boards up your wall. Their winger is on the wall
// waiting for it. Do you PINCH (go down the wall, beat him to it or seal him,
// keep the puck in) or PEEL (back off, give up the zone, live to defend)?
// The answer is never "always pinch": it depends on whether a forward (F3)
// is high to cover for you, and whether you can actually win the race.
//
// MECHANIC: the rim animates (~2.6 s). Tap PINCH or PEEL before the puck
// reaches you. Tap nothing and the puck rims past you, which is its own
// lesson. Wrong calls play out (beaten around the wall, 2-on-1 the other
// way; or a zone given away for nothing), then BUT INSTEAD shows the cue you
// missed and the right outcome.
//
// Coordinates: feet, x -42.5..42.5, y 0 = blue line, y 64 = goal line. We
// attack +y (THEIR net). Authored with YOU on the right point; session mirror.

window.IceQ = window.IceQ || {};

window.IceQ.PinchRead = (function () {
  const RIM_X = 41;                  // puck riding the boards
  const YOU_START = { x: 31, y: 9 };

  function kf(keys, t) {
    if (t <= keys[0].t) return { x: keys[0].x, y: keys[0].y };
    for (let i = 1; i < keys.length; i++) {
      const a = keys[i - 1], b = keys[i];
      if (t <= b.t) { const u = (t - a.t) / (b.t - a.t || 1); return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }; }
    }
    const l = keys[keys.length - 1]; return { x: l.x, y: l.y };
  }

  // The rim: behind their net, around the corner, up the wall to the blue line.
  const RIM = [
    { t: 0.00, x: 24, y: 73 },
    { t: 0.17, x: 39.5, y: 72.5 },
    { t: 0.22, x: RIM_X, y: 69 },
    { t: 1.00, x: RIM_X, y: 6 },
  ];
  // The puck passes the winger (y≈26) around t=0.72 and reaches YOU at ~0.95.
  const DECIDE_BY = 0.78;

  const PLAYS = [
    {
      key: 'covered-flat',
      answer: 'pinch',
      f3: { x: 13, y: 16 },
      winger: [{ t: 0, x: 38, y: 27 }, { t: 1, x: 38, y: 27 }],    // flat-footed
      whyPinch: 'F3 was high, so the point was covered, and the winger was flat-footed. You win that race. Pinch, seal him, puck stays in.',
      whyPeel: 'Nothing. You gave the zone away for nothing: F3 had the point covered and the winger was standing still.',
    },
    {
      key: 'nobody-high',
      answer: 'peel',
      f3: { x: 18, y: 50 },
      winger: [{ t: 0, x: 38, y: 27 }, { t: 1, x: 38, y: 27 }],
      whyPinch: 'If the pinch misses there is NOBODY behind you: it is a 2-on-1 the other way. With nobody high, you peel and take the 2-on-2.',
      whyPeel: 'Right. Nobody was high to cover the point, so a missed pinch is a 2-on-1 against. You gave up the zone and kept the numbers.',
    },
    {
      key: 'winger-flying',
      answer: 'peel',
      f3: { x: 13, y: 16 },
      winger: [{ t: 0, x: 38, y: 46 }, { t: 0.55, x: 39, y: 30 }, { t: 0.9, x: 40, y: 12 }, { t: 1, x: 40, y: 6 }],
      whyPinch: 'He had speed and you were flat. You lose that race every time, and then he is around you and F3 is bailing you out. Peel, gap up, keep your numbers.',
      whyPeel: 'Right. He had speed and you did not; a pinch there is a race you lose. You backed off and kept your gap.',
    },
    {
      key: 'bobble',
      answer: 'pinch',
      f3: { x: 13, y: 16 },
      winger: [{ t: 0, x: 38, y: 27 }, { t: 1, x: 38, y: 27 }],
      bobbleAt: 0.72,
      whyPinch: 'Loose puck, F3 covering: that is a green light. You jumped it, pinned him, and the puck never left the zone.',
      whyPeel: 'He bobbled it with your F3 high. That is the easiest pinch you will ever get, and you backed away from it.',
    },
    {
      key: 'flat-but-nobody',
      answer: 'peel',
      f3: { x: 20, y: 50 },
      winger: [{ t: 0, x: 38, y: 27 }, { t: 1, x: 38, y: 27 }],
      whyPinch: 'You would win that race, and it still is not worth it: nobody is high, so the one time he chips it past you it is a 2-on-1. Flat winger is not enough on its own.',
      whyPeel: 'Right. He was flat-footed, but look who was behind you: nobody. You gave up the zone and kept the numbers. The race is only half the read.',
    },
    {
      key: 'flying-bobble',
      answer: 'pinch',
      f3: { x: 13, y: 16 },
      winger: [{ t: 0, x: 38, y: 44 }, { t: 0.6, x: 39, y: 30 }, { t: 1, x: 39, y: 30 }],
      bobbleAt: 0.70,
      whyPinch: 'He came in with speed, but the rim beat him and died in his feet, and F3 had the point. Speed does not matter once the puck is loose. You jumped it.',
      whyPeel: 'He had speed, yes. But the puck got there first and died, and F3 was high. That is a loose puck with cover: pinch it.',
    },
  ];

  // One cue for every play, on purpose: the reads live on the ice (who is
  // high, does the winger have the jump), not in the prompt. The old per-play
  // cues told the kid the answer before he hit Play.
  const CUE = 'Rim coming up your wall. Before it gets to you: who is high, and does the winger have the jump? PINCH or PEEL.';
  const DURATION_S = 2.7;

  function init(rinkContainer) {
    const rink = IceQ.Rink.create(rinkContainer);
    const { toCanvasX: cx0, toCanvasY, scale, overlayLayer, gridLayer } = rink;
    if (rink.labelNet) rink.labelNet('theirs');

    const MIRROR = Math.random() < 0.5;
    const mx = (x) => MIRROR ? -x : x;
    const toCanvasX = (xFt) => cx0(mx(xFt));
    const flipSide = (sd) => (sd === 'L' ? 'R' : 'L');
    const tokenScale = Math.max(0.62, scale * 0.085);

    let playIdx = 0;
    let nodes = {};
    let animation = null, startTime = 0, isPlaying = false, result = null;
    let contrastHandles = [];

    // Shuffled per session (fixed order + answers was memorised by pass two).
    const ORDER = (() => { const a = PLAYS.map((_, i) => i); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; })();
    const currentPlay = () => PLAYS[ORDER[playIdx]];
    function mk(opts) {
      const g = IceQ.Player.create(Object.assign({ scale: tokenScale }, opts, {
        stickSide: MIRROR ? flipSide(opts.stickSide || 'R') : (opts.stickSide || 'R'),
      }));
      gridLayer.add(g); return g;
    }
    const place = (g, ft) => g.position({ x: toCanvasX(ft.x), y: toCanvasY(ft.y) });
    function nodeFt(node) { const xFt = (node.x() - rink.width / 2) / scale; return { x: MIRROR ? -xFt : xFt, y: node.y() / scale }; }
    function bladeFt(node) { const p = IceQ.Player.puckPosFor(node); const xFt = (p.x - rink.width / 2) / scale; return { x: MIRROR ? -xFt : xFt, y: p.y / scale }; }

    function drawScene() {
      Object.values(nodes).forEach(n => { try { n && n.destroy(); } catch (e) {} });
      nodes = {};
      const p = currentPlay();
      nodes.goalie = mk({ color: 'opponent', kind: 'goalie' }); place(nodes.goalie, { x: 0, y: 62.5 }); IceQ.Player.face(nodes.goalie, 'y-');
      nodes.od = mk({ color: 'opponent', stickSide: 'R' }); place(nodes.od, { x: 20, y: 69 }); IceQ.Player.face(nodes.od, 'x+');   // their D behind the net, rimming it
      nodes.oc = mk({ color: 'opponent', stickSide: 'L' }); place(nodes.oc, { x: 8, y: 34 }); IceQ.Player.face(nodes.oc, 'y-');   // their center, the 2-on-1 partner
      nodes.ow = mk({ color: 'opponent', stickSide: 'R' }); IceQ.Player.face(nodes.ow, 'y-');   // stick inside: his blade never draws past the boards                                   // their winger on the wall
      nodes.f1 = mk({ color: 'spartan', label: 'F1', stickSide: 'R' }); place(nodes.f1, { x: 30, y: 62 }); IceQ.Player.face(nodes.f1, 'y+');
      nodes.f2 = mk({ color: 'spartan', label: 'F2', stickSide: 'L' }); place(nodes.f2, { x: 8, y: 56 }); IceQ.Player.face(nodes.f2, 'y+');
      nodes.f3 = mk({ color: 'spartan', label: 'F3', stickSide: 'L' }); place(nodes.f3, p.f3); IceQ.Player.face(nodes.f3, 'y+');
      nodes.d2 = mk({ color: 'spartan', label: 'D', stickSide: 'L' }); place(nodes.d2, { x: -22, y: 9 }); IceQ.Player.face(nodes.d2, 'y+');
      nodes.you = mk({ color: 'spartan', label: 'YOU', stickSide: 'R' }); place(nodes.you, YOU_START); IceQ.Player.face(nodes.you, 'y+');
      nodes.puck = new Konva.Circle({ radius: Math.max(5, scale * 0.7), fill: '#0A0A0A', stroke: '#E0C68A', strokeWidth: 1.5 });
      gridLayer.add(nodes.puck);
      positionAt(0);
      gridLayer.batchDraw();
    }

    function positionAt(t) {
      const p = currentPlay();
      place(nodes.ow, kf(p.winger, t));
      let puck = kf(RIM, t);
      // Bobble: after the puck reaches the winger it dies in his feet.
      if (p.bobbleAt != null && t >= p.bobbleAt) puck = { x: RIM_X - 1, y: kf(RIM, p.bobbleAt).y + 1 };
      nodes.puck.position({ x: toCanvasX(puck.x), y: toCanvasY(puck.y) });
    }

    // ---- live play -------------------------------------------------------
    function startPlay(onComplete) {
      if (isPlaying) return;
      if (result) reset();
      isPlaying = true; result = null; startTime = performance.now();
      animation = new Konva.Animation(() => {
        const t = (performance.now() - startTime) / (DURATION_S * 1000);
        if (t >= 1) {
          positionAt(1); animation.stop(); isPlaying = false;
          result = { kind: 'froze', correct: false, pass: false, play: currentPlay().key, answer: currentPlay().answer };
          result.consequence = playConsequence(result);
          result.consequence.then(() => { if (onComplete) onComplete(); });
          return false;
        }
        positionAt(t);
      }, gridLayer);
      animation.start();
    }

    function choose(call) {            // 'pinch' | 'peel'
      if (result || !isPlaying) return null;
      const t = Math.max(0, Math.min(1, (performance.now() - startTime) / (DURATION_S * 1000)));
      animation.stop(); isPlaying = false;
      const p = currentPlay();
      const correct = call === p.answer;
      result = { kind: correct ? 'good-' + call : 'bad-' + call, call, correct, pass: correct, t, play: p.key, answer: p.answer, late: t > DECIDE_BY };
      result.consequence = playConsequence(result);
      return result;
    }

    // ---- movement helpers ------------------------------------------------
    const SKATE = 20, RIMS = 30, PASS = 44, SHOT = 62;   // RIMS matches the live rim (~29 ft/s) so the tap does not change the puck's speed
    async function move(node, ptsFt, ftps, sig, withPuck) {
      for (let i = 1; i < ptsFt.length; i++) {
        if (!node.getStage()) return;
        const a = ptsFt[i - 1], b = ptsFt[i];
        const d = Math.max(0.14, Math.min(1.4, Math.hypot(b.x - a.x, b.y - a.y) / ftps));
        const t0 = performance.now(); let done = false;
        const anim = new Konva.Animation(() => {
          const u = Math.min(1, (performance.now() - t0) / (d * 1000));
          place(node, { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
          if (withPuck) nodes.puck.position(IceQ.Player.puckPosFor(node));
          if (u >= 1) { done = true; anim.stop(); return false; }
        }, gridLayer);
        anim.start();
        contrastHandles.push({ stop: () => { try { anim.stop(); } catch (e) {} done = true; } });
        while (!done) { await IceQ.Path.wait(30); if (sig && sig.skipped) { anim.stop(); return; } }
      }
    }
    async function slide(ptsFt, ftps, sig, easeLast) {
      const puck = nodes.puck;
      for (let i = 1; i < ptsFt.length; i++) {
        if (!puck.getStage()) return;
        const a = ptsFt[i - 1], b = ptsFt[i];
        const d = Math.max(0.12, Math.min(1.4, Math.hypot(b.x - a.x, b.y - a.y) / ftps));
        puck.to({ x: toCanvasX(b.x), y: toCanvasY(b.y), duration: d, easing: (easeLast && i === ptsFt.length - 1) ? Konva.Easings.EaseOut : Konva.Easings.Linear });
        await IceQ.Path.wait(d * 1000 + 15);
        if (sig && sig.skipped) { try { puck.stop(); } catch (e) {} return; }
      }
    }
    // Where the puck is (feet) and where the winger is, right now.
    const puckFt = () => { const x = (nodes.puck.x() - rink.width / 2) / scale; return { x: MIRROR ? -x : x, y: nodes.puck.y() / scale }; };

    // ---- consequences --------------------------------------------------
    function playConsequence(res, sig) {
      sig = sig || { skipped: false };
      const p = currentPlay();
      const you = nodes.you, ow = nodes.ow, oc = nodes.oc, f3 = nodes.f3;
      return (async function () {
        const call = res.call || (res.kind === 'froze' ? null : res.kind.replace(/^(good|bad)-/, ''));
        if (res.kind === 'froze') {
          // Puck rims past you and out of the zone.
          await slide([puckFt(), { x: RIM_X, y: 0 }, { x: RIM_X - 1, y: -6 }], RIMS, sig);
          if (sig.skipped) return;
          await IceQ.Path.animateGoalConsequence(rink, { kind: 'goal', message: 'FROZE. PUCK\'S GONE, AND SO IS THE ZONE.', duration: 1.1 });
          return;
        }
        if (call === 'pinch') {
          // You go down the wall toward the puck.
          const wFt = nodeFt(ow);
          const meet = { x: RIM_X - 3.5, y: Math.max(14, Math.min(30, wFt.y - 4)) };
          if (res.correct) {
            // Beat him to it (or jump the bobble): arrive, seal, chip it to F3.
            const puckNow = puckFt();
            const rimLeg = slide([puckNow, { x: RIM_X, y: meet.y + 2 }], RIMS, sig);
            await move(you, [YOU_START, meet], SKATE + 4, sig);
            await rimLeg;
            if (sig.skipped) return;
            nodes.puck.position(IceQ.Player.puckPosFor(you));
            await IceQ.Path.wait(140);
            // Winger pinned: nudge him to the boards.
            await move(ow, [nodeFt(ow), { x: RIM_X + 0.5, y: meet.y + 1 }], SKATE, sig);
            if (sig.skipped) return;
            // Chip it to F3 high; F3 walks in and shoots.
            await slide([bladeFt(you), bladeFt(f3)], PASS, sig);
            if (sig.skipped) return;
            await move(f3, [nodeFt(f3), { x: 6, y: 34 }], SKATE, sig, true);
            if (sig.skipped) return;
            try { nodes.goalie.to({ x: toCanvasX(2.5), duration: 0.3 }); } catch (e) {}
            await slide([bladeFt(f3), { x: -2.2, y: 65.5 }], SHOT, sig, true);
            if (sig.skipped) return;
            try { IceQ.Audio && IceQ.Audio.goalHorn && IceQ.Audio.goalHorn(); } catch (e) {}
            await IceQ.Path.animateGoalConsequence(rink, { kind: 'saved', message: 'KEPT IT IN. F3 HAD YOU COVERED. GOAL.', duration: 1.1 });
            return;
          }
          // Wrong pinch: he beats you around the wall and it is a 2-on-1 the other way.
          const puckNow = puckFt();
          const go = move(you, [YOU_START, meet], SKATE, sig);
          await slide([puckNow, { x: RIM_X, y: wFt.y - 2 }], RIMS, sig);
          await go;
          if (sig.skipped) return;
          // Winger collects and goes up the wall past you; center joins through the middle.
          nodes.puck.position(IceQ.Player.puckPosFor(ow));
          const burst = move(ow, [nodeFt(ow), { x: RIM_X + 0.5, y: 2 }, { x: 37, y: -8 }], SKATE + 6, sig, true);
          await move(oc, [nodeFt(oc), { x: 6, y: 4 }, { x: 2, y: -8 }], SKATE + 5, sig);
          await burst;
          if (sig.skipped) return;
          const nobodyHigh = p.f3.y > 30;
          await IceQ.Path.animateGoalConsequence(rink, { kind: 'goal', message: nobodyHigh ? 'BEAT YOU, NOBODY HIGH. 2-ON-1 THE OTHER WAY.' : 'BEAT YOU WIDE WITH SPEED. NOW YOU ARE CHASING.', duration: 1.1 });
          return;
        }
        // PEEL: you back off toward the blue line and gap up; the rim goes out.
        const puckNow = puckFt();
        const wNow = nodeFt(ow);
        const back = move(you, [YOU_START, { x: 24, y: 1 }], SKATE, sig);
        if (p.bobbleAt == null) await slide([puckNow, { x: RIM_X, y: wNow.y - 1.5 }], RIMS, sig);   // to the winger, not past him
        else await move(ow, [wNow, { x: RIM_X - 2, y: puckNow.y - 1.5 }], SKATE, sig);           // he steps to the dead puck
        await back;
        if (sig.skipped) return;
        // Winger collects and exits the zone; you are in front of him.
        nodes.puck.position(IceQ.Player.puckPosFor(ow));
        await move(ow, [nodeFt(ow), { x: 38, y: 4 }, { x: 34, y: -8 }], SKATE + 2, sig, true);
        if (sig.skipped) return;
        if (res.correct) {
          await IceQ.Path.animateGoalConsequence(rink, { kind: 'cleared', message: p.key === 'winger-flying' ? 'GOOD READ. NO RACE TO LOSE. 2-ON-2, NOT 2-ON-1.' : 'GOOD READ. NOBODY HIGH, SO YOU KEPT THE NUMBERS.', duration: 1.1 });
        } else {
          await IceQ.Path.animateGoalConsequence(rink, { kind: 'goal', message: p.key === 'bobble' ? 'HE BOBBLED IT AND YOU BACKED OFF. ZONE GONE.' : 'ZONE GIVEN AWAY FOR NOTHING. F3 HAD YOU.', duration: 1.1 });
        }
      })();
    }

    // ---- contrast: BUT INSTEAD -> cue highlight at the decision -> right outcome
    function showContrastReplay(res, skipSignal) {
      const sig = skipSignal || { skipped: false };
      const p = currentPlay();
      return (async function () {
        if (!res || res.correct) return { completed: true };
        if (res.kind !== 'demo') {
          await raceSkip(IceQ.Path.flashLabel(rink, { text: 'BUT INSTEAD…', color: '#E0C68A', fontSize: 30, holdMs: 420, fadeMs: 160, skipSignal: sig }), sig, 2500);
          if (sig.skipped) return { skipped: true };
        }
        overlayLayer.destroyChildren();
        drawScene();
        // Replay the rim to the decision moment and freeze.
        const tStop = p.bobbleAt != null ? p.bobbleAt + 0.05 : 0.62;
        const t0 = performance.now(); let done = false;
        const anim = new Konva.Animation(() => {
          const t = Math.min(tStop, (performance.now() - t0) / (DURATION_S * 1000));
          positionAt(t);
          if (t >= tStop) { done = true; anim.stop(); return false; }
        }, gridLayer);
        anim.start();
        contrastHandles.push({ stop: () => { try { anim.stop(); } catch (e) {} done = true; } });
        while (!done) { await IceQ.Path.wait(40); if (sig.skipped) { anim.stop(); return { skipped: true }; } }
        // Highlight the cue: a ring on F3 (is anyone high?) and on the winger.
        const ring = (node, color) => { const c = new Konva.Circle({ x: node.x(), y: node.y(), radius: 6 * scale, stroke: color, strokeWidth: 3, dash: [6, 4], listening: false }); overlayLayer.add(c); return c; };
        const nobodyHigh = p.f3.y > 30;
        const cueTxt = p.answer === 'pinch'
          ? (p.bobbleAt != null ? 'LOOSE PUCK + F3 HIGH = PINCH' : 'F3 HIGH + WINGER FLAT = PINCH')
          : (nobodyHigh ? 'NOBODY HIGH = PEEL' : 'WINGER FLYING = PEEL');
        ring(nodes.f3, p.f3.y < 30 ? '#3DB46A' : '#CE202E');
        ring(nodes.ow, (p.key === 'winger-flying') ? '#CE202E' : '#3DB46A');
        const lbl = new Konva.Text({ x: 0, y: rink.height * 0.26, width: rink.width, align: 'center', text: cueTxt, fontSize: Math.max(20, rink.width * 0.055), fontStyle: '900', fill: '#E0C68A', stroke: '#1A1F2E', strokeWidth: 2, listening: false });
        overlayLayer.add(lbl); overlayLayer.batchDraw();
        await raceSkip(IceQ.Path.wait(1100), sig, 1800);
        if (sig.skipped) return { skipped: true };
        overlayLayer.destroyChildren(); overlayLayer.batchDraw();
        await raceSkip(playConsequence({ kind: 'good-' + p.answer, call: p.answer, correct: true }, sig), sig, 9000);
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
    function stopContrast() { contrastHandles.forEach(h => { try { h.stop(); } catch (e) {} }); contrastHandles = []; }
    function showMe() { return showContrastReplay({ correct: false, kind: 'demo' }, { skipped: false }); }
    function reset() {
      if (animation) { try { animation.stop(); } catch (e) {} animation = null; }
      stopContrast(); isPlaying = false; result = null;
      overlayLayer.destroyChildren(); overlayLayer.batchDraw();
      drawScene();
    }
    const info = () => ({ rushIdx: playIdx, rush: currentPlay(), totalRushes: PLAYS.length, cue: CUE });
    function nextPlay() { playIdx = (playIdx + 1) % PLAYS.length; reset(); return info(); }

    drawScene();
    return {
      rink, startPlay, choose, result: () => result, check: () => result,
      showContrastReplay, stopContrast, showMe, reset,
      nextRush: nextPlay, currentRushInfo: info, cue: () => CUE,
      isDone: () => !!(result && result.correct),
    };
  }

  function phrasedFeedback(res) {
    if (!res) return 'Hit Play and read the rim.';
    const p = PLAYS.find(x => x.key === res.play) || PLAYS[0];
    switch (res.kind) {
      case 'froze': return 'You never made a call and the puck rimmed right past you. Not deciding is not peeling: you never gapped up either. Pinch or peel, but decide before it gets to you.';
      case 'good-pinch': return p.whyPinch + (res.late ? ' (You were late on the call; in a game that pinch is a coin flip.)' : '');
      case 'good-peel': return p.whyPeel;
      case 'bad-pinch': return p.whyPinch;
      case 'bad-peel': return p.whyPeel;
      default: return 'Read it again.';
    }
  }

  return { init, phrasedFeedback, PLAYS };
})();
