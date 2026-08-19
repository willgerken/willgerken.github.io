// Per-scenario WHY content. Each scenario gets its own answer to "why does
// this matter?" — anchored in the underlying CONCEPT, not just stats.
// Stats are used as reinforcement when they help, never as the whole story.
//
// Block types the renderer understands:
//   { type: 'lead', text }              — opening big sentence
//   { type: 'bullets', items }          — concrete reasons / mechanisms
//   { type: 'image', src, caption }     — heatmap, diagram, etc.
//   { type: 'bars', stats: [{label,pct,style,note}] }  — comparison bars (sourced from stats JSON)
//   { type: 'quote', text, attr }       — coach voice
//   { type: 'cta', text }               — what to do next practice
//   { type: 'source', text }            — where the data/inspiration came from

window.IceQ = window.IceQ || {};

// `s` is the loaded house-stats.json (may be null if not loaded yet).
window.IceQ.WHYS = {
  'house': (s) => ({
    title: 'Why protect the house?',
    blocks: [
      {
        type: 'lead',
        text: s
          ? `About ${Math.round(s.pct.pct_of_goals_in_house)}% of NHL goals are scored from inside the house.`
          : 'About 4 out of every 5 NHL goals are scored from inside the house.',
      },
      {
        type: 'bullets',
        items: [
          'Goalies see the puck later and have less time to react.',
          'Shooters have a wider angle on the net and can deflect or tip.',
          'Most rebounds land here — second and third chances stack up fast.',
        ],
      },
      ...(s ? [{
        type: 'bars',
        stats: [
          { label: 'Inside the house', pct: s.pct.sh_pct_in_house, style: 'high', note: 'of shots go in (5-on-5)' },
          { label: 'Outside the house', pct: s.pct.sh_pct_out_house, style: 'low',  note: 'of shots go in (5-on-5)' },
        ],
      }] : []),
      {
        type: 'image',
        src: 'assets/heatmap-house.png',
        caption: s
          ? `Smoothed density of ${s.data.n_sog.toLocaleString()} 5-on-5 shots from ${s.data.games_sampled} NHL games. The hot spot is exactly where you don't want opponents standing.`
          : 'NHL shot density — the hot spot is right in front of the net.',
      },
      {
        type: 'quote',
        text: s
          ? `Goalies stop about ${s.pct.sv_pct_out_house.toFixed(0)}% of perimeter shots — but only ${s.pct.sv_pct_in_house.toFixed(0)}% from the house. Keep opponents OUT of this area and you keep pucks out of your net.`
          : 'Goalies stop ~96% of perimeter shots, but only ~82% from the house. Push opponents out and you keep pucks out of your net.',
        attr: 'Coach voice',
      },
      {
        type: 'cta',
        text: 'Next practice: ask your coach "How do we push opponents OUT of the house when they get in?"',
      },
      {
        type: 'source',
        text: s
          ? `Data: NHL public API, ${s.data.games_sampled} games, 5-on-5 only. Inspired by The Hockey Think Tank's "explain the why."`
          : 'Inspired by The Hockey Think Tank\'s "explain the why."',
      },
    ],
  }),

  'defensive-side': () => ({
    title: 'Why be on the defensive side of the puck?',
    blocks: [
      {
        type: 'lead',
        text: 'If your body is between the puck and your net, they can\'t skate past you to score.',
      },
      {
        type: 'bullets',
        items: [
          '**You take away their best route.** They have to go AROUND you instead of straight at the goalie.',
          '**You buy your goalie time.** Every extra half-second helps the goalie set their angle.',
          '**Your stick is in the lane.** Even if you can\'t intercept the pass, you discourage it.',
          '**You can see the whole play.** When you\'re on the wrong side, you\'re skating to catch up. On the right side, you\'re reading.',
          '**You\'re not chasing — you\'re waiting.** Great defense is calm. The forward has to come to you.',
        ],
      },
      {
        type: 'quote',
        text: 'Feel your check with your stick. Watch the puck with your eyes. Your stick tells you where your guy is, so your eyes never have to leave the play.',
        attr: '— Quinn Hughes (via Hockey\'s Arsenal)',
      },
      {
        type: 'lead',
        text: 'Two body positions both count as "defensive side":',
      },
      {
        type: 'bullets',
        items: [
          '**Box-out** — your body between the attacker and the goalie. Use this when the goalie has the shot covered and you need to clear the rebound.',
          '**Fronting** — your body between the attacker and the puck. Use this when a cross-ice pass is the danger.',
        ],
      },
      {
        type: 'cta',
        text: 'Next practice: ask your coach "When do I box out vs. front the attacker?"',
      },
      {
        type: 'source',
        text: 'Concept: Hockey\'s Arsenal (Substack), inspired by Belfry-school defensive play.',
      },
    ],
  }),

  'forecheck': () => ({
    title: 'Why forecheck in three lanes?',
    blocks: [
      {
        type: 'lead',
        text: 'When we lose the puck deep in their zone, three of our forwards have three different jobs — not one job done three times.',
      },
      {
        type: 'bullets',
        items: [
          '🐆 **Cheetah (F1):** first one in. Direct pressure on the puck carrier — kill his time and force a bad decision.',
          '🐊 **Gator (F2):** middle support. Read the breakout pass. Snap on the loose puck.',
          '🦅 **Hawk (F3):** HIGH near the blue line as the release valve AND the safety.',
        ],
      },
      {
        type: 'lead',
        text: 'F1, F2, F3 are JOBS — not players. The animal you become depends on where YOU are when the puck is lost.',
      },
      {
        type: 'bullets',
        items: [
          'If you\'re closest to the puck → you\'re Cheetah this shift.',
          'If you\'re in the middle → you\'re Gator.',
          'If you\'re highest → you\'re Hawk. Stay there.',
          'On the next rush, you might be a totally different animal. **The roles ROTATE based on geography.**',
        ],
      },
      {
        type: 'quote',
        text: 'If all three forwards collapse to the puck, you have no outlet when you win it back. Sometimes the smartest forecheck has Hawk standing still at the blue line.',
        attr: '— Hockey\'s Arsenal (paraphrased)',
      },
      {
        type: 'cta',
        text: 'Next practice: ask your coach "Who is F1, F2, F3 on our forecheck? Does it depend on where the puck goes?"',
      },
      {
        type: 'source',
        text: 'F1/F2/F3 is standard forecheck vocabulary — coaches use these terms to talk about who attacks the puck and who holds high. The animal metaphors are an IceQ teaching aid.',
      },
    ],
  }),

  'net-front': () => ({
    title: 'Why two right answers at the net front?',
    blocks: [
      {
        type: 'lead',
        text: 'There are two ways to defend the net-front guy — and the right one depends on where the puck is.',
      },
      {
        type: 'bullets',
        items: [
          '**BOX OUT** — your body between the attacker and the goalie. Use this when a SHOT is the threat (puck at the point). You clear rebounds; goalie sees the shot through the net front.',
          '**FRONT** — your body between the attacker and the PUCK. Use this when a PASS is the threat (puck in the corner / behind the net). Your stick disrupts the cross-ice or back-door feed.',
        ],
      },
      {
        type: 'lead',
        text: 'If you box out when the threat is a pass, the receiver gets a clean tap-in. If you front when the threat is a shot, the rebound goes in. Read the puck — pick the technique.',
      },
      {
        type: 'quote',
        text: 'The hardest D-zone position to defend is the net-front. Two techniques, both correct — but you have to know WHEN.',
        attr: '— Hockey\'s Arsenal',
      },
      {
        type: 'cta',
        text: 'Next practice: ask your coach "When do I box out vs front the net-front guy?"',
      },
      {
        type: 'source',
        text: 'Box-out vs Fronting is standard youth-defensive vocabulary. The right call depends on where the puck is and what the goalie can see.',
      },
    ],
  }),

  'two-on-one': (s) => ({
    title: 'Why play the pass on a 2-on-1?',
    blocks: [
      {
        type: 'lead',
        text: 'Two attackers, one defender, one goalie. The classic 2-on-1.',
      },
      {
        type: 'bullets',
        items: [
          '**D plays the PASS.** Your stick blocks the cross-ice lane. You don\'t engage the puck carrier — you take away the easy goal.',
          '**Goalie plays the SHOT.** Goalie has to commit to the puck carrier — they can\'t cover both. So D doesn\'t need to.',
          '**The trap:** the carrier wants you to lunge at him. Don\'t. The MOMENT you commit, he passes for a tap-in.',
        ],
      },
      {
        type: 'lead',
        text: 'It feels wrong — you\'re ignoring the puck. But the math is right: a clean shot from the carrier is a save ~92% of the time. A tap-in from a cross-ice pass is a goal ~40-50% of the time.',
      },
      {
        type: 'quote',
        text: 'NHL 5-on-5 shooting % from the perimeter is around 4-5%. Cross-ice tap-ins from the slot convert at 40%+. That\'s a 10× swing — which is exactly why D plays the pass.',
        attr: '— NHL EDGE / Sense Arena IQ research (paraphrased)',
      },
      {
        type: 'quote',
        text: 'The hardest defensive habit to build at 10U: don\'t chase the puck. Especially not on a 2-on-1.',
        attr: '— USA Hockey ADM',
      },
      ...(s ? [{
        type: 'bars',
        stats: [
          { label: 'Shots from the slot', pct: s.pct.sh_pct_in_house, style: 'high', note: 'go in (5-on-5)' },
          { label: 'Shots from outside', pct: s.pct.sh_pct_out_house, style: 'low', note: 'go in (5-on-5)' },
        ],
      }] : []),
      {
        type: 'quote',
        text: 'A good hockey player plays where the puck is. A great hockey player plays where the puck is going to be.',
        attr: '— Wayne Gretzky',
      },
      {
        type: 'cta',
        text: 'Next practice: ask your coach "On a 2-on-1, do I always play the pass? When do I close on the carrier?"',
      },
      {
        type: 'source',
        text: 'D-plays-pass / goalie-plays-shot is canonical 2-on-1 D coaching. Works at every level above mites.',
      },
    ],
  }),

  'offside': () => ({
    title: 'Why does offside matter?',
    blocks: [
      {
        type: 'lead',
        text: 'Offside is the rule that keeps hockey from being chaos. No camping in the offensive zone — you have to enter WITH the puck or AFTER it.',
      },
      {
        type: 'bullets',
        items: [
          'An attacker\'s skates must NOT cross the offensive blue line before the puck does.',
          'If a player crosses early, they can "tag up" by touching their own blue line again — the play stays alive.',
          'Watch the SKATES, not the body. It is offside when BOTH skates are over the line before the puck.',
        ],
      },
      {
        type: 'lead',
        text: 'Knowing offside helps you on offense too — time your entry so you\'re ALWAYS onside. Coaches love a player who never gets called for it.',
      },
      {
        type: 'quote',
        text: 'Offside calls kill momentum. The best players time the blue line so they\'re always onside — even by half a stride.',
        attr: '— USA Hockey ADM',
      },
      {
        type: 'cta',
        text: 'At your next game: count how many offsides your team takes. Then count how many you cause vs. avoid.',
      },
      {
        type: 'source',
        text: 'USA Hockey Rule 630 — Off-sides. Tag-up rule applies at most levels.',
      },
    ],
  }),

  'lane-coverage': () => ({
    title: 'Why cover lanes instead of chasing the puck?',
    blocks: [
      {
        type: 'lead',
        text: 'When the rush comes at you, three forwards have ONE rule: stay in your lane.',
      },
      {
        type: 'bullets',
        items: [
          '**Left wing** stays in the left lane.',
          '**Center** stays in the middle.',
          '**Right wing** stays in the right lane.',
          'The strong-side wing (puck side) tightens up; the weak-side wing protects the cross-ice option.',
        ],
      },
      {
        type: 'lead',
        text: 'If everyone chases the puck, you give up the SEAM. The cross-ice pass finds a wide-open opponent and it\'s a 2-on-1 going the other way.',
      },
      {
        type: 'quote',
        text: 'Lane integrity is the simplest defensive concept and the hardest to get 10U kids to do. Once they get it, breakouts against you stop being free goals.',
        attr: '— Hockey Think Tank (paraphrased)',
      },
      {
        type: 'cta',
        text: 'Next practice: ask your coach "What\'s my lane on the backcheck? Do I switch with the center if my guy goes high?"',
      },
      {
        type: 'source',
        text: 'Lane coverage is the structural pair to Forecheck\'s role rotation. Where Forecheck is "F1/F2/F3 are jobs," Lane Coverage is "Left/Center/Right are positions."',
      },
    ],
  }),

  'breakout': () => ({
    title: 'Why three forwards on the breakout?',
    blocks: [
      {
        type: 'lead',
        text: 'The D has the puck deep. The forecheck is closing fast. Three forwards must give the D three options — Wall, Curl, Stretch.',
      },
      {
        type: 'quote',
        text: 'Teams that EXIT their zone with possession score about 3× more than teams that dump the puck out and chase it. The breakout is where the offense is built.',
        attr: '— Eric Tulsky (Carolina Hurricanes GM, hockey-analytics pioneer)',
      },
      {
        type: 'bullets',
        items: [
          '**Wall** — strong-side wing along the boards. Safest pass; even a lost battle keeps the puck in our zone.',
          '**Curl** — center curls back into the high slot. Soft inside outlet; opens up the next pass.',
          '**Stretch** — weak-side wing stays HIGH near the blue line. Long pass = fastest possible breakout.',
        ],
      },
      {
        type: 'lead',
        text: 'Why three options? Because the forecheck can take away ONE — but not three. If you give the D only two options, the forecheck shuts down both.',
      },
      {
        type: 'bullets',
        items: [
          'If wall is pressured → D goes to **curl**.',
          'If curl is pressured → D goes to **wall** or **D-to-D**.',
          'If everything\'s sealed → **stretch** for the long pass, or **D-to-D** to reset.',
        ],
      },
      {
        type: 'quote',
        text: 'Win the breakout, win the game. Most goals against come from broken breakouts that leak into odd-man rushes.',
        attr: '— Karl Alzner (paraphrased)',
      },
      {
        type: 'cta',
        text: 'Next practice: ask your coach "What\'s our breakout? When do I curl, when do I stretch?"',
      },
      {
        type: 'source',
        text: 'Wall/Curl/Stretch is standard youth-hockey breakout vocabulary. Built around the principle that the D needs MULTIPLE options, not just one.',
      },
    ],
  }),

  'cover-the-man': (s) => ({
    title: 'Why cover the man instead of chasing the puck?',
    blocks: [
      {
        type: 'lead',
        text: 'When you chase the puck, you leave your guy alone. He\'s the one who scores — not the puck carrier.',
      },
      {
        type: 'quote',
        text: 'Shots that come AFTER a pass score about 2× more often than shots taken right off the rush. The receiver — the open guy — is the dangerous one. Cover him.',
        attr: '— NHL public-API analysis (5-on-5, recent season)',
      },
      {
        type: 'bullets',
        items: [
          '**Most goals come off a pass, not a solo carry.** The receiver in the slot is the dangerous man. Cover him and the play dies.',
          '**Two of us on one puck = one of them wide open.** Usually the guy in front of our net.',
          '**Stick on stick beats body on puck.** A stick in the passing lane takes away the option without committing your body.',
          '**The puck carrier is being pressured by your D-man already.** You don\'t need to pile on. Stay home.',
        ],
      },
      {
        type: 'quote',
        text: 'The best defenders look bored. They\'re just standing there. But every pass goes off their stick or to a guy they\'re fronting. Boring is elite.',
        attr: '— Karl Alzner (via Our Kids Play Hockey)',
      },
      ...(s ? [{
        type: 'bars',
        stats: [
          { label: 'Shots from the slot', pct: s.pct.sh_pct_in_house, style: 'high', note: 'go in — that\'s your man' },
          { label: 'Shots from outside', pct: s.pct.sh_pct_out_house, style: 'low', note: 'go in (5-on-5)' },
        ],
      }] : []),
      {
        type: 'quote',
        text: 'Cover the man, not the puck. The puck can only go where a man is.',
        attr: '— Coach',
      },
      {
        type: 'cta',
        text: 'Next practice: ask your coach "Who am I supposed to cover in the d-zone? How do I switch if my guy goes high?"',
      },
      {
        type: 'source',
        text: 'Concept: USA Hockey ADM "stick on stick, not chase" — reinforced by Karl Alzner / Belfry / HTT.',
      },
    ],
  }),

  'dzone-coverage': (s) => ({
    title: 'Why protect the Danger Zone?',
    blocks: [
      {
        type: 'lead',
        text: 'In our own end we play man-to-man in our zone — cover YOUR guy — and everybody protects the middle (the Danger Zone).',
      },
      {
        type: 'bullets',
        items: [
          '**Everybody:** don\'t let anyone get open in your zone. Cover the biggest threat. Drop everything to protect the Danger Zone.',
          '**Wingers:** your job is the easiest — stay UP on your point. Only help low if you\'re SURE you can get back.',
          '**Centre & D (a 3-man unit):** stay between your man and the net, both sides of the net covered. Only ONE D ever leaves the Danger Zone to attack the puck wide.',
          '**The Centre never leaves the Danger Zone** — they help along the boards and jump on loose pucks, but the middle is theirs.',
        ],
      },
      {
        type: 'lead',
        text: 'Why? Because the goals come from the middle. If two players chase the same puck into the corner, somebody\'s man is now wide open in the slot for a tap-in.',
      },
      ...(s ? [{
        type: 'bars',
        stats: [
          { label: 'Shots from the Danger Zone', pct: s.pct.sh_pct_in_house, style: 'high', note: 'go in (5-on-5)' },
          { label: 'Shots from outside it', pct: s.pct.sh_pct_out_house, style: 'low', note: 'go in (5-on-5)' },
        ],
      }] : []),
      {
        type: 'quote',
        text: 'Boring defense is great defense. If you\'re diving and scrambling, you\'re out of position. If you\'re just there, ahead of the play — that\'s elite.',
        attr: '— Karl Alzner (via Our Kids Play Hockey)',
      },
      {
        type: 'quote',
        text: 'Skate to open ice. If you are standing where a defender already is, you are helping him.',
        attr: '— Coach',
      },
      {
        type: 'cta',
        text: 'Next practice: ask your coach "In our D-zone, who do I cover — and when am I allowed to leave the middle?"',
      },
      {
        type: 'source',
        text: 'Straight from our team playbook: "Defensive Zone Coverage — play man-to-man in your zone." The Danger Zone is the playbook\'s red-shaded middle.',
      },
    ],
  }),

  'breakout-reads': () => ({
    title: 'Why FOUR breakouts?',
    blocks: [
      {
        type: 'lead',
        text: 'Our playbook has four ways to break out — D-Wheel, D-to-D, Reverse, and Weak-Side Rim. The skill isn\'t doing one of them. It\'s READING the forecheck and picking the right one.',
      },
      {
        type: 'bullets',
        items: [
          '**D-Wheel** — soft or late forecheck. You\'ve got time, so skate it out yourself and start the rush with speed.',
          '**D-to-D** — F1 is on YOU but your partner D is open. The simplest play beats the pressure: move it across.',
          '**Reverse** — they cheat hard to your strong side expecting the wheel. Fake up, then reverse the puck behind the net the other way.',
          '**Weak-Side Rim** — they jam your strong-side wall. Don\'t force it — rim it around to the open weak-side wing.',
        ],
      },
      {
        type: 'lead',
        text: 'A breakout isn\'t a memorized routine — it\'s a decision. The forecheck tells you which one to run. Run the wrong one INTO the pressure and you turn it over for an odd-man rush the other way.',
      },
      {
        type: 'quote',
        text: 'A strong breakout requires all five players working together. The D makes a smart, simple first pass; the forwards work hard away from the puck to get open. Win the breakout, win the game.',
        attr: '— Our team playbook',
      },
      {
        type: 'quote',
        text: 'Teams that EXIT their zone with possession score about 3× more than teams that dump it out and chase. The breakout is where the offense is built — so reading it right matters.',
        attr: '— Eric Tulsky (Carolina Hurricanes GM, hockey-analytics pioneer)',
      },
      {
        type: 'quote',
        text: 'Know your outlet before the puck gets to you. The read happens BEFORE the pass.',
        attr: '— Coach',
      },
      {
        type: 'cta',
        text: 'Next practice: ask your coach "How do I know which breakout to call — what am I reading in the forecheck?"',
      },
      {
        type: 'source',
        text: 'Straight from our team playbook: "Defensive Breakouts — D Wheel / D to D / Reverse / Weak Side Rim."',
      },
    ],
  }),

  'pinch-read': () => ({
    title: 'Why is pinching a read, not a habit?',
    blocks: [
      { type: 'lead', text: 'A good pinch keeps the puck in their end. A bad one hands them a 2-on-1 the other way. Same move, opposite result, and the difference is two things you can see before you go.' },
      { type: 'bullets', items: [
        '**Is anybody high?** If F3 is above the circles, the point is covered when you leave it. If everybody is below the dots, a missed pinch is an odd-man rush against.',
        '**Can you win the race?** A winger standing flat-footed on the wall, or a bobbled rim, is yours. A winger already flying with speed is not, and he will be around you.',
        '**Peeling is not losing.** Giving up the zone on purpose and keeping the numbers even is a defensive play, not a failure.',
        '**Decide early.** A pinch that starts late is a coin flip. If you are not sure by the time the puck is at the hash marks, peel.',
      ]},
      { type: 'quote', text: 'Pinch with support. Peel without it. Never guess.', attr: '— Coach' },
      { type: 'cta', text: 'Next practice: ask your coach "When do you want our D to pinch, and who has to be high for that?"' },
      { type: 'source', text: 'Standard D-zone-exit / O-zone-possession read taught at 12U+; the F3-high rule is the usual trigger.' },
    ],
  }),

  'ozone-cycle': () => ({
    title: 'Why does the timing of the drop matter?',
    blocks: [
      {
        type: 'lead',
        text: 'A cycle is how you keep the puck in their end when the first play is not there. It only works if the bump leaves your stick at the right moment.',
      },
      {
        type: 'bullets',
        items: [
          '**Too early** and the trailer is not there yet: the puck goes to empty wall and their D is first to it.',
          '**Too late** and the D has you sealed on the boards: the puck gets poked off the glass and out.',
          '**The pocket** is the beat in between: trailer under you with speed, D committed to you, lane clean.',
          '**Read the lane, not just the trailer.** If a backchecker is sitting where the bump goes, or nobody came, the right play is to keep it and cut to the middle.',
          '**F3 stays high.** Three below the dots is a rush the other way waiting to happen.',
        ],
      },
      {
        type: 'quote',
        text: 'Possession is the whole point of the cycle. One bad bump gives it back.',
        attr: '— Coach',
      },
      {
        type: 'cta',
        text: 'Next practice: ask your coach "On our cycle, who is the trailer and where does F3 live?"',
      },
      {
        type: 'source',
        text: 'Standard low-zone cycle as taught at 12U+ (USA Hockey ADM small-area games build exactly this read).',
      },
    ],
  }),

  'ozone-entry': (s) => ({
    title: 'Why drive the middle lane?',
    blocks: [
      {
        type: 'lead',
        text: 'On the rush there are three lanes: left, middle, right. Each attacker owns ONE. The whole thing falls apart when two of you end up in the same lane — because then one defender covers you both, and he did it without working.',
      },
      {
        type: 'bullets',
        items: [
          '**F1 has the puck wide** — he attacks down his wall.',
          '**F2 drives the MIDDLE lane** — hard, to the net. Not curling. Not following the puck.',
          '**F3 fills the far lane** — the back door stays honest.',
          '**Weak-side D is the 4th attacker** — joining late into the high slot, IF he isn\'t the last man back.',
        ],
      },
      {
        type: 'lead',
        text: 'The middle lane drive works even when you never touch the puck. Their weak-side D has to turn and skate with you, and the second he does, the seam opens behind him. If nobody drives, their D just stands there and watches the puck — and there\'s no one at the net for the rebound.',
      },
      ...(s ? [{
        type: 'bars',
        stats: [
          { label: 'Shots from the slot', pct: s.pct.sh_pct_in_house, style: 'high', note: 'go in (5-on-5)' },
          { label: 'Shots from outside', pct: s.pct.sh_pct_out_house, style: 'low', note: 'go in (5-on-5)' },
        ],
      }] : []),
      {
        type: 'lead',
        text: 'That gap is the whole argument. Driving the middle lane is how you get to the shots on the top bar instead of the ones on the bottom.',
      },
      {
        type: 'quote',
        text: 'Play the pass. The shooter has to beat the goalie; the pass beats everybody.',
        attr: '— Coach',
      },
      {
        type: 'quote',
        text: 'The 4th attacker is a read, not a rule. If you are the last man back, you stay — everything past you is a breakaway.',
        attr: '— Coach, video session',
      },
      {
        type: 'cta',
        text: 'Next video session: ask Coach "When I\'m the weak-side D, what am I looking at before I decide to join the rush?"',
      },
      {
        type: 'source',
        text: 'Straight from our video session: Puck Protection / Offensive Zone Entry / Middle Lane Drive / Weak-side D joining the rush as the 4th attacker.',
      },
    ],
  }),

  'ozone-faceoff': () => ({
    title: 'Why memorize the faceoff calls?',
    blocks: [
      {
        type: 'lead',
        text: 'An offensive-zone faceoff is a free chance to create offense — IF everyone knows the play before the puck drops.',
      },
      {
        type: 'bullets',
        items: [
          '**RED — Center Shot:** the shot comes from the slot / center.',
          '**BLACK — Wall Wing Shot/D:** the shot comes from the wall (boards) side.',
          '**GOLD — Wing/D Shot:** the shot comes from the weak side.',
        ],
      },
      {
        type: 'lead',
        text: 'When the bench yells "RED," you can\'t be thinking about it — you have to already KNOW where you\'re going. That half-second is the difference between a shot on net and a scramble.',
      },
      {
        type: 'quote',
        text: 'Winning faceoffs is not just about the center. Wingers and defensemen must react quickly, support the puck, and be ready for loose pucks instead of standing still and watching.',
        attr: '— Our team playbook',
      },
      {
        type: 'quote',
        text: 'The player who already knows the play gets the first shot. On a set play, preparation IS the move — you can\'t think your way through it after the puck drops.',
        attr: '— Coach\'s voice',
      },
      {
        type: 'cta',
        text: 'Drill it both ways: hear the call → know the shot, and see the shot → name the call. When both are automatic, you\'re ready.',
      },
      {
        type: 'source',
        text: 'Straight from our team playbook: "Offensive Zone Faceoffs — Center Shot (Red) / Wall Wing Shot-D (Black) / Wing-D Shot (Gold)."',
      },
    ],
  }),
};
