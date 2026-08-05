// Scenario #3: Forecheck Lanes — Cheetah · Gator · Hawk.
//
// We just lost the puck deep in their zone. Three forwards forecheck the
// opposing breakout — three different jobs.
//   Cheetah (F1): direct pressure on the puck carrier (in the corner / behind the net).
//                 Tight, PRECISE angle — must be on the DEFENSIVE SIDE of the
//                 puck (between the puck carrier and his breakout outlet).
//                 Wrong angle = puck escapes up the wall. Small tolerance.
//   Gator (F2):  middle support, reads the breakout pass, snaps on turnovers.
//                Medium tolerance — flexibility based on F1's angle.
//   Hawk (F3):   HIGH near the blue line — release valve when WE win the puck back,
//                AND safety to backcheck if their breakout succeeds. WIDE tolerance
//                LATERALLY along the blue line, but he can't sag low.
//
// This is the source-faithful home for the F1/F2/F3 vocabulary — coaches use
// these terms for the forecheck, not the backcheck.
//
// Tolerance shapes per role (Hockey Think Tank / Topher Scott; John Shorey
// "Hockey Made Easy"; Belfry on defensive-side-of-puck):
//   * Cheetah = small circle (~6 ft) — angle must be precise
//   * Gator   = medium circle (~10 ft) — reads off Cheetah
//   * Hawk    = wide oval (~22 x 7 ft) — anywhere across blue line, but stay HIGH

window.IceQ = window.IceQ || {};

window.IceQ.Forecheck = (function () {
  // We render the OPPOSING defensive zone (which is OUR offensive zone).
  // Net at the bottom is THEIR net. Puck is deep — corner or behind the net.
  // Three rushes — each with the puck in a different starting spot. Same animals,
  // job-positions rotate with the puck.
  const RUSHES = [
    { side: 'R', puckX:  24, puckY: 58, label: 'right-corner battle' },
    { side: 'L', puckX: -24, puckY: 58, label: 'left-corner battle' },
    { side: 'B', puckX:   0, puckY: 68, label: 'puck behind the net' },
  ];

  function targetsForRush(rush) {
    if (rush.side === 'B') {
      // Puck behind the net — Cheetah pressures from the strong side, blocking
      // the wraparound option (kid is the strong-side defender, taking the
      // wall away). Gator covers the OTHER side of the net. Hawk stays high.
      return {
        cheetah: {
          x:   5, y: 60, shape: 'circle', radius: 6,
          desc: 'On the strong side of the net — kill the wraparound. Tight angle, no gap.',
        },
        gator:   {
          x:  -8, y: 52, shape: 'circle', radius: 10,
          desc: 'Cover the OTHER side of the net — block the wraparound option.',
        },
        hawk:    {
          x:  20, y: 8,  shape: 'oval', radiusX: 22, radiusY: 7,
          desc: 'HIGH near the blue line — release valve when we strip it.',
        },
      };
    }
    const sign = rush.puckX >= 0 ? 1 : -1;       // +1 = right corner, -1 = left
    // Cheetah on the DEFENSIVE SIDE of the puck — between the puck and the
    // breakout outlet (up the wall and toward the middle). For a corner puck
    // at (24, 58), that's slightly INSIDE (toward middle, x=16) AND slightly
    // ABOVE (toward blue line, y=52). Wrong angle here = puck escapes.
    return {
      cheetah: {
        x:  sign * 16, y: 52, shape: 'circle', radius: 6,
        desc: 'Defensive side of the puck — INSIDE and ABOVE. Take the wall away, force him back to the boards.',
      },
      gator:   {
        x:  sign * 6,  y: 44, shape: 'circle', radius: 10,
        desc: 'Middle support — read the breakout pass.',
      },
      hawk:    {
        x: -sign * 15, y: 8, shape: 'oval', radiusX: 22, radiusY: 7,
        desc: 'HIGH on the WEAK side — release valve when we win it back. Anywhere across the blue line, but stay HIGH.',
      },
    };
  }

  // Animal identities — same across rushes; job-position rotates.
  const ANIMAL_INFO = {
    cheetah: { emoji: '🐆', label: 'Cheetah (F1)' },
    gator:   { emoji: '🐊', label: 'Gator (F2)' },
    hawk:    { emoji: '🦅', label: 'Hawk (F3)' },
  };

  // Legacy fallback radius — used by inTarget() ONLY when a target object
  // doesn't specify shape/radius. Keep this so future plays without explicit
  // shape data still evaluate sensibly. Defensive coding.
  const TOL_FT_DEFAULT = 11;

  // Shape-aware tolerance check. Targets with shape:'oval' use an ellipse;
  // shape:'circle' (or unspecified) use a circle with target.radius (or the
  // legacy default).
  function inTarget(xFt, yFt, t) {
    if (t.shape === 'oval') {
      const dx = (xFt - t.x) / t.radiusX;
      const dy = (yFt - t.y) / t.radiusY;
      return dx * dx + dy * dy <= 1;
    }
    const r = t.radius != null ? t.radius : TOL_FT_DEFAULT;
    return Math.hypot(xFt - t.x, yFt - t.y) <= r;
  }

  // OUTLET TARGETS — faint opposing skaters in plausible breakout-receive
  // positions. They make the forechecker placement MATTER: Cheetah denies
  // the wall outlet, Gator denies the middle (high slot), Hawk catches what
  // gets through. Without these, the kid sees the puck carrier in isolation
  // and the "release valve" / "deny the wall" lessons feel abstract.
  //
  // Positions (in feet, half-ice with y=0 at blue line, y=68 behind net):
  //   * Corner rush (R/L): wall winger ~32 ft from center on the SAME side
  //     as the puck, low-mid (y=26) — that's the strong-side rim target.
  //     Center in the high slot (sign*6, y=22) — middle outlet.
  //   * Behind-net rush: a wing on each side (±26, y=30) — both wraparound
  //     targets are open until forecheckers commit.
  //
  // Faint = opacity 0.55 (set after creation). They're "potential receivers,"
  // not full participants.
  function outletsForRush(rush) {
    if (rush.side === 'B') {
      // Both wings along the boards. Stick toward the middle (toward where
      // the pass would come from behind the net).
      return [
        { x:  26, y: 30, side: 'R', role: 'wing', stickSide: 'L' },
        { x: -26, y: 30, side: 'L', role: 'wing', stickSide: 'R' },
      ];
    }
    const sign = rush.puckX >= 0 ? 1 : -1;
    return [
      // Strong-side wall winger — the rim-up target Cheetah is supposed to
      // deny. Stick toward the open ice (away from boards).
      { x: sign * 32, y: 26, side: sign > 0 ? 'R' : 'L', role: 'wing',
        stickSide: sign > 0 ? 'L' : 'R' },
      // High-slot center — the middle-outlet target Gator reads. Stick
      // doesn't matter much for a center; favor strong side for visual
      // consistency.
      { x: sign * 6, y: 22, side: 'C', role: 'center',
        stickSide: sign > 0 ? 'L' : 'R' },
    ];
  }

  // Forecheckers START in DIFFERENT positions per rush. F1/F2/F3 are JOBS
  // that emerge from where you ARE — identical starts every rush would
  // teach the wrong lesson. Per Game Designer round-2 review.
  // The kid drags from these reasonable starting positions; the animal
  // identities on the tokens stay fixed (Cheetah/Gator/Hawk), but the
  // CORRECT job-positions rotate per rush.
  function startsForRush(rush) {
    if (rush.side === 'B') {
      // Puck behind net — forwards swept past, scattered above the play
      return {
        cheetah: { x:  16, y: 22 },
        gator:   { x:   2, y: 18 },
        hawk:    { x: -12, y: 14 },
      };
    }
    const sign = rush.puckX >= 0 ? 1 : -1;
    return {
      cheetah: { x:  sign * 12, y: 28 },     // closest to where puck is
      gator:   { x:  sign * -2, y: 22 },
      hawk:    { x: -sign * 8,  y: 14 },     // already higher than the others
    };
  }
  // Fallback (used if startsForRush isn't available — shouldn't happen)
  const START_POSITIONS = {
    cheetah: { x:   8, y: 14 },
    gator:   { x:   0, y: 14 },
    hawk:    { x:  -8, y: 14 },
  };

  function init(rinkContainer) {
    const rink = IceQ.Rink.create(rinkContainer);
    const { toCanvasX, toCanvasY, scale, overlayLayer, gridLayer } = rink;

    let rushIdx = 0;
    let forecheckers = {};
    let puckCarrier = null;
    let puckNode = null;          // tracked separately so the setup animation
                                  // can move puck + carrier together
    let rushSceneNodes = [];
    let rushOutletNodes = [];     // faint opposing outlet skaters (wing/center).
                                  // Subset of rushSceneNodes; tracked separately
                                  // for future cancel/restyle hooks.
    let setupHandle = null;       // in-flight setup animation; cancelled on
                                  // reset / nextRush so user actions feel snappy
    let showMeSpriteHandles = []; // per-role sprite-glide tween handles spawned
                                  // by Show Me; cancelled on reset / nextRush so
                                  // a stale glide doesn't yank the kid's tokens
                                  // mid-replan.

    function currentRush() { return RUSHES[rushIdx]; }
    function currentTargets() { return targetsForRush(currentRush()); }

    // Cancel any in-flight setup animation cleanly. Konva tweens started via
    // node.to() expose getTween() for pause; the IceQ.Path handle exposes stop().
    function cancelSetup() {
      if (setupHandle) {
        if (typeof setupHandle.stop === 'function') setupHandle.stop();
        setupHandle = null;
      }
      // Also stop any straight tweens we started via node.to() fallback.
      if (puckCarrier && puckCarrier.getTween && puckCarrier.getTween()) {
        puckCarrier.getTween().pause();
      }
      if (puckNode && puckNode.getTween && puckNode.getTween()) {
        puckNode.getTween().pause();
      }
    }

    function drawAttackerCarrying() {
      cancelSetup();
      rushSceneNodes.forEach(n => n.destroy());
      rushSceneNodes = [];
      rushOutletNodes = [];

      const rush = currentRush();
      const targets = currentTargets();

      // SETUP-PHASE OFFSETS — opposing D starts deeper, then animates UP and
      // OUT toward the wall over ~1.5s. Shows the kid WHY their forecheckers
      // need to converge: puck retrieval is happening in real time.
      // For corner puck (R/L): start behind the net, slide along the goal line
      // toward the corner. For behind-net puck (B): start dead behind the net,
      // small drift to one side (sets up wraparound look).
      let setupStartX, setupStartY;
      if (rush.side === 'B') {
        setupStartX = -6;        // start slightly weak-side behind net
        setupStartY = 70;        // a touch deeper than final
      } else {
        // Corner rush — D starts behind the net on the opposite side, sweeps
        // across to the corner. Visually conveys "I just retrieved the puck,
        // I'm working it up the wall."
        setupStartX = -rush.puckX * 0.25;   // small lateral offset (toward middle)
        setupStartY = 70;                   // behind the net
      }

      // Opposing puck-carrier (their D / forward) — drawn at SETUP start, will
      // animate to the rush.puckX/puckY position over ~1.5s.
      puckCarrier = IceQ.Player.create({
        x: toCanvasX(setupStartX), y: toCanvasY(setupStartY),
        scale: Math.max(0.6, scale * 0.085),
        color: 'opponent',
        // Stick toward the open ice — toward the blue line / breakout side
        stickSide: rush.puckX >= 0 ? 'L' : 'R',
      });
      // Puck rides slightly ahead of the carrier (toward open ice), same as
      // the previous render. Computed relative to setup start; will tween in
      // parallel with the carrier.
      const puckOffsetX = rush.puckX >= 0 ? -2 : 2;
      const puckOffsetY = -4;
      puckNode = new Konva.Circle({
        x: toCanvasX(setupStartX + puckOffsetX),
        y: toCanvasY(setupStartY + puckOffsetY),
        radius: Math.max(5, scale * 0.7),
        fill: '#0A0A0A', stroke: '#E0C68A', strokeWidth: 1.5,
      });
      // Their breakout intent — arrow pointing UP toward the blue line.
      // Arrow stays at the FINAL puck position (it's a hint about what
      // happens next, not a moving thing).
      const arrow = new Konva.Arrow({
        points: [
          toCanvasX(rush.puckX), toCanvasY(rush.puckY - 8),
          toCanvasX(rush.puckX), toCanvasY(rush.puckY - 22),
        ],
        stroke: 'rgba(206, 32, 46, 0.45)', fill: 'rgba(206, 32, 46, 0.45)',
        strokeWidth: 2, pointerLength: 8, pointerWidth: 8,
        dash: [4, 3],
        opacity: 0,         // fades in once the setup animation lands
      });
      // "Release valve" hint — faint band high near the blue line on Hawk's side.
      const hawk = targets.hawk;
      const valveHint = new Konva.Rect({
        x: toCanvasX(hawk.x - 8), y: toCanvasY(0),
        width: 22 * scale, height: 8 * scale,
        fill: 'rgba(224, 198, 138, 0.05)',
        stroke: 'rgba(224, 198, 138, 0.18)',
        strokeWidth: 1, dash: [4, 4],
        listening: false,
      });
      gridLayer.add(puckNode, puckCarrier, arrow, valveHint);
      rushSceneNodes.push(puckNode, puckCarrier, arrow, valveHint);

      // OPPOSING OUTLETS — faint wingers/center in plausible breakout-receive
      // positions. Created at opacity 0 and faded UP to 0.55 in sync with
      // the carrier's 1.5s setup tween, so the whole "their breakout is
      // forming" beat reads as one unified moment. These nodes are tracked
      // in rushSceneNodes so Reset/nextRush cleans them up.
      const outletSpecs = outletsForRush(rush);
      const outletNodes = outletSpecs.map(spec => {
        const node = IceQ.Player.create({
          x: toCanvasX(spec.x), y: toCanvasY(spec.y),
          scale: Math.max(0.6, scale * 0.085),
          color: 'opponent',
          stickSide: spec.stickSide || 'L',
        });
        node.opacity(0);
        gridLayer.add(node);
        rushSceneNodes.push(node);
        // Fade in over the same duration as the carrier setup, so outlets
        // "arrive" with the carrier instead of looking pre-placed.
        node.to({
          opacity: 0.55,
          duration: 1.2,
          easing: Konva.Easings.EaseOut,
        });
        return node;
      });
      // Stash for potential cancellation paths (we don't currently cancel
      // their fade — it's short and harmless — but keep the reference so
      // future cancel logic has a hook).
      rushOutletNodes = outletNodes;

      // Kick off the setup-phase animation — opposing D retrieves and starts
      // the breakout. Auto-plays (matches feel of offside.js / breakout.js
      // showing live action). Subtle ~1.5s easing.
      playOpposingSetup(rush, arrow);
    }

    // Animate the opposing D from a deep retrieval position UP/OUT toward
    // their breakout starting point. Uses IceQ.Path.animateAlongPath when
    // available for a smooth bezier; else falls back to node.to() linear-ish.
    // The arrow fades in at the end to cue the kid: "now read this."
    function playOpposingSetup(rush, arrow) {
      const finalCarrierX = toCanvasX(rush.puckX);
      const finalCarrierY = toCanvasY(rush.puckY);
      const puckOffsetX = rush.puckX >= 0 ? -2 : 2;
      const finalPuckX = toCanvasX(rush.puckX + puckOffsetX);
      const finalPuckY = toCanvasY(rush.puckY - 4);

      const duration = 1.5;

      // Konva nodes expose isDestroyed() as a METHOD (see net_front.js).
      // Calling without parens always returns truthy and would skip the work.
      const isAlive = (n) => n && typeof n.isDestroyed === 'function' && !n.isDestroyed();
      const finishArrow = () => {
        if (isAlive(arrow)) {
          arrow.to({
            opacity: 1, duration: 0.35,
            easing: Konva.Easings.EaseOut,
          });
        }
      };

      // Prefer the bezier helper for a slight curve out of the corner —
      // mimics a real D sweeping around the net rather than skating linearly.
      if (window.IceQ && IceQ.Path && typeof IceQ.Path.animateAlongPath === 'function') {
        const carrierStart = { x: puckCarrier.x(), y: puckCarrier.y() };
        const carrierMid = {
          x: (carrierStart.x + finalCarrierX) / 2,
          y: Math.min(carrierStart.y, finalCarrierY) + Math.abs(carrierStart.x - finalCarrierX) * 0.15,
        };
        const carrierPoints = [
          carrierStart,
          carrierMid,
          { x: finalCarrierX, y: finalCarrierY },
        ];
        setupHandle = IceQ.Path.animateAlongPath(puckCarrier, carrierPoints, duration, {
          easing: Konva.Easings.EaseOut,
          onFinish: () => {
            setupHandle = null;
            finishArrow();
          },
        });
        // Puck rides along on its own bezier (same shape, offset).
        const puckStart = { x: puckNode.x(), y: puckNode.y() };
        const puckMid = {
          x: (puckStart.x + finalPuckX) / 2,
          y: Math.min(puckStart.y, finalPuckY) + Math.abs(puckStart.x - finalPuckX) * 0.15,
        };
        IceQ.Path.animateAlongPath(puckNode,
          [puckStart, puckMid, { x: finalPuckX, y: finalPuckY }],
          duration, { easing: Konva.Easings.EaseOut });
      } else {
        // Fallback — straight tweens via Konva.Tween (.to). Cancel-handle
        // mimics the Path API's stop() so cancelSetup() works either way.
        let stopped = false;
        puckCarrier.to({
          x: finalCarrierX, y: finalCarrierY,
          duration, easing: Konva.Easings.EaseOut,
          onFinish: () => {
            if (stopped) return;
            setupHandle = null;
            finishArrow();
          },
        });
        puckNode.to({
          x: finalPuckX, y: finalPuckY,
          duration, easing: Konva.Easings.EaseOut,
        });
        setupHandle = {
          stop: () => {
            stopped = true;
            // Snap to final positions so the scene is in a consistent state
            // for evaluation — kid shouldn't have to wait if they hit Reset.
            if (isAlive(puckCarrier)) {
              puckCarrier.position({ x: finalCarrierX, y: finalCarrierY });
            }
            if (isAlive(puckNode)) {
              puckNode.position({ x: finalPuckX, y: finalPuckY });
            }
            if (isAlive(arrow)) arrow.opacity(1);
          },
        };
      }
    }

    function drawForechecker(role) {
      const starts = startsForRush(currentRush());
      const start = starts[role];
      const node = IceQ.Player.create({
        x: toCanvasX(start.x), y: toCanvasY(start.y),
        scale: Math.max(0.7, scale * 0.09),
        color: 'spartan',
        animal: role,
        stickSide: 'L',
        draggable: true,
      });
      node.on('dragmove', () => {
        const pos = node.position();
        const minX = toCanvasX(-40), maxX = toCanvasX(40);
        const minY = toCanvasY(2),   maxY = toCanvasY(72);
        node.x(Math.max(minX, Math.min(maxX, pos.x)));
        node.y(Math.max(minY, Math.min(maxY, pos.y)));
      });
      node._role = role;
      forecheckers[role] = node;
      gridLayer.add(node);
    }

    function drawAllForecheckers() {
      Object.values(forecheckers).forEach(b => b.destroy());
      forecheckers = {};
      ['cheetah', 'gator', 'hawk'].forEach(drawForechecker);
    }

    function evaluate() {
      const results = {};
      const targets = currentTargets();
      for (const role of ['cheetah', 'gator', 'hawk']) {
        const node = forecheckers[role];
        if (!node) continue;
        const t = { ...targets[role], emoji: ANIMAL_INFO[role].emoji, label: ANIMAL_INFO[role].label };
        const pos = node.position();
        const xFt = (pos.x - rink.width / 2) / scale;
        const yFt = pos.y / scale;
        // dist still useful for "you sent Hawk way too low" feedback even though
        // pass/fail is now shape-aware. Keep it as a euclidean to the target center.
        const dist = Math.hypot(xFt - t.x, yFt - t.y);
        results[role] = { pass: inTarget(xFt, yFt, t), dist, target: t };
      }
      return results;
    }

    function showCorrectPositions() {
      overlayLayer.destroyChildren();
      // Cancel any prior Show Me sprite glide — re-pressing Show Me while
      // tokens are mid-glide should restart cleanly, not stack tweens.
      cancelShowMeSpriteGlide();
      const targets = currentTargets();
      const roleColors = {
        cheetah: '#E0C68A',
        gator:   '#2E7D3F',
        hawk:    '#0D5EAB',
      };
      const roles = ['cheetah', 'gator', 'hawk'];
      for (const role of roles) {
        const tBase = targets[role];
        const t = { ...tBase, emoji: ANIMAL_INFO[role].emoji, label: ANIMAL_INFO[role].label };
        const c = roleColors[role];

        // Branch on shape: oval for Hawk's blue-line stretch, circle otherwise.
        // Stroke styling (color, dash, width) stays consistent across shapes
        // so the visual language reads the same.
        let ring;
        if (t.shape === 'oval') {
          ring = new Konva.Ellipse({
            x: toCanvasX(t.x), y: toCanvasY(t.y),
            radiusX: t.radiusX * scale,
            radiusY: t.radiusY * scale,
            stroke: c, strokeWidth: 2.2, dash: [6, 4],
            opacity: 0,
          });
        } else {
          const r = t.radius != null ? t.radius : TOL_FT_DEFAULT;
          ring = new Konva.Circle({
            x: toCanvasX(t.x), y: toCanvasY(t.y),
            radius: r * scale,
            stroke: c, strokeWidth: 2.2, dash: [6, 4],
            opacity: 0,
          });
        }

        // Label placement: above the shape if the target is high (near blue
        // line), below otherwise. Use the shape's vertical extent so labels
        // don't collide with rings (esp. the wide oval).
        const verticalExtent = t.shape === 'oval'
          ? t.radiusY * scale
          : (t.radius != null ? t.radius : TOL_FT_DEFAULT) * scale;
        const labelY = t.y < 14
          ? toCanvasY(t.y) - verticalExtent - 18
          : toCanvasY(t.y) + verticalExtent + 4;
        const lbl = new Konva.Text({
          x: toCanvasX(t.x) - 60, y: labelY,
          text: `${t.emoji} ${t.label}`, width: 120, align: 'center',
          fontSize: 13, fontStyle: '800', fill: c,
          opacity: 0,
        });
        overlayLayer.add(ring, lbl);
        ring.to({ opacity: 0.85, duration: 0.4, easing: Konva.Easings.EaseOut });
        lbl.to({ opacity: 1, duration: 0.4, easing: Konva.Easings.EaseOut });
      }
      // Release-valve subtitle on Hawk (after the staggered reveals land).
      // Bug fix: previous code referenced an undefined `roles` here.
      setTimeout(() => {
        const hawkT = targets.hawk;
        const hawkSubtitle = new Konva.Text({
          x: toCanvasX(hawkT.x) - 60, y: toCanvasY(hawkT.y) + 4,
          text: 'release valve', width: 120, align: 'center',
          fontSize: 9, fontStyle: '700', fill: '#0D5EAB',
          opacity: 0,
        });
        overlayLayer.add(hawkSubtitle);
        hawkSubtitle.to({ opacity: 0.85, duration: 0.4, easing: Konva.Easings.EaseOut });
        overlayLayer.batchDraw();
      }, roles.length * 250 + 100);

      // SPRITE GLIDE — Show Me becomes a DEMONSTRATION, not a static diagram.
      // After the rings have faded in (~400ms), we glide each forechecker
      // token from wherever the kid placed it to its correct target. Stagger
      // by 150ms so the kid's eye can track each animal moving into place
      // (Cheetah → Gator → Hawk in priority-of-pressure order).
      //
      // The tween handle for each role is parked in showMeSpriteHandles so
      // reset / nextRush can cancel mid-glide.
      const ringFadeMs = 400;
      const sceneSettleMs = 200;
      const startGlideAt = ringFadeMs + sceneSettleMs;  // ~600ms after rings begin
      const staggerMs = 150;
      const glideDur = 0.6;
      ['cheetah', 'gator', 'hawk'].forEach((role, idx) => {
        const handle = setTimeout(() => {
          const node = forecheckers[role];
          if (!node) return;
          const t = targets[role];
          if (!t) return;
          node.to({
            x: toCanvasX(t.x),
            y: toCanvasY(t.y),
            duration: glideDur,
            easing: Konva.Easings.EaseInOut,
          });
        }, startGlideAt + idx * staggerMs);
        showMeSpriteHandles.push(handle);
      });
    }

    // Cancel any pending Show Me sprite glides. We clear setTimeout handles
    // so nothing kicks off after a Reset; in-flight Konva tweens on the
    // forechecker nodes are stopped via getTween().pause() (mirrors the
    // pattern used in cancelSetup() for puckCarrier / puckNode).
    function cancelShowMeSpriteGlide() {
      showMeSpriteHandles.forEach(h => clearTimeout(h));
      showMeSpriteHandles = [];
      for (const role of ['cheetah', 'gator', 'hawk']) {
        const node = forecheckers[role];
        if (node && node.getTween && node.getTween()) {
          node.getTween().pause();
        }
      }
    }

    function clearOverlay() {
      overlayLayer.destroyChildren();
      overlayLayer.batchDraw();
    }

    function resetForecheckers() {
      const starts = startsForRush(currentRush());
      for (const role of ['cheetah', 'gator', 'hawk']) {
        const node = forecheckers[role];
        if (!node) continue;
        const start = starts[role];
        node.to({
          x: toCanvasX(start.x),
          y: toCanvasY(start.y),
          duration: 0.4, easing: Konva.Easings.EaseInOut,
        });
      }
    }

    drawAttackerCarrying();
    drawAllForecheckers();
    gridLayer.batchDraw();

    function nextRush() {
      cancelSetup();
      cancelShowMeSpriteGlide();
      rushIdx = (rushIdx + 1) % RUSHES.length;
      clearOverlay();
      drawAttackerCarrying();
      resetForecheckers();
      gridLayer.batchDraw();
      return { rushIdx, rush: currentRush(), totalRushes: RUSHES.length };
    }

    // ----- v0.13 contrast animations ---------------------------------------
    // The teaching arc: when the kid places forecheckers badly, we SHOW the
    // consequence — the opposing D completes their breakout, gets up ice, and
    // scores. Then we SHOW the right read — Cheetah strips the puck before it
    // ever leaves the zone. Visual contrast: puck travels FAR on the wrong
    // play (corner -> blue line -> up ice) vs. barely moves on the right play
    // (corner -> Cheetah, ~10 ft).
    //
    // Design choices:
    //   * We skip the v0.12 setup animation during contrast replays — the
    //     puck is already at its final position from the kid's pre-check
    //     scene, and replaying the 1.5s D-retrieval tween here would add
    //     dead time and dilute the "here's what happened NEXT" punch.
    //   * Forecheckers stay where the kid placed them during playWrong —
    //     that's the whole point; the kid needs to see their choice fail.
    //   * For playRight we tween the forecheckers to the correct targets
    //     first (~0.4s), so the kid sees the fix before the strip — this
    //     is the "BUT INSTEAD..." reveal that makes the lesson stick.

    // Where the "outlet pass" goes on the wrong play.
    //
    // Real-hockey logic: an opposing D who RETRIEVED the puck in the corner
    // and is unpressured (kid's Cheetah was out of position) has three outlet
    // options — the strong-side wall winger, the weak-side winger curling up,
    // or a stretch pass to the far center. The MOST COMMON 10U breakout out
    // of the corner is the STRONG-SIDE WALL rim up to the winger hugging the
    // boards just below the blue line. That's the lane Cheetah is SUPPOSED
    // to close off by being "defensive side INSIDE and ABOVE." So when the
    // kid leaves Cheetah out of the way, the pass goes up the strong-side
    // wall — the exact lane Cheetah failed to take.
    //
    // For the behind-net rush: the carrier wraps around or bumps to the other
    // side of the net. The outlet target here is the weak-side wall — again
    // the lane that Gator was supposed to block.
    //
    // Net effect: the outlet direction points back at the kid's specific
    // mistake, which is pedagogical gold.
    function outletTargetForRush(rush) {
      if (rush.side === 'B') {
        // Behind-net: wrap + bump to weak-side wall low-mid.
        return { x: -18, y: 40 };
      }
      const sign = rush.puckX >= 0 ? 1 : -1;
      // Strong-side wall, just below the blue line (~18 ft from the boards).
      return { x: sign * 32, y: 22 };
    }

    // Where the rush ends up after the outlet — the "they're up ice" puck
    // destination. Canvas y=0 is the blue line (top of half-ice). We stop
    // the puck just short of the top edge so the flash overlay + GOAL text
    // still have room to dominate; y=-6 would go off-screen.
    function clearedTargetForRush(rush) {
      // Zero-ish x (center ice) or slightly angled off the outlet.
      return { x: 0, y: 2 };
    }

    // playWrongConsequence — the kid's bad read plays out.
    //   1. Puck travels from carrier to outlet receiver (strong-side wall).
    //   2. Short beat, then puck travels from outlet up the ice past the
    //      blue line (represents "they cleared, now they're rushing").
    //   3. GOAL flash + shake + horn (odd-man rush scored).
    // Returns a Promise that resolves when the consequence animation is done.
    function playWrongConsequence() {
      const rush = currentRush();
      const outlet = outletTargetForRush(rush);
      const cleared = clearedTargetForRush(rush);

      // Use the CURRENT puckNode position as the start — the v0.12 setup
      // animation has already placed the puck at rush.puckX/Y. If somehow
      // the puckNode is missing (edge case), fall back to rush coords.
      const fromX = puckNode ? puckNode.x() : toCanvasX(rush.puckX);
      const fromY = puckNode ? puckNode.y() : toCanvasY(rush.puckY);
      const outletX = toCanvasX(outlet.x);
      const outletY = toCanvasY(outlet.y);
      const clearedX = toCanvasX(cleared.x);
      const clearedY = toCanvasY(cleared.y);

      // Hide the static puckNode during the animated passes so we don't
      // have two pucks on screen. Re-show at the end (destroyed by
      // resetPositions / next contrast anyway).
      if (puckNode && !puckNode.isDestroyed()) {
        puckNode.visible(false);
        puckNode.getLayer() && puckNode.getLayer().batchDraw();
      }

      return (async function () {
        // Pass 1: corner -> strong-side wall outlet. Short arc, moderate
        // duration — this is a normal breakout pass.
        const passHandle = IceQ.Path.animatePuckPass(
          gridLayer,
          { x: fromX, y: fromY },
          { x: outletX, y: outletY },
          { duration: 0.55, radius: Math.max(5, scale * 0.7), persist: false }
        );
        await passHandle.promise;

        // Tiny beat — receiver collects, turns up ice.
        await IceQ.Path.wait(150);

        // Pass 2: outlet -> up ice. This is the "they're rushing now" leg.
        // Longer duration, goes past the blue line — the kid watches the
        // puck leave their zone entirely.
        const rushHandle = IceQ.Path.animatePuckPass(
          gridLayer,
          { x: outletX, y: outletY },
          { x: clearedX, y: clearedY },
          { duration: 0.75, radius: Math.max(5, scale * 0.7), persist: false }
        );
        await rushHandle.promise;

        // Goal horn + red flash + shake. goalHorn is a no-op if muted.
        IceQ.Audio.goalHorn();
        await IceQ.Path.animateGoalConsequence(rink, { kind: 'goal' });
      })();
    }

    // playRightAnswer — the correct read plays out.
    //   1. Forecheckers tween to their correct targets (~0.4s), so the kid
    //      sees "oh, THAT'S where they should have been."
    //   2. Puck travels from carrier to Cheetah's position — barely moves.
    //      Represents Cheetah closing the gap and stripping the puck.
    //   3. INTERCEPTED flash + save pling (puck stays in their zone).
    // Returns a Promise that resolves when the animation is done.
    function playRightAnswer() {
      const rush = currentRush();
      const targets = currentTargets();

      // Step 1: animate forecheckers to correct targets. We don't snap —
      // the movement itself is part of the teaching (the kid watches
      // Cheetah slide INTO the defensive-side angle).
      const moveDur = 0.45;
      for (const role of ['cheetah', 'gator', 'hawk']) {
        const node = forecheckers[role];
        if (!node) continue;
        const t = targets[role];
        node.to({
          x: toCanvasX(t.x),
          y: toCanvasY(t.y),
          duration: moveDur,
          easing: Konva.Easings.EaseInOut,
        });
      }

      const fromX = puckNode ? puckNode.x() : toCanvasX(rush.puckX);
      const fromY = puckNode ? puckNode.y() : toCanvasY(rush.puckY);
      const cheetahTarget = targets.cheetah;
      const cheetahX = toCanvasX(cheetahTarget.x);
      const cheetahY = toCanvasY(cheetahTarget.y);

      // Hide static puck for the animated strip.
      if (puckNode && !puckNode.isDestroyed()) {
        puckNode.visible(false);
        puckNode.getLayer() && puckNode.getLayer().batchDraw();
      }

      return (async function () {
        // Let the forecheckers arrive before the strip happens.
        await IceQ.Path.wait(moveDur * 1000 + 80);

        // Strip pass: carrier -> Cheetah. Short distance, quick duration —
        // the puck "wobbles" off the carrier's stick and Cheetah picks it
        // up. Contrasts sharply with the long two-leg wrong-play pass.
        const stripHandle = IceQ.Path.animatePuckPass(
          gridLayer,
          { x: fromX, y: fromY },
          { x: cheetahX, y: cheetahY },
          { duration: 0.35, radius: Math.max(5, scale * 0.7), persist: false }
        );
        await stripHandle.promise;

        // INTERCEPTED flash at Cheetah's position + pling. We still use
        // animateGoalConsequence since it's the canonical consequence
        // visual — it renders the text full-rink, which is fine; the
        // KIND drives the color (gold) and messaging.
        IceQ.Audio.savePling();
        await IceQ.Path.animateGoalConsequence(rink, { kind: 'intercepted' });
      })();
    }

    // Snap scene back to a clean state between wrong and right replays.
    // We re-draw the carrier/puck/arrow (so the "setup" state is visible
    // for the right-way animation) but skip the 1.5s retrieval tween —
    // the kid has already seen it once. The forecheckers are LEFT where
    // the kid placed them for playWrong, because playRightAnswer tweens
    // them to the correct spots itself (that's part of the reveal).
    function resetPositionsForContrast() {
      return (async function () {
        cancelSetup();
        // Rebuild the carrier + puck at their FINAL positions (no setup
        // tween). Reuse drawAttackerCarrying's node creation by calling
        // it, then immediately cancelling the setup animation it kicks
        // off — the nodes land at the final spots via cancelSetup()'s
        // fallback-stop path. Cleaner: just destroy and rebuild directly.
        rushSceneNodes.forEach(n => n.destroy());
        rushSceneNodes = [];
        rushOutletNodes = [];
        puckCarrier = null;
        puckNode = null;

        const rush = currentRush();
        const targets = currentTargets();
        // Carrier at final breakout start position (no setup offset).
        puckCarrier = IceQ.Player.create({
          x: toCanvasX(rush.puckX), y: toCanvasY(rush.puckY),
          scale: Math.max(0.6, scale * 0.085),
          color: 'opponent',
          stickSide: rush.puckX >= 0 ? 'L' : 'R',
        });
        const puckOffsetX = rush.puckX >= 0 ? -2 : 2;
        puckNode = new Konva.Circle({
          x: toCanvasX(rush.puckX + puckOffsetX),
          y: toCanvasY(rush.puckY - 4),
          radius: Math.max(5, scale * 0.7),
          fill: '#0A0A0A', stroke: '#E0C68A', strokeWidth: 1.5,
        });
        const hawkT = targets.hawk;
        const valveHint = new Konva.Rect({
          x: toCanvasX(hawkT.x - 8), y: toCanvasY(0),
          width: 22 * scale, height: 8 * scale,
          fill: 'rgba(224, 198, 138, 0.05)',
          stroke: 'rgba(224, 198, 138, 0.18)',
          strokeWidth: 1, dash: [4, 4],
          listening: false,
        });
        gridLayer.add(puckNode, puckCarrier, valveHint);
        rushSceneNodes.push(puckNode, puckCarrier, valveHint);

        // Outlet skaters at full 0.55 opacity (no fade — we're past the
        // setup beat). Same coordinates as the pre-check scene so the
        // contrast replay reads consistently.
        const outletSpecs = outletsForRush(rush);
        outletSpecs.forEach(spec => {
          const node = IceQ.Player.create({
            x: toCanvasX(spec.x), y: toCanvasY(spec.y),
            scale: Math.max(0.6, scale * 0.085),
            color: 'opponent',
            stickSide: spec.stickSide || 'L',
          });
          node.opacity(0.55);
          gridLayer.add(node);
          rushSceneNodes.push(node);
          rushOutletNodes.push(node);
        });
        gridLayer.batchDraw();
      })();
    }

    // Public contrast orchestrator. Takes a skipSignal so main.js can set
    // skipSignal.skipped = true to bail out of a mid-flight replay when
    // the kid taps the skip button.
    function showContrastReplay(skipSignal) {
      return IceQ.Path.showContrast({
        rink,
        skipSignal: skipSignal || { skipped: false },
        playWrong: playWrongConsequence,
        resetPositions: resetPositionsForContrast,
        playRight: playRightAnswer,
        wrongLabel: 'WATCH WHAT HAPPENS\u2026',
        middleLabel: 'BUT INSTEAD\u2026',
        rightLabel: 'STRIPPED IT.',
      });
    }

    return {
      rink,
      check: evaluate,
      showMe: showCorrectPositions,
      // Reset cancels any in-flight setup so the kid doesn't get a confusing
      // "puck is still moving" state when they hit the button.
      reset: () => { cancelSetup(); cancelShowMeSpriteGlide(); clearOverlay(); resetForecheckers(); },
      nextRush,
      currentRushInfo: () => ({ rushIdx, rush: currentRush(), totalRushes: RUSHES.length }),
      isDone: () => {
        const r = evaluate();
        return r.cheetah?.pass && r.gator?.pass && r.hawk?.pass;
      },
      // v0.13 contrast animation API — exposed for main.js wiring.
      playWrongConsequence,
      playRightAnswer,
      showContrastReplay,
    };
  }

  function phrasedFeedback(results) {
    const passes = ['cheetah', 'gator', 'hawk'].filter(r => results[r]?.pass);
    const hawkOk = !!results.hawk?.pass;
    const hawkPos = results.hawk;

    // Most common 10U mistake on a forecheck: dragging Hawk down to "help"
    // — leaves no high outlet when we strip the puck.
    if (hawkPos && !hawkOk && hawkPos.dist > 18) {
      return "Almost — but you sent 🦅 Hawk all the way down to help. That's the trap. When all three forwards collapse on the puck, you have no outlet when you strip it. Hawk's job is to STAY HIGH near the blue line as the release valve.";
    }

    if (passes.length === 3) {
      return "🐆 on the puck carrier. 🐊 in the middle reading the breakout. 🦅 HIGH near the blue line as the release valve. When you strip the puck, Hawk is wide open up ice for the outlet — and you're attacking the slot in two passes.";
    }
    if (passes.length === 2) {
      const missed = ['cheetah', 'gator', 'hawk'].find(r => !results[r]?.pass);
      const t = results[missed]?.target;
      return `Two of three in position. ${t.emoji} ${t.label} is off — ${t.desc}`;
    }
    if (passes.length === 1) {
      return "Only one forechecker in the right spot. Three different jobs, three different animals — they don't pile on the puck.";
    }
    return "All three forecheckers out of position. Tap Show Me to see where 🐆 Cheetah, 🐊 Gator, and 🦅 Hawk belong, then try again.";
  }

  return { init, phrasedFeedback, RUSHES, targetsForRush, inTarget };
})();
