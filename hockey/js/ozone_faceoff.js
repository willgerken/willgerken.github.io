// Scenario: O-Zone Faceoff Plays (from the 10U team playbook — "Offensive Zone
// Faceoffs"). Three named set plays, defined by WHERE the shot comes from:
//   RED   = Center Shot       -> shot from the slot / center
//   BLACK = Wall Wing Shot/D  -> shot from the wall (strong/boards) side
//   GOLD  = Wing/D Shot       -> shot from the weak side (wing / D point)
//
// TWO modes share the same call<->location data (Will wanted both):
//   RUN IT   — the bench calls a color; the kid taps WHERE the shot comes from
//              (Slot / Wall / Weak-Side). Teaches "RED means slot."
//   NAME IT  — the play runs on screen; the kid taps the CALL (Red/Black/Gold).
//              The rapid-fire recall mini-game. Teaches "slot shot = RED."
//
// Both are 3-button taps (reliable, like Breakout Reads), just inverted prompt
// + button set. Faceoff at the right O-zone dot; we attack the bottom net.

window.IceQ = window.IceQ || {};

window.IceQ.OzoneFaceoff = (function () {
  const DOT = { x: 22, y: 44 };

  // Each play: call color, descriptive name, the location bucket (Run It answer),
  // the shooter spot, and the reveal path (draw -> shooter -> shot on net).
  // ---------------------------------------------------------------------
  // 2026-08-03 REBUILD. A coach panel found this module was not a legal
  // faceoff picture, and it had been sitting on a hero target the whole time.
  // What was wrong, all now fixed:
  //   * The two CENTERS were on the wrong sides of the dot. We attack the
  //     bottom net (y=64), so our own end is UP the screen — our centre lines
  //     up at the lower y, theirs at the higher. They were reversed.
  //   * Two of our skaters stood INSIDE the faceoff circle (r=15 from the dot).
  //     Only the two centres may be inside until the puck drops.
  //   * All three `shooter` spots were ghosts — no player stood at any of them,
  //     so the reveal drew a highlight ring around empty ice and fired a shot
  //     from nobody. Every shooter now IS a real player from ALIGN.
  //   * The whole opposition was one centre and a goalie. A faceoff set play is
  //     entirely about beating the other team's alignment; with nobody in the
  //     lanes every option looks free, which teaches a picture that has never
  //     existed in a game. Their wings and D are now on the ice.
  //   * Shot paths stopped at y=61-62 — a foot or two OUTSIDE the net — while
  //     firing a GOAL banner. They finish in the net now (goal line y=64).
  //
  // STILL PENDING COACH SIGN-OFF, and why this stays gated in scenarios.js:
  // the CALL->PLAY mapping (RED = centre shot, BLACK = wall, GOLD = weak side)
  // came off a phone photo of a playbook page, not from the coach who owns the
  // system. The alignment below is now legal hockey and the choreography is the
  // most standard reading of each call name — but "most standard" is not "what
  // this bench actually yells." A kid who runs the wrong BLACK in a game costs
  // a goal and blames himself, so this does not go live until Lee confirms it.
  const PLAYS = [
    {
      key: 'red', call: 'RED', name: 'Center Shot',
      location: 'slot', locLabel: 'Slot',
      // C wins it back to himself and steps into the slot.
      shooterFrom: 'our C',
      shooter: { x: 13, y: 47 },   // one stride off the dot into the slot
      path: [ [22, 44], [13, 47], [0, 66] ],
    },
    {
      key: 'black', call: 'BLACK', name: 'Wall Wing Shot / D',
      location: 'wall', locLabel: 'Wall',
      // Draw back to the wall winger on the boards at the hash marks.
      shooterFrom: 'our wall wing',
      shooter: { x: 37, y: 52 },
      path: [ [22, 44], [37, 52], [2, 66] ],
    },
    {
      key: 'gold', call: 'GOLD', name: 'Wing / D Shot',
      location: 'weak', locLabel: 'Weak side',
      // Draw back to the strong point, D-to-D above the circles (safe, never
      // across the slot), weak-side D shoots. Was a single 44 ft pass straight
      // off the draw, which no 10U centre makes.
      shooterFrom: 'our weak-side D',
      shooter: { x: -10, y: 16 },
      path: [ [22, 44], [27, 14], [-10, 16], [0, 66] ],
    },
  ];

  // Legal faceoff alignment. Only the two centres inside the circle (r=15).
  const ALIGN = [
    // --- us (attacking the bottom net) ---
    { x:  22, y: 41, color: 'spartan',  label: 'C' },   // our end is UP-screen
    { x:  37, y: 52, color: 'spartan',  label: '' },    // wall wing, on the boards
    { x:  10, y: 32, color: 'spartan',  label: '' },    // weak wing
    { x:  27, y: 14, color: 'spartan',  label: 'D' },   // strong-side point
    { x: -10, y: 16, color: 'spartan',  label: 'D' },   // weak-side point
    // --- them (defending the bottom net) ---
    { x:  22, y: 47, color: 'opponent', label: 'C' },
    { x:  36, y: 36, color: 'opponent', label: '' },    // their wall wing
    { x:   8, y: 52, color: 'opponent', label: '' },    // their weak wing
    { x:  26, y: 60, color: 'opponent', label: '' },    // their strong-side D
    { x:  -6, y: 56, color: 'opponent', label: '' },    // their weak-side D
  ];

  function init(rinkContainer) {
    const rink = IceQ.Rink.create(rinkContainer);
    const { toCanvasX, toCanvasY, scale, overlayLayer, gridLayer } = rink;

    let idx = 0;
    let sceneNodes = [];
    function cur() { return PLAYS[idx]; }

    function clearScene() {
      sceneNodes.forEach(n => { try { n.destroy(); } catch (e) {} });
      sceneNodes = [];
    }
    function clearOverlay() {
      overlayLayer.destroyChildren();
      overlayLayer.batchDraw();
    }

    function addPlayer(o) {
      const node = IceQ.Player.create({
        x: toCanvasX(o.x), y: toCanvasY(o.y),
        scale: Math.max(0.55, scale * (o.label ? 0.08 : 0.07)),
        color: o.color, label: o.label || '',
        stickSide: o.x >= 0 ? 'R' : 'L',
        kind: o.kind || 'skater',
      });
      gridLayer.add(node);
      sceneNodes.push(node);
    }

    function drawScene() {
      // Goalie in the crease (opponent) + alignment + puck on the dot.
      addPlayer({ x: 0, y: 62.5, color: 'opponent', kind: 'goalie' });
      ALIGN.forEach(addPlayer);
      const puck = new Konva.Circle({
        x: toCanvasX(DOT.x), y: toCanvasY(DOT.y),
        radius: Math.max(5, scale * 0.7),
        fill: '#0A0A0A', stroke: '#E0C68A', strokeWidth: 1.5,
        listening: false,
      });
      gridLayer.add(puck);
      sceneNodes.push(puck);
      gridLayer.batchDraw();
    }

    // Reveal the play: gold arrow draw->shooter->net. withLabel adds the call
    // name (used on a correct RUN IT answer / Show Me, NOT in NAME IT prompts
    // where the label would give away the answer).
    function revealPlay(withLabel) {
      clearOverlay();
      const p = cur();
      const pts = [];
      p.path.forEach(([x, y]) => { pts.push(toCanvasX(x), toCanvasY(y)); });
      const arrow = new Konva.Arrow({
        points: pts,
        stroke: '#E0C68A', fill: '#E0C68A',
        strokeWidth: 3, pointerLength: 11, pointerWidth: 11,
        lineJoin: 'round', tension: 0.25, opacity: 0, listening: false,
      });
      overlayLayer.add(arrow);
      arrow.to({ opacity: 0.95, duration: 0.3 });
      // Shooter highlight ring
      const ring = new Konva.Circle({
        x: toCanvasX(p.shooter.x), y: toCanvasY(p.shooter.y),
        radius: 7 * scale,
        stroke: '#E0C68A', strokeWidth: 2.5, dash: [5, 4], opacity: 0, listening: false,
      });
      overlayLayer.add(ring);
      ring.to({ opacity: 0.9, duration: 0.3 });
      if (withLabel) {
        const lbl = new Konva.Text({
          x: toCanvasX(p.shooter.x) - 70, y: toCanvasY(p.shooter.y) - 26,
          width: 140, align: 'center',
          text: `${p.call} — ${p.name}`,
          fontSize: 12, fontStyle: '900', fill: '#E0C68A',
          stroke: '#1A1F2E', strokeWidth: 0.6, opacity: 0, listening: false,
        });
        overlayLayer.add(lbl);
        lbl.to({ opacity: 1, duration: 0.3 });
      }
      overlayLayer.batchDraw();
    }

    function chooseLocation(loc) {
      const p = cur();
      return { correct: loc === p.location, mode: 'run', chosen: loc,
               call: p.call, name: p.name, location: p.location, locLabel: p.locLabel };
    }
    function chooseCall(call) {
      const p = cur();
      return { correct: call === p.key, mode: 'name', chosen: call,
               call: p.call, name: p.name, location: p.location, locLabel: p.locLabel };
    }

    drawScene();

    return {
      rink,
      callLabel: () => cur().call,
      revealPlay,
      chooseLocation,
      chooseCall,
      reset: () => { clearOverlay(); },
      nextRush: () => {
        idx = (idx + 1) % PLAYS.length;
        clearScene(); clearOverlay(); drawScene();
        return { rushIdx: idx, rush: cur(), totalRushes: PLAYS.length };
      },
      currentRushInfo: () => ({ rushIdx: idx, rush: cur(), totalRushes: PLAYS.length }),
      isDone: () => false,
    };
  }

  function phrasedFeedback(res) {
    if (res.correct) {
      if (res.mode === 'run') {
        return `${res.call} is the ${res.name} — shot comes from the ${res.locLabel.toLowerCase()}. Right read.`;
      }
      return `Yes — shot from the ${res.locLabel.toLowerCase()} is our ${res.call} (${res.name}).`;
    }
    if (res.mode === 'run') {
      return `Not the ${({slot:'slot',wall:'wall',weak:'weak side'})[res.chosen] || res.chosen} on ${res.call}. Picture the play — where does ${res.call} put the shot? Try again.`;
    }
    return `That's not ${(res.chosen || '').toUpperCase()}. Look where the shot came from, then match it to the call. Try again.`;
  }

  // ALIGN and DOT are exported so tools/hockey_lint.js can actually check the
  // faceoff alignment. They weren't, so the alignment and ghost-shooter rules
  // were silently running against `undefined` and reporting a clean pass.
  // A validator that can't see the data always says everything is fine.
  return { init, phrasedFeedback, PLAYS, ALIGN, DOT };
})();
