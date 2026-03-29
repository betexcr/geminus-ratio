/**
 * SFX — procedural Web Audio sound effects for Geminus Ratio.
 * Zero dependencies, zero asset files.
 */
"use strict";

var SFX = (function () {
  var ctx = null;
  var masterGain = null;
  var _noiseBuffer = null;
  var _muted = false;
  var _baseGain = 1;

  function ensure() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { return null; }
      masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume().catch(function () {});
    return ctx;
  }

  function dest() { return masterGain || ctx.destination; }

  function tone(freq, type, duration, volume) {
    var c = ensure();
    if (!c) return;
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume != null ? volume : 0.15, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain);
    gain.connect(dest());
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration);
    osc.onended = function () { osc.disconnect(); gain.disconnect(); };
  }

  function getNoiseBuffer(c, len) {
    if (_noiseBuffer && _noiseBuffer.length >= len) return _noiseBuffer;
    var buf = c.createBuffer(1, Math.max(len, Math.round(c.sampleRate * 0.15)), c.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    _noiseBuffer = buf;
    return buf;
  }

  function noise(duration, volume) {
    var c = ensure();
    if (!c) return;
    var len = Math.round(c.sampleRate * duration);
    var src = c.createBufferSource();
    src.buffer = getNoiseBuffer(c, len);
    var gain = c.createGain();
    gain.gain.setValueAtTime(volume != null ? volume : 0.12, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    src.connect(gain);
    gain.connect(dest());
    src.start(c.currentTime, 0, duration);
    src.onended = function () { src.disconnect(); gain.disconnect(); };
  }

  return {
    move: function () { tone(800, "square", 0.04, 0.08); },

    hit: function () {
      noise(0.08, 0.14);
      tone(180, "sawtooth", 0.1, 0.12);
    },

    miss: function () {
      var c = ensure();
      if (!c) return;
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, c.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(dest());
      osc.start(c.currentTime);
      osc.stop(c.currentTime + 0.1);
      osc.onended = function () { osc.disconnect(); gain.disconnect(); };
    },

    ability: function () {
      tone(440, "triangle", 0.18, 0.10);
      setTimeout(function () { tone(660, "triangle", 0.15, 0.08); }, 60);
    },

    death: function () { tone(120, "sawtooth", 0.35, 0.13); },

    victory: function () {
      var notes = [262, 330, 392, 523];
      for (var i = 0; i < notes.length; i++) {
        (function (n, d) {
          setTimeout(function () { tone(n, "triangle", 0.25, 0.12); }, d);
        })(notes[i], i * 110);
      }
    },

    defeat: function () {
      var notes = [392, 330, 262, 196];
      for (var i = 0; i < notes.length; i++) {
        (function (n, d) {
          setTimeout(function () { tone(n, "sawtooth", 0.35, 0.10); }, d);
        })(notes[i], i * 150);
      }
    },

    click: function () { tone(2000, "square", 0.015, 0.06); },

    setVolume: function (v) {
      _baseGain = Math.max(0, Math.min(1, v));
      if (!masterGain) ensure();
      if (masterGain && !_muted) masterGain.gain.value = _baseGain;
    },

    mute: function () {
      _muted = !_muted;
      if (!masterGain) ensure();
      if (masterGain) masterGain.gain.value = _muted ? 0 : _baseGain;
      return _muted;
    },

    isMuted: function () { return _muted; },
  };
})();
