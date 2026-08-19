// Scenario: 2-on-1 Defense.
//
// Two opposing attackers cross the blue line on a 2-on-1. ONE defender
// (you). The classic teaching: D plays the PASS LINE (stick + body
// between the two attackers). Goalie plays the shot. If D commits to the
// puck carrier, the attacker passes across for a tap-in.
//
// Mechanic: kid drags D to a position on the line between the two attackers,
// just barely toward the puck-carrier side. Tolerance is a band along
// that line.

window.IceQ = window.IceQ || {};

window.IceQ.TwoOnOne = (function () {
  // Three rushes — two attackers in different configurations.
  //
  // receiverPath: 'straight' (default — straight down their lane to the final
  // spot) or 'curl-back-door' (receiver sweeps BEHIND the carrier en route to
  // a back-door tap-in spot). Real 2-on-1s often have the off-puck attacker
  // delay/curl behind the puck carrier — that's the actual threat. We mix
  // straight + curl across the three rushes so the kid sees both and learns
  // that the back-door look is the dangerous one.
  const RUSHES = [
    {
      side: 'R',
      label: 'right wing carrying, weak-side wing driving the far lane',
      carrier: { x:  18, y: 18 },
      receiver: { x: -10, y: 22 },
      receiverPath: 'straight',  // first encounter — keep simple
    },
    {
      side: 'L',
      label: 'left wing carrying, weak-side wing driving the far lane',
      carrier: { x: -18, y: 18 },
      receiver: { x:  10, y: 22 },
      receiverPath: 'curl-back-door',  // shows the back-door threat
    },
    {
      side: 'WIDE',
      label: 'wide attack — receiver is way off to the weak side',
      carrier: { x:  14, y: 14 },
      receiver: { x: -22, y: 26 },
      receiverPath: 'curl-back-door',  // wide curl is especially nasty
    },
  ];

  const TOL_FT = 7;
  // The D starts GOAL-SIDE of the rush (y grows toward our net). At y=8 he
  // was 10-18 ft above the attackers' entry, i.e. already beaten before the
  // kid touched him; a AAA kid reads that instantly. Backing in at y=38 with
  // the rush arriving at 18-26 is a real gap, and it is 11+ ft from every
  // target, so standing still never passes.
  const DEFENDER_START = { x: 0, y: 38 };

  function targetForRush(rush) {
    // Optimal D position: on the pass line, shaded toward the RECEIVER, a
    // stride goal-side so the goalie still sees the shot.
    //
    // Was t=0.4 with +10 depth, and three statements disagreed: the comment
    // claimed "30% from carrier, 70% from receiver," the inline said "bias
    // toward the receiver," and 0.4 actually shaded the CARRIER — the exact
    // error phrasedFeedback scolds you for ("You committed to the puck
    // carrier"). The game rewarded the mistake it was built to punish. And
    // +10 put the gold "PLAY THE PASS" zone 12-16 ft off the pass lane the app
    // itself draws on the ice, in a game whose entire point is the pass lane.
    // A 10U stick is about 4 ft; you cannot be in a lane you are 12 ft from.
    const t = 0.6;      // 60% of the way to the receiver — take the pass away
    const DEPTH_FT = 6; // a stride goal-side of the attackers, not a zone away
    return {
      x: rush.carrier.x * (1 - t) + rush.receiver.x * t,
      y: (rush.carrier.y * (1 - t) + rush.receiver.y * t) + DEPTH_FT,
      desc: 'On the PASS LINE between the two attackers — your stick blocks the cross-ice. Goalie plays the shot.',
    };
  }

  function init(rinkContainer) {
    const rink = IceQ.Rink.create(rinkContainer);
    if (rink.labelNet) rink.labelNet('ours');   // zone cue: whose net is this
    const { toCanvasX, toCanvasY, scale, overlayLayer, gridLayer } = rink;

    let rushIdx = 0;
    let defender = null;
    let goalieNode = null;
    let attackerNodes = [];
    // We need direct handles on the carrier+puck+receiver Konva nodes during
    // contrast playback (so playWrong can fire the cross-ice pass from the
    // CURRENT carrier position, and resetPositions can snap them back). The
    // sceneNodes array doesn't tell us which is which — these named refs do.
    let carrierNode = null;
    let receiverNode = null;
    let puckNode = null;
    let sceneNodes = [];
    // Handle for the receiver's curl animation (IceQ.Path.animateAlongPath
    // returns { stop(), promise }). We hold onto it so reset() / nextRush()
    // can cancel it cleanly mid-curl — otherwise the receiver keeps gliding
    // toward the old back-door spot after the kid restarts.
    let receiverPathHandle = null;
    // Handles for in-flight contrast animations (puck passes, save deflections,
    // defender moves) so the skip handler can stop them mid-playback. We track
    // a flat list and clear it as each phase finishes.
    let contrastHandles = [];
    function trackHandle(h) { if (h && typeof h.stop === 'function') contrastHandles.push(h); return h; }
    function stopAllContrast() {
      contrastHandles.forEach(function (h) { try { h.stop(); } catch (e) {} });
      contrastHandles = [];
    }
    // Flag the in-flight Show-Me glide so reset() and dragstart can stop it
    // mid-flight. Without this, tapping Reset (or grabbing D) while the sprite
    // is gliding to the target leaves the tween racing in the background.
    // Note: Konva's node.to() doesn't reliably return a tween handle across
    // versions, so we use node.getTween() (the codebase's existing idiom).
    let showMeGlideActive = false;
    function cancelShowMeGlide() {
      if (showMeGlideActive && defender && defender.getTween && defender.getTween()) {
        try { defender.getTween().pause(); } catch (e) { /* ignore */ }
        try { defender.getTween().destroy(); } catch (e) { /* ignore */ }
      }
      showMeGlideActive = false;
    }

    // Session mirror (see dzone_coverage.js): same three reads, other side.
    const MIRROR = Math.random() < 0.5;
    const swapLR = (t) => t.replace(/\b(right|left)\b/gi, (m) => {
      const up = m[0] === m[0].toUpperCase();
      const w = m.toLowerCase() === 'right' ? 'left' : 'right';
      return up ? w[0].toUpperCase() + w.slice(1) : w;
    });
    const ACTIVE_RUSHES = MIRROR ? RUSHES.map(r => Object.assign({}, r, {
      carrier: Object.assign({}, r.carrier, { x: -r.carrier.x }),
      receiver: Object.assign({}, r.receiver, { x: -r.receiver.x }),
      label: swapLR(r.label || ''),
    })) : RUSHES;
    function currentRush() { return ACTIVE_RUSHES[rushIdx]; }

    function drawNet() {
      gridLayer.add(new Konva.Rect({
        x: toCanvasX(-3), y: toCanvasY(64),
        width: 6 * scale, height: 3.5 * scale,
        stroke: '#CE202E', strokeWidth: 2, fill: 'rgba(214,35,40,0.05)',
      }));
      // Goalie token in the crease — uses the dedicated goalie kind
      // (wider stance, leg pads, blocker + trapper)
      goalieNode = IceQ.Player.create({
        x: toCanvasX(0), y: toCanvasY(60),
        scale: Math.max(0.6, scale * 0.085),
        color: 'spartan',
        kind: 'goalie',
        label: 'G',
      });
      IceQ.Player.face(goalieNode, 'y-');
      gridLayer.add(goalieNode);
    }

    function drawAttackers() {
      // Cancel any in-flight curl from the previous rush before tearing down
      // the nodes — animateAlongPath holds a reference to the receiver node
      // and would keep poking position() on a destroyed node otherwise.
      if (receiverPathHandle) {
        receiverPathHandle.stop();
        receiverPathHandle = null;
      }
      sceneNodes.forEach(n => n.destroy());
      sceneNodes = [];
      attackerNodes = [];

      const r = currentRush();
      const useCurl = r.receiverPath === 'curl-back-door'
                      && window.IceQ && window.IceQ.Path;
      // Attackers START above the blue line (off-canvas / neutral zone) and
      // ANIMATE in. Kid sees the rush develop, not just appear.
      const carrierStart = { x: r.carrier.x, y: r.carrier.y - 28 };
      const receiverStart = { x: r.receiver.x, y: r.receiver.y - 28 };

      const carrier = IceQ.Player.create({
        x: toCanvasX(carrierStart.x), y: toCanvasY(carrierStart.y),
        scale: Math.max(0.6, scale * 0.08),
        color: 'opponent', stickSide: r.carrier.x >= 0 ? 'L' : 'R',
        // v0.14: opt-in to the new SVG image sprites. Demo scenario.
        useImageSprite: true,
      });
      // Puck on the carrier's blade from the sprite geometry (was a fixed
      // 2/4 ft offset that drifted off the blade at phone scale).
      const puck0 = IceQ.Player.puckPosFor(carrier);
      const puck = new Konva.Circle({
        x: puck0.x, y: puck0.y,
        radius: Math.max(5, scale * 0.7),
        fill: '#0A0A0A', stroke: '#E0C68A', strokeWidth: 1.5,
      });
      const receiver = IceQ.Player.create({
        x: toCanvasX(receiverStart.x), y: toCanvasY(receiverStart.y),
        scale: Math.max(0.6, scale * 0.08),
        color: 'opponent', stickSide: r.receiver.x >= 0 ? 'L' : 'R',
        // v0.14: opt-in to the new SVG image sprites.
        useImageSprite: true,
      });

      gridLayer.add(carrier, receiver, puck);
      sceneNodes.push(puck, carrier, receiver);
      attackerNodes = [carrier, receiver];
      carrierNode = carrier;
      receiverNode = receiver;
      puckNode = puck;

      // Tween the rush IN from above the blue line. The carrier+puck always
      // travel straight down their lane. The receiver either travels straight
      // (default) or curls behind the carrier toward a back-door spot.
      const RUSH_DUR = 1.2;
      carrier.to({
        x: toCanvasX(r.carrier.x), y: toCanvasY(r.carrier.y),
        duration: RUSH_DUR, easing: Konva.Easings.EaseOut,
      });
      {
        const pEnd = IceQ.Player.puckPosFor(carrier, { x: toCanvasX(r.carrier.x), y: toCanvasY(r.carrier.y) });
        puck.to({ x: pEnd.x, y: pEnd.y, duration: RUSH_DUR, easing: Konva.Easings.EaseOut });
      }

      // Helper visuals (pass lane, arrows, optional curl arc) — drawn AFTER
      // the rush settles so they don't compete with the motion.
      const drawHelpers = () => {
        if (!sceneNodes.length) return;  // got reset mid-tween
        const arrow1 = new Konva.Arrow({
          points: [
            toCanvasX(r.carrier.x), toCanvasY(r.carrier.y + 10),
            toCanvasX(r.carrier.x), toCanvasY(r.carrier.y + 22),
          ],
          stroke: 'rgba(206, 32, 46, 0.55)', fill: 'rgba(206, 32, 46, 0.55)',
          strokeWidth: 2, pointerLength: 7, pointerWidth: 7,
          opacity: 0, listening: false,
        });
        const arrow2 = new Konva.Arrow({
          points: [
            toCanvasX(r.receiver.x), toCanvasY(r.receiver.y + 10),
            toCanvasX(r.receiver.x), toCanvasY(r.receiver.y + 22),
          ],
          stroke: 'rgba(206, 32, 46, 0.55)', fill: 'rgba(206, 32, 46, 0.55)',
          strokeWidth: 2, pointerLength: 7, pointerWidth: 7,
          opacity: 0, listening: false,
        });
        const passLane = new Konva.Line({
          points: [
            toCanvasX(r.carrier.x), toCanvasY(r.carrier.y),
            toCanvasX(r.receiver.x), toCanvasY(r.receiver.y),
          ],
          stroke: 'rgba(13, 94, 171, 0.25)',
          strokeWidth: 1.5, dash: [4, 4],
          opacity: 0, listening: false,
        });
        gridLayer.add(passLane, arrow1, arrow2);
        sceneNodes.push(passLane, arrow1, arrow2);
        arrow1.to({ opacity: 1, duration: 0.3 });
        arrow2.to({ opacity: 1, duration: 0.3 });
        passLane.to({ opacity: 1, duration: 0.3 });
      };

      if (useCurl) {
        // ----- Curl behind the carrier -----
        // Build a quadratic bezier in CANVAS coords. The control point sits:
        //   * x: between carrier and receiver final positions, biased TOWARD
        //         the carrier's column (so the receiver bends INWARD across
        //         the slot). We pull ~70% of the way from receiver to carrier.
        //   * y: deeper than the carrier (LATER in the rush direction = larger
        //         y in canvas coords) so the curve bows BEHIND the carrier
        //         before kicking out to the back-door spot.
        // Net trajectory: receiver dives down their normal lane, swings in
        // behind the carrier, then peels out wide for the tap-in.
        const ctrlFt = {
          x: r.receiver.x * 0.3 + r.carrier.x * 0.7,
          y: Math.max(r.carrier.y, r.receiver.y) + 6,
        };
        const startCanvas = { x: toCanvasX(receiverStart.x), y: toCanvasY(receiverStart.y) };
        const ctrlCanvas  = { x: toCanvasX(ctrlFt.x),       y: toCanvasY(ctrlFt.y) };
        const endCanvas   = { x: toCanvasX(r.receiver.x),    y: toCanvasY(r.receiver.y) };

        // Disable hit-testing on the receiver during the animation — Konva
        // can otherwise dispatch dragmove on overlapping shapes when frames
        // re-position the node, occasionally interfering with the defender's
        // drag.
        const wasListening = receiver.listening();
        receiver.listening(false);

        receiverPathHandle = IceQ.Path.animateAlongPath(
          receiver,
          [startCanvas, ctrlCanvas, endCanvas],
          RUSH_DUR,
          {
            easing: Konva.Easings.EaseOut,
            onFinish: () => {
              receiver.listening(wasListening);
              receiverPathHandle = null;
              drawHelpers();
              // Subtle curl-arc indicator: a faint dashed bezier echoing the
              // receiver's path so the kid sees the back-door threat geometry.
              // Konva.Line with bezier:true takes [start, c1, c2, end] for a
              // cubic curve, so we mirror the control point to fake a quadratic.
              if (!sceneNodes.length) return;
              const curlArc = new Konva.Line({
                points: [
                  endCanvas.x, endCanvas.y,
                  ctrlCanvas.x, ctrlCanvas.y,
                  ctrlCanvas.x, ctrlCanvas.y,
                  startCanvas.x, startCanvas.y,
                ],
                bezier: true,
                stroke: 'rgba(206, 32, 46, 0.30)',
                strokeWidth: 1.5, dash: [3, 4],
                opacity: 0, listening: false,
              });
              // Tiny arrowhead at the back-door end to point the kid's eye
              // to where the receiver ended up.
              const curlTip = new Konva.Arrow({
                points: [
                  toCanvasX(ctrlFt.x * 0.35 + r.receiver.x * 0.65),
                  toCanvasY(ctrlFt.y * 0.35 + r.receiver.y * 0.65),
                  endCanvas.x, endCanvas.y,
                ],
                stroke: 'rgba(206, 32, 46, 0.55)', fill: 'rgba(206, 32, 46, 0.55)',
                strokeWidth: 1.5, pointerLength: 6, pointerWidth: 6,
                opacity: 0, listening: false,
              });
              gridLayer.add(curlArc, curlTip);
              sceneNodes.push(curlArc, curlTip);
              curlArc.to({ opacity: 1, duration: 0.4 });
              curlTip.to({ opacity: 1, duration: 0.4 });
            },
          }
        );
      } else {
        // ----- Straight lane (legacy / first-encounter behavior) -----
        receiver.to({
          x: toCanvasX(r.receiver.x), y: toCanvasY(r.receiver.y),
          duration: RUSH_DUR, easing: Konva.Easings.EaseOut,
          onFinish: drawHelpers,
        });
      }
    }

    function drawDefender() {
      // 'skater-back' = body still faces the attackers but the skate-V points
      // toward the kid's own net with a slight backward lean. Real defenders
      // retreat backward on a 2-on-1 so they can read the play and stay
      // between the puck and the net — this sprite kind teaches that posture
      // visually before the kid even drags.
      defender = IceQ.Player.create({
        x: toCanvasX(DEFENDER_START.x), y: toCanvasY(DEFENDER_START.y),
        scale: Math.max(0.65, scale * 0.085),
        color: 'spartan',
        kind: 'skater-back',
        label: 'D', stickSide: 'L',
        draggable: true,
        // v0.14: opt-in to the new SVG image sprites. The defender is the
        // kid's token and the one they stare at most — prime spot to show
        // off the new sprite quality.
        useImageSprite: true,
      });
      // Body to the rush, skates toward our net: that is what backing in
      // looks like. Authored sprites face +y, so turn him around.
      IceQ.Player.face(defender, 'y-');
      defender.on('dragmove', () => {
        const pos = defender.position();
        const minX = toCanvasX(-40), maxX = toCanvasX(40);
        const minY = toCanvasY(2),   maxY = toCanvasY(60);
        defender.x(Math.max(minX, Math.min(maxX, pos.x)));
        defender.y(Math.max(minY, Math.min(maxY, pos.y)));
      });
      // If kid grabs the defender mid-Show-Me-glide, kill the tween so the
      // sprite stops fighting the drag. Otherwise the tween keeps stepping
      // position() each frame and the kid's drag feels rubbery.
      defender.on('dragstart', () => { cancelShowMeGlide(); });
      gridLayer.add(defender);
    }

    function evaluate() {
      const r = currentRush();
      const t = targetForRush(r);
      const pos = defender.position();
      const xFt = (pos.x - rink.width / 2) / scale;
      const yFt = pos.y / scale;
      const dist = Math.hypot(xFt - t.x, yFt - t.y);
      // Common mistake: defender chases the carrier (close to carrier.x)
      const distToCarrier = Math.hypot(xFt - r.carrier.x, yFt - r.carrier.y);
      const chasingCarrier = distToCarrier < 6;
      return {
        target: t,
        dist,
        distToCarrier,
        chasingCarrier,
        inLaneButDeep: Math.abs(xFt - t.x) < 5 && yFt > t.y + 6,
        pass: dist <= TOL_FT,
        rushLabel: r.label,
      };
    }

    function showCorrect() {
      overlayLayer.destroyChildren();
      const r = currentRush();
      const t = targetForRush(r);
      // Pass-line zone (gold)
      overlayLayer.add(new Konva.Circle({
        x: toCanvasX(t.x), y: toCanvasY(t.y),
        radius: TOL_FT * scale,
        fill: 'rgba(224,198,138,0.22)',
        stroke: '#E0C68A', strokeWidth: 2.5, dash: [6, 4],
        opacity: 0,
      })).to({ opacity: 1, duration: 0.4 });
      overlayLayer.add(new Konva.Text({
        x: toCanvasX(t.x) - 80, y: toCanvasY(t.y) - TOL_FT * scale - 20,
        text: 'PLAY THE PASS', width: 160, align: 'center',
        fontSize: 12, fontStyle: '900', fill: '#E0C68A',
        opacity: 0,
      })).to({ opacity: 1, duration: 0.4 });
      // Wrong-answer zone — chasing the carrier
      overlayLayer.add(new Konva.Circle({
        x: toCanvasX(r.carrier.x), y: toCanvasY(r.carrier.y),
        radius: 6 * scale,
        fill: 'rgba(206, 32, 46, 0.15)',
        stroke: '#CE202E', strokeWidth: 1.5, dash: [4, 4],
        opacity: 0,
      })).to({ opacity: 1, duration: 0.4 });
      overlayLayer.add(new Konva.Text({
        x: toCanvasX(r.carrier.x) - 70, y: toCanvasY(r.carrier.y) + 6 * scale + 4,
        text: "DON'T CHASE", width: 140, align: 'center',
        fontSize: 10, fontStyle: '800', fill: '#CE202E',
        opacity: 0,
      })).to({ opacity: 1, duration: 0.4 });
      overlayLayer.batchDraw();
      // Slide the defender sprite to the correct spot — Show Me becomes a
      // demonstration, not just a diagram. Cancel any prior glide first so
      // a rapid Show-Me/Reset/Show-Me sequence doesn't stack tweens.
      if (defender) {
        cancelShowMeGlide();
        showMeGlideActive = true;
        defender.to({
          x: toCanvasX(t.x), y: toCanvasY(t.y),
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
      // the glide tween and the sprite jitters.
      cancelShowMeGlide();
      defender.to({
        x: toCanvasX(DEFENDER_START.x),
        y: toCanvasY(DEFENDER_START.y),
        duration: 0.4, easing: Konva.Easings.EaseInOut,
      });
    }

    drawNet();
    drawAttackers();
    drawDefender();
    gridLayer.batchDraw();

    // ---- Contrast playback (v0.13) ---------------------------------------
    // Three functions that drive IceQ.Path.showContrast: a "wrong replay"
    // (kid chased the carrier -> cross-ice pass -> tap-in goal), a "reset"
    // that snaps puck/attackers/defender back to the start of the rush, and a
    // "right replay" (D plays the pass line -> carrier forced to shoot ->
    // goalie saves). Each function honors the skipSignal so the orchestrator
    // can bail mid-phase when the kid taps Skip Ahead.
    //
    // Coordinate convention: feet for the rush definitions; canvas px for
    // animatePuckPass / animateAlongPath endpoints (those modules are
    // rink-agnostic).

    function pickGoalieSavePoint(carrier) {
      // Goalie deflects the puck to the corner on the SAME side as the
      // shooter — close-side rebound is the realistic outcome of a forced
      // shot from a 2-on-1 carrier. Use whichever corner the carrier is on.
      const cornerX = carrier.x >= 0 ? 32 : -32;
      return { x: cornerX, y: 56 };
    }

    function netCenter()    { return { xFt: 0, yFt: 64 }; }
    function netBackPost(side) {
      // Tap-in lands at the BACK post on the receiver's side — the cross-ice
      // pass takes the goalie out of the play and the receiver buries it
      // far-post. Tiny offset inside the net for visual realism.
      return { xFt: side > 0 ? 2 : -2, yFt: 65 };
    }

    function playWrong(skipSignal) {
      // Caller's promise: animate the bad outcome. D's CURRENT position is
      // preserved (we don't move D — that's the whole point: kid sees their
      // own positioning being beaten). Carrier passes cross-ice -> receiver
      // taps it in -> GOAL flash + horn.
      const sig = skipSignal || { skipped: false };
      const r = currentRush();

      return (async function () {
        if (sig.skipped) return;
        if (!carrierNode || !receiverNode || !puckNode) return;

        // Hide the original puck while the animated copy travels — otherwise
        // the kid sees TWO pucks (the static one + the moving one).
        const origPuckVisible = puckNode.visible();
        puckNode.visible(false);

        const sideSign = r.receiver.x >= 0 ? 1 : -1;
        const backPostFt = netBackPost(sideSign);
        const backPostCanvas = { x: toCanvasX(backPostFt.xFt), y: toCanvasY(backPostFt.yFt) };

        // Phase 0: the rush KEEPS COMING. Carrier drives his lane to the top
        // of the circle with the puck on his blade; the receiver drives the
        // back post. (Before 2026-08-18 the attackers stood still and the
        // "tap-in" was a 43 ft one-timer at 73 mph.)
        const carrierDriveFt  = { x: r.carrier.x * 0.9, y: 42 };
        const receiverDriveFt = { x: sideSign * 7, y: 57 };
        const carrierDrive  = { x: toCanvasX(carrierDriveFt.x),  y: toCanvasY(carrierDriveFt.y) };
        const receiverDrive = { x: toCanvasX(receiverDriveFt.x), y: toCanvasY(receiverDriveFt.y) };
        puckNode.visible(true);
        const driveSec = 1.15;   // 35 ft in ~1.15 s = ~30 ft/s with the ease; a rush, not a blur
        carrierNode.to({ x: carrierDrive.x, y: carrierDrive.y, duration: driveSec, easing: Konva.Easings.EaseIn });
        receiverNode.to({ x: receiverDrive.x, y: receiverDrive.y, duration: driveSec, easing: Konva.Easings.EaseIn });
        {
          const pEnd = IceQ.Player.puckPosFor(carrierNode, carrierDrive);
          puckNode.to({ x: pEnd.x, y: pEnd.y, duration: driveSec, easing: Konva.Easings.EaseIn });
        }
        await IceQ.Path.wait(driveSec * 1000 + 30);
        if (sig.skipped) return;
        puckNode.visible(false);

        // Phase a: cross-ice pass, blade to blade. If the kid's D is standing
        // in the lane (his sprite within ~5 ft of the line), it becomes a
        // SAUCER: higher arc, over the stick. A puck through a body is the
        // physics that turns hockey kids off; a saucer over a stick is a play.
        const passFrom = IceQ.Player.puckPosFor(carrierNode, carrierDrive);
        const passTo   = IceQ.Player.puckPosFor(receiverNode, receiverDrive);
        let arc = 8;
        if (defender) {
          const dx = passTo.x - passFrom.x, dy = passTo.y - passFrom.y;
          const L2 = dx * dx + dy * dy || 1;
          const tt = Math.max(0, Math.min(1, ((defender.x() - passFrom.x) * dx + (defender.y() - passFrom.y) * dy) / L2));
          const dist = Math.hypot(defender.x() - (passFrom.x + tt * dx), defender.y() - (passFrom.y + tt * dy));
          if (dist < 5 * scale) arc = 26;
        }
        const passHandle = trackHandle(IceQ.Path.animatePuckPass(
          gridLayer, passFrom, passTo,
          { duration: 0.6, arcHeight: arc }
        ));
        await passHandle.promise;
        if (sig.skipped) { puckNode.visible(origPuckVisible); return; }

        // Phase b: tap-in from the receiver's blade at the back post, ~7 ft.
        const tapHandle = trackHandle(IceQ.Path.animatePuckPass(
          gridLayer, passTo, backPostCanvas,
          { duration: 0.18 }
        ));
        await tapHandle.promise;
        if (sig.skipped) { puckNode.visible(origPuckVisible); return; }

        // Phase c: GOAL.
        try { IceQ.Audio.goalAgainst ? IceQ.Audio.goalAgainst() : null; } catch (e) {}
        await IceQ.Path.animateGoalConsequence(rink, { kind: 'goal', duration: 1.2 });

        // Restore the original puck's visibility — resetPositions will move
        // it back to its proper start spot.
        puckNode.visible(origPuckVisible);
      })();
    }

    function resetPositions(skipSignal) {
      // Snap attackers + puck back to the rush's STARTING (final-rush) spots
      // so the right-way replay starts from a clean board. Defender stays
      // wherever the kid put them — the playRight function will move D to
      // the optimal spot itself.
      const sig = skipSignal || { skipped: false };
      return (async function () {
        if (sig.skipped) return;
        if (!carrierNode || !receiverNode || !puckNode) return;
        const r = currentRush();
        carrierNode.position({ x: toCanvasX(r.carrier.x), y: toCanvasY(r.carrier.y) });
        receiverNode.position({ x: toCanvasX(r.receiver.x), y: toCanvasY(r.receiver.y) });
        puckNode.position(IceQ.Player.puckPosFor(carrierNode));
        puckNode.visible(true);
        gridLayer.batchDraw();
        await IceQ.Path.wait(150);
      })();
    }

    function playRight(skipSignal) {
      // Caller's promise: animate the correct play. D moves to the optimal
      // pass-line spot -> carrier is forced to shoot (puck travels straight
      // toward goalie) -> goalie kicks it to the corner -> SAVED flash + pling.
      const sig = skipSignal || { skipped: false };
      const r = currentRush();
      const t = targetForRush(r);

      return (async function () {
        if (sig.skipped) return;
        if (!defender || !carrierNode || !puckNode || !goalieNode) return;

        // Phase a: D glides to the optimal pass-line spot.
        const targetCanvas = { x: toCanvasX(t.x), y: toCanvasY(t.y) };
        let dResolve;
        const dPromise = new Promise(function (res) { dResolve = res; });
        defender.to({
          x: targetCanvas.x, y: targetCanvas.y,
          duration: 0.5, easing: Konva.Easings.EaseInOut,
          onFinish: dResolve,
        });
        // Track a synthetic stop handle so skip can interrupt the D move.
        trackHandle({
          stop: function () {
            try { defender.getTween && defender.getTween() && defender.getTween().pause(); } catch (e) {}
            dResolve();
          },
        });
        await dPromise;
        if (sig.skipped) return;

        // Phase b: carrier is forced to shoot — puck travels from carrier to
        // a point just in front of the goalie (~5 ft above goal line, dead
        // center). Hide the static puck during the animated copy.
        // The carrier still drives (the D took the PASS away, not the rush),
        // then has to shoot from the top of the circle into a set goalie.
        const origPuckVisible = puckNode.visible();
        const DRV = 1.1;   // ~20-25 ft/s, a rush, not a blur
        const cDrive = { x: toCanvasX(r.carrier.x * 0.9), y: toCanvasY(40) };
        const rDriveFt = { x: r.receiver.x * 0.8, y: r.receiver.y + 16 };
        carrierNode.to({ x: cDrive.x, y: cDrive.y, duration: DRV, easing: Konva.Easings.EaseIn });
        receiverNode.to({ x: toCanvasX(rDriveFt.x), y: toCanvasY(rDriveFt.y), duration: DRV, easing: Konva.Easings.EaseIn });
        {
          const pEnd = IceQ.Player.puckPosFor(carrierNode, cDrive);
          puckNode.to({ x: pEnd.x, y: pEnd.y, duration: DRV, easing: Konva.Easings.EaseIn });
        }
        // The D backs in WITH the rush, stick still in the new pass lane
        // (t=0.6 of carrier->receiver, 4 ft of depth). Before QC 2026-08-18
        // he stood at the old spot while the rush went past him, and the
        // "forced shot" made no sense.
        if (defender) {
          const dx = r.carrier.x * 0.9 * 0.4 + rDriveFt.x * 0.6;
          const dy = 40 * 0.4 + rDriveFt.y * 0.6 + 4;
          defender.to({ x: toCanvasX(dx), y: toCanvasY(dy), duration: DRV, easing: Konva.Easings.EaseIn });
        }
        await IceQ.Path.wait(DRV * 1000 + 30);
        if (sig.skipped) return;
        puckNode.visible(false);
        const carrierCanvas = IceQ.Player.puckPosFor(carrierNode, cDrive);
        const goalieCanvas  = { x: toCanvasX(0), y: toCanvasY(58) };
        const shotHandle = trackHandle(IceQ.Path.animatePuckPass(
          gridLayer, carrierCanvas, goalieCanvas,
          { duration: 0.32 }
        ));
        await shotHandle.promise;
        if (sig.skipped) { puckNode.visible(origPuckVisible); return; }

        // Phase c: goalie deflects to the corner — short rebound puck pass
        // shows the save physically, then SAVED flash + pling.
        const cornerFt = pickGoalieSavePoint(r.carrier);
        const cornerCanvas = { x: toCanvasX(cornerFt.x), y: toCanvasY(cornerFt.y) };
        const reboundHandle = trackHandle(IceQ.Path.animatePuckPass(
          gridLayer, goalieCanvas, cornerCanvas,
          { duration: 0.7, arcHeight: 6 }
        ));
        await reboundHandle.promise;
        if (sig.skipped) { puckNode.visible(origPuckVisible); return; }

        try { IceQ.Audio.savePling(); } catch (e) {}
        await IceQ.Path.animateGoalConsequence(rink, { kind: 'saved', duration: 1.0 });
        puckNode.visible(origPuckVisible);
        // Rush back to its start picture so the retry begins clean.
        carrierNode.position({ x: toCanvasX(r.carrier.x), y: toCanvasY(r.carrier.y) });
        receiverNode.position({ x: toCanvasX(r.receiver.x), y: toCanvasY(r.receiver.y) });
        puckNode.position(IceQ.Player.puckPosFor(carrierNode));
        gridLayer.batchDraw();
      })();
    }

    function buildContrastContext(skipSignal) {
      const sig = skipSignal || { skipped: false };
      return {
        rink: rink,
        playWrong: function ()      { return playWrong(sig); },
        resetPositions: function () { return resetPositions(sig); },
        playRight: function ()      { return playRight(sig); },
        skipSignal: sig,
        wrongLabel: 'OOF, WATCH THIS\u2026',
        middleLabel: 'BUT INSTEAD\u2026',
        rightLabel: "THAT'S THE READ",
      };
    }

    function showContrastReplay(skipSignal) {
      const sig = skipSignal || { skipped: false };
      contrastHandles = [];
      const ctx = buildContrastContext(sig);
      return IceQ.Path.showContrast(ctx).then(function (res) {
        contrastHandles = [];
        return res;
      });
    }

    function nextRush() {
      stopAllContrast();
      rushIdx = (rushIdx + 1) % ACTIVE_RUSHES.length;
      clearOverlay();
      drawAttackers();
      defender.moveToTop();
      resetDefender();
      gridLayer.batchDraw();
      return { rushIdx, rush: currentRush(), totalRushes: ACTIVE_RUSHES.length };
    }

    return {
      rink,
      check: evaluate,
      showMe: showCorrect,
      reset: () => {
        stopAllContrast(); clearOverlay(); resetDefender();
        // Skip/Reset mid-replay used to leave the attackers parked at the
        // drive spots while the grading still used the authored rush.
        try {
          const r = currentRush();
          if (carrierNode) { carrierNode.stop(); carrierNode.position({ x: toCanvasX(r.carrier.x), y: toCanvasY(r.carrier.y) }); }
          if (receiverNode) { receiverNode.stop(); receiverNode.position({ x: toCanvasX(r.receiver.x), y: toCanvasY(r.receiver.y) }); }
          if (puckNode && carrierNode) { puckNode.stop(); puckNode.visible(true); puckNode.position(IceQ.Player.puckPosFor(carrierNode)); }
          gridLayer.batchDraw();
        } catch (e) { /* scene may be mid-rebuild */ }
      },
      nextRush,
      currentRushInfo: () => ({ rushIdx, rush: currentRush(), totalRushes: ACTIVE_RUSHES.length }),
      isDone: () => evaluate().pass,
      // v0.13 contrast playback. playWrongConsequence and playRightAnswer each
      // take an optional skipSignal; showContrastReplay runs the whole
      // orchestrator (wrong -> divider -> right -> success) using IceQ.Path.
      playWrongConsequence: (skipSignal) => playWrong(skipSignal),
      playRightAnswer: (skipSignal) => playRight(skipSignal),
      showContrastReplay: (skipSignal) => showContrastReplay(skipSignal),
      stopContrast: () => stopAllContrast(),
    };
  }

  function phrasedFeedback(res) {
    if (res.pass) {
      return `On the pass line. The carrier has to shoot, your goalie sees it. ${res.target.desc}`;
    }
    if (res.chasingCarrier) {
      return "You committed to the puck carrier — and now the cross-ice pass is open for a tap-in. On a 2-on-1, D plays the PASS, goalie plays the SHOT.";
    }
    if (res.dist > 14) {
      return "Way off the pass line. The cross-ice pass is wide open. Get between the two attackers.";
    }
    if (res.inLaneButDeep) {
      return "You're in the lane but backing in too deep. Tighten the gap so the carrier can't walk to the top of the circle.";
    }
    return "Close — but not quite on the pass line. Slide so your stick is in the passing lane.";
  }

  return { init, phrasedFeedback, RUSHES };
})();
