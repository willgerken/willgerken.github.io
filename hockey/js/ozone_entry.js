// Scenario: Offensive Zone Entry — Middle Lane Drive (from Coach's Aug 2 video
// session: "Puck Protection / Offensive Zone Entry / Middle Lane Drive /
// Weakside D joining rush for 4th attacker").
//
// The app's first OFFENSIVE transition game. Everything else teaches what to do
// without the puck defensively; this teaches what to do without the puck on the
// rush — which is where 10U hockey turns into a follow-the-puck swarm.
//
// Two ideas, four reads:
//   MIDDLE LANE DRIVE — when our carrier attacks wide, the second forward drives
//     the MIDDLE lane hard to the net. He does not follow the puck (two players
//     in one lane = one defender covers both) and he does not curl and hover at
//     the top of the circle. Driving the middle occupies the weak-side D, opens
//     the seam behind him, and puts a body at the net for the rebound.
//   WEAK-SIDE D AS 4th ATTACKER — when the entry is clean and the middle lane is
//     already filled, the weak-side D joins late into the high slot as a trailer.
//     But it's a READ, not a rule: if you're the last man back and their winger
//     is leaking, you stay. Read 4 exists to stop kids from turning read 3 into
//     an always.
//
// Mechanic mirrors dzone_coverage (ONE draggable "YOU", gold target zone, red
// trap zone) + the breakout_reads teach-first Watch walkthrough + a contrast
// replay on a wrong answer (your way -> it dies -> BUT INSTEAD -> goal).
//
// Rink read as the OFFENSIVE zone: blue line y=0 at the top, we attack the
// bottom net (same convention as ozone_faceoff).
//
// API: init -> { rink, check, showMe, reset, nextRush, currentRushInfo,
//                goToRead, playReveal, showContrastReplay, isDone }
//      + phrasedFeedback(res), PLAYS

window.IceQ = window.IceQ || {};

window.IceQ.OzoneEntry = (function () {
  // Each read:
  //   role         — which job YOU have (drives feedback): f2drive | dJoin | dStay
  //   label        — kid-facing situation line
  //   cue          — the one-line situation shown above the rink during the test
  //   teach        — the one-line coaching point narrated during the Watch demo
  //   context[]    — non-draggable scene players
  //   puck         — puck disc spot
  //   start        — YOU's starting position
  //   coverTarget  — where YOU should end up (gold zone)
  //   chaseZone    — the trap (red zone)
  //   youRoute     — feet polyline of the route YOU should skate (demo arrow)
  //   rightPuck    — feet polyline the puck travels when you got it right
  //   wrongPuck    — feet polyline the puck travels when you got it wrong
  //   rightMsg / wrongMsg — consequence banner text
  const PLAYS = [
    {
      key: 'mld-right',
      role: 'f2drive',
      label: 'we enter wide RIGHT — you are F2, the second forward',
      cue: "F1 is carrying wide up the right wall. You're F2. Where do you go?",
      teach: "Middle Lane Drive — F1 has the wall, so you take the MIDDLE and drive it hard to the net. Don't follow the puck.",
      context: [
        { x:  34, y: 12, color: 'spartan',  label: 'F1', stickSide: 'R' },  // our carrier, genuinely wide
        { x: -26, y: 12, color: 'spartan',  label: 'F3', stickSide: 'L' },  // far lane filled
        { x:  29, y: 24, color: 'opponent', stickSide: 'L' },               // their strong-side D
        { x: -16, y: 30, color: 'opponent', stickSide: 'R' },               // their weak-side D
        { x:   0, y: 62.5, color: 'opponent', kind: 'goalie' },
      ],
      // Puck sits on the carrier's STICK side. player.js draws stickSide 'R'
      // toward +x, so a puck at -x of a right-stick carrier is on his backhand,
      // floating by his hip with the blade pointed at empty ice. It also
      // inverted the puck-protection point: a right shot going wide right
      // shields the puck on the WALL side, body between puck and the defender.
      puck:        { x: 37, y: 14 },
      start:       { x: 16, y: 2 },
      coverTarget: { x:  0, y: 50 },
      // Sits between the middle lane and the wall — the drift-out-to-the-puck
      // trap — WITHOUT covering F1 himself. (Moving the carrier out to a genuine
      // wide entry at x=34 left the old (26,20,r=12) circle sitting 11.3 ft from
      // him, i.e. the red DON'T-GO-HERE ring drawn over our own puck carrier.)
      chaseZone:   { x: 24, y: 30, r: 9 },
      youRoute:    [ [16, 2], [8, 22], [2, 38], [0, 50] ],
      // Scoring paths now END IN THE NET (goal line y=64, net interior to 67.5).
      // They used to stop at y=62-63 and fire the green GOAL! banner with the
      // puck visibly sitting a foot or two outside.
      rightPuck:   [ [37, 14], [34, 34], [2, 50], [0, 66] ],
      wrongPuck:   [ [37, 14], [38, 40], [36, 58], [22, 68], [-10, 70], [-32, 56] ],
      rightMsg:    'GOAL!',
      wrongMsg:    'NOBODY AT THE NET',
    },
    {
      key: 'mld-left',
      role: 'f2drive',
      label: 'we enter wide LEFT — same job, other side',
      cue: "Now F1 carries wide up the LEFT wall. Same job, mirrored. Where do you go?",
      teach: "The middle lane is the middle lane no matter which side the puck is on. Don't curl and hover at the top of the circle — drive it.",
      context: [
        { x: -34, y: 12, color: 'spartan',  label: 'F1', stickSide: 'L' },  // our carrier, genuinely wide
        { x:  26, y: 12, color: 'spartan',  label: 'F3', stickSide: 'R' },  // far lane filled
        { x: -29, y: 24, color: 'opponent', stickSide: 'R' },               // their strong-side D
        { x:  16, y: 30, color: 'opponent', stickSide: 'L' },               // their weak-side D
        { x:   0, y: 62.5, color: 'opponent', kind: 'goalie' },
      ],
      puck:        { x: -37, y: 14 },
      start:       { x: -14, y: 2 },
      coverTarget: { x:   0, y: 52 },
      // The trap here is "curled and hovered at the top of the circle," so it
      // belongs on the PUCK side. At (-2,24,r=11) it sat directly on the
      // correct route: waypoint (-8,24) was 6 ft inside it, so Show Me drew a
      // red DON'T-GO-HERE circle and then glided YOU straight through it.
      chaseZone:   { x: -16, y: 30, r: 8 },
      youRoute:    [ [-14, 2], [-8, 24], [-2, 40], [0, 52] ],
      rightPuck:   [ [-37, 14], [-34, 34], [-2, 52], [0, 66] ],
      wrongPuck:   [ [-37, 14], [-34, 30], [-20, 26], [2, 16], [18, 4] ],
      rightMsg:    'GOAL!',
      wrongMsg:    'TURNOVER',
    },
    {
      key: 'd-join',
      role: 'dJoin',
      label: 'clean entry, middle lane filled — you are the WEAK-SIDE D',
      cue: "Clean entry. F2 already has the middle lane and your partner D is back. You're the weak-side D. Now what?",
      teach: "Middle lane's filled and your partner is staying home behind you — so you JOIN as the 4th attacker, late into the high slot. Four attackers beat two defenders. (This is a WITH-the-puck rule in THEIR end. Back in our end, D-Zone rules: one D leaves the middle, and only to the puck.)",
      context: [
        { x:  29, y: 24, color: 'spartan',  label: 'F1', stickSide: 'R' },  // carrier wide right
        { x:   2, y: 44, color: 'spartan',  label: 'F2', stickSide: 'R' },  // middle lane driver
        { x: -24, y: 26, color: 'spartan',  label: 'F3', stickSide: 'L' },  // far lane
        { x:  10, y:  4, color: 'spartan',  label: 'D',  stickSide: 'R' },  // partner D stays home
        { x:  20, y: 34, color: 'opponent', stickSide: 'L' },
        // Their weak-side D collapses to the net front — which is exactly what
        // OPENS the high slot for a trailer. He was at (-6,40), 8 ft from the
        // spot the app calls "free offense."
        { x:  -9, y: 50, color: 'opponent', stickSide: 'R' },
        { x:   0, y: 62.5, color: 'opponent', kind: 'goalie' },
      ],
      puck:        { x: 32, y: 26 },
      start:       { x: -14, y: 2 },
      // High slot at 10U is y=40-46, not 32. y=32 is above the tops of the
      // circles — a 10U kid does not score from 32 ft through traffic.
      coverTarget: { x:  -3, y: 42 },
      // Trap moved off the start: YOU used to spawn 2.2 ft INSIDE it, so
      // evaluate() returned chasing:true before the kid touched anything and
      // Show Me painted "DON'T GO HERE" on top of his own token.
      chaseZone:   { x: -24, y: 4, r: 7 },
      youRoute:    [ [-14, 2], [-12, 18], [-7, 32], [-3, 42] ],
      rightPuck:   [ [32, 26], [12, 32], [-3, 42], [0, 66] ],
      wrongPuck:   [ [32, 26], [34, 44], [34, 60], [16, 68] ],
      rightMsg:    'GOAL — 4th ATTACKER!',
      wrongMsg:    'RUSH DIES',
    },
    {
      key: 'd-stay',
      role: 'dStay',
      label: 'you are the LAST MAN BACK and their winger is sneaking up the ice early',
      cue: "Your partner D already pinched deep, so you're the last man back — and their winger is sneaking up the ice early for a breakaway. Do you join?",
      teach: "Same picture, opposite answer. You're the last man back and their winger is sneaking up the ice early, so you STAY. The 4th attacker is a read, not a rule.",
      context: [
        { x: -26, y: 24, color: 'spartan',  label: 'F1', stickSide: 'L' },  // carrier wide left
        { x:  -2, y: 46, color: 'spartan',  label: 'F2', stickSide: 'R' },  // middle lane driver
        { x:  22, y: 30, color: 'spartan',  label: 'F3', stickSide: 'R' },  // far lane
        { x: -30, y: 44, color: 'spartan',  label: 'D',  stickSide: 'L' },  // partner ALREADY pinched
        { x: -20, y: 36, color: 'opponent', stickSide: 'R' },
        { x:   4, y: 42, color: 'opponent', stickSide: 'L' },
        { x:  23, y:  4, color: 'opponent', stickSide: 'R' },               // their winger, sneaking up early
        { x:   0, y: 62.5, color: 'opponent', kind: 'goalie' },
      ],
      puck:        { x: -37, y: 28 },
      start:       { x:  2, y: 8 },
      // Inside and a stride higher than the winger sneaking out — the correct
      // inside-out gap. (Was 14,4, which put the acceptance circle right on top
      // of the opponent, so a kid could drop YOU on his head and be told he
      // read it correctly.)
      coverTarget: { x: 12, y: 3 },
      // THE POINT of this read is deciding NOT to go. A point-target with a 9 ft
      // tolerance marked a kid wrong for doing exactly that: start is 12.65 ft
      // from coverTarget, so reading it right, staying put, and hitting Check
      // scored "Not quite." You cannot test an inhibitory decision with a
      // mechanic that requires a motor action to register. So staying back
      // anywhere above the band PASSES; getting over to the winger sneaking up early's
      // side is the stronger version and gets its own feedback.
      coverBand:   { maxY: 14 },
      // Was (0,34,r=13), which drew the red "DON'T JUMP" circle on top of our
      // own F2 at (-2,46) — 12.2 ft away — i.e. over a teammate doing the right
      // thing. Now 16 ft clear of him.
      chaseZone:   { x:  0, y: 30, r: 10 },
      youRoute:    [ [2, 8], [7, 5], [12, 3] ],
      rightPuck:   [ [-37, 28], [-20, 40], [-2, 28], [10, 8] ],
      wrongPuck:   [ [-37, 28], [-14, 36], [6, 20], [26, 5], [34, 1] ],
      rightMsg:    'YOU KILLED IT',
      wrongMsg:    'BREAKAWAY AGAINST',
    },
  ];

  const COVER_TOL = 9;

  function init(rinkContainer) {
    const rink = IceQ.Rink.create(rinkContainer);
    if (rink.labelNet) rink.labelNet('theirs');   // zone cue: whose net is this
    const { toCanvasX, toCanvasY, scale, overlayLayer, gridLayer } = rink;

    let playIdx = 0;
    function currentPlay() { return PLAYS[playIdx]; }

    let you = null;
    let sceneNodes = [];
    // Skip signal of the contrast currently running (if any). travelPuck /
    // skateRoute / the two replays check it after every await, so tapping Skip
    // actually CANCELS the play instead of just returning control while
    // banners keep landing on the retry screen (2026-08-18 audit).
    let activeSig = null;
    const skipped = () => !!(activeSig && activeSig.skipped);
    let f1Node = null;       // our puck carrier (context player labelled F1)
    let puckNode = null;     // the static puck on his blade
    let showMeGlideActive = false;

    function cancelShowMeGlide() {
      if (showMeGlideActive && you && you.getTween && you.getTween()) {
        try { you.getTween().pause(); } catch (e) {}
        try { you.getTween().destroy(); } catch (e) {}
      }
      showMeGlideActive = false;
    }

    // The three attacking lanes, drawn faintly every read. The whole scenario is
    // "stay in YOUR lane on the rush", so the lanes are always visible — same
    // idea as the Danger Zone lens on D-Zone Coverage.
    function drawLanes() {
      const laneEdges = [-14, 14];
      laneEdges.forEach(xf => {
        const ln = new Konva.Line({
          points: [toCanvasX(xf), toCanvasY(0), toCanvasX(xf), toCanvasY(64)],
          stroke: 'rgba(224, 198, 138, 0.30)', strokeWidth: 1.2, dash: [6, 6],
          listening: false,
        });
        gridLayer.add(ln);
        sceneNodes.push(ln);
      });
      const lbl = new Konva.Text({
        x: toCanvasX(-14), y: toCanvasY(2),
        width: 28 * scale, align: 'center',
        text: 'MIDDLE LANE', fontSize: Math.max(8, scale * 1.05),
        fontStyle: '800', fill: 'rgba(224, 198, 138, 0.7)',
        listening: false,
      });
      gridLayer.add(lbl);
      sceneNodes.push(lbl);
    }

    // The puck sits on F1's blade (Player.puckPosFor), drawn AFTER the players
    // so it is never under a sweater. p.puck is only a fallback if a play has
    // no F1. (Read 4's authored puck was 11.7 ft from anybody: an orphan.)
    function drawPuck() {
      const p = currentPlay();
      const pos = f1Node ? IceQ.Player.puckPosFor(f1Node) : { x: toCanvasX(p.puck.x), y: toCanvasY(p.puck.y) };
      puckNode = new Konva.Circle({
        x: pos.x, y: pos.y,
        radius: Math.max(5, scale * 0.7),
        fill: '#0A0A0A', stroke: '#E0C68A', strokeWidth: 1.5,
        listening: false,
      });
      gridLayer.add(puckNode);
      sceneNodes.push(puckNode);
    }

    // We are attacking DOWN the canvas (their net at y=64), so our sprites keep
    // the authored +y facing; their skaters and goalie face us ('y-').
    function drawContext() {
      f1Node = null;
      currentPlay().context.forEach(o => {
        const node = IceQ.Player.create({
          x: toCanvasX(o.x), y: toCanvasY(o.y),
          scale: Math.max(0.55, scale * (o.label ? 0.075 : 0.07)),
          color: o.color, stickSide: o.stickSide || 'L',
          label: o.label || '', kind: o.kind || 'skater',
        });
        if (o.color === 'opponent') IceQ.Player.face(node, 'y-');
        if (o.label === 'F1') f1Node = node;
        gridLayer.add(node);
        sceneNodes.push(node);
      });
    }

    function drawScene() {
      drawLanes();
      drawContext();
      drawPuck();
    }

    function clearScene() {
      sceneNodes.forEach(n => { try { n.destroy(); } catch (e) {} });
      sceneNodes = [];
    }

    function clearOverlay() {
      overlayLayer.destroyChildren();
      overlayLayer.batchDraw();
    }

    function drawYou() {
      const p = currentPlay();
      you = IceQ.Player.create({
        x: toCanvasX(p.start.x), y: toCanvasY(p.start.y),
        scale: Math.max(0.65, scale * 0.085),
        color: 'spartan', label: 'YOU', stickSide: 'L',
        draggable: true,
      });
      you.on('dragmove', () => {
        const pos = you.position();
        const minX = toCanvasX(-40), maxX = toCanvasX(40);
        const minY = toCanvasY(2),   maxY = toCanvasY(70);
        you.x(Math.max(minX, Math.min(maxX, pos.x)));
        you.y(Math.max(minY, Math.min(maxY, pos.y)));
      });
      you.on('dragstart', () => { cancelShowMeGlide(); });
      gridLayer.add(you);
    }

    drawScene();
    drawYou();
    gridLayer.batchDraw();

    function evaluate() {
      const p = currentPlay();
      const pos = you.position();
      const xFt = (pos.x - rink.width / 2) / scale;
      const yFt = pos.y / scale;
      const distToCover = Math.hypot(xFt - p.coverTarget.x, yFt - p.coverTarget.y);
      const distToChase = Math.hypot(xFt - p.chaseZone.x, yFt - p.chaseZone.y);
      const chasing = distToChase <= p.chaseZone.r;
      const onSpot = distToCover <= COVER_TOL;
      // A banded read passes anywhere in the band that isn't the trap — see the
      // note on `coverBand` above. Point reads keep the tight tolerance.
      const cover = p.coverBand
        ? (yFt <= p.coverBand.maxY && !chasing)
        : onSpot;
      return {
        cover,
        chasing,
        onSpot,                 // banded reads: did they also find the best spot?
        banded: !!p.coverBand,
        distToCover, distToChase,
        role: p.role,
        readKey: p.key,
        playLabel: p.label,
      };
    }

    function showCorrect() {
      const p = currentPlay();
      clearOverlay();
      // Right-answer zone (gold)
      overlayLayer.add(new Konva.Circle({
        x: toCanvasX(p.coverTarget.x), y: toCanvasY(p.coverTarget.y),
        radius: COVER_TOL * scale,
        fill: 'rgba(224, 198, 138, 0.22)',
        stroke: '#E0C68A', strokeWidth: 2.5, dash: [6, 4],
        opacity: 0, listening: false,
      })).to({ opacity: 1, duration: 0.4 });
      overlayLayer.add(new Konva.Text({
        x: toCanvasX(p.coverTarget.x) - 55,
        // Label goes BELOW the zone when the zone is near the top of the ice.
        // Above-only put read 4's label at y=-39px (COVER_TOL*scale always
        // exceeds coverTarget.y*scale up there), so "STAY BACK" rendered
        // off-canvas at every screen size and most of the gold circle was cut off.
        y: p.coverTarget.y < 16
             ? toCanvasY(p.coverTarget.y) + COVER_TOL * scale + 6
             : toCanvasY(p.coverTarget.y) - COVER_TOL * scale - 18,
        text: p.role === 'dStay' ? 'STAY BACK' : 'DRIVE HERE',
        width: 110, align: 'center',
        fontSize: 11, fontStyle: '800', fill: '#E0C68A',
        opacity: 0, listening: false,
      })).to({ opacity: 1, duration: 0.4 });
      // Wrong-answer zone (red)
      overlayLayer.add(new Konva.Circle({
        x: toCanvasX(p.chaseZone.x), y: toCanvasY(p.chaseZone.y),
        radius: p.chaseZone.r * scale,
        fill: 'rgba(206, 32, 46, 0.15)',
        stroke: '#CE202E', strokeWidth: 1.5, dash: [4, 4],
        opacity: 0, listening: false,
      })).to({ opacity: 1, duration: 0.4 });
      overlayLayer.add(new Konva.Text({
        x: toCanvasX(p.chaseZone.x) - 50,
        y: toCanvasY(p.chaseZone.y) + p.chaseZone.r * scale + 4,
        text: p.role === 'dStay' ? "DON'T JUMP" : "DON'T GO HERE",
        width: 100, align: 'center',
        fontSize: 10, fontStyle: '800', fill: '#CE202E',
        opacity: 0, listening: false,
      })).to({ opacity: 1, duration: 0.4 });
      overlayLayer.batchDraw();
      // Glide YOU along the route — Show Me demonstrates the skate, not just the spot.
      if (you) {
        cancelShowMeGlide();
        showMeGlideActive = true;
        you.to({
          x: toCanvasX(p.coverTarget.x), y: toCanvasY(p.coverTarget.y),
          duration: 0.7, easing: Konva.Easings.EaseInOut,
          onFinish: () => { showMeGlideActive = false; },
        });
      }
    }

    // Gold route arrow for YOUR skate (used by the Watch demo + Show Me).
    function drawRouteArrow() {
      const p = currentPlay();
      const pts = [];
      p.youRoute.forEach(([x, y]) => { pts.push(toCanvasX(x), toCanvasY(y)); });
      const arrow = new Konva.Arrow({
        points: pts,
        stroke: '#E0C68A', fill: '#E0C68A',
        strokeWidth: 3, pointerLength: 11, pointerWidth: 11,
        lineJoin: 'round', tension: 0.3, opacity: 0, listening: false,
      });
      overlayLayer.add(arrow);
      arrow.to({ opacity: 0.95, duration: 0.35 });
      overlayLayer.batchDraw();
      return arrow;
    }

    // Animation pacing. A 10U playtester called the first cut
    // "slow-mo, like a screensaver moving across a lock screen — real hockey
    // looks like everybody's flying," and said that's why the Watch demo looked
    // boring before he even skipped it. So: every leg is timed off its ACTUAL
    // distance at a plausible rate instead of a flat per-segment duration. Short
    // legs snap, long legs carry, and nothing crawls. Puck moves faster than a
    // skater, same as real life.
    // Rates are per-EVENT, because a puck on a stick, a pass, and a shot are
    // three different physical things and one constant can't serve all three.
    // (Earlier cut used a single 78 ft/s for all of them AND a 0.30s ceiling —
    // which every leg hit, so nothing was actually distance-proportional and,
    // worse, the ceiling made LONGER legs faster: the 50 ft middle-lane drive
    // delivered at 38 mph with the skater visibly accelerating as the leg grew.
    // That's how the first fix for "it looks like a screensaver" overshot into
    // teleport.) 10U reality: skating tops out ~15-17 mph, a firm pass is
    // ~29 mph, a wrist shot ~41 mph.
    const CARRY_FTPS = 18;   // puck on a stick — moves at skating speed
    const PASS_FTPS  = 42;   // a firm 10U pass
    const SHOT_FTPS  = 60;   // a 10U wrist shot
    const SKATE_FTPS = 18;   // a kid driving a lane at full tilt
    const LEG_MIN = 0.15, LEG_MAX = 1.20;
    function legDuration(a, b, ftps, min, max) {
      const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
      return Math.max(min == null ? LEG_MIN : min,
                      Math.min(max == null ? LEG_MAX : max, dist / ftps));
    }
    // A puck leg is a carry while it's still on the carrier's stick, a shot on
    // the final leg into the net, and a pass in between. The audible-to-the-eye
    // speed change between carry and pass is itself the teaching cue: it's how
    // a kid's eye learns the puck just left a stick.
    function puckLegRate(feetPts, i) {
      const isLast = i === feetPts.length - 1;
      if (isLast && feetPts[i][1] >= 60) return SHOT_FTPS;
      return i === 1 ? CARRY_FTPS : PASS_FTPS;
    }

    // Send a puck down a feet-polyline. Timing driven by IceQ.Path.wait (NOT
    // tween onFinish) so a throttled rAF can't stall the demo loop.
    // The STATIC puck is the one that travels (no second puck on the ice), it
    // starts on F1's blade, F1 skates the first (carry) leg with it on his
    // stick, then it leaves the stick for the pass/shot legs. Only the final
    // leg eases out; a pass does not stop dead at every vertex.
    async function travelPuck(feetPts, opts) {
      opts = opts || {};
      if (!feetPts || feetPts.length < 2 || typeof Konva === 'undefined') return;
      const puck = puckNode;
      if (!puck) return;
      const pts = feetPts.map(([x, y]) => ({ x: toCanvasX(x), y: toCanvasY(y) }));
      const f1 = f1Node;
      const f1Start = f1 ? f1.position() : null;
      const puckStart = puck.position();
      const off = f1 ? { x: puckStart.x - f1Start.x, y: puckStart.y - f1Start.y } : null;
      if (opts.stroke) puck.stroke(opts.stroke);
      for (let i = 1; i < pts.length; i++) {
        const rate = puckLegRate(feetPts, i);
        const d = legDuration(feetPts[i - 1], feetPts[i], rate);
        const last = i === pts.length - 1;
        const easing = last ? Konva.Easings.EaseOut : Konva.Easings.Linear;
        // Scene may have been rebuilt mid-play (Next / Reset / route away):
        // never tween a detached node (Konva logs an error).
        if (puck.isDestroyed() || !puck.getLayer()) return;
        if (i === 1 && f1 && rate === CARRY_FTPS && !f1.isDestroyed()) {
          // Carry: F1 moves so his blade follows the route; puck rides along.
          f1.to({ x: pts[i].x - off.x, y: pts[i].y - off.y, duration: d, easing });
        }
        puck.to({ x: pts[i].x, y: pts[i].y, duration: d, easing });
        await IceQ.Path.wait(d * 1000 + 15);
        if (skipped()) { try { puck.stop(); f1 && f1.stop(); } catch (e) {} break; }
      }
      if (!skipped()) await IceQ.Path.wait(260);
      // Back to the start picture so the quiz starts clean.
      try {
        if (puck.isDestroyed()) return;
        puck.stroke('#E0C68A');
        if (f1 && f1Start && !f1.isDestroyed()) f1.position(f1Start);
        puck.position(f1 ? IceQ.Player.puckPosFor(f1) : puckStart);
        gridLayer.batchDraw();
      } catch (e) {}
    }

    // Glide YOU along the full route (not just a straight line to the target).
    async function skateRoute() {
      const p = currentPlay();
      if (!you) return;
      cancelShowMeGlide();
      for (let i = 1; i < p.youRoute.length; i++) {
        if (skipped()) { try { you.stop(); } catch (e) {} return; }
        const [x, y] = p.youRoute[i];
        const d = legDuration(p.youRoute[i - 1], p.youRoute[i], SKATE_FTPS);
        you.to({ x: toCanvasX(x), y: toCanvasY(y), duration: d, easing: Konva.Easings.EaseInOut });
        await IceQ.Path.wait(d * 1000 + 15);
      }
    }

    function goToRead(i) {
      playIdx = ((i % PLAYS.length) + PLAYS.length) % PLAYS.length;
      clearScene();
      clearOverlay();
      drawScene();
      if (you) {
        const p = currentPlay();
        cancelShowMeGlide();
        you.position({ x: toCanvasX(p.start.x), y: toCanvasY(p.start.y) });
      }
      gridLayer.batchDraw();
      return { rushIdx: playIdx, rush: currentPlay(), totalRushes: PLAYS.length };
    }

    // Demo reveal: route arrow + YOU skating it + the puck finding you.
    async function playReveal() {
      activeSig = null;      // the demo is never under a contrast's Skip
      clearOverlay();
      drawRouteArrow();
      await IceQ.Path.wait(140);
      await skateRoute();
      await travelPuck(currentPlay().rightPuck);
    }

    // ----- contrast replay -------------------------------------------------
    // Wrong: leave YOU where the kid put them, run the puck down the path that
    // play actually takes, end on the red banner. Right: reset, skate the route,
    // puck finds you, green banner.
    async function playWrongConsequence() {
      const p = currentPlay();
      await travelPuck(p.wrongPuck, { stroke: '#CE202E' });
      if (skipped()) return;
      await IceQ.Path.animateGoalConsequence(rink, { kind: 'goal', message: p.wrongMsg, duration: 1.0 });
    }

    function resetPositionsForContrast() {
      return (async function () {
        const p = currentPlay();
        clearOverlay();
        if (you) {
          cancelShowMeGlide();
          you.position({ x: toCanvasX(p.start.x), y: toCanvasY(p.start.y) });
          gridLayer.batchDraw();
        }
      })();
    }

    async function playRightAnswer() {
      const p = currentPlay();
      drawRouteArrow();
      await IceQ.Path.wait(120);
      if (skipped()) return;
      await skateRoute();
      if (skipped()) return;
      await travelPuck(p.rightPuck);
      if (skipped()) return;
      await IceQ.Path.animateGoalConsequence(rink, { kind: 'saved', message: p.rightMsg, duration: 1.0 });
    }

    // Leaner contrast than the shared IceQ.Path.showContrast six-phase flow.
    // Playtest: "there's a lot of stuff between me and the next one — banner,
    // then the gold divider thing, then the replay, then it lets me try again.
    // By read 3 or 4 I just want to get to my turn." So two phases are cut:
    //   * the opening "WATCH WHAT HAPPENS…" label — the wrong replay ending on a
    //     red banner already IS that beat, announcing it twice is dead time;
    //   * the closing "THAT'S THE DRIVE" label — the green GOAL! banner already
    //     landed the win.
    // What's left is the actual teaching: your way -> BUT INSTEAD -> right way.
    // Kept local (not pushed into Path.showContrast) so the timings of the four
    // scenarios already shipping on the shared version don't move underneath us.
    // Never let a stalled animation lock the UI. IceQ.Path.animateGoalConsequence
    // resolves from inside a tween's onFinish, so anything that throttles
    // requestAnimationFrame (backgrounded tab, reduced-motion, a slow phone)
    // can leave it pending forever — and because the phase is awaited, the kid
    // would be stuck staring at a frozen banner next to a Skip button that
    // can't fire, since control never returns to check the flag. Race every
    // phase against the skip flag AND a hard ceiling so the replay always ends.
    function raceSkip(promise, sig, maxMs) {
      return new Promise((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          clearInterval(poll); clearTimeout(cap);
          resolve();
        };
        const poll = setInterval(() => { if (sig && sig.skipped) finish(); }, 80);
        const cap = setTimeout(finish, maxMs);
        Promise.resolve(promise).then(finish, finish);
      });
    }

    async function showContrastReplay(skipSignal) {
      const sig = skipSignal || { skipped: false };
      activeSig = sig;
      const bail = () => { clearOverlay(); return { skipped: true, completed: false }; };

      await raceSkip(playWrongConsequence(), sig, 6000);
      if (sig.skipped) return bail();

      await raceSkip(IceQ.Path.flashLabel(rink, {
        text: 'BUT INSTEAD…', color: '#E0C68A',
        fontSize: 30, holdMs: 380, fadeMs: 160, skipSignal: sig,
      }), sig, 2000);
      if (sig.skipped) return bail();

      await resetPositionsForContrast();
      await IceQ.Path.wait(120);
      if (sig.skipped) return bail();

      await raceSkip(playRightAnswer(), sig, 9500);
      clearOverlay();
      if (sig.skipped) return bail();

      return { skipped: false, completed: true };
    }

    function resetYou() {
      cancelShowMeGlide();
      const p = currentPlay();
      you.to({
        x: toCanvasX(p.start.x), y: toCanvasY(p.start.y),
        duration: 0.4, easing: Konva.Easings.EaseInOut,
      });
    }

    function nextPlay() {
      playIdx = (playIdx + 1) % PLAYS.length;
      clearScene();
      clearOverlay();
      drawScene();
      resetYou();
      gridLayer.batchDraw();
      return { rushIdx: playIdx, rush: currentPlay(), totalRushes: PLAYS.length };
    }

    return {
      rink,
      check: evaluate,
      showMe: showCorrect,
      reset: () => { clearOverlay(); resetYou(); },
      nextRush: nextPlay,
      currentRushInfo: () => ({ rushIdx: playIdx, rush: currentPlay(), totalRushes: PLAYS.length }),
      cue: () => currentPlay().cue,
      goToRead,
      playReveal,
      showContrastReplay,
      playWrongConsequence,
      playRightAnswer,
      isDone: () => evaluate().cover,
    };
  }

  function phrasedFeedback(res) {
    if (res.cover) {
      switch (res.role) {
        case 'f2drive':
          return "That's the middle lane drive. You took the lane F1 wasn't in and drove it to the net, so their weak-side D had to turn and skate with you instead of watching the puck. That's what opens the seam, and it puts you right there for the rebound.";
        case 'dJoin':
          return "You joined as the 4th attacker. Middle lane was filled and your partner stayed home behind you, so late into the high slot is free offense. Two defenders can't cover four attackers.";
        case 'dStay':
          // Staying is the read. Sliding over to the sneaking winger is the
          // better version of it, so it gets named — but not staying put is
          // never treated as the wrong answer here.
          return res.onSpot
            ? "You stayed, and you got over to his side. Last man back with their winger sneaking up early, so you hold the line and take him away. The 4th attacker is a read, not a rule."
            : "You stayed — that's the read. Last man back means joining the rush turns a scoring chance into a breakaway the other way. Next time slide over to the winger who's sneaking up early, so you've got him too.";
        default:
          return "Right read.";
      }
    }
    if (res.chasing) {
      switch (res.readKey) {
        case 'mld-right':
          return "You went to support the puck — good instinct, wrong end of the ice. In our own zone you support the puck; on the rush, support means taking the lane he ISN'T in. Two of us on one wall means one defender covers us both, and nobody's in the middle when F1 looks up.";
        case 'mld-left':
          return "You curled and hovered at the top of the circle. That's the habit to kill: a driving man forces their D to turn and skate; a hovering man is easy to cover. Drive it to the net.";
        case 'd-join':
          return "You stayed at the blue line. Middle lane was already filled and your partner was staying home, so nobody was joining and the rush died 3-on-2. This is the one where you go.";
        case 'd-stay':
          return "You jumped into the rush. Your partner already pinched, so you were the last man back with their winger sneaking up the ice early. Turnover and it's a breakaway. Read it before you go.";
        default:
          return "Wrong lane. Read where the puck is, then take the lane it isn't in.";
      }
    }
    if (res.role === 'dStay') {
      return "Not quite. You're the last man back and their winger is sneaking up the ice early. Where do you have to be to kill that?";
    }
    return "You're in between. Not driving the middle, not holding a lane. On the rush every attacker owns ONE lane. Which one is yours?";
  }

  return { init, phrasedFeedback, PLAYS };
})();
