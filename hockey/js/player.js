// Konva-based hockey player avatar. Top-down view, simplified silhouette.
// Used as the draggable "YOU" token in scenarios. Color-aware (Spartans gold
// by default; can render an opponent in red).
//
// DESIGN PRINCIPLES (from coaching whiteboards + game-art readability):
//   1. SILHOUETTE FIRST — the outline alone tells you what it is.
//   2. ASYMMETRIC POSE — symmetric reads "standing still"; asymmetric reads
//      "in motion". One shoulder dropped + body tilt toward the stick side
//      sells "leaning into the play."
//   3. SKATE V — the V points where the player is GOING. Forward skater =
//      V opens DOWN (toward attacking direction). Backward skater = V opens
//      UP (toward defending direction). Body still faces attackers either way.
//   4. STICK IS HUGE — from above, stick is ~40% of the visual signal. Thick
//      handle, clear L-shaped blade flat on the ice.
//   5. SCALE-AWARE DETAIL — drop the face oval below scale 0.8; helmet alone
//      reads cleaner at small sizes.

window.IceQ = window.IceQ || {};

window.IceQ.Player = (function () {
  const COLORS = {
    spartan:  { jersey: '#E0C68A', accent: '#1A1A1A', helmet: '#202020', skin: '#E8C9A6', stick: '#6B4A2A', blade: '#111111', glove: '#1A1A1A', stripe: '#A02B32', numText: '#1A1A1A' },
    opponent: { jersey: '#CE202E', accent: '#1A1A1A', helmet: '#202020', skin: '#E8C9A6', stick: '#6B4A2A', blade: '#111111', glove: '#1A1A1A', stripe: '#FFFFFF', numText: '#FFFFFF' },
    teammate: { jersey: '#0D5EAB', accent: '#1A1A1A', helmet: '#202020', skin: '#E8C9A6', stick: '#6B4A2A', blade: '#111111', glove: '#1A1A1A', stripe: '#FFFFFF', numText: '#FFFFFF' },
  };

  // Animal-role badges. We use a big LETTER on the disc (like Shorey's
  // mnemonic letters in Hockey Made Easy — C/G/H is more reliable than
  // canvas emoji rendering, which fails on Windows). Emoji still appears
  // in HTML vocab chips where browser font handling works fine.
  const ANIMAL_BADGES = {
    cheetah: { letter: 'C', emoji: '🐆', bg: '#E0C68A', ring: '#7D5A1A', textColor: '#3A2A0A', text: 'CHEETAH' },
    gator:   { letter: 'G', emoji: '🐊', bg: '#2E7D3F', ring: '#0F4015', textColor: '#FFFFFF', text: 'GATOR' },
    hawk:    { letter: 'H', emoji: '🦅', bg: '#0D5EAB', ring: '#062B4D', textColor: '#FFFFFF', text: 'HAWK' },
  };

  /**
   * Create a hockey player as a Konva.Group.
   *
   * @param {object} opts
   * @param {number} opts.x  canvas x of the player center
   * @param {number} opts.y  canvas y of the player center
   * @param {number} opts.scale  size scale (default 1.0; ~30px tall at scale 1)
   * @param {string} opts.color  'spartan' | 'opponent' | 'teammate'
   * @param {string} opts.label  optional short label drawn beside (e.g., 'YOU', 'F1')
   * @param {string} opts.animal  'cheetah' | 'gator' | 'hawk' — overrides label with a colored badge + emoji
   * @param {boolean} opts.draggable
   * @param {string} opts.stickSide  'L' | 'R' — which side the stick extends
   * @param {string} opts.kind  'skater' | 'skater-back' | 'goalie'
   * @param {string} opts.jerseyText  optional letter/number drawn ON the jersey (e.g. "D", "LW", "1")
   * @param {boolean} opts.useImageSprite  v0.14 opt-in for the SVG image renderer.
   *   Only applies to kind='skater' or 'skater-back' (goalie/animal still use
   *   primitives). Defaults to the global IceQ.Player.USE_IMAGE_SPRITES flag.
   */
  function create(opts = {}) {
    const {
      x = 0, y = 0, scale = 1.0, color = 'spartan',
      label = '', animal = null, draggable = false, stickSide = 'L',
      kind = 'skater',  // 'skater' | 'skater-back' | 'goalie'
      jerseyText = '',
    } = opts;
    const c = COLORS[color] || COLORS.spartan;
    const S = scale;

    const group = new Konva.Group({ x, y, draggable });

    if (kind === 'goalie') {
      buildGoalie(group, c, S);
    } else if (kind === 'skater-back') {
      buildSkaterBack(group, c, S, stickSide);
    } else {
      buildSkater(group, c, S, stickSide);
    }

    // Jersey text — drawn AFTER the body so it sits on top of the jersey,
    // BEFORE the floating label so the label can still float above the head.
    // Independent of the label badge (you can have both).
    if (jerseyText && kind !== 'goalie') {
      const jSize = Math.max(7, 9 * S);
      const jW = Math.max(20, 24 * S);
      group.add(new Konva.Text({
        x: -jW / 2, y: 2 * S - jSize / 2,
        width: jW, height: jSize + 2,
        text: jerseyText,
        fontSize: jSize,
        fontStyle: '900',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        fill: '#FFFFFF',
        align: 'center',
        verticalAlign: 'middle',
        listening: false,
      }));
    }

    // Three label flavors:
    //   - animal: big colored disc + emoji + name pill (for Backcheck Cheetah/Gator/Hawk)
    //   - emoji label (1-2 chars): floating big icon
    //   - text label (e.g. "YOU", "F1"): small accent badge
    if (animal && ANIMAL_BADGES[animal]) {
      const a = ANIMAL_BADGES[animal];
      const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif';
      // Replace the helmet with a colored disc that BECOMES the player's head.
      // This avoids floating-above-canvas clipping AND makes the role identity
      // unmistakable.
      const discR = Math.max(18, 24 * S);
      const discY = -8 * S;  // sits where the helmet does in the regular player
      // Hide the original helmet by overlapping (drawing order: helmet was added
      // earlier in the function, so this draws on top).
      group.add(new Konva.Circle({
        x: 0, y: discY,
        radius: discR,
        fill: a.bg,
        stroke: a.ring,
        strokeWidth: Math.max(2, 2.5 * S),
        shadowColor: '#000',
        shadowBlur: 5,
        shadowOpacity: 0.35,
        listening: false,
      }));
      // Big bold LETTER centered in the disc (C / G / H)
      const letterSize = Math.max(20, 28 * S);
      const letterW = Math.max(30, 40 * S);
      group.add(new Konva.Text({
        x: -letterW / 2, y: discY - letterSize / 2 - 1,
        width: letterW, height: letterSize + 2,
        text: a.letter,
        fontSize: letterSize,
        fontStyle: '900',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        fill: a.textColor,
        align: 'center',
        verticalAlign: 'middle',
        listening: false,
      }));
      // Name pill BELOW the body (less likely to clip than above the head)
      const pillW = Math.max(48, 56 * S);
      const pillH = Math.max(12, 14 * S);
      group.add(new Konva.Rect({
        x: -pillW / 2, y: 16 * S,
        width: pillW, height: pillH,
        fill: a.ring,
        cornerRadius: pillH / 2,
        listening: false,
      }));
      group.add(new Konva.Text({
        x: -pillW / 2, y: 17 * S,
        width: pillW, height: pillH,
        text: a.text,
        fontSize: Math.max(8, 9 * S),
        fontStyle: '900',
        fill: a.bg,
        letterSpacing: 0.5,
        align: 'center',
        verticalAlign: 'middle',
        listening: false,
      }));
    } else if (label) {
      const isEmoji = /\p{Extended_Pictographic}/u.test(label);
      if (isEmoji) {
        const fs = Math.max(24, 34 * S);
        const lblTxt = new Konva.Text({
          x: -fs / 2 - 4, y: -fs - 12 * S,
          width: fs + 8,
          text: label,
          fontSize: fs,
          fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif',
          align: 'center',
          listening: false,
        });
        group.add(lblTxt);
      } else {
        const lblBg = new Konva.Rect({
          x: -16 * S, y: -22 * S,
          width: 32 * S, height: 11 * S,
          fill: c.accent,
          cornerRadius: 2 * S,
          listening: false,
        });
        const lblTxt = new Konva.Text({
          x: -20 * S, y: -20 * S,
          width: 40 * S,
          text: label,
          fontSize: 9 * S,
          fontStyle: '900',
          fill: c.jersey,
          align: 'center',
          listening: false,
        });
        group.add(lblBg, lblTxt);
      }
    }

    return group;
  }

  // ==== Skater silhouette (forward — V opens toward direction of play) ======
  // Asymmetric pose communicates motion. Stick-side shoulder dropped FORWARD
  // (lower-y side relative to neutral), body subtly leaned toward the stick
  // side. Skates form a V that opens DOWN (toward y+, the direction of play).
  function buildSkater(group, c, S, stickSide) {
    const stickDir = stickSide === 'L' ? -1 : 1;

    // Stick + blade + grip — drawn FIRST so the body covers the inside-the-player
    // segment of the handle. The hands draw on TOP of the handle to read clearly.
    addStick(group, c, S, stickDir);

    // Body silhouette — pear shape with ASYMMETRIC shoulders.
    // The STICK-side shoulder is DROPPED forward by dropY (more positive y =
    // further down the canvas = forward in our convention). This single change
    // reads as "leaning into the play" rather than "standing at attention."
    //
    // Convention used throughout: `stickDir * X` for stick-side coords (X>0),
    // `-stickDir * X` for off-stick coords. For L (stickDir=-1) this puts
    // stick-side on negative x (left of center); for R (stickDir=+1) on
    // positive x (right of center). Matches how the stick handle is laid out.
    //
    // Body is also tilted ~8 degrees toward the stick side via Konva.Shape
    // rotation (CW-positive). tiltDeg = stickDir * 8:
    //   L (stickDir=-1) → -8: top tilts CCW (toward LEFT = toward stick)
    //   R (stickDir=+1) → +8: top tilts CW  (toward RIGHT = toward stick)
    const tiltDeg = stickDir * 8;
    const dropY = 1.5 * S;          // stick-side shoulder drops forward

    group.add(new Konva.Shape({
      rotation: tiltDeg,
      sceneFunc: (ctx, shape) => {
        ctx.beginPath();
        // STICK-SIDE shoulder (dropped forward by dropY)
        ctx.moveTo(stickDir * 9 * S, -3 * S + dropY);
        // Down to stick-side waist
        ctx.bezierCurveTo(stickDir * 11 * S, 0 + dropY * 0.5, stickDir * 10 * S, 7 * S, stickDir * 7 * S, 9 * S);
        // Across the bottom (waist/hips) — symmetric
        ctx.bezierCurveTo(stickDir * 3 * S, 11 * S, -stickDir * 3 * S, 11 * S, -stickDir * 7 * S, 9 * S);
        // Up to OFF-STICK shoulder (normal height — NOT dropped)
        ctx.bezierCurveTo(-stickDir * 10 * S, 7 * S, -stickDir * 11 * S, 0, -stickDir * 9 * S, -3 * S);
        // Across the top — slope from off-stick (high) down to stick-side (dropped)
        ctx.bezierCurveTo(-stickDir * 7 * S, -5.5 * S, stickDir * 7 * S, -4 * S + dropY, stickDir * 9 * S, -3 * S + dropY);
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      },
      fill: c.jersey,
      stroke: c.accent,
      strokeWidth: Math.max(1, 1.4 * S),
      shadowColor: '#000',
      shadowBlur: Math.max(2, 3 * S),
      shadowOpacity: 0.22,
      shadowOffsetY: 1.5 * S,
    }));

    // Subtle shoulder highlight band (top of jersey catches light) — also
    // tilted with the body
    group.add(new Konva.Shape({
      rotation: tiltDeg,
      sceneFunc: (ctx, shape) => {
        ctx.beginPath();
        ctx.moveTo(-8 * S, -3.5 * S);
        ctx.quadraticCurveTo(0, -5.5 * S, 8 * S, -3.5 * S);
        ctx.quadraticCurveTo(0, -1 * S, -8 * S, -3.5 * S);
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      },
      fill: 'rgba(255,255,255,0.22)',
      listening: false,
    }));

    // Helmet — rounded square (real hockey helmet shape from above, not a circle)
    group.add(new Konva.Shape({
      sceneFunc: (ctx, shape) => {
        const w = 6 * S, h = 6 * S, r = 1.5 * S;
        const cx = 0, cy = -9 * S;
        ctx.beginPath();
        ctx.moveTo(cx - w + r, cy - h);
        ctx.lineTo(cx + w - r, cy - h);
        ctx.quadraticCurveTo(cx + w, cy - h, cx + w, cy - h + r);
        ctx.lineTo(cx + w, cy + h - r);
        ctx.quadraticCurveTo(cx + w, cy + h, cx + w - r, cy + h);
        ctx.lineTo(cx - w + r, cy + h);
        ctx.quadraticCurveTo(cx - w, cy + h, cx - w, cy + h - r);
        ctx.lineTo(cx - w, cy - h + r);
        ctx.quadraticCurveTo(cx - w, cy - h, cx - w + r, cy - h);
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      },
      fill: c.helmet,
      stroke: c.accent,
      strokeWidth: Math.max(0.8, 1 * S),
    }));

    // Face / cage hint — small skin oval. CULLED below scale 0.8 because it
    // becomes unreadable mush at small sizes; helmet alone reads cleaner.
    if (S >= 0.8) {
      group.add(new Konva.Ellipse({
        x: 0, y: -7.5 * S,
        radiusX: 3.2 * S, radiusY: 1.6 * S,
        fill: c.skin,
        listening: false,
      }));
    }

    // Skates — V opens DOWN (toward the direction of travel, y+).
    // Each skate is rotated 25 degrees outward; closer together than before
    // (was ±3.5*S, now ±3*S) so the V reads as a pose, not splayed feet.
    addSkateV(group, c, S, /*forward=*/true);
  }

  // ==== Skater silhouette (BACKWARD — V opens toward own net) ===============
  // Same body as the forward skater, but:
  //   - Skate V opens UPWARD (toward y-, the defending direction) — sells
  //     "retreating" without flipping the body.
  //   - Body has a slight backward lean (-5deg of tilt) — weight on the heels.
  //   - Stick still extends out-and-forward (defending stick on ice).
  //   - Optional small chevron behind the player as a subtle direction cue.
  // Use case: a defender on a 2-on-1, gapping back into the zone — body still
  // facing the attackers, but skating backward.
  function buildSkaterBack(group, c, S, stickSide) {
    const stickDir = stickSide === 'L' ? -1 : 1;

    // Same stick/blade/grip as forward skater (defending stick is still on the
    // ice in the lane). The backward variant uses a slightly more forward-extended
    // pose for the stick — defender reaching out to disrupt the rush.
    addStick(group, c, S, stickDir, /*backward=*/true);

    // Subtle backward-skating chevron BELOW the skates, pointing DOWN —
    // suggests ice spray / trail from skates pushing OFF toward y+ as the
    // player moves backward toward y-. Faint dark line; just a hint that
    // there's motion in the y- direction. (Drawn after skates would be ideal,
    // but we want it under everything so it doesn't compete with the body.)
    group.add(new Konva.Line({
      points: [-4 * S, 16 * S, 0, 19 * S, 4 * S, 16 * S],
      stroke: 'rgba(20,20,20,0.35)',
      strokeWidth: Math.max(1, 1.3 * S),
      lineCap: 'round',
      lineJoin: 'round',
      listening: false,
    }));

    // Body — same asymmetric shape, slight BACKWARD lean (-5deg, top tilts
    // away from the play side). On a backward-skating defender, weight is on
    // the heels; this small reverse-tilt sells "gapping back" rather than
    // "leaning in." Less dropY than the forward skater — D is more squared.
    const tiltDeg = -5;
    const dropY = 1.0 * S;

    group.add(new Konva.Shape({
      rotation: tiltDeg,
      sceneFunc: (ctx, shape) => {
        ctx.beginPath();
        // STICK-SIDE shoulder (dropped forward by dropY)
        ctx.moveTo(stickDir * 9 * S, -3 * S + dropY);
        ctx.bezierCurveTo(stickDir * 11 * S, 0 + dropY * 0.5, stickDir * 10 * S, 7 * S, stickDir * 7 * S, 9 * S);
        ctx.bezierCurveTo(stickDir * 3 * S, 11 * S, -stickDir * 3 * S, 11 * S, -stickDir * 7 * S, 9 * S);
        ctx.bezierCurveTo(-stickDir * 10 * S, 7 * S, -stickDir * 11 * S, 0, -stickDir * 9 * S, -3 * S);
        ctx.bezierCurveTo(-stickDir * 7 * S, -5.5 * S, stickDir * 7 * S, -4 * S + dropY, stickDir * 9 * S, -3 * S + dropY);
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      },
      fill: c.jersey,
      stroke: c.accent,
      strokeWidth: Math.max(1, 1.4 * S),
      shadowColor: '#000',
      shadowBlur: Math.max(2, 3 * S),
      shadowOpacity: 0.22,
      shadowOffsetY: 1.5 * S,
    }));

    // Shoulder highlight
    group.add(new Konva.Shape({
      rotation: tiltDeg,
      sceneFunc: (ctx, shape) => {
        ctx.beginPath();
        ctx.moveTo(-8 * S, -3.5 * S);
        ctx.quadraticCurveTo(0, -5.5 * S, 8 * S, -3.5 * S);
        ctx.quadraticCurveTo(0, -1 * S, -8 * S, -3.5 * S);
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      },
      fill: 'rgba(255,255,255,0.22)',
      listening: false,
    }));

    // Helmet
    group.add(new Konva.Shape({
      sceneFunc: (ctx, shape) => {
        const w = 6 * S, h = 6 * S, r = 1.5 * S;
        const cx = 0, cy = -9 * S;
        ctx.beginPath();
        ctx.moveTo(cx - w + r, cy - h);
        ctx.lineTo(cx + w - r, cy - h);
        ctx.quadraticCurveTo(cx + w, cy - h, cx + w, cy - h + r);
        ctx.lineTo(cx + w, cy + h - r);
        ctx.quadraticCurveTo(cx + w, cy + h, cx + w - r, cy + h);
        ctx.lineTo(cx - w + r, cy + h);
        ctx.quadraticCurveTo(cx - w, cy + h, cx - w, cy + h - r);
        ctx.lineTo(cx - w, cy - h + r);
        ctx.quadraticCurveTo(cx - w, cy - h, cx - w + r, cy - h);
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      },
      fill: c.helmet,
      stroke: c.accent,
      strokeWidth: Math.max(0.8, 1 * S),
    }));

    if (S >= 0.8) {
      group.add(new Konva.Ellipse({
        x: 0, y: -7.5 * S,
        radiusX: 3.2 * S, radiusY: 1.6 * S,
        fill: c.skin,
        listening: false,
      }));
    }

    // Skates — V opens UP (toward y-, defending direction)
    addSkateV(group, c, S, /*forward=*/false);
  }

  // Shared stick renderer — handle + L-blade + visible two-hand grip.
  //
  // Real hockey grip from above: TOP hand sits on the butt end (closer to the
  // body, where the handle starts). BOTTOM hand grips mid-shaft (further out,
  // about 60% down the handle). The bottom hand wears a thicker glove so it
  // reads as a slightly wider marker than the handle itself.
  //
  // Geometry change vs. v0.11: handle is more vertical (less x, more y) so
  // the stick reads as "carried in front" of a player IN MOTION rather than
  // splayed out to the side. From ~30deg off straight-down to ~37deg.
  //
  // backward=true uses a slightly different blade angle bias for the
  // backward-skating defender (reach is a little more forward into the lane).
  function addStick(group, c, S, stickDir, backward = false) {
    // Handle endpoints — more vertical than v0.11
    // (was: 5,3 -> 24,13 — about 30deg from vertical)
    // (now: 4,4 -> 20,16 — about 37deg, reads as "carried in front")
    const handleStartX = stickDir * 4 * S;
    const handleStartY = 4 * S;
    const handleEndX = stickDir * 20 * S;
    const handleEndY = 16 * S;

    // Stick handle — thicker for visibility from above
    group.add(new Konva.Line({
      points: [handleStartX, handleStartY, handleEndX, handleEndY],
      stroke: c.stick,
      strokeWidth: Math.max(2, 3.0 * S),
      lineCap: 'round',
      listening: false,
    }));

    // Perpendicular to the handle, pointing forward (positive y).
    const handleVecX = handleEndX - handleStartX;
    const handleVecY = handleEndY - handleStartY;
    const handleLen = Math.hypot(handleVecX, handleVecY) || 1;
    let perpX = -handleVecY / handleLen;
    let perpY = handleVecX / handleLen;
    if (perpY < 0) { perpX = -perpX; perpY = -perpY; }

    // Blade — slightly LONGER (7*S vs 6*S) and THICKER (4.0 vs 3.5) so the
    // L shape reads cleanly even at small scales.
    const bladeLen = 7 * S;
    const bladeStartX = handleEndX - perpX * (bladeLen * 0.25);
    const bladeStartY = handleEndY - perpY * (bladeLen * 0.25);
    const bladeEndX = handleEndX + perpX * (bladeLen * 0.75);
    const bladeEndY = handleEndY + perpY * (bladeLen * 0.75);
    group.add(new Konva.Line({
      points: [bladeStartX, bladeStartY, bladeEndX, bladeEndY],
      stroke: c.blade,
      strokeWidth: Math.max(2.8, 4.0 * S),
      lineCap: 'butt',
      listening: false,
    }));

    // Tiny blade "tip" — a small filled dot at the toe end suggests the
    // curve of the blade. Helps the L read at smallest scales.
    group.add(new Konva.Circle({
      x: bladeEndX, y: bladeEndY,
      radius: Math.max(1.2, 1.6 * S),
      fill: c.blade,
      listening: false,
    }));

    // ---- TWO-HAND GRIP --------------------------------------------------
    // Top hand: just outside where the handle EMERGES from the body silhouette
    // (~35% down the handle). Small skin-colored circle reads as "wrist/top
    // hand at the butt end." Placed inboard of the bottom hand. If we put it
    // at t=0 (handleStart), the body covers it — defeats the point of grip.
    // (The body edge at the stick-side waist is around (stickDir*8.5*S, 7*S);
    // t=0.35 puts the top hand just outside that.)
    const tTop = 0.35;
    const topHandX = handleStartX + handleVecX * tTop;
    const topHandY = handleStartY + handleVecY * tTop;
    group.add(new Konva.Circle({
      x: topHandX, y: topHandY,
      radius: Math.max(1.2, 1.4 * S),
      fill: c.skin,
      stroke: c.accent,
      strokeWidth: Math.max(0.4, 0.5 * S),
      listening: false,
    }));

    // Bottom hand: ~65% of the way down the handle. Larger glove-colored
    // rounded rect — reads as "padded glove gripping the shaft." Slightly
    // wider than the handle itself so it stands out as a distinct marker.
    // Konva: rotation is around (x,y) AFTER offset is applied; setting
    // offset = half-size and x/y at the desired center rotates around center.
    const t = 0.65;
    const gripCx = handleStartX + handleVecX * t;
    const gripCy = handleStartY + handleVecY * t;
    const gripAngleDeg = Math.atan2(handleVecY, handleVecX) * 180 / Math.PI;
    const gripW = Math.max(4.0, 5.0 * S);   // along the handle
    const gripH = Math.max(2.6, 3.2 * S);   // across the handle (wider than handle)
    group.add(new Konva.Rect({
      x: gripCx, y: gripCy,
      width: gripW, height: gripH,
      offsetX: gripW / 2, offsetY: gripH / 2,
      rotation: gripAngleDeg,
      cornerRadius: Math.max(1.0, 1.2 * S),
      fill: c.glove,
      stroke: c.accent,
      strokeWidth: Math.max(0.4, 0.5 * S),
      listening: false,
    }));

    // Suppress unused-param lint: backward is reserved for future asymmetric
    // tweaks (e.g. defender's stick reaching slightly further into the lane).
    void backward;
  }

  // Shared skate-V renderer. forward=true → V opens DOWN (skating forward).
  // forward=false → V opens UP (skating backward).
  // Each skate is a vertical ellipse (radiusY > radiusX) rotated 25 degrees
  // so the toes splay outward in the V direction. Positioned ±3*S apart
  // (closer together than before for a tighter, more athletic pose).
  //
  // Konva rotation is CW-positive (standard canvas convention with y+ down).
  // For V opening DOWN (∨), the BOTTOMS of the skates splay outward:
  //   Left skate (x=-3):  bottom goes more -x (away from center) → rotation = +25 (CW tilts top-right, bottom-left)
  //   Right skate (x=+3): bottom goes more +x (away from center) → rotation = -25
  // For V opening UP (∧), reverse the signs.
  function addSkateV(group, c, S, forward) {
    // forward V (opens down): left=+25, right=-25
    // backward V (opens up):  left=-25, right=+25
    const sign = forward ? 1 : -1;
    const skates = [
      { dx: -3, rot:  25 * sign },
      { dx:  3, rot: -25 * sign },
    ];
    skates.forEach(({ dx, rot }) => {
      group.add(new Konva.Ellipse({
        x: dx * S, y: 11.5 * S,
        radiusX: 2 * S, radiusY: 3 * S,
        rotation: rot,
        fill: c.helmet,
        stroke: c.accent,
        strokeWidth: 0.6 * S,
        listening: false,
      }));
    });
  }

  // ==== Goalie silhouette ===================================================
  // Wider stance, big leg pads on the sides, blocker + glove. Top-down view.
  function buildGoalie(group, c, S) {
    // Leg pads (big rectangular stripes on either side of the body)
    [-1, 1].forEach(side => {
      group.add(new Konva.Shape({
        sceneFunc: (ctx, shape) => {
          ctx.beginPath();
          const x0 = side * 7 * S, y0 = -3 * S;
          ctx.moveTo(x0, y0);
          ctx.lineTo(x0 + side * 5 * S, y0 + 2 * S);
          ctx.lineTo(x0 + side * 5 * S, y0 + 14 * S);
          ctx.lineTo(x0, y0 + 16 * S);
          ctx.closePath();
          ctx.fillStrokeShape(shape);
        },
        fill: '#F5F5F5',  // big white pads
        stroke: c.accent,
        strokeWidth: Math.max(0.8, 1 * S),
      }));
    });

    // Body — wider than skater, more square (chest protector + sweater)
    group.add(new Konva.Shape({
      sceneFunc: (ctx, shape) => {
        ctx.beginPath();
        ctx.moveTo(-8 * S, -4 * S);
        ctx.bezierCurveTo(-10 * S, -2 * S, -10 * S, 8 * S, -7 * S, 11 * S);
        ctx.bezierCurveTo(-3 * S, 13 * S, 3 * S, 13 * S, 7 * S, 11 * S);
        ctx.bezierCurveTo(10 * S, 8 * S, 10 * S, -2 * S, 8 * S, -4 * S);
        ctx.bezierCurveTo(6 * S, -6 * S, -6 * S, -6 * S, -8 * S, -4 * S);
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      },
      fill: c.jersey,
      stroke: c.accent,
      strokeWidth: Math.max(1, 1.4 * S),
      shadowColor: '#000',
      shadowBlur: Math.max(2, 3 * S),
      shadowOpacity: 0.22,
    }));

    // Mask helmet — rounded with cage
    group.add(new Konva.Shape({
      sceneFunc: (ctx, shape) => {
        const w = 6 * S, h = 6.5 * S, r = 2 * S;
        const cx = 0, cy = -10 * S;
        ctx.beginPath();
        ctx.moveTo(cx - w + r, cy - h);
        ctx.lineTo(cx + w - r, cy - h);
        ctx.quadraticCurveTo(cx + w, cy - h, cx + w, cy - h + r);
        ctx.lineTo(cx + w, cy + h - r);
        ctx.quadraticCurveTo(cx + w, cy + h, cx + w - r, cy + h);
        ctx.lineTo(cx - w + r, cy + h);
        ctx.quadraticCurveTo(cx - w, cy + h, cx - w, cy + h - r);
        ctx.lineTo(cx - w, cy - h + r);
        ctx.quadraticCurveTo(cx - w, cy - h, cx - w + r, cy - h);
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      },
      fill: '#FFFFFF',  // goalie masks are usually white/painted
      stroke: c.accent,
      strokeWidth: Math.max(0.8, 1 * S),
    }));

    // Face cage hint
    group.add(new Konva.Ellipse({
      x: 0, y: -8 * S,
      radiusX: 3 * S, radiusY: 1.5 * S,
      fill: c.skin,
      listening: false,
    }));

    // Trapper (glove) — small accent on one side
    group.add(new Konva.Circle({
      x: -10 * S, y: 2 * S,
      radius: 3 * S,
      fill: '#E0C68A',
      stroke: c.accent,
      strokeWidth: 0.7 * S,
    }));

    // Blocker — rectangular accent on the other side
    group.add(new Konva.Rect({
      x: 7 * S, y: 0,
      width: 5 * S, height: 6 * S,
      fill: '#444',
      stroke: c.accent,
      strokeWidth: 0.7 * S,
      cornerRadius: 1 * S,
    }));
  }

  // ===========================================================================
  // IMAGE-SPRITE PATH (v0.14)
  // ===========================================================================
  // The primitive renderer above is fundamentally limited: the bezier-pear
  // body + rounded-square helmet + ellipse skates can never read as "Chel-
  // quality" no matter how many grip markers / blade tips we add. To break
  // out of that floor we render the skater as a hand-designed SVG drawn into
  // a Konva.Image. The SVG lives inline (data: URI) so there are no asset
  // files to load. Color variants are produced by string-substituting jersey/
  // accent fills into a template, then the resulting data URI is cached by
  // color name.
  //
  // Why this looks better:
  //   - The silhouette includes ARMS extending from shoulder to glove (the
  //     primitive renderer truncates the body at the waist + draws a stick
  //     line that floats off to the side). Integrated arms = recognizable
  //     "hockey player holding stick" instead of "blob with stick line."
  //   - Shoulder pads are SQUARED with a flat top and outboard corners
  //     (real hockey shoulder pad silhouette). The pear-body never reads as
  //     padded.
  //   - Helmet has a forward-shine arc and proper oval shape (top-down
  //     helmet is OVAL longer fore-aft, not a rounded square).
  //   - Stick handle + blade are FILLED PATHS with a visible toe curl —
  //     reads as L-shape from any scale.
  //   - Linear gradient on the jersey adds depth without requiring per-frame
  //     shading.
  //
  // Backward compatibility:
  //   - When USE_IMAGE_SPRITES = false (or for kinds we don't support yet:
  //     goalie, animal-mode), we fall through to the primitive renderer.
  //   - If the SVG image fails to load for any reason, we silently fall back
  //     to the primitive renderer for that one player.
  //   - Public API (create, COLORS) is unchanged.
  //
  // Stick side:
  //   - The SVG is drawn with the stick on the RIGHT (stickSide='R').
  //   - For stickSide='L', we apply scaleX(-1) on the Konva.Image to mirror
  //     it. Saves authoring two SVGs.

  // Global renderer flag — read at call time in createWrapped. ON by default as
  // of v0.20 (2026-06-17): every skater/skater-back renders via the hand-built
  // SVG image sprite (integrated arms, squared shoulder pads, jersey gradient,
  // proper helmet) instead of the cruder primitive. Goalie + animal-mode (the
  // Cheetah/Gator/Hawk discs) automatically fall back to the primitive renderer,
  // and any single skater whose sprite fails to load falls back too. A scenario
  // can still force primitives per call with `useImageSprite: false`.
  let USE_IMAGE_SPRITES = true;

  // SVG viewBox is 60x60. The sprite is centered on (30,30). At Konva scale
  // S=1 we want the sprite to occupy ~30 px tall (matching the primitive
  // sprite footprint). So image render-size = SPRITE_PX * S where SPRITE_PX
  // is calibrated below. Tuned visually so a forward skater at S=1 has the
  // same on-canvas bounding box as the primitive version.
  const SPRITE_PX_FORWARD = 70;   // forward skater (v0.26: bumped 50->70 — players were too small/hard to see)
  const SPRITE_PX_BACKWARD = 70;  // backward skater (same — different pose pre-baked)

  // Master SVG template — STICK ON RIGHT, BODY UPRIGHT (forward-skating pose).
  // Placeholders: {{JERSEY_FILL}} {{JERSEY_DARK}} {{ACCENT}} {{HELMET}}
  //               {{SKIN}} {{STICK}} {{BLADE}} {{GLOVE}}
  //
  // Coordinate notes (60x60 viewBox, +y is forward / direction of play):
  //   helmet center:     (28, 14)   slight tilt to stick side
  //   shoulder span:     ~22..40 x at y=22 (squared shoulder caps)
  //   waist:             ~26..36 x at y=42
  //   hip / lower body:  flares slightly back out at y=46
  //   skates:            left foot (24, 52), right foot (36, 52), splayed in V
  //   bottom-glove (R):  (44, 38)
  //   top-glove (over chest, near body):  (32, 32)
  //   stick handle:      from top-glove (32,32) through bottom-glove (44,38)
  //                      and out to blade heel (52, 44)
  //   stick blade:       L-shape from (52, 44) to (58, 50) with toe curl
  //
  // The SVG is intentionally ASYMMETRIC: stick-side shoulder is tilted slightly
  // forward (lower y on right side of shoulder yoke) to read as "leaning into
  // the play."
  // Rasterize at 240x240 even though the viewBox is 60x60 — gives the
  // browser a higher-resolution intermediate so Konva's scaling stays sharp
  // at zoom levels above 1.0 and on hi-DPI displays.
  // v0.27: the jersey-NUMBER TOKEN (no arms). Replaces the old skater silhouette.
  // A broad-shouldered sweater (the role letter/number is drawn ON it by the
  // caller as Konva text), a team-color shoulder-yoke stripe, dark hockey pants,
  // a helmet, and a LONG stick whose blade sits out front on the ice. Centred so
  // the box centre (30,30) is the player centre = the drag/position anchor.
  const SVG_TEMPLATE_SKATER = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="240" height="240">',
    '  <defs>',
    '    <linearGradient id="jerseyGrad" x1="0" y1="0" x2="0" y2="1">',
    '      <stop offset="0" stop-color="{{JERSEY_FILL}}" stop-opacity="1"/>',
    '      <stop offset="1" stop-color="{{JERSEY_DARK}}" stop-opacity="1"/>',
    '    </linearGradient>',
    '    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">',
    '      <feGaussianBlur in="SourceAlpha" stdDeviation="0.8"/>',
    '      <feOffset dx="0" dy="0.6" result="off"/>',
    '      <feComponentTransfer><feFuncA type="linear" slope="0.45"/></feComponentTransfer>',
    '      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>',
    '    </filter>',
    '  </defs>',
    '',
    '  <!-- ground shadow -->',
    '  <ellipse cx="30" cy="52" rx="13" ry="2.2" fill="#000" opacity="0.14"/>',
    '',
    '  <!-- ===== STICK (drawn first; the sweater covers the shaft root) ===== -->',
    '  <!-- Long shaft from the body out toward the ice in front (option C) -->',
    '  <path d="M 33 29 L 51 45" fill="none" stroke="{{STICK}}" stroke-width="2.1" stroke-linecap="round"/>',
    '  <!-- Blade out front, on the ice -->',
    '  <path d="M 51 45 L 59 48.5" fill="none" stroke="{{BLADE}}" stroke-width="2.9" stroke-linecap="round"/>',
    '',
    '  <!-- ===== SWEATER (broad shoulders -> tapered) ===== -->',
    '  <path d="M 16.5 25 Q 17.5 19 23 18 L 37 18 Q 42.5 19 43.5 25 L 39 44 Q 30 46 21 44 Z"',
    '        fill="url(#jerseyGrad)" stroke="{{ACCENT}}" stroke-width="1.3" stroke-linejoin="round" filter="url(#dropShadow)"/>',
    '  <!-- Shoulder-yoke stripe (team accent colour) -->',
    '  <path d="M 18 23.5 Q 30 21 42 23.5 L 41 27 Q 30 24.7 19 27 Z" fill="{{STRIPE}}" opacity="0.95"/>',
    '',
    '  <!-- ===== HOCKEY PANTS (dark) ===== -->',
    '  <path d="M 21.5 44 Q 30 46 38.5 44 L 36.5 49.5 Q 30 50.5 23.5 49.5 Z"',
    '        fill="#23262B" stroke="{{ACCENT}}" stroke-width="0.7" stroke-linejoin="round"/>',
    '',
    '  <!-- ===== HELMET ===== -->',
    '  <circle cx="30" cy="13.5" r="6.3" fill="{{HELMET}}" stroke="{{ACCENT}}" stroke-width="1"/>',
    '  <ellipse cx="30" cy="16" rx="3.9" ry="1.9" fill="{{SKIN}}"/>',
    '',
    '  <!-- ===== SKATES (V opens DOWN = direction of play) ===== -->',
    '  <g transform="translate(26 49.5) rotate(-18)">',
    '    <ellipse cx="0" cy="0" rx="2.5" ry="4.0" fill="{{HELMET}}" stroke="{{ACCENT}}" stroke-width="0.9"/>',
    '    <rect x="-0.6" y="-4.0" width="1.3" height="8.0" fill="#777" opacity="0.85"/>',
    '  </g>',
    '  <g transform="translate(34 49.5) rotate(18)">',
    '    <ellipse cx="0" cy="0" rx="2.5" ry="4.0" fill="{{HELMET}}" stroke="{{ACCENT}}" stroke-width="0.9"/>',
    '    <rect x="-0.6" y="-4.0" width="1.3" height="8.0" fill="#777" opacity="0.85"/>',
    '  </g>',
    '</svg>',
  ].join('\n');

  // Backward-skater variant: same body + helmet + gloves, but skates V opens
  // UP (backward direction = -y). We re-author just the skates section by
  // replacing the rotation signs and flipping the position math.
  // To minimize duplication, we generate the backward SVG by string-replacing
  // the skate transforms in the forward SVG.
  const SVG_TEMPLATE_SKATER_BACK = SVG_TEMPLATE_SKATER
    .replace('translate(26 49.5) rotate(-18)', 'translate(26 49.5) rotate(18)')
    .replace('translate(34 49.5) rotate(18)',  'translate(34 49.5) rotate(-18)');

  // Lighten/darken a hex color by a percent (for jersey gradient stops).
  // Returns a hex string. Clamps to [0,255].
  function shadeHex(hex, percent) {
    const h = hex.replace('#', '');
    const num = parseInt(h.length === 3
      ? h.split('').map(c => c + c).join('')
      : h, 16);
    let r = (num >> 16) & 0xff;
    let g = (num >>  8) & 0xff;
    let b =  num        & 0xff;
    const f = 1 + percent / 100;
    r = Math.max(0, Math.min(255, Math.round(r * f)));
    g = Math.max(0, Math.min(255, Math.round(g * f)));
    b = Math.max(0, Math.min(255, Math.round(b * f)));
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  // Substitute color placeholders into the SVG template.
  function fillTemplate(template, c) {
    return template
      .replace(/\{\{JERSEY_FILL\}\}/g, c.jersey)
      .replace(/\{\{JERSEY_DARK\}\}/g, shadeHex(c.jersey, -22))
      .replace(/\{\{ACCENT\}\}/g,      c.accent)
      .replace(/\{\{HELMET\}\}/g,      c.helmet)
      .replace(/\{\{SKIN\}\}/g,        c.skin)
      .replace(/\{\{STICK\}\}/g,       c.stick)
      .replace(/\{\{BLADE\}\}/g,       c.blade)
      .replace(/\{\{GLOVE\}\}/g,       c.glove)
      .replace(/\{\{STRIPE\}\}/g,      c.stripe || c.accent);
  }

  // Cache of preloaded HTMLImageElements keyed on `${colorName}|${kindKey}`.
  // Each entry is either:
  //   - { ready: true, img: HTMLImageElement }
  //   - { ready: false, img: HTMLImageElement, listeners: [] }  (loading)
  //   - { ready: 'failed' }                                     (load error)
  const spriteCache = new Map();

  function getSprite(colorName, kindKey) {
    const key = colorName + '|' + kindKey;
    let entry = spriteCache.get(key);
    if (entry) return entry;

    const c = COLORS[colorName] || COLORS.spartan;
    const template = kindKey === 'skater-back' ? SVG_TEMPLATE_SKATER_BACK : SVG_TEMPLATE_SKATER;
    const svg = fillTemplate(template, c);
    // encodeURIComponent on the SVG keeps it safe for data: URIs across
    // browsers (raw # in the SVG would otherwise truncate the URI).
    const dataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

    const img = new Image();
    entry = { ready: false, img, listeners: [], failed: false };
    img.onload = () => {
      entry.ready = true;
      entry.listeners.forEach(fn => { try { fn(img); } catch (e) {} });
      entry.listeners = [];
    };
    img.onerror = () => {
      entry.failed = true;
      entry.ready = 'failed';
      // Listeners are notified with null so the caller can fall back to primitives.
      entry.listeners.forEach(fn => { try { fn(null); } catch (e) {} });
      entry.listeners = [];
    };
    img.src = dataUri;
    spriteCache.set(key, entry);
    return entry;
  }

  // Add a Konva.Image to the group rendering the skater sprite.
  // Returns true on success (sprite added or queued), false if the caller
  // should fall back to primitives immediately (e.g. cache says permanently
  // failed).
  function buildSkaterImage(group, colorName, S, stickSide, backward) {
    const kindKey = backward ? 'skater-back' : 'skater';
    const entry = getSprite(colorName, kindKey);
    if (entry.ready === 'failed') return false;

    const spriteSize = (backward ? SPRITE_PX_BACKWARD : SPRITE_PX_FORWARD) * S;

    // Konva.Image positions by top-left; we want the sprite centered on (0,0)
    // of the group (matching primitive renderer convention). offset = half-size.
    // If stickSide=='L' we mirror with scaleX(-1) — the SVG was authored with
    // stick on right.
    const mirror = stickSide === 'L' ? -1 : 1;

    const konvaImg = new Konva.Image({
      x: 0, y: 0,
      image: entry.ready === true ? entry.img : null,  // null until loaded; Konva tolerates this
      width: spriteSize,
      height: spriteSize,
      offsetX: spriteSize / 2,
      offsetY: spriteSize / 2,
      scaleX: mirror,
      // Note: When mirroring (scaleX=-1), Konva flips around the offset point
      // (which is the center). The visual result is the sprite reflected
      // horizontally about its own vertical centerline — exactly what we want
      // for stick-side L.
      // listening:true is REQUIRED for draggable groups — Konva's drag system
      // initiates from a pointerdown on a listening child shape; if every
      // child has listening:false, the group never picks up the drag start.
      // The primitive renderer's body shape is listening:true for the same
      // reason. Image hit-testing is per-pixel-alpha by default for Konva.Image,
      // which works fine here (the SVG renders to an opaque rectangle's worth
      // of bounding box; we use rectangular hit by default).
      listening: true,
    });
    group.add(konvaImg);

    // If the image isn't ready yet, queue a callback to set it once loaded
    // and trigger a layer redraw. If it fails, remove the Konva.Image and
    // build the primitive fallback into the same group.
    if (entry.ready !== true) {
      entry.listeners.push((img) => {
        if (img) {
          konvaImg.image(img);
          if (konvaImg.getLayer()) konvaImg.getLayer().batchDraw();
        } else {
          // Failed — replace with primitives. Caller may have already
          // rendered other things into the group (jersey text, label, etc.)
          // so we just add the primitive parts here.
          konvaImg.destroy();
          if (backward) buildSkaterBack(group, COLORS[colorName] || COLORS.spartan, S, stickSide);
          else          buildSkater    (group, COLORS[colorName] || COLORS.spartan, S, stickSide);
          if (group.getLayer()) group.getLayer().batchDraw();
        }
      });
    }
    return true;
  }

  // Patch create() — insert image-sprite path BEFORE the primitive switch.
  // We replicate the original switch's intent but route skater/skater-back
  // through the image renderer when conditions allow:
  //   - USE_IMAGE_SPRITES is true
  //   - kind is 'skater' or 'skater-back'
  //   - no animal mode (animal disc would obscure the helmet anyway, and
  //     the disc-replacement logic depends on primitive draw order)
  // This wrapper preserves the exported `create` function name so existing
  // call sites are unaffected.
  const _createOriginal = create;
  function createWrapped(opts = {}) {
    const {
      x = 0, y = 0, scale = 1.0, color = 'spartan',
      label = '', animal = null, draggable = false, stickSide = 'L',
      kind = 'skater', jerseyText = '',
      // Per-call opt-in for the image renderer. If omitted, falls back to the
      // global USE_IMAGE_SPRITES flag (default FALSE).
      useImageSprite = undefined,
    } = opts;

    const optedIn = useImageSprite === true
      || (useImageSprite !== false && USE_IMAGE_SPRITES);
    const useImage = optedIn
                  && (kind === 'skater' || kind === 'skater-back')
                  && !animal;

    if (!useImage) return _createOriginal(opts);

    // Build the group with image sprite + label/jerseyText overlays. We
    // intentionally re-implement only the parts that differ; the overlay
    // logic (jerseyText, label, animal) is copied so we don't accidentally
    // double-call the original.
    const c = COLORS[color] || COLORS.spartan;
    const S = scale;
    const group = new Konva.Group({ x, y, draggable });

    const ok = buildSkaterImage(group, color, S, stickSide, kind === 'skater-back');
    if (!ok) {
      // Hard fallback: cache says permanently failed → use primitives.
      return _createOriginal(opts);
    }

    // Jersey text overlay (drawn ON TOP of the sprite). Same conventions as
    // primitive renderer.
    if (jerseyText && kind !== 'goalie') {
      const jSize = Math.max(7, 9 * S);
      const jW = Math.max(20, 24 * S);
      group.add(new Konva.Text({
        x: -jW / 2, y: 2 * S - jSize / 2,
        width: jW, height: jSize + 2,
        text: jerseyText,
        fontSize: jSize,
        fontStyle: '900',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        fill: '#FFFFFF',
        align: 'center',
        verticalAlign: 'middle',
        listening: false,
      }));
    }

    // Label overlay — same code path as primitive renderer (animals are
    // routed through the original by the useImage check above so we only
    // need text/emoji label handling here).
    if (label) {
      const isEmoji = /\p{Extended_Pictographic}/u.test(label);
      if (isEmoji) {
        const fs = Math.max(24, 34 * S);
        group.add(new Konva.Text({
          x: -fs / 2 - 4, y: -fs - 12 * S,
          width: fs + 8,
          text: label,
          fontSize: fs,
          fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif',
          align: 'center',
          listening: false,
        }));
      } else {
        // Token: draw the role letter / number ON the sweater (the focal
        // point), not a floating badge. Sized down for 2-3 char labels so
        // "YOU"/"D2" still fit the chest. Team text colour (dark on gold,
        // white on red/blue), centred ~1px below the group origin.
        const len = label.length;
        const fs = Math.max(8, (len <= 1 ? 13 : len === 2 ? 10.5 : 8.5) * S);
        const w = Math.max(26, 34 * S);
        group.add(new Konva.Text({
          x: -w / 2, y: 1 * S - fs / 2,
          width: w, height: fs + 2,
          text: label,
          fontSize: fs,
          fontStyle: '900',
          fontFamily: '"Arial Black", "Segoe UI", system-ui, sans-serif',
          fill: c.numText || '#FFFFFF',
          align: 'center',
          verticalAlign: 'middle',
          listening: false,
        }));
      }
    }

    return group;
  }

  return {
    create: createWrapped,
    COLORS,
    // Exposed for A/B testing — toggle to false to render via primitives.
    // (Read at call time inside createWrapped, so flipping it after page
    // load takes effect on subsequent create() calls.) Existing sprites
    // already on the canvas are NOT re-rendered; nuke + recreate the scene
    // (e.g. switch tabs / next rush) to see the change.
    get USE_IMAGE_SPRITES() { return USE_IMAGE_SPRITES; },
    set USE_IMAGE_SPRITES(v) { USE_IMAGE_SPRITES = !!v; },
  };
})();
