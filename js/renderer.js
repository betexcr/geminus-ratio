/**
 * IsoRenderer — Canvas 2D isometric renderer for FFT-style 3D block tiles.
 *
 * PS1 FFT aesthetic: ordered dithering on side faces, color-banded top faces,
 * hard 1px black outlines, subtle vertex jitter, pulsing highlights,
 * sprite outlines, and concentric-ellipse diorama shadows.
 */
"use strict";

var IsoRenderer = (function () {
  var TILE_W = 64;
  var TILE_H = 32;
  var HEIGHT_PX = 20;
  var SPRITE_W = 64;
  var SPRITE_H = 80;
  var DRAW_SPRITE_H = 60;
  var DRAW_SPRITE_W = Math.round(DRAW_SPRITE_H * (SPRITE_W / SPRITE_H));
  var _scratchRot = { c: 0, r: 0 };
  var _scratchPt = { x: 0, y: 0 };
  var _scratchRotF = { c: 0, r: 0 };
  var _scratchPtF = { x: 0, y: 0 };
  var _FIRE_RGB = ["rgb(255,120,30)", "rgb(255,160,30)", "rgb(255,200,30)"];
  var _HL_RGB = { move: "rgb(50,140,255)", attack: "rgb(255,60,40)", ability: "rgb(200,255,60)", gate: "rgb(80,160,255)" };
  var _HL_MOVE_STROKE_RGB = "rgb(120,200,255)";

  var ZONE_COLORS = {
    sand: [
      { top: "#c4a878", left: "#8a7854", right: "#9a8860" },
      { top: "#d4b888", left: "#9a8864", right: "#aa9870" },
      { top: "#e4c898", left: "#aa9874", right: "#baa880" },
    ],
    wall: [
      { top: "#787068", left: "#4a4440", right: "#585250" },
      { top: "#888078", left: "#585250", right: "#686058" },
      { top: "#989088", left: "#686060", right: "#787068" },
    ],
    gate: [
      { top: "#585048", left: "#383028", right: "#484038" },
      { top: "#686058", left: "#484038", right: "#585048" },
      { top: "#787068", left: "#585048", right: "#686058" },
    ],
    building: [
      { top: "#7a7068", left: "#4a4438", right: "#5a5448" },
      { top: "#8a8078", left: "#5a5448", right: "#6a6458" },
      { top: "#9a9088", left: "#6a6458", right: "#7a7468" },
    ],
    water_deep: [
      { top: "#2a5a8a", left: "#1a3a5a", right: "#204060" },
      { top: "#2a5a8a", left: "#1a3a5a", right: "#204060" },
      { top: "#2a5a8a", left: "#1a3a5a", right: "#204060" },
    ],
    water_shallow: [
      { top: "#4a8aaa", left: "#2a6080", right: "#3a7090" },
      { top: "#4a8aaa", left: "#2a6080", right: "#3a7090" },
      { top: "#4a8aaa", left: "#2a6080", right: "#3a7090" },
    ],
    trap_spike: [
      { top: "#a08058", left: "#6a5038", right: "#7a6048" },
      { top: "#a08058", left: "#6a5038", right: "#7a6048" },
      { top: "#a08058", left: "#6a5038", right: "#7a6048" },
    ],
    trap_fire: [
      { top: "#c06040", left: "#8a3828", right: "#a04830" },
      { top: "#c06040", left: "#8a3828", right: "#a04830" },
      { top: "#c06040", left: "#8a3828", right: "#a04830" },
    ],
    barricade: [
      { top: "#6a5a40", left: "#3a3020", right: "#4a4030" },
      { top: "#6a5a40", left: "#3a3020", right: "#4a4030" },
      { top: "#6a5a40", left: "#3a3020", right: "#4a4030" },
    ],
    fountain: [
      { top: "#4ab8c8", left: "#2a8090", right: "#3a90a0" },
      { top: "#4ab8c8", left: "#2a8090", right: "#3a90a0" },
      { top: "#4ab8c8", left: "#2a8090", right: "#3a90a0" },
    ],
    high_ground: [
      { top: "#d4c090", left: "#a08060", right: "#b09070" },
      { top: "#d4c090", left: "#a08060", right: "#b09070" },
      { top: "#d4c090", left: "#a08060", right: "#b09070" },
    ],
  };

  function _seedFloat(col, row) {
    var s = (col * 97 + row * 31 + 7) | 0;
    s = Math.imul(s, 1103515245) + 12345 | 0;
    s = Math.imul(s, 1103515245) + 12345 | 0;
    s = Math.imul(s, 1103515245) + 12345 | 0;
    return (s >>> 0) / 0x100000000;
  }

  var _tileRng = {
    _s: 0,
    seed: function (col, row) {
      var s = (col * 97 + row * 31 + 7) | 0;
      for (var i = 0; i < 3; i++) s = (Math.imul(s, 1103515245) + 12345) | 0;
      this._s = s;
    },
    next: function () {
      this._s = (Math.imul(this._s, 1103515245) + 12345) | 0;
      return (this._s >>> 0) / 0x100000000;
    }
  };

  var _adjustColorCache = {};
  var _adjustColorCacheSize = 0;
  function _adjustColor(hex, delta) {
    if (!hex || typeof hex !== "string" || hex.length < 7 || hex[0] !== "#") return hex || "#000";
    var key = hex + delta;
    var cached = _adjustColorCache[key];
    if (cached) return cached;
    if (_adjustColorCacheSize >= 2000) { _adjustColorCache = {}; _adjustColorCacheSize = 0; }
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    r = Math.max(0, Math.min(255, r + delta));
    g = Math.max(0, Math.min(255, g + delta));
    b = Math.max(0, Math.min(255, b + delta));
    var result = "rgb(" + r + "," + g + "," + b + ")";
    _adjustColorCache[key] = result;
    _adjustColorCacheSize++;
    return result;
  }

  var _hpBarCanvases = null;
  function _getHpBarCanvas(tier) {
    if (!_hpBarCanvases) {
      _hpBarCanvases = {};
      var stops = {
        green: ["#70f070", "#30a030"],
        yellow: ["#f0d848", "#b89020"],
        red: ["#f05040", "#a02018"],
      };
      var bH = 4;
      for (var k in stops) {
        var oc = document.createElement("canvas");
        oc.width = 1;
        oc.height = bH;
        var octx = oc.getContext("2d");
        var g = octx.createLinearGradient(0, 0, 0, bH);
        g.addColorStop(0, stops[k][0]);
        g.addColorStop(1, stops[k][1]);
        octx.fillStyle = g;
        octx.fillRect(0, 0, 1, bH);
        _hpBarCanvases[k] = oc;
      }
    }
    return _hpBarCanvases[tier];
  }

  var _tileSpecularCanvas = null;
  function _getTileSpecular() {
    if (_tileSpecularCanvas) return _tileSpecularCanvas;
    var oc = document.createElement("canvas");
    oc.width = TILE_W;
    oc.height = TILE_H;
    var octx = oc.getContext("2d");
    _clipDiamond(octx, TILE_W / 2, TILE_H / 2);
    var grad = octx.createLinearGradient(0, 0, TILE_W * 0.75, TILE_H * 0.75);
    grad.addColorStop(0, "rgba(255,240,200,0.16)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.0)");
    grad.addColorStop(1, "rgba(0,0,0,0.05)");
    octx.fillStyle = grad;
    octx.fill();
    _tileSpecularCanvas = oc;
    return oc;
  }

  function IsoRenderer(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.originX = 0;
    this.originY = 0;
    this.cols = 12;
    this.rows = 10;
    this.spriteCache = {};
    this._pulsePhase = 0;
    this._outlineCache = {};
    this.floatingTexts = [];
    this.shakeX = 0;
    this.shakeY = 0;

    // Camera state
    this.zoom = 1.0;
    this.zoomMin = 0.4;
    this.zoomMax = 2.5;
    this.rotStep = 0;
    this.panX = 0;
    this.panY = 0;
    this._isPanning = false;
    this._panStartX = 0;
    this._panStartY = 0;
    this._panOriginX = 0;
    this._panOriginY = 0;
    this._scratchGrid = { col: 0, row: 0 };
    this._dpr = window.devicePixelRatio || 1;
    var _rmq = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
    this.reducedMotion = _rmq ? _rmq.matches : false;
    if (_rmq && _rmq.addEventListener) {
      var self = this;
      _rmq.addEventListener("change", function (e) { self.reducedMotion = e.matches; });
    }
  }

  IsoRenderer.prototype.resize = function (cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this._recalcLayout();
  };

  IsoRenderer.prototype._recalcLayout = function () {
    var dpr = window.devicePixelRatio || 1;
    var wrap = this.canvas.parentElement;
    var cssW = wrap ? wrap.clientWidth : 800;
    var cssH = wrap ? wrap.clientHeight : 600;
    if (cssW < 1) cssW = 800;
    if (cssH < 1) cssH = 600;

    if (cssW === this._lcW && cssH === this._lcH && dpr === this._lcDpr &&
        this.cols === this._lcCols && this.rows === this._lcRows && this.rotStep === this._lcRot) {
      return;
    }
    this._lcW = cssW; this._lcH = cssH; this._lcDpr = dpr;
    this._lcCols = this.cols; this._lcRows = this.rows; this._lcRot = this.rotStep;

    this._dpr = dpr;
    var d = this._rotatedDims();

    var pw = Math.round(cssW * dpr);
    var ph = Math.round(cssH * dpr);
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width = pw;
      this.canvas.height = ph;
      this._cachedSkyGrad = null;
    }

    this.originX = cssW / 2 - (d.cols - d.rows) * (TILE_W / 4);
    this.originY = cssH * 0.5 - (d.cols + d.rows) * (TILE_H / 4) + DRAW_SPRITE_H * 0.25;
  };

  // Remap grid coordinates for 90° rotation steps
  IsoRenderer.prototype._rotateGrid = function (col, row) {
    var c = col, r = row;
    var step = ((this.rotStep % 4) + 4) % 4;
    if (step === 1) { c = (this.rows - 1) - row; r = col; }
    else if (step === 2) { c = (this.cols - 1) - col; r = (this.rows - 1) - row; }
    else if (step === 3) { c = row; r = (this.cols - 1) - col; }
    _scratchRot.c = c; _scratchRot.r = r;
    return _scratchRot;
  };

  var _scratchDims = { cols: 0, rows: 0 };
  IsoRenderer.prototype._rotatedDims = function () {
    var step = ((this.rotStep % 4) + 4) % 4;
    if (step === 1 || step === 3) { _scratchDims.cols = this.rows; _scratchDims.rows = this.cols; }
    else { _scratchDims.cols = this.cols; _scratchDims.rows = this.rows; }
    return _scratchDims;
  };

  var _scratchTileScreen = { x: 0, y: 0 };
  IsoRenderer.prototype.tileToScreen = function (col, row, h) {
    var g = this._rotateGrid(col, row);
    _scratchTileScreen.x = this.originX + (g.c - g.r) * (TILE_W / 2);
    _scratchTileScreen.y = this.originY + (g.c + g.r) * (TILE_H / 2) - h * HEIGHT_PX;
    return _scratchTileScreen;
  };

  IsoRenderer.prototype._tileToScreenFast = function (col, row, h) {
    var g = this._rotateGrid(col, row);
    _scratchPt.x = this.originX + (g.c - g.r) * (TILE_W / 2);
    _scratchPt.y = this.originY + (g.c + g.r) * (TILE_H / 2) - h * HEIGHT_PX;
    return _scratchPt;
  };

  // Fractional-aware version for smooth animation
  IsoRenderer.prototype._rotateGridF = function (col, row) {
    var c = col, r = row;
    var step = ((this.rotStep % 4) + 4) % 4;
    if (step === 1) { c = (this.rows - 1) - row; r = col; }
    else if (step === 2) { c = (this.cols - 1) - col; r = (this.rows - 1) - row; }
    else if (step === 3) { c = row; r = (this.cols - 1) - col; }
    _scratchRotF.c = c; _scratchRotF.r = r;
    return _scratchRotF;
  };

  IsoRenderer.prototype.tileToScreenF = function (col, row, h) {
    var g = this._rotateGridF(col, row);
    _scratchPtF.x = this.originX + (g.c - g.r) * (TILE_W / 2);
    _scratchPtF.y = this.originY + (g.c + g.r) * (TILE_H / 2) - h * HEIGHT_PX;
    return _scratchPtF;
  };

  var _scratchWorld = { x: 0, y: 0 };
  var _scratchInvRot = { c: 0, r: 0 };

  IsoRenderer.prototype._cssToWorld = function (sx, sy) {
    var dpr = this._dpr || (window.devicePixelRatio || 1);
    var cw = this.canvas.width / dpr;
    var ch = this.canvas.height / dpr;
    var wcx = cw / 2 + this.panX;
    var wcy = ch / 2 + this.panY;
    var z = this.zoom || 1;
    _scratchWorld.x = (sx - cw / 2) / z + wcx;
    _scratchWorld.y = (sy - ch / 2) / z + wcy;
    return _scratchWorld;
  };

  IsoRenderer.prototype._inverseRotateGrid = function (gc, gr) {
    var step = ((this.rotStep % 4) + 4) % 4;
    if (step === 0) { _scratchInvRot.c = gc; _scratchInvRot.r = gr; }
    else if (step === 1) { _scratchInvRot.c = gr; _scratchInvRot.r = (this.rows - 1) - gc; }
    else if (step === 2) { _scratchInvRot.c = (this.cols - 1) - gc; _scratchInvRot.r = (this.rows - 1) - gr; }
    else { _scratchInvRot.c = (this.cols - 1) - gr; _scratchInvRot.r = gc; }
    return _scratchInvRot;
  };

  IsoRenderer.prototype.screenToGrid = function (sx, sy) {
    var w = this._cssToWorld(sx, sy);
    var _wwx = w.x, _wwy = w.y;
    var wx = _wwx - this.originX;
    var wy = _wwy - this.originY;
    var halfW = TILE_W / 2;
    var halfH = TILE_H / 2;

    var bestCol = -1;
    var bestRow = -1;
    var bestDepth = -1;

    var maxH = 8;
    for (var hGuess = maxH; hGuess >= 0; hGuess--) {
      var adjWy = wy + hGuess * HEIGHT_PX;
      var gc = (wx / halfW + adjWy / halfH) / 2;
      var gr = (adjWy / halfH - wx / halfW) / 2;
      var baseCol = Math.round(gc);
      var baseRow = Math.round(gr);
      var inv = this._inverseRotateGrid(baseCol, baseRow);
      var invC = inv.c, invR = inv.r;

      for (var dr = -1; dr <= 1; dr++) {
        for (var dc = -1; dc <= 1; dc++) {
          var cc = invC + dc;
          var rr = invR + dr;
          if (cc < 0 || cc >= this.cols || rr < 0 || rr >= this.rows) continue;
          var h = this._lastHeights ? this._lastHeights[rr][cc] : 0;
          var p = this._tileToScreenFast(cc, rr, h);
          var _px = p.x, _py = p.y;
          var ddx = (_wwx - _px) / halfW;
          var ddy = (_wwy - _py) / halfH;
          if (Math.abs(ddx) + Math.abs(ddy) <= 1.05) {
            var g = this._rotateGrid(cc, rr);
            var depth = g.r + g.c;
            if (depth > bestDepth) {
              bestDepth = depth;
              bestCol = cc;
              bestRow = rr;
            }
          }
        }
      }
    }

    if (bestCol < 0) return null;
    this._scratchGrid.col = bestCol;
    this._scratchGrid.row = bestRow;
    return this._scratchGrid;
  };

  // -- Tile drawing primitives --

  function _clipDiamond(ctx, cx, cy) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - TILE_H / 2);
    ctx.lineTo(cx + TILE_W / 2, cy);
    ctx.lineTo(cx, cy + TILE_H / 2);
    ctx.lineTo(cx - TILE_W / 2, cy);
    ctx.closePath();
  }

  function _fillDiamond(ctx, cx, cy, fillStyle) {
    _clipDiamond(ctx, cx, cy);
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }

  // PS1 dither: checkerboard pattern via cached CanvasPattern
  var _ditherPatterns = {};
  function _getDitherPattern(ctx, alpha, step) {
    var key = alpha + "," + step;
    if (_ditherPatterns[key]) return _ditherPatterns[key];
    var size = step * 2;
    var oc = document.createElement("canvas");
    oc.width = size;
    oc.height = size;
    var octx = oc.getContext("2d");
    octx.fillStyle = "rgba(0,0,0," + alpha + ")";
    octx.fillRect(step, 0, step, step);
    octx.fillRect(0, step, step, step);
    _ditherPatterns[key] = ctx.createPattern(oc, "repeat");
    return _ditherPatterns[key];
  }
  function _ditherRegion(ctx, x, y, w, h, alpha, step) {
    ctx.fillStyle = _getDitherPattern(ctx, alpha, step);
    ctx.fillRect(x, y, w, h);
  }

  function _drawTopFace(ctx, cx, cy, baseColor, zone, col, row, pulsePhase) {
    var rawNoise = (_seedFloat(col, row) - 0.5) * 24;
    var noise = Math.round(rawNoise / 12) * 12;
    var tileColor = _adjustColor(baseColor, noise);

    _fillDiamond(ctx, cx, cy, tileColor);

    ctx.save();
    _clipDiamond(ctx, cx, cy);
    ctx.clip();

    if (zone === "building") {
      var halfW = TILE_W / 2;
      var halfH = TILE_H / 2;
      ctx.strokeStyle = "rgba(40,30,20,0.35)";
      ctx.lineWidth = 1;
      for (var br = 0; br < 4; br++) {
        var by = cy - halfH + (br + 1) * (TILE_H / 5);
        ctx.beginPath();
        ctx.moveTo(cx - halfW, by);
        ctx.lineTo(cx + halfW, by);
        ctx.stroke();
      }
      for (var bc = 0; bc < 3; bc++) {
        var bx = cx - halfW * 0.6 + (bc + 1) * (TILE_W * 0.4);
        ctx.beginPath();
        ctx.moveTo(bx, cy - halfH);
        ctx.lineTo(bx, cy + halfH);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(100,90,70,0.12)";
      ctx.fillRect(cx - 4, cy - 3, 8, 6);
    } else if (zone === "water_deep" || zone === "water_shallow") {
      var ph = pulsePhase || 0;
      var waveAlpha = zone === "water_deep" ? 0.25 : 0.18;
      var waveCount = zone === "water_deep" ? 5 : 4;
      ctx.strokeStyle = "#ffffff";
      for (var wi = 0; wi < waveCount; wi++) {
        var wy = cy - TILE_H / 2 + (wi + 0.5) * (TILE_H / waveCount);
        var wOff = Math.sin(ph * 1.5 + wi * 1.8 + col * 0.7) * 3;
        ctx.globalAlpha = waveAlpha * (0.6 + 0.4 * Math.sin(ph + wi));
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - TILE_W / 3 + wOff, wy);
        ctx.quadraticCurveTo(cx + wOff, wy - 2 + Math.sin(ph + wi * 0.5) * 1.5, cx + TILE_W / 3 + wOff, wy);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (zone === "water_deep") {
        _fillDiamond(ctx, cx, cy, "rgba(10,30,60,0.18)");
      }
    } else if (zone === "trap_spike") {
      ctx.strokeStyle = "rgba(80,40,20,0.7)";
      ctx.lineWidth = 2;
      for (var si = 0; si < 4; si++) {
        var sx2 = cx - 8 + si * 5;
        ctx.beginPath();
        ctx.moveTo(sx2, cy + 4);
        ctx.lineTo(sx2 + 2, cy - 4);
        ctx.lineTo(sx2 + 4, cy + 4);
        ctx.stroke();
      }
    } else if (zone === "trap_fire") {
      var fPh = pulsePhase || 0;
      for (var fi = 0; fi < 3; fi++) {
        var fx = cx - 6 + fi * 6;
        var fh = 4 + Math.sin(fPh * 2 + fi) * 2;
        ctx.fillStyle = _FIRE_RGB[fi];
        ctx.globalAlpha = 0.5 + Math.sin(fPh + fi) * 0.2;
        ctx.beginPath();
        ctx.moveTo(fx, cy + 2);
        ctx.quadraticCurveTo(fx + 2, cy - fh, fx + 4, cy + 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (zone === "barricade") {
      ctx.strokeStyle = "rgba(50,40,20,0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy - 2);
      ctx.lineTo(cx + 10, cy - 2);
      ctx.moveTo(cx - 10, cy + 2);
      ctx.lineTo(cx + 10, cy + 2);
      ctx.moveTo(cx - 6, cy - 4);
      ctx.lineTo(cx - 6, cy + 4);
      ctx.moveTo(cx + 6, cy - 4);
      ctx.lineTo(cx + 6, cy + 4);
      ctx.stroke();
    } else if (zone === "fountain") {
      var wPh = pulsePhase || 0;
      ctx.fillStyle = "rgb(100,200,255)";
      ctx.globalAlpha = 0.3 + Math.sin(wPh * 1.5) * 0.1;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(200,240,255,0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 8 + Math.sin(wPh) * 2, 0, Math.PI * 2);
      ctx.stroke();
    } else if (zone === "high_ground") {
      ctx.strokeStyle = "rgba(180,150,80,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy);
      ctx.lineTo(cx, cy - 5);
      ctx.lineTo(cx + 8, cy);
      ctx.stroke();
    } else if (zone === "sand") {
      _tileRng.seed(col, row);
      var halfW = TILE_W / 2;
      var halfH = TILE_H / 2;
      for (var i = 0; i < 7; i++) {
        var t = _tileRng.next();
        var lx = cx - halfW + t * TILE_W;
        var ly = cy - halfH + _tileRng.next() * TILE_H;
        var len = 4 + _tileRng.next() * 8;
        ctx.strokeStyle =
          _tileRng.next() > 0.5
            ? "rgba(0,0,0,0.08)"
            : "rgba(255,240,200,0.10)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + len, ly + len * 0.3);
        ctx.stroke();
      }
    } else {
      _tileRng.seed(col * 3 + 1, row * 5 + 3);
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy);
      ctx.lineTo(cx + 10, cy);
      ctx.moveTo(cx, cy - 6);
      ctx.lineTo(cx, cy + 6);
      ctx.stroke();
      for (var si = 0; si < 3; si++) {
        var sx = cx - TILE_W / 2 + _tileRng.next() * TILE_W;
        var sy = cy - TILE_H / 2 + _tileRng.next() * TILE_H;
        ctx.strokeStyle = "rgba(0,0,0,0.10)";
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + 6 + _tileRng.next() * 8, sy);
        ctx.stroke();
      }
    }

    var eX = cx + TILE_W / 2, eY = cy;
    var sX = cx, sY = cy + TILE_H / 2;
    var wX = cx - TILE_W / 2, wY = cy;
    ctx.beginPath();
    ctx.moveTo(eX, eY);
    ctx.lineTo(sX, sY);
    ctx.lineTo(wX, wY);
    ctx.closePath();
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    ctx.fill();

    ctx.fillStyle = "rgba(0,0,0,0.04)";
    for (var di = 0; di < 16; di++) {
      var dt = di / 16;
      var dPx = eX + (wX - eX) * dt;
      var dPy = eY + (wY - eY) * dt;
      if ((di & 1) === 0) {
        ctx.fillRect(dPx - 1, dPy - 1, 2, 2);
      }
    }

    ctx.restore();

    ctx.drawImage(_getTileSpecular(), cx - TILE_W / 2, cy - TILE_H / 2);
  }

  // Hard 1px black outlines on all visible tile edges (PS1 style)
  function _drawTileOutlines(ctx, cx, cy, h) {
    var nX = cx, nY = cy - TILE_H / 2;
    var eX = cx + TILE_W / 2, eY = cy;
    var sX = cx, sY = cy + TILE_H / 2;
    var wX = cx - TILE_W / 2, wY = cy;
    var depth = (h + 1) * HEIGHT_PX;

    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(nX, nY);
    ctx.lineTo(eX, eY);
    ctx.lineTo(sX, sY);
    ctx.lineTo(wX, wY);
    ctx.closePath();
    ctx.stroke();

    if (depth > 0) {
      ctx.beginPath();
      ctx.moveTo(wX, wY);
      ctx.lineTo(wX, wY + depth);
      ctx.lineTo(sX, sY + depth);
      ctx.lineTo(sX, sY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(eX, eY);
      ctx.lineTo(eX, eY + depth);
      ctx.lineTo(sX, sY + depth);
      ctx.lineTo(sX, sY);
      ctx.stroke();
    }
  }

  function _drawLeftFace(ctx, cx, cy, h, fillStyle, col, row) {
    var depth = h * HEIGHT_PX;
    if (depth <= 0) return;
    ctx.beginPath();
    ctx.moveTo(cx - TILE_W / 2, cy);
    ctx.lineTo(cx, cy + TILE_H / 2);
    ctx.lineTo(cx, cy + TILE_H / 2 + depth);
    ctx.lineTo(cx - TILE_W / 2, cy + depth);
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();

    // mortar lines
    var courses = Math.max(1, Math.round(depth / 7));
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = 1;
    for (var i = 1; i < courses; i++) {
      var t = i / courses;
      var ly = cy + t * depth;
      var lyR = cy + TILE_H / 2 + t * depth;
      ctx.beginPath();
      ctx.moveTo(cx - TILE_W / 2, ly);
      ctx.lineTo(cx, lyR);
      ctx.stroke();
    }

    // PS1 ordered dither overlay — shadow face gets heavier dithering
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - TILE_W / 2, cy);
    ctx.lineTo(cx, cy + TILE_H / 2);
    ctx.lineTo(cx, cy + TILE_H / 2 + depth);
    ctx.lineTo(cx - TILE_W / 2, cy + depth);
    ctx.closePath();
    ctx.clip();
    _ditherRegion(
      ctx,
      cx - TILE_W / 2,
      cy,
      TILE_W / 2,
      depth + TILE_H / 2,
      0.10,
      2
    );
    ctx.restore();
  }

  function _drawRightFace(ctx, cx, cy, h, fillStyle, col, row) {
    var depth = h * HEIGHT_PX;
    if (depth <= 0) return;
    ctx.beginPath();
    ctx.moveTo(cx + TILE_W / 2, cy);
    ctx.lineTo(cx, cy + TILE_H / 2);
    ctx.lineTo(cx, cy + TILE_H / 2 + depth);
    ctx.lineTo(cx + TILE_W / 2, cy + depth);
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();

    // mortar lines
    var courses = Math.max(1, Math.round(depth / 7));
    ctx.strokeStyle = "rgba(0,0,0,0.16)";
    ctx.lineWidth = 1;
    for (var i = 1; i < courses; i++) {
      var t = i / courses;
      var ly = cy + t * depth;
      var lyL = cy + TILE_H / 2 + t * depth;
      ctx.beginPath();
      ctx.moveTo(cx, lyL);
      ctx.lineTo(cx + TILE_W / 2, ly);
      ctx.stroke();
    }

    // PS1 ordered dither overlay — lighter than shadow face
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx + TILE_W / 2, cy);
    ctx.lineTo(cx, cy + TILE_H / 2);
    ctx.lineTo(cx, cy + TILE_H / 2 + depth);
    ctx.lineTo(cx + TILE_W / 2, cy + depth);
    ctx.closePath();
    ctx.clip();
    _ditherRegion(
      ctx,
      cx,
      cy,
      TILE_W / 2,
      depth + TILE_H / 2,
      0.06,
      2
    );
    ctx.restore();
  }

  // -- Diorama shadow (concentric ellipses — PS1 pre-baked look) --

  var _dioramaShadowCanvas = null;
  var _dioramaShadowKey = "";
  var _dioramaShadowX = 0;
  var _dioramaShadowY = 0;

  IsoRenderer.prototype._drawDioramaShadow = function (ctx) {
    var key = this.cols + "," + this.rows + "," + this.rotStep + "," + (this.originX | 0) + "," + (this.originY | 0);
    if (_dioramaShadowKey === key && _dioramaShadowCanvas) {
      ctx.drawImage(_dioramaShadowCanvas, _dioramaShadowX, _dioramaShadowY);
      return;
    }

    var p = this._tileToScreenFast(0, 0, 0);
    var tlx = p.x, tly = p.y;
    p = this._tileToScreenFast(this.cols - 1, 0, 0);
    var trx = p.x, try_ = p.y;
    p = this._tileToScreenFast(0, this.rows - 1, 0);
    var blx = p.x, bly = p.y;
    p = this._tileToScreenFast(this.cols - 1, this.rows - 1, 0);
    var brx = p.x, bry = p.y;
    var cx = (tlx + brx) / 2;
    var maxY = tly > try_ ? tly : try_; if (bly > maxY) maxY = bly; if (bry > maxY) maxY = bry;
    var cy = maxY + 50;
    var minX = tlx < trx ? tlx : trx; if (blx < minX) minX = blx; if (brx < minX) minX = brx;
    var maxX = tlx > trx ? tlx : trx; if (blx > maxX) maxX = blx; if (brx > maxX) maxX = brx;
    var rx = (maxX - minX) / 2 + 30;
    var ry = 32;

    var ow = Math.ceil(rx * 2) + 4;
    var oh = Math.ceil(ry * 2) + 4;
    if (!_dioramaShadowCanvas) _dioramaShadowCanvas = document.createElement("canvas");
    _dioramaShadowCanvas.width = ow;
    _dioramaShadowCanvas.height = oh;
    var oc = _dioramaShadowCanvas.getContext("2d");
    var lcx = ow / 2, lcy = oh / 2;

    var rings = 6;
    for (var i = rings; i >= 0; i--) {
      var t = i / rings;
      var alpha = 0.08 + (1 - t) * 0.22;
      var scale = 0.4 + t * 0.6;
      oc.beginPath();
      oc.ellipse(lcx, lcy, rx * scale, ry * scale, 0, 0, Math.PI * 2);
      oc.fillStyle = "rgba(0,0,0," + alpha + ")";
      oc.fill();
    }

    _dioramaShadowX = cx - ow / 2;
    _dioramaShadowY = cy - oh / 2;
    _dioramaShadowKey = key;
    ctx.drawImage(_dioramaShadowCanvas, _dioramaShadowX, _dioramaShadowY);
  };

  // -- Main draw --

  IsoRenderer.prototype.draw = function (params) {
    var ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    var heights = params.heights;
    var zones = params.zones;
    var highlights = params.highlights || {};
    var units = params.units || [];
    var activeUnitId = params.activeUnitId;
    var cursedTiles = params.cursedTiles || null;
    var collapsedTiles = params.collapsedTiles || null;
    var glowTiles = params.glowTiles || null;
    var darkSky = params.darkSky || false;
    var cursorTile = params.cursor || null;

    this._lastHeights = heights;
    if (!this.reducedMotion) this._pulsePhase = (this._pulsePhase + 0.06) % (Math.PI * 2);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#060810";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    var _gradH = Math.round(this.canvas.height * 0.18);
    if (!this._cachedSkyGrad || this._cachedSkyGradH !== _gradH) {
      this._cachedSkyGradH = _gradH;
      this._cachedSkyGrad = ctx.createLinearGradient(0, 0, 0, _gradH);
      this._cachedSkyGrad.addColorStop(0, "#1a1818");
      this._cachedSkyGrad.addColorStop(1, "#060810");
    }
    ctx.fillStyle = this._cachedSkyGrad;
    ctx.fillRect(0, 0, this.canvas.width, _gradH);
    ctx.restore();

    // Apply camera zoom + pan
    var dpr = window.devicePixelRatio || 1;
    var cw = this.canvas.width / dpr;
    var ch = this.canvas.height / dpr;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var cx = cw / 2 + this.panX;
    var cy = ch / 2 + this.panY;
    ctx.translate(cw / 2, ch / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-cx + this.shakeX, -cy + this.shakeY);

    this._drawDioramaShadow(ctx);

    var pulseAlpha = 0.30 + 0.20 * Math.sin(this._pulsePhase);
    var _hlMoveStrokeAlpha = Math.min(1, pulseAlpha + 0.25);

    // Build draw order sorted by rotated depth (back to front) — cached
    if (this._dlCols !== this.cols || this._dlRows !== this.rows || this._dlRot !== this.rotStep) {
      this._dlCols = this.cols; this._dlRows = this.rows; this._dlRot = this.rotStep;
      var dl = [];
      for (var r = 0; r < this.rows; r++) {
        for (var c = 0; c < this.cols; c++) {
          var g = this._rotateGrid(c, r);
          dl.push({ c: c, r: r, depth: g.c + g.r });
        }
      }
      dl.sort(function (a, b) { return a.depth - b.depth; });
      this._drawListCache = dl;
    }
    var drawList = this._drawListCache;

    // Pre-build unit position map for O(1) per-tile lookups — flat array keyed by row*cols+col
    var _umCols = this.cols;
    var _umSize = this.rows * _umCols;
    if (!this._unitArr || this._unitArr.length < _umSize) {
      this._unitArr = new Array(_umSize);
      this._unitArrDirty = [];
    }
    var _unitArr = this._unitArr;
    var _dirty = this._unitArrDirty;
    for (var _di = 0; _di < _dirty.length; _di++) _unitArr[_dirty[_di]] = null;
    _dirty.length = 0;
    for (var _ui = 0; _ui < units.length; _ui++) {
      var _uu = units[_ui];
      if (_uu.hp <= 0 && !_uu._deathAnim) continue;
      var _ux = Math.round((_uu.animX != null) ? _uu.animX : _uu.x);
      var _uy = Math.round((_uu.animY != null) ? _uu.animY : _uu.y);
      if (_ux >= 0 && _ux < _umCols && _uy >= 0 && _uy < this.rows) {
        var _idx = _uy * _umCols + _ux;
        _unitArr[_idx] = _uu;
        _dirty.push(_idx);
      }
    }

    // Compute world-space viewport bounds for tile culling
    var _cullMargin = TILE_W + DRAW_SPRITE_H + HEIGHT_PX * 6;
    var _viewL = cx - this.shakeX - cw / (2 * this.zoom) - _cullMargin;
    var _viewR = cx - this.shakeX + cw / (2 * this.zoom) + _cullMargin;
    var _viewT = cy - this.shakeY - ch / (2 * this.zoom) - _cullMargin;
    var _viewB = cy - this.shakeY + ch / (2 * this.zoom) + _cullMargin;

    for (var di = 0; di < drawList.length; di++) {
      var dc = drawList[di].c;
      var dr = drawList[di].r;
      var h = heights[dr][dc];
      var zone = zones[dr][dc];
      var pal = ZONE_COLORS[zone] || ZONE_COLORS.sand;
      var colors = pal[h] || pal[0];
      var p = this._tileToScreenFast(dc, dr, h);
      var _px = p.x, _py = p.y;

      if (_px < _viewL || _px > _viewR || _py < _viewT || _py > _viewB) continue;

      // PS1 affine jitter — seeded +-0.5px
      var jx = (_seedFloat(dc + 5, dr + 3) - 0.5) * 1.0;
      var jy = (_seedFloat(dc + 102, dr + 34) - 0.5) * 1.0;
      var px = _px + jx;
      var py = _py + jy;

      var tKey = (dr << 8) | dc;
      var isCollapsed = collapsedTiles && collapsedTiles.has(tKey);

      if (!isCollapsed) {
        var wallH = h + 1;
        _drawLeftFace(ctx, px, py, wallH, colors.left, dc, dr);
        _drawRightFace(ctx, px, py, wallH, colors.right, dc, dr);
      }
      var isCursed = !isCollapsed && cursedTiles && cursedTiles.has(tKey);
      var isGlow = !isCollapsed && glowTiles && glowTiles.has(tKey);

      if (isCollapsed) {
        _fillDiamond(ctx, px, py, "#0a0808");
        ctx.save();
        _clipDiamond(ctx, px, py);
        ctx.clip();
        _tileRng.seed(dc * 7 + 3, dr * 11 + 1);
        ctx.strokeStyle = "rgba(60, 30, 20, 0.6)";
        ctx.lineWidth = 1;
        for (var ci = 0; ci < 4; ci++) {
          var cx1 = px - TILE_W / 2 + _tileRng.next() * TILE_W;
          var cy1 = py - TILE_H / 2 + _tileRng.next() * TILE_H;
          ctx.beginPath();
          ctx.moveTo(cx1, cy1);
          ctx.lineTo(cx1 + (_tileRng.next() - 0.5) * 16, cy1 + (_tileRng.next() - 0.5) * 10);
          ctx.stroke();
        }
        ctx.restore();
      } else {
        _drawTopFace(ctx, px, py, colors.top, zone, dc, dr, this._pulsePhase);
      }

      if (isCursed) {
        _fillDiamond(ctx, px, py, "rgba(80, 20, 40, 0.30)");
        ctx.save();
        _clipDiamond(ctx, px, py);
        ctx.clip();
        _tileRng.seed(dc * 13 + 1, dr * 7 + 5);
        ctx.fillStyle = "rgb(180, 50, 30)";
        for (var ei = 0; ei < 3; ei++) {
          var ex = px - TILE_W / 3 + _tileRng.next() * (TILE_W * 0.66);
          var ey = py - TILE_H / 3 + _tileRng.next() * (TILE_H * 0.66);
          var er = 1 + _tileRng.next() * 1.5;
          ctx.globalAlpha = 0.25 + _tileRng.next() * 0.3;
          ctx.beginPath();
          ctx.arc(ex, ey, er, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      if (isGlow) {
        _fillDiamond(ctx, px, py, "rgba(200, 180, 100, 0.15)");
      }

      _drawTileOutlines(ctx, px, py, h);

      var hlType = highlights[tKey];
      if (hlType) {
        ctx.globalAlpha = pulseAlpha;
        _fillDiamond(ctx, px, py, _HL_RGB[hlType] || _HL_RGB.gate);
        ctx.globalAlpha = 1;

        if (hlType === "move") {
          ctx.save();
          _clipDiamond(ctx, px, py);
          ctx.globalAlpha = _hlMoveStrokeAlpha;
          ctx.strokeStyle = _HL_MOVE_STROKE_RGB;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.restore();
        }
      }

      var unit = _unitArr[dr * _umCols + dc] || null;
      if (unit) {
        var unitH = h;
        var unitAnimX = (unit.animX != null) ? unit.animX : unit.x;
        var unitAnimY = (unit.animY != null) ? unit.animY : unit.y;
        var fracX = unitAnimX - Math.floor(unitAnimX);
        var fracY = unitAnimY - Math.floor(unitAnimY);
        var drawPx = px;
        var drawPy = py;
        if (fracX > 0.01 || fracY > 0.01) {
          var exactP = this.tileToScreenF(unitAnimX, unitAnimY, unitH);
          drawPx = exactP.x; drawPy = exactP.y;
        }
        if (unit.lungeX != null) {
          drawPx += unit.lungeX;
          drawPy += unit.lungeY;
        }
        this._drawUnit(ctx, drawPx, drawPy, unit, unit.id === activeUnitId);
      }

      if (cursorTile && dc === cursorTile.x && dr === cursorTile.y) {
        ctx.save();
        _clipDiamond(ctx, px, py);
        ctx.globalAlpha = this.reducedMotion ? 0.5 : 0.35 + 0.15 * Math.sin(performance.now() / 200);
        ctx.strokeStyle = "#ffe066";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }

    if (darkSky) {
      ctx.save();
      var _dpr = window.devicePixelRatio || 1;
      ctx.setTransform(_dpr, 0, 0, _dpr, 0, 0);
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = "rgba(20, 15, 30, 0.18)";
      var logW = this.canvas.clientWidth || (this.canvas.width / _dpr);
      var logH = this.canvas.clientHeight || (this.canvas.height / _dpr);
      ctx.fillRect(0, 0, logW, logH);
      ctx.restore();
      _tileRng.seed(3, 7);
      for (var ti = 0; ti < 4; ti++) {
        var twx = _tileRng.next() * this.cols;
        var twy = _tileRng.next() < 0.5 ? 0 : this.rows - 1;
        var tH = heights[twy] ? (heights[twy][Math.floor(twx)] || 0) : 0;
        var tp = this._tileToScreenFast(Math.floor(twx), twy, tH);
        var _tpx = tp.x, _tpy = tp.y;
        var flicker = 6 + Math.sin(this._pulsePhase * 2 + ti * 1.5) * 3;
        ctx.save();
        ctx.globalAlpha = 0.15 + Math.sin(this._pulsePhase * 3 + ti) * 0.05;
        ctx.fillStyle = "#ff9040";
        ctx.beginPath();
        ctx.arc(_tpx, _tpy - 10, flicker, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Floating damage numbers
    this._drawFloatingTexts(ctx);

    // Cutscene speech bubble (inside camera transform) — non-narration only
    var _deferredBubble = null;
    if (params.cutsceneBubble) {
      var cb = params.cutsceneBubble;
      if (cb.style === "narration") {
        _deferredBubble = cb;
      } else {
        this._drawSpeechBubble(ctx, cb.cx, cb.cy, cb.text, cb.revealed, cb.style);
      }
    }

    // Close camera transform
    ctx.restore();

    // Letterbox bars (outside camera transform)
    this._lastLetterbox = params.letterbox || 0;
    if (params.letterbox) {
      this._drawLetterbox(ctx, params.letterbox);
    }

    // Narration bubble drawn on top of letterbox so it stays readable
    if (_deferredBubble) {
      var nb = _deferredBubble;
      this._drawSpeechBubble(ctx, nb.cx, nb.cy, nb.text, nb.revealed, nb.style);
    }

    // Off-screen unit indicators
    if (params.units && params.units.length && !params.letterbox) {
      this._drawOffscreenIndicators(ctx, params.units, params.heights);
    }
  };

  IsoRenderer.prototype._drawOffscreenIndicators = function (ctx, units, heights) {
    var dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var sw = this.canvas.width / dpr;
    var sh = this.canvas.height / dpr;
    var margin = 16;
    var z = this.zoom || 1;
    var px = this.panX || 0;
    var py = this.panY || 0;
    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      if (u.hp <= 0) continue;
      var h = (heights && heights[u.y] && heights[u.y][u.x]) || 0;
      var tp = this._tileToScreenFast(u.x, u.y, h);
      var _osx = tp.x, _osy = tp.y;
      var sx = z * _osx + (sw / 2) * (1 - z) - z * px;
      var sy = z * _osy + (sh / 2) * (1 - z) - z * py;
      if (sx >= margin && sx <= sw - margin && sy >= margin && sy <= sh - margin) continue;
      var cx = Math.max(margin, Math.min(sw - margin, sx));
      var cy = Math.max(margin, Math.min(sh - margin, sy));
      var color = u.team === "player" ? "#64aaff" : (u.gifted ? "#88aa77" : "#ff5a44");
      var angle = Math.atan2(sy - sh / 2, sx - sw / 2);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(-4, -4);
      ctx.lineTo(-4, 4);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  };

  // -- Unit rendering --

  IsoRenderer.prototype._drawUnit = function (ctx, cx, cy, unit, isActive) {
    var key = unit._spriteKey || (unit._spriteKey = unit.classId + "_" + unit.team);
    var bitmap = this.spriteCache[key];
    if (!bitmap) return;

    var deathAlpha = (unit._deathAnim != null) ? unit._deathAnim : 1;
    var deathScale = deathAlpha;
    var flashAlpha = unit._flashAnim || 0;

    // ground shadow ellipse
    ctx.save();
    ctx.globalAlpha = 0.35 * deathAlpha;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 6, 16, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.restore();

    var dx = cx - DRAW_SPRITE_W / 2;
    var feetRatio = 54 / 80;
    var bob = 0;
    if (!this.reducedMotion && !unit.exhausted && deathAlpha >= 1) {
      bob = Math.sin(this._pulsePhase * 0.5 + (unit.x || 0) * 1.7 + (unit.y || 0) * 2.3) * 1.0;
    }
    var dy = cy - DRAW_SPRITE_H * feetRatio + bob;

    ctx.save();
    var baseAlpha = unit.exhausted ? 0.5 : 1.0;
    ctx.globalAlpha = baseAlpha * deathAlpha;

    if (deathScale < 1) {
      var sprCx = cx;
      var sprFoot = dy + DRAW_SPRITE_H;
      ctx.translate(sprCx, sprFoot);
      ctx.scale(1, deathScale);
      ctx.translate(-sprCx, -sprFoot);
    }

    // Breathing scale idle animation
    if (!this.reducedMotion && !unit.exhausted && deathAlpha >= 1) {
      var _bid = typeof unit.id === "number" ? unit.id : ((unit.id || "").charCodeAt(0) || 0);
      var breathPhase = this._pulsePhase * 0.3 + _bid * 2.1;
      var breathScale = 1 + 0.012 * Math.sin(breathPhase);
      var breathFoot = dy + DRAW_SPRITE_H;
      ctx.translate(cx, breathFoot);
      ctx.scale(1, breathScale);
      ctx.translate(-cx, -breathFoot);
    }

    // PS1 sprite outline: draw tinted copies at 4 offsets
    var outlineBitmap = this._getOutlineBitmap(key, bitmap);
    if (outlineBitmap) {
      ctx.drawImage(outlineBitmap, dx - 1, dy - 1, DRAW_SPRITE_W + 2, DRAW_SPRITE_H + 2);
    }

    // active unit: solid bright pixel outline
    if (isActive) {
      var glowBitmap = this._getGlowBitmap(key, bitmap, unit.team);
      if (glowBitmap) {
        ctx.globalAlpha = (unit.exhausted ? 0.4 : 0.7) * deathAlpha;
        ctx.drawImage(glowBitmap, dx - 2, dy - 2, DRAW_SPRITE_W + 4, DRAW_SPRITE_H + 4);
        ctx.globalAlpha = baseAlpha * deathAlpha;
      }
    }

    ctx.drawImage(bitmap, dx, dy, DRAW_SPRITE_W, DRAW_SPRITE_H);

    if (unit.isCinematic) { ctx.restore(); return; }

    // HP bar (thicker, with gradient fill)
    var barW = DRAW_SPRITE_W * 0.78;
    var barH = 4;
    var barX = cx - barW / 2;
    var barY = dy + DRAW_SPRITE_H + 2;
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX - 1, barY - 1, barW + 2, barH + 2);
    var ratio = unit.maxHp > 0 ? Math.max(0, Math.min(1, unit.hp / unit.maxHp)) : 0;
    var hpTier = ratio > 0.5 ? "green" : ratio > 0.25 ? "yellow" : "red";
    var hpCanvas = _getHpBarCanvas(hpTier);
    ctx.drawImage(hpCanvas, 0, 0, 1, 4, barX, barY, barW * ratio, barH);

    if (unit.accentColor) {
      ctx.fillStyle = unit.accentColor;
      ctx.fillRect(cx - barW / 2, barY + barH + 1, barW, 2);
    }

    if (unit.promotionId) {
      ctx.fillStyle = "#e8c040";
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.fillText("\u2605", cx, dy - 2);
    }

    if (flashAlpha > 0) {
      var flashBmp = this._getFlashBitmap(key, bitmap);
      if (flashBmp) {
        ctx.globalAlpha = flashAlpha * 0.7;
        ctx.drawImage(flashBmp, dx, dy, DRAW_SPRITE_W, DRAW_SPRITE_H);
        ctx.globalAlpha = baseAlpha * deathAlpha;
      }
    }

    // Status effect icons (small colored squares above HP bar)
    var statuses = unit.statusIcons || [];
    if (statuses.length > 0) {
      var iconSize = 7;
      var iconGap = 2;
      var totalIconW = statuses.length * (iconSize + iconGap) - iconGap;
      var iconStartX = cx - totalIconW / 2;
      var iconY = barY + barH + 3;
      ctx.font = "bold 6px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (var si = 0; si < statuses.length; si++) {
        var ic = statuses[si];
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(iconStartX - 1, iconY - 1, iconSize + 2, iconSize + 2);
        ctx.fillStyle = ic.color || "#88ccff";
        ctx.fillRect(iconStartX, iconY, iconSize, iconSize);
        ctx.fillStyle = "#fff";
        ctx.fillText(ic.glyph || "?", iconStartX + iconSize / 2, iconY + iconSize / 2 + 0.5);
        iconStartX += iconSize + iconGap;
      }
    }

    ctx.restore();
  };

  // Pre-compute a dark silhouette version of each sprite for outlines
  IsoRenderer.prototype._getOutlineBitmap = function (key, bitmap) {
    var oKey = key + "_outline";
    if (this._outlineCache[oKey]) return this._outlineCache[oKey];
    if (!bitmap || !bitmap.width) return null;

    var pad = 2;
    var oc = document.createElement("canvas");
    oc.width = bitmap.width + pad * 2;
    oc.height = bitmap.height + pad * 2;
    var octx = oc.getContext("2d");
    octx.imageSmoothingEnabled = false;

    // draw at 4 offsets
    var offsets = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var i = 0; i < offsets.length; i++) {
      octx.drawImage(bitmap, pad + offsets[i][0], pad + offsets[i][1]);
    }

    // tint everything black
    octx.globalCompositeOperation = "source-in";
    octx.fillStyle = "#000";
    octx.fillRect(0, 0, oc.width, oc.height);
    octx.globalCompositeOperation = "source-over";

    this._outlineCache[oKey] = oc;
    return oc;
  };

  // Pre-compute a colored glow silhouette for active units
  IsoRenderer.prototype._getGlowBitmap = function (key, bitmap, team) {
    var gKey = key + "_glow_" + team;
    if (this._outlineCache[gKey]) return this._outlineCache[gKey];
    if (!bitmap || !bitmap.width) return null;

    var pad = 3;
    var oc = document.createElement("canvas");
    oc.width = bitmap.width + pad * 2;
    oc.height = bitmap.height + pad * 2;
    var octx = oc.getContext("2d");
    octx.imageSmoothingEnabled = false;

    var offsets = [[2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, 1], [1, -1], [-1, -1]];
    for (var i = 0; i < offsets.length; i++) {
      octx.drawImage(bitmap, pad + offsets[i][0], pad + offsets[i][1]);
    }

    octx.globalCompositeOperation = "source-in";
    octx.fillStyle = (team === "player" || team === "gifted") ? "#88ccff" : "#ff8860";
    octx.fillRect(0, 0, oc.width, oc.height);
    octx.globalCompositeOperation = "source-over";

    this._outlineCache[gKey] = oc;
    return oc;
  };

  // -- Speech bubbles --

  var _bubbleLayoutCache = { key: "", lines: [], boxW: 0, boxH: 0 };

  IsoRenderer.prototype._drawSpeechBubble = function (ctx, cx, cy, text, revealed, style) {
    if (!text) return;

    var isNarration = (style === "narration");
    var maxW = isNarration ? 420 : 300;
    var padX = isNarration ? 18 : 14;
    var padY = isNarration ? 14 : 10;
    var lineH = isNarration ? 28 : 22;
    var fontSize = isNarration ? "20px" : "16px";
    var font = (style === "internal")
      ? "italic " + fontSize + " 'Cinzel', serif"
      : fontSize + " 'Cinzel', serif";
    ctx.save();
    ctx.font = font;

    var visibleText = text.substring(0, Math.max(0, revealed | 0));
    var cacheKey = visibleText + "|" + font + "|" + maxW;
    var lines, boxW, boxH;

    if (_bubbleLayoutCache.key === cacheKey) {
      lines = _bubbleLayoutCache.lines;
      boxW = _bubbleLayoutCache.boxW;
      boxH = _bubbleLayoutCache.boxH;
    } else {
      var words = visibleText.split(" ");
      lines = [];
      var cur = "";
      for (var wi = 0; wi < words.length; wi++) {
        var word = words[wi];
        if (ctx.measureText(word).width > maxW) {
          if (cur) { lines.push(cur); cur = ""; }
          var chunk = "";
          for (var ci = 0; ci < word.length; ci++) {
            if (ctx.measureText(chunk + word[ci]).width > maxW && chunk) {
              lines.push(chunk);
              chunk = "";
            }
            chunk += word[ci];
          }
          cur = chunk;
          continue;
        }
        var test = cur ? (cur + " " + word) : word;
        if (ctx.measureText(test).width > maxW) {
          if (cur) lines.push(cur);
          cur = word;
        } else {
          cur = test;
        }
      }
      if (cur) lines.push(cur);
      if (lines.length === 0) lines.push("");

      boxW = 0;
      for (var li = 0; li < lines.length; li++) {
        var lw = ctx.measureText(lines[li]).width;
        if (lw > maxW) lw = maxW;
        if (lw > boxW) boxW = lw;
      }
      boxW = boxW + padX * 2;
      boxH = lines.length * lineH + padY * 2;

      _bubbleLayoutCache.key = cacheKey;
      _bubbleLayoutCache.lines = lines;
      _bubbleLayoutCache.boxW = boxW;
      _bubbleLayoutCache.boxH = boxH;
    }

    var bx, by;
    var useScreenSpace = (style === "narration");
    if (useScreenSpace) {
      ctx.save();
      var dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var sw = this.canvas.width / dpr;
      var letterboxH = this._lastLetterbox ? Math.round(this.canvas.height / dpr * 0.12 * this._lastLetterbox) : 0;
      bx = sw / 2 - boxW / 2;
      by = letterboxH + 16;
      if (bx < 8) bx = 8;
      if (bx + boxW > sw - 8) bx = sw - boxW - 8;
    } else {
      bx = cx - boxW / 2;
      by = cy - DRAW_SPRITE_H - boxH - 12;
      var _dpr2 = window.devicePixelRatio || 1;
      var _ch2 = this.canvas.height / _dpr2;
      var _cw2 = this.canvas.width / _dpr2;
      var _z = this.zoom || 1;
      var viewTop = (_ch2 / 2 + (this.panY || 0)) - _ch2 / (2 * _z);
      var viewLeft = (_cw2 / 2 + (this.panX || 0)) - _cw2 / (2 * _z);
      var viewRight = viewLeft + _cw2 / _z;
      if (by < viewTop + 8) by = viewTop + 8;
      if (bx < viewLeft + 8) bx = viewLeft + 8;
      if (bx + boxW > viewRight - 8) bx = viewRight - boxW - 8;
    }

    var rad = 8;

    if (style === "internal") {
      ctx.fillStyle = "rgba(20, 16, 30, 0.85)";
    } else if (style === "narration") {
      ctx.fillStyle = "rgba(10, 8, 20, 0.9)";
    } else {
      ctx.fillStyle = "rgba(255, 250, 240, 0.95)";
    }

    ctx.beginPath();
    ctx.moveTo(bx + rad, by);
    ctx.lineTo(bx + boxW - rad, by);
    ctx.quadraticCurveTo(bx + boxW, by, bx + boxW, by + rad);
    ctx.lineTo(bx + boxW, by + boxH - rad);
    ctx.quadraticCurveTo(bx + boxW, by + boxH, bx + boxW - rad, by + boxH);
    ctx.lineTo(bx + rad, by + boxH);
    ctx.quadraticCurveTo(bx, by + boxH, bx, by + boxH - rad);
    ctx.lineTo(bx, by + rad);
    ctx.quadraticCurveTo(bx, by, bx + rad, by);
    ctx.closePath();
    ctx.fill();

    if (style !== "narration") {
      ctx.strokeStyle = (style === "internal") ? "rgba(120, 100, 180, 0.6)" : "rgba(80, 60, 40, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    if (style === "dialogue") {
      var tailX = Math.max(bx + 10, Math.min(cx, bx + boxW - 10));
      ctx.fillStyle = "rgba(255, 250, 240, 0.95)";
      ctx.beginPath();
      ctx.moveTo(tailX - 6, by + boxH);
      ctx.lineTo(tailX, by + boxH + 10);
      ctx.lineTo(tailX + 6, by + boxH);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(80, 60, 40, 0.5)";
      ctx.stroke();
    }

    if (style === "internal" || style === "narration") {
      ctx.fillStyle = "#f0d890";
    } else {
      ctx.fillStyle = "#1a1408";
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    for (var li2 = 0; li2 < lines.length; li2++) {
      ctx.fillText(lines[li2], bx + padX, by + padY + li2 * lineH);
    }

    if (revealed < text.length) {
      var cursorX = bx + padX + ctx.measureText(lines[lines.length - 1]).width + 2;
      var cursorY = by + padY + (lines.length - 1) * lineH;
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(Date.now() / 150);
      ctx.fillStyle = (style === "dialogue") ? "#1a1408" : "#f0d890";
      ctx.fillRect(cursorX, cursorY, 2, lineH - 2);
    }

    if (useScreenSpace) ctx.restore();
    ctx.restore();
  };

  IsoRenderer.prototype._drawLetterbox = function (ctx, amount) {
    if (amount <= 0) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    var w = this.canvas.width;
    var h = this.canvas.height;
    var barH = Math.round(h * 0.12 * amount);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, barH);
    ctx.fillRect(0, h - barH, w, barH);
    ctx.restore();
  };

  // -- Sprite caching --

  IsoRenderer.prototype.cacheSpriteFromSvg = function (classId, team, svgEl, rawKey) {
    var key = rawKey ? classId : (classId + "_" + team);
    var w = 128;
    var h = 160;
    var svgStr = new XMLSerializer().serializeToString(svgEl);
    var blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var img = new Image();
    var self = this;
    img.onload = function () {
      var oc = document.createElement("canvas");
      oc.width = w;
      oc.height = h;
      var octx = oc.getContext("2d");
      octx.imageSmoothingEnabled = false;
      octx.drawImage(img, 0, 0, w, h);
      self.spriteCache[key] = oc;
      // invalidate outline/glow caches when sprite updates
      var cachePrefix = key + "_";
      var cacheKeys = Object.keys(self._outlineCache);
      for (var ci = 0; ci < cacheKeys.length; ci++) {
        if (cacheKeys[ci].indexOf(cachePrefix) === 0) delete self._outlineCache[cacheKeys[ci]];
      }
      URL.revokeObjectURL(url);
      if (typeof self.onSpriteCached === "function") {
        try { self.onSpriteCached(); } catch (e) {}
      }
    };
    img.onerror = function() { URL.revokeObjectURL(url); };
    img.src = url;
  };

  IsoRenderer.prototype.rotate = function (dir) {
    this.rotStep = ((this.rotStep + dir) % 4 + 4) % 4;
    this._recalcLayout();
  };

  IsoRenderer.prototype.setZoom = function (z) {
    if (!Number.isFinite(z)) return;
    this.zoom = Math.max(this.zoomMin, Math.min(this.zoomMax, z));
  };

  // Pre-compute a white silhouette for hit flash
  IsoRenderer.prototype._getFlashBitmap = function (key, bitmap) {
    var fKey = key + "_flash";
    if (this._outlineCache[fKey]) return this._outlineCache[fKey];
    if (!bitmap || !bitmap.width) return null;
    var oc = document.createElement("canvas");
    oc.width = bitmap.width;
    oc.height = bitmap.height;
    var octx = oc.getContext("2d");
    octx.imageSmoothingEnabled = false;
    octx.drawImage(bitmap, 0, 0);
    octx.globalCompositeOperation = "source-in";
    octx.fillStyle = "#fff";
    octx.fillRect(0, 0, oc.width, oc.height);
    this._outlineCache[fKey] = oc;
    return oc;
  };

  // -- Floating damage/heal text --

  IsoRenderer.prototype.spawnText = function (col, row, h, text, color) {
    this.floatingTexts.push({
      col: col, row: row, h: h,
      text: text, color: color || "#fff",
      startTime: performance.now(), durationMs: 800
    });
    if (this.floatingTexts.length > 30) this.floatingTexts.shift();
  };

  IsoRenderer.prototype._drawFloatingTexts = function (ctx) {
    if (!this.floatingTexts.length) return;
    var now = performance.now();
    ctx.save();
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    for (var i = this.floatingTexts.length - 1; i >= 0; i--) {
      var ft = this.floatingTexts[i];
      var t = (now - ft.startTime) / ft.durationMs;
      if (t >= 1) { this.floatingTexts.splice(i, 1); continue; }
      var p = this._tileToScreenFast(ft.col, ft.row, ft.h);
      var _ftx = p.x, _fty = p.y;
      var baseY = _fty - DRAW_SPRITE_H * 0.5;
      var alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      var rise = t * 28;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = ft.color;
      ctx.strokeText(ft.text, _ftx, baseY - rise);
      ctx.fillText(ft.text, _ftx, baseY - rise);
    }
    ctx.restore();
  };

  IsoRenderer.TILE_W = TILE_W;
  IsoRenderer.TILE_H = TILE_H;
  IsoRenderer.HEIGHT_PX = HEIGHT_PX;

  return IsoRenderer;
})();
