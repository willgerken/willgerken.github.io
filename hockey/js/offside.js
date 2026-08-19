// Scenario: Offside Detection (HORIZONTAL rink, mix of offside + onside).
//
// The kid plays LINESMAN. Watches a rush develop left-to-right across the
// full 200-ft sheet, then either taps OFFSIDE (when an attacker's skate
// crosses the BLUE LINE before the puck) or lets the play complete (when
// the entry is legal).
//
// Why a mix of offside AND legal entries:
//   The previous version was 100% offside and trained MEMORIZATION
//   ("always tap on play 1 and 3"). A real linesman has to READ the play
//   on every rush and decide. Mixing legal entries forces actual judgment.
//
// Why horizontal:
//   A 200-ft rink in portrait crams the rush into too little space — the
//   kid sees it as "they're already at the line." Landscape gives the play
//   room to BREATHE so the kid can read tempo and spacing.
//
// Coordinate system (this scenario only):
//   x: 0 (defending end, LEFT of canvas) ... 200 (attacking end, RIGHT)
//   y: 0 (top boards) ... 85 (bottom boards). Centerline = 42.5.
//   Defending blue line: x = 64
//   Center red line:    x = 100
//   Attacking BLUE LINE: x = 136  <-- THIS is the offside line
//   Net mouth:          x = 189
//
// All scenario plays move LEFT-TO-RIGHT (positive x direction). The
// "DIRECTION OF PLAY →" arrow at the bottom anchors the kid's mental model.

window.IceQ = window.IceQ || {};

window.IceQ.Offside = (function () {
  // ----- Rink constants (feet) -------------------------------------------
  const RINK_LENGTH = 200;
  const RINK_WIDTH = 85;
  const DEF_BLUE_X = 64;
  const CENTER_X   = 100;
  const ATK_BLUE_X = 136;     // the offside line we care about
  const NET_X      = 189;
  const GOAL_LINE_X = 189;

  // ----- Plays -----------------------------------------------------------
  // OFFSIDE plays: ANY receiver is in the attacking zone (x > 136) BEFORE
  // the puck (carrier x) crosses 136. ONSIDE plays: all receivers wait /
  // arc in and cross x=136 at or after the puck.
  //
  // Tuning: duration ~2.4-2.6s feels slow enough for a 10U kid to read
  // (the previous 2.8s on the cramped vertical rink felt rushed because
  // the rush was visually "small"). With the wider horizontal canvas the
  // same 2.4s now feels more spacious.
  //
  // TIERS:
  //   level: 'basic'    — 2-skater rush (carrier + receiver). 6 plays.
  //   level: 'advanced' — 3-skater rush (carrier + receiver + receiver2).
  //                       Adds receiver2 with same shape as receiver.
  //                       Eval logic checks BOTH receivers; whichever
  //                       crosses first is the offside man (if any).
  //
  // Naming convention for label/description on advanced plays: identify
  // which skater is the offside one ("trailing center", "C trailer", "LW
  // receiver") so phrasedFeedback can echo it back.

  const PLAYS = [
    {
      key: 'right-rush-offside',
      label: 'right-wing rush — receiver crashing the middle',
      level: 'basic',
      offside: true,
      description: 'Receiver was over the blue line before the puck.',
      carrier:  { startX: 40, startY: 22, endX: 170, endY: 28, side: 'R' },
      receiver: { startX: 80, startY: 42, endX: 170, endY: 36,
                  pathType: 'straight' },
      // puck = carrier + 3 ft. puck reaches x=136 when carrier=133 →
      //   t=(133-40)/130 = 0.715
      // receiver reaches x=136 → t=(136-80)/85 = 0.659
      // Receiver early by ~0.06 = ~150ms. Clear offside.
      duration: 3.5,
    },
    {
      key: 'left-rush-offside',
      label: 'left-wing rush — receiver leaks across early',
      level: 'basic',
      offside: true,
      description: 'Receiver leaked into the zone before the puck arrived.',
      carrier:  { startX: 35, startY: 63, endX: 168, endY: 58, side: 'L' },
      receiver: { startX: 85, startY: 22, endX: 166, endY: 32,
                  pathType: 'straight' },
      // puck=carrier+3; puck crosses 136 at t=(133-35)/133=0.737.
      // receiver crosses 136 at t=(136-85)/(160-85)=0.680 → offside by
      // ~6%, ~150ms in real time. Visually clear, not a coin flip.
      duration: 3.5,
    },
    {
      key: 'middle-curl-offside',
      label: 'middle drive — winger curls in early',
      level: 'basic',
      offside: true,
      description: 'Winger curled into the zone a step before the puck.',
      carrier:  { startX: 45, startY: 42, endX: 172, endY: 44, side: 'R' },
      receiver: { startX: 90, startY: 18, endX: 158, endY: 38,
                  pathType: 'curl-in',
                  // Control point: pull the curl OUT toward the boards
                  // before swinging back IN to the slot. Makes the path
                  // visibly arc — kid can see the receiver "leaning in."
                  ctrlX: 145, ctrlY: 14 },
      // carrier→136 at t=(136-45)/(172-45)=0.717
      // We deliberately set the receiver bezier so that at t≈0.65 his x≈136
      // (just BEFORE the puck) — see ctrl point math in animateReceiver.
      duration: 3.5,
    },
    {
      key: 'right-onside-clean',
      label: 'right-wing entry — receiver hangs back, clean',
      level: 'basic',
      offside: false,
      description: 'Receiver was patient — waited for the puck to cross first.',
      carrier:  { startX: 40, startY: 22, endX: 170, endY: 28, side: 'R' },
      receiver: { startX: 75, startY: 42, endX: 165, endY: 38,
                  pathType: 'straight',
                  // hangBackUntil: hold receiver at startX until carrier
                  // reaches this x (in feet). After that, receiver releases
                  // and skates straight to endX/endY in remaining time.
                  hangBackUntil: 130 },   // wait until puck is just shy of blue line
      duration: 3.5,
    },
    {
      key: 'left-sweep-onside',
      label: 'left-wing sweep entry — receiver arcs in behind',
      level: 'basic',
      offside: false,
      description: 'Receiver swept wide and timed entry behind the puck.',
      carrier:  { startX: 35, startY: 63, endX: 168, endY: 58, side: 'L' },
      receiver: { startX: 65, startY: 50, endX: 158, endY: 28,
                  pathType: 'sweep-wide',
                  // Sweep wide first: control point pulled toward the wall
                  // (low y = top boards) and BACK in x. Receiver appears to
                  // bow out then cut in late — natural rush timing.
                  // Tuned so receiver bezier hits x=136 at t≈0.81, well
                  // after the puck (which crosses at t≈0.737, since the
                  // puck is offset +3 ft ahead of the carrier).
                  ctrlX: 95, ctrlY: 12 },
      duration: 3.5,
    },
    {
      key: 'tag-up-attempt',
      label: 'attacker drifts in early — does NOT tag up',
      level: 'basic',
      // For now treat as OFFSIDE: receiver sits in the zone and never
      // tags up. v0.12 will properly model tag-up (animate back to blue
      // line, then re-enter behind puck = legal).
      offside: true,
      description: 'Attacker was in the zone before the puck and never tagged back. Offside.',
      carrier:  { startX: 45, startY: 42, endX: 172, endY: 44, side: 'R' },
      receiver: { startX: 100, startY: 30, endX: 165, endY: 32,
                  pathType: 'straight' },
      // receiver→136 at t=(136-100)/(165-100)=0.554 ; carrier at t=0.717
      // Big visible gap — easy "good call."
      duration: 3.5,
    },

    // ===== ADVANCED tier — 3-skater rushes ================================
    // Carrier + receiver + receiver2. Eval scans BOTH receivers; whichever
    // crosses ATK_BLUE_X earliest is "the offside man" (or neither, if both
    // stay legal). offendingHint identifies the role for phrased feedback.
    //
    // Math notation throughout: puck = carrier.x + 3. carrier moves linearly
    // 40→170 over t∈[0,1] in most of these (130 ft span). puck reaches the
    // blue line (x=136) when carrier=133, so puck-T = (133-startX)/(endX-startX).

    {
      key: 'three-man-right-offside',
      label: '3-man rush right — center crashes the middle EARLY',
      level: 'advanced',
      offside: true,
      offendingHint: 'C',  // hint for phrased feedback: 'C' / 'LW' / 'RW'
      offendingRole: 'receiver',  // which receiver field crossed first
      description: 'The center (middle of the 3-man rush) was over the blue line before the puck.',
      carrier:  { startX: 40, startY: 24, endX: 170, endY: 30, side: 'R' },
      // RECEIVER1 = C (the middle skater, crashing the slot). OFFSIDE.
      receiver: { startX: 78, startY: 42, endX: 172, endY: 40,
                  pathType: 'straight' },
      // RECEIVER2 = LW (far-side winger). LEGAL — hangs back behind the
      // puck and only releases once the carrier nears the blue line.
      receiver2: { startX: 70, startY: 65, endX: 158, endY: 56,
                   pathType: 'straight', hangBackUntil: 128 },
      // puck-T: (133-40)/130 = 0.715
      // receiver1 (C) reaches x=136 at t=(136-78)/(162-78) = 0.690 → offside
      //   by ~0.025 in raw t (~62ms). Visible but subtle — kid has to spot
      //   it among 3 moving skaters. (Easing pushes this a bit further,
      //   but still well under puck-T.)
      // receiver2 (LW) hangs back until carrier=128 (puck=131, just before
      //   the line), then sprints — well behind puck → LEGAL.
      duration: 3.6,
    },
    {
      key: 'three-man-trailing-late',
      label: '3-man rush — trailing LW joins the rush a beat too early',
      level: 'advanced',
      offside: true,
      offendingHint: 'LW',
      offendingRole: 'receiver2',
      description: 'The trailing left-winger joined the rush before the puck crossed the line.',
      carrier:  { startX: 50, startY: 42, endX: 172, endY: 44, side: 'R' },
      // RECEIVER1 = RW (lead winger on the right). LEGAL — hangs back
      // until the puck is at the line, then enters cleanly behind it.
      receiver: { startX: 88, startY: 26, endX: 164, endY: 28,
                  pathType: 'straight', hangBackUntil: 130 },
      // RECEIVER2 = LW TRAILER on the far side. He's BEHIND the rush early
      // (clearly legal-looking start) but accelerates and reaches the line
      // before the puck — the "watch the late skater" trap. endX=180
      // gives him enough velocity that he crosses at t≈0.633 (puck=0.680).
      receiver2: { startX: 66, startY: 68, endX: 180, endY: 50,
                   pathType: 'straight' },
      // puck-T: (133-50)/(172-50) = 0.680
      // receiver1 (RW) hangs until carrier=130 (puck=133, AT the line),
      //   then sprints — crosses 136 well after puck → LEGAL.
      // receiver2 (LW trailer) crosses 136 at t=(136-60)/(180-60)=76/120
      //   = 0.633 → ~0.047 in raw t (~120ms) before puck. Visible but
      //   easy to miss because his STARTING position is so far back that
      //   he reads as "the trailer, no threat."
      duration: 3.6,
    },
    {
      key: 'three-man-clean',
      label: '3-man rush clean — all three behind the puck',
      level: 'advanced',
      offside: false,
      description: 'All three attackers waited — the puck crossed first. Clean entry.',
      carrier:  { startX: 45, startY: 42, endX: 172, endY: 44, side: 'R' },
      // Both receivers hang back until the puck is at the line, then enter.
      receiver: { startX: 75, startY: 22, endX: 162, endY: 32,
                  pathType: 'straight', hangBackUntil: 130 },
      receiver2: { startX: 70, startY: 62, endX: 160, endY: 54,
                   pathType: 'straight', hangBackUntil: 128 },
      // puck-T: (133-45)/(172-45) = 0.693
      // Both receivers held until carrier ≥ 128/130 (puck ≈ 131/133), so
      // neither crosses 136 before puck. Clean — kid should NOT whistle.
      duration: 3.6,
    },
    {
      key: 'three-man-curl-decoy',
      label: '3-man rush — LW curls (looks early but legal); C trailer is BARELY early',
      level: 'advanced',
      offside: true,
      offendingHint: 'C',
      offendingRole: 'receiver2',
      description: 'The trailing center crept across the blue line a tick before the puck. The wide-curling LW LOOKED early but was actually behind the line.',
      carrier:  { startX: 40, startY: 26, endX: 170, endY: 32, side: 'R' },
      // RECEIVER1 = LW curls in toward the slot. The bezier path makes him
      // LOOK like he's going early (path bows toward the line in y) but
      // the control point is tuned so his x stays UNDER 136 until t≈0.80
      // (after puck-T 0.705). DECOY — kid's eye is drawn to him.
      receiver: { startX: 78, startY: 60, endX: 160, endY: 38,
                  pathType: 'curl-in',
                  // Quadratic bezier: with ctrlX=95, ctrlY=70:
                  //   78u² + 190ut + 160t² = 136 at t≈0.80 (after puck).
                  // Visually he arcs DOWN toward the boards then up to the
                  // slot — the y-arc is dramatic, but x stays modest.
                  ctrlX: 95, ctrlY: 70 },
      // RECEIVER2 = C TRAILER coming up the middle. Looks "behind the play"
      // visually because he starts further back, but he's BARELY across
      // the line before the puck — the subtle offside.
      receiver2: { startX: 80, startY: 44, endX: 170, endY: 42,
                   pathType: 'straight' },
      // puck-T: (133-40)/(170-40) = 0.715
      // receiver1 (LW curl): bezier — solving (1-t)²·78 + 2(1-t)t·95 + t²·160 = 136
      //   gives t ≈ 0.80. After puck → LEGAL (the decoy).
      // receiver2 (C trailer): linear, crosses 136 at t=(136-80)/(170-80)
      //   = 56/90 ≈ 0.622 → ~0.093 in raw t (~240ms) before puck. Visible
      //   if kid is watching, easy to miss if the curl distracts.
      duration: 3.6,
    },
  ];

  // ----- Rink builder ----------------------------------------------------
  function buildHorizontalRink(container) {
    // Same first-layout hazard rink.js fixed on 2026-08-05: clientWidth can be
    // 0 when a scenario mounts before layout settles; a 0-wide rounded rect
    // hands Konva a negative arc radius and the whole init throws (dead
    // buttons). Fall back down the chain and clamp the corner radius.
    const cw = container.clientWidth
      || container.offsetWidth
      || (container.parentElement && container.parentElement.clientWidth)
      || 360;
    // Aim for ~800x340 but scale to container. Aspect 200ft × 85ft.
    const width = cw;
    const height = Math.round(width * RINK_WIDTH / RINK_LENGTH);
    const scale = width / RINK_LENGTH;
    const cornerR = Math.max(0, Math.min(12, Math.floor(Math.min(width, height) / 2) - 1));

    const stage = new Konva.Stage({ container, width, height, listening: true });
    const iceLayer = new Konva.Layer({ listening: false });
    const gridLayer = new Konva.Layer();
    const overlayLayer = new Konva.Layer({ listening: false });
    stage.add(iceLayer, gridLayer, overlayLayer);

    function toCanvasX(ftX) { return ftX * scale; }
    function toCanvasY(ftY) { return ftY * scale; }

    // --- ice surface ---
    iceLayer.add(new Konva.Rect({
      x: 0, y: 0, width, height,
      fill: '#F0F7FC',
      cornerRadius: cornerR,
    }));

    // --- zone tints ---
    // Defending zone (left) — faint blue
    iceLayer.add(new Konva.Rect({
      x: 0, y: 0, width: toCanvasX(DEF_BLUE_X), height,
      fill: 'rgba(13, 94, 171, 0.04)',
    }));
    // Neutral zone — no tint
    // Attacking zone (right) — faint red so kid clocks "this is the offside zone"
    iceLayer.add(new Konva.Rect({
      x: toCanvasX(ATK_BLUE_X), y: 0,
      width: width - toCanvasX(ATK_BLUE_X), height,
      fill: 'rgba(206, 32, 46, 0.06)',
    }));

    // --- defending blue line (faint) ---
    iceLayer.add(new Konva.Line({
      points: [toCanvasX(DEF_BLUE_X), 0, toCanvasX(DEF_BLUE_X), height],
      stroke: '#0D5EAB', strokeWidth: 2, opacity: 0.5,
    }));

    // --- center red line (half-thickness, faint) ---
    iceLayer.add(new Konva.Line({
      points: [toCanvasX(CENTER_X), 0, toCanvasX(CENTER_X), height],
      stroke: '#D62328', strokeWidth: 1.5, opacity: 0.55,
      dash: [8, 4],
    }));

    // --- attacking BLUE LINE (BOLD — this is the offside line) ---
    iceLayer.add(new Konva.Line({
      points: [toCanvasX(ATK_BLUE_X), 0, toCanvasX(ATK_BLUE_X), height],
      stroke: '#0D5EAB', strokeWidth: 6,
    }));
    // BLUE LINE label — vertical along the line itself so it doesn't crowd
    // the ATTACKING ZONE label in the top bar.
    iceLayer.add(new Konva.Text({
      x: toCanvasX(ATK_BLUE_X) - 12, y: height / 2 + 30,
      text: 'BLUE LINE',
      fontSize: 11, fontStyle: '900',
      fill: '#0D5EAB', letterSpacing: 1.5,
      rotation: -90,
    }));

    // --- goal line (red, thin) at x=189 ---
    iceLayer.add(new Konva.Line({
      points: [toCanvasX(GOAL_LINE_X), 0, toCanvasX(GOAL_LINE_X), height],
      stroke: '#D62328', strokeWidth: 1.5, opacity: 0.7,
    }));

    // --- net (small rectangle with red posts) at x=189 ---
    const netW = 4 * scale;          // 4 ft net depth
    const netH = 6 * scale;          // 6 ft net width
    const netX = toCanvasX(NET_X);
    const netY = (height - netH) / 2;
    iceLayer.add(new Konva.Rect({
      x: netX, y: netY, width: netW, height: netH,
      fill: '#FAFAFA',
      stroke: '#CE202E', strokeWidth: 2,
    }));
    // Red posts (vertical bars at the front face)
    iceLayer.add(new Konva.Line({
      points: [netX, netY, netX, netY + netH],
      stroke: '#CE202E', strokeWidth: 3,
    }));

    // --- face-off dots (NZ only — the 5 main circles below have their own
    // dot rendered inside the circle). NZ dots stay as plain spots because
    // NHL ice doesn't draw faceoff CIRCLES around the four NZ spots — only
    // the def-zone, atk-zone, and center spots get circles around them.
    const nzDots = [
      { x: 80, y: 20.5 }, { x: 80, y: 64.5 },     // NZ left dots
      { x: 120, y: 20.5 }, { x: 120, y: 64.5 },   // NZ right dots
    ];
    nzDots.forEach(s => {
      iceLayer.add(new Konva.Circle({
        x: toCanvasX(s.x), y: toCanvasY(s.y),
        radius: Math.max(2, scale * 0.7),
        fill: '#D62328', opacity: 0.55,
      }));
    });

    // --- face-off CIRCLES (5 of them — 2 def, 2 atk, 1 center) -----------
    // Real NHL spec: 30-ft diameter (15-ft radius), red stroke for the four
    // end-zone circles, blue stroke for the center circle. Each non-center
    // circle has 4 hash marks at the cardinal positions (N/S/E/W) where
    // players line up to take draws.
    //
    // The center faceoff also gets a SOLID center dot (blue) so it reads
    // as a faceoff spot, not just an empty circle.
    const FACEOFF_R_FT = 15;             // 15 ft radius = 30 ft diameter
    const HASH_LEN_FT  = 2;              // hash marks ~2 ft long
    const endZoneCircles = [
      { x: 31,  y: 20.5 },               // def zone, top
      { x: 31,  y: 64.5 },               // def zone, bottom
      { x: 169, y: 20.5 },               // atk zone, top
      { x: 169, y: 64.5 },               // atk zone, bottom
    ];
    endZoneCircles.forEach(s => {
      // The big circle.
      iceLayer.add(new Konva.Circle({
        x: toCanvasX(s.x), y: toCanvasY(s.y),
        radius: FACEOFF_R_FT * scale,
        stroke: '#D62328', strokeWidth: 1,
        fill: null,
      }));
      // Center dot inside.
      iceLayer.add(new Konva.Circle({
        x: toCanvasX(s.x), y: toCanvasY(s.y),
        radius: Math.max(2, scale * 0.7),
        fill: '#D62328', opacity: 0.55,
      }));
      // Four hash marks at N/E/S/W cardinals. We draw each as a tiny line
      // from the circle edge inward (toward the center) by HASH_LEN_FT.
      // The L-shape of a real hash mark would require two perpendicular
      // strokes — we render the radial stroke only (the simplification
      // reads correctly at the canvas sizes we draw at).
      const r = FACEOFF_R_FT;
      const cardinals = [
        { dx:  0, dy: -1 },              // top (N)
        { dx:  0, dy:  1 },              // bottom (S)
        { dx: -1, dy:  0 },              // left (W)
        { dx:  1, dy:  0 },              // right (E)
      ];
      cardinals.forEach(c => {
        const x1 = s.x + c.dx * r;
        const y1 = s.y + c.dy * r;
        const x2 = s.x + c.dx * (r - HASH_LEN_FT);
        const y2 = s.y + c.dy * (r - HASH_LEN_FT);
        iceLayer.add(new Konva.Line({
          points: [
            toCanvasX(x1), toCanvasY(y1),
            toCanvasX(x2), toCanvasY(y2),
          ],
          stroke: '#D62328', strokeWidth: 1.5,
        }));
      });
    });

    // Center faceoff circle — BLUE per NHL convention.
    const centerSpot = { x: 100, y: 42.5 };
    iceLayer.add(new Konva.Circle({
      x: toCanvasX(centerSpot.x), y: toCanvasY(centerSpot.y),
      radius: FACEOFF_R_FT * scale,
      stroke: '#0D5EAB', strokeWidth: 1,
      fill: null,
    }));
    iceLayer.add(new Konva.Circle({
      x: toCanvasX(centerSpot.x), y: toCanvasY(centerSpot.y),
      radius: Math.max(2, scale * 0.7),
      fill: '#0D5EAB', opacity: 0.7,
    }));

    // --- goal crease at the attacking net ---------------------------------
    // Modern NHL: 6-ft radius semicircle (D-shape) opening AWAY from the
    // end boards (i.e. opening toward center ice — to the LEFT in our
    // horizontal layout, since the net is at x=189 facing left).
    // Implementation: Konva.Arc with angle 180 starting at 90° opens left.
    const CREASE_R_FT = 6;
    iceLayer.add(new Konva.Arc({
      x: toCanvasX(NET_X), y: toCanvasY(RINK_WIDTH / 2),
      innerRadius: 0,
      outerRadius: CREASE_R_FT * scale,
      angle: 180,
      rotation: 90,                      // opens to the LEFT (toward center)
      fill: 'rgba(13, 94, 171, 0.18)',
      stroke: '#0D5EAB', strokeWidth: 1,
    }));

    // --- trapezoid behind attacking net -----------------------------------
    // NHL trapezoid: defines where the goalie may legally play the puck
    // behind the net. Bases of the trapezoid sit AT the goal line and at
    // the end boards; the goalie may handle the puck inside the trapezoid
    // only. Geometry (approx): narrow side along the goal line spans 22 ft
    // total (11 ft each side of net center), widening to ~28 ft at the
    // boards. Net center y = 42.5; net half-width ~3 ft. We draw:
    //   start ~32.5 (top edge of net) -> ~18.5 at boards (top side)
    //   start ~52.5 (bot edge of net) -> ~66.5 at boards (bottom side)
    // Boards = end of canvas at x = RINK_LENGTH (200). Lines are thin and
    // unfilled — purely a visual reference.
    const TRAP_TOP_NET_Y    = 32.5;
    const TRAP_TOP_BOARDS_Y = 18.5;
    const TRAP_BOT_NET_Y    = 52.5;
    const TRAP_BOT_BOARDS_Y = 66.5;
    iceLayer.add(new Konva.Line({
      points: [
        toCanvasX(NET_X),       toCanvasY(TRAP_TOP_NET_Y),
        toCanvasX(RINK_LENGTH), toCanvasY(TRAP_TOP_BOARDS_Y),
      ],
      stroke: '#D62328', strokeWidth: 1, opacity: 0.6,
    }));
    iceLayer.add(new Konva.Line({
      points: [
        toCanvasX(NET_X),       toCanvasY(TRAP_BOT_NET_Y),
        toCanvasX(RINK_LENGTH), toCanvasY(TRAP_BOT_BOARDS_Y),
      ],
      stroke: '#D62328', strokeWidth: 1, opacity: 0.6,
    }));

    // --- zone labels (small caps, top of canvas) ---
    iceLayer.add(new Konva.Text({
      x: toCanvasX(0) + 6, y: 6,
      text: 'DEF ZONE',
      fontSize: 10, fontStyle: '700',
      fill: 'rgba(13, 94, 171, 0.55)', letterSpacing: 1,
    }));
    iceLayer.add(new Konva.Text({
      x: toCanvasX(DEF_BLUE_X) + 6, y: 6,
      text: 'NEUTRAL ZONE',
      fontSize: 10, fontStyle: '700',
      fill: 'rgba(120, 120, 120, 0.65)', letterSpacing: 1,
    }));
    // ATTACKING ZONE label — positioned mid-way through the AZ now that BLUE
    // LINE has been rotated vertical and isn't competing for the top bar.
    iceLayer.add(new Konva.Text({
      x: toCanvasX(ATK_BLUE_X) + 12, y: 6,
      text: 'ATTACKING ZONE',
      fontSize: 10, fontStyle: '700',
      fill: 'rgba(206, 32, 46, 0.6)', letterSpacing: 1,
    }));

    // --- "DIRECTION OF PLAY →" anchor at the bottom ---
    iceLayer.add(new Konva.Text({
      x: 0, y: height - 16,
      width, align: 'center',
      text: 'DIRECTION OF PLAY  →',
      fontSize: 10, fontStyle: '900',
      fill: 'rgba(40, 40, 40, 0.55)', letterSpacing: 2,
    }));

    // --- end boards ---
    iceLayer.add(new Konva.Rect({
      x: 1, y: 1, width: width - 2, height: height - 2,
      stroke: '#1A1F2E', strokeWidth: 2,
      cornerRadius: cornerR, fill: null,
    }));

    iceLayer.draw();

    return {
      stage, iceLayer, gridLayer, overlayLayer,
      width, height, scale,
      toCanvasX, toCanvasY,
      DEF_BLUE_X, CENTER_X, ATK_BLUE_X, NET_X,
    };
  }

  // ----- Animation helpers ----------------------------------------------
  // Compute a generic receiver-shaped path's position in feet at time t
  // (0..1). `r` is any object with the receiver shape (startX/Y, endX/Y,
  // pathType, optional ctrlX/Y for bezier paths, optional hangBackUntil
  // for delayed-release straight paths). Used for both `play.receiver`
  // and `play.receiver2` in 3-skater advanced rushes.
  function receiverObjPosFt(play, r, t) {
    if (r.pathType === 'straight') {
      if (r.hangBackUntil != null) {
        // Receiver hangs back at startX/startY until carrier reaches
        // hangBackUntil, then sprints to endX/endY in the remaining time.
        // A patient receiver is not a statue (QC 2026-08-18: receivers that
        // froze then sprinted 55-75 ft/s were both a tell and a cartoon).
        // He drifts up-ice at about half the carrier's pace, staying a few
        // feet shy of the line, then releases and covers a capped distance.
        const carrierAt = carrierPosFt(play, t);
        const DRIFT = 0.55;
        const driftX = Math.min(r.startX + DRIFT * (carrierAt.x - play.carrier.startX), ATK_BLUE_X - 6);
        if (carrierAt.x < r.hangBackUntil) {
          return { x: driftX, y: r.startY };
        }
        const releaseT = (r.hangBackUntil - play.carrier.startX) /
                         (play.carrier.endX - play.carrier.startX);
        const localT = Math.max(0, Math.min(1, (t - releaseT) / (1 - releaseT)));
        const relX = Math.min(r.startX + DRIFT * (r.hangBackUntil - play.carrier.startX), ATK_BLUE_X - 6);
        const endX = Math.min(r.endX, relX + 36);   // a real burst, not a blur
        return {
          x: relX + (endX - relX) * localT,
          y: r.startY + (r.endY - r.startY) * localT,
        };
      }
      return {
        x: r.startX + (r.endX - r.startX) * t,
        y: r.startY + (r.endY - r.startY) * t,
      };
    }
    // Quadratic bezier: P(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
    const u = 1 - t;
    return {
      x: u * u * r.startX + 2 * u * t * r.ctrlX + t * t * r.endX,
      y: u * u * r.startY + 2 * u * t * r.ctrlY + t * t * r.endY,
    };
  }

  // Back-compat shim — most callsites still want "the receiver's position".
  // For 3-skater plays, callers also need receiverObjPosFt(play, play.receiver2, t).
  function receiverPosFt(play, t) {
    return receiverObjPosFt(play, play.receiver, t);
  }

  function carrierPosFt(play, t) {
    const c = play.carrier;
    return {
      x: c.startX + (c.endX - c.startX) * t,
      y: c.startY + (c.endY - c.startY) * t,
    };
  }

  // EaseOut for the rush — makes the receiver / carrier decelerate slightly
  // as they reach the zone, mimicking how a real player coasts in.
  // Konva's Easings.EaseOut signature is (t, b, c, d) returning eased value.
  function easeOutT(rawT) {
    // Was Konva EaseOut (quadratic): 2x average speed off the line, then a
    // dead stop, which read as "blast off, then coast to a freeze" and put a
    // 10U carrier at ~50 mph for the first half-second. Now a mild taper:
    // 1.15x at the start, 0.85x at the end, monotonic, evaluation uses the
    // same curve so what the kid sees is what gets judged.
    return rawT * (1.15 - 0.15 * rawT);
  }

  // ----- Init ------------------------------------------------------------
  function init(rinkContainer) {
    const rink = buildHorizontalRink(rinkContainer);
    const { toCanvasX, toCanvasY, scale, overlayLayer, gridLayer } = rink;

    let playIdx = 0;
    let carrierNode = null;
    let receiverNode = null;
    let receiver2Node = null;       // null on basic plays, populated on advanced
    let puckNode = null;
    let tierBadge = null;            // small "BASIC" / "ADVANCED — 3 SKATERS" Konva.Group
    let tierTransitionShown = false; // ensure the big "ADVANCED RUSH" overlay only fires once
    let animation = null;
    let startTime = null;
    let result = null;
    let isPlaying = false;
    let playCompleted = false;     // animation has finished naturally
    let whistled = false;

    // ---- Tier helpers (basic vs advanced) ----------------------------------
    // PLAYS is a flat array — basic plays first, then advanced. Helpers below
    // let us reason about tiers without leaking that order assumption all
    // over the file: levelOf(idx), firstAdvancedIdx(), basicPlayCount().
    function levelOf(idx) { return PLAYS[idx] ? PLAYS[idx].level : 'basic'; }
    function basicPlayCount() {
      return PLAYS.filter(function (p) { return p.level === 'basic'; }).length;
    }
    function advancedPlayCount() {
      return PLAYS.filter(function (p) { return p.level === 'advanced'; }).length;
    }
    function firstAdvancedIdx() {
      for (let i = 0; i < PLAYS.length; i++) {
        if (PLAYS[i].level === 'advanced') return i;
      }
      return -1;
    }
    function currentLevel() { return levelOf(playIdx); }
    // Index WITHIN the current tier (e.g. "play 3 of 4 advanced" → 2).
    function levelRushIdx() {
      const lvl = currentLevel();
      if (lvl === 'basic') return playIdx;
      return playIdx - firstAdvancedIdx();
    }
    function levelTotalRushes() {
      return currentLevel() === 'basic' ? basicPlayCount() : advancedPlayCount();
    }

    // ---- Contrast replay state (v0.14) -------------------------------------
    // The kid is the LINESMAN here, not a defender. There's no position to
    // drag to the right spot — the "wrong answer" is a judgment call (whistle
    // or no-whistle) that played out on the ice. So the contrast replay is
    // purely a REPLAY of the same rush with the correct call visualized on
    // top. No draggable tokens to move between phases; we just re-run the
    // animation and annotate at the key moment.
    //
    // contrastHandles tracks any in-flight animations (replay rushes, puck
    // passes, goal flashes) so stopContrast() can cancel them cleanly when
    // the kid taps Skip / Reset / Next.
    let contrastHandles = [];
    // Pucks left lying on the ice by a consequence (a shot stopped on the
    // goalie's pad). Cleared whenever the scene resets.
    let loosePucks = [];
    function clearLoosePucks() {
      loosePucks.forEach(function (n) { try { n.destroy(); } catch (e) {} });
      loosePucks = [];
    }
    // replayAnimation is the specific Konva.Animation driving a replay rush
    // (separate from `animation`, which is the original live rush). Tracked
    // separately so we can stop it without confusing the live-rush state.
    let replayAnimation = null;
    function trackHandle(h) { if (h && typeof h.stop === 'function') contrastHandles.push(h); return h; }
    function stopAllContrast() {
      if (replayAnimation) { try { replayAnimation.stop(); } catch (e) {} replayAnimation = null; }
      contrastHandles.forEach(function (h) { try { h.stop(); } catch (e) {} });
      contrastHandles = [];
    }

    function currentPlay() { return PLAYS[playIdx]; }

    // How far AHEAD of the carrier's centre the puck rides, in feet, taken
    // from the same blade geometry that draws it, so the judgment ("did the
    // skate cross before the PUCK") matches the picture at every screen size.
    function puckLeadFt() {
      try {
        if (carrierNode) return IceQ.Player.bladeTipPx(carrierNode).y / scale;
      } catch (e) { /* fall through */ }
      return 3;
    }
    // Canvas position for the puck when the carrier is at feet (cFt).
    function puckCanvasAt(cFt) {
      const centre = { x: toCanvasX(cFt.x), y: toCanvasY(cFt.y) };
      if (carrierNode) return IceQ.Player.puckPosFor(carrierNode, centre);
      return { x: toCanvasX(cFt.x + 3), y: toCanvasY(cFt.y + 1.5) };
    }

    // ---- scene setup ---------------------------------------------------
    let goalieNode = null;
    let dNodes = [];
    // D pair keeps a gap AHEAD of the carrier (toward our net), splits the
    // lanes, and never backs past the top of the circles.
    function positionDefenders(cFt) {
      if (!dNodes.length) return;
      // Both D back in ahead of the puck and finish protecting the house
      // (net-front lanes either side of the slot). Fixed lanes = never a
      // side-flip mid-rush, and the attackers finish 15-30 ft out, so the D
      // are past them, not under them, at the freeze frame.
      const GAP = 14, STOP_X = NET_X - 8;
      const mid = RINK_WIDTH / 2;
      const dx = Math.min(cFt.x + GAP, STOP_X);
      // Wide (±16) through the neutral zone so a receiver cutting to the
      // middle skates BETWEEN them, converging to net-front lanes (±7) as
      // they get deep. Real D do exactly this: gap wide, collapse late.
      const from = ATK_BLUE_X - 20, to = STOP_X;
      const prog = Math.max(0, Math.min(1, (dx - from) / (to - from)));
      const lane = 16 - 9 * prog;
      dNodes[0].position({ x: toCanvasX(dx), y: toCanvasY(mid - lane) });
      dNodes[1].position({ x: toCanvasX(dx - 1.5), y: toCanvasY(mid + lane) });
    }
    function drawScene() {
      [carrierNode, receiverNode, receiver2Node, puckNode, goalieNode].forEach(n => n && n.destroy());
      receiver2Node = null;
      const p = currentPlay();
      // 0.55 made a skater ~13 ft wide on a 200 ft rink (and ~19 ft on a
      // phone); 0.45 keeps skates readable and stops bodies stacking.
      const tokenScale = Math.max(0.45, scale * 0.06);

      // Our goalie in the crease. A rush toward an EMPTY net is one of the
      // "wonky physics" things kids flag, and the goalie is also the zone
      // cue: our colours in the net at the right end = they are attacking us.
      goalieNode = IceQ.Player.create({
        x: toCanvasX(NET_X - 1.5), y: toCanvasY(RINK_WIDTH / 2),
        scale: tokenScale, color: 'spartan', kind: 'goalie',
      });
      IceQ.Player.face(goalieNode, 'x-');
      gridLayer.add(goalieNode);

      // Our D pair backing in ahead of the rush (skater-back = body to the
      // play, skates toward own net). Purely visual: a rush into an EMPTY
      // zone is not hockey, and two of our sweaters retreating with the play
      // is also the clearest cue that THEY are attacking US.
      dNodes.forEach(n => n && n.destroy());
      dNodes = [-1, 1].map(side => {
        const g = IceQ.Player.create({
          x: 0, y: 0, scale: tokenScale, color: 'spartan', kind: 'skater-back',
          label: 'D', stickSide: side < 0 ? 'L' : 'R',
        });
        IceQ.Player.face(g, 'x+');
        gridLayer.add(g);
        return g;
      });
      positionDefenders({ x: p.carrier.startX, y: p.carrier.startY });

      carrierNode = IceQ.Player.create({
        x: toCanvasX(p.carrier.startX), y: toCanvasY(p.carrier.startY),
        scale: tokenScale,
        color: 'opponent',
        stickSide: p.carrier.side === 'R' ? 'L' : 'R',
      });
      receiverNode = IceQ.Player.create({
        x: toCanvasX(p.receiver.startX), y: toCanvasY(p.receiver.startY),
        scale: tokenScale,
        color: 'opponent',
        stickSide: p.receiver.startY < 42.5 ? 'R' : 'L',
      });

      // Third skater (advanced tier only). Same color/scale; stickSide is
      // chosen by which half of the ice the skater starts on, mirroring
      // receiver1's logic.
      if (p.receiver2) {
        receiver2Node = IceQ.Player.create({
          x: toCanvasX(p.receiver2.startX), y: toCanvasY(p.receiver2.startY),
          scale: tokenScale,
          color: 'opponent',
          stickSide: p.receiver2.startY < 42.5 ? 'R' : 'L',
        });
      }

      // This rink runs +x (left to right). Sprites are authored facing +y, so
      // without this every skater crab-walked sideways with his stick
      // pointing at the side boards (2026-08-18 audit, kids noticed).
      [carrierNode, receiverNode, receiver2Node].forEach(n => n && IceQ.Player.face(n, 'x+'));

      // Puck: separate Konva.Circle re-positioned EACH FRAME onto the
      // carrier's blade via Player.puckPosFor (sprite geometry + rotation),
      // instead of a fixed +3 ft that landed inside the sweater on phones
      // and on the wrong side of the stick on 8 of 10 plays.
      const puck0 = IceQ.Player.puckPosFor(carrierNode);
      puckNode = new Konva.Circle({
        x: puck0.x, y: puck0.y,
        radius: Math.max(4, scale * 0.55),
        fill: '#0A0A0A',
        stroke: '#E0C68A', strokeWidth: 1.5,
      });

      // Add nodes (skip null receiver2Node on basic plays).
      if (receiver2Node) {
        gridLayer.add(carrierNode, receiverNode, receiver2Node, puckNode);
      } else {
        gridLayer.add(carrierNode, receiverNode, puckNode);
      }
      drawTierBadge();
      gridLayer.batchDraw();
    }

    // ---- tier badge (small "BASIC" / "ADVANCED — 3 SKATERS" overlay) -------
    // Sits in the bottom-right of the rink — visible but unobtrusive. Recreated
    // each drawScene so it tracks tier transitions without manual cleanup.
    function drawTierBadge() {
      if (tierBadge) { try { tierBadge.destroy(); } catch (e) {} tierBadge = null; }
      const lvl = currentLevel();
      const isAdvanced = (lvl === 'advanced');
      const text = isAdvanced
        ? 'ADVANCED \u2014 3 SKATERS'
        : 'BASIC';
      const fill = isAdvanced ? '#7B1FA2' : '#0D5EAB';
      const padX = 8, padY = 4;
      const fontSize = Math.max(10, rink.width * 0.018);
      // Approximate text width (Konva will lay it out exactly when added).
      const approxW = text.length * fontSize * 0.55 + padX * 2;
      const approxH = fontSize + padY * 2;
      // Bottom-right corner, above the "DIRECTION OF PLAY" label.
      const badgeX = rink.width - approxW - 8;
      const badgeY = rink.height - approxH - 22;
      tierBadge = new Konva.Group({ x: badgeX, y: badgeY, listening: false });
      tierBadge.add(new Konva.Rect({
        x: 0, y: 0, width: approxW, height: approxH,
        fill: '#FFFFFF', stroke: fill, strokeWidth: 1.5,
        cornerRadius: 4, opacity: 0.9,
      }));
      tierBadge.add(new Konva.Text({
        x: padX, y: padY,
        text: text,
        fontSize: fontSize, fontStyle: '900',
        fill: fill, letterSpacing: 1,
      }));
      gridLayer.add(tierBadge);
    }

    // One-time "ADVANCED RUSH" announcement overlay. Fires once per session
    // when the kid first encounters an advanced play. Drawn on overlayLayer
    // so it floats over the rush.
    function showTierAdvancementBanner() {
      if (tierTransitionShown) return;
      tierTransitionShown = true;
      overlayLayer.destroyChildren();
      const w = rink.width;
      const h = rink.height;
      const titleSize = Math.max(22, w * 0.045);
      const subSize   = Math.max(14, w * 0.025);
      const title = new Konva.Text({
        x: 0, y: h * 0.30,
        width: w, align: 'center',
        text: 'ADVANCED RUSH \u2014 3 SKATERS NOW',
        fontSize: titleSize, fontStyle: '900',
        fill: '#7B1FA2', stroke: '#FFFFFF', strokeWidth: 3,
        letterSpacing: 1, opacity: 0, listening: false,
      });
      const sub = new Konva.Text({
        x: 0, y: h * 0.30 + titleSize + 6,
        width: w, align: 'center',
        text: 'WATCH ALL THREE OF THEM.',
        fontSize: subSize, fontStyle: '700',
        fill: '#7B1FA2', stroke: '#FFFFFF', strokeWidth: 2,
        letterSpacing: 1, opacity: 0, listening: false,
      });
      overlayLayer.add(title, sub);
      title.to({ opacity: 1, duration: 0.3 });
      sub.to({ opacity: 1, duration: 0.3 });
      overlayLayer.batchDraw();
      // Auto-fade after 1.6s — long enough to read, short enough not to
      // crowd the rush. (Kid hits Play after this.)
      setTimeout(function () {
        try {
          title.to({ opacity: 0, duration: 0.4, onFinish: function () { try { title.destroy(); } catch (e) {} } });
          sub.to({ opacity: 0, duration: 0.4, onFinish: function () { try { sub.destroy(); overlayLayer.batchDraw(); } catch (e) {} } });
        } catch (e) {}
      }, 1600);
    }

    // ---- run the rush --------------------------------------------------
    function startPlay(onComplete) {
      if (isPlaying) return;
      // Play always means "run this rush". A finished play (natural end OR a
      // whistle) used to make this a silent no-op while main.js had already
      // greyed the button: Play looked dead after any completed play.
      if (playCompleted || result || whistled) reset();
      const p = currentPlay();
      isPlaying = true;
      playCompleted = false;
      whistled = false;
      result = null;
      startTime = performance.now();

      animation = new Konva.Animation((frame) => {
        const rawElapsed = (performance.now() - startTime) / (p.duration * 1000);
        if (rawElapsed >= 1) {
          // End of rush — settle nodes at end positions.
          const cEnd = carrierPosFt(p, 1);
          const rEnd = receiverPosFt(p, 1);
          carrierNode.position({ x: toCanvasX(cEnd.x), y: toCanvasY(cEnd.y) });
          positionDefenders(cEnd);
          receiverNode.position({ x: toCanvasX(rEnd.x), y: toCanvasY(rEnd.y) });
          if (receiver2Node && p.receiver2) {
            const r2End = receiverObjPosFt(p, p.receiver2, 1);
            receiver2Node.position({ x: toCanvasX(r2End.x), y: toCanvasY(r2End.y) });
          }
          puckNode.position(puckCanvasAt(cEnd));
          gridLayer.batchDraw();
          animation.stop();
          isPlaying = false;
          playCompleted = true;
          evaluateAtEnd();
          if (onComplete) onComplete();
          return false;
        }
        const t = easeOutT(rawElapsed);

        // Carrier (linear-in-feet, eased in time).
        const cFt = carrierPosFt(p, t);
        carrierNode.position({ x: toCanvasX(cFt.x), y: toCanvasY(cFt.y) });
        positionDefenders(cFt);

        // Receiver1 (path-type-aware).
        const rFt = receiverPosFt(p, t);
        receiverNode.position({ x: toCanvasX(rFt.x), y: toCanvasY(rFt.y) });

        // Receiver2 (advanced tier only; null on basic).
        if (receiver2Node && p.receiver2) {
          const r2Ft = receiverObjPosFt(p, p.receiver2, t);
          receiver2Node.position({ x: toCanvasX(r2Ft.x), y: toCanvasY(r2Ft.y) });
        }

        // Puck rides slightly forward of carrier — shifted in +x direction
        // (direction of play) so it visually trails on the stick blade.
        puckNode.position(puckCanvasAt(cFt));
      }, gridLayer);
      animation.start();
    }

    // ---- whistle (kid taps OFFSIDE) -----------------------------------
    // Returns the result object IF the tap counts as a "whistle event"
    // we can evaluate. Tapping after the play completes naturally is
    // ignored (the result was already computed at end-of-play).
    function tapOffside() {
      if (result) return null;            // already evaluated
      if (!isPlaying && !playCompleted) return null;  // never started — no-op
      whistled = true;

      const p = currentPlay();
      // Determine "did receiver cross the blue line before puck" based on
      // CURRENT animation state — not per-spec timestamps. This is more
      // honest: if I'm half a frame off, the eval still matches what the
      // kid actually saw.
      let rawElapsed = isPlaying
        ? (performance.now() - startTime) / (p.duration * 1000)
        : 1;
      rawElapsed = Math.max(0, Math.min(1, rawElapsed));
      const t = easeOutT(rawElapsed);

      const carrierFt = carrierPosFt(p, t);
      const receiverFt = receiverPosFt(p, t);
      const puckX = carrierFt.x + puckLeadFt();  // matches the drawn puck

      const receiverWasInZoneBeforePuck =
        receiverEverCrossedFirst(p, rawElapsed);

      // Stop the animation IF still running.
      if (isPlaying && animation) {
        animation.stop();
        isPlaying = false;
      }

      result = evaluateWhistle(p, {
        whistleAt: rawElapsed,
        receiverFt,
        puckX,
        receiverWasInZoneBeforePuck,
      });
      showVerdict(result);
      return result;
    }

    // Did ANY receiver's x cross ATK_BLUE_X before the puck did, at any
    // sampled point up to whistleAtRaw? We sample at small time-steps
    // (not just whistle moment) because if the kid whistles AFTER the
    // offside has already happened on screen, we want to credit it.
    // For 3-skater plays: we check BOTH receivers and return true if
    // EITHER crossed early. earliestOffender(play) — below — gives more
    // detail when we need to phrase feedback.
    function receiverEverCrossedFirst(play, whistleAtRaw) {
      const STEP = 0.005;  // fine enough that a phone-scale puck lead cannot tie a crossing
      let r1At = null;     // first raw-t when receiver crossed
      let r2At = null;     // first raw-t when receiver2 crossed (null if no r2)
      let puckInZoneAt = null;
      const hasR2 = !!play.receiver2;
      const tEnd = Math.min(1, whistleAtRaw + 0.04); // 1-frame grace
      for (let raw = 0; raw <= tEnd + 1e-6; raw += STEP) {
        const t = easeOutT(Math.min(1, raw));
        const c = carrierPosFt(play, t);
        const r = receiverPosFt(play, t);
        const puckX = c.x + puckLeadFt();
        if (r1At == null && r.x >= ATK_BLUE_X) r1At = raw;
        if (hasR2 && r2At == null) {
          const r2 = receiverObjPosFt(play, play.receiver2, t);
          if (r2.x >= ATK_BLUE_X) r2At = raw;
        }
        if (puckInZoneAt == null && puckX >= ATK_BLUE_X) puckInZoneAt = raw;
        const allFound = (r1At != null) && (puckInZoneAt != null) &&
                         (!hasR2 || r2At != null);
        if (allFound) break;
      }
      // Earliest receiver crossing (either r1 or r2).
      let earliestReceiver = null;
      if (r1At != null && r2At != null) earliestReceiver = Math.min(r1At, r2At);
      else if (r1At != null) earliestReceiver = r1At;
      else if (r2At != null) earliestReceiver = r2At;
      // Crossed first iff some receiver crossed AND (puck hasn't yet OR
      // puck crossed strictly later).
      if (earliestReceiver == null) return false;
      if (puckInZoneAt == null) return true;
      return earliestReceiver < puckInZoneAt;
    }

    // Identify which receiver crossed earliest (if any) and BEFORE the
    // puck. Returns { role: 'receiver'|'receiver2', tRaw } when an offside
    // happened, or null when no receiver crossed early. Used by
    // evaluateWhistle / evaluateAtEnd to phrase "the trailing center..."
    // style feedback for 3-skater plays.
    function earliestOffender(play) {
      const STEP = 0.005;   // fine-grained — phrasing depends on this
      let r1At = null;
      let r2At = null;
      let puckInZoneAt = null;
      const hasR2 = !!play.receiver2;
      for (let raw = 0; raw <= 1 + 1e-6; raw += STEP) {
        const t = easeOutT(Math.min(1, raw));
        const c = carrierPosFt(play, t);
        const r = receiverPosFt(play, t);
        const puckX = c.x + puckLeadFt();
        if (r1At == null && r.x >= ATK_BLUE_X) r1At = raw;
        if (hasR2 && r2At == null) {
          const r2 = receiverObjPosFt(play, play.receiver2, t);
          if (r2.x >= ATK_BLUE_X) r2At = raw;
        }
        if (puckInZoneAt == null && puckX >= ATK_BLUE_X) puckInZoneAt = raw;
        if (r1At != null && (!hasR2 || r2At != null) && puckInZoneAt != null) break;
      }
      // Pick the earliest cross that's BEFORE the puck.
      const candidates = [];
      if (r1At != null && (puckInZoneAt == null || r1At < puckInZoneAt)) {
        candidates.push({ role: 'receiver', tRaw: r1At });
      }
      if (r2At != null && (puckInZoneAt == null || r2At < puckInZoneAt)) {
        candidates.push({ role: 'receiver2', tRaw: r2At });
      }
      if (candidates.length === 0) return null;
      candidates.sort(function (a, b) { return a.tRaw - b.tRaw; });
      return candidates[0];
    }

    // ---- evaluate -----------------------------------------------------
    // Whistle eval: kid blew the whistle. Was it the right call?
    // For 3-skater plays we tag the result with `offendingRole` /
    // `offendingHint` so phrasedFeedback can name the offending skater
    // ("the trailing center", "the LW receiver", etc.).
    function evaluateWhistle(p, ctx) {
      if (p.offside) {
        // Correct call IFF the offside moment had actually occurred (or
        // was just about to) by the time of the whistle. Generous — we
        // accept up to +0.04 raw-time grace inside receiverEverCrossedFirst.
        if (ctx.receiverWasInZoneBeforePuck) {
          const off = earliestOffender(p);
          return {
            correct: true, pass: true,
            kind: 'good-call',
            offside: true, whistled: true, played: true,
            verdict: 'OFFSIDE',
            message: p.description,
            offendingRole: off ? off.role : (p.offendingRole || 'receiver'),
            offendingHint: p.offendingHint || null,
          };
        }
        // They whistled too early — receiver wasn't yet over the line.
        return {
          correct: false, pass: false,
          kind: 'too-early',
          offside: true, whistled: true, played: true,
          verdict: 'TOO EARLY',
          message: 'Too early — wait until BOTH skates are over the blue line.',
          offendingRole: p.offendingRole || 'receiver',
          offendingHint: p.offendingHint || null,
        };
      }
      // play.offside === false — any whistle is a false call. Verdict is
      // "BAD CALL" from the linesman's POV (the kid IS the linesman, so
      // "wave it off" — which is what a player would shout at the ref —
      // doesn't fit). The kid blew a whistle they shouldn't have.
      return {
        correct: false, pass: false,
        kind: 'false-call',
        offside: false, whistled: true, played: true,
        verdict: 'BAD CALL',
        message: 'Bad call — that was a clean entry. The puck crossed first.',
      };
    }

    // No-whistle eval: animation completed without the kid tapping.
    function evaluateAtEnd() {
      const p = currentPlay();
      if (whistled) return;  // tapOffside already ran
      if (p.offside) {
        const off = earliestOffender(p);
        result = {
          correct: false, pass: false,
          kind: 'missed',
          offside: true, whistled: false, played: true,
          verdict: 'MISSED',
          message: 'You missed it — watch the SKATES, not the body. Both skates over before the puck = offside.',
          offendingRole: off ? off.role : (p.offendingRole || 'receiver'),
          offendingHint: p.offendingHint || null,
        };
      } else {
        result = {
          correct: true, pass: true,
          kind: 'no-call',
          offside: false, whistled: false, played: true,
          verdict: 'GOOD NO-CALL',
          message: 'Clean entry — patient read. Linesman skill.',
        };
      }
      showVerdict(result);
    }

    // ---- show verdict (big text overlay) -----------------------------
    function showVerdict(res) {
      overlayLayer.destroyChildren();
      const color = res.correct ? '#2A9D3F' : '#CE202E';
      const text = (res.correct ? '\u2713 ' : '\u2717 ') + res.verdict;
      const fontSize = Math.max(36, rink.width * 0.075);
      const txt = new Konva.Text({
        x: 0, y: rink.height * 0.32,
        width: rink.width, align: 'center',
        text, fontSize,
        fontStyle: '900',
        fill: color, stroke: '#FFFFFF', strokeWidth: 3,
        opacity: 0,
        listening: false,
      });
      overlayLayer.add(txt);
      txt.to({ opacity: 1, duration: 0.3 });
      overlayLayer.batchDraw();
    }

    // ---- showMe: animate the correct interpretation ------------------
    // For OFFSIDE plays: highlight the offending receiver's leading skate
    // and the moment it crossed the blue line. For ONSIDE plays: pulse the
    // puck crossing first. For 3-skater plays: find the EARLIEST of the
    // two receivers (the actual offender) and freeze on that one.
    function showMe() {
      const p = currentPlay();
      // Reset and re-render scene first.
      result = null;
      whistled = false;
      playCompleted = false;
      overlayLayer.destroyChildren();
      drawScene();

      // Find the moment the offending event happens, and record WHICH
      // receiver was the earliest crosser (for 3-skater annotation).
      let crossT = null;
      let offendingReceiver = null;   // 'receiver' | 'receiver2' | null
      if (p.offside) {
        const off = earliestOffender(p);
        if (off) {
          crossT = off.tRaw;
          offendingReceiver = off.role;
        }
      } else {
        // Onside: find the moment the PUCK crosses (what justifies "clean").
        const STEP = 0.01;
        for (let raw = 0; raw <= 1 + 1e-6; raw += STEP) {
          const t = easeOutT(Math.min(1, raw));
          const c = carrierPosFt(p, t);
          if (c.x + 3 >= ATK_BLUE_X) { crossT = raw; break; }
        }
      }
      if (crossT == null) crossT = 0.7;

      // Animate to crossT, then pause and annotate.
      const annotateAt = crossT;
      const p2 = currentPlay();
      isPlaying = true;
      startTime = performance.now();

      animation = new Konva.Animation(() => {
        const rawElapsed = (performance.now() - startTime) / (p2.duration * 1000);
        if (rawElapsed >= annotateAt) {
          const t = easeOutT(annotateAt);
          const cFt = carrierPosFt(p2, t);
          const rFt = receiverPosFt(p2, t);
          carrierNode.position({ x: toCanvasX(cFt.x), y: toCanvasY(cFt.y) });
          positionDefenders(cFt);
          receiverNode.position({ x: toCanvasX(rFt.x), y: toCanvasY(rFt.y) });
          let r2Ft = null;
          if (receiver2Node && p2.receiver2) {
            r2Ft = receiverObjPosFt(p2, p2.receiver2, t);
            receiver2Node.position({ x: toCanvasX(r2Ft.x), y: toCanvasY(r2Ft.y) });
          }
          puckNode.position(puckCanvasAt(cFt));
          gridLayer.batchDraw();
          animation.stop();
          isPlaying = false;
          drawAnnotation(p2, t, cFt, rFt, r2Ft, offendingReceiver);
          return false;
        }
        const t = easeOutT(rawElapsed);
        const cFt = carrierPosFt(p2, t);
        const rFt = receiverPosFt(p2, t);
        carrierNode.position({ x: toCanvasX(cFt.x), y: toCanvasY(cFt.y) });
        positionDefenders(cFt);
        receiverNode.position({ x: toCanvasX(rFt.x), y: toCanvasY(rFt.y) });
        if (receiver2Node && p2.receiver2) {
          const r2Ft = receiverObjPosFt(p2, p2.receiver2, t);
          receiver2Node.position({ x: toCanvasX(r2Ft.x), y: toCanvasY(r2Ft.y) });
        }
        puckNode.position(puckCanvasAt(cFt));
      }, gridLayer);
      animation.start();
    }

    function drawAnnotation(p, t, cFt, rFt, r2Ft, offendingReceiver) {
      // Highlight: small ring around the offending skater's "leading skate"
      // (approximated as receiver xy + small forward offset). On 3-skater
      // plays, ring goes around the receiver that actually crossed early.
      let subjectFt;
      if (p.offside) {
        if (offendingReceiver === 'receiver2' && r2Ft) subjectFt = r2Ft;
        else subjectFt = rFt;
      } else {
        subjectFt = { x: cFt.x + 3, y: cFt.y + 1.5 };
      }
      const ring = new Konva.Circle({
        x: toCanvasX(subjectFt.x), y: toCanvasY(subjectFt.y),
        radius: Math.max(10, scale * 1.6),
        stroke: p.offside ? '#CE202E' : '#2A9D3F',
        strokeWidth: 3,
        dash: [4, 3],
        opacity: 0,
        listening: false,
      });
      overlayLayer.add(ring);
      ring.to({ opacity: 1, duration: 0.4 });

      // Caption near the ring.
      const caption = p.offside
        ? "BOTH SKATES over the line BEFORE the puck — offside."
        : "PUCK crossed first — clean entry.";
      const cap = new Konva.Text({
        x: toCanvasX(ATK_BLUE_X) - 80, y: toCanvasY(78),
        width: 200, align: 'center',
        text: caption,
        fontSize: 11, fontStyle: '900',
        fill: p.offside ? '#CE202E' : '#2A9D3F',
        stroke: '#FFFFFF', strokeWidth: 2,
        opacity: 0,
        listening: false,
      });
      overlayLayer.add(cap);
      cap.to({ opacity: 1, duration: 0.4 });
      overlayLayer.batchDraw();
    }

    // ---- Contrast replay helpers (v0.14) -------------------------------
    // Re-animate the rush from the very beginning. Unlike startPlay() this
    // variant:
    //   * does NOT evaluate at the end (no result emission, no overlay)
    //   * honors a skipSignal — polled each frame; when .skipped goes true
    //     we stop and resolve immediately
    //   * can pause at a given raw time (for "freeze at the moment of
    //     crossing"); caller supplies { pauseAtRaw, onPause } and we hold
    //     the final frame instead of continuing
    //   * can fire an onCross hook the first frame a predicate becomes true
    //     (used to catch "receiver skate crossed" or "puck crossed")
    //
    // Returns a handle with { promise, stop() } so contrast orchestration
    // can await completion or cancel mid-flight.
    function replayRush(play, opts) {
      opts = opts || {};
      const skipSignal = opts.skipSignal || { skipped: false };
      const pauseAtRaw = opts.pauseAtRaw;       // number in [0,1], or null
      const onPause = opts.onPause;             // fn(); called once at pause
      const duration = play.duration;           // seconds
      // Reset nodes to starting positions before the replay (drawScene will
      // have been called by the caller — but we want a fresh start each time
      // we kick off a replay). We don't re-create nodes, just re-position.
      if (carrierNode) carrierNode.position({
        x: toCanvasX(play.carrier.startX), y: toCanvasY(play.carrier.startY),
      });
      positionDefenders({ x: play.carrier.startX, y: play.carrier.startY });
      if (receiverNode) receiverNode.position({
        x: toCanvasX(play.receiver.startX), y: toCanvasY(play.receiver.startY),
      });
      if (receiver2Node && play.receiver2) receiver2Node.position({
        x: toCanvasX(play.receiver2.startX), y: toCanvasY(play.receiver2.startY),
      });
      if (puckNode) puckNode.position(puckCanvasAt({ x: play.carrier.startX, y: play.carrier.startY }));
      gridLayer.batchDraw();

      let resolveFn;
      const promise = new Promise(function (res) { resolveFn = res; });
      let stopped = false;
      let paused = false;
      const replayStart = performance.now();

      // Helper closure: position all skaters + puck at a given raw time.
      // De-duplicates the position-update logic across the running, paused,
      // and end-settle code paths in the animation loop below.
      function positionAt(rawT) {
        const t = easeOutT(Math.min(1, Math.max(0, rawT)));
        const cFt = carrierPosFt(play, t);
        const rFt = receiverPosFt(play, t);
        carrierNode.position({ x: toCanvasX(cFt.x), y: toCanvasY(cFt.y) });
        positionDefenders(cFt);
        receiverNode.position({ x: toCanvasX(rFt.x), y: toCanvasY(rFt.y) });
        let r2Ft = null;
        if (receiver2Node && play.receiver2) {
          r2Ft = receiverObjPosFt(play, play.receiver2, t);
          receiver2Node.position({ x: toCanvasX(r2Ft.x), y: toCanvasY(r2Ft.y) });
        }
        puckNode.position(puckCanvasAt(cFt));
        return { t: t, cFt: cFt, rFt: rFt, r2Ft: r2Ft };
      }

      replayAnimation = new Konva.Animation(function () {
        if (stopped) return false;
        if (skipSignal.skipped) {
          stopped = true;
          replayAnimation.stop();
          resolveFn({ skipped: true });
          return false;
        }
        const rawElapsed = (performance.now() - replayStart) / (duration * 1000);
        // Paused? Hold the pause-frame until skip/stop.
        if (paused) return;
        // Past the pause point? Clamp and pause.
        if (pauseAtRaw != null && rawElapsed >= pauseAtRaw) {
          const frame = positionAt(pauseAtRaw);
          gridLayer.batchDraw();
          paused = true;
          if (typeof onPause === 'function') {
            try {
              onPause({
                t: frame.t,
                carrierFt: frame.cFt,
                receiverFt: frame.rFt,
                receiver2Ft: frame.r2Ft,
              });
            } catch (e) {}
          }
          // Hold the freeze-frame so the kid can read the overlay, then
          // resolve. Before 2026-08-18 this branch never resolved at all, so
          // every wrong answer parked the game on this frame until the kid
          // found "Skip ahead (no credit)". Skip / stop still cut it short.
          const holdMs = (opts.holdMs != null) ? opts.holdMs : 1100;
          setTimeout(function () {
            if (stopped) return;
            stopped = true;
            try { replayAnimation.stop(); } catch (e) {}
            resolveFn({ paused: true, completed: true });
          }, holdMs);
          return;
        }
        // Past end? Settle at end and resolve.
        if (rawElapsed >= 1) {
          positionAt(1);
          gridLayer.batchDraw();
          replayAnimation.stop();
          resolveFn({ completed: true });
          return false;
        }
        positionAt(rawElapsed);
      }, gridLayer);
      replayAnimation.start();

      return {
        stop: function () {
          if (stopped) return;
          stopped = true;
          if (replayAnimation) { try { replayAnimation.stop(); } catch (e) {} }
          resolveFn({ stopped: true });
        },
        // Expose a hook so a paused replay can be RESUMED if we want to
        // continue past the pause point (not currently used but keeps
        // replayRush flexible for future extensions).
        resume: function () { paused = false; },
        promise: promise,
      };
    }

    // Find the raw-time moment the receiver's x crosses ATK_BLUE_X (for
    // offside plays) or the puck crosses (for onside plays). Sampled at
    // fine granularity to match the eye — we want the freeze to land right
    // at the telltale frame.
    //
    // For 3-skater plays with `which === 'receiver'`, we return the EARLIEST
    // crossing among receiver and receiver2 — that's the offside moment we
    // want to freeze on (and visually highlight).
    function findCrossingT(play, which) {
      const STEP = 0.005;
      const hasR2 = !!play.receiver2;
      let r1Cross = null, r2Cross = null, puckCross = null;
      for (let raw = 0; raw <= 1 + 1e-6; raw += STEP) {
        const t = easeOutT(Math.min(1, raw));
        const c = carrierPosFt(play, t);
        const r = receiverPosFt(play, t);
        const puckX = c.x + puckLeadFt();
        if (r1Cross == null && r.x >= ATK_BLUE_X) r1Cross = raw;
        if (hasR2 && r2Cross == null) {
          const r2 = receiverObjPosFt(play, play.receiver2, t);
          if (r2.x >= ATK_BLUE_X) r2Cross = raw;
        }
        if (puckCross == null && puckX >= ATK_BLUE_X) puckCross = raw;
        if (which === 'receiver' && r1Cross != null && (!hasR2 || r2Cross != null)) break;
        if (which === 'puck' && puckCross != null) break;
      }
      if (which === 'puck') return puckCross != null ? puckCross : 0.7;
      // which === 'receiver': earliest crossing among the receivers.
      const candidates = [];
      if (r1Cross != null) candidates.push(r1Cross);
      if (r2Cross != null) candidates.push(r2Cross);
      if (candidates.length === 0) return 0.7;
      return Math.min.apply(null, candidates);
    }

    // Draw a whistle icon + label mid-canvas. Used by playWrongFalseCall
    // (linesman waved it off) and playRightMissedCall (whistle blown at the
    // moment of crossing). Returns a node so caller can destroy it later.
    // We use both an emoji ICON and the word "WHISTLE" for legibility — the
    // emoji alone reads as cute, the word alone reads as shouty; together
    // they land as "this is the call."
    function drawWhistleOverlay(text, color) {
      const w = rink.width;
      const h = rink.height;
      const iconSize = Math.max(40, w * 0.09);
      const labelSize = Math.max(20, w * 0.04);
      const group = new Konva.Group({ listening: false });
      const icon = new Konva.Text({
        x: 0, y: h * 0.30,
        width: w, align: 'center',
        text: '\u270B',              // raised hand / "halt" icon
        fontSize: iconSize,
        opacity: 0,
      });
      const lbl = new Konva.Text({
        x: 0, y: h * 0.30 + iconSize + 4,
        width: w, align: 'center',
        text: text || 'WHISTLE!',
        fontSize: labelSize, fontStyle: '900',
        fill: color || '#0D5EAB',
        stroke: '#FFFFFF', strokeWidth: 3,
        letterSpacing: 2,
        opacity: 0,
      });
      group.add(icon, lbl);
      overlayLayer.add(group);
      overlayLayer.batchDraw();
      icon.to({ opacity: 1, duration: 0.2 });
      lbl.to({ opacity: 1, duration: 0.2 });
      return group;
    }

    // Draw a tall highlight line AT the attacking blue line (the offside
    // line itself). Used during playRightMissedCall to say "THIS is the line
    // the skate crossed early."
    function drawBlueLineHighlight(color) {
      const line = new Konva.Line({
        points: [
          toCanvasX(ATK_BLUE_X), 0,
          toCanvasX(ATK_BLUE_X), rink.height,
        ],
        stroke: color || '#F4C430',
        strokeWidth: 4,
        opacity: 0,
        listening: false,
      });
      overlayLayer.add(line);
      line.to({ opacity: 1, duration: 0.2 });
      overlayLayer.batchDraw();
      return line;
    }

    // ---- playWrong variants (the story of what actually happened) ------

    // Play was offside, kid DID NOT whistle. Rush continues: the carrier
    // skates deep, shoots on net, GOAL. Then "BUT INSTEAD..." flows into
    // playRightMissedCall.
    function playWrongMissedCall(skipSignal) {
      const sig = skipSignal || { skipped: false };
      const p = currentPlay();
      return (async function () {
        if (sig.skipped) return;
        if (!carrierNode || !puckNode) return;
        // Step a: rush CONTINUES — instead of stopping at the rush endpoint,
        // the carrier drives to the net. We don't bother re-running the
        // rush animation itself (the kid just watched it) — we just tween
        // carrier + puck from their final rush position to the net.
        // The carrier CARRIES the puck to the top of the crease: one
        // Konva.Animation moves the sprite and re-seats the puck on the blade
        // every frame (before 2026-08-18 the sprite and a puck copy ran on
        // two different easings, so the puck visibly left the stick and
        // parked on open ice by the goal mouth).
        const cEnd = carrierPosFt(p, 1);
        const driveEndFt = { x: NET_X - 9, y: RINK_WIDTH / 2 + 2 };
        const driveHandle = trackHandle(carryTo(cEnd, driveEndFt, 0.7, sig));
        await driveHandle.promise;
        if (sig.skipped) return;

        // Step b: SHOT from the blade. It hits the goalie's pad and stops
        // there (persist), no goal, no horn. Will 2026-08-18: celebrating a
        // goal after a missed offside is the kind of weirdness that turns
        // off real hockey people. The point is that the whole chance should
        // never have happened; the goalie bailing the linesman out makes
        // that read cleanly.
        const shotFrom = puckCanvasAt(driveEndFt);
        const padFt = { x: NET_X - 3.2, y: RINK_WIDTH / 2 - 1.2 };  // goalie's pad, in front of the line
        puckNode.visible(false);
        const shotHandle = trackHandle(IceQ.Path.animatePuckPass(
          gridLayer, shotFrom,
          { x: toCanvasX(padFt.x), y: toCanvasY(padFt.y) },
          { duration: 0.22, persist: true }
        ));
        // Remember the parked puck so resetPositions / reset can clear it
        // (otherwise a second puck sits in the crease through the replay).
        loosePucks.push(shotHandle.node);
        await shotHandle.promise;
        if (sig.skipped) return;

        // Step c: the consequence, framed for the LINESMAN: the whistle was
        // yours and you left it in your pocket, so they got a free chance.
        await IceQ.Path.animateGoalConsequence(rink, {
          kind: 'saved',
          message: 'FREE CHANCE OFF AN OFFSIDE PLAY',
          duration: 1.2,
        });
      })();
    }

    // Move the carrier from feet A to feet B over `sec` seconds with the
    // puck riding his blade the whole way. Returns { promise, stop }.
    function carryTo(fromFt, toFt, sec, sig) {
      let resolveFn; const promise = new Promise(function (r) { resolveFn = r; });
      let stopped = false;
      const t0 = performance.now();
      const anim = new Konva.Animation(function () {
        if (stopped) return false;
        if (sig && sig.skipped) { stopped = true; anim.stop(); resolveFn({ skipped: true }); return false; }
        let u = (performance.now() - t0) / (sec * 1000);
        if (u >= 1) u = 1;
        const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;   // easeInOutQuad
        const cFt = { x: fromFt.x + (toFt.x - fromFt.x) * e, y: fromFt.y + (toFt.y - fromFt.y) * e };
        if (carrierNode) carrierNode.position({ x: toCanvasX(cFt.x), y: toCanvasY(cFt.y) });
        positionDefenders(cFt);
        if (puckNode) puckNode.position(puckCanvasAt(cFt));
        if (u >= 1) { stopped = true; anim.stop(); resolveFn({ completed: true }); return false; }
      }, gridLayer);
      anim.start();
      return {
        promise: promise,
        stop: function () { if (stopped) return; stopped = true; try { anim.stop(); } catch (e) {} resolveFn({ stopped: true }); },
      };
    }

    // Play was OFFSIDE but the whistle came before anybody was over: the
    // story is "nobody was over yet", not "you let it through" (the kid did
    // the opposite of letting it through).
    function playWrongEarlyCall(skipSignal) {
      const sig = skipSignal || { skipped: false };
      return (async function () {
        if (sig.skipped) return;
        const whistle = drawWhistleOverlay('WHISTLE!', '#CE202E');
        await IceQ.Path.wait(500);
        try { whistle.destroy(); } catch (e) {}
        overlayLayer.batchDraw();
        if (sig.skipped) return;
        await IceQ.Path.flashLabel(rink, {
          text: 'TOO EARLY: NOBODY WAS OVER THE LINE YET',
          color: '#CE202E', holdMs: 900, fontSize: 20,
          skipSignal: sig,
        });
      })();
    }

    // Play was LEGAL, kid whistled early. Linesman waves it off — no goal,
    // no horn (nothing actually happened on the ice worth celebrating or
    // punishing). Just a visual gesture + "WAVE IT OFF" flashLabel.
    function playWrongFalseCall(skipSignal) {
      const sig = skipSignal || { skipped: false };
      return (async function () {
        if (sig.skipped) return;
        // Step a: whistle icon flashes briefly ("you called it").
        const whistle = drawWhistleOverlay('WHISTLE!', '#CE202E');
        await IceQ.Path.wait(600);
        if (sig.skipped) { try { whistle.destroy(); } catch (e) {} return; }
        try { whistle.destroy(); } catch (e) {}
        overlayLayer.batchDraw();
        if (sig.skipped) return;

        // Step b: "BAD CALL" label — no goal, no horn. This is a bad
        // whistle that took away a clean entry. The framing is from the
        // linesman's POV (the kid): you blew the play dead when you
        // shouldn't have. Showing the player POV ("wave it off") was
        // confusing because the kid IS the linesman, not a defender.
        await IceQ.Path.flashLabel(rink, {
          text: 'BAD CALL \u2014 CLEAN ENTRY WAS LEGAL',
          color: '#CE202E', holdMs: 900, fontSize: 20,
          skipSignal: sig,
        });
      })();
    }

    // ---- playRight variants (the story of what SHOULD have happened) ---

    // Replay the offside rush; freeze when receiver's skate crosses the
    // blue line before the puck; overlay a yellow line + big "OFFSIDE!"
    // text + whistle icon. savePling (not goalHorn — we're rewarding a
    // correct call, not celebrating a goal).
    function playRightMissedCall(skipSignal) {
      const sig = skipSignal || { skipped: false };
      const p = currentPlay();
      return (async function () {
        if (sig.skipped) return;
        const crossRaw = findCrossingT(p, 'receiver');
        // Replay up to the crossing moment, pausing there.
        const replay = trackHandle(replayRush(p, {
          skipSignal: sig,
          pauseAtRaw: crossRaw,
          onPause: function () {
            // Paint the "you should have whistled HERE" visuals.
            drawBlueLineHighlight('#F4C430');
            drawWhistleOverlay('OFFSIDE!', '#CE202E');
          },
        }));
        // Wait for the pause to happen; then hold briefly so the kid can
        // read the overlay.
        await replay.promise;
        if (sig.skipped) return;
        try { IceQ.Audio.savePling(); } catch (e) {}
        await IceQ.Path.wait(900);
      })();
    }

    // Replay the legal rush; freeze when puck crosses the blue line FIRST;
    // overlay "PLAY ON — CLEAN ENTRY" label. savePling.
    function playRightFalseCall(skipSignal) {
      const sig = skipSignal || { skipped: false };
      const p = currentPlay();
      return (async function () {
        if (sig.skipped) return;
        const crossRaw = findCrossingT(p, 'puck');
        const replay = trackHandle(replayRush(p, {
          skipSignal: sig,
          pauseAtRaw: crossRaw,
          onPause: function () {
            drawBlueLineHighlight('#3DB46A');
          },
        }));
        await replay.promise;
        if (sig.skipped) return;
        // Brief "PLAY ON" banner. Green = good (clean entry).
        await IceQ.Path.flashLabel(rink, {
          text: 'PLAY ON \u2014 CLEAN ENTRY',
          color: '#3DB46A', holdMs: 900, fontSize: 24,
          skipSignal: sig,
        });
        if (sig.skipped) return;
        try { IceQ.Audio.savePling(); } catch (e) {}
      })();
    }

    // ---- showContrastReplay: dispatches based on result.kind --------
    // The kid's result has four possible kinds:
    //   'good-call'  — they whistled an offside play. CORRECT. No contrast.
    //   'no-call'    — they let a legal play through. CORRECT. No contrast.
    //   'missed'     — they didn't whistle an offside play. WRONG. Show
    //                   the goal they gave up, then the correct whistle.
    //   'false-call' — they whistled a legal play. WRONG. Show the awkward
    //                   wave-off, then the correct "puck crossed first."
    //   'too-early'  — they whistled an offside play too early (before
    //                   the skate crossed). Treat like 'missed' but frame
    //                   as "right instinct, wrong timing." For now we fold
    //                   it into the missed-call contrast so the kid sees
    //                   WHEN to whistle.
    // Returns a promise that resolves when the contrast sequence finishes
    // (or when the kid skips, which the skipSignal carries through).
    function showContrastReplay(res, skipSignal) {
      const sig = skipSignal || { skipped: false };
      contrastHandles = [];
      if (!res) return Promise.resolve({ completed: true });

      if (res.kind === 'good-call' || res.kind === 'no-call') {
        // Correct — no contrast needed. Caller handles the success beat.
        try { IceQ.Audio.savePling(); } catch (e) {}
        return Promise.resolve({ completed: true });
      }

      const isMissed = (res.kind === 'missed');
      const isEarly = (res.kind === 'too-early');
      const isFalseCall = (res.kind === 'false-call');
      if (!isMissed && !isFalseCall && !isEarly) {
        // Unknown kind — bail safely.
        return Promise.resolve({ completed: true });
      }

      // Before running contrast, clear any verdict overlay so the
      // "OOF, WATCH THIS..." label lands on a clean canvas.
      overlayLayer.destroyChildren();
      overlayLayer.batchDraw();

      const ctx = {
        rink: rink,
        skipSignal: sig,
        wrongLabel: isMissed
          ? 'YOU LET IT THROUGH\u2026'
          : isEarly ? 'EARLY WHISTLE\u2026' : 'WAIT\u2014 PUCK HAD CROSSED\u2026',
        middleLabel: 'BUT INSTEAD\u2026',
        rightLabel: (isMissed || isEarly) ? "HERE'S THE WHISTLE" : "CLEAN ENTRY",
        playWrong: function () {
          return isMissed ? playWrongMissedCall(sig) : isEarly ? playWrongEarlyCall(sig) : playWrongFalseCall(sig);
        },
        // No positions to reset (linesman has no body on the ice) — but
        // we DO need to wipe overlays from the wrong replay before the
        // right replay starts. drawScene re-creates nodes at start
        // positions so the replay begins from scratch.
        resetPositions: function () {
          return (async function () {
            if (sig.skipped) return;
            overlayLayer.destroyChildren();
            overlayLayer.batchDraw();
            clearLoosePucks();
            // Re-position (not re-create) the existing nodes. replayRush
            // does this internally but we also want the in-between
            // "BUT INSTEAD..." frame to show players at the start, not
            // frozen at the net.
            const cp = currentPlay();
            if (carrierNode) carrierNode.position({
              x: toCanvasX(cp.carrier.startX),
              y: toCanvasY(cp.carrier.startY),
            });
            positionDefenders({ x: cp.carrier.startX, y: cp.carrier.startY });
            if (receiverNode) receiverNode.position({
              x: toCanvasX(cp.receiver.startX),
              y: toCanvasY(cp.receiver.startY),
            });
            if (receiver2Node && cp.receiver2) receiver2Node.position({
              x: toCanvasX(cp.receiver2.startX),
              y: toCanvasY(cp.receiver2.startY),
            });
            if (puckNode) {
              puckNode.position(puckCanvasAt({ x: cp.carrier.startX, y: cp.carrier.startY }));
              puckNode.visible(true);
            }
            gridLayer.batchDraw();
            await IceQ.Path.wait(150);
          })();
        },
        playRight: function () {
          return (isMissed || isEarly) ? playRightMissedCall(sig) : playRightFalseCall(sig);
        },
      };

      return IceQ.Path.showContrast(ctx).then(function (outcome) {
        contrastHandles = [];
        return outcome;
      });
    }

    // ---- check: read-only result accessor (matches other scenarios) --
    function check() {
      if (result) return result;
      // No play has run yet — return a not-played sentinel that the UI
      // can interpret as "hit Play first."
      return {
        correct: false, pass: false,
        kind: 'not-played',
        played: false, whistled: false, offside: null,
        verdict: '',
        message: 'Hit Play to start the rush.',
      };
    }

    // ---- reset ---------------------------------------------------------
    function reset() {
      if (animation) { animation.stop(); animation = null; }
      stopAllContrast();
      clearLoosePucks();
      isPlaying = false;
      playCompleted = false;
      whistled = false;
      result = null;
      overlayLayer.destroyChildren();
      overlayLayer.batchDraw();
      drawScene();
    }

    // ---- nextPlay ------------------------------------------------------
    // Advance through PLAYS in order: 6 basic first, then 4 advanced.
    // When the kid crosses the basic→advanced boundary for the first time,
    // fire a one-shot "ADVANCED RUSH — 3 SKATERS NOW" banner overlay so
    // the tier change is legible. Subsequent wraparounds don't re-fire it.
    function nextPlay() {
      stopAllContrast();
      const prevLevel = currentLevel();
      playIdx = (playIdx + 1) % PLAYS.length;
      const nowLevel = currentLevel();
      reset();
      // Announce tier advancement (basic → advanced) on the FIRST crossing
      // only. drawScene has already painted the new scene; we overlay the
      // announcement on top of it and auto-fade it after ~1.6s.
      if (prevLevel === 'basic' && nowLevel === 'advanced') {
        showTierAdvancementBanner();
      }
      return {
        rushIdx: playIdx,
        rush: currentPlay(),
        totalRushes: PLAYS.length,
        level: nowLevel,
        levelRushIdx: levelRushIdx(),
        levelTotalRushes: levelTotalRushes(),
      };
    }

    drawScene();

    return {
      rink,
      // New / spec-aligned API:
      check,
      showMe,
      reset,
      nextRush: nextPlay,
      // currentRushInfo keeps the existing rushIdx/totalRushes globals so
      // main.js's wireOffside counter (e.g. "(7/10)") keeps working. We
      // also expose level / levelRushIdx / levelTotalRushes for any UI
      // that wants to render "(1/4 Advanced)" style info without touching
      // main.js.
      currentRushInfo: () => ({
        rushIdx: playIdx,
        rush: currentPlay(),
        totalRushes: PLAYS.length,
        level: currentLevel(),
        levelRushIdx: levelRushIdx(),
        levelTotalRushes: levelTotalRushes(),
      }),
      isDone: () => result?.correct === true,
      // Back-compat API used by main.js wireOffside (DO NOT TOUCH OTHER FILES):
      startPlay,
      tapOffside,
      result: () => result,
      // v0.14 contrast replay API. The kid is the LINESMAN here, so the
      // contrast is purely a REPLAY of the same rush with the correct call
      // visualized — no tokens to move, just judgment to re-see.
      playWrongMissedCall: (skipSignal) => playWrongMissedCall(skipSignal),
      playWrongFalseCall: (skipSignal) => playWrongFalseCall(skipSignal),
      playRightMissedCall: (skipSignal) => playRightMissedCall(skipSignal),
      playRightFalseCall: (skipSignal) => playRightFalseCall(skipSignal),
      showContrastReplay: (res, skipSignal) => showContrastReplay(res, skipSignal),
      stopContrast: () => stopAllContrast(),
    };
  }

  // ----- Phrased feedback (coaching text from result) -------------------
  // For 3-skater plays, `res.offendingHint` (set on the play data — 'C',
  // 'LW', 'RW') lets us name the actual offender instead of the generic
  // "the receiver." If no hint, we fall back to "the receiver" / "a skate."
  function offenderPhrase(res, article) {
    // article: 'the' | 'a' | '' — caller controls the lead-in.
    if (!res) return article ? article + ' receiver' : 'receiver';
    const hint = res.offendingHint;
    if (!hint) return article ? article + ' receiver' : 'receiver';
    const roleMap = {
      C:  'center',
      LW: 'left-winger',
      RW: 'right-winger',
    };
    const label = roleMap[hint] || 'receiver';
    // For 3-skater "trailer" plays, phrase as "trailing center" / "trailing
    // left-winger" when hint is on a receiver2 (which by convention is the
    // later-joining skater). The result carries offendingRole = 'receiver2'
    // in those cases — use it.
    if (res.offendingRole === 'receiver2') return (article ? article + ' ' : '') + 'trailing ' + label;
    return (article ? article + ' ' : '') + label;
  }

  function phrasedFeedback(res) {
    if (!res || res.kind === 'not-played') {
      return 'Hit Play. Watch the BLUE LINE — tap OFFSIDE the moment a player has BOTH skates over it BEFORE the puck. If the puck crosses first, DON\'T tap.';
    }
    if (res.kind === 'good-call') {
      if (res.offendingHint) {
        return 'Good eye — ' + offenderPhrase(res, 'the') + ' was over the blue line before the puck. That\'s offside.';
      }
      return 'Good eye — both skates were over the blue line before the puck. That\'s offside.';
    }
    if (res.kind === 'no-call') {
      return 'Clean entry — patient read. Linesman skill.';
    }
    if (res.kind === 'missed') {
      if (res.offendingHint) {
        return 'You missed it — ' + offenderPhrase(res, 'the') + ' crossed before the puck. Watch ALL the skaters, not just the carrier.';
      }
      return 'You missed it — watch the SKATES, not the body. The moment both skates are over the line BEFORE the puck, blow the whistle.';
    }
    if (res.kind === 'false-call') {
      return 'Bad call — the puck crossed first, that was a clean entry. Patience: wait until a player is fully over the line early before you blow the whistle.';
    }
    if (res.kind === 'too-early') {
      return 'Too early — the receiver wasn\'t over the line yet. Wait until you actually SEE both skates cross before the puck.';
    }
    return '';
  }

  return { init, phrasedFeedback, PLAYS, buildHorizontalRink };
})();
