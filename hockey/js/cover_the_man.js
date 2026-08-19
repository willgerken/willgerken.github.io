// Scenario #4: Cover the Man (vs. puck-chase).
//
// Mechanic: the puck is in the corner (carried by the strong-side opponent).
// Our D-PARTNER is already pressuring the puck carrier in the corner. Kid
// sees TWO opponents: the puck carrier in the corner (covered by partner)
// AND a "secondary threat" cutting to the slot. Kid's defender has a choice:
//   - Double-team the puck carrier (over-committing, wrong — partner's got him)
//   - Cover the slot man (right answer — the dangerous receiver, UNCOVERED)
// Stick-on-stick: defender's stick should be in the passing lane to the slot.
//
// Pedagogy note (Will, Apr 2026): the "cover the receiver not the carrier"
// teaching ONLY applies when someone else is already covering the carrier.
// Without a D-partner shown, the message reads backwards (it looks like we
// want the kid to let the carrier skate free). The partner makes it correct.

window.IceQ = window.IceQ || {};

window.IceQ.CoverTheMan = (function () {
  // v0.17 (per Will): multi-play rotation. Scenario was stuck on one play
  // (right-corner + left-slot) and felt flat — kids who got it right once
  // had nothing to rotate through. Three plays now, each with a distinct
  // read: right corner (slot on left), left corner (slot on right), and
  // behind-net cycle (different geometry — slot high, D2 behind net).
  // Same lesson, 3 presentations — matches the rotation pattern in
  // Forecheck, Lane Coverage, etc.
  //
  // Each play has the same logical structure:
  //   puckCarrier: opposing forward holding the puck (D2 pressures him)
  //   slotMan:    opposing forward in the dangerous receiver spot (UNCOVERED — kid's job)
  //   dPartner:   our D2 already pressuring the puck carrier (stick-on-stick)
  //   coverTarget: where kid's defender should be (circle around slot-man)
  //   chaseZone:  where NOT to go (overlaps the puck carrier — double-team trap)
  const PLAYS = [
    {
      key: 'right-corner',
      label: 'puck in right corner',
      puckCarrier: { x:  30, y: 67, stickSide: 'L' },   // in the corner, not on the low wall
      slotMan:     { x:  -4, y: 50, stickSide: 'R' },
      dPartner:    { x:  25, y: 63, stickSide: 'R' },
      coverTarget: { x:  -2, y: 54 },
      chaseZone:   { x:  12, y: 54, r: 9 },             // the open ice a double-teamer drifts into, not on top of D2
    },
    {
      key: 'left-corner',
      label: 'puck in left corner',
      puckCarrier: { x: -30, y: 67, stickSide: 'R' },
      slotMan:     { x:   4, y: 50, stickSide: 'L' },
      dPartner:    { x: -25, y: 63, stickSide: 'L' },
      coverTarget: { x:   2, y: 54 },
      chaseZone:   { x: -12, y: 54, r: 9 },
    },
    {
      key: 'behind-net',
      label: 'cycle behind the net',
      puckCarrier: { x:   8, y: 70, stickSide: 'L' },
      slotMan:     { x:  -8, y: 52, stickSide: 'R' },
      dPartner:    { x:   2, y: 68, stickSide: 'R' },
      coverTarget: { x:  -6, y: 54 },
      chaseZone:   { x:   4, y: 62, r: 8 },
    },
  ];

  const COVER_TOL = 9;
  const DEFENDER_START = { x: 0, y: 25 };

  function init(rinkContainer) {
    const rink = IceQ.Rink.create(rinkContainer);
    if (rink.labelNet) rink.labelNet('ours');   // zone cue: whose net is this
    const { toCanvasX, toCanvasY, scale, overlayLayer, gridLayer } = rink;

    let playIdx = 0;
    function currentPlay() { return PLAYS[playIdx]; }

    let defender = null;
    let puckCarrier = null;
    let slotMan = null;
    let partnerNode = null;
    let puckNodeCTM = null;
    let stickLine = null;
    let sceneNodes = [];  // puckCarrier, slotMan, partner, puck, stickLine — cleared on nextPlay
    // Flag for the in-flight Show-Me glide so reset() and dragstart can stop
    // it mid-flight. Without this, tap Reset (or grab D) mid-glide leaves the
    // tween racing in the background. Uses node.getTween() (the codebase's
    // existing idiom) — more reliable than capturing .to()'s return value.
    let showMeGlideActive = false;
    function cancelShowMeGlide() {
      if (showMeGlideActive && defender && defender.getTween && defender.getTween()) {
        try { defender.getTween().pause(); } catch (e) { /* ignore */ }
        try { defender.getTween().destroy(); } catch (e) { /* ignore */ }
      }
      showMeGlideActive = false;
    }

    function drawNet() {
      gridLayer.add(new Konva.Rect({
        x: toCanvasX(-3), y: toCanvasY(64),
        width: 6 * scale, height: 3.5 * scale,
        stroke: '#CE202E', strokeWidth: 2, fill: 'rgba(214,35,40,0.05)',
      }));
    }
    function drawPuck() {
      const p = currentPlay();
      // Puck on the carrier's blade (sprite geometry), drawn after the players.
      const pos = puckCarrier ? IceQ.Player.puckPosFor(puckCarrier)
        : { x: toCanvasX(p.puckCarrier.x + (p.puckCarrier.stickSide === 'L' ? -2 : 2)), y: toCanvasY(p.puckCarrier.y + 1) };
      puckNodeCTM = new Konva.Circle({
        x: pos.x,
        y: pos.y,
        radius: Math.max(5, scale * 0.7),
        fill: '#0A0A0A', stroke: '#E0C68A', strokeWidth: 1.5,
      });
      gridLayer.add(puckNodeCTM);
      sceneNodes.push(puckNodeCTM);
    }
    function drawOpponents() {
      const p = currentPlay();
      puckCarrier = IceQ.Player.create({
        x: toCanvasX(p.puckCarrier.x), y: toCanvasY(p.puckCarrier.y),
        scale: Math.max(0.55, scale * 0.07),
        color: 'opponent', stickSide: p.puckCarrier.stickSide,
      });
      slotMan = IceQ.Player.create({
        x: toCanvasX(p.slotMan.x), y: toCanvasY(p.slotMan.y),
        scale: Math.max(0.55, scale * 0.07),
        color: 'opponent', stickSide: p.slotMan.stickSide,
      });
      // D-PARTNER already pressuring the puck carrier (stick-on-stick in the
      // corner). Visual: spartan gold, non-draggable, labeled 'D2' so kid
      // knows the partner's got the carrier. Without this the teaching
      // "cover the receiver" reads as "let the carrier skate free."
      partnerNode = IceQ.Player.create({
        x: toCanvasX(p.dPartner.x), y: toCanvasY(p.dPartner.y),
        scale: Math.max(0.55, scale * 0.075),
        color: 'spartan', label: 'D2', stickSide: p.dPartner.stickSide,
      });
      IceQ.Player.face(partnerNode, 'y-');
      // Our goalie in our net (zone cue + nobody defends an empty net).
      const goalie = IceQ.Player.create({
        x: toCanvasX(0), y: toCanvasY(62.5),
        scale: Math.max(0.6, scale * 0.08), color: 'spartan', kind: 'goalie',
      });
      IceQ.Player.face(goalie, 'y-');
      gridLayer.add(goalie, puckCarrier, slotMan, partnerNode);
      sceneNodes.push(goalie, puckCarrier, slotMan, partnerNode);
      drawStickOnStick();
    }
    // Faint dashed line from D2's stick blade toward the puck carrier's
    // stick. Sells "D2 has him covered, kid doesn't need to" — reinforces
    // the pedagogy that the carrier is locked up by the partner. Drawn at
    // low opacity so it doesn't compete with the kid's defender or the
    // showCorrect overlays.
    //
    // Per play, the geometry shifts — for left-corner the partner's stick
    // is on the LEFT (toward the carrier), for right-corner it's on the
    // RIGHT. The blade-tip computation flips based on stickSide.
    function drawStickOnStick() {
      const p = currentPlay();
      const d2 = p.dPartner;
      const carr = p.puckCarrier;
      // Each player's blade extends ~2.5 ft on the stickSide direction.
      // For 'L' stick: blade extends to negative x (relative to player).
      // For 'R' stick: blade extends to positive x.
      // Real blade tips from the sprite geometry (the old fixed 2.5 ft
      // offsets started the line at the bottom hand on a phone).
      const a = partnerNode ? IceQ.Player.puckPosFor(partnerNode, null, 'tip')
        : { x: toCanvasX(d2.x + (d2.stickSide === 'R' ? 2.5 : -2.5)), y: toCanvasY(d2.y + 1.5) };
      const b = puckCarrier ? IceQ.Player.puckPosFor(puckCarrier, null, 'tip')
        : { x: toCanvasX(carr.x + (carr.stickSide === 'R' ? 2.5 : -2.5)), y: toCanvasY(carr.y + 1.5) };
      stickLine = new Konva.Line({
        points: [a.x, a.y, b.x, b.y],
        stroke: 'rgba(224, 198, 138, 0.45)',
        strokeWidth: 1.2, dash: [4, 3],
        listening: false,
      });
      gridLayer.add(stickLine);
      sceneNodes.push(stickLine);
    }
    function clearScene() {
      sceneNodes.forEach(n => { try { n.destroy(); } catch (e) {} });
      sceneNodes = [];
      puckCarrier = null;
      slotMan = null;
      partnerNode = null;
      puckNodeCTM = null;
      stickLine = null;
    }
    function drawDefender() {
      defender = IceQ.Player.create({
        x: toCanvasX(DEFENDER_START.x), y: toCanvasY(DEFENDER_START.y),
        scale: Math.max(0.65, scale * 0.085),
        color: 'spartan', label: 'YOU', stickSide: 'L',
        draggable: true,
      });
      IceQ.Player.face(defender, 'y-');   // our zone: YOU faces up-ice, not his own goalie
      defender.on('dragmove', () => {
        const pos = defender.position();
        const minX = toCanvasX(-40), maxX = toCanvasX(40);
        const minY = toCanvasY(2),   maxY = toCanvasY(72);
        defender.x(Math.max(minX, Math.min(maxX, pos.x)));
        defender.y(Math.max(minY, Math.min(maxY, pos.y)));
      });
      // If kid grabs the defender mid-Show-Me-glide, cancel the tween so the
      // sprite stops fighting the drag.
      defender.on('dragstart', () => { cancelShowMeGlide(); });
      gridLayer.add(defender);
    }

    drawNet();
    drawOpponents();
    drawPuck();
    drawDefender();
    gridLayer.batchDraw();

    function evaluate() {
      const p = currentPlay();
      const pos = defender.position();
      const xFt = (pos.x - rink.width / 2) / scale;
      const yFt = pos.y / scale;
      const distToCover = Math.hypot(xFt - p.coverTarget.x, yFt - p.coverTarget.y);
      const distToChase = Math.hypot(xFt - p.chaseZone.x, yFt - p.chaseZone.y);
      // The circle alone let a kid ABOVE his man pass (QC 2026-08-18): cover
      // means goal-side of the slot man and not parked on the goalie.
      const goalSide = yFt >= p.slotMan.y + 1;
      const inCrease = yFt > 58 && Math.abs(xFt) < 6;
      return {
        cover: distToCover <= COVER_TOL && goalSide && !inCrease,
        nearButWrongSide: distToCover <= COVER_TOL && !goalSide,
        onGoalie: distToCover <= COVER_TOL && inCrease,
        chasing: distToChase <= p.chaseZone.r,
        distToCover, distToChase,
        playLabel: p.label,
      };
    }

    // One-pass consequence (QC 2026-08-18): carrier feeds the slot man. If YOU
    // are goal-side with the stick in the lane it dies on your blade; if not,
    // tap-in. ~2 s, never throws into the caller.
    function consequence(res) {
      return (async function () {
        try {
          if (!puckNodeCTM || !defender || !slotMan) return;
          const from = puckNodeCTM.position();
          const toMan = IceQ.Player.puckPosFor(slotMan);
          puckNodeCTM.visible(false);
          if (res.cover) {
            const myBlade = IceQ.Player.puckPosFor(defender);
            const dx = toMan.x - from.x, dy = toMan.y - from.y; const L2 = dx * dx + dy * dy || 1;
            const u = Math.max(0.2, Math.min(0.9, ((myBlade.x - from.x) * dx + (myBlade.y - from.y) * dy) / L2));
            const near = Math.hypot(myBlade.x - (from.x + u * dx), myBlade.y - (from.y + u * dy));
            const stopAt = near < 7 * scale ? myBlade : { x: from.x + u * dx, y: from.y + u * dy };
            const h = IceQ.Path.animatePuckPass(gridLayer, from, stopAt, { duration: 0.55, persist: true });
            await h.promise;
            await IceQ.Path.animateGoalConsequence(rink, { kind: 'intercepted', message: 'STICK IN THE LANE. DEAD PLAY.', duration: 0.9 });
            try { h.node.destroy(); } catch (e) {}
          } else {
            const h = IceQ.Path.animatePuckPass(gridLayer, from, toMan, { duration: 0.55 });
            await h.promise;
            const p = currentPlay();
            const netSide = p.slotMan.x >= 0 ? -1 : 1;
            const h2 = IceQ.Path.animatePuckPass(gridLayer, toMan, { x: toCanvasX(netSide * 2.2), y: toCanvasY(65.5) }, { duration: 0.22, persist: true });
            await h2.promise;
            try { IceQ.Audio && IceQ.Audio.goalAgainst && IceQ.Audio.goalAgainst(); } catch (e) {}
            await IceQ.Path.animateGoalConsequence(rink, { kind: 'goal', message: 'SLOT MAN, TAP-IN. GOAL AGAINST.', duration: 1.0 });
            try { h2.node.destroy(); } catch (e) {}
          }
          puckNodeCTM.visible(true); gridLayer.batchDraw();
        } catch (e) { try { puckNodeCTM && puckNodeCTM.visible(true); } catch (e2) {} }
      })();
    }

    function showCorrect() {
      const p = currentPlay();
      overlayLayer.destroyChildren();
      // Right-answer zone (gold)
      overlayLayer.add(new Konva.Circle({
        x: toCanvasX(p.coverTarget.x), y: toCanvasY(p.coverTarget.y),
        radius: COVER_TOL * scale,
        fill: 'rgba(224, 198, 138, 0.22)',
        stroke: '#E0C68A', strokeWidth: 2.5, dash: [6, 4],
        opacity: 0,
      })).to({ opacity: 1, duration: 0.4 });
      // "Cover here" label
      overlayLayer.add(new Konva.Text({
        x: toCanvasX(p.coverTarget.x) - 55,
        y: toCanvasY(p.coverTarget.y) - COVER_TOL * scale - 18,
        text: 'COVER HERE', width: 110, align: 'center',
        fontSize: 11, fontStyle: '800', fill: '#E0C68A',
        opacity: 0,
      })).to({ opacity: 1, duration: 0.4 });
      // Wrong-answer zone (red, smaller)
      overlayLayer.add(new Konva.Circle({
        x: toCanvasX(p.chaseZone.x), y: toCanvasY(p.chaseZone.y),
        radius: p.chaseZone.r * scale,
        fill: 'rgba(206, 32, 46, 0.15)',
        stroke: '#CE202E', strokeWidth: 1.5, dash: [4, 4],
        opacity: 0,
      })).to({ opacity: 1, duration: 0.4 });
      overlayLayer.add(new Konva.Text({
        x: toCanvasX(p.chaseZone.x) - 50,
        y: toCanvasY(p.chaseZone.y) + p.chaseZone.r * scale + 4,
        text: "DON'T CHASE", width: 100, align: 'center',
        fontSize: 10, fontStyle: '800', fill: '#CE202E',
        opacity: 0,
      })).to({ opacity: 1, duration: 0.4 });
      // Stick-on-stick lane: from cover spot toward slot man's stick
      overlayLayer.add(new Konva.Line({
        points: [
          toCanvasX(p.coverTarget.x), toCanvasY(p.coverTarget.y),
          toCanvasX(p.slotMan.x), toCanvasY(p.slotMan.y),
        ],
        stroke: '#E0C68A', strokeWidth: 1.5, dash: [3, 3], opacity: 0.7,
      }));
      overlayLayer.batchDraw();
      // Slide the defender sprite to the cover spot — Show Me becomes a
      // demonstration. Cancel any prior glide so a Show-Me/Reset/Show-Me
      // sequence doesn't stack tweens.
      if (defender) {
        cancelShowMeGlide();
        showMeGlideActive = true;
        defender.to({
          x: toCanvasX(p.coverTarget.x), y: toCanvasY(p.coverTarget.y),
          duration: 0.6, easing: Konva.Easings.EaseInOut,
          onFinish: () => { showMeGlideActive = false; },
        });
      }
    }

    function clearOverlay() {
      overlayLayer.destroyChildren();
      overlayLayer.batchDraw();
    }

    function resetDefender() {
      // Kill the Show-Me glide first — otherwise the snap-back tween fights
      // the glide and the sprite jitters.
      cancelShowMeGlide();
      defender.to({
        x: toCanvasX(DEFENDER_START.x),
        y: toCanvasY(DEFENDER_START.y),
        duration: 0.4, easing: Konva.Easings.EaseInOut,
      });
    }

    function nextPlay() {
      playIdx = (playIdx + 1) % PLAYS.length;
      clearScene();
      clearOverlay();
      drawOpponents();
      drawPuck();
      resetDefender();
      if (defender && defender.moveToTop) defender.moveToTop();   // YOU over the context sprites
      gridLayer.batchDraw();
      return { rushIdx: playIdx, rush: currentPlay(), totalRushes: PLAYS.length };
    }

    return {
      rink,
      consequence,
      check: evaluate,
      showMe: showCorrect,
      reset: () => { clearOverlay(); resetDefender(); },
      nextRush: nextPlay,
      currentRushInfo: () => ({ rushIdx: playIdx, rush: currentPlay(), totalRushes: PLAYS.length }),
      isDone: () => evaluate().cover,
    };
  }

  function phrasedFeedback(res) {
    if (res.cover) {
      return "You covered the slot man. The puck carrier has no easy passing option — your D-partner (D2) pressures the puck. That's how you actually take a goal away.";
    }
    if (res.nearButWrongSide) {
      return "Close, but you're on the wrong side of him: he is between you and the net. Get goal-side, stick on his blade.";
    }
    if (res.onGoalie) {
      return "You're standing on your goalie. Step out to the top of the crease, goal-side of the slot man, and let the goalie see the puck.";
    }
    if (res.chasing) {
      return "You chased the puck — and now the slot man is wide open for the cross-ice pass. D2 already had the carrier. Cover the receiver.";
    }
    return "You're between the two opponents but not really covering either. Get goal-side of the slot man with your stick on his blade; D2 has the carrier.";
  }

  return { init, phrasedFeedback, PLAYS };
})();
