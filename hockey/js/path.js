// Animation helper module — bezier paths, puck passes, and consequence visuals.
//
// Foundation for v0.13 contrast animations: scenarios will use IceQ.Path.* to
// show "you went here -> goal against; here's what should have happened ->
// save". By centralizing this here, every scenario gets consistent feel
// (timing, easings, GOAL/SAVE flashes) and individual scenario files stay
// focused on the teaching content rather than reinventing animation plumbing.
//
// Conventions:
//   * All durations in SECONDS for animateAlongPath / animatePuckPass /
//     animateGoalConsequence (matches Konva.Tween semantics). wait() takes ms
//     because that matches setTimeout / Promise idioms.
//   * Bezier control points are CANVAS coordinates (already passed through
//     rink.toCanvasX/toCanvasY). This module is rink-agnostic — the caller
//     does the coordinate conversion.
//   * Every animation returns a stop() handle so scenarios can cancel cleanly
//     when the kid taps Reset / Next mid-animation. Critical for the "show
//     what should have happened" flow where the kid may interrupt.

window.IceQ = window.IceQ || {};

window.IceQ.Path = (function () {

  // ----- Bezier math -----------------------------------------------------
  // Auto-detect quadratic (3 control pts) vs cubic (4 pts) by array length.
  // Cubic gives smoother S-curves for skater carving; quadratic is enough
  // for puck passes with a single arc. Branching here lets callers pass
  // whichever they want without a separate API.

  function bezierPoint(points, t) {
    if (points.length === 4) {
      const [p0, p1, p2, p3] = points;
      const u = 1 - t;
      const uu = u * u;
      const tt = t * t;
      const uuu = uu * u;
      const ttt = tt * t;
      // Cubic Bernstein: B(t) = (1-t)^3 P0 + 3(1-t)^2 t P1 + 3(1-t) t^2 P2 + t^3 P3
      // At t=0 -> P0, at t=1 -> P3. Verified.
      return {
        x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
        y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
      };
    }
    // Quadratic (assumed 3 pts)
    const [p0, p1, p2] = points;
    const u = 1 - t;
    return {
      x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
    };
  }

  function bezierTangent(points, t) {
    if (points.length === 4) {
      const [p0, p1, p2, p3] = points;
      const u = 1 - t;
      // Derivative of cubic Bezier: B'(t) = 3(1-t)^2 (P1-P0) + 6(1-t)t (P2-P1) + 3t^2 (P3-P2)
      return {
        x: 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
        y: 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y),
      };
    }
    const [p0, p1, p2] = points;
    // Derivative of quadratic: B'(t) = 2(1-t)(P1-P0) + 2t(P2-P1)
    return {
      x: 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
      y: 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
    };
  }

  // ----- Generic path animator -------------------------------------------
  // Used for skaters carving along a bezier — e.g. "this is the route the
  // attacker took; this is the route you should have skated to cut him off."
  // We don't use Konva.Tween because we need bezier interpolation, not
  // straight-line. Konva.Animation gives us a per-frame callback we can use
  // to compute t and place the node ourselves.

  function animateAlongPath(node, points, duration, opts) {
    opts = opts || {};
    const easing = opts.easing || Konva.Easings.Linear;
    const rotateToTangent = !!opts.rotateToTangent;
    const rotationOffset = opts.rotationOffset || 0;

    const layer = node.getLayer();
    let resolveFn;
    const promise = new Promise((res) => { resolveFn = res; });
    let stopped = false;
    let startTime = null;

    const anim = new Konva.Animation(function () {
      if (stopped) return false;
      if (startTime == null) startTime = performance.now();
      const elapsed = (performance.now() - startTime) / 1000;
      let raw = Math.min(1, elapsed / duration);
      // Konva easings take (t, b, c, d) where b=start, c=change, d=duration.
      // To get an eased 0..1 from a linear 0..1, call easing(raw, 0, 1, 1).
      const t = easing(raw, 0, 1, 1);

      const pos = bezierPoint(points, t);
      node.position(pos);

      if (rotateToTangent) {
        const tan = bezierTangent(points, t);
        // atan2 returns radians; Konva rotation is degrees. Offset lets sprites
        // whose "forward" is up (e.g. player tokens facing -y) align correctly.
        node.rotation(Math.atan2(tan.y, tan.x) * 180 / Math.PI + rotationOffset);
      }

      if (typeof opts.onUpdate === 'function') opts.onUpdate(t);

      if (raw >= 1) {
        anim.stop();
        if (typeof opts.onFinish === 'function') opts.onFinish();
        resolveFn();
        return false;
      }
    }, layer);
    anim.start();

    return {
      stop: function () {
        stopped = true;
        anim.stop();
        // Resolve promise on stop so awaiters don't hang forever — but this
        // is a "stopped" resolve, not a completion. Callers who need to know
        // should track this themselves.
        resolveFn();
      },
      promise: promise,
    };
  }

  // ----- Puck pass animation ---------------------------------------------
  // The most common animation in scenario consequences. Defaults match the
  // puck styling used in two_on_one.js / breakout.js (black fill, gold
  // stroke). arcHeight > 0 turns it into a saucer-pass-like arc, useful for
  // showing "you should have lifted this over the stick."

  function animatePuckPass(layer, from, to, opts) {
    opts = opts || {};
    const duration = opts.duration != null ? opts.duration : 0.4;
    const color = opts.color || '#0A0A0A';
    const stroke = opts.stroke || '#E0C68A';
    const radius = opts.radius != null ? opts.radius : 6;
    const arcHeight = opts.arcHeight || 0;
    const persist = !!opts.persist;

    const puck = new Konva.Circle({
      x: from.x, y: from.y,
      radius: radius,
      fill: color, stroke: stroke, strokeWidth: 1.5,
    });
    layer.add(puck);

    // Build path. With arcHeight, control point sits arcHeight px ABOVE the
    // midpoint (smaller y in canvas coords = higher on screen).
    const points = arcHeight > 0
      ? [
          { x: from.x, y: from.y },
          { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - arcHeight },
          { x: to.x, y: to.y },
        ]
      : [
          { x: from.x, y: from.y },
          { x: to.x, y: to.y },
        ];

    let handle;
    if (arcHeight > 0) {
      // Use the bezier path animator for the arc.
      handle = animateAlongPath(puck, points, duration, {
        easing: Konva.Easings.EaseInOut,
        onFinish: function () {
          if (typeof opts.onFinish === 'function') opts.onFinish();
          if (!persist) puck.destroy();
          layer.batchDraw();
        },
      });
    } else {
      // Straight pass — use Konva.Tween via .to() for cleaner perf and
      // because we don't need bezier sampling.
      let resolveFn;
      const promise = new Promise(function (res) { resolveFn = res; });
      let stopped = false;
      puck.to({
        x: to.x, y: to.y,
        duration: duration,
        easing: Konva.Easings.EaseInOut,
        onFinish: function () {
          if (stopped) return;
          if (typeof opts.onFinish === 'function') opts.onFinish();
          if (!persist) puck.destroy();
          layer.batchDraw();
          resolveFn();
        },
      });
      handle = {
        stop: function () {
          stopped = true;
          // Konva tweens attached via .to() can be stopped via Tween instance,
          // but .to() doesn't return one. Best we can do: stop animations on
          // the node and clean up.
          puck.getTween && puck.getTween() && puck.getTween().pause();
          if (!persist) puck.destroy();
          resolveFn();
        },
        promise: promise,
      };
    }

    return {
      node: puck,
      stop: handle.stop,
      promise: handle.promise,
    };
  }

  // ----- Goal / save consequence -----------------------------------------
  // The big-feedback moment: the kid sees the result of their decision. Red
  // flash + shake = bad outcome (goal against). Gold/green flash = good
  // (cleared / intercepted / saved). Designed for emotional weight without
  // being scary — no audio (PWA constraints), just visual.

  const KIND_STYLES = {
    goal:        { color: '#CE202E', text: 'GOAL AGAINST', shake: true },
    cleared:     { color: '#E0C68A', text: 'CLEARED',      shake: false },
    intercepted: { color: '#E0C68A', text: 'INTERCEPTED',  shake: false },
    saved:       { color: '#2A9D3F', text: 'SAVED',        shake: false },
  };

  function animateGoalConsequence(rink, opts) {
    opts = opts || {};
    const kind = opts.kind || 'goal';
    const style = KIND_STYLES[kind] || KIND_STYLES.goal;
    const message = opts.message || style.text;
    const duration = opts.duration != null ? opts.duration : 1.2;

    const overlayLayer = rink.overlayLayer;
    // Width/height: prefer rink.width/height, fall back to stage if needed.
    const width = rink.width != null ? rink.width
                : (rink.stage ? rink.stage.width() : overlayLayer.getStage().width());
    const height = rink.height != null ? rink.height
                : (rink.stage ? rink.stage.height() : overlayLayer.getStage().height());

    // Full-rink color flash. Uses rgba so the rink stays visible underneath
    // (kid still sees the play state).
    const flash = new Konva.Rect({
      x: 0, y: 0, width: width, height: height,
      fill: style.color, opacity: 0,
      listening: false,
    });
    // Big text. Stroke-on-fill for legibility against the flash color.
    const textNode = new Konva.Text({
      x: 0, y: height * 0.35,
      width: width, align: 'center',
      text: message,
      fontSize: Math.max(36, width * 0.10),
      fontStyle: '900',
      fill: style.color,
      stroke: '#FFFFFF', strokeWidth: 3,
      opacity: 0,
      listening: false,
    });
    overlayLayer.add(flash, textNode);
    overlayLayer.batchDraw();

    // Phases (durations as fractions of `duration`):
    //   fade-in 200ms / hold 400ms / fade-out 400ms = 1000ms baseline. We let
    //   the caller stretch by passing a longer `duration` — text holds longer.
    const FADE_IN_MS = 200;
    const FADE_OUT_MS = 400;
    const totalMs = duration * 1000;
    const HOLD_MS = Math.max(200, totalMs - FADE_IN_MS - FADE_OUT_MS);

    flash.to({ opacity: 0.35, duration: FADE_IN_MS / 1000 });
    textNode.to({ opacity: 1, duration: FADE_IN_MS / 1000 });

    // Shake the rink container for a goal — small jitter to add weight.
    // 3 frames of ~4px translation, snapping back. Done via the stage
    // container element since Konva doesn't natively shake the canvas.
    if (style.shake && rink.stage) {
      const container = rink.stage.container();
      if (container) {
        const original = container.style.transform || '';
        const offsets = [4, -4, 3, -3, 2, 0];
        offsets.forEach(function (dx, i) {
          setTimeout(function () {
            container.style.transform = original + ' translateX(' + dx + 'px)';
            if (i === offsets.length - 1) container.style.transform = original;
          }, FADE_IN_MS + i * 50);
        });
      }
    }

    return new Promise(function (resolve) {
      setTimeout(function () {
        flash.to({
          opacity: 0, duration: FADE_OUT_MS / 1000,
          onFinish: function () { flash.destroy(); overlayLayer.batchDraw(); },
        });
        textNode.to({
          opacity: 0, duration: FADE_OUT_MS / 1000,
          onFinish: function () { textNode.destroy(); overlayLayer.batchDraw(); resolve(); },
        });
      }, FADE_IN_MS + HOLD_MS);
    });
  }

  // ----- Promise-based delay ---------------------------------------------
  // Trivially small but useful for sequencing: `await IceQ.Path.wait(400);`
  // reads cleaner than nested setTimeouts when chaining animations.

  function wait(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  // ----- Success "juice" burst --------------------------------------------
  // A short, satisfying celebration for a CORRECT read — so the win feels as
  // big as the goal-against miss (the persona panel's #1 ask). Gold/green
  // particle spray + an expanding ring, on the overlay layer, fire-and-forget
  // and self-cleaning. listening:false so it never eats a tap. Safe no-op if
  // the rink/overlay is missing.
  function celebrate(rink, opts) {
    opts = opts || {};
    if (!rink || !rink.overlayLayer || typeof Konva === 'undefined') return;
    var layer = rink.overlayLayer;
    var w = (rink.width != null) ? rink.width : (rink.stage ? rink.stage.width() : 300);
    var h = (rink.height != null) ? rink.height : (rink.stage ? rink.stage.height() : 300);
    var cx = (opts.x != null) ? opts.x : w / 2;
    var cy = (opts.y != null) ? opts.y : h * 0.34;
    var colors = ['#E0C68A', '#3DB46A', '#FFFFFF', '#FFD84D'];

    // Expanding ring
    var ring = new Konva.Circle({
      x: cx, y: cy, radius: 6,
      stroke: '#3DB46A', strokeWidth: 3, opacity: 0.9, listening: false,
    });
    layer.add(ring);
    ring.to({
      radius: 46, opacity: 0, duration: 0.5, easing: Konva.Easings.EaseOut,
      onFinish: function () { try { ring.destroy(); layer.batchDraw(); } catch (e) {} },
    });

    // Radial particle spray with a little downward drift (gravity feel)
    var N = opts.count || 14;
    for (var i = 0; i < N; i++) {
      var ang = (Math.PI * 2 * i) / N + Math.random() * 0.5;
      var dist = 26 + Math.random() * 34;
      var p = new Konva.Circle({
        x: cx, y: cy,
        radius: 2.5 + Math.random() * 2.5,
        fill: colors[i % colors.length],
        opacity: 1, listening: false,
      });
      layer.add(p);
      p.to({
        x: cx + Math.cos(ang) * dist,
        y: cy + Math.sin(ang) * dist + 14,
        opacity: 0,
        duration: 0.55 + Math.random() * 0.3,
        easing: Konva.Easings.EaseOut,
        onFinish: (function (node) {
          return function () { try { node.destroy(); layer.batchDraw(); } catch (e) {} };
        })(p),
      });
    }
    layer.batchDraw();
  }

  // ----- Mid-canvas label flash ------------------------------------------
  // Renders large bold text centered on the rink canvas with a fade-in /
  // hold / fade-out cycle. Used for "BUT INSTEAD..." dividers between
  // wrong-way and right-way replays in showContrast (v0.13).
  //
  // opts:
  //   text: string (required)
  //   color: string (default gold #E0C68A)
  //   fontSize: number (default 28)
  //   holdMs: number (default 600)
  //   fadeMs: number (default 200)

  function flashLabel(rink, opts) {
    opts = opts || {};
    var overlayLayer = rink.overlayLayer;
    var stage = rink.stage;
    if (!overlayLayer || !stage) return Promise.resolve();
    var w = (rink.width != null) ? rink.width : stage.width();
    var h = (rink.height != null) ? rink.height : stage.height();

    var fontSize = opts.fontSize || 28;
    var color = opts.color || '#E0C68A';
    var holdMs = opts.holdMs != null ? opts.holdMs : 600;
    var fadeMs = opts.fadeMs != null ? opts.fadeMs : 200;
    var text = opts.text || '';
    var skipSignal = opts.skipSignal;

    var lblW = Math.min(w * 0.85, 480);
    var node = new Konva.Text({
      x: (w - lblW) / 2,
      y: h / 2 - fontSize / 2,
      width: lblW,
      text: text,
      fontSize: fontSize,
      fontStyle: '900',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      fill: color,
      align: 'center',
      letterSpacing: 1.5,
      shadowColor: '#000',
      shadowBlur: 8,
      shadowOpacity: 0.6,
      opacity: 0,
      listening: false,
    });
    overlayLayer.add(node);
    overlayLayer.batchDraw();

    return new Promise(function (resolve) {
      var resolved = false;
      var holdTimeout = null;
      function safeResolve() {
        if (resolved) return;
        resolved = true;
        if (holdTimeout) { clearTimeout(holdTimeout); holdTimeout = null; }
        try {
          var t = node.getTween && node.getTween();
          if (t) t.pause();
        } catch (e) {}
        try { node.destroy(); overlayLayer.batchDraw(); } catch (e) {}
        resolve();
      }
      // Poll skipSignal so kid taps Skip during the fade/hold get honored
      // within ~80ms instead of having to wait for tween completion.
      var skipPoll = null;
      if (skipSignal) {
        skipPoll = setInterval(function () {
          if (skipSignal.skipped) {
            clearInterval(skipPoll);
            safeResolve();
          }
        }, 80);
      }
      function cleanup() {
        if (skipPoll) { clearInterval(skipPoll); skipPoll = null; }
        safeResolve();
      }
      node.to({
        opacity: 1, duration: fadeMs / 1000,
        onFinish: function () {
          if (resolved) return;
          holdTimeout = setTimeout(function () {
            if (resolved) return;
            node.to({
              opacity: 0, duration: fadeMs / 1000,
              onFinish: cleanup,
            });
          }, holdMs);
        },
      });
    });
  }

  // ----- Contrastive replay orchestrator ---------------------------------
  // The pedagogical heart of v0.13: when a kid gets a wrong answer, show
  // "you went here -> bad outcome" then "BUT INSTEAD..." then "here's
  // what should have happened -> good outcome." Belfry / Hockey Think Tank
  // teach this contrastive way on the ice; this brings it to the screen.
  //
  // Accepts a context object with:
  //   rink: standard rink wrapper (overlayLayer, stage, etc.)
  //   playWrong: async fn () -> void that animates the wrong play and
  //              ends with a goal/strip consequence (caller is responsible
  //              for calling animateGoalConsequence(...) inside if desired)
  //   resetPositions: async fn () -> void that snaps the scene back to
  //                   start state (between wrong and right replays)
  //   playRight: async fn () -> void that animates the correct play and
  //              ends with a save/clear consequence
  //   skipSignal: { skipped: bool } object the orchestrator polls between
  //               phases — if skipped becomes true, it bails out cleanly
  //   wrongLabel: optional string for divider before wrong (default: "OOF, WATCH THIS...")
  //   middleLabel: optional string between phases (default: "BUT INSTEAD...")
  //   rightLabel: optional string after right (default: "THAT'S THE READ")
  //
  // Returns a promise resolving to { skipped: bool, completed: bool }.

  function showContrast(ctx) {
    var sig = ctx.skipSignal || { skipped: false };
    var wrongLabel = ctx.wrongLabel || 'OOF, WATCH THIS\u2026';
    var middleLabel = ctx.middleLabel || 'BUT INSTEAD\u2026';
    var rightLabel = ctx.rightLabel || "THAT'S THE READ";

    function bail() {
      return { skipped: true, completed: false };
    }

    return (async function () {
      // Phase 1: brief intro label
      await flashLabel(ctx.rink, { text: wrongLabel, color: '#CE202E', holdMs: 400, skipSignal: sig });
      if (sig.skipped) return bail();

      // Phase 2: animate wrong play (kid's choice plays out, ends bad)
      if (typeof ctx.playWrong === 'function') {
        await ctx.playWrong();
      }
      if (sig.skipped) return bail();

      // Phase 3: divider label
      await flashLabel(ctx.rink, { text: middleLabel, color: '#E0C68A', holdMs: 700, fontSize: 32, skipSignal: sig });
      if (sig.skipped) return bail();

      // Phase 4: reset positions for the right-way replay
      if (typeof ctx.resetPositions === 'function') {
        await ctx.resetPositions();
      }
      await wait(200);
      if (sig.skipped) return bail();

      // Phase 5: animate right play (correct read, ends good)
      if (typeof ctx.playRight === 'function') {
        await ctx.playRight();
      }
      if (sig.skipped) return bail();

      // Phase 6: success label
      await flashLabel(ctx.rink, { text: rightLabel, color: '#3DB46A', holdMs: 600, skipSignal: sig });

      return { skipped: false, completed: true };
    })();
  }

  return {
    animateAlongPath: animateAlongPath,
    animatePuckPass: animatePuckPass,
    animateGoalConsequence: animateGoalConsequence,
    bezierPoint: bezierPoint,
    bezierTangent: bezierTangent,
    flashLabel: flashLabel,
    showContrast: showContrast,
    wait: wait,
    celebrate: celebrate,
  };
})();
