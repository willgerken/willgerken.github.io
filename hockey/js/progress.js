// Local progress storage. No cloud, no account, no telemetry.
// Kids' progress lives on one device. Clearing site data = reset.

window.IceQ = window.IceQ || {};

window.IceQ.Progress = (function () {
  const KEY = 'iceq.progress.v1';

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }

  function markComplete(key) {
    const state = load();
    const prev = state[key];
    state[key] = 'complete';
    save(state);
    return { state, wasAlreadyComplete: prev === 'complete' };
  }

  function isComplete(key) {
    return load()[key] === 'complete';
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch {}
  }

  // --- streak on/off ------------------------------------------------------
  // A parent review split on the daily streak. FOR: reps are the game, and a
  // daily nudge is the only accountability in a thing with no score. AGAINST:
  // streaks break on exactly the tournament weekends, so they punish the kids
  // doing the MOST hockey; siblings sharing a device turn it into a scoreboard
  // in one house; and a kid who already assumes he is behind will open it late
  // at night to protect a number rather than to learn anything. An off switch
  // is the only thing that settles it. Default ON, one tap to kill, and killing
  // it does NOT erase the count.
  const STREAK_PREF = 'iceq.streakEnabled.v1';
  function streakEnabled() {
    try { return localStorage.getItem(STREAK_PREF) !== 'off'; } catch { return true; }
  }
  function setStreakEnabled(on) {
    try { localStorage.setItem(STREAK_PREF, on ? 'on' : 'off'); } catch {}
  }

  // --- teach-demo memory --------------------------------------------------
  // Which scenarios' pattern walkthroughs the kid has already sat through.
  // Drives "show me the patterns the FIRST time, get out of my way after."
  // Our playtester skips every intro he's offered, so the fix isn't a better
  // Skip button — it's making the demo automatic once and then never again.
  const DEMO_KEY = 'iceq.demoSeen.v1';

  function loadDemos() {
    try {
      const raw = localStorage.getItem(DEMO_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }
  function demoSeen(key) {
    return loadDemos()[key] === true;
  }
  function markDemoSeen(key) {
    try {
      const s = loadDemos();
      s[key] = true;
      localStorage.setItem(DEMO_KEY, JSON.stringify(s));
    } catch {}
  }
  function resetDemos() {
    try { localStorage.removeItem(DEMO_KEY); } catch {}
  }

  return { load, save, markComplete, isComplete, reset,
           demoSeen, markDemoSeen, resetDemos,
           streakEnabled, setStreakEnabled };
})();
