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

  // Small "save" pling: short upward chirp. Used for correct reads and
  // good no-calls. Calmer than the goal horn — we don't want every right
  // answer to feel like a celebration, that gets old fast.
  function savePling() {
    if (isMuted()) return;
    var ac = getAudioContext();
    if (!ac) return;

    var now = ac.currentTime;
    var dur = 0.22;

    var osc = ac.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(990, now + 0.15);

    var gain = ac.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
    gain.gain.linearRampToValueAtTime(0, now + dur);

    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  }

  return {
    goalHorn: goalHorn,
    savePling: savePling,
    isMuted: isMuted,
    setMuted: setMuted,
    toggleMuted: toggleMuted,
  };
})();
