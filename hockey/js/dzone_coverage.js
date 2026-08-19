// Scenario: Defensive Zone Coverage (from the 10U team playbook).
//
// The playbook page "Defensive Zone Coverage" teaches man-to-man in your zone
// with three rule-blocks:
//   1. Everybody  — protect the middle (the "Danger Zone"); cover your man.
//   2. Wingers    — stay UP on your point; help low only if you're SURE.
//   3. Centre & D — 3-man unit; only ONE D ever leaves the Danger Zone to
//                   attack the puck wide; the Centre never leaves it.
//
// Mechanic mirrors Cover-the-Man: ONE draggable Spartan ("YOU"), a gold
// cover-zone (right answer) and a red over-commit zone (the trap). Three plays
// rotate, one per rule-block. A faint red "Danger Zone" lens is drawn over the
// slot every play (mirrors the playbook's red-shaded middle) so the protected
// area is always visible.
//
// API matches Cover-the-Man exactly so main.js can wire it the same way:
//   init -> { rink, check, showMe, reset, nextRush, currentRushInfo, isDone }
//   + phrasedFeedback(res), PLAYS

window.IceQ = window.IceQ || {};

window.IceQ.DZoneCoverage = (function () {
  // Each play:
  //   key/label        — id + kid-facing situation label
  //   role             — which job YOU are this play (drives feedback)
  //   context[]        — non-draggable scene players ({x,y,color,label,stickSide,kind})
  //   puck             — {x,y} puck disc location
  //   coverTarget      — {x,y} where YOU should be (gold zone)
  //   chaseZone        — {x,y,r} the over-commit trap (red zone)
  //   start            — YOU's starting position
  // FIVE reads. The kid plays the same three jobs from the playbook (weak-side
  // D / winger-on-the-point / second-D), but the OFFENSE varies read-to-read —
  // your man shows up at the back post, then the high slot, then the strong
  // point, then the weak point, then the net-front. So the correct cover spot
  // FOLLOWS your man (a real read), instead of a memorized "stand here." Cover
  // = the defensive side of the puck (between your man and the net) with stick
  // on stick; the trap is puck-watching toward the corner.
  const PLAYS = [
    {
      key: 'weak-d-backpost',
      label: 'puck in the strong-side corner — you are the WEAK-SIDE D, your man is at the back post',
      role: 'weakD',
      context: [
        // Actually in the corner now: behind the goal line (y=64) and wide.
        { x:  30, y: 68, color: 'opponent', stickSide: 'L' },               // puck carrier, strong corner
        { x:  25, y: 64, color: 'spartan',  stickSide: 'R', label: 'D2' },  // partner angles him to the wall
        { x:  -7, y: 54, color: 'opponent', stickSide: 'R' },               // your man — at the BACK POST, top of the crease
      ],
      puck:        { x: 29, y: 69 },
      // Goal-side of him, stick in the lane, but NOT parked in the crease
      // (y 58-64): a D standing on his goalie is its own kind of wrong.
      coverTarget: { x: -5, y: 57 },
      // Trap sits in the open ice a puck-watching defender drifts into — NOT on
      // top of the partner who is correctly pressuring the puck.
      chaseZone:   { x: 13, y: 56, r: 9 },
      start:       { x:  0, y: 30 },
    },
    {
      key: 'weak-d-slot',
      label: 'same side — but now your man has crept up into the SLOT',
      role: 'weakD',
      context: [
        { x:  24, y: 57, color: 'opponent', stickSide: 'L' },               // puck carrier, deeper in the corner
        { x:  18, y: 55, color: 'spartan',  stickSide: 'R', label: 'D2' },  // partner pressures the puck
        { x:   3, y: 49, color: 'opponent', stickSide: 'R' },               // your man — snuck to the HIGH SLOT
      ],
      puck:        { x: 23, y: 58 },
      coverTarget: { x:  2, y: 53 },
      // Trap sits in the open ice a puck-watching defender drifts into — NOT on
      // top of the partner who is correctly pressuring the puck.
      chaseZone:   { x: 15, y: 46, r: 9 },
      start:       { x:  0, y: 30 },
    },
    {
      key: 'wing-point-strong',
      label: 'puck battled low — you are the strong-side WINGER, your man is the point',
      role: 'wing',
      context: [
        { x:  13, y:  9, color: 'opponent', stickSide: 'L' },               // your man — the strong-side POINT
        { x:  18, y: 61, color: 'opponent', stickSide: 'L' },               // low battle (their F)
        { x:  14, y: 58, color: 'spartan',  stickSide: 'R', label: 'D' },   // our D has the low man
      ],
      puck:        { x: 17, y: 62 },
      coverTarget: { x: 13, y: 17 },
      // Trap sits in the open ice a puck-watching defender drifts into — NOT on
      // top of the partner who is correctly pressuring the puck.
      chaseZone:   { x:  6, y: 46, r: 10 },
      start:       { x:  0, y: 28 },
    },
    {
      key: 'wing-point-weak',
      label: 'you are the WEAK-SIDE winger — your point man is across the ice',
      role: 'wing',
      context: [
        { x: -13, y:  9, color: 'opponent', stickSide: 'R' },               // your man — the WEAK-side POINT
        { x:  20, y: 61, color: 'opponent', stickSide: 'L' },               // strong-side battle
        { x:  16, y: 58, color: 'spartan',  stickSide: 'R', label: 'D' },   // our D low, strong side
      ],
      puck:        { x: 19, y: 62 },
      coverTarget: { x: -13, y: 17 },
      chaseZone:   { x:   2, y: 42, r: 12 },
      start:       { x:   0, y: 28 },
    },
    {
      key: 'one-d-goes',
      label: 'puck in the corner — your partner already went, cover the net-front',
      role: 'secondD',
      context: [
        { x:  26, y: 65, color: 'spartan',  stickSide: 'R', label: 'D1' },  // partner already on the puck
        // A corner puck is BEHIND the goal line (y>64) and wide. At (24,61) this
        // man wasn't in the corner at all, he was in a shooting position 24 ft
        // out — which is a different read with a different answer.
        { x:  31, y: 69, color: 'opponent', stickSide: 'L' },               // their corner man
        { x:   1, y: 52, color: 'opponent', stickSide: 'L' },               // net-front man in the slot — your man
      ],
      puck:        { x: 30, y: 68 },
      // Goal-side of the net-front man at the top of the crease, not IN it.
      coverTarget: { x:  0, y: 56 },
      // Was centred on (21,59) — the EXACT coordinates of our own D1. The lesson
      // is "only one D goes," and the red DON'T-OVER-COMMIT ring was drawn on
      // top of the partner who correctly went. Now it marks the open ice the
      // second D actually drifts into when he over-commits.
      chaseZone:   { x: 17, y: 57, r: 9 },
      start:       { x: -8, y: 34 },
    },
  ];

  const COVER_TOL = 9;

  // Danger-zone lens polygon (feet). Wide across the tops of the circles,
  // narrowing toward the net at the goal line — the high-danger slot.
  const DANGER_POLY = [
    -9, 47,   9, 47,   5, 63,  -5, 63,
  ];

  function init(rinkContainer) {
    const rink = IceQ.Rink.create(rinkContainer);
    if (rink.labelNet) rink.labelNet('ours');   // zone cue: whose net is this
    const { toCanvasX, toCanvasY, scale, overlayLayer, gridLayer } = rink;

    let playIdx = 0;
    // Variety without changing the read (Will 2026-08-18): each visit is the
    // authored side or its mirror image. Every read here is left/right
    // symmetric in meaning, so flipping x (and stick sides) keeps the lesson
    // and changes the picture. Data is mirrored, not the transform, so
    // evaluate() keeps comparing like with like.
    const MIRROR = Math.random() < 0.5;
    const flipSide = (sd) => (sd === 'L' ? 'R' : sd === 'R' ? 'L' : sd);
    const mx = (o) => o ? Object.assign({}, o, { x: -o.x }) : o;
    const ACTIVE_PLAYS = MIRROR ? PLAYS.map(pl => Object.assign({}, pl, {
      context: (pl.context || []).map(c => Object.assign({}, c, { x: -c.x, stickSide: flipSide(c.stickSide) })),
      puck: mx(pl.puck), coverTarget: mx(pl.coverTarget),
      chaseZone: mx(pl.chaseZone), start: mx(pl.start),
    })) : PLAYS;
    function currentPlay() { return ACTIVE_PLAYS[playIdx]; }

    let defender = null;
    let sceneNodes = [];   // context players + puck + danger lens — cleared on nextPlay
    let showMeGlideActive = false;

    function cancelShowMeGlide() {
      if (showMeGlideActive && defender && defender.getTween && defender.getTween()) {
        try { defender.getTween().pause(); } catch (e) { /* ignore */ }
        try { defender.getTween().destroy(); } catch (e) { /* ignore */ }
      }
      showMeGlideActive = false;
    }

    function drawDangerZone() {
      const pts = [];
      for (let i = 0; i < DANGER_POLY.length; i += 2) {
        pts.push(toCanvasX(DANGER_POLY[i]), toCanvasY(DANGER_POLY[i + 1]));
      }
      const lens = new Konva.Line({
        points: pts, closed: true,
        fill: 'rgba(206, 32, 46, 0.12)',
        stroke: 'rgba(206, 32, 46, 0.35)', strokeWidth: 1.2, dash: [5, 4],
        listening: false,
      });
      const lbl = new Konva.Text({
        x: toCanvasX(-9), y: toCanvasY(48),
        width: 18 * scale, align: 'center',
        text: 'DANGER ZONE', fontSize: Math.max(8, scale * 1.1),
        fontStyle: '800', fill: 'rgba(206, 32, 46, 0.65)',
        listening: false,
      });
      gridLayer.add(lens, lbl);
      sceneNodes.push(lens, lbl);
    }

    // Puck ON the blade of whichever opponent is holding it (the context
    // player nearest the authored puck spot), via the sprite geometry, and
    // drawn after the players so it is never under a sweater.
    function drawPuck() {
      const p = currentPlay();
      let pos = { x: toCanvasX(p.puck.x), y: toCanvasY(p.puck.y) };
      let best = null, bestD = Infinity;
      sceneNodes.forEach(n => {
        if (!n.getAttr || n.getAttr('iceqKind') !== 'skater') return;
        const d = Math.hypot(n.x() - pos.x, n.y() - pos.y);
        if (d < bestD) { bestD = d; best = n; }
      });
      if (best && bestD < scale * 8) pos = IceQ.Player.puckPosFor(best);
      const puck = new Konva.Circle({
        x: pos.x, y: pos.y,
        radius: Math.max(5, scale * 0.7),
        fill: '#0A0A0A', stroke: '#E0C68A', strokeWidth: 1.5,
        listening: false,
      });
      gridLayer.add(puck);
      sceneNodes.push(puck);
    }

    function drawContext() {
      const p = currentPlay();
      p.context.forEach(o => {
        const node = IceQ.Player.create({
          x: toCanvasX(o.x), y: toCanvasY(o.y),
          scale: Math.max(0.55, scale * (o.label ? 0.075 : 0.07)),
          color: o.color, stickSide: o.stickSide || 'L',
          label: o.label || '', kind: o.kind || 'skater',
        });
        if (o.color === 'spartan') IceQ.Player.face(node, 'y-');   // our D face the play, not our goalie
        gridLayer.add(node);
        sceneNodes.push(node);
      });
    }

    function drawGoalie() {
      const g = IceQ.Player.create({
        x: toCanvasX(0), y: toCanvasY(62.5),
        scale: Math.max(0.6, scale * 0.08), color: 'spartan', kind: 'goalie',
      });
      IceQ.Player.face(g, 'y-');   // our goalie, facing the play
      gridLayer.add(g);
      sceneNodes.push(g);
    }
    function drawScene() {
      drawDangerZone();
      drawGoalie();
      drawContext();
      drawPuck();
    }

    function clearScene() {
      sceneNodes.forEach(n => { try { n.destroy(); } catch (e) {} });
      sceneNodes = [];
    }

    function drawDefender() {
      const p = currentPlay();
      defender = IceQ.Player.create({
        x: toCanvasX(p.start.x), y: toCanvasY(p.start.y),
        scale: Math.max(0.65, scale * 0.085),
        color: 'spartan', label: 'YOU', stickSide: 'L',
        draggable: true,
      });
      IceQ.Player.face(defender, 'y-');
      defender.on('dragmove', () => {
        const pos = defender.position();
        const minX = toCanvasX(-40), maxX = toCanvasX(40);
        const minY = toCanvasY(2),   maxY = toCanvasY(72);
        defender.x(Math.max(minX, Math.min(maxX, pos.x)));
        defender.y(Math.max(minY, Math.min(maxY, pos.y)));
      });
      defender.on('dragstart', () => { cancelShowMeGlide(); });
      gridLayer.add(defender);
    }

    drawScene();
    drawDefender();
    gridLayer.batchDraw();

    function evaluate() {
      const p = currentPlay();
      const pos = defender.position();
      const xFt = (pos.x - rink.width / 2) / scale;
      const yFt = pos.y / scale;
      const distToCover = Math.hypot(xFt - p.coverTarget.x, yFt - p.coverTarget.y);
      const distToChase = Math.hypot(xFt - p.chaseZone.x, yFt - p.chaseZone.y);
      // For the net-front roles, "cover" also means goal-side of your man
      // and not parked on the goalie (QC 2026-08-18: the circle alone passed
      // a kid standing ABOVE his man, and a kid standing in the crease).
      const man = (p.role === 'weakD' || p.role === 'secondD') ? p.context[2] : null;
      const goalSide = !man || yFt >= man.y + 1;
      const inCrease = !!man && yFt > 58 && Math.abs(xFt) < 6;
      return {
        cover: distToCover <= COVER_TOL && goalSide && !inCrease,
        nearButWrongSide: distToCover <= COVER_TOL && !goalSide,
        onGoalie: distToCover <= COVER_TOL && goalSide && inCrease,
        chasing: distToChase <= p.chaseZone.r,
        distToCover, distToChase,
        role: p.role,
        playLabel: p.label,
      };
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
      overlayLayer.add(new Konva.Text({
        x: toCanvasX(p.coverTarget.x) - 55,
        y: toCanvasY(p.coverTarget.y) - COVER_TOL * scale - 18,
        text: 'STAND HERE', width: 110, align: 'center',
        fontSize: 11, fontStyle: '800', fill: '#E0C68A',
        opacity: 0,
      })).to({ opacity: 1, duration: 0.4 });
      // Wrong-answer zone (red)
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
        text: "DON'T OVER-COMMIT", width: 100, align: 'center',
        fontSize: 10, fontStyle: '800', fill: '#CE202E',
        opacity: 0,
      })).to({ opacity: 1, duration: 0.4 });
      overlayLayer.batchDraw();
      // Glide YOU to the cover spot — Show Me demonstrates.
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
      cancelShowMeGlide();
      const p = currentPlay();
      defender.to({
        x: toCanvasX(p.start.x), y: toCanvasY(p.start.y),
        duration: 0.4, easing: Konva.Easings.EaseInOut,
      });
    }

    function nextPlay() {
      playIdx = (playIdx + 1) % PLAYS.length;
      clearScene();
      clearOverlay();
      drawScene();
      resetDefender();
      gridLayer.batchDraw();
      return { rushIdx: playIdx, rush: currentPlay(), totalRushes: PLAYS.length };
    }

    return {
      rink,
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
      switch (res.role) {
        case 'weakD':
          return "That's goal-side of your man — you're between him and the net with stick on stick in his lane. D2 has the puck-carrier, so you are not puck-watching. The back-door tap-in is dead.";
        case 'wing':
          return "Good gap — you held the point in his shooting lane. The Centre and D own the slot; your check is the point, so you take away his shot. That's man-to-man in your zone.";
        case 'secondD':
          return "You held the slot — goal-side of the net-front man. Only ONE D leaves the Danger Zone; your partner pressured the puck, so you stay home, stick on stick. The middle is covered.";
        default:
          return "Good — goal-side of your man, stick on stick, he can't get to the net.";
      }
    }
    if (res.nearButWrongSide) {
      return "Close, but you're on the wrong side of your man: he is between you and the net. Get goal-side of him, stick on stick, and he has to go through you.";
    }
    if (res.onGoalie) {
      return "You're standing on your goalie. Step out to the top of the crease, goal-side of your man, so the goalie can see the puck.";
    }
    if (res.chasing) {
      switch (res.role) {
        case 'weakD':
          return "You went puck-watching toward the corner — but D2 already has the carrier. Your man slipped to the back door on the wrong side of you. Get goal-side of him: between him and the net, stick on stick.";
        case 'wing':
          return "You sank low — now your point man has a wide-open one-timer. Some teams let the weak-side wing sag; in OUR system wingers hold their point and keep the gap up the ice, unless you're SURE you can recover.";
        case 'secondD':
          return "Both D chased the corner — now the net-front man is alone in the slot with nobody on the defensive side. Only one D goes; the other holds the middle, stick on stick.";
        default:
          return "You over-committed and lost your man. Find him, get goal-side, stick on stick.";
      }
    }
    if (res.role === 'wing') return "You're in between. Your check is the point man: get back up into his shooting lane and keep your gap.";
    return "You're in between. Not on your man, not protecting the middle. Find your check first, get goal-side of him, stick on stick.";
  }

  return { init, phrasedFeedback, PLAYS };
})();
