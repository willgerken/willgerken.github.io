// Home page: renders the goal + 4 corner targets. Each target is a scenario.
// Completed targets animate off with a puck-impact; pending ones pulse.
// Locked targets are dim. Taps navigate to the scenario view.

window.IceQ = window.IceQ || {};

// Compute the kid's current "completion streak" — number of consecutive days
// (including today) on which at least one scenario was completed. Stored in
// localStorage as iceq.streak.v1 = { lastDate: 'YYYY-MM-DD', count: N }.
function computeStreak() {
  try {
    const raw = localStorage.getItem('iceq.streak.v1');
    if (!raw) return 0;
    const { lastDate, count } = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    if (lastDate === today) return count;
    // If lastDate was yesterday, streak still alive (but kid hasn't done
    // today's drill yet — show prior count). If older than yesterday, dead.
    const last = new Date(lastDate);
    const todayD = new Date(today);
    const diff = (todayD - last) / (1000 * 60 * 60 * 24);
    if (diff <= 1.5) return count;
    return 0;
  } catch { return 0; }
}

// Bump the streak when a scenario is marked complete. Called from progress.js.
window.IceQ = window.IceQ || {};
window.IceQ.bumpStreak = function () {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem('iceq.streak.v1');
    if (raw) {
      const { lastDate, count } = JSON.parse(raw);
      if (lastDate === today) return count;            // already counted today
      const last = new Date(lastDate);
      const todayD = new Date(today);
      const diff = (todayD - last) / (1000 * 60 * 60 * 24);
      const newCount = (diff <= 1.5) ? count + 1 : 1;
      localStorage.setItem('iceq.streak.v1', JSON.stringify({ lastDate: today, count: newCount }));
      return newCount;
    }
    localStorage.setItem('iceq.streak.v1', JSON.stringify({ lastDate: today, count: 1 }));
    return 1;
  } catch { return 0; }
};

window.IceQ.Home = (function () {
  const NS = 'http://www.w3.org/2000/svg';

  // Goal geometry — straight-on view (matches the reference shooting-tutor
  // photo). 6:4 NHL goal proportions. Subtle depth suggested by mesh lines,
  // not by aggressive perspective.
  const G = {
    vbW: 480,
    vbH: 320,
    postX1: 50,   // inside-left post
    postX2: 430,  // inside-right post
    barY: 50,     // inside top of crossbar
    baseY: 280,   // goal line
    postW: 9,     // post thickness
  };

  // Six targets — 4 inside corners + 2 middle (real shooting tutors come in
  // 6-target sets too). Top-middle hangs off the crossbar; bottom-middle sits
  // along the goal line.
  const CORNER_POS = {
    TL: { cx: G.postX1 + 42, cy: G.barY + 42 },
    TM: { cx: (G.postX1 + G.postX2) / 2, cy: G.barY + 42 },
    TR: { cx: G.postX2 - 42, cy: G.barY + 42 },
    BL: { cx: G.postX1 + 42, cy: G.baseY - 42 },
    BM: { cx: (G.postX1 + G.postX2) / 2, cy: G.baseY - 42 },
    BR: { cx: G.postX2 - 42, cy: G.baseY - 42 },
  };

  function el(tag, attrs = {}, children = []) {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    for (const c of children) node.appendChild(c);
    return node;
  }

  function renderGoal(svg) {
    svg.setAttribute('viewBox', `0 0 ${G.vbW} ${G.vbH}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // ===== Defs =====
    const defs = el('defs');
    // Red frame gradient — slight cylindrical sheen
    const frameGrad = el('linearGradient', {
      id: 'iceq-frame-grad', x1: '0', y1: '0', x2: '0', y2: '1',
    });
    frameGrad.appendChild(el('stop', { offset: '0%', 'stop-color': '#E0303E' }));
    frameGrad.appendChild(el('stop', { offset: '50%', 'stop-color': '#CE202E' }));
    frameGrad.appendChild(el('stop', { offset: '100%', 'stop-color': '#9F1822' }));
    defs.appendChild(frameGrad);
    // Net interior — light at top, slightly darker at bottom
    const netGrad = el('linearGradient', {
      id: 'iceq-net-grad', x1: '0.5', y1: '0', x2: '0.5', y2: '1',
    });
    netGrad.appendChild(el('stop', { offset: '0%', 'stop-color': '#F8F8F8' }));
    netGrad.appendChild(el('stop', { offset: '100%', 'stop-color': '#D0D0D0' }));
    defs.appendChild(netGrad);
    // Clip path for mesh — must be exactly the inside of the frame
    const clipPath = el('clipPath', { id: 'iceq-net-clip' });
    clipPath.appendChild(el('rect', {
      x: G.postX1, y: G.barY,
      width: G.postX2 - G.postX1, height: G.baseY - G.barY,
    }));
    defs.appendChild(clipPath);
    svg.appendChild(defs);

    // ===== Ice surface =====
    svg.appendChild(el('rect', {
      x: 0, y: G.baseY, width: G.vbW, height: G.vbH - G.baseY,
      fill: '#F0F7FC',
    }));
    // Ground shadow under the goal
    svg.appendChild(el('ellipse', {
      cx: G.vbW / 2, cy: G.baseY + 24, rx: 220, ry: 8,
      fill: 'rgba(0,0,0,0.30)',
    }));

    // ===== NET INTERIOR (white fill behind the frame) =====
    svg.appendChild(el('rect', {
      x: G.postX1, y: G.barY,
      width: G.postX2 - G.postX1, height: G.baseY - G.barY,
      fill: 'url(#iceq-net-grad)',
    }));

    // ===== MESH WEAVE — clean diagonal cross-hatch, clipped to interior =====
    const mesh = el('g', {
      stroke: 'rgba(160,160,160,0.55)', 'stroke-width': '0.7',
      'clip-path': 'url(#iceq-net-clip)',
    });
    const step = 14;
    const meshStartY = G.barY;
    const meshEndY = G.baseY;
    const meshHeight = meshEndY - meshStartY;
    // Diagonals going down-right (\\)
    for (let off = G.postX1 - meshHeight; off <= G.postX2; off += step) {
      mesh.appendChild(el('line', {
        x1: off, y1: meshStartY,
        x2: off + meshHeight, y2: meshEndY,
      }));
    }
    // Diagonals going down-left (//)
    for (let off = G.postX1; off <= G.postX2 + meshHeight; off += step) {
      mesh.appendChild(el('line', {
        x1: off, y1: meshStartY,
        x2: off - meshHeight, y2: meshEndY,
      }));
    }
    svg.appendChild(mesh);

    // Vertical center support pole (real goals have one)
    svg.appendChild(el('line', {
      x1: G.vbW / 2, y1: G.barY + 2,
      x2: G.vbW / 2, y2: G.baseY - 2,
      stroke: 'rgba(120,120,120,0.7)', 'stroke-width': '2',
    }));

    // ===== GOAL FRAME — red posts + crossbar =====
    // Left post
    svg.appendChild(el('rect', {
      x: G.postX1 - G.postW, y: G.barY - G.postW,
      width: G.postW, height: G.baseY - G.barY + G.postW + 1,
      fill: 'url(#iceq-frame-grad)', rx: G.postW / 2,
    }));
    // Right post
    svg.appendChild(el('rect', {
      x: G.postX2, y: G.barY - G.postW,
      width: G.postW, height: G.baseY - G.barY + G.postW + 1,
      fill: 'url(#iceq-frame-grad)', rx: G.postW / 2,
    }));
    // Crossbar
    svg.appendChild(el('rect', {
      x: G.postX1 - G.postW, y: G.barY - G.postW,
      width: G.postX2 - G.postX1 + 2 * G.postW, height: G.postW,
      fill: 'url(#iceq-frame-grad)', rx: G.postW / 2,
    }));
    // Crossbar highlight stripe
    svg.appendChild(el('rect', {
      x: G.postX1 - G.postW + 2, y: G.barY - G.postW + 1.5,
      width: G.postX2 - G.postX1 + 2 * G.postW - 4, height: 1.2,
      fill: 'rgba(255,255,255,0.45)',
    }));

    // ===== Goal pegs (where posts meet the ice) =====
    for (const px of [G.postX1 - G.postW / 2, G.postX2 + G.postW / 2]) {
      svg.appendChild(el('circle', {
        cx: px, cy: G.baseY + 2, r: 3.5,
        fill: '#2A0510',
      }));
    }

    // ===== Goal line on the ice =====
    svg.appendChild(el('line', {
      x1: 10, y1: G.baseY,
      x2: G.vbW - 10, y2: G.baseY,
      stroke: '#CE202E', 'stroke-width': '1.5', opacity: 0.6,
    }));
  }

  function renderTarget(svg, scenario, state) {
    const pos = CORNER_POS[scenario.corner];
    if (!pos) return;
    const g = el('g', {
      class: `target target-${state} target-${scenario.corner}`,
      'data-scenario': scenario.key,
      transform: `translate(${pos.cx} ${pos.cy})`,
      style: 'cursor: pointer;',
    });

    const R = 30;
    if (state === 'complete') {
      // Knocked off — show empty corner with a faint ghost ring
      g.appendChild(el('circle', { r: R, fill: 'none', stroke: 'rgba(224,198,138,0.25)', 'stroke-width': 1, 'stroke-dasharray': '3 4' }));
      g.appendChild(el('text', {
        x: 0, y: 5,
        'text-anchor': 'middle',
        'font-size': 16,
        'font-weight': 900,
        fill: '#E0C68A',
      })).textContent = '✓';
    } else if (state === 'locked') {
      // Coming soon — grayed out
      g.appendChild(el('circle', { r: R, fill: '#4A4A4A', stroke: '#6A6A6A', 'stroke-width': 2 }));
      g.appendChild(el('circle', { r: R - 6, fill: '#5A5A5A' }));
      g.appendChild(el('circle', { r: R - 14, fill: '#4A4A4A' }));
      g.appendChild(el('text', {
        x: 0, y: 5,
        'text-anchor': 'middle',
        'font-size': 14,
        'font-weight': 800,
        fill: '#999',
      })).textContent = '🔒';
    } else {
      // Fresh target — classic red/white shooting tutor with bullseye center
      g.appendChild(el('circle', { r: R, fill: '#F2F2F2', stroke: '#CE202E', 'stroke-width': 3 }));
      g.appendChild(el('circle', { r: R - 6, fill: '#CE202E' }));
      g.appendChild(el('circle', { r: R - 12, fill: '#F2F2F2' }));
      g.appendChild(el('circle', { r: R - 17, fill: '#CE202E' }));
      // Subtle gold ring pulse
      const pulse = el('circle', {
        r: R + 2, fill: 'none', stroke: '#E0C68A', 'stroke-width': 2,
        opacity: 0.6,
      });
      g.appendChild(pulse);
      // Pulse animation (native SVG)
      const a = el('animate', {
        attributeName: 'r',
        values: `${R + 2};${R + 8};${R + 2}`,
        dur: '2.4s',
        repeatCount: 'indefinite',
      });
      const aop = el('animate', {
        attributeName: 'opacity',
        values: '0.6;0;0.6',
        dur: '2.4s',
        repeatCount: 'indefinite',
      });
      pulse.appendChild(a);
      pulse.appendChild(aop);
    }

    svg.appendChild(g);
  }

  function renderHome(container, state) {
    container.innerHTML = '';
    container.classList.add('home-view');

    // Header
    const title = document.createElement('div');
    title.className = 'home-title';
    title.innerHTML = `
      <h2>Knock 'em all off</h2>
      <p class="home-sub">Tap a target to learn the concept. Finish the scenario and the target comes off.</p>
    `;
    container.appendChild(title);

    // Progress
    // POC: the headline counts the six showcase targets (the goal corners), not
    // all twelve — keeps the hero focused on "knock the six off".
    const showcaseScens = IceQ.SCENARIOS.filter(s => s.available && s.corner);
    const total = showcaseScens.length;
    const done = showcaseScens.filter(s => IceQ.Progress.isComplete(s.key)).length;
    const prog = document.createElement('div');
    prog.className = 'home-progress';
    prog.innerHTML = `<strong>${done}</strong> of <strong>${total}</strong> knocked off`;
    container.appendChild(prog);

    // Goal SVG
    const wrap = document.createElement('div');
    wrap.className = 'goal-wrap';
    const svg = document.createElementNS(NS, 'svg');
    svg.classList.add('goal-svg');
    renderGoal(svg);

    // Targets — iterate scenarios, render only those with a corner on the goal.
    // Scenarios without a corner are list-only (still appear in the scenario list).
    const stateOf = (s) => {
      if (!s.available) return 'locked';
      return IceQ.Progress.isComplete(s.key) ? 'complete' : 'fresh';
    };
    for (const scen of IceQ.SCENARIOS) {
      if (!scen.corner) continue;
      renderTarget(svg, scen, stateOf(scen));
    }
    wrap.appendChild(svg);
    container.appendChild(wrap);

    // Daily Drill banner — featured scenario for today, seeded by date so it
    // stays the same all day but rotates daily.
    const todayKey = new Date().toISOString().slice(0, 10);
    const dailyHash = todayKey.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0);
    const allAvail = IceQ.SCENARIOS.filter(s => s.available && s.corner);
    const todayScen = allAvail[Math.abs(dailyHash) % allAvail.length];
    const streak = computeStreak();

    const drillBanner = document.createElement('div');
    drillBanner.className = 'daily-drill';
    drillBanner.innerHTML = `
      <button class="daily-drill-tap" data-scenario="${todayScen.key}">
        <span class="daily-drill-label">🎯 Today's Drill</span>
        <strong class="daily-drill-title">${todayScen.title}</strong>
        <span class="daily-drill-sub">${todayScen.subtitle}</span>
      </button>
      ${streak > 0 && IceQ.Progress.streakEnabled() ? `<div class="daily-streak">🔥 ${streak}-day streak <button class="streak-off" id="btn-streak-off" title="Turn the streak off">turn off</button></div>` : ''}
    `;
    drillBanner.querySelector('.daily-drill-tap').addEventListener('click', () => {
      location.hash = `#/${todayScen.key}`;
    });
    container.appendChild(drillBanner);

    // Beta notice. Deliberately at the TOP of the home screen and deliberately
    // blunt: this has not been through a season with real kids, and a coach
    // needs to know that before he points ten of them at it.
    const beta = document.createElement('div');
    beta.className = 'beta-note';
    beta.innerHTML = `
      <strong>Beta.</strong> Still being checked. The hockey in here has been
      reviewed but not run past a full team, so treat anything that looks wrong
      as probably wrong, and tell me. Nothing here should override your coach.
    `;
    container.appendChild(beta);

    // Scenario list — broken into two sections:
    //   "Goal Targets" (corner-mapped scenarios)
    //   "Game Situations" (list-only scenarios — Net-Front, 2-on-1, Offside)
    const cornerScenarios = IceQ.SCENARIOS.filter(s => s.corner);
    const listOnlyScenarios = IceQ.SCENARIOS.filter(s => !s.corner);

    function makeListItem(scen) {
      const st = stateOf(scen);
      const btn = document.createElement('button');
      btn.className = `home-item home-item-${st}`;
      btn.dataset.scenario = scen.key;
      btn.innerHTML = `
        <span class="home-item-check">${st === 'complete' ? '✓' : st === 'locked' ? '·' : '○'}</span>
        <span class="home-item-body">
          <strong>${scen.title}</strong>${(IceQ.SHOW_TIER_BADGES && window.IceQ.scenarioTier && IceQ.scenarioTier(scen.key)) ? ` <span class="tier-badge tier-${IceQ.scenarioTier(scen.key)}">T${IceQ.scenarioTier(scen.key)}</span>` : ''}
          <span class="home-item-sub">${scen.subtitle}</span>
        </span>
        <span class="home-item-status">${st === 'locked' ? 'Coming soon' : st === 'complete' ? 'Done' : 'Start'}</span>
      `;
      if (st !== 'locked') {
        btn.addEventListener('click', () => location.hash = `#/${scen.key}`);
      } else {
        btn.disabled = true;
      }
      return btn;
    }

    const coreHeader = document.createElement('h3');
    coreHeader.className = 'home-section-header';
    coreHeader.textContent = '🎯 The Drills';
    container.appendChild(coreHeader);
    const list = document.createElement('nav');
    list.className = 'home-list';
    cornerScenarios.forEach(s => list.appendChild(makeListItem(s)));
    container.appendChild(list);

    if (listOnlyScenarios.length) {
      const sectionHeader = document.createElement('h3');
      sectionHeader.className = 'home-section-header';
      sectionHeader.textContent = 'More drills';
      container.appendChild(sectionHeader);
      const subText = document.createElement('p');
      subText.className = 'home-section-sub';
      subText.textContent = 'Extra concepts beyond the core six.';
      container.appendChild(subText);
      const list2 = document.createElement('nav');
      list2.className = 'home-list';
      listOnlyScenarios.forEach(s => list2.appendChild(makeListItem(s)));
      container.appendChild(list2);
    }

    // Tap-target-on-goal handler (delegated)
    svg.addEventListener('click', (e) => {
      const g = e.target.closest('[data-scenario]');
      if (!g) return;
      const key = g.getAttribute('data-scenario');
      const scen = IceQ.scenarioByKey(key);
      if (scen && scen.available) {
        location.hash = `#/${key}`;
      }
    });

    // Reset button (small, bottom-corner)
    const reset = document.createElement('button');
    reset.className = 'home-reset';
    reset.textContent = 'Reset progress';
    reset.addEventListener('click', () => {
      if (confirm('Clear all scenario progress? (Your learning is saved — targets just reset so you can replay.)')) {
        IceQ.Progress.reset();
        renderHome(container, {});
      }
    });
    container.appendChild(reset);

    // Just-completed animation: if the URL hash dropped `#/done/<key>`,
    // we play the puck-knock-off animation on that target, then clean the URL.
    if (state && state.justCompleted) {
      animateKnockOff(svg, state.justCompleted);
    }
  }

  function animateKnockOff(svg, scenarioKey) {
    const target = svg.querySelector(`[data-scenario="${scenarioKey}"]`);
    if (!target) return;
    const pos = CORNER_POS[IceQ.scenarioByKey(scenarioKey)?.corner];
    if (!pos) return;

    // Create a puck starting from the bottom center of the SVG
    const puck = el('circle', {
      cx: G.vbW / 2, cy: G.vbH - 6, r: 8,
      fill: '#0A0A0A', stroke: '#444', 'stroke-width': 1,
    });
    svg.appendChild(puck);

    // Animate puck toward target corner
    const anim = puck.animate(
      [
        { transform: 'translate(0, 0)' },
        { transform: `translate(${pos.cx - G.vbW / 2}px, ${pos.cy - (G.vbH - 6)}px)` },
      ],
      { duration: 500, easing: 'cubic-bezier(.4,.9,.4,1)', fill: 'forwards' }
    );
    anim.onfinish = () => {
      // Impact: target rotates and fades
      target.animate(
        [
          { transform: `translate(${pos.cx}px, ${pos.cy}px) rotate(0deg)`, opacity: 1 },
          { transform: `translate(${pos.cx}px, ${pos.cy + 80}px) rotate(240deg)`, opacity: 0 },
        ],
        { duration: 700, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' }
      );
      puck.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: 300, delay: 300, fill: 'forwards' }
      );
      // Confetti burst from the corner — make the knock-off feel like a goal.
      const confettiColors = ['#E0C68A', '#CE202E', '#FFFFFF', '#FFD84D', '#3DB46A'];
      for (let i = 0; i < 16; i++) {
        const piece = el('rect', {
          x: pos.cx - 2, y: pos.cy - 3, width: 4, height: 6,
          rx: 1, fill: confettiColors[i % confettiColors.length], opacity: 1,
        });
        svg.appendChild(piece);
        const ang = (Math.PI * 2 * i) / 16 + Math.random() * 0.6;
        const dist = 30 + Math.random() * 55;
        const dx = Math.cos(ang) * dist;
        const dy = Math.sin(ang) * dist + 42;          // gravity drift downward
        const rot = Math.random() * 720 - 360;
        const cAnim = piece.animate(
          [
            { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
            { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, opacity: 0 },
          ],
          { duration: 700 + Math.random() * 400, delay: 200, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' }
        );
        cAnim.onfinish = () => { try { piece.remove(); } catch (e) {} };
      }
    };
  }

  return { renderHome };
})();
