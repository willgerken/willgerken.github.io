// Scenario registry. Each entry maps to one target on the home-page goal.
// Targets are positioned at the 4 inside corners of the net, like shooting tutors.

window.IceQ = window.IceQ || {};

// The SIX goal-target corners are the showcase games. Everything else has
// corner:null and falls into "More drills" below, so a coach lands on a tight
// six instead of a wall of twelve. To swap a game in or out, move a corner value.
//
// The six are chosen for COVERAGE, not just polish — between them they should
// span the phases of the game and the ways a kid can be asked a question:
//   House          spatial map, where danger is      (tap a grid)
//   D-Zone         own-zone man coverage             (drag)
//   Breakout Reads getting OUT of your own end       (tap a named choice)
//   2-on-1         defending an odd-man rush         (drag)
//   O-Zone Entry   offense WITHOUT the puck          (drag)
//   Offside        a rule, judged on timing          (tap when it happens)
// Two games teaching the same idea with the same mechanic is a wasted slot —
// that is why cover-the-man came out and offside went in.
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
  // ===== Veterans (13U+). Not on the goal; listed under their own header. =====
  {
    key: 'ozone-cycle',
    title: 'O-Zone Cycle',
    subtitle: 'Time the drop',
    corner: null,
    available: true,
    level: 'veteran',
    theme: 'offense',
    tagline: 'F1 up the wall, trailer underneath. Tap DROP in the pocket. Sometimes the read is to keep it.',
  },
  // ===== "More drills" — beyond the six showcase targets. No corner on the goal;
  // they render in the secondary list below for extra practice. =====
  {
    key: 'breakout',
    title: 'Breakout',
    subtitle: 'Wall · Curl · Stretch',
    corner: null,
    // HIDDEN 2026-08-18 (Will: "hide broken drills until ship-ready"). Audit
    // found this one not ready; see quality_reports/plans/2026-08-18_hockey_iceq_polish_plan.md.
    // Flip back to true only after its fixes land AND the click-through passes.
    available: false,
    theme: 'transition',
    tagline: 'Three forwards, three support spots. Win the breakout, win the game.',
  },
  {
    key: 'cover-the-man',
    title: 'Cover the Man',
    subtitle: "Don't puck-chase",
    // Dropped from the hero six 2026-08-05. It teaches the same idea as D-Zone
    // Coverage with the same drag mechanic and fewer reads (3 vs 5), the review
    // panel found kids bored by it, and it is the only game that was in the
    // showcase without a coordinate audit. Offside took the slot: it adds a
    // RULES concept and a timing mechanic, so the six now span more of the game.
    corner: null,
    available: true,
    theme: 'defensive-positioning',
    tagline: 'Stick on stick beats skating to the puck.',
  },
  {
    key: 'defensive-side',
    title: 'Defensive Side of the Puck',
    subtitle: 'Body between puck and net',
    corner: null,
    // HIDDEN 2026-08-18 (Will: "hide broken drills until ship-ready"). Audit
    // found this one not ready; see quality_reports/plans/2026-08-18_hockey_iceq_polish_plan.md.
    // Flip back to true only after its fixes land AND the click-through passes.
    available: false,
    theme: 'defensive-positioning',
    tagline: "Feel your check. Watch the puck with your eyes.",
  },
  {
    key: 'lane-coverage',
    title: 'Lane Coverage',
    subtitle: 'Three lanes, three jobs',
    corner: null,
    // HIDDEN 2026-08-18 (Will: "hide broken drills until ship-ready"). Audit
    // found this one not ready; see quality_reports/plans/2026-08-18_hockey_iceq_polish_plan.md.
    // Flip back to true only after its fixes land AND the click-through passes.
    available: false,
    theme: 'defensive-positioning',
    tagline: 'When the rush comes at you, fill your lane — don\'t chase the puck.',
  },
  {
    key: 'forecheck',
    title: 'Forecheck Lanes',
    subtitle: 'Cheetah · Gator · Hawk',
    corner: null,
    // HIDDEN 2026-08-18 (Will: "hide broken drills until ship-ready"). Audit
    // found this one not ready; see quality_reports/plans/2026-08-18_hockey_iceq_polish_plan.md.
    // Flip back to true only after its fixes land AND the click-through passes.
    available: false,
    theme: 'defensive-positioning',
    tagline: 'F1 / F2 / F3 are JOBS, not players. The animal you become depends on where the puck is.',
  },
  {
    key: 'net-front',
    title: 'Net-Front Defense',
    subtitle: 'Box-out vs Front',
    corner: null,
    // HIDDEN 2026-08-18 (Will: "hide broken drills until ship-ready"). Audit
    // found this one not ready; see quality_reports/plans/2026-08-18_hockey_iceq_polish_plan.md.
    // Flip back to true only after its fixes land AND the click-through passes.
    available: false,
    theme: 'defensive-positioning',
    tagline: 'Two right answers — pick based on the threat.',
  },
  {
    key: 'offside',
    title: 'Offside Detection',
    subtitle: 'Watch the play. Tap when offside.',
    corner: 'BR',
    available: true,
    theme: 'rules',
    tagline: 'Different mechanic — timing, not dragging.',
  },
];

// 'rookie' (default) vs 'veteran' (13U+): drives the home page grouping.
window.IceQ.scenarioLevel = (s) => (s && s.level) || 'rookie';

window.IceQ.scenarioByKey = (k) => window.IceQ.SCENARIOS.find(s => s.key === k);

// Dev/beta tier per minigame — shown as a badge on the home labels so we can
// see at a glance where each game sits in the build/beta priority.
//   T1 = beta leads (validated by the persona panel)
//   T2 = beta include (the rest of the "Focus 6")
//   T3 = backlog / hold for v2
// One place to read or re-rank. Edit a number, the badge updates.
window.IceQ.TIERS = {
  'ozone-entry': 1, 'dzone-coverage': 1, 'breakout-reads': 1, 'two-on-one': 1,
  'house': 2, 'offside': 2, 'ozone-faceoff': 2,
  'cover-the-man': 3, 'defensive-side': 3, 'lane-coverage': 3,
  'forecheck': 3, 'breakout': 3, 'net-front': 3,
};
// T1/T2/T3 means nothing to a coach — hide the badges in any build he sees.
window.IceQ.SHOW_TIER_BADGES = false;
window.IceQ.scenarioTier = (k) => window.IceQ.TIERS[k] || null;
