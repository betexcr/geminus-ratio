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
  var _pendingTimers = [];

  function ensure() {
    if (ctx && ctx.state === "closed") {
      ctx = null;
      masterGain = null;
      _noiseBuffer = null;
      if (SFX._ambientNodes && SFX._ambientNodes.swellTimer) clearInterval(SFX._ambientNodes.swellTimer);
      SFX._ambientNodes = null;
      SFX._ambientProfile = null;
      if (SFX._musicNodes) {
        if (SFX._musicNodes.timer) clearInterval(SFX._musicNodes.timer);
        if (SFX._musicNodes.drone) try { SFX._musicNodes.drone.stop(); } catch (e) {}
      }
      SFX._musicNodes = null;
      SFX._musicProfile = null;
      if (SFX._ambientStopTimer) { clearTimeout(SFX._ambientStopTimer); SFX._ambientStopTimer = 0; }
      if (SFX._musicStopTimer) { clearTimeout(SFX._musicStopTimer); SFX._musicStopTimer = 0; }
    }
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { return null; }
      masterGain = ctx.createGain();
      masterGain.gain.value = _muted ? 0 : _baseGain;
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume().catch(function () {});
    return ctx;
  }

  function dest() { return masterGain || ctx.destination; }

  function tone(freq, type, duration, volume) {
    var c = ensure();
    if (!c) return;
    try {
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      var vol = Math.max(0.0001, volume != null ? volume : 0.15);
      gain.gain.setValueAtTime(vol, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
      osc.connect(gain);
      gain.connect(dest());
      osc.start(c.currentTime);
      osc.stop(c.currentTime + duration);
      osc.onended = function () { osc.disconnect(); gain.disconnect(); };
    } catch (e) { /* graceful audio degradation */ }
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
    try {
      var len = Math.round(c.sampleRate * duration);
      var src = c.createBufferSource();
      src.buffer = getNoiseBuffer(c, len);
      var gain = c.createGain();
      var nvol = Math.max(0.0001, volume != null ? volume : 0.12);
      gain.gain.setValueAtTime(nvol, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
      src.connect(gain);
      gain.connect(dest());
      src.start(c.currentTime, 0, duration);
      src.onended = function () { src.disconnect(); gain.disconnect(); };
    } catch (e) { /* graceful audio degradation */ }
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
      try {
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
      } catch (e) { /* graceful audio degradation */ }
    },

    ability: function () {
      tone(440, "triangle", 0.18, 0.10);
      _pendingTimers.push(setTimeout(function () { tone(660, "triangle", 0.15, 0.08); }, 60));
    },

    death: function () { tone(120, "sawtooth", 0.35, 0.13); },

    victory: function () {
      var notes = [262, 330, 392, 523];
      for (var i = 0; i < notes.length; i++) {
        (function (n, d) {
          _pendingTimers.push(setTimeout(function () { tone(n, "triangle", 0.25, 0.12); }, d));
        })(notes[i], i * 110);
      }
    },

    defeat: function () {
      var notes = [392, 330, 262, 196];
      for (var i = 0; i < notes.length; i++) {
        (function (n, d) {
          _pendingTimers.push(setTimeout(function () { tone(n, "sawtooth", 0.35, 0.10); }, d));
        })(notes[i], i * 150);
      }
    },

    click: function () { tone(2000, "square", 0.015, 0.06); },

    setVolume: function (v) {
      _baseGain = Math.max(0, Math.min(1, v));
      if (!masterGain) ensure();
      if (masterGain && !_muted) {
        var t = ctx ? ctx.currentTime : 0;
        masterGain.gain.setValueAtTime(masterGain.gain.value, t);
        masterGain.gain.linearRampToValueAtTime(_baseGain, t + 0.02);
      }
      var eff = _muted ? 0 : _baseGain * 0.4;
      if (this._musicNodes && this._musicNodes.gain) {
        var mt = ctx ? ctx.currentTime : 0;
        this._musicNodes.gain.gain.setValueAtTime(this._musicNodes.gain.gain.value, mt);
        this._musicNodes.gain.gain.linearRampToValueAtTime(eff, mt + 0.02);
      }
    },

    mute: function () {
      _muted = !_muted;
      if (!masterGain) ensure();
      var target = _muted ? 0 : _baseGain;
      if (masterGain) {
        var t = ctx ? ctx.currentTime : 0;
        masterGain.gain.setValueAtTime(masterGain.gain.value, t);
        masterGain.gain.linearRampToValueAtTime(target, t + 0.02);
      }
      var eff = _muted ? 0 : _baseGain * 0.4;
      if (this._musicNodes && this._musicNodes.gain) {
        var mt = ctx ? ctx.currentTime : 0;
        this._musicNodes.gain.gain.setValueAtTime(this._musicNodes.gain.gain.value, mt);
        this._musicNodes.gain.gain.linearRampToValueAtTime(eff, mt + 0.02);
      }
      return _muted;
    },

    isMuted: function () { return _muted; },

    // -- Ambient audio subsystem --
    _ambientNodes: null,
    _ambientProfile: null,

    startAmbient: function (profile) {
      if (this._ambientProfile === profile && this._ambientNodes) return;
      this.stopAmbient();
      var c = ensure();
      if (!c) return;
      this._ambientProfile = profile;

      var profiles = {
        ludus:    { gain: 0.025, lpFreq: 400,  swellGain: 0.015, swellInterval: 6000 },
        battle:   { gain: 0.055, lpFreq: 800,  swellGain: 0.04,  swellInterval: 3000 },
        cutscene: { gain: 0.012, lpFreq: 200,  swellGain: 0,     swellInterval: 0 }
      };
      var p = profiles[profile] || profiles.ludus;

      try {
      var bufLen = c.sampleRate * 4;
      var buf = c.createBuffer(1, bufLen, c.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1);
      var fadeSamples = Math.floor(c.sampleRate * 0.05);
      for (var fi = 0; fi < fadeSamples; fi++) {
        var t = fi / fadeSamples;
        data[fi] *= t;
        data[bufLen - 1 - fi] *= t;
      }

      var src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;

      var lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = p.lpFreq;

      var gain = c.createGain();
      gain.gain.value = p.gain;

      src.connect(lp);
      lp.connect(gain);
      gain.connect(dest());
      src.start();

      var swellTimer = null;
      if (p.swellGain > 0 && p.swellInterval > 0) {
        swellTimer = setInterval(function () {
          if (!c || c.state === "closed" || c.state !== "running") return;
          if (_muted) return;
          var now = c.currentTime;
          gain.gain.setValueAtTime(p.gain, now);
          gain.gain.linearRampToValueAtTime(p.gain + p.swellGain, now + 0.6);
          gain.gain.linearRampToValueAtTime(p.gain, now + 1.8);
        }, p.swellInterval + Math.random() * 2000);
      }

      this._ambientNodes = { src: src, lp: lp, gain: gain, swellTimer: swellTimer };
      } catch (e) {
        this.stopAmbient();
        this._ambientProfile = null;
      }
    },

    _ambientStopTimer: 0,

    stopAmbient: function () {
      if (this._ambientStopTimer) { clearTimeout(this._ambientStopTimer); this._ambientStopTimer = 0; }
      if (!this._ambientNodes) return;
      var nodes = this._ambientNodes;
      if (this._ambientNodes.swellTimer) clearInterval(this._ambientNodes.swellTimer);
      this._ambientNodes = null;
      this._ambientProfile = null;
      var self = this;
      if (ctx && ctx.state === "running" && nodes.gain) {
        try {
          nodes.gain.gain.setValueAtTime(nodes.gain.gain.value, ctx.currentTime);
          nodes.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.03);
        } catch (e) {}
        try { nodes.src.stop(ctx.currentTime + 0.04); } catch (e) {}
        self._ambientStopTimer = setTimeout(function () {
          self._ambientStopTimer = 0;
          try { nodes.src.disconnect(); } catch (e) {}
          try { nodes.lp.disconnect(); } catch (e) {}
          try { nodes.gain.disconnect(); } catch (e) {}
        }, 60);
      } else {
        try { nodes.src.stop(); } catch (e) {}
        try { nodes.src.disconnect(); } catch (e) {}
        try { nodes.lp.disconnect(); } catch (e) {}
        try { nodes.gain.disconnect(); } catch (e) {}
      }
    },

    _musicNodes: null,
    _musicProfile: null,

    startMusic: function (profile) {
      if (this._musicProfile === profile && this._musicNodes) return;
      this.stopMusic();
      var c = ensure();
      if (!c) return;
      var musicVol = _baseGain * 0.4;
      var self = this;

      try {
        if (profile === "ludus") {
          var notes = [220, 261.6, 329.6, 392];
          var noteIdx = 0;
          var gain = c.createGain();
          gain.gain.value = musicVol;
          gain.connect(dest());
          var timer = setInterval(function () {
            if (!c || c.state === "closed" || c.state !== "running" || _muted) return;
            var freq = notes[noteIdx % notes.length];
            noteIdx++;
            var osc = c.createOscillator();
            var ng = c.createGain();
            osc.type = "triangle";
            osc.frequency.value = freq;
            ng.gain.setValueAtTime(0.12, c.currentTime);
            ng.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.6);
            osc.connect(ng);
            ng.connect(gain);
            osc.start(c.currentTime);
            osc.stop(c.currentTime + 0.65);
            osc.onended = function () { osc.disconnect(); ng.disconnect(); };
          }, 750);
          self._musicNodes = { gain: gain, timer: timer };
          self._musicProfile = profile;
        } else if (profile === "battle") {
          var gain = c.createGain();
          gain.gain.value = musicVol;
          gain.connect(dest());

          var drone = c.createOscillator();
          var droneGain = c.createGain();
          drone.type = "sawtooth";
          drone.frequency.value = 55;
          droneGain.gain.value = 0.06;
          drone.connect(droneGain);
          droneGain.connect(gain);
          drone.start();

          var beatIdx = 0;
          var beatLen = Math.round(c.sampleRate * 0.06);
          var beatBuf = c.createBuffer(1, beatLen, c.sampleRate);
          var beatData = beatBuf.getChannelData(0);
          for (var bi = 0; bi < beatLen; bi++) beatData[bi] = (Math.random() * 2 - 1);
          var timer = setInterval(function () {
            if (!c || c.state === "closed" || c.state !== "running" || _muted) return;
            beatIdx++;
            var accent = (beatIdx % 4 === 1) ? 0.14 : 0.07;
            var src = c.createBufferSource();
            src.buffer = beatBuf;
            var ng = c.createGain();
            ng.gain.setValueAtTime(accent, c.currentTime);
            ng.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05);
            src.connect(ng);
            ng.connect(gain);
            src.start(c.currentTime);
            src.onended = function () { src.disconnect(); ng.disconnect(); };

            if (beatIdx % 8 === 0) {
              var osc = c.createOscillator();
              var og = c.createGain();
              osc.type = "square";
              osc.frequency.value = 110;
              og.gain.setValueAtTime(0.06, c.currentTime);
              og.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
              osc.connect(og);
              og.connect(gain);
              osc.start(c.currentTime);
              osc.stop(c.currentTime + 0.3);
              osc.onended = function () { osc.disconnect(); og.disconnect(); };
            }
          }, 500);
          self._musicNodes = { gain: gain, timer: timer, drone: drone, droneGain: droneGain };
          self._musicProfile = profile;
        }
      } catch (e) {
        self.stopMusic();
        self._musicProfile = null;
      }
    },

    _musicStopTimer: 0,

    stopMusic: function () {
      if (this._musicStopTimer) { clearTimeout(this._musicStopTimer); this._musicStopTimer = 0; }
      if (!this._musicNodes) return;
      var nodes = this._musicNodes;
      if (nodes.timer) clearInterval(nodes.timer);
      this._musicNodes = null;
      this._musicProfile = null;
      var self = this;
      if (ctx && ctx.state === "running" && nodes.gain) {
        try {
          nodes.gain.gain.setValueAtTime(nodes.gain.gain.value, ctx.currentTime);
          nodes.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.03);
        } catch (e) {}
        if (nodes.drone) try { nodes.drone.stop(ctx.currentTime + 0.04); } catch (e) {}
        self._musicStopTimer = setTimeout(function () {
          self._musicStopTimer = 0;
          if (nodes.drone) try { nodes.drone.disconnect(); } catch (e) {}
          if (nodes.droneGain) try { nodes.droneGain.disconnect(); } catch (e) {}
          if (nodes.gain) try { nodes.gain.disconnect(); } catch (e) {}
        }, 60);
      } else {
        if (nodes.drone) {
          try { nodes.drone.stop(); } catch (e) {}
          try { nodes.drone.disconnect(); } catch (e) {}
        }
        if (nodes.droneGain) try { nodes.droneGain.disconnect(); } catch (e) {}
        if (nodes.gain) try { nodes.gain.disconnect(); } catch (e) {}
      }
    },

    _pausedMusic: null,
    _pausedAmbient: null,

    pause: function () {
      for (var i = 0; i < _pendingTimers.length; i++) clearTimeout(_pendingTimers[i]);
      _pendingTimers.length = 0;
      this._pausedMusic = this._musicProfile;
      this._pausedAmbient = this._ambientProfile;
      this.stopMusic();
      this.stopAmbient();
    },

    resume: function () {
      if (!ensure()) return;
      var pm = this._pausedMusic, pa = this._pausedAmbient;
      this._pausedMusic = null;
      this._pausedAmbient = null;
      if (pm) this.startMusic(pm);
      if (pa) this.startAmbient(pa);
    },
  };
})();
