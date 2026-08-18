// Scenario: Net-Front Defense.
//
// An opposing forward is parked in front of OUR net. The puck is somewhere
// — point shot incoming, OR cross-ice pass coming. Two right answers:
//   BOX-OUT — body between attacker and goalie (shot is the threat — clear
//             rebounds; goalie sees the puck)
//   FRONTING — body between attacker and the PUCK (pass is the threat —
//              break up the cross-ice or back-door pass)
//
// Kid drags defender to the right spot. The right spot DEPENDS on where
// the puck is. Three variants — point shot (box-out), cross-ice from
// strong-side corner (fronting strong), back-door from behind net (fronting net side).
//
// v0.12 additions:
//   * Per-setup tolerance radius on target (point-shot is tighter than
//     fronting — kid must be ON the shot line; fronting allows more
//     lateral wiggle in the passing lane).
//   * Animated threat: when a setup loads, the puck travels from its
//     origin toward the net-front (or back-door spot), so the kid SEES
//     the threat develop instead of staring at a static arrow.
//
// v0.13 additions — contrast replay:
//   * playWrongConsequence() — per setup, the WRONG technique's failure
//     mode plays out (rebound for a goal / cross-ice pass gets through /
//     back-door tap-in). Each setup has a DISTINCT bad outcome; the point
//     is to make the COST of the wrong read tangible, not a generic
//     "oops nobody was there."
//   * playRightAnswer() — defender snaps to the correct spot per mode
//     (boxout vs front) and the puck is cleanly saved or intercepted at
//     the defender's body.
//   * showContrastReplay() — orchestrates wrong-then-right via
//     IceQ.Path.showContrast. Scenarios stay thin; path.js does the
//     "OOF / BUT INSTEAD / THAT'S THE READ" label sequencing.
//   * resetPositions() snaps defender back to START (not the kid's wrong
//     spot). Rationale: showing the RIGHT play starting from a wrong
//     position is visually confusing — the kid just saw what wrong looks
//     like. A clean reset sets up the correct read cleanly.

window.IceQ = window.IceQ || {};

window.IceQ.NetFront = (function () {
  const ATTACKER_POS = { x: 0, y: 60 };  // slot/net-front, just above the crease

  // Three setups. Each defines:
  //   * puck    — where the puck STARTS (origin of the threat)
  //   * threatTo — where the puck travels TO during the intro animation.
  //                For shots: roughly the net. For passes: the receiver/spot.
  //   * mode    — boxout vs fronting (drives feedback wording + overlay color)
  //   * target  — { x, y, shape, radius, desc } the right defensive spot
  //   * threatDuration — seconds for the puck travel; tuned per setup
  //                       (slap shot fast, cross-ice longer, back-door medium)
  //
  // Targets calibrated per Coach round-2 review: keep defenders OUT of
  // the crease (y < 64). Radii calibrated for v0.12 pedagogy:
  //   * point-shot box-out: 5ft — tight, must be ON the shot line
  //   * corner-pass front:  7ft — passing lane has lateral wiggle
  //   * back-door front:    6ft — net-side lane is narrower than corner
  // Shape stays 'circle' for v0.12 simplicity. v0.13 may switch to ovals
  // oriented along the threat line (longer along the lane, shorter
  // perpendicular) — see writeup at end.
  const SETUPS = [
    {
      key: 'point-shot', label: 'point shot incoming',
      puck: { x: 0, y: 8 },
      threatTo: { x: 0, y: 64 },     // puck travels at the net
      threatDuration: 0.7,            // slap shot — quick
      mode: 'boxout',
      target: {
        x: 0, y: 62, shape: 'circle', radius: 5,
        desc: 'BOX OUT — body between attacker and goalie. Stick on stick. Clear the rebound.',
      },
    },
    {
      key: 'corner-pass', label: 'cross-ice pass from the strong-side corner',
      puck: { x: 22, y: 58 },
      threatTo: { x: 6, y: 60 },     // puck travels to net-front / receiver
      threatDuration: 1.1,            // cross-ice — longest travel
      mode: 'fronting',
      target: {
        x: 6, y: 58, shape: 'circle', radius: 7,
        desc: 'FRONT — body between attacker and the puck. Stick in the passing lane.',
      },
    },
    {
      key: 'back-door', label: 'back-door pass from behind the net',
      puck: { x: -8, y: 70 },
      threatTo: { x: -2, y: 61 },    // puck travels to back-door spot
      threatDuration: 0.9,            // wrap-around / back-door — medium
      mode: 'fronting',
      target: {
        x: -2, y: 61, shape: 'circle', radius: 6,
        desc: 'FRONT (net-side) — body between attacker and the puck. Stick in the back-door lane.',
      },
    },
  ];

  // Default tolerance for any setup that doesn't specify target.radius
  // (defensive — keeps evaluate()/showCorrect() working if a future setup
  // is added without a radius).
  const TOL_FT = 7;
  const DEFENDER_START = { x: 0, y: 30 };

  function init(rinkContainer) {
    const rink = IceQ.Rink.create(rinkContainer);
    if (rink.labelNet) rink.labelNet('ours');   // zone cue: whose net is this
    const { toCanvasX, toCanvasY, scale, overlayLayer, gridLayer } = rink;

    let setupIdx = 0;
    let defender = null;
    let attackerNode = null;
    let puckNode = null;
    let arrowNode = null;
    let setupNodes = [];
    // Handle for the in-flight threat animation. We hold onto it so
    // reset() / nextSetup() can cancel cleanly mid-flight — otherwise
    // the puck keeps gliding to the OLD destination after the kid
    // restarts or moves on.
    let threatHandle = null;
    // Flag for the in-flight Show-Me glide so reset() and dragstart can stop
    // it mid-flight. Without this a tap-Reset-mid-glide leaves the tween
    // racing in the background and overrides the snap-back. Uses the
    // node.getTween() idiom that the rest of the codebase uses (more
    // reliable than capturing the .to() return value across Konva versions).
    let showMeGlideActive = false;
    function cancelShowMeGlide() {
      if (showMeGlideActive && defender && defender.getTween && defender.getTween()) {
        try { defender.getTween().pause(); } catch (e) { /* ignore */ }
        try { defender.getTween().destroy(); } catch (e) { /* ignore */ }
      }
      showMeGlideActive = false;
    }

    function currentSetup() { return SETUPS[setupIdx]; }

    function targetRadiusFt(s) {
      return (s.target && s.target.radius != null) ? s.target.radius : TOL_FT;
    }

    function drawNet() {
      gridLayer.add(new Konva.Rect({
        x: toCanvasX(-3), y: toCanvasY(64),
        width: 6 * scale, height: 3.5 * scale,
        stroke: '#CE202E', strokeWidth: 2, fill: 'rgba(214,35,40,0.05)',
      }));
    }

    // Cancel any in-flight puck animation. Safe to call when nothing
    // is animating (handle.stop is a no-op once finished).
    function cancelThreat() {
      if (threatHandle && typeof threatHandle.stop === 'function') {
        try { threatHandle.stop(); } catch (e) { /* ignore */ }
      }
      threatHandle = null;
    }

    function drawScenarioObjects() {
      // Cancel any prior animation before tearing down nodes that
      // animation might still be touching.
      cancelThreat();
      setupNodes.forEach(n => n.destroy());
      setupNodes = [];
      puckNode = null;
      arrowNode = null;

      const s = currentSetup();
      const fromX = toCanvasX(s.puck.x), fromY = toCanvasY(s.puck.y);
      const toX = toCanvasX(s.threatTo.x), toY = toCanvasY(s.threatTo.y);

      // The opposing forward parked at the net front
      attackerNode = IceQ.Player.create({
        x: toCanvasX(ATTACKER_POS.x), y: toCanvasY(ATTACKER_POS.y),
        scale: Math.max(0.6, scale * 0.085),
        color: 'opponent', stickSide: 'L',
      });

      // Faint guide arrow drawn FIRST. Shown at low opacity during the
      // puck flight (so kid registers the lane), then bumped to fuller
      // opacity once the puck arrives (so the static rest of the scene
      // reads as "this is the threat path the puck just took").
      arrowNode = new Konva.Arrow({
        points: [fromX, fromY, toX, toY],
        stroke: 'rgba(206, 32, 46, 0.45)', fill: 'rgba(206, 32, 46, 0.45)',
        strokeWidth: 2, pointerLength: 7, pointerWidth: 7,
        dash: [4, 3],
        opacity: 0.20,
      });
      gridLayer.add(arrowNode, attackerNode);
      setupNodes.push(arrowNode, attackerNode);

      // Animate the puck from its origin toward the threat destination.
      // Prefer IceQ.Path.animatePuckPass when available — it handles
      // creation/cleanup and returns a stop()-able handle. Fallback uses
      // a raw Konva node + .to() so the scenario still works if path.js
      // hasn't loaded yet (defensive — shouldn't happen in normal flow).
      const radiusPx = Math.max(5, scale * 0.7);
      const dur = s.threatDuration != null ? s.threatDuration : 1.0;

      if (window.IceQ && window.IceQ.Path && IceQ.Path.animatePuckPass) {
        // Capture the arrow ref so a late-firing onFinish from a stale
        // animation doesn't poke the NEW setup's arrow. cancelThreat()
        // also covers this, but belt-and-suspenders.
        const capturedArrow = arrowNode;
        threatHandle = IceQ.Path.animatePuckPass(
          gridLayer,
          { x: fromX, y: fromY },
          { x: toX, y: toY },
          {
            duration: dur,
            radius: radiusPx,
            persist: true,        // leave puck at destination — static rest of scene reads naturally
            // animatePuckPass uses EaseInOut; we override below for the
            // tween if it ever exposes easing. For now we accept the
            // default — visually close enough to EaseOut at this duration.
            onFinish: function () {
              // Bump the guide arrow up to its normal visibility once
              // the puck has arrived. Guard against the node having
              // been destroyed by reset/nextSetup mid-flight.
              if (capturedArrow && capturedArrow.isDestroyed && !capturedArrow.isDestroyed()) {
                capturedArrow.to({ opacity: 0.65, duration: 0.25 });
              }
            },
          }
        );
        // Track the puck node from the path helper so the static scene
        // has a handle to the resting puck (for showMe references etc).
        puckNode = threatHandle.node;
        if (puckNode) setupNodes.push(puckNode);
      } else {
        // Fallback: bare Konva tween. Same visual contract.
        puckNode = new Konva.Circle({
          x: fromX, y: fromY,
          radius: radiusPx,
          fill: '#0A0A0A', stroke: '#E0C68A', strokeWidth: 1.5,
        });
        gridLayer.add(puckNode);
        setupNodes.push(puckNode);
        const captured = arrowNode;
        puckNode.to({
          x: toX, y: toY,
          duration: dur,
          easing: Konva.Easings.EaseOut,
          onFinish: function () {
            if (captured && !captured.isDestroyed()) {
              captured.to({ opacity: 0.65, duration: 0.25 });
            }
          },
        });
        // Minimal stop() shim so cancelThreat() works in the fallback path.
        threatHandle = {
          stop: function () {
            if (puckNode && puckNode.getTween && puckNode.getTween()) {
              try { puckNode.getTween().pause(); } catch (e) { /* ignore */ }
            }
          },
        };
      }

      gridLayer.batchDraw();
    }

    function drawDefender() {
      defender = IceQ.Player.create({
        x: toCanvasX(DEFENDER_START.x), y: toCanvasY(DEFENDER_START.y),
        scale: Math.max(0.65, scale * 0.085),
        color: 'spartan', label: 'YOU', stickSide: 'L',
        draggable: true,
      });
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

    function evaluate() {
      const s = currentSetup();
      const t = s.target;
      const pos = defender.position();
      const xFt = (pos.x - rink.width / 2) / scale;
      const yFt = pos.y / scale;
      const dist = Math.hypot(xFt - t.x, yFt - t.y);
      const tol = targetRadiusFt(s);
      // v0.12: shape is always 'circle' so we just check dist <= radius.
      // When v0.13 introduces oval shapes, dispatch on t.shape here and
      // compute the appropriate distance-in-ellipse-coords check.
      return {
        mode: s.mode,
        setupKey: s.key,
        setupLabel: s.label,
        target: t,
        dist,
        tol,
        pass: dist <= tol,
      };
    }

    function showCorrect() {
      overlayLayer.destroyChildren();
      const s = currentSetup();
      const t = s.target;
      const tol = targetRadiusFt(s);
      const color = s.mode === 'boxout' ? '#E0C68A' : '#0D5EAB';
      // Arrow from kid's defender to the correct spot
      if (defender) {
        const cur = defender.position();
        const targetX = toCanvasX(t.x), targetY = toCanvasY(t.y);
        if (Math.hypot(targetX - cur.x, targetY - cur.y) > 8) {
          const arrow = new Konva.Arrow({
            points: [cur.x, cur.y, targetX, targetY],
            stroke: color, fill: color,
            strokeWidth: 2, dash: [4, 4],
            pointerLength: 8, pointerWidth: 8,
            opacity: 0,
          });
          overlayLayer.add(arrow);
          arrow.to({ opacity: 0.65, duration: 0.3 });
        }
      }
      overlayLayer.add(new Konva.Circle({
        x: toCanvasX(t.x), y: toCanvasY(t.y),
        radius: tol * scale,
        fill: 'rgba(224,198,138,0.18)',
        stroke: color, strokeWidth: 2.5, dash: [6, 4],
        opacity: 0,
      })).to({ opacity: 1, duration: 0.4 });
      overlayLayer.add(new Konva.Text({
        x: toCanvasX(t.x) - 80, y: toCanvasY(t.y) - tol * scale - 20,
        text: s.mode === 'boxout' ? 'BOX OUT' : 'FRONT',
        width: 160, align: 'center',
        fontSize: 14, fontStyle: '900', fill: color,
        opacity: 0,
      })).to({ opacity: 1, duration: 0.4 });
      overlayLayer.batchDraw();
      // Slide the defender sprite to the target spot — Show Me becomes a
      // demonstration. Kid sees WHERE to be, not just a circle to aim at.
      // Cancel any prior glide first so back-to-back Show-Me presses don't
      // stack tweens.
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
      // the glide and the sprite jitters.
      cancelShowMeGlide();
      defender.to({
        x: toCanvasX(DEFENDER_START.x),
        y: toCanvasY(DEFENDER_START.y),
        duration: 0.4, easing: Konva.Easings.EaseInOut,
      });
    }

    drawNet();
    drawScenarioObjects();
    drawDefender();
    gridLayer.batchDraw();

    function nextSetup() {
      cancelThreat();
      // Also clear any leftover wrong-replay state in case a replay was
      // skipped or interrupted before its own cleanup ran.
      if (typeof cancelWrongReplay === 'function') cancelWrongReplay();
      setupIdx = (setupIdx + 1) % SETUPS.length;
      clearOverlay();
      drawScenarioObjects();
      defender.moveToTop();
      resetDefender();
      gridLayer.batchDraw();
      return { setupIdx, setup: currentSetup(), totalSetups: SETUPS.length };
    }

    // ------- v0.13 CONTRAST REPLAY -------
    //
    // Per-setup wrong-outcome animations. Each is DISTINCT because the
    // failure mode depends on which technique the defender should have
    // used:
    //   * point-shot: boxing out was right. Fronting means the goalie
    //     can't see through the defender's body AND the rebound lies
    //     uncontested at the attacker's stick → tap-in.
    //   * corner-pass: fronting was right. Boxing out (body between
    //     attacker and goalie) leaves the CROSS-ICE LANE wide open —
    //     the pass slides through to the attacker's stick → slot goal.
    //   * back-door: fronting net-side was right. Boxing out lets the
    //     back-door pass go THROUGH the defender's body (literally
    //     behind him, between him and the post) → far-post tap-in.
    //
    // Per setup we keep a handle on the replay-phase animations so
    // skip / reset can stop them cleanly. This uses the same
    // cancelThreat() infrastructure but with its own handle pool —
    // wrongReplayHandles is cleared between phases.
    let wrongReplayHandles = [];
    let replayPuckNodes = [];

    function cancelWrongReplay() {
      wrongReplayHandles.forEach(function (h) {
        if (h && typeof h.stop === 'function') {
          try { h.stop(); } catch (e) { /* ignore */ }
        }
      });
      wrongReplayHandles = [];
      replayPuckNodes.forEach(function (n) {
        if (n && typeof n.destroy === 'function' && n.isDestroyed && !n.isDestroyed()) {
          try { n.destroy(); } catch (e) { /* ignore */ }
        }
      });
      replayPuckNodes = [];
    }

    // Hide the static intro puck so the replay has ONE visible puck in
    // flight — avoids "two pucks on the ice" confusion. Re-exposed after.
    let introPuckHiddenOpacity = null;
    function hideIntroPuck() {
      if (puckNode && puckNode.isDestroyed && !puckNode.isDestroyed()) {
        introPuckHiddenOpacity = puckNode.opacity();
        puckNode.opacity(0);
        gridLayer.batchDraw();
      }
    }
    function restoreIntroPuck() {
      if (puckNode && puckNode.isDestroyed && !puckNode.isDestroyed()) {
        puckNode.opacity(introPuckHiddenOpacity != null ? introPuckHiddenOpacity : 1);
        gridLayer.batchDraw();
      }
    }

    // Chain N puck animations as a promise: leg0.from → leg0.to, then leg1.from
    // → leg1.to, etc. Each leg's puck handle is registered in wrongReplayHandles
    // so cancelWrongReplay() can stop mid-flight. We also register a wrapper
    // cancel handle FIRST so a cancel arriving before leg-1 is created still
    // takes effect.
    function animatePuckLegged(layer, legs) {
      const radiusPx = Math.max(5, scale * 0.7);
      let cancelled = false;
      let resolveOuter;
      const promise = new Promise(function (res) { resolveOuter = res; });

      // Register cancel wrapper FIRST so cancelWrongReplay() always has a
      // toggle even if it fires before any leg's handle is pushed.
      wrongReplayHandles.push({
        stop: function () { cancelled = true; resolveOuter(); },
      });

      function runLeg(i, from) {
        if (cancelled || i >= legs.length) { resolveOuter(); return; }
        const leg = legs[i];
        const handle = IceQ.Path.animatePuckPass(layer, from, leg.to, {
          duration: leg.duration != null ? leg.duration : 0.5,
          radius: radiusPx,
          persist: leg.persist !== false,   // default true — puck stays visible
          color: leg.color || '#0A0A0A',
          stroke: leg.stroke || '#E0C68A',
          onFinish: function () {
            if (cancelled) return;
            if (typeof leg.onFinish === 'function') leg.onFinish();
            runLeg(i + 1, leg.to);
          },
        });
        wrongReplayHandles.push(handle);
        if (handle.node) replayPuckNodes.push(handle.node);
        // Destroy prior-leg pucks so we don't stack duplicates on screen.
        // Keep only the CURRENT leg's puck visible.
        if (i > 0 && replayPuckNodes.length > 1) {
          const stale = replayPuckNodes[replayPuckNodes.length - 2];
          if (stale && stale.isDestroyed && !stale.isDestroyed()) stale.destroy();
        }
      }
      runLeg(0, legs[0].from);
      return promise;
    }

    // Where the WRONG technique's puck ends up for each setup. Canvas coords.
    // For the point-shot case the "rebound" lands low slot-ish — kicked off the
    // attacker's stick (who would be in front but NOT boxed out) and slides
    // into the net. For corner-pass, the "cross-ice through" lands at the
    // back-post. For back-door, the pass goes through to the far post.
    function wrongConsequenceTarget(s) {
      if (s.key === 'point-shot') {
        // Rebound off attacker's stick → into the net low. Slight offset from net center.
        return { x: 3, y: 65 };
      }
      if (s.key === 'corner-pass') {
        // Cross-ice pass continues THROUGH the box-out (back side of the D) to the attacker at the slot → back post redirect.
        return { x: -4, y: 65 };
      }
      // back-door: pass goes net-side past the boxing-out defender → far-post tap-in.
      return { x: 4, y: 65 };
    }

    // Right-answer puck endpoints. For boxout, the shot reaches the goalie
    // (who makes the save); for fronting, the puck stops AT the defender
    // (intercepted). Returns canvas-coord target.
    function rightConsequenceTarget(s) {
      if (s.mode === 'boxout') {
        // Shot hits the goalie. Goalie sits at y~66 (top of crease in our coord system).
        return { x: 0, y: 66 };
      }
      // Fronting: the defender's position intercepts the pass.
      const t = s.target;
      return { x: t.x, y: t.y };
    }

    async function playWrongConsequence() {
      cancelWrongReplay();
      cancelThreat();
      const s = currentSetup();
      // Hide the static "intro" puck so the replay tells a clean single story.
      hideIntroPuck();

      const originCanvas = { x: toCanvasX(s.puck.x), y: toCanvasY(s.puck.y) };
      const threatToCanvas = { x: toCanvasX(s.threatTo.x), y: toCanvasY(s.threatTo.y) };
      const wrongEnd = wrongConsequenceTarget(s);
      const wrongEndCanvas = { x: toCanvasX(wrongEnd.x), y: toCanvasY(wrongEnd.y) };

      // Leg 1: origin → threatTo (the puck reaches the attacker / spot).
      // Leg 2: short pause via an in-place micro-leg, then deflection/continuation
      //        → wrongEnd (the goal location). We use two actual legs for clarity.
      //
      // Timing:
      //   Leg 1 duration matches the original setup's threatDuration so the
      //   visual matches what the kid saw at intro. Leg 2 is faster — the
      //   deflection/redirect happens quickly.
      const leg1Dur = s.threatDuration != null ? s.threatDuration : 0.9;
      const legs = [
        { from: originCanvas, to: threatToCanvas, duration: leg1Dur, persist: true },
        { from: threatToCanvas, to: wrongEndCanvas, duration: 0.45, persist: true },
      ];
      await animatePuckLegged(gridLayer, legs);

      // Goal moment — red flash + shake + horn.
      if (IceQ.Audio && typeof IceQ.Audio.goalHorn === 'function') {
        IceQ.Audio.goalHorn();
      }
      if (IceQ.Path && typeof IceQ.Path.animateGoalConsequence === 'function') {
        await IceQ.Path.animateGoalConsequence(rink, { kind: 'goal', duration: 1.0 });
      }
      // Clean up replay pucks so scene isn't cluttered when right-play starts.
      replayPuckNodes.forEach(function (n) {
        if (n && n.isDestroyed && !n.isDestroyed()) n.destroy();
      });
      replayPuckNodes = [];
      gridLayer.batchDraw();
    }

    async function playRightAnswer() {
      cancelWrongReplay();
      cancelThreat();
      const s = currentSetup();
      hideIntroPuck();

      // Snap defender to the correct spot (animated — reads as "this is where
      // you should stand"). Uses the center of the target zone.
      const targetCanvasX = toCanvasX(s.target.x);
      const targetCanvasY = toCanvasY(s.target.y);
      await new Promise(function (resolve) {
        defender.to({
          x: targetCanvasX, y: targetCanvasY,
          duration: 0.45, easing: Konva.Easings.EaseOut,
          onFinish: resolve,
        });
      });

      const originCanvas = { x: toCanvasX(s.puck.x), y: toCanvasY(s.puck.y) };
      const rightEnd = rightConsequenceTarget(s);
      const rightEndCanvas = { x: toCanvasX(rightEnd.x), y: toCanvasY(rightEnd.y) };
      // Intercept target for fronting = defender's CURRENT canvas pos (already at target).
      // For boxout = goalie spot behind the defender.
      const legs = [
        { from: originCanvas, to: rightEndCanvas, duration: Math.max(0.7, s.threatDuration || 0.9), persist: false },
      ];
      await animatePuckLegged(gridLayer, legs);

      // Outcome audio + flash. Boxout → saved (goalie makes the stop).
      // Fronting → intercepted (defender's body/stick kills the pass).
      const kind = s.mode === 'boxout' ? 'saved' : 'intercepted';
      if (IceQ.Audio && typeof IceQ.Audio.savePling === 'function') {
        IceQ.Audio.savePling();
      }
      if (IceQ.Path && typeof IceQ.Path.animateGoalConsequence === 'function') {
        await IceQ.Path.animateGoalConsequence(rink, { kind: kind, duration: 1.0 });
      }
      gridLayer.batchDraw();
    }

    async function resetPositionsForReplay() {
      // Between wrong and right phases, snap the defender back to START so the
      // right-play reads as a fresh correct read (not "nudge from the wrong
      // spot"). Also clear any leftover overlay and any in-flight pucks.
      cancelWrongReplay();
      clearOverlay();
      await new Promise(function (resolve) {
        defender.to({
          x: toCanvasX(DEFENDER_START.x), y: toCanvasY(DEFENDER_START.y),
          duration: 0.3, easing: Konva.Easings.EaseInOut,
          onFinish: resolve,
        });
      });
    }

    function showContrastReplay(opts) {
      opts = opts || {};
      const sig = opts.skipSignal || { skipped: false };
      if (!(IceQ.Path && typeof IceQ.Path.showContrast === 'function')) {
        // Defensive fallback: no contrast infra available → run at least
        // the right answer so the kid isn't left with nothing.
        return playRightAnswer();
      }
      return IceQ.Path.showContrast({
        rink: rink,
        playWrong: playWrongConsequence,
        resetPositions: resetPositionsForReplay,
        playRight: playRightAnswer,
        skipSignal: sig,
      }).then(function (result) {
        // Always restore the intro puck visibility and clear replay state so
        // the next setup (or retry) starts clean.
        cancelWrongReplay();
        restoreIntroPuck();
        return result;
      });
    }

    return {
      rink,
      check: evaluate,
      showMe: showCorrect,
      reset: () => {
        cancelThreat();
        cancelWrongReplay();
        cancelShowMeGlide();
        clearOverlay();
        resetDefender();
        restoreIntroPuck();
      },
      nextRush: nextSetup,
      currentRushInfo: () => ({ rushIdx: setupIdx, rush: currentSetup(), totalRushes: SETUPS.length }),
      isDone: () => evaluate().pass,
      // v0.13 contrast API
      playWrongConsequence: playWrongConsequence,
      playRightAnswer: playRightAnswer,
      showContrastReplay: showContrastReplay,
    };
  }

  function phrasedFeedback(res) {
    if (res.pass) {
      const what = res.mode === 'boxout' ? 'You boxed him out' : 'You fronted him';
      return `${what} for the ${res.setupLabel}. ${res.target.desc}`;
    }
    if (res.dist > 18) {
      return `Too far away. The attacker has the net front to himself. Get closer — ${res.mode === 'boxout' ? 'between him and the goalie' : 'between him and the puck'}.`;
    }
    return `Close — but not in the right defensive technique. The puck is at ${res.setupLabel}. Hit Show Me.`;
  }

  return { init, phrasedFeedback, SETUPS };
})();
