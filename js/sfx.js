/**
 * SFX — procedural Web Audio sound effects for Geminus Ratio.
 * Optional streaming music: Rome: Total War (PC) soundtrack filenames from
 * https://www.protoman.com/Music/Music/Rome%20Total%20War%20%28PC%29/
 * Set SFX.MUSIC_STREAM_BASE to a folder URL (ending with /) with those MP3s
 * for offline use; defaults to the Protoman mirror above.
 */
"use strict";

var SFX = (function () {
  var ctx = null;
  var masterGain = null;
  var _noiseBuffer = null;
  var _muted = false;
  var _baseGain = 1;
  var _pendingTimers = [];

  /** @type {string} Base URL with trailing slash */
  var MUSIC_STREAM_BASE = "https://www.protoman.com/Music/Music/Rome%20Total%20War%20%28PC%29/";
  var USE_STREAMING_MUSIC = true;
  var _musicStreamId = 0;
  var _streamMainAudio = null;
  var _stingerAudio = null;

  /**
   * Maps game moments → exact RTW track filenames (index listing).
   */
  var RTW_TRACKS = {
    title: ["01 Rome Total War.mp3"],
    ludus: [
      "02 Rome HQ.mp3",
      "11 Campaign 1  Autumn.mp3",
      "12 Campaign 2  Melancholy.mp3",
      "13 Campaign 3  Divinitus.mp3",
      "14 Campaign 4  Lonely Strategos.mp3",
      "15 Campaign 5  Arabic Winter.mp3",
      "16 Campaign 6  Arabic Summer.mp3",
    ],
    deploy: [
      "23 Mobilize 1  Journey to Rome Part 2.mp3",
      "24 Mobilize 2  Warrior March.mp3",
      "25 Mobilize 3  Enemy is Near.mp3",
      "26 Mobilize 4  Army of Drums.mp3",
      "27 Mobilize 5  Mobilize.mp3",
      "28 Mobilize 6  Soldiers' Chant.mp3",
      "17 Campaign Battle 1  Time 2 Kill.mp3",
    ],
    battle: [
      "29 Battle 1  Imperial Conflict.mp3",
      "30 Battle 2  Mayhem.mp3",
      "31 Battle 3  Melee Cafe.mp3",
      "32 Battle 4  Romantic Battle.mp3",
    ],
    cutscene: [
      "19 Tension 1  Journey to Rome Part 1.mp3",
      "20 Tension 2  Caesar's Nightmare.mp3",
      "21 Tension 3  Death Approaches.mp3",
      "22 Tension 4  Drums of Doom.mp3",
    ],
    credits: ["38 Credits  Forever (Rome Total War).mp3"],
    victory: ["35 Roman Victory.mp3", "18 Campaign Win1  Invicta.mp3"],
    defeat: ["37 Defeat  Lost Souls.mp3"],
  };

  function _musicUrl(filename) {
    var base = MUSIC_STREAM_BASE || "";
    if (!base) return filename;
    return base + encodeURIComponent(filename);
  }

  function _pick(arr, seedHint) {
    if (!arr || !arr.length) return null;
    var i = seedHint != null ? Math.abs(seedHint) % arr.length : Math.floor(Math.random() * arr.length);
    return arr[i];
  }

  function _streamVolumeMain() {
    return _muted ? 0 : Math.max(0, Math.min(1, _baseGain * 0.35));
  }

  function _streamVolumeStinger() {
    return _muted ? 0 : Math.max(0, Math.min(1, _baseGain * 0.5));
  }

  function _stopStreamMain() {
    if (_streamMainAudio) {
      try { _streamMainAudio.pause(); } catch (e) {}
      try { _streamMainAudio.removeAttribute("src"); _streamMainAudio.load(); } catch (e2) {}
      _streamMainAudio = null;
    }
  }

  function _stopStinger() {
    if (_stingerAudio) {
      try { _stingerAudio.pause(); } catch (e) {}
      try { _stingerAudio.removeAttribute("src"); _stingerAudio.load(); } catch (e2) {}
      _stingerAudio = null;
    }
  }

  function _startProceduralMusic(api, profile) {
    var proc = profile;
    if (proc === "title" || proc === "deploy" || proc === "cutscene" || proc === "credits") proc = "ludus";
    if (proc !== "ludus" && proc !== "battle") proc = "ludus";

    var c = ensure();
    if (!c) return;
    var musicVol = _baseGain * 0.4;
    var self = api;

    try {
      if (proc === "ludus") {
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
      } else if (proc === "battle") {
        var gainB = c.createGain();
        gainB.gain.value = musicVol;
        gainB.connect(dest());

        var drone = c.createOscillator();
        var droneGain = c.createGain();
        drone.type = "sawtooth";
        drone.frequency.value = 55;
        droneGain.gain.value = 0.06;
        drone.connect(droneGain);
        droneGain.connect(gainB);
        drone.start();

        var beatIdx = 0;
        var beatLen = Math.round(c.sampleRate * 0.06);
        var beatBuf = c.createBuffer(1, beatLen, c.sampleRate);
        var beatData = beatBuf.getChannelData(0);
        for (var bi = 0; bi < beatLen; bi++) beatData[bi] = (Math.random() * 2 - 1);
        var timerB = setInterval(function () {
          if (!c || c.state === "closed" || c.state !== "running" || _muted) return;
          beatIdx++;
          var accent = (beatIdx % 4 === 1) ? 0.14 : 0.07;
          var src = c.createBufferSource();
          src.buffer = beatBuf;
          var ng = c.createGain();
          ng.gain.setValueAtTime(accent, c.currentTime);
          ng.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05);
          src.connect(ng);
          ng.connect(gainB);
          src.start(c.currentTime);
          src.onended = function () { src.disconnect(); ng.disconnect(); };

          if (beatIdx % 8 === 0) {
            var osc2 = c.createOscillator();
            var og = c.createGain();
            osc2.type = "square";
            osc2.frequency.value = 110;
            og.gain.setValueAtTime(0.06, c.currentTime);
            og.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
            osc2.connect(og);
            og.connect(gainB);
            osc2.start(c.currentTime);
            osc2.stop(c.currentTime + 0.3);
            osc2.onended = function () { osc2.disconnect(); og.disconnect(); };
          }
        }, 500);
        self._musicNodes = { gain: gainB, timer: timerB, drone: drone, droneGain: droneGain };
        self._musicProfile = profile;
      }
    } catch (e) {
      api.stopMusic();
      api._musicProfile = null;
    }
  }

  function _beginStreamTrack(api, profile, loop) {
    if (!USE_STREAMING_MUSIC) return false;
    var list = RTW_TRACKS[profile];
    if (!list || !list.length) return false;
    var file = _pick(list, profile === "battle" ? Math.floor(Math.random() * 0x7fffffff) : null);
    if (!file) return false;
    var url = _musicUrl(file);
    if (!url) return false;

    var myId = ++_musicStreamId;
    var a = new Audio(url);
    a.loop = !!loop;
    // Assign immediately so mute() can set volume while decode/play is pending (was only set after .play() resolved).
    _streamMainAudio = a;
    a.volume = _streamVolumeMain();
    a.addEventListener("ended", function () {
      if (myId !== _musicStreamId || a !== _streamMainAudio) return;
      if (!a.loop) {
        api._musicNodes = null;
        api._musicProfile = null;
        _streamMainAudio = null;
      }
    });

    var p = a.play();
    if (p && typeof p.then === "function") {
      p.then(function () {
        if (myId !== _musicStreamId) {
          try { a.pause(); } catch (e) {}
          return;
        }
        a.volume = _streamVolumeMain();
        api._musicNodes = { kind: "stream", audio: a };
        api._musicProfile = profile;
      }).catch(function () {
        if (myId !== _musicStreamId) return;
        if (_streamMainAudio === a) _stopStreamMain();
        _startProceduralMusic(api, profile);
      });
    } else {
      api._musicNodes = { kind: "stream", audio: a };
      api._musicProfile = profile;
    }
    return true;
  }

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
      _musicStreamId++;
      _stopStreamMain();
      _stopStinger();
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
      if (_streamMainAudio) _streamMainAudio.volume = _streamVolumeMain();
      if (this._musicNodes && this._musicNodes.kind === "stream" && this._musicNodes.audio) {
        this._musicNodes.audio.volume = _streamVolumeMain();
      }
      if (_stingerAudio) _stingerAudio.volume = _streamVolumeStinger();
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
      if (_streamMainAudio) _streamMainAudio.volume = _streamVolumeMain();
      if (this._musicNodes && this._musicNodes.kind === "stream" && this._musicNodes.audio) {
        this._musicNodes.audio.volume = _streamVolumeMain();
      }
      if (_stingerAudio) _stingerAudio.volume = _streamVolumeStinger();
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
      if (_beginStreamTrack(this, profile, true)) return;
      _startProceduralMusic(this, profile);
    },

    playBattleResultMusic: function (won) {
      _stopStinger();
      if (!USE_STREAMING_MUSIC) return;
      var list = won ? RTW_TRACKS.victory : RTW_TRACKS.defeat;
      var file = _pick(list, null);
      if (!file) return;
      var url = _musicUrl(file);
      if (!url) return;
      var a = new Audio(url);
      a.loop = false;
      a.volume = _streamVolumeStinger();
      _stingerAudio = a;
      var playProm = a.play();
      if (playProm && typeof playProm.catch === "function") {
        playProm.catch(function () { if (_stingerAudio === a) _stingerAudio = null; });
      }
    },

    setStreamingMusic: function (enabled) {
      USE_STREAMING_MUSIC = !!enabled;
    },

    setMusicStreamBase: function (baseUrl) {
      if (!baseUrl || typeof baseUrl !== "string") MUSIC_STREAM_BASE = "";
      else MUSIC_STREAM_BASE = baseUrl.replace(/\/?$/, "/");
    },

    getMusicStreamBase: function () {
      return MUSIC_STREAM_BASE;
    },

    _musicStopTimer: 0,

    stopMusic: function () {
      _musicStreamId++;
      _stopStreamMain();
      _stopStinger();
      if (this._musicStopTimer) { clearTimeout(this._musicStopTimer); this._musicStopTimer = 0; }
      var nodes = this._musicNodes;
      this._musicNodes = null;
      this._musicProfile = null;
      if (!nodes || nodes.kind === "stream") return;
      if (nodes.timer) clearInterval(nodes.timer);
      var self = this;
      if (ctx && ctx.state === "running" && nodes.gain) {
        try {
          nodes.gain.gain.setValueAtTime(nodes.gain.gain.value, ctx.currentTime);
          nodes.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.03);
        } catch (e) {}
        if (nodes.drone) try { nodes.drone.stop(ctx.currentTime + 0.04); } catch (e2) {}
        self._musicStopTimer = setTimeout(function () {
          self._musicStopTimer = 0;
          if (nodes.drone) try { nodes.drone.disconnect(); } catch (e3) {}
          if (nodes.droneGain) try { nodes.droneGain.disconnect(); } catch (e4) {}
          if (nodes.gain) try { nodes.gain.disconnect(); } catch (e5) {}
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
