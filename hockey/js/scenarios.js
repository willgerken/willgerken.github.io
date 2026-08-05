// Scenario registry. Each entry maps to one target on the home-page goal.
// Targets are positioned at the 4 inside corners of the net, like shooting tutors.

window.IceQ = window.IceQ || {};

// POC demo (2026-06-22): the SIX goal-target corners ARE the six showcase games
// (house, dzone-coverage, breakout-reads, ozone-entry, two-on-one, ozone-faceoff).
// 2026-08-03: `ozone-entry` (built from Coach's Aug 2 video session) took the BM
// corner and `breakout` dropped to "More drills" — it duplicated Breakout Reads'
// vocab and was already flagged for a cull.
// The other six (defensive-side, lane-coverage, forecheck, cover-the-man,
// net-front, offside) have corner:null and fall into the "More drills" section
// below — so the coach sees a tight six, not a wall of twelve. To swap a game in
// or out of the hero, just move a corner value. (OPEN: Breakout vs Breakout Reads
// use different vocab — cull one before the coach sees it; cover-the-man, the
// polished T2, sits one tap away under More if we'd rather swap it back in.)
window.IceQ.SCENARIOS = [
  {
    key: 'house',
    title: 'The House',
    subtitle: 'Know where goals come from',
    corner: 'TL',                 // top-left
    available: true,
    theme: 'defensive-positioning',
    tagline: "Where do you need to be when you don't have the puck?",
  },
  {
    key: 'dzone-coverage',
    title: 'D-Zone Coverage',
    subtitle: 'Protect the Danger Zone',
    corner: 'TM',                 // top-middle
    available: true,
    theme: 'defensive-positioning',
    tagline: 'Man-to-man in your zone. Only one D ever leaves the middle.',
  },
  {
    key: 'breakout-reads',
    title: 'Breakout Reads',
    subtitle: 'Read the forecheck, pick the breakout',
    corner: 'TR',                 // top-right
    available: true,
    theme: 'transition',
    tagline: 'D-Wheel, D-to-D, Reverse, Weak-Side Rim — which one beats THIS pressure?',
  },
  {
    key: 'two-on-one',
    title: '2-on-1 Defense',
    subtitle: 'D plays the pass, goalie plays the shot',
    corner: 'BL',                 // bottom-left
    available: true,
    theme: 'transition',
    tagline: 'The classic teaching moment. Don\'t commit to the puck.',
  },
  {
    key: 'ozone-entry',
    title: 'O-Zone Entry',
    subtitle: 'Drive the middle lane',
    corner: 'BM',                 // bottom-middle
    available: true,
    theme: 'transition',
    tagline: "Straight from Coach's video session: middle lane drive, and when the weak-side D joins as the 4th attacker.",
  },
  {
    key: 'ozone-faceoff',
    title: 'O-Zone Faceoff Plays',
    subtitle: 'Red · Black · Gold',
    // GATED 2026-08-03. This was recorded as "held pending coach sign-off" back
    // in June and the gate was never actually written — it shipped as a hero
    // target with available:true. A coach panel then found the two centers
    // lined up on the wrong sides of the dot, two skaters standing inside the
    // faceoff circle, all three "shooters" on ice where no player exists, and
    // one opposing skater on the whole sheet. Set plays are the one place where
    // 80% right is worse than absent: a kid who runs the wrong BLACK in a game
    // costs a goal and blames himself. Stays off until the coach who owns
    // Red/Black/Gold confirms the alignment.
    corner: null,
    available: false,
    theme: 'set-plays',
    tagline: 'Coach calls it — you run it. Then flip it: name the call.',
  },
  // ===== "More drills" — beyond the six showcase targets. No corner on the goal;
  // they render in the secondary list below for extra practice. =====
  {
    key: 'breakout',
    title: 'Breakout',
    subtitle: 'Wall · Curl · Stretch',
    corner: null,
    available: true,
    theme: 'transition',
    tagline: 'Three forwards, three support spots. Win the breakout, win the game.',
  },
  {
    key: 'cover-the-man',
    title: 'Cover the Man',
    subtitle: "Don't puck-chase",
    // Promoted into BR when ozone-faceoff was gated — the code comment above
    // already flagged it as the polished understudy sitting one tap away.
    corner: 'BR',
    available: true,
    theme: 'defensive-positioning',
    tagline: 'Stick on stick beats skating to the puck.',
  },
  {
    key: 'defensive-side',
    title: 'Defensive Side of the Puck',
    subtitle: 'Body between puck and net',
    corner: null,
    available: true,
    theme: 'defensive-positioning',
    tagline: "Feel your check. Watch the puck with your eyes.",
  },
  {
    key: 'lane-coverage',
    title: 'Lane Coverage',
    subtitle: 'Three lanes, three jobs',
    corner: null,
    available: true,
    theme: 'defensive-positioning',
    tagline: 'When the rush comes at you, fill your lane — don\'t chase the puck.',
  },
  {
    key: 'forecheck',
    title: 'Forecheck Lanes',
    subtitle: 'Cheetah · Gator · Hawk',
    corner: null,
    available: true,
    theme: 'defensive-positioning',
    tagline: 'F1 / F2 / F3 are JOBS, not players. The animal you become depends on where the puck is.',
  },
  {
    key: 'net-front',
    title: 'Net-Front Defense',
    subtitle: 'Box-out vs Front',
    corner: null,
    available: true,
    theme: 'defensive-positioning',
    tagline: 'Two right answers — pick based on the threat.',
  },
  {
    key: 'offside',
    title: 'Offside Detection',
    subtitle: 'Watch the play. Tap when offside.',
    corner: null,
    available: true,
    theme: 'rules',
    tagline: 'Different mechanic — timing, not dragging.',
  },
];

window.IceQ.scenarioByKey = (k) => window.IceQ.SCENARIOS.find(s => s.key === k);

// Dev/beta tier per minigame — shown as a badge on the home labels so we can
// see at a glance where each game sits in the build/beta priority.
//   T1 = beta leads (validated by the persona panel)
//   T2 = beta include (the rest of the "Focus 6")
//   T3 = backlog / hold for v2
// One place to read or re-rank. Edit a number, the badge updates.
window.IceQ.TIERS = {
  'ozone-entry': 1, 'dzone-coverage': 1, 'breakout-reads': 1, 'two-on-one': 1,
  'house': 2, 'ozone-faceoff': 2, 'cover-the-man': 2,
  'defensive-side': 3, 'lane-coverage': 3, 'forecheck': 3,
  'breakout': 3, 'net-front': 3, 'offside': 3,
};
window.IceQ.scenarioTier = (k) => window.IceQ.TIERS[k] || null;
