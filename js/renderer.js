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
  };

  function _seedRng(col, row) {
    return seedRng(col * 97 + row * 31 + 7);
  }

  function _adjustColor(hex, delta) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    r = Math.max(0, Math.min(255, r + delta));
    g = Math.max(0, Math.min(255, g + delta));
    b = Math.max(0, Math.min(255, b + delta));
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function IsoRenderer(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.originX = 0;
    this.originY = 0;
    this.cols = 12;
    this.rows = 10;
    this.spriteCache = {};
    this._hoveredCell = null;
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
  }

  IsoRenderer.prototype.resize = function (cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this._recalcLayout();
  };

  IsoRenderer.prototype._recalcLayout = function () {
    var d = this._rotatedDims();
    var dpr = window.devicePixelRatio || 1;
    var padX = 40;
    var padTop = 90;
    var padBot = 70;
    var totalW = (d.cols + d.rows) * (TILE_W / 2) + padX * 2;
    var maxH = 2;
    var totalH =
      (d.cols + d.rows) * (TILE_H / 2) +
      maxH * HEIGHT_PX +
      padTop +
      padBot +
      DRAW_SPRITE_H;

    this.canvas.width = Math.round(totalW * dpr);
    this.canvas.height = Math.round(totalH * dpr);
    this.canvas.style.width = totalW + "px";
    this.canvas.style.height = totalH + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.originX = d.rows * (TILE_W / 2) + padX;
    this.originY = padTop + maxH * HEIGHT_PX + DRAW_SPRITE_H * 0.5;
  };

  // Remap grid coordinates for 90° rotation steps
  IsoRenderer.prototype._rotateGrid = function (col, row) {
    var c = col, r = row;
    var step = ((this.rotStep % 4) + 4) % 4;
    if (step === 1) { c = (this.rows - 1) - row; r = col; }
    else if (step === 2) { c = (this.cols - 1) - col; r = (this.rows - 1) - row; }
    else if (step === 3) { c = row; r = (this.cols - 1) - col; }
    return { c: c, r: r };
  };

  IsoRenderer.prototype._rotatedDims = function () {
    var step = ((this.rotStep % 4) + 4) % 4;
    if (step === 1 || step === 3) return { cols: this.rows, rows: this.cols };
    return { cols: this.cols, rows: this.rows };
  };

  IsoRenderer.prototype.tileToScreen = function (col, row, h) {
    var g = this._rotateGrid(col, row);
    var cx = this.originX + (g.c - g.r) * (TILE_W / 2);
    var cy = this.originY + (g.c + g.r) * (TILE_H / 2) - h * HEIGHT_PX;
    return { x: cx, y: cy };
  };

  // Fractional-aware version for smooth animation
  IsoRenderer.prototype._rotateGridF = function (col, row) {
    var c = col, r = row;
    var step = ((this.rotStep % 4) + 4) % 4;
    if (step === 1) { c = (this.rows - 1) - row; r = col; }
    else if (step === 2) { c = (this.cols - 1) - col; r = (this.rows - 1) - row; }
    else if (step === 3) { c = row; r = (this.cols - 1) - col; }
    return { c: c, r: r };
  };

  IsoRenderer.prototype.tileToScreenF = function (col, row, h) {
    var g = this._rotateGridF(col, row);
    var cx = this.originX + (g.c - g.r) * (TILE_W / 2);
    var cy = this.originY + (g.c + g.r) * (TILE_H / 2) - h * HEIGHT_PX;
    return { x: cx, y: cy };
  };

  // Convert CSS-space mouse coords to the pre-zoom/pan "world" coords
  IsoRenderer.prototype._cssToWorld = function (sx, sy) {
    var rect = this.canvas.getBoundingClientRect();
    var cw = rect.width;
    var ch = rect.height;
    var wcx = cw / 2 + this.panX;
    var wcy = ch / 2 + this.panY;
    var wx = (sx - cw / 2) / this.zoom + wcx;
    var wy = (sy - ch / 2) / this.zoom + wcy;
    return { x: wx, y: wy };
  };

  IsoRenderer.prototype.screenToGrid = function (sx, sy) {
    var w = this._cssToWorld(sx, sy);
    var bestCol = -1;
    var bestRow = -1;
    var bestDepth = -1;
    for (var r = 0; r < this.rows; r++) {
      for (var c = 0; c < this.cols; c++) {
        var h = this._lastHeights ? this._lastHeights[r][c] : 0;
        var p = this.tileToScreen(c, r, h);
        var dx = (w.x - p.x) / (TILE_W / 2);
        var dy = (w.y - p.y) / (TILE_H / 2);
        if (Math.abs(dx) + Math.abs(dy) <= 1.05) {
          var g = this._rotateGrid(c, r);
          var depth = g.r + g.c;
          if (depth > bestDepth) {
            bestDepth = depth;
            bestCol = c;
            bestRow = r;
          }
        }
      }
    }
    if (bestCol < 0) return null;
    return { col: bestCol, row: bestRow };
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

  // PS1 dither: draw a checkerboard of dark rects inside a clipped region
  function _ditherRegion(ctx, x, y, w, h, alpha, step) {
    ctx.fillStyle = "rgba(0,0,0," + alpha + ")";
    for (var py = 0; py < h; py += step) {
      for (var px = ((py / step) & 1) ? 0 : step; px < w; px += step * 2) {
        ctx.fillRect(x + px, y + py, step, step);
      }
    }
  }

  function _drawTopFace(ctx, cx, cy, baseColor, zone, col, row) {
    var rng = _seedRng(col, row);
    // quantized color banding: snap to multiples of 12
    var rawNoise = (rng() - 0.5) * 24;
    var noise = Math.round(rawNoise / 12) * 12;
    var tileColor = _adjustColor(baseColor, noise);

    _fillDiamond(ctx, cx, cy, tileColor);

    ctx.save();
    _clipDiamond(ctx, cx, cy);
    ctx.clip();

    if (zone === "sand") {
      var halfW = TILE_W / 2;
      var halfH = TILE_H / 2;
      for (var i = 0; i < 7; i++) {
        var t = rng();
        var lx = cx - halfW + t * TILE_W;
        var ly = cy - halfH + rng() * TILE_H;
        var len = 4 + rng() * 8;
        ctx.strokeStyle =
          rng() > 0.5
            ? "rgba(0,0,0,0.08)"
            : "rgba(255,240,200,0.10)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + len, ly + len * 0.3);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy);
      ctx.lineTo(cx + 10, cy);
      ctx.moveTo(cx, cy - 6);
      ctx.lineTo(cx, cy + 6);
      ctx.stroke();
      for (var si = 0; si < 3; si++) {
        var sx = cx - TILE_W / 2 + rng() * TILE_W;
        var sy = cy - TILE_H / 2 + rng() * TILE_H;
        ctx.strokeStyle = "rgba(0,0,0,0.10)";
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + 6 + rng() * 8, sy);
        ctx.stroke();
      }
    }

    // PS1 dithered directional shadow on bottom-right half of diamond
    var eP = { x: cx + TILE_W / 2, y: cy };
    var sP = { x: cx, y: cy + TILE_H / 2 };
    var wP = { x: cx - TILE_W / 2, y: cy };
    ctx.beginPath();
    ctx.moveTo(eP.x, eP.y);
    ctx.lineTo(sP.x, sP.y);
    ctx.lineTo(wP.x, wP.y);
    ctx.closePath();
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    ctx.fill();

    // dithered edge along the shadow diagonal
    ctx.fillStyle = "rgba(0,0,0,0.04)";
    for (var di = 0; di < 16; di++) {
      var dt = di / 16;
      var dPx = eP.x + (wP.x - eP.x) * dt;
      var dPy = eP.y + (wP.y - eP.y) * dt;
      if ((di & 1) === 0) {
        ctx.fillRect(dPx - 1, dPy - 1, 2, 2);
      }
    }

    ctx.restore();

    // warm highlight on lit (NW) edge — subtle
    _clipDiamond(ctx, cx, cy);
    var grad = ctx.createLinearGradient(
      cx - TILE_W / 2,
      cy - TILE_H / 2,
      cx + TILE_W / 4,
      cy + TILE_H / 4
    );
    grad.addColorStop(0, "rgba(255,240,200,0.16)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.0)");
    grad.addColorStop(1, "rgba(0,0,0,0.05)");
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Hard 1px black outlines on all visible tile edges (PS1 style)
  function _drawTileOutlines(ctx, cx, cy, h) {
    var n = { x: cx, y: cy - TILE_H / 2 };
    var e = { x: cx + TILE_W / 2, y: cy };
    var s = { x: cx, y: cy + TILE_H / 2 };
    var w = { x: cx - TILE_W / 2, y: cy };
    var depth = (h + 1) * HEIGHT_PX;

    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;

    // top diamond
    ctx.beginPath();
    ctx.moveTo(n.x, n.y);
    ctx.lineTo(e.x, e.y);
    ctx.lineTo(s.x, s.y);
    ctx.lineTo(w.x, w.y);
    ctx.closePath();
    ctx.stroke();

    if (depth > 0) {
      // left face outline
      ctx.beginPath();
      ctx.moveTo(w.x, w.y);
      ctx.lineTo(w.x, w.y + depth);
      ctx.lineTo(s.x, s.y + depth);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();

      // right face outline
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.x, e.y + depth);
      ctx.lineTo(s.x, s.y + depth);
      ctx.lineTo(s.x, s.y);
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

  IsoRenderer.prototype._drawDioramaShadow = function (ctx) {
    var tl = this.tileToScreen(0, 0, 0);
    var tr = this.tileToScreen(this.cols - 1, 0, 0);
    var bl = this.tileToScreen(0, this.rows - 1, 0);
    var br = this.tileToScreen(this.cols - 1, this.rows - 1, 0);
    var cx = (tl.x + br.x) / 2;
    var allY = [tl.y, tr.y, bl.y, br.y];
    var cy = Math.max.apply(null, allY) + 50;
    var allX = [tl.x, tr.x, bl.x, br.x];
    var rx = (Math.max.apply(null, allX) - Math.min.apply(null, allX)) / 2 + 30;
    var ry = 32;

    var rings = 6;
    for (var i = rings; i >= 0; i--) {
      var t = i / rings;
      var alpha = 0.08 + (1 - t) * 0.22;
      var scale = 0.4 + t * 0.6;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * scale, ry * scale, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0," + alpha.toFixed(3) + ")";
      ctx.fill();
    }
  };

  // -- Main draw --

  IsoRenderer.prototype.draw = function (params) {
    var ctx = this.ctx;
    var heights = params.heights;
    var zones = params.zones;
    var highlights = params.highlights || {};
    var units = params.units || [];
    var activeUnitId = params.activeUnitId;

    this._lastHeights = heights;
    this._pulsePhase += 0.06;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();

    // Apply camera zoom + pan
    var cw = parseFloat(this.canvas.style.width);
    var ch = parseFloat(this.canvas.style.height);
    var dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var cx = cw / 2 + this.panX;
    var cy = ch / 2 + this.panY;
    ctx.translate(cw / 2, ch / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-cx + this.shakeX, -cy + this.shakeY);

    this._drawDioramaShadow(ctx);

    // pulse alpha for highlights
    var pulseAlpha = 0.30 + 0.20 * Math.sin(this._pulsePhase);

    // Build draw order sorted by rotated depth (back to front)
    var drawList = [];
    for (var r = 0; r < this.rows; r++) {
      for (var c = 0; c < this.cols; c++) {
        var g = this._rotateGrid(c, r);
        drawList.push({ c: c, r: r, depth: g.c + g.r });
      }
    }
    drawList.sort(function (a, b) { return a.depth - b.depth; });

    for (var di = 0; di < drawList.length; di++) {
      var dc = drawList[di].c;
      var dr = drawList[di].r;
      var h = heights[dr][dc];
      var zone = zones[dr][dc];
      var pal = ZONE_COLORS[zone] || ZONE_COLORS.sand;
      var colors = pal[h] || pal[0];
      var p = this.tileToScreen(dc, dr, h);

      // PS1 affine jitter — seeded +-0.5px
      var jRng = _seedRng(dc + 5, dr + 3);
      var jx = (jRng() - 0.5) * 1.0;
      var jy = (jRng() - 0.5) * 1.0;
      var px = p.x + jx;
      var py = p.y + jy;

      var wallH = h + 1;
      _drawLeftFace(ctx, px, py, wallH, colors.left, dc, dr);
      _drawRightFace(ctx, px, py, wallH, colors.right, dc, dr);

      _drawTopFace(ctx, px, py, colors.top, zone, dc, dr);
      _drawTileOutlines(ctx, px, py, h);

      var key = dc + "," + dr;
      var hlType = highlights[key];
      if (hlType) {
        var hlBase = _hlBaseColor(hlType);
        var hlColor =
          "rgba(" +
          hlBase[0] + "," +
          hlBase[1] + "," +
          hlBase[2] + "," +
          pulseAlpha.toFixed(3) +
          ")";
        _fillDiamond(ctx, px, py, hlColor);

        if (hlType === "move") {
          _clipDiamond(ctx, px, py);
          ctx.strokeStyle =
            "rgba(120, 200, 255, " + (pulseAlpha + 0.25).toFixed(3) + ")";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      var unit = null;
      for (var ui = 0; ui < units.length; ui++) {
        var uu = units[ui];
        if (uu.hp <= 0 && !uu._deathAnim) continue;
        var ux = (uu.animX != null) ? uu.animX : uu.x;
        var uy = (uu.animY != null) ? uu.animY : uu.y;
        if (Math.round(ux) === dc && Math.round(uy) === dr) {
          unit = uu;
          break;
        }
      }
      if (unit) {
        var unitH = heights[dr][dc];
        var unitAnimX = (unit.animX != null) ? unit.animX : unit.x;
        var unitAnimY = (unit.animY != null) ? unit.animY : unit.y;
        var fracX = unitAnimX - Math.floor(unitAnimX);
        var fracY = unitAnimY - Math.floor(unitAnimY);
        var drawPx = px;
        var drawPy = py;
        if (fracX > 0.01 || fracY > 0.01) {
          var exactP = this.tileToScreenF(unitAnimX, unitAnimY, unitH);
          drawPx = exactP.x;
          drawPy = exactP.y;
        }
        if (unit.lungeX != null) {
          drawPx += unit.lungeX;
          drawPy += unit.lungeY;
        }
        this._drawUnit(ctx, drawPx, drawPy, unit, unit.id === activeUnitId);
      }
    }

    // Floating damage numbers
    this._drawFloatingTexts(ctx);

    // Close camera transform
    ctx.restore();
  };

  function _hlBaseColor(type) {
    if (type === "move") return [50, 140, 255];
    if (type === "attack") return [255, 60, 40];
    if (type === "ability") return [200, 255, 60];
    return [80, 160, 255]; // gate
  }

  // -- Unit rendering --

  IsoRenderer.prototype._drawUnit = function (ctx, cx, cy, unit, isActive) {
    var key = unit.classId + "_" + unit.team;
    var bitmap = this.spriteCache[key];
    if (!bitmap) return;

    var deathAlpha = (unit._deathAnim != null) ? unit._deathAnim : 1;
    var deathScale = deathAlpha;
    var flashAlpha = unit._flashAnim || 0;

    // ground shadow ellipse
    ctx.save();
    ctx.globalAlpha = 0.35 * deathAlpha;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 16, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.restore();

    var dx = cx - DRAW_SPRITE_W / 2;
    var feetRatio = 60 / 80;
    var bob = 0;
    if (!unit.exhausted && deathAlpha >= 1) {
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

    // PS1 sprite outline: draw tinted copies at 4 offsets
    var outlineBitmap = this._getOutlineBitmap(key, bitmap);
    if (outlineBitmap) {
      ctx.drawImage(outlineBitmap, dx - 1, dy - 1, DRAW_SPRITE_W + 2, DRAW_SPRITE_H + 2);
    }

    // active unit: solid bright pixel outline
    if (isActive) {
      var glowBitmap = this._getGlowBitmap(key, bitmap, unit.team);
      if (glowBitmap) {
        ctx.globalAlpha = unit.exhausted ? 0.4 : 0.7;
        ctx.drawImage(glowBitmap, dx - 2, dy - 2, DRAW_SPRITE_W + 4, DRAW_SPRITE_H + 4);
        ctx.globalAlpha = unit.exhausted ? 0.5 : 1.0;
      }
    }

    ctx.drawImage(bitmap, dx, dy, DRAW_SPRITE_W, DRAW_SPRITE_H);

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
    var ratio = unit.hp / unit.maxHp;
    var grad = ctx.createLinearGradient(barX, barY, barX, barY + barH);
    if (ratio > 0.5) {
      grad.addColorStop(0, "#70f070");
      grad.addColorStop(1, "#30a030");
    } else if (ratio > 0.25) {
      grad.addColorStop(0, "#f0d848");
      grad.addColorStop(1, "#b89020");
    } else {
      grad.addColorStop(0, "#f05040");
      grad.addColorStop(1, "#a02018");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, barW * ratio, barH);

    // Hit flash overlay — use cached white silhouette
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
      for (var si = 0; si < statuses.length; si++) {
        var ic = statuses[si];
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(iconStartX - 1, iconY - 1, iconSize + 2, iconSize + 2);
        ctx.fillStyle = ic.color || "#88ccff";
        ctx.fillRect(iconStartX, iconY, iconSize, iconSize);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 6px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
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
    octx.fillStyle = team === "player" ? "#88ccff" : "#ff8860";
    octx.fillRect(0, 0, oc.width, oc.height);
    octx.globalCompositeOperation = "source-over";

    this._outlineCache[gKey] = oc;
    return oc;
  };

  // -- Sprite caching --

  IsoRenderer.prototype.cacheSpriteFromSvg = function (classId, team, svgEl) {
    var key = classId + "_" + team;
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
      delete self._outlineCache[key + "_outline"];
      delete self._outlineCache[key + "_glow_player"];
      delete self._outlineCache[key + "_glow_enemy"];
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  IsoRenderer.prototype.rotate = function (dir) {
    this.rotStep = ((this.rotStep + dir) % 4 + 4) % 4;
    this._recalcLayout();
  };

  IsoRenderer.prototype.setZoom = function (z) {
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
    var p = this.tileToScreen(col, row, h);
    this.floatingTexts.push({
      x: p.x, y: p.y - DRAW_SPRITE_H * 0.5,
      text: text, color: color || "#fff",
      age: 0, maxAge: 50
    });
  };

  IsoRenderer.prototype._drawFloatingTexts = function (ctx) {
    for (var i = this.floatingTexts.length - 1; i >= 0; i--) {
      var ft = this.floatingTexts[i];
      ft.age++;
      if (ft.age > ft.maxAge) { this.floatingTexts.splice(i, 1); continue; }
      var t = ft.age / ft.maxAge;
      var alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      var rise = t * 28;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 3;
      ctx.strokeText(ft.text, ft.x, ft.y - rise);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y - rise);
      ctx.restore();
    }
  };

  IsoRenderer.TILE_W = TILE_W;
  IsoRenderer.TILE_H = TILE_H;
  IsoRenderer.HEIGHT_PX = HEIGHT_PX;

  return IsoRenderer;
})();
