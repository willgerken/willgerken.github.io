// Router + scenario dispatcher.
// Routes:
//   (empty) or #/ or #/home   -> home page
//   #/house                    -> House scenario
//   #/defensive-side           -> Defensive Side scenario
//   #/done/<key>               -> home page with knock-off animation

(function () {
  const APP = document.getElementById('app-root');
  const HEADER_TITLE = document.getElementById('current-title');
  const BTN_HOME = document.getElementById('btn-home');
  const BTN_MUTE = document.getElementById('btn-mute');

  // Wire mute toggle (audio module persists state to localStorage)
  if (BTN_MUTE && window.IceQ && window.IceQ.Audio) {
    function refreshMuteUI() {
      BTN_MUTE.classList.toggle('is-muted', IceQ.Audio.isMuted());
    }
    refreshMuteUI();
    BTN_MUTE.addEventListener('click', () => {
      IceQ.Audio.toggleMuted();
      refreshMuteUI();
    });
  }

  // Stats cache for Why dialog
  let statsPromise = null;
  function loadStats() {
    if (!statsPromise) {
      statsPromise = fetch('assets/house-stats.json').then(r => r.ok ? r.json() : null).catch(() => null);
    }
    return statsPromise;
  }

  // Coach Talk quotes (option B — conditional, with reinforcing stat)
  const COACH_TALK = {
    'house': [
      {
        quote: "Boring defense is great defense. Look bored. Be elite.",
        attr: "— Karl Alzner",
        stat: (s) => s ? `About ${Math.round(s.pct.pct_of_goals_in_house)}% of NHL goals come from the house. Live there, and you live in the game.` : '',
      },
      {
        quote: "Hockey sharks hang where the fish are. Goals live at the net-front.",
        attr: "— Mike Knuble",
        stat: (s) => s ? `The house is ${Math.round(s.pct.sh_pct_in_house / s.pct.sh_pct_out_house)}× more dangerous than the perimeter. ${s.pct.sh_pct_in_house.toFixed(1)}% vs ${s.pct.sh_pct_out_house.toFixed(1)}% shooting.` : '',
      },
      {
        quote: "Protect the blue-line battle zone like your life depends on it.",
        attr: "— Karl Alzner (paraphrased)",
        stat: () => "The five feet on each side of the blue line decide most games.",
      },
    ],
    'defensive-side': [
      {
        quote: "Feel your check. Watch the puck with your eyes. Know your man with your stick.",
        attr: "— Quinn Hughes (Arsenal)",
        stat: () => "Good defense is positional. Great defense is positional + present. Your stick tells you where your man is so your eyes stay on the play.",
      },
      {
        quote: "The best defense is never letting them get the puck there in the first place.",
        attr: "— Hockey Think Tank",
        stat: (s) => s ? `When opponents do get in the house, they score ${s.pct.sh_pct_in_house.toFixed(1)}% of the time. That's why you want to be between them and the net — every time.` : '',
      },
    ],
    'forecheck': [
      {
        quote: "Sometimes the smartest forecheck has Hawk standing still at the blue line. You want him as the OUTLET when you strip the puck — not crowding the corner.",
        attr: "— Hockey's Arsenal (paraphrased)",
        stat: () => "Cheetah pressures. Gator supports. Hawk waits high. If all three pile on the puck, you have no outlet — and a clean breakout against you.",
      },
      {
        quote: "F1, F2, F3 are jobs that rotate. Whoever's closest to the puck is F1 — even if she was the high forward two seconds ago.",
        attr: "— Hockey Think Tank",
        stat: () => "The roles emerge from where you ARE, not from a coach's pre-game whiteboard.",
      },
    ],
    'lane-coverage': [
      {
        quote: "Lane integrity is the simplest defensive concept — and the hardest to get 10U kids to actually do.",
        attr: "— Hockey Think Tank (paraphrased)",
        stat: () => "Once your team holds lanes on the backcheck, breakouts against you stop being free goals.",
      },
      {
        quote: "Every wing has a side. Every center has the middle. Don't trade lanes mid-rush.",
        attr: "— USA Hockey ADM",
        stat: () => "When everyone chases the puck, you give up the cross-ice seam — and that's where the goals come from.",
      },
    ],
    'breakout': [
      {
        quote: "Win the breakout, win the game. Most goals against come from broken breakouts that leak into odd-man rushes.",
        attr: "— Karl Alzner (paraphrased)",
        stat: () => "Three options is the magic number. Forecheck takes away one or two — never all three.",
      },
      {
        quote: "Wall, curl, stretch. If your D has all three, the forecheck has a problem.",
        attr: "— USA Hockey ADM",
        stat: () => "Stretch passes don't always connect — but the THREAT of one pulls forecheckers high and opens the wall.",
      },
    ],
    'net-front': [
      {
        quote: "The net front is the hardest D-zone position. Two right techniques. You have to read the puck.",
        attr: "— Hockey's Arsenal",
        stat: () => "Box out for shots. Front for passes. Wrong call = the goalie pays the price.",
      },
    ],
    'two-on-one': [
      {
        quote: "On a 2-on-1, the D plays the pass and the goalie plays the shot. The hardest part is trusting your goalie.",
        attr: "— USA Hockey ADM",
        stat: () => "Take away the pass and the shooter has to beat your goalie clean, which he mostly won't. Patience wins 2-on-1s.",
      },
    ],
    'offside': [
      {
        quote: "Watch the skates, not the body. Both skates over the line before the puck: that is the whole rule.",
        attr: "— Every linesman ever",
        stat: () => "Every offside whistle hands the puck back. Read the blue line and you keep the attack alive.",
      },
    ],
    'cover-the-man': [
      {
        quote: "Boring defense is great defense. Look bored. Be elite.",
        attr: "— Karl Alzner (OKPH)",
        stat: (s) => s ? `Stick-on-stick is how you take away the cross-ice pass — the play that scores ${s.pct.sh_pct_in_house.toFixed(1)}% of the time when the receiver gets it in the house.` : '',
      },
      {
        quote: "Goals come from passes, not from puck carriers. Cover the receiver — kill the play.",
        attr: "— USA Hockey ADM (paraphrased)",
        stat: () => "If you chase the puck into the corner, the slot man is wide open for the cross-ice. Stay home.",
      },
    ],
    'dzone-coverage': [
      {
        quote: "Boring defense is great defense. If you're diving and scrambling, you're out of position. If you're just there — that's elite.",
        attr: "— Karl Alzner (OKPH)",
        stat: () => "Man-to-man in your zone: cover YOUR guy, and only one D ever leaves the Danger Zone. The Centre never does.",
      },
      {
        quote: "Drop everything to protect the Danger Zone. Wingers stay on the point — help low only if you're SURE you can get back.",
        attr: "— Our team playbook",
        stat: (s) => s ? `The middle is where it's scored — about ${Math.round(s.pct.pct_of_goals_in_house)}% of goals come from the house. Protect it.` : "The middle is where goals come from. Protect it.",
      },
    ],
    'breakout-reads': [
      {
        quote: "A breakout isn't a routine you memorize — it's a read. The forecheck tells you which one to run. Your job is to see it before the puck's on your stick.",
        attr: "— Our team playbook",
        stat: () => "Four breakouts — D-Wheel, D-to-D, Reverse, Weak-Side Rim. The forecheck can take ONE away. Read it and pick another.",
      },
      {
        quote: "Make smart, simple first passes. Don't force the puck into pressure — go where they aren't. Win the breakout, win the game.",
        attr: "— Our team playbook",
        stat: () => "Run the wrong breakout INTO the pressure and it's a turnover for an odd-man rush the other way. The read is the whole skill.",
      },
    ],
    'ozone-entry': [
      {
        quote: "When our guy takes it wide, the second forward drives the MIDDLE. Don't follow the puck — two of you in one lane means one defender covers you both.",
        attr: "— Coach, video session",
        stat: () => "Three lanes, three attackers. The middle lane is the one that scores — drive it every rush.",
      },
      {
        quote: "The weak-side D joining the rush is our 4th attacker. But look before you go: if you're the last man back, you stay.",
        attr: "— Coach, video session",
        stat: () => "4 attackers vs 2 defenders is free offense. 3 attackers and a breakaway the other way is not. It's a read.",
      },
    ],
    'ozone-faceoff': [
      {
        quote: "On an O-zone faceoff you can't be THINKING when the bench yells the call — you have to already know where the shot's going. That half-second is the whole play.",
        attr: "— Our team playbook",
        stat: () => "RED = slot. BLACK = wall. GOLD = weak side. Hear it, know it, go.",
      },
      {
        quote: "Winning the draw isn't just the center's job. Every player has a spot — get there the second the puck drops.",
        attr: "— Our team playbook",
        stat: () => "Drill it both ways: hear the call → know the shot, and see the shot → name the call.",
      },
    ],
  };

  function pickCoachTalk(scenarioKey) {
    const list = COACH_TALK[scenarioKey] || [];
    if (!list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  // ===== VIEW RENDERING ====================================================

  // Tear down every Konva stage that lives inside #app before we wipe the DOM.
  // Without this (2026-08-18 audit) each visit leaked a stage + 3 canvases, and
  // any Konva.Animation still running (a paused offside replay, a contrast
  // mid-flight) kept redrawing a detached canvas at 60 fps for the rest of the
  // session. Home draws no Konva, so "every stage in the document" is safe.
  function teardownStages() {
    try {
      const stages = (window.Konva && Konva.stages) ? Konva.stages.slice() : [];
      stages.forEach((stage) => {
        try {
          // Stop animations/tweens bound to this stage's layers first, so they
          // release their references and stop ticking.
          const anims = (Konva.Animation && Konva.Animation.animations) ? Konva.Animation.animations.slice() : [];
          anims.forEach((a) => {
            const layers = a.layers || [];
            const onThisStage = layers.some((l) => l && l.getStage && l.getStage() === stage);
            if (onThisStage || layers.length === 0) { try { a.stop(); } catch (e) {} }
          });
          stage.destroy();
        } catch (e) { /* best effort */ }
      });
    } catch (e) { /* best effort */ }
  }

  function clearApp() {
    teardownStages();
    APP.innerHTML = '';
    APP.className = 'app';
  }

  function renderHome({ justCompleted } = {}) {
    clearApp();
    HEADER_TITLE.textContent = 'Home';
    IceQ.Home.renderHome(APP, { justCompleted });
  }

  function renderScenario(key) {
    const scen = IceQ.scenarioByKey(key);
    if (!scen || !scen.available) {
      location.hash = '#/';
      return;
    }
    clearApp();
    HEADER_TITLE.textContent = scen.title.toUpperCase();

    // Mount template
    const tpl = document.getElementById(`tpl-${key}`);
    if (!tpl) {
      APP.innerHTML = `<p style="padding:20px;color:#aaa;">Scenario "${key}" is coming soon.</p>`;
      return;
    }
    APP.appendChild(tpl.content.cloneNode(true));

    if (key === 'house') wireHouse();
    else if (key === 'defensive-side') wireDefensiveSide();
    else if (key === 'forecheck') wireForecheck();
    else if (key === 'lane-coverage') wireLaneCoverage();
    else if (key === 'breakout') wireBreakout();
    else if (key === 'cover-the-man') wireCoverTheMan();
    else if (key === 'net-front') wireNetFront();
    else if (key === 'two-on-one') wireTwoOnOne();
    else if (key === 'offside') wireOffside();
    else if (key === 'dzone-coverage') wireDZoneCoverage();
    else if (key === 'breakout-reads') wireBreakoutReads();
    else if (key === 'ozone-faceoff') wireOzoneFaceoff();
    else if (key === 'ozone-entry') wireOzoneEntry();
  }

  // ===== SHOW-ME CREDIT GUARD (shared) =====================================
  // Show Me (and the right-way replay) glide the kid's sprite onto the answer,
  // and Check just reads position — so before 2026-08-18 "Show Me, then Check"
  // was full credit in every drag game (O-Zone Entry even paid the Quick-read
  // bonus for it). This guard remembers that the current position was
  // DEMONSTRATED, not placed. Cleared when the kid actually drags (any node on
  // the stage, Konva bubbles dragstart), or on Reset / Next.
  //   guard.mark()   after Show Me or a right-way replay parks the sprite
  //   guard.clear()  on Reset / Next rush
  //   guard.stale()  true => refuse credit, tell the kid to place it himself
  const DEMO_MSG = 'That was Show Me’s answer, not yours. Hit Reset, then drag YOU there yourself.';
  function makeDemoGuard(m, { clearOnDrag = true } = {}) {
    let demonstrated = false;
    try {
      if (clearOnDrag && m && m.rink && m.rink.stage) {
        m.rink.stage.on('dragstart.demoguard', () => { demonstrated = false; });
      }
    } catch (e) { /* stage may not exist in a test harness */ }
    return {
      mark: () => { demonstrated = true; },
      clear: () => { demonstrated = false; },
      stale: () => demonstrated,
    };
  }

  // ===== O-ZONE ENTRY SCENARIO WIRING =====================================
  // Combines the two patterns that already work: the teach-first Watch
  // walkthrough from Breakout Reads (intro -> demo -> test) in front of the
  // drag/Check mechanic from D-Zone Coverage, plus a contrast replay on a
  // wrong answer (your way -> it dies -> BUT INSTEAD -> goal). Wrong answers
  // earn NO credit — the kid re-reads it to advance.
  function wireOzoneEntry() {
    const m = IceQ.OzoneEntry.init(APP.querySelector('#rink'));
    const PLAYS = IceQ.OzoneEntry.PLAYS;
    const fb = APP.querySelector('#feedback');
    const fbMsg = APP.querySelector('#feedback-message');
    const cueEl = APP.querySelector('#read-cue');
    const demoControls = APP.querySelector('#oe-demo-controls');
    const testControls = APP.querySelector('#oe-test-controls');
    const btnWatch = APP.querySelector('#btn-watch');
    const btnSkipDemo = APP.querySelector('#btn-skip-demo');
    const btnReplayDemo = APP.querySelector('#btn-replay-demo');
    const btnCheck = APP.querySelector('#btn-check');
    const btnShow = APP.querySelector('#btn-show');
    const btnReset = APP.querySelector('#btn-reset');
    const btnWhy = APP.querySelector('#btn-why');
    const btnSkip = APP.querySelector('#btn-skip');
    const btnDone = APP.querySelector('#btn-done');
    const btnRotate = APP.querySelector('#btn-rotate');
    const rushProg = APP.querySelector('#rush-progress');
    const showFb = (msg) => { fbMsg.textContent = msg; fb.hidden = false; };
    const hideFb = () => { fb.hidden = true; fbMsg.textContent = ''; };
    const setNarration = (txt) => { if (cueEl) cueEl.textContent = txt; };

    const rushMeter = APP.querySelector('#oe-rush-meter');
    const rushFill = APP.querySelector('#oe-rush-fill');
    const rushLabel = APP.querySelector('#oe-rush-label');

    let playsCompleted = new Set();
    const totalPlays = m.currentRushInfo().totalRushes;
    let demoRunning = false;
    let demoSkipRequested = false;
    let replayInFlight = false;
    let skipSignal = { skipped: false };
    // Roles whose contrast replay the kid has already sat through once. Reads 1
    // and 2 punish the same mistake; making him watch the full replay twice is
    // where the playtester started tapping to skip. Second time = quick reveal.
    let contrastSeenForRole = new Set();

    // ----- soft rush pressure ---------------------------------------------
    // Drains over RUSH_MS. Beating it earns a callout; missing it costs nothing
    // at all — no lockout, no wrong answer, no scolding. See .rush-meter in CSS
    // for why it's built as a carrot.
    const RUSH_MS = 5000;
    let readStartedAt = 0;

    function startRushMeter() {
      if (!rushMeter || !rushFill) return;
      readStartedAt = Date.now();
      rushMeter.hidden = false;
      rushMeter.classList.remove('is-spent');
      if (rushLabel) rushLabel.textContent = 'read it';
      rushFill.style.transition = 'none';
      rushFill.style.width = '100%';
      // Force a reflow so the width reset lands before the drain transition.
      void rushFill.offsetWidth;
      rushFill.style.transition = `width ${RUSH_MS}ms linear`;
      rushFill.style.width = '0%';
    }

    function stopRushMeter() {
      if (!rushMeter || !rushFill) return;
      // Freeze wherever it got to, then grey it out.
      const w = rushFill.getBoundingClientRect().width;
      rushFill.style.transition = 'none';
      rushFill.style.width = `${w}px`;
      rushMeter.classList.add('is-spent');
      if (rushLabel) rushLabel.textContent = '';
    }

    function hideRushMeter() {
      if (rushMeter) rushMeter.hidden = true;
    }

    function wasQuickRead() {
      return readStartedAt > 0 && (Date.now() - readStartedAt) <= RUSH_MS;
    }

    function updateProg() {
      const info = m.currentRushInfo();
      if (rushProg) rushProg.textContent = `(${info.rushIdx + 1}/${info.totalRushes})`;
    }

    // During a contrast replay the kid shouldn't be able to drag-and-check
    // mid-animation — swap the test controls for a single Skip.
    function setChromeDuringContrast(on) {
      if (testControls) testControls.hidden = on;
      if (btnSkip) btnSkip.hidden = !on;
      if (on) { btnRotate.hidden = true; btnWhy.hidden = true; btnDone.hidden = true; }
    }

    function setMode(mode) {
      if (demoControls) demoControls.hidden = (mode === 'test');
      if (testControls) testControls.hidden = (mode !== 'test');
      if (mode === 'intro') {
        hideFb();
        btnWhy.hidden = true; btnDone.hidden = true; btnRotate.hidden = true;
        if (btnSkip) btnSkip.hidden = true;
        if (btnWatch) btnWatch.hidden = false;
        if (btnSkipDemo) btnSkipDemo.hidden = false;
        hideRushMeter();
        setNarration('First, watch all four reads — then you make them.');
      } else if (mode === 'demo') {
        if (btnWatch) btnWatch.hidden = true;   // playing — hide Watch, keep Skip
        hideRushMeter();
      } else if (mode === 'test') {
        updateProg();
        setNarration(m.cue());
        startRushMeter();
      }
    }

    async function runDemo() {
      if (demoRunning) return;
      demoRunning = true; demoSkipRequested = false;
      setMode('demo');
      // A failure while DEMONSTRATING must never cost the kid the game itself.
      // The walkthrough is the optional part; the test is the product. Any
      // render error here drops him into the test instead of stranding him on
      // a half-wired screen with dead buttons.
      try {
        for (let i = 0; i < PLAYS.length; i++) {
          if (demoSkipRequested) break;
          m.goToRead(i);
          setNarration(PLAYS[i].teach);
          await m.playReveal();
          if (demoSkipRequested) break;
          await IceQ.Path.wait(420);
        }
      } catch (err) {
        if (window.console) console.error('ozone-entry demo failed, falling through to the test:', err);
      }
      // Seen it = seen it, even if they bailed halfway. The point is that the
      // walkthrough is shown ONCE without asking; nagging a kid who already
      // watched it is how you train him to reflex-skip everything.
      try { IceQ.Progress.markDemoSeen('ozone-entry'); } catch (e) {}
      demoRunning = false;
      m.goToRead(0);
      setMode('test');
      if (btnReplayDemo) btnReplayDemo.hidden = false;
    }

    if (btnWatch) btnWatch.addEventListener('click', () => { runDemo(); });
    if (btnSkipDemo) btnSkipDemo.addEventListener('click', () => {
      if (demoRunning) { demoSkipRequested = true; }   // skip mid-walkthrough
      else {                                            // skip straight from intro
        try { IceQ.Progress.markDemoSeen('ozone-entry'); } catch (e) {}
        m.goToRead(0); setMode('test');
      }
    });

    const guard = makeDemoGuard(m);

    btnCheck.addEventListener('click', async () => {
      if (replayInFlight) return;
      const r = m.check();
      const info = m.currentRushInfo();
      const quick = wasQuickRead();
      const msg = IceQ.OzoneEntry.phrasedFeedback(r);
      stopRushMeter();

      if (r.cover && guard.stale()) { showFb(DEMO_MSG); return; }
      if (r.cover) {
        try { IceQ.Audio && IceQ.Audio.savePling(); } catch {}
        try { IceQ.Path.celebrate(m.rink); } catch (e) {}
        playsCompleted.add(info.rushIdx);
        // Beating the meter is a bonus callout only — a slow right answer is
        // still a right answer and still advances.
        let full = quick ? `⚡ Quick read — that's game speed. ${msg}` : msg;
        if (playsCompleted.size < totalPlays) {
          full += ' Tap "Try the next read".';
          btnRotate.hidden = false;
        } else {
          btnDone.hidden = false;
        }
        showFb(full);
        btnWhy.hidden = false;
        return;
      }

      // Wrong. First time you make this KIND of mistake, watch it play out.
      // Every time after, you get the answer straight — you already sat through
      // the lesson once and the repeat is just dead time.
      try { IceQ.Audio && IceQ.Audio.wrongThunk && IceQ.Audio.wrongThunk(); } catch (e) {}
      if (contrastSeenForRole.has(r.role)) {
        showFb(`${msg} You've seen this read before, so here's the answer. Hit Reset and put it there yourself.`);
        m.showMe();
        guard.mark();
        btnWhy.hidden = false;
        if (playsCompleted.size < totalPlays) btnRotate.hidden = false;
        else btnDone.hidden = false;
        return;
      }

      contrastSeenForRole.add(r.role);
      showFb(msg);
      replayInFlight = true;
      skipSignal = { skipped: false };
      setChromeDuringContrast(true);
      try {
        await m.showContrastReplay(skipSignal);
      } catch (err) {
        if (window.console) console.error('ozone-entry contrast replay failed:', err);
      } finally {
        replayInFlight = false;
        setChromeDuringContrast(false);
        m.reset();
        guard.clear();
        if (playsCompleted.size < totalPlays) btnRotate.hidden = false;
        else btnDone.hidden = false;
        btnWhy.hidden = false;
      }
    });

    if (btnSkip) btnSkip.addEventListener('click', () => { skipSignal.skipped = true; });
    if (btnReplayDemo) btnReplayDemo.addEventListener('click', () => {
      btnReplayDemo.hidden = true;
      hideFb(); btnRotate.hidden = true; btnWhy.hidden = true; btnDone.hidden = true;
      runDemo().then(() => { btnReplayDemo.hidden = false; });
    });

    btnShow.addEventListener('click', () => {
      m.showMe();
      guard.mark();
      showFb('Gold = where you should end up. Red = the lane that kills the play. Hit Reset and try it yourself. Show Me gives no credit.');
      btnWhy.hidden = false;
    });
    btnReset.addEventListener('click', () => {
      skipSignal.skipped = true;
      m.reset(); hideFb();
      guard.clear();
      const info = m.currentRushInfo();
      // Reset must not hide the way forward for a read the kid already earned.
      const earned = playsCompleted.has(info.rushIdx);
      btnWhy.hidden = true;
      btnDone.hidden = !(earned && playsCompleted.size >= totalPlays);
      btnRotate.hidden = !(earned && playsCompleted.size < totalPlays);
      startRushMeter();
    });
    btnRotate.addEventListener('click', () => {
      m.nextRush(); updateProg();
      setNarration(m.cue());
      hideFb();
      guard.clear();
      btnRotate.hidden = true; btnWhy.hidden = true;
      startRushMeter();          // fresh read, fresh clock
    });
    btnWhy.addEventListener('click', () => openWhy('ozone-entry'));
    btnDone.addEventListener('click', () => onDone('ozone-entry'));

    // First visit: the pattern walkthrough just RUNS. No "would you like to
    // watch" — offering it is what got it skipped every single time in
    // playtesting. Every visit after: straight into the test, with "Watch the
    // patterns again" sitting there if he wants it. Nobody skips something
    // that's already playing, and nobody wants it twice.
    if (IceQ.Progress.demoSeen('ozone-entry')) {
      m.goToRead(0);
      setMode('test');
      if (btnReplayDemo) btnReplayDemo.hidden = false;
    } else {
      setMode('intro');
      setNarration('Watch how each read works — then you make them.');
      setTimeout(() => { if (!demoRunning) runDemo(); }, 550);
    }
  }

  function wireNetFront() {
    const m = IceQ.NetFront.init(APP.querySelector('#rink'));
    const fb = APP.querySelector('#feedback');
    const fbMsg = APP.querySelector('#feedback-message');
    const btnCheck = APP.querySelector('#btn-check');
    const btnShow = APP.querySelector('#btn-show');
    const btnReset = APP.querySelector('#btn-reset');
    const btnWhy = APP.querySelector('#btn-why');
    const btnDone = APP.querySelector('#btn-done');
    const btnRotate = APP.querySelector('#btn-rotate');
    const btnSkip = APP.querySelector('#btn-skip');
    const rushProg = APP.querySelector('#rush-progress');
    const showFb = (s) => { fbMsg.textContent = s; fb.hidden = false; };

    let setupsCompleted = new Set();
    // Shared signal object the running contrast replay polls between phases.
    // Swap the whole object (not just the flag) at replay START so stale
    // references from prior runs can't silently skip a fresh replay.
    let skipSignal = { skipped: false };
    // Guard so double-clicks on Check can't kick off overlapping replays.
    let replayInFlight = false;

    const updateProg = () => {
      const info = m.currentRushInfo();
      if (rushProg) rushProg.textContent = `(${info.rushIdx + 1}/${info.totalRushes})`;
    };
    updateProg();

    function hideReplayControls() {
      if (btnSkip) btnSkip.hidden = true;
    }
    function lockButtonsDuringReplay(locked) {
      btnCheck.disabled = locked;
      btnShow.disabled = locked;
      btnReset.disabled = locked;
    }

    btnCheck.addEventListener('click', async () => {
      if (replayInFlight) return;
      const r = m.check();
      const info = m.currentRushInfo();
      let msg = IceQ.NetFront.phrasedFeedback(r);
      if (r.pass) {
        setupsCompleted.add(info.rushIdx);
        if (setupsCompleted.size < info.totalRushes) {
          msg += ' Tap "Try the next puck spot" — same idea, different threat.';
          btnRotate.hidden = false;
        } else {
          btnDone.hidden = false;
        }
        showFb(msg);
        btnWhy.hidden = false;
        return;
      }
      // ---- WRONG ANSWER ----
      // Severity ladder (v0.13 pedagogy):
      //   * dist > 18 ft (existing "too far away" threshold) → FULL contrast:
      //     wrong play animates to a goal-against, then BUT INSTEAD, then the
      //     right play animates to a save/interception. Kid who put the
      //     defender nowhere near the play gets the full "see the cost" beat.
      //   * tol < dist <= 18 ft → close miss. Skip the bad-outcome goal
      //     animation and just show the right answer. Corrective, not
      //     punitive. "You were close — here's what THIS threat actually
      //     wanted from you."
      // No credit either way. Kid can rotate to the next setup or hit Reset
      // to retry the current one.
      showFb(msg);
      btnWhy.hidden = false;
      replayInFlight = true;
      lockButtonsDuringReplay(true);
      // Fresh signal per replay — stale references can't corrupt this run.
      skipSignal = { skipped: false };
      if (btnSkip) btnSkip.hidden = false;

      try {
        if (r.dist > 18) {
          await m.showContrastReplay({ skipSignal: skipSignal });
        } else {
          // Close miss: one short animation. Keep skip visible so kid can bail.
          await m.playRightAnswer();
        }
      } catch (e) {
        // Don't let a stray animation crash strand the UI.
        if (window.console) console.error('net-front contrast replay failed:', e);
      } finally {
        replayInFlight = false;
        lockButtonsDuringReplay(false);
        hideReplayControls();
      }

      // Post-contrast: offer rotate (next setup) if any remain. No credit
      // toward setupsCompleted; kid must pass a setup on their own to
      // unlock Done.
      const postInfo = m.currentRushInfo();
      if (postInfo.rushIdx + 1 < postInfo.totalRushes) {
        btnRotate.hidden = false;
      }
    });
    btnShow.addEventListener('click', () => {
      if (replayInFlight) return;
      m.showMe();
      showFb('Gold zone shows where to stand for THIS threat. Hit Reset and try.');
      btnWhy.hidden = false;
    });
    btnReset.addEventListener('click', () => {
      // Signal any in-flight replay to bail so we don't leak animations.
      skipSignal.skipped = true;
      m.reset(); fb.hidden = true;
      btnWhy.hidden = true; btnDone.hidden = true; btnRotate.hidden = true;
      hideReplayControls();
    });
    btnRotate.addEventListener('click', () => {
      skipSignal.skipped = true;
      m.nextRush(); updateProg();
      const info = m.currentRushInfo();
      showFb(`Now: ${info.rush.label}.`);
      btnRotate.hidden = true;
      hideReplayControls();
    });
    if (btnSkip) {
      btnSkip.addEventListener('click', () => {
        // Flag the running replay to bail at its next phase boundary. The
        // finally block in the Check handler re-enables controls and hides
        // the skip button once the replay promise resolves.
        skipSignal.skipped = true;
        btnSkip.hidden = true;
        // Defensive: force UI recovery within 1s if the await chain hangs
        setTimeout(() => {
          if (replayInFlight) {
            replayInFlight = false;
            btnCheck.disabled = false;
            btnShow.disabled = false;
            btnReset.disabled = false;
            btnRotate.hidden = false;
            btnWhy.hidden = false;
          }
        }, 1000);
      });
    }
    btnWhy.addEventListener('click', () => openWhy('net-front'));
    btnDone.addEventListener('click', () => onDone('net-front'));
  }

  function wireTwoOnOne() {
    const m = IceQ.TwoOnOne.init(APP.querySelector('#rink'));
    const fb = APP.querySelector('#feedback');
    const fbMsg = APP.querySelector('#feedback-message');
    const btnCheck = APP.querySelector('#btn-check');
    const btnShow = APP.querySelector('#btn-show');
    const btnReset = APP.querySelector('#btn-reset');
    const btnWhy = APP.querySelector('#btn-why');
    const btnDone = APP.querySelector('#btn-done');
    const btnRotate = APP.querySelector('#btn-rotate');
    const btnSkip = APP.querySelector('#btn-skip');
    const rushProg = APP.querySelector('#rush-progress');
    const showFb = (s) => { fbMsg.textContent = s; fb.hidden = false; };

    let rushesCompleted = new Set();
    const guard = makeDemoGuard(m);
    const updateProg = () => {
      const info = m.currentRushInfo();
      if (rushProg) rushProg.textContent = `(${info.rushIdx + 1}/${info.totalRushes})`;
    };
    updateProg();
    // Show the way forward for a rush the kid has already earned (Reset and a
    // late wrong answer must not hide Done / Next).
    const showEarnedChrome = () => {
      const info = m.currentRushInfo();
      const earned = rushesCompleted.has(info.rushIdx);
      if (rushesCompleted.size >= info.totalRushes) btnDone.hidden = false;
      else if (earned) btnRotate.hidden = false;
    };

    // v0.13 contrast state. skipSignal is shared across one contrast run so
    // any mid-playback Skip click propagates into the orchestrator. playing
    // guards Check against re-entry while an animation is already running.
    let skipSignal = { skipped: false };
    let playing = false;

    function setButtonsForContrast(on) {
      // During contrast playback: hide the normal controls and expose Skip.
      // Check is disabled so the kid can't retrigger mid-animation.
      if (on) {
        btnCheck.disabled = true;
        btnShow.disabled = true;
        btnReset.disabled = true;
        btnRotate.hidden = true;
        btnDone.hidden = true;
        btnWhy.hidden = true;
        btnSkip.hidden = false;
      } else {
        btnCheck.disabled = false;
        btnShow.disabled = false;
        btnReset.disabled = false;
        btnSkip.hidden = true;
      }
    }

    async function runContrast() {
      skipSignal = { skipped: false };
      playing = true;
      setButtonsForContrast(true);
      try {
        await m.showContrastReplay(skipSignal);
      } finally {
        playing = false;
        setButtonsForContrast(false);
        // The replay parks D on the answer: demonstrated, not placed, so
        // Check must not pay for it until the kid drags.
        guard.mark();
        // After contrast (whether skipped or completed), offer the next rush.
        // No credit is awarded for the current rush: kid has to actually
        // position correctly on a later attempt to get credit.
        btnRotate.hidden = false;
        btnWhy.hidden = false;
        showEarnedChrome();
      }
    }

    async function runRightOnly() {
      skipSignal = { skipped: false };
      playing = true;
      setButtonsForContrast(true);
      try {
        await m.playRightAnswer(skipSignal);
      } finally {
        playing = false;
        setButtonsForContrast(false);
        guard.mark();
        btnRotate.hidden = false;
        btnWhy.hidden = false;
        showEarnedChrome();
      }
    }

    btnCheck.addEventListener('click', () => {
      if (playing) return;
      const r = m.check();
      const info = m.currentRushInfo();
      let msg = IceQ.TwoOnOne.phrasedFeedback(r);
      if (r.pass && guard.stale()) { showFb(DEMO_MSG); btnRotate.hidden = false; return; }
      if (r.pass) {
        try { IceQ.Audio.savePling(); } catch (e) {}
        try { IceQ.Path.celebrate(m.rink); } catch (e) {}
        rushesCompleted.add(info.rushIdx);
        if (rushesCompleted.size < info.totalRushes) {
          msg += ' Tap "Try the next rush".';
          btnRotate.hidden = false;
        } else {
          btnDone.hidden = false;
        }
        showFb(msg);
        btnWhy.hidden = false;
        return;
      }
      // Wrong answer — severity decides the replay style.
      try { IceQ.Audio && IceQ.Audio.wrongThunk && IceQ.Audio.wrongThunk(); } catch (e) {}
      //   dist > 14       -> full contrast (wrong play + consequence, then right)
      //   TOL < dist <= 14 -> just the right play, no goal consequence
      //   (pass branch handled above)
      showFb(msg);
      if (r.dist > 14) {
        runContrast();
      } else {
        runRightOnly();
      }
    });
    btnShow.addEventListener('click', () => {
      if (playing) return;
      m.showMe();
      guard.mark();
      showFb('Gold = where to stand. Red = where you DON\'T chase. Hit Reset and try.');
      btnWhy.hidden = false;
    });
    btnReset.addEventListener('click', () => {
      // Reset always cancels an in-flight contrast so the kid isn't trapped
      // if they tap Reset instead of Skip.
      skipSignal.skipped = true;
      if (m.stopContrast) m.stopContrast();
      m.reset(); fb.hidden = true;
      guard.clear();
      btnWhy.hidden = true; btnDone.hidden = true; btnRotate.hidden = true;
      btnSkip.hidden = true;
      btnCheck.disabled = false;
      btnShow.disabled = false;
      btnReset.disabled = false;
      playing = false;
      showEarnedChrome();
    });
    btnRotate.addEventListener('click', () => {
      m.nextRush(); updateProg();
      guard.clear();
      const info = m.currentRushInfo();
      showFb(`Now: ${info.rush.label}.`);
      btnRotate.hidden = true;
    });
    btnSkip.addEventListener('click', () => {
      // Flip the signal FIRST so async phases bail before their next await
      // resolves, then hard-stop any in-flight Konva animations.
      skipSignal.skipped = true;
      if (m.stopContrast) m.stopContrast();
      btnSkip.hidden = true;
      // Defensive cleanup — if the orchestrator's await chain hangs (e.g. a
      // Konva tween whose onFinish never fires), force UI recovery within 1s
      // so the kid is never trapped with Check disabled.
      setTimeout(() => {
        if (playing) {
          playing = false;
          btnCheck.disabled = false;
          btnShow.disabled = false;
          btnReset.disabled = false;
          btnRotate.hidden = false;
          btnWhy.hidden = false;
        }
      }, 1000);
    });
    btnWhy.addEventListener('click', () => openWhy('two-on-one'));
    btnDone.addEventListener('click', () => onDone('two-on-one'));
  }

  function wireOffside() {
    const m = IceQ.Offside.init(APP.querySelector('#rink'));
    const fb = APP.querySelector('#feedback');
    const fbMsg = APP.querySelector('#feedback-message');
    const btnCheck = APP.querySelector('#btn-check');   // Doubles as "Play"
    const btnCall = APP.querySelector('#btn-call');
    const btnReset = APP.querySelector('#btn-reset');
    const btnWhy = APP.querySelector('#btn-why');
    const btnDone = APP.querySelector('#btn-done');
    const btnRotate = APP.querySelector('#btn-rotate');
    const btnSkip = APP.querySelector('#btn-skip');
    const rushProg = APP.querySelector('#rush-progress');
    const showFb = (s) => { fbMsg.textContent = s; fb.hidden = false; };

    let playsCompleted = new Set();
    // Shared signal object — fresh one per contrast run so stale references
    // can't leak skip flags across replays. Mirrors the pattern used by
    // wireLaneCoverage / wireForecheck / wireTwoOnOne (v0.13).
    let skipSignal = { skipped: false };
    // Guard so a second Check/Call click can't kick off overlapping replays
    // while one is in flight.
    let replayInFlight = false;

    // "(3/10 · 2 done)": position in the deck AND how many are actually
    // earned, so a wrap-around never reads as "it started over".
    const updateProg = () => {
      const info = m.currentRushInfo();
      if (rushProg) rushProg.textContent = `(${info.rushIdx + 1}/${info.totalRushes} · ${playsCompleted.size} done)`;
    };
    updateProg();
    // Advance to the next play the kid has NOT yet earned (wrapping), so a
    // miss on play 10 still has a way forward and the deck converges.
    function advanceToNextIncomplete() {
      const total = m.currentRushInfo().totalRushes;
      for (let i = 0; i < total; i++) {
        m.nextRush();
        if (!playsCompleted.has(m.currentRushInfo().rushIdx)) break;
      }
      updateProg();
    }

    function setChromeDuringContrast(on) {
      // Lock the play/whistle/reset chrome during contrast and surface Skip.
      // Why button hides too — kid shouldn't navigate away mid-replay.
      btnCheck.disabled = on;
      btnCall.disabled = on;
      btnReset.disabled = on;
      if (on) {
        btnRotate.hidden = true;
        btnDone.hidden = true;
        btnWhy.hidden = true;
      }
      if (btnSkip) btnSkip.hidden = !on;
    }

    btnCheck.addEventListener('click', () => {
      if (replayInFlight) return;
      // Play the rush
      btnCheck.disabled = true;
      m.startPlay(() => {
        // On animation end (no tap), evaluate
        const r = m.result();
        if (r) handleResult(r);
        // Don't blanket re-enable Play here — handleResult may have kicked
        // off contrast playback that owns the chrome state.
        if (!replayInFlight) btnCheck.disabled = false;
      });
    });
    btnCall.addEventListener('click', () => {
      if (replayInFlight) return;
      const r = m.tapOffside();
      if (r) {
        try { IceQ.Audio && IceQ.Audio.whistle && IceQ.Audio.whistle(); } catch (e) {}
        // Whistle stops the play short — re-enable Play so kid can replay
        // without first hitting Reset (Agent C flagged this bug in old code).
        // (Will be re-disabled if contrast kicks off in handleResult.)
        btnCheck.disabled = false;
        handleResult(r);
      }
    });
    async function handleResult(r) {
      let msg = IceQ.Offside.phrasedFeedback(r);
      const info = m.currentRushInfo();

      if (r.correct) {
        // Correct call (good-call OR no-call). Award credit + audio + UX
        // hints. No contrast replay needed — kid saw the right thing happen.
        try { IceQ.Audio.savePling(); } catch (e) {}
        playsCompleted.add(info.rushIdx);
        updateProg();
        if (playsCompleted.size < info.totalRushes) {
          msg += ' Tap "Next play".';
          btnRotate.hidden = false;
        } else {
          btnDone.hidden = false;
        }
        showFb(msg);
        btnWhy.hidden = false;
        return;
      }

      // Wrong call (missed / false-call / too-early). Run the contrast
      // replay so the kid SEES what happened vs what should have happened.
      // No credit for contrast-driven attempts — they have to read the
      // play correctly on a fresh attempt to advance.
      try { IceQ.Audio && IceQ.Audio.wrongThunk && IceQ.Audio.wrongThunk(); } catch (e) {}
      showFb(msg);
      replayInFlight = true;
      // Fresh signal per replay — defensive against stale references.
      skipSignal = { skipped: false };
      setChromeDuringContrast(true);

      try {
        await m.showContrastReplay(r, skipSignal);
      } catch (err) {
        // Don't let an animation crash leave the kid with a locked UI.
        if (window.console) console.error('offside contrast replay failed:', err);
      } finally {
        replayInFlight = false;
        setChromeDuringContrast(false);
        // After contrast: offer Next play and Why. NO CREDIT awarded, the
        // kid must replay this one later; Next goes to the next un-earned
        // play (wrapping), so even a miss on play 10 has a way forward.
        if (playsCompleted.size < m.currentRushInfo().totalRushes) {
          btnRotate.hidden = false;
        }
        btnWhy.hidden = false;
        updateProg();
      }
    }
    btnReset.addEventListener('click', () => {
      // Always cancel any in-flight contrast — kid hitting Reset is an
      // explicit "get me out of this." Then do the standard reset.
      skipSignal.skipped = true;
      if (m.stopContrast) m.stopContrast();
      m.reset(); fb.hidden = true;
      btnWhy.hidden = true; btnDone.hidden = true; btnRotate.hidden = true;
      if (btnSkip) btnSkip.hidden = true;
      btnCheck.disabled = false;  // re-enable Play in case rush was mid-flight
      btnCall.disabled = false;
      replayInFlight = false;
    });
    btnRotate.addEventListener('click', () => {
      // Cancel any lingering contrast (defensive — UI shouldn't expose
      // Rotate during an active replay, but if something hangs, this gets
      // us out cleanly).
      skipSignal.skipped = true;
      if (m.stopContrast) m.stopContrast();
      advanceToNextIncomplete();
      const info = m.currentRushInfo();
      showFb(`Play ${info.rushIdx + 1} of ${info.totalRushes}. Hit Play and watch the blue line.`);
      btnRotate.hidden = true;
      btnCheck.disabled = false;
      btnCall.disabled = false;
    });
    if (btnSkip) {
      btnSkip.addEventListener('click', () => {
        // Flip the signal FIRST so async phases bail at their next await
        // boundary, then hard-stop any running animations.
        skipSignal.skipped = true;
        if (m.stopContrast) m.stopContrast();
        btnSkip.hidden = true;
        // Defensive: if the await chain hangs (Konva tween whose onFinish
        // never fires, etc.), force UI recovery within 1s so the kid is
        // never trapped.
        setTimeout(() => {
          if (replayInFlight) {
            replayInFlight = false;
            setChromeDuringContrast(false);
            if (playsCompleted.size < m.currentRushInfo().totalRushes) {
              btnRotate.hidden = false;
            }
            btnWhy.hidden = false;
          }
        }, 1000);
      });
    }
    btnWhy.addEventListener('click', () => openWhy('offside'));
    btnDone.addEventListener('click', () => onDone('offside'));
  }

  // Generic 3-token scenario wiring (Lane Coverage + Breakout follow the same
  // pattern as Forecheck — multi-rush, three draggable players, Show Me reveal).
  function wireMultiRushScenario(module, scenarioKey, requiredRoles, allRolesPassFn, phrasedFeedback) {
    const fb = APP.querySelector('#feedback');
    const fbMsg = APP.querySelector('#feedback-message');
    const btnCheck = APP.querySelector('#btn-check');
    const btnShow = APP.querySelector('#btn-show');
    const btnReset = APP.querySelector('#btn-reset');
    const btnWhy = APP.querySelector('#btn-why');
    const btnDone = APP.querySelector('#btn-done');
    const btnRotate = APP.querySelector('#btn-rotate');
    const rushProg = APP.querySelector('#rush-progress');
    const showFb = (m) => { fbMsg.textContent = m; fb.hidden = false; };
    const hideFb = () => { fb.hidden = true; fbMsg.textContent = ''; };

    let rushesCompleted = new Set();

    function updateRushProg() {
      const info = module.currentRushInfo();
      if (rushProg) rushProg.textContent = `(${info.rushIdx + 1}/${info.totalRushes})`;
    }
    updateRushProg();

    btnCheck.addEventListener('click', () => {
      const r = module.check();
      const info = module.currentRushInfo();
      let msg = phrasedFeedback(r);
      const allPass = allRolesPassFn(r);
      if (allPass) {
        rushesCompleted.add(info.rushIdx);
        msg += ` ✓ Rush ${info.rushIdx + 1} of ${info.totalRushes}.`;
        if (rushesCompleted.size < info.totalRushes) {
          msg += ' Tap "Try the next rush" — different setup, same idea.';
          btnRotate.hidden = false;
        } else {
          btnDone.hidden = false;
        }
      }
      // Removed partial-pass Done unlock — kid must demonstrate ALL three
      // correct positions (per all 3 rushes) before knocking off the target.
      // Round-2 deep review: 2-of-3 unlock was a "participation trophy."
      showFb(msg);
      btnWhy.hidden = false;
    });
    btnShow.addEventListener('click', () => {
      module.showMe();
      showFb('Hit Reset and try it yourself — kid demonstrates, not just sees.');
      btnWhy.hidden = false;
    });
    btnReset.addEventListener('click', () => {
      module.reset(); hideFb();
      btnWhy.hidden = true; btnDone.hidden = true; btnRotate.hidden = true;
    });
    btnRotate.addEventListener('click', () => {
      module.nextRush();
      updateRushProg();
      const info = module.currentRushInfo();
      showFb(`Rush ${info.rushIdx + 1}: ${info.rush.label}.`);
      btnRotate.hidden = true;
    });
    btnWhy.addEventListener('click', () => openWhy(scenarioKey));
    btnDone.addEventListener('click', () => onDone(scenarioKey));
  }

  function wireLaneCoverage() {
    // Bespoke wiring (not the generic wireMultiRushScenario) so we can
    // splice in the v0.13 contrast-replay flow. Lane coverage is the
    // "prevent the cross-ice" scenario, which means the wrong-answer
    // story — cross-ice goes through the broken lane seam for a tap-in —
    // is the whole pedagogical point. The generic helper doesn't have
    // hooks for that.
    const module = IceQ.LaneCoverage.init(APP.querySelector('#rink'));
    const scenarioKey = 'lane-coverage';
    const phrasedFeedback = IceQ.LaneCoverage.phrasedFeedback;

    const fb = APP.querySelector('#feedback');
    const fbMsg = APP.querySelector('#feedback-message');
    const btnCheck = APP.querySelector('#btn-check');
    const btnShow = APP.querySelector('#btn-show');
    const btnReset = APP.querySelector('#btn-reset');
    const btnWhy = APP.querySelector('#btn-why');
    const btnDone = APP.querySelector('#btn-done');
    const btnRotate = APP.querySelector('#btn-rotate');
    const btnSkip = APP.querySelector('#btn-skip');
    const rushProg = APP.querySelector('#rush-progress');
    const showFb = (s) => { fbMsg.textContent = s; fb.hidden = false; };
    const hideFb = () => { fb.hidden = true; fbMsg.textContent = ''; };

    let rushesCompleted = new Set();
    let contrastActive = false;
    let currentSkipSignal = null;

    function updateRushProg() {
      const info = module.currentRushInfo();
      if (rushProg) rushProg.textContent = `(${info.rushIdx + 1}/${info.totalRushes})`;
    }
    updateRushProg();

    function setChromeDuringContrast(on) {
      // During a contrast replay, lock the "what do I do" buttons and
      // expose Skip. After, restore normal state.
      contrastActive = on;
      btnCheck.disabled = on;
      btnShow.disabled = on;
      btnReset.disabled = on;
      if (on) {
        btnRotate.hidden = true;
        btnDone.hidden = true;
        btnWhy.hidden = true;
      }
      btnSkip.hidden = !on;
    }

    // Skip handler — sets the signal the contrast orchestrator polls
    // between phases. One signal per contrast run; replaced on each Check.
    btnSkip.addEventListener('click', () => {
      if (currentSkipSignal) currentSkipSignal.skipped = true;
      btnSkip.hidden = true;
      // Defensive: force UI recovery within 1s if the await chain hangs
      setTimeout(() => {
        if (contrastActive) {
          contrastActive = false;
          setChromeDuringContrast(false);
          btnRotate.hidden = false;
        }
      }, 1000);
    });

    btnCheck.addEventListener('click', async () => {
      if (contrastActive) return;
      const r = module.check();
      const info = module.currentRushInfo();
      const passes = ['lw', 'c', 'rw'].filter(role => r[role]?.pass).length;
      let msg = phrasedFeedback(r);

      if (passes === 3) {
        // All three lanes held — existing correct-answer behavior + audio.
        rushesCompleted.add(info.rushIdx);
        msg += ` ✓ Rush ${info.rushIdx + 1} of ${info.totalRushes}.`;
        if (rushesCompleted.size < info.totalRushes) {
          msg += ' Tap "Try the next rush" — different setup, same idea.';
          btnRotate.hidden = false;
        } else {
          btnDone.hidden = false;
        }
        IceQ.Audio.savePling();
        showFb(msg);
        btnWhy.hidden = false;
        return;
      }

      // Anything less than 3 → contrast replay. 2/3 = "almost there"
      // (right answer only, no wrong-way humiliation). 0-1 = full contrast
      // (wrong -> BUT INSTEAD -> right) because the lesson needs the
      // cross-ice goal-against to register. No credit is granted either
      // way — the kid must replay and get 3/3 to unlock progression.
      showFb(msg);
      currentSkipSignal = { skipped: false };
      setChromeDuringContrast(true);

      try {
        if (passes >= 2) {
          // Almost-there: skip the goal-against beat. Just show what a
          // held lane looks like — missed by a little, not a lot, so
          // don't pile on.
          await IceQ.Path.flashLabel(module.rink, {
            text: 'ALMOST — WATCH THE HELD LANE',
            color: '#E0C68A', holdMs: 500, fontSize: 22,
          });
          if (!currentSkipSignal.skipped) {
            await module.playRightAnswer(currentSkipSignal);
          }
          if (!currentSkipSignal.skipped) {
            await IceQ.Path.flashLabel(module.rink, {
              text: "THAT'S THE READ", color: '#3DB46A', holdMs: 600,
            });
          }
        } else {
          // Full contrast — passes is 0 or 1. showContrastReplay drives
          // the three-phase flow via IceQ.Path.showContrast.
          await module.showContrastReplay(r, currentSkipSignal);
        }
      } finally {
        setChromeDuringContrast(false);
        currentSkipSignal = null;
        // After contrast: NO CREDIT. Kid keeps the rush and tries again.
        // Why is still available (kid can review the principle).
        btnWhy.hidden = false;
      }
    });

    btnShow.addEventListener('click', () => {
      if (contrastActive) return;
      module.showMe();
      showFb('Hit Reset and try it yourself — kid demonstrates, not just sees.');
      btnWhy.hidden = false;
    });
    btnReset.addEventListener('click', () => {
      if (contrastActive) return;
      module.reset(); hideFb();
      btnWhy.hidden = true; btnDone.hidden = true; btnRotate.hidden = true;
    });
    btnRotate.addEventListener('click', () => {
      if (contrastActive) return;
      module.nextRush();
      updateRushProg();
      const info = module.currentRushInfo();
      showFb(`Rush ${info.rushIdx + 1}: ${info.rush.label}.`);
      btnRotate.hidden = true;
    });
    btnWhy.addEventListener('click', () => openWhy(scenarioKey));
    btnDone.addEventListener('click', () => onDone(scenarioKey));
  }

  function wireBreakout() {
    // Bespoke wiring (not the generic wireMultiRushScenario) so we can
    // splice in the v0.14 contrast-replay flow. Breakout's pedagogical
    // core is "bad outlets → forecheck strip → goal against our net."
    // The generic helper has no hook for that. Mirrors wireLaneCoverage /
    // wireForecheck.
    const module = IceQ.Breakout.init(APP.querySelector('#rink'));
    const scenarioKey = 'breakout';
    const phrasedFeedback = IceQ.Breakout.phrasedFeedback;

    const fb = APP.querySelector('#feedback');
    const fbMsg = APP.querySelector('#feedback-message');
    const btnCheck = APP.querySelector('#btn-check');
    const btnShow = APP.querySelector('#btn-show');
    const btnReset = APP.querySelector('#btn-reset');
    const btnWhy = APP.querySelector('#btn-why');
    const btnDone = APP.querySelector('#btn-done');
    const btnRotate = APP.querySelector('#btn-rotate');
    const btnSkip = APP.querySelector('#btn-skip');
    const rushProg = APP.querySelector('#rush-progress');
    const showFb = (s) => { fbMsg.textContent = s; fb.hidden = false; };
    const hideFb = () => { fb.hidden = true; fbMsg.textContent = ''; };

    let rushesCompleted = new Set();
    let contrastActive = false;
    let currentSkipSignal = null;

    function updateRushProg() {
      const info = module.currentRushInfo();
      if (rushProg) rushProg.textContent = `(${info.rushIdx + 1}/${info.totalRushes})`;
    }
    updateRushProg();

    function setChromeDuringContrast(on) {
      // Lock interaction chrome while the replay animates; surface Skip.
      // Matches wireLaneCoverage / wireForecheck convention.
      contrastActive = on;
      btnCheck.disabled = on;
      btnShow.disabled = on;
      btnReset.disabled = on;
      if (on) {
        btnRotate.hidden = true;
        btnDone.hidden = true;
        btnWhy.hidden = true;
      }
      if (btnSkip) btnSkip.hidden = !on;
    }

    if (btnSkip) {
      btnSkip.addEventListener('click', () => {
        // One signal per contrast run — Skip flips .skipped on the current
        // run's signal. The contrast orchestrator polls between phases.
        if (currentSkipSignal) currentSkipSignal.skipped = true;
        btnSkip.hidden = true;
        // Defensive: force UI recovery within 1s if the await chain hangs.
        setTimeout(() => {
          if (contrastActive) {
            contrastActive = false;
            setChromeDuringContrast(false);
            btnRotate.hidden = false;
          }
        }, 1000);
      });
    }

    btnCheck.addEventListener('click', async () => {
      if (contrastActive) return;
      const r = module.check();
      const info = module.currentRushInfo();
      const passes = ['wall', 'curl', 'stretch'].filter(role => r[role]?.pass).length;
      let msg = phrasedFeedback(r);

      if (passes === 3) {
        // All three outlets supported — existing success path + audio.
        rushesCompleted.add(info.rushIdx);
        msg += ` ✓ Rush ${info.rushIdx + 1} of ${info.totalRushes}.`;
        if (rushesCompleted.size < info.totalRushes) {
          msg += ' Tap "Try the next breakout" — different setup, same idea.';
          btnRotate.hidden = false;
        } else {
          btnDone.hidden = false;
        }
        IceQ.Audio.savePling();
        showFb(msg);
        btnWhy.hidden = false;
        return;
      }

      // Anything less than 3 → contrast replay. v0.14 severity tiers:
      //   0/3 or 1/3 → full contrast (forecheck strips → goal against)
      //   2/3        → playRight only ("ALMOST — WATCH THE WALL", no
      //                  goal-against beat — kid was close, don't pile on)
      // No credit in either tier — kid must replay and get 3/3 to unlock.
      showFb(msg);
      currentSkipSignal = { skipped: false };
      setChromeDuringContrast(true);

      try {
        if (passes >= 2) {
          // Almost-there: brief framing label, then the clean-exit reveal.
          // "WATCH THE WALL" as the generic prompt — the wall pass is the
          // breakout keystone, and the missing role is usually one of the
          // three anyway; kid reads phrasedFeedback for specifics.
          await IceQ.Path.flashLabel(module.rink, {
            text: 'ALMOST \u2014 WATCH THE WALL',
            color: '#E0C68A', holdMs: 500, fontSize: 22,
            skipSignal: currentSkipSignal,
          });
          if (!currentSkipSignal.skipped) {
            await module.playRightAnswer(currentSkipSignal);
          }
          if (!currentSkipSignal.skipped) {
            await IceQ.Path.flashLabel(module.rink, {
              text: "THAT'S THE EXIT", color: '#3DB46A', holdMs: 600,
              skipSignal: currentSkipSignal,
            });
          }
        } else {
          // Full contrast — 0 or 1 pass. showContrastReplay drives the
          // three-phase flow (bad outlet → strip → goal, reset, clean
          // breakout → exit).
          await module.showContrastReplay(r, currentSkipSignal);
        }
      } catch (err) {
        // Animation failure shouldn't leave the kid with a locked UI.
        console.warn('[breakout contrast] animation error', err);
      } finally {
        setChromeDuringContrast(false);
        currentSkipSignal = null;
        // After contrast: NO CREDIT. Why is available for review.
        btnWhy.hidden = false;
      }
    });

    btnShow.addEventListener('click', () => {
      if (contrastActive) return;
      module.showMe();
      showFb('Hit Reset and try it yourself — kid demonstrates, not just sees.');
      btnWhy.hidden = false;
    });
    btnReset.addEventListener('click', () => {
      if (contrastActive) return;
      module.reset(); hideFb();
      btnWhy.hidden = true; btnDone.hidden = true; btnRotate.hidden = true;
    });
    btnRotate.addEventListener('click', () => {
      if (contrastActive) return;
      module.nextRush();
      updateRushProg();
      const info = module.currentRushInfo();
      showFb(`Rush ${info.rushIdx + 1}: ${info.rush.label}.`);
      btnRotate.hidden = true;
    });
    btnWhy.addEventListener('click', () => openWhy(scenarioKey));
    btnDone.addEventListener('click', () => onDone(scenarioKey));
  }

  function wireForecheck() {
    // Bespoke wiring (not wireMultiRushScenario) so we can splice in the
    // v0.13 contrast-replay flow. Forecheck's pedagogical core is "place
    // the wrong way -> opposing breakout escapes -> goal against." The
    // contrast IS the lesson; the generic helper has no hook for it.
    // Mirrors the structure of wireLaneCoverage.
    const rinkEl = APP.querySelector('#rink');
    const module = IceQ.Forecheck.init(rinkEl);
    const scenarioKey = 'forecheck';
    const phrasedFeedback = IceQ.Forecheck.phrasedFeedback;

    const fb = APP.querySelector('#feedback');
    const fbMsg = APP.querySelector('#feedback-message');
    const btnCheck = APP.querySelector('#btn-check');
    const btnShow = APP.querySelector('#btn-show');
    const btnReset = APP.querySelector('#btn-reset');
    const btnWhy = APP.querySelector('#btn-why');
    const btnDone = APP.querySelector('#btn-done');
    const btnRotate = APP.querySelector('#btn-rotate');
    const btnSkip = APP.querySelector('#btn-skip');
    const rushProg = APP.querySelector('#rush-progress');
    const showFb = (s) => { fbMsg.textContent = s; fb.hidden = false; };
    const hideFb = () => { fb.hidden = true; fbMsg.textContent = ''; };

    let rushesCompleted = new Set();
    let contrastActive = false;
    let currentSkipSignal = null;

    function updateRushProg() {
      const info = module.currentRushInfo();
      if (rushProg) rushProg.textContent = `(${info.rushIdx + 1}/${info.totalRushes})`;
    }
    updateRushProg();

    function setChromeDuringContrast(on) {
      // Lock interaction chrome while the replay animates; surface Skip.
      // Matches wireLaneCoverage convention.
      contrastActive = on;
      btnCheck.disabled = on;
      btnShow.disabled = on;
      btnReset.disabled = on;
      if (on) {
        btnRotate.hidden = true;
        btnDone.hidden = true;
        btnWhy.hidden = true;
      }
      if (btnSkip) btnSkip.hidden = !on;
    }

    if (btnSkip) {
      btnSkip.addEventListener('click', () => {
        // One signal per contrast run — Skip flips .skipped on the current
        // run's signal. The contrast orchestrator polls between phases.
        if (currentSkipSignal) currentSkipSignal.skipped = true;
        btnSkip.hidden = true;
        // Defensive: force UI recovery within 1s if the await chain hangs
        setTimeout(() => {
          if (contrastActive) {
            contrastActive = false;
            setChromeDuringContrast(false);
            btnRotate.hidden = false;
          }
        }, 1000);
      });
    }

    btnCheck.addEventListener('click', async () => {
      if (contrastActive) return;
      const r = module.check();
      const info = module.currentRushInfo();
      const passes = ['cheetah', 'gator', 'hawk'].filter(role => r[role]?.pass).length;
      let msg = phrasedFeedback(r);

      if (passes === 3) {
        // All three in position — existing success path + audio.
        rushesCompleted.add(info.rushIdx);
        msg += ` ✓ Rush ${info.rushIdx + 1} of ${info.totalRushes}.`;
        if (rushesCompleted.size < info.totalRushes) {
          msg += ' Tap "Try the next rush" — the puck comes from the OTHER side. Same three animals, but now their JOBS rotate based on where the puck is.';
          btnRotate.hidden = false;
        } else {
          msg += ' All three rushes — you saw how Cheetah/Gator/Hawk are JOBS, not players. The animal you become depends on where you are when the puck turns over.';
          btnDone.hidden = false;
        }
        IceQ.Audio.savePling();
        showFb(msg);
        btnWhy.hidden = false;
        return;
      }

      // Wrong-answer contrast dispatch. v0.13 severity tiers:
      //   0/3 or 1/3 -> full contrast (wrong play -> BUT INSTEAD -> right)
      //   2/3        -> playRightAnswer only (kid was close; skip the
      //                 goal-against beat, just reinforce the strip)
      // No credit in either tier — kid must replay and get 3/3.
      showFb(msg);
      currentSkipSignal = { skipped: false };
      setChromeDuringContrast(true);

      try {
        if (passes >= 2) {
          // Almost-there: brief framing label, then the strip animation.
          // Don't pile a goal-against on a kid who was a Hawk-position away.
          await IceQ.Path.flashLabel(module.rink, {
            text: 'ALMOST \u2014 WATCH THE STRIP',
            color: '#E0C68A', holdMs: 500, fontSize: 22,
          });
          if (!currentSkipSignal.skipped) {
            await module.playRightAnswer();
          }
          if (!currentSkipSignal.skipped) {
            await IceQ.Path.flashLabel(module.rink, {
              text: "THAT'S THE READ", color: '#3DB46A', holdMs: 600,
            });
          }
        } else {
          // Full contrast — 0 or 1 pass. showContrastReplay drives the
          // three-phase flow (wrong play -> goal, reset, right play -> strip).
          await module.showContrastReplay(currentSkipSignal);
        }
      } catch (err) {
        // Animation failure shouldn't leave the kid with a locked UI.
        console.warn('[forecheck contrast] animation error', err);
      } finally {
        setChromeDuringContrast(false);
        currentSkipSignal = null;
        // After contrast/skip: NO CREDIT. Why is available for review.
        btnWhy.hidden = false;
      }
    });

    btnShow.addEventListener('click', () => {
      if (contrastActive) return;
      module.showMe();
      showFb('🐆 Cheetah on the puck. 🐊 Gator in the middle. 🦅 Hawk HIGH on the WEAK side. Now hit Reset and try it yourself.');
      btnWhy.hidden = false;
      // Done not unlocked by Show Me.
    });
    btnReset.addEventListener('click', () => {
      if (contrastActive) return;
      module.reset(); hideFb();
      btnWhy.hidden = true; btnDone.hidden = true; btnRotate.hidden = true;
    });
    btnRotate.addEventListener('click', () => {
      if (contrastActive) return;
      module.nextRush();
      updateRushProg();
      const info = module.currentRushInfo();
      showFb(`Rush ${info.rushIdx + 1}: ${info.rush.label}. Same three animals — but where do they go now?`);
      btnRotate.hidden = true;
    });
    btnWhy.addEventListener('click', () => openWhy(scenarioKey));
    btnDone.addEventListener('click', () => onDone(scenarioKey));
  }

  function wireCoverTheMan() {
    const rinkEl = APP.querySelector('#rink');
    const m = IceQ.CoverTheMan.init(rinkEl);
    const fb = APP.querySelector('#feedback');
    const fbMsg = APP.querySelector('#feedback-message');
    const btnCheck = APP.querySelector('#btn-check');
    const btnShow = APP.querySelector('#btn-show');
    const btnReset = APP.querySelector('#btn-reset');
    const btnWhy = APP.querySelector('#btn-why');
    const btnDone = APP.querySelector('#btn-done');
    const btnRotate = APP.querySelector('#btn-rotate');
    const rushProg = APP.querySelector('#rush-progress');
    const showFb = (m) => { fbMsg.textContent = m; fb.hidden = false; };
    const hideFb = () => { fb.hidden = true; fbMsg.textContent = ''; };

    // v0.17: Cover-the-Man now has 3 plays (right corner, left corner,
    // behind-net cycle). Same lesson, 3 reads — kid must pass all 3 to
    // unlock Done. Mirrors the multi-rush pattern in Forecheck / Lane
    // Coverage / Net Front.
    let playsCompleted = new Set();
    const guard = makeDemoGuard(m);
    function updateProg() {
      const info = m.currentRushInfo();
      if (rushProg) rushProg.textContent = `(${info.rushIdx + 1}/${info.totalRushes})`;
    }
    updateProg();
    const showEarnedChrome = () => {
      const info = m.currentRushInfo();
      if (playsCompleted.size >= info.totalRushes) btnDone.hidden = false;
      else if (playsCompleted.has(info.rushIdx)) btnRotate.hidden = false;
    };

    btnCheck.addEventListener('click', () => {
      const r = m.check();
      const info = m.currentRushInfo();
      let msg = IceQ.CoverTheMan.phrasedFeedback(r);
      if (r.cover && guard.stale()) { showFb(DEMO_MSG); return; }
      if (r.cover) {
        try { IceQ.Audio && IceQ.Audio.savePling(); } catch {}
        try { IceQ.Path.celebrate(m.rink); } catch (e) {}
        playsCompleted.add(info.rushIdx);
        if (playsCompleted.size < info.totalRushes) {
          msg += ` Tap "Try the next puck spot".`;
          btnRotate.hidden = false;
        } else {
          btnDone.hidden = false;
        }
      }
      if (!r.cover) { try { IceQ.Audio && IceQ.Audio.wrongThunk && IceQ.Audio.wrongThunk(); } catch (e) {} }
      showFb(msg);
      btnWhy.hidden = false;
    });
    btnShow.addEventListener('click', () => {
      m.showMe();
      guard.mark();
      showFb('Gold zone = where to cover the slot man. Red zone = where you DON\'T chase. Hit Reset and try.');
      btnWhy.hidden = false;
      // Done not unlocked by Show Me.
    });
    btnReset.addEventListener('click', () => {
      m.reset(); hideFb(); guard.clear();
      btnWhy.hidden = true; btnDone.hidden = true; btnRotate.hidden = true;
      showEarnedChrome();
    });
    btnRotate.addEventListener('click', () => {
      m.nextRush(); updateProg(); guard.clear();
      const info = m.currentRushInfo();
      showFb(`Now: ${info.rush.label}.`);
      btnRotate.hidden = true;
    });
    btnWhy.addEventListener('click', () => openWhy('cover-the-man'));
    btnDone.addEventListener('click', () => onDone('cover-the-man'));
  }

  // ===== D-ZONE COVERAGE SCENARIO WIRING ==================================
  // Same single-draggable, multi-play pattern as Cover-the-Man (identical
  // module API). Three plays, one per playbook rule-block; kid must pass all
  // three to unlock Done.
  function wireDZoneCoverage() {
    const rinkEl = APP.querySelector('#rink');
    const m = IceQ.DZoneCoverage.init(rinkEl);
    const fb = APP.querySelector('#feedback');
    const fbMsg = APP.querySelector('#feedback-message');
    const btnCheck = APP.querySelector('#btn-check');
    const btnShow = APP.querySelector('#btn-show');
    const btnReset = APP.querySelector('#btn-reset');
    const btnWhy = APP.querySelector('#btn-why');
    const btnDone = APP.querySelector('#btn-done');
    const btnRotate = APP.querySelector('#btn-rotate');
    const rushProg = APP.querySelector('#rush-progress');
    const showFb = (msg) => { fbMsg.textContent = msg; fb.hidden = false; };
    const hideFb = () => { fb.hidden = true; fbMsg.textContent = ''; };

    let playsCompleted = new Set();
    const guard = makeDemoGuard(m);
    function updateProg() {
      const info = m.currentRushInfo();
      if (rushProg) rushProg.textContent = `(${info.rushIdx + 1}/${info.totalRushes})`;
    }
    updateProg();
    const showEarnedChrome = () => {
      const info = m.currentRushInfo();
      if (playsCompleted.size >= info.totalRushes) btnDone.hidden = false;
      else if (playsCompleted.has(info.rushIdx)) btnRotate.hidden = false;
    };

    btnCheck.addEventListener('click', () => {
      const r = m.check();
      const info = m.currentRushInfo();
      let msg = IceQ.DZoneCoverage.phrasedFeedback(r);
      if (r.cover && guard.stale()) { showFb(DEMO_MSG); return; }
      if (r.cover) {
        try { IceQ.Audio && IceQ.Audio.savePling(); } catch {}
        try { IceQ.Path.celebrate(m.rink); } catch (e) {}
        playsCompleted.add(info.rushIdx);
        if (playsCompleted.size < info.totalRushes) {
          msg += ' Tap "Try the next situation".';
          btnRotate.hidden = false;
        } else {
          btnDone.hidden = false;
        }
      }
      if (!r.cover) { try { IceQ.Audio && IceQ.Audio.wrongThunk && IceQ.Audio.wrongThunk(); } catch (e) {} }
      showFb(msg);
      btnWhy.hidden = false;
    });
    btnShow.addEventListener('click', () => {
      m.showMe();
      guard.mark();
      showFb('Gold zone = where to stand and cover your man. Red = where you DON\'T over-commit. Hit Reset and try.');
      btnWhy.hidden = false;
      // Done not unlocked by Show Me.
    });
    btnReset.addEventListener('click', () => {
      m.reset(); hideFb(); guard.clear();
      btnWhy.hidden = true; btnDone.hidden = true; btnRotate.hidden = true;
      showEarnedChrome();
    });
    btnRotate.addEventListener('click', () => {
      m.nextRush(); updateProg(); guard.clear();
      const info = m.currentRushInfo();
      showFb(`Now: ${info.rush.label}.`);
      btnRotate.hidden = true;
    });
    btnWhy.addEventListener('click', () => openWhy('dzone-coverage'));
    btnDone.addEventListener('click', () => onDone('dzone-coverage'));
  }

  // ===== BREAKOUT READS SCENARIO WIRING ===================================
  // CHOICE mechanic (not drag): the kid reads the forecheck and TAPS one of
  // four named breakouts. Correct → reveal the play + credit; wrong → coach
  // the read + retry. Must get all reads right to unlock Done.
  function wireBreakoutReads() {
    const m = IceQ.BreakoutReads.init(APP.querySelector('#rink'));
    const READS = IceQ.BreakoutReads.READS;
    const BREAKOUTS = IceQ.BreakoutReads.BREAKOUTS;
    const fb = APP.querySelector('#feedback');
    const fbMsg = APP.querySelector('#feedback-message');
    const cueEl = APP.querySelector('#read-cue');
    const choiceWrap = APP.querySelector('#breakout-choices');
    const choiceBtns = choiceWrap ? Array.from(choiceWrap.querySelectorAll('.btn-choice')) : [];
    const demoControls = APP.querySelector('#br-demo-controls');
    const testControls = APP.querySelector('#br-test-controls');
    const btnWatch = APP.querySelector('#btn-watch');
    const btnSkipDemo = APP.querySelector('#btn-skip-demo');
    const btnShow = APP.querySelector('#btn-show');
    const btnReset = APP.querySelector('#btn-reset');
    const btnWhy = APP.querySelector('#btn-why');
    const btnDone = APP.querySelector('#btn-done');
    const btnRotate = APP.querySelector('#btn-rotate');
    const rushProg = APP.querySelector('#rush-progress');
    const showFb = (msg) => { fbMsg.textContent = msg; fb.hidden = false; };
    const hideFb = () => { fb.hidden = true; fbMsg.textContent = ''; };
    const setNarration = (txt) => { if (cueEl) cueEl.textContent = txt; };

    let readsCompleted = new Set();
    const totalReads = m.currentRushInfo().totalRushes;
    let demoRunning = false;
    let skipRequested = false;

    const setChoices = (on) => choiceBtns.forEach(b => { b.disabled = !on; });
    function updateProg() {
      const info = m.currentRushInfo();
      if (rushProg) rushProg.textContent = `(${info.rushIdx + 1}/${info.totalRushes})`;
    }

    // Teach-first flow: intro -> demo (animated walkthrough of all 4) -> test.
    function setMode(mode) {
      if (demoControls) demoControls.hidden = (mode === 'test');
      if (choiceWrap)   choiceWrap.hidden   = (mode !== 'test');
      if (testControls) testControls.hidden = (mode !== 'test');
      if (mode === 'intro') {
        hideFb(); btnWhy.hidden = true; btnDone.hidden = true; btnRotate.hidden = true;
        if (btnWatch) btnWatch.hidden = false;
        if (btnSkipDemo) btnSkipDemo.hidden = false;
        setNarration('First, watch how each breakout beats the forecheck — then you read it.');
      } else if (mode === 'demo') {
        if (btnWatch) btnWatch.hidden = true;   // playing — hide Watch, keep Skip
      } else if (mode === 'test') {
        setChoices(true);
        updateProg();
        setNarration(m.cue());
      }
    }

    async function runDemo() {
      if (demoRunning) return;
      demoRunning = true; skipRequested = false;
      setMode('demo');
      for (let i = 0; i < READS.length; i++) {
        if (skipRequested) break;
        m.goToRead(i);
        const r = READS[i];
        setNarration(`${BREAKOUTS[r.answer].label} — ${r.teach}`);
        await m.playReveal();
        if (skipRequested) break;
        await IceQ.Path.wait(650);
      }
      try { IceQ.Progress.markDemoSeen('breakout-reads'); } catch (e) {}
      demoRunning = false;
      m.goToRead(0);
      setMode('test');
    }

    if (btnWatch) btnWatch.addEventListener('click', () => { runDemo(); });
    if (btnSkipDemo) btnSkipDemo.addEventListener('click', () => {
      if (demoRunning) { skipRequested = true; }   // skip mid-walkthrough
      else {                                        // skip straight from intro
        try { IceQ.Progress.markDemoSeen('breakout-reads'); } catch (e) {}
        m.goToRead(0); setMode('test');
      }
    });

    choiceBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled || demoRunning) return;
        const r = m.choose(btn.dataset.breakout);
        const info = m.currentRushInfo();
        showFb(IceQ.BreakoutReads.phrasedFeedback(r));
        btnWhy.hidden = false;
        if (r.correct) {
          try { IceQ.Audio && IceQ.Audio.savePling(); } catch {}
          try { IceQ.Path.celebrate(m.rink); } catch (e) {}
          // Reveal the play that beats this pressure AND run it (D carries /
          // passes / rims with the puck on the stick), not just an arrow.
          try { m.playReveal(); } catch (e) { m.showMe(); }
          readsCompleted.add(info.rushIdx);
          setChoices(false);          // lock until Reset / Next read
          if (readsCompleted.size >= totalReads) {
            btnDone.hidden = false;
          } else {
            btnRotate.hidden = false;
          }
        }
        // wrong → choices stay live for a retry
        if (!r.correct) { try { IceQ.Audio && IceQ.Audio.wrongThunk && IceQ.Audio.wrongThunk(); } catch (e) {} }
      });
    });

    btnShow.addEventListener('click', () => {
      m.showMe();
      showFb('That gold path is the breakout that beats this pressure. Hit Reset and try a read on your own.');
      btnWhy.hidden = false;
      // Show Me does not grant credit — the kid still taps the right call.
    });
    btnReset.addEventListener('click', () => {
      m.reset(); hideFb();
      setChoices(true);
      btnWhy.hidden = true; btnDone.hidden = true; btnRotate.hidden = true;
    });
    btnRotate.addEventListener('click', () => {
      m.nextRush(); updateProg(); setNarration(m.cue());
      hideFb();
      setChoices(true);
      btnRotate.hidden = true; btnWhy.hidden = true;
    });
    btnWhy.addEventListener('click', () => openWhy('breakout-reads'));
    btnDone.addEventListener('click', () => onDone('breakout-reads'));

    // Same demo-first-then-bypass rule as O-Zone Entry: the first visit just
    // RUNS the walkthrough (offering it got it skipped every time), every
    // visit after goes straight to the quiz.
    if (IceQ.Progress.demoSeen('breakout-reads')) {
      m.goToRead(0); setMode('test');
    } else {
      setMode('intro');
      setTimeout(() => { if (!demoRunning) runDemo(); }, 550);
    }
  }

  // ===== O-ZONE FACEOFF SCENARIO WIRING ===================================
  // TWO modes sharing the Red/Black/Gold data:
  //   RUN IT  — bench calls the color (prompt); kid taps WHERE the shot comes
  //             from (Slot/Wall/Weak).
  //   NAME IT — the play auto-reveals; kid taps the CALL (Red/Black/Gold).
  // Mode toggle swaps the button set + prompt. Get 3 right in a mode -> Done.
  function wireOzoneFaceoff() {
    const m = IceQ.OzoneFaceoff.init(APP.querySelector('#rink'));
    const fb = APP.querySelector('#feedback');
    const fbMsg = APP.querySelector('#feedback-message');
    const prompt = APP.querySelector('#fo-prompt');
    const modeWrap = APP.querySelector('#fo-mode');
    const locsNav = APP.querySelector('#fo-locs');
    const callsNav = APP.querySelector('#fo-calls');
    const locBtns = locsNav ? Array.from(locsNav.querySelectorAll('.btn-choice')) : [];
    const callBtns = callsNav ? Array.from(callsNav.querySelectorAll('.btn-choice')) : [];
    const btnShow = APP.querySelector('#btn-show');
    const btnReset = APP.querySelector('#btn-reset');
    const btnWhy = APP.querySelector('#btn-why');
    const btnDone = APP.querySelector('#btn-done');
    const btnRotate = APP.querySelector('#btn-rotate');
    const rushProg = APP.querySelector('#rush-progress');
    const showFb = (msg) => { fbMsg.textContent = msg; fb.hidden = false; };
    const hideFb = () => { fb.hidden = true; fbMsg.textContent = ''; };

    let mode = 'run';
    let completed = new Set();   // play indices correct in the CURRENT mode
    const totalPlays = m.currentRushInfo().totalRushes;

    function updateProg() {
      const info = m.currentRushInfo();
      if (rushProg) rushProg.textContent = `(${info.rushIdx + 1}/${info.totalRushes})`;
    }
    const setLocs = (on) => locBtns.forEach(b => { b.disabled = !on; });
    const setCalls = (on) => callBtns.forEach(b => { b.disabled = !on; });

    // Show the right button set + prompt for the mode. In NAME mode, auto-reveal
    // the play (no label — that's the question).
    function applyMode() {
      if (mode === 'run') {
        locsNav.hidden = false; if (callsNav) callsNav.hidden = true;
        m.reset();
        prompt.textContent = `Coach calls: ${m.callLabel()}. Where does the shot come from?`;
      } else {
        locsNav.hidden = true; if (callsNav) callsNav.hidden = false;
        m.revealPlay(false);
        prompt.textContent = 'Watch the play — what was the call?';
      }
      setLocs(true); setCalls(true);
    }

    function onCorrect(info) {
      try { IceQ.Audio && IceQ.Audio.savePling(); } catch {}
      try { IceQ.Path.celebrate(m.rink); } catch (e) {}
      m.revealPlay(true);            // reveal WITH the call label
      completed.add(info.rushIdx);
      setLocs(false); setCalls(false);
      if (completed.size >= totalPlays) btnDone.hidden = false;
      else btnRotate.hidden = false;
    }

    if (modeWrap) {
      modeWrap.querySelectorAll('.hand-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          modeWrap.querySelectorAll('.hand-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          mode = btn.dataset.mode;
          completed = new Set();      // fresh challenge per mode
          hideFb(); btnWhy.hidden = true; btnDone.hidden = true; btnRotate.hidden = true;
          applyMode();
        });
      });
    }

    locBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled || mode !== 'run') return;
        const r = m.chooseLocation(btn.dataset.loc);
        const info = m.currentRushInfo();
        showFb(IceQ.OzoneFaceoff.phrasedFeedback(r));
        btnWhy.hidden = false;
        if (r.correct) onCorrect(info);
      });
    });
    callBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled || mode !== 'name') return;
        const r = m.chooseCall(btn.dataset.call);
        const info = m.currentRushInfo();
        showFb(IceQ.OzoneFaceoff.phrasedFeedback(r));
        btnWhy.hidden = false;
        if (r.correct) onCorrect(info);
      });
    });

    btnShow.addEventListener('click', () => {
      m.revealPlay(true);
      showFb(`That's ${m.callLabel()} — the gold path shows where the shot comes from. Hit Reset and try.`);
      btnWhy.hidden = false;
    });
    btnReset.addEventListener('click', () => {
      hideFb(); btnWhy.hidden = true; btnDone.hidden = true; btnRotate.hidden = true;
      applyMode();
    });
    btnRotate.addEventListener('click', () => {
      m.nextRush(); updateProg();
      hideFb(); btnRotate.hidden = true; btnWhy.hidden = true;
      applyMode();
    });
    btnWhy.addEventListener('click', () => openWhy('ozone-faceoff'));
    btnDone.addEventListener('click', () => onDone('ozone-faceoff'));

    updateProg();
    applyMode();
  }

  // ===== HOUSE SCENARIO WIRING ============================================

  function wireHouse() {
    const rinkEl = APP.querySelector('#rink');
    const rink = IceQ.Rink.create(rinkEl);
    const cells = IceQ.House.buildGrid(rink);

    const fb = APP.querySelector('#feedback');
    const fbMsg = APP.querySelector('#feedback-message');
    const btnCheck = APP.querySelector('#btn-check');
    const btnShow = APP.querySelector('#btn-show');
    const btnReset = APP.querySelector('#btn-reset');
    const btnWhy = APP.querySelector('#btn-why');
    const btnDone = APP.querySelector('#btn-done');

    function showFb(m) { fbMsg.textContent = m; fb.hidden = false; }
    function hideFb() { fb.hidden = true; fbMsg.textContent = ''; }

    btnCheck.addEventListener('click', () => {
      const r = IceQ.House.check(cells);
      showFb(IceQ.House.phrasedFeedback(r));
      btnWhy.hidden = false;
      if (r.correct >= r.totalHouse * 0.6) {
        btnDone.hidden = false;
        try { IceQ.Path.celebrate(rink); } catch (e) {}
      }
    });
    btnShow.addEventListener('click', () => {
      IceQ.House.drawHousePolygon(rink);
      showFb("The house: from the tops of the face-off circles down to the goal line. Now hit Reset and try to map it yourself.");
      btnWhy.hidden = false;
      // Done is NOT unlocked by Show Me — the kid must demonstrate, not just see.
    });
    btnReset.addEventListener('click', () => {
      IceQ.House.reset(cells);
      IceQ.House.clearOverlay(rink);
      hideFb();
      btnWhy.hidden = true;
      btnDone.hidden = true;
    });
    btnWhy.addEventListener('click', () => openWhy('house'));
    btnDone.addEventListener('click', () => onDone('house'));
  }

  // ===== DEFENSIVE SIDE SCENARIO WIRING ===================================

  function wireDefensiveSide() {
    const rinkEl = APP.querySelector('#rink');
    const module = IceQ.DefensiveSide.init(rinkEl);

    const fb = APP.querySelector('#feedback');
    const fbMsg = APP.querySelector('#feedback-message');
    const btnCheck = APP.querySelector('#btn-check');
    const btnShow = APP.querySelector('#btn-show');
    const btnReset = APP.querySelector('#btn-reset');
    const btnWhy = APP.querySelector('#btn-why');
    const btnDone = APP.querySelector('#btn-done');

    // Wire the LH/RH stick toggle
    const handToggle = APP.querySelector('#hand-toggle');
    if (handToggle) {
      handToggle.querySelectorAll('.hand-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          handToggle.querySelectorAll('.hand-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          module.setStickHand(btn.dataset.hand);
        });
      });
    }

    // Re-label Check -> "Check" becomes "Check + Next puck" after pass
    function showFb(m) { fbMsg.textContent = m; fb.hidden = false; }
    function hideFb() { fb.hidden = true; fbMsg.textContent = ''; }

    let passCount = 0;
    const total = module.totalPucks();

    btnCheck.addEventListener('click', () => {
      const r = module.check();
      const idx = module.currentIdx();
      // Disable buttons during animation
      btnCheck.disabled = true; btnShow.disabled = true; btnReset.disabled = true;
      module.animateConsequence(r.pass, () => {
        const msg = IceQ.DefensiveSide.phrasedFeedback(r, idx, total);
        showFb(msg);
        btnWhy.hidden = false;
        btnCheck.disabled = false; btnShow.disabled = false; btnReset.disabled = false;
        if (r.pass) {
          passCount += 1;
          if (module.nextPuck()) {
            btnCheck.querySelector('.btn-label').textContent = `Check (${passCount + 1}/${total})`;
          } else {
            btnDone.hidden = false;
          }
        }
      });
    });
    btnShow.addEventListener('click', () => {
      module.showMe();
      showFb("The gold corridor is the 'defensive side' — any spot in it keeps you between the puck and your net. Now hit Reset and try.");
      btnWhy.hidden = false;
      // Done not unlocked by Show Me — kid demonstrates, not traces.
    });
    btnReset.addEventListener('click', () => {
      module.reset();
      hideFb();
      btnWhy.hidden = true;
      btnDone.hidden = true;
      passCount = 0;
      btnCheck.querySelector('.btn-label').textContent = 'Check';
    });
    btnWhy.addEventListener('click', () => openWhy('defensive-side'));
    btnDone.addEventListener('click', () => onDone('defensive-side'));
  }

  // ===== WHY DIALOG (shared) ==============================================

  // Render a WHY dialog from the per-scenario config in IceQ.WHYS.
  function inlineMd(text) {
    // Tiny inline markdown: **bold**
    return String(text).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }

  function renderWhyBlocks(container, blocks) {
    container.innerHTML = '';
    for (const b of blocks) {
      if (b.type === 'lead') {
        const p = document.createElement('p');
        p.className = 'why-lead';
        p.innerHTML = inlineMd(b.text);
        container.appendChild(p);
      } else if (b.type === 'bullets') {
        const ul = document.createElement('ul');
        ul.className = 'why-bullets';
        for (const item of b.items) {
          const li = document.createElement('li');
          li.innerHTML = inlineMd(item);
          ul.appendChild(li);
        }
        container.appendChild(ul);
      } else if (b.type === 'image') {
        const fig = document.createElement('figure');
        fig.className = 'why-heatmap';
        const img = document.createElement('img');
        img.src = b.src; img.alt = '';
        fig.appendChild(img);
        if (b.caption) {
          const cap = document.createElement('figcaption');
          cap.textContent = b.caption;
          fig.appendChild(cap);
        }
        container.appendChild(fig);
      } else if (b.type === 'bars') {
        const wrap = document.createElement('div');
        wrap.className = 'why-bars';
        const cap = Math.max(...b.stats.map(s => s.pct)) * 1.15;
        for (const stat of b.stats) {
          const row = document.createElement('div');
          row.className = 'why-bar-row';
          row.innerHTML = `
            <span class="why-bar-label">${stat.label}</span>
            <div class="why-bar-track"><div class="why-bar-fill ${stat.style}" style="width: ${Math.min(100, 100 * stat.pct / cap).toFixed(1)}%;">~${stat.pct.toFixed(1)}%</div></div>
            <span class="why-bar-note">${stat.note || ''}</span>
          `;
          wrap.appendChild(row);
        }
        container.appendChild(wrap);
      } else if (b.type === 'quote') {
        const p = document.createElement('p');
        p.className = 'why-coach';
        p.innerHTML = `"${inlineMd(b.text)}" <span class="why-coach-attr">${b.attr || ''}</span>`;
        container.appendChild(p);
      } else if (b.type === 'cta') {
        const p = document.createElement('p');
        p.className = 'why-cta';
        p.innerHTML = inlineMd(b.text);
        container.appendChild(p);
      } else if (b.type === 'source') {
        const p = document.createElement('p');
        p.className = 'why-source';
        p.textContent = b.text;
        container.appendChild(p);
      }
    }
  }

  async function openWhy(scenarioKey) {
    const dlg = document.getElementById('why-dialog');
    const s = await loadStats();
    const fn = IceQ.WHYS[scenarioKey];
    if (!fn) return;
    const why = fn(s);
    document.getElementById('why-title').textContent = why.title;
    renderWhyBlocks(document.getElementById('why-content'), why.blocks);
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  }

  document.getElementById('btn-why-close').addEventListener('click', () => {
    const dlg = document.getElementById('why-dialog');
    if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
  });

  // ===== COACH TALK DIALOG =================================================

  async function openCoachTalk(scenarioKey) {
    const q = pickCoachTalk(scenarioKey);
    if (!q) return;
    const s = await loadStats();
    document.getElementById('coach-quote').textContent = `"${q.quote}"`;
    document.getElementById('coach-attr').textContent = q.attr;
    document.getElementById('coach-stat').textContent = q.stat ? q.stat(s) : '';
    const dlg = document.getElementById('coach-talk-dialog');
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  }

  document.getElementById('btn-coach-close').addEventListener('click', () => {
    const dlg = document.getElementById('coach-talk-dialog');
    if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
    // After coach talk, go home with knock-off animation
    if (pendingDoneKey) {
      const key = pendingDoneKey;
      pendingDoneKey = null;
      location.hash = `#/done/${key}`;
    }
  });

  // ===== DONE FLOW =========================================================

  let pendingDoneKey = null;

  async function onDone(key) {
    const { wasAlreadyComplete } = IceQ.Progress.markComplete(key);
    // Bump streak if this is the first completion today (across any scenario)
    if (!wasAlreadyComplete && typeof IceQ.bumpStreak === 'function') {
      IceQ.bumpStreak();
    }
    // Haptic feedback on knock-off — silent on car rides, satisfying for the kid
    try { navigator.vibrate && navigator.vibrate([20, 30, 80]); } catch {}
    // GOAL HORN celebration on Done unlock — addresses Trevor-persona note that
    // savePling was too gentle for a "you crushed it" moment. Goal horn here is
    // for the kid SCORING (knocking off the target), not opponents scoring.
    try { IceQ.Audio && IceQ.Audio.goalHorn(); } catch {}
    // Only show coach talk on NEW completion ("conditional, only when appropriate")
    if (!wasAlreadyComplete && COACH_TALK[key]) {
      pendingDoneKey = key;
      openCoachTalk(key);
    } else {
      location.hash = `#/done/${key}`;
    }
  }

  // ===== STREAK OFF-SWITCH (event-delegated) ==============================
  // Turning it off keeps the count — it just stops showing it. A kid who wants
  // it back gets his number back, and a kid who was protecting a number at
  // 9:40pm stops seeing the thing he was protecting.
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#btn-streak-off')) return;
    e.preventDefault();
    e.stopPropagation();
    IceQ.Progress.setStreakEnabled(false);
    const badge = document.querySelector('.daily-streak');
    if (badge) badge.remove();
  });

  // ===== VOCABULARY POPUPS (event-delegated, shared) ======================

  document.addEventListener('click', (e) => {
    const t = e.target.closest('.term');
    if (!t || !t.dataset.term) return;
    // Strip pulse-hint from ALL vocab terms once kid taps any one (they've
    // discovered vocab chips work — no need to keep pulsing).
    document.querySelectorAll('.vocab .term.pulse-hint').forEach(n => n.classList.remove('pulse-hint'));
    const v = IceQ.vocab[t.dataset.term];
    if (!v) return;
    document.getElementById('term-title').textContent = v.title;
    document.getElementById('term-def').textContent = v.def;
    document.getElementById('term-why').textContent = v.why || '';
    const dlg = document.getElementById('term-dialog');
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  });

  // After scenario mounts, pulse the first 1-2 vocab terms ONCE per session
  // per scenario (don't re-pulse if kid revisits — they've seen the hint).
  function pulseFirstVocab() {
    const seenKey = 'iceq.vocab-pulse-seen.v1';
    let seen = new Set();
    try { seen = new Set(JSON.parse(localStorage.getItem(seenKey) || '[]')); } catch {}
    const hash = location.hash.replace('#/', '') || 'home';
    if (seen.has(hash)) return;
    const terms = APP.querySelectorAll('.vocab .term');
    if (!terms.length) return;
    // Pulse first 2 terms (the most "important" usually appear first in vocab list)
    [terms[0], terms[1]].filter(Boolean).forEach(n => n.classList.add('pulse-hint'));
    seen.add(hash);
    try { localStorage.setItem(seenKey, JSON.stringify([...seen])); } catch {}
  }
  // Hook into renderScenario via a setTimeout after each navigation
  window.addEventListener('hashchange', () => setTimeout(pulseFirstVocab, 200));
  // Also on initial load
  setTimeout(pulseFirstVocab, 300);
  document.getElementById('btn-term-close').addEventListener('click', () => {
    const dlg = document.getElementById('term-dialog');
    if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
  });

  // ===== HOME BUTTON =======================================================

  BTN_HOME.addEventListener('click', () => { location.hash = '#/'; });

  // ===== ROUTER ============================================================

  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    if (!h || h === 'home') {
      renderHome();
      return;
    }
    const parts = h.split('/');
    if (parts[0] === 'done' && parts[1]) {
      const key = parts[1];
      renderHome({ justCompleted: key });
      // Clean URL so reload doesn't replay animation
      setTimeout(() => { history.replaceState(null, '', location.pathname + '#/'); }, 50);
      return;
    }
    renderScenario(h);
  }

  window.addEventListener('hashchange', route);
  route();
})();
