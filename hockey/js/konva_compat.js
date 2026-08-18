// Konva compatibility shim. Load immediately after konva-*.min.js, before any
// IceQ module.
//
// WHY THIS EXISTS (2026-08-18 audit): the scenario modules were written against
// three Konva.Node methods that Konva 9.3.16 does not have:
//   node.isDestroyed()   -> TypeError at ~25 call sites (breakout, lane_coverage,
//                           forecheck). Symptom: forecheckers never move, Reset
//                           throws, one wrong Check leaves every forward frozen
//                           draggable(false).
//   node.getTween()      -> undefined, so every "cancel the Show Me glide" guard
//                           short-circuited and was a silent no-op (drag mid-glide
//                           felt rubbery, Skip left sprites sliding).
//   node.stop()          -> same, used by breakout / lane_coverage cancel paths.
// Rather than touch 30+ call sites across 8 files, give Node those three methods
// for real. Nothing here changes Konva behaviour for code that does not call
// them.
(function () {
  if (!window.Konva || !Konva.Node) return;
  var P = Konva.Node.prototype;

  // ---- destroyed flag --------------------------------------------------
  // Konva's destroy() detaches the node but keeps no flag. Wrap it once.
  if (typeof P.isDestroyed !== 'function') {
    var origDestroy = P.destroy;
    P.destroy = function () {
      this._iceqDestroyed = true;
      return origDestroy.apply(this, arguments);
    };
    P.isDestroyed = function () { return this._iceqDestroyed === true; };
  }

  // ---- tween handle for node.to() ------------------------------------
  // Konva.Node.to() creates a Tween, plays it, and drops the reference. Keep
  // the most recent one on the node so callers can pause/destroy it.
  if (typeof P.getTween !== 'function') {
    P.to = function (params) {
      var node = this;
      var userOnFinish = params && params.onFinish;
      var opts = Object.assign({}, params, { node: node });
      var tween;
      opts.onFinish = function () {
        if (node._iceqTween === tween) node._iceqTween = null;
        try { tween.destroy(); } catch (e) { /* already gone */ }
        if (typeof userOnFinish === 'function') userOnFinish.call(this);
      };
      tween = new Konva.Tween(opts);
      node._iceqTween = tween;
      tween.play();
      return tween;
    };
    P.getTween = function () { return this._iceqTween || null; };
  }

  // ---- node.stop(): halt the in-flight .to() tween where it is -------
  if (typeof P.stop !== 'function') {
    P.stop = function () {
      var t = this._iceqTween;
      if (t) {
        try { t.pause(); } catch (e) { /* noop */ }
        try { t.destroy(); } catch (e) { /* noop */ }
        this._iceqTween = null;
      }
      return this;
    };
  }
})();
