// Tiny audio module — goal horn (synthesized via Web Audio so we don't
// ship an mp3 + dodge any licensing) + a global mute toggle persisted to
// localStorage so the kid's preference survives reloads.
//
// Usage:
//   IceQ.Audio.goalHorn();         // play the horn (no-op if muted)
//   IceQ.Audio.savePling();        // play a short success blip (no-op if muted)
//   IceQ.Audio.isMuted();          // bool
//   IceQ.Audio.setMuted(bool);     // persists to localStorage
//   IceQ.Audio.toggleMuted();      // returns new muted state
//
// Why synthesize? The real goal-horn-sample-on-loop is iconic, but real
// arena horns are decades-old IP and the kid app is meant to be free /
// privacy-respecting. A synthesized horn-like blast is good enough for a
// car-ride teaching app and means zero asset weight + zero licensing.

window.IceQ = window.IceQ || {};

window.IceQ.Audio = (function () {
  var STORAGE_KEY = 'iceq.muted.v1';
  var ctx = null;  // lazily created on first user gesture (mobile autoplay policy)

  function getAudioContext() {
    if (ctx) return ctx;
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  }

  function isMuted() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function setMuted(m) {
    try {
      localStorage.setItem(STORAGE_KEY, m ? '1' : '0');
    } catch (e) {
      // localStorage may be blocked in private mode — fail silently
    }
  }

  function toggleMuted() {
    var m = !isMuted();
    setMuted(m);
    return m;
  }

  // Goal horn: synthesized as two stacked sawtooth tones (root + perfect
  // fifth) with a slow attack and a 0.9s body, ducked at the end. Sounds
  // arena-horn-like enough for the moment.
  function goalHorn() {
    if (isMuted()) return;
    var ac = getAudioContext();
    if (!ac) return;

    var now = ac.currentTime;
    var dur = 1.1;

    var gain = ac.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.08);  // attack
    gain.gain.setValueAtTime(0.18, now + dur - 0.3);
    gain.gain.linearRampToValueAtTime(0, now + dur);       // release
    gain.connect(ac.destination);

    var freqs = [220, 330];  // A3 + E4 (perfect fifth)
    freqs.forEach(function (f, i) {
      var osc = ac.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      // Slight detune on the upper voice for chorus thickness
      if (i === 1) osc.detune.value = -8;
      var voiceGain = ac.createGain();
      voiceGain.gain.value = (i === 0) ? 0.7 : 0.55;
      osc.connect(voiceGain);
      voiceGain.connect(gain);
      osc.start(now);
      osc.stop(now + dur + 0.05);
    });
  }

  // Small "save" pling for correct reads and good no-calls. Calmer than the
  // goal horn: every right answer should not feel like a celebration.
  //
  // 2026-08-18 (Will: "the beep is a little repetitive"): the pling now
  // rotates through four short two-note motifs so ten right answers in a
  // row do not sound like a microwave. Same length, same volume, same
  // register, so it still reads as "yes" without ever being the same twice
  // in a row. Pure Web Audio, no assets. AUDIO ONLY: nothing here touches
  // game logic.
  var PLING_MOTIFS = [
    [[660, 990]],                 // the original rising fifth-ish
    [[587, 880]],                 // a step lower
    [[523, 784], [1046]],         // rise then a little top note
    [[698, 932]],                 // brighter
  ];
  var plingIdx = 0;
  function savePling() {
    if (isMuted()) return;
    var ac = getAudioContext();
    if (!ac) return;
    var motif = PLING_MOTIFS[plingIdx % PLING_MOTIFS.length];
    plingIdx++;
    var now = ac.currentTime;
    var t = now;
    motif.forEach(function (seg, i) {
      var dur = seg.length > 1 ? 0.2 : 0.12;
      var osc = ac.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(seg[0], t);
      if (seg.length > 1) osc.frequency.exponentialRampToValueAtTime(seg[1], t + dur * 0.7);
      var gain = ac.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
      gain.gain.linearRampToValueAtTime(0, t + dur);
      osc.connect(gain); gain.connect(ac.destination);
      osc.start(t); osc.stop(t + dur + 0.05);
      t += dur * 0.85;
    });
  }

  // Wrong answer: a soft, low "thunk". Not a buzzer, not punitive; a kid who
  // hears this ten times should not feel scolded, just told.
  function wrongThunk() {
    if (isMuted()) return;
    var ac = getAudioContext();
    if (!ac) return;
    var now = ac.currentTime;
    var osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);
    var gain = ac.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain); gain.connect(ac.destination);
    osc.start(now); osc.stop(now + 0.3);
  }

  // Goal AGAINST: a flat, dull two-tone buzzer, deliberately nothing like
  // the horn. In a rink the horn belongs to the home team; a goal against
  // should not sound like a party (2-on-1 used to play the horn here).
  function goalAgainst() {
    if (isMuted()) return;
    var ac = getAudioContext();
    if (!ac) return;
    var now = ac.currentTime;
    [0, 0.22].forEach(function (off) {
      var osc = ac.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 165;
      var gain = ac.createGain();
      gain.gain.setValueAtTime(0, now + off);
      gain.gain.linearRampToValueAtTime(0.06, now + off + 0.02);
      gain.gain.linearRampToValueAtTime(0, now + off + 0.18);
      osc.connect(gain); gain.connect(ac.destination);
      osc.start(now + off); osc.stop(now + off + 0.2);
    });
  }

  // Referee whistle: short, bright, noisy. For Offside calls.
  function whistle() {
    if (isMuted()) return;
    var ac = getAudioContext();
    if (!ac) return;
    var now = ac.currentTime;
    var dur = 0.32;
    var gain = ac.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.10, now + 0.015);
    gain.gain.setValueAtTime(0.10, now + dur - 0.06);
    gain.gain.linearRampToValueAtTime(0, now + dur);
    gain.connect(ac.destination);
    // Two close partials + a fast vibrato = the "pea" in the whistle.
    [2650, 2780].forEach(function (f, i) {
      var osc = ac.createOscillator();
      osc.type = 'square';
      osc.frequency.value = f;
      var lfo = ac.createOscillator();
      lfo.frequency.value = 38;
      var lfoGain = ac.createGain();
      lfoGain.gain.value = 60;
      lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
      var vg = ac.createGain(); vg.gain.value = i === 0 ? 0.6 : 0.4;
      osc.connect(vg); vg.connect(gain);
      osc.start(now); lfo.start(now);
      osc.stop(now + dur + 0.02); lfo.stop(now + dur + 0.02);
    });
  }

  return {
    goalHorn: goalHorn,
    savePling: savePling,
    wrongThunk: wrongThunk,
    goalAgainst: goalAgainst,
    whistle: whistle,
    isMuted: isMuted,
    setMuted: setMuted,
    toggleMuted: toggleMuted,
  };
})();
