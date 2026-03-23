/**
 * Geminus Ratio — Ludus tactics prototype
 * Phases: ludus (point buy) → deploy → battle (FFT-style CT, grid move/attack)
 */
(function () {
  "use strict";

  const BOARD_W = 12;
  const BOARD_H = 10;
  const BUDGET_MAX = 140;
  const DIRS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  const GLADIATOR_CLASSES = [
    {
      id: "murmillo", name: "Murmillo", role: "Bulwark — scutum & gladius",
      cost: 28, hp: 38, atk: 11, def: 6, spd: 6, move: 3, jump: 1,
      abilities: [
        { name: "Cetus Wall", desc: "Brace: next hit deals half damage.", type: "buff", target: "self" },
        { name: "Testudo", desc: "+3 DEF until next turn.", type: "buff", target: "self" },
      ],
    },
    {
      id: "retiarius", name: "Retiarius", role: "Skirmisher — trident & net",
      cost: 24, hp: 28, atk: 10, def: 3, spd: 9, move: 4, jump: 2,
      abilities: [
        { name: "Iaculum", desc: "Net an adjacent foe (skip their next turn).", type: "debuff", target: "adjacent_enemy" },
        { name: "Trident Lunge", desc: "Range-2 line attack for 0.8× damage.", type: "attack", target: "line", range: 2, mult: 0.8 },
      ],
    },
    {
      id: "secutor", name: "Secutor", role: "Hunter — pursues the nimble",
      cost: 26, hp: 32, atk: 12, def: 4, spd: 8, move: 4, jump: 1,
      abilities: [
        { name: "Umbra", desc: "Move +1 this turn.", type: "buff", target: "self" },
        { name: "Pursuit", desc: "Adjacent strike for 1.25× if foe present.", type: "attack", target: "adjacent_enemy", mult: 1.25 },
      ],
    },
    {
      id: "thraex", name: "Thraex", role: "Duelist — sica & parmula",
      cost: 22, hp: 30, atk: 13, def: 3, spd: 7, move: 3, jump: 2,
      abilities: [
        { name: "Sica Riposte", desc: "Counter next melee hit for 5 true damage.", type: "buff", target: "self" },
        { name: "Curved Strike", desc: "Attack ignoring 50% of DEF.", type: "attack", target: "adjacent_enemy", mult: 1, ignoreDefPct: 0.5 },
      ],
    },
    {
      id: "hoplomachus", name: "Hoplomachus", role: "Lancer — hasta & small shield",
      cost: 25, hp: 30, atk: 12, def: 4, spd: 7, move: 3, jump: 1,
      abilities: [
        { name: "Hasta Impetus", desc: "Line thrust (range 3) for 1.25× damage.", type: "attack", target: "line", range: 3, mult: 1.25 },
        { name: "Shield Bash", desc: "0.5× damage + push foe 1 tile.", type: "attack", target: "adjacent_enemy", mult: 0.5, effect: "push" },
      ],
    },
    {
      id: "dimachaerus", name: "Dimachaerus", role: "Blademaster — twin swords",
      cost: 30, hp: 29, atk: 14, def: 2, spd: 8, move: 4, jump: 2,
      abilities: [
        { name: "Ferrum Cyclone", desc: "Hit all adjacent foes for 0.7×.", type: "attack", target: "aoe_adjacent", mult: 0.7 },
        { name: "Twin Slash", desc: "1.4× single target, costs 3 HP.", type: "attack", target: "adjacent_enemy", mult: 1.4, selfDamage: 3 },
      ],
    },
    {
      id: "provocator", name: "Provocator", role: "Champion — provocatio rite",
      cost: 27, hp: 34, atk: 10, def: 5, spd: 6, move: 3, jump: 1,
      abilities: [
        { name: "Provocatio", desc: "Mark foe: −4 ATK vs others for 2 turns.", type: "debuff", target: "adjacent_enemy" },
        { name: "Rally", desc: "Self-heal 20% of max HP.", type: "heal", target: "self" },
      ],
    },
    {
      id: "samnite", name: "Samnite", role: "Veteran — early Italic kit",
      cost: 23, hp: 33, atk: 11, def: 4, spd: 6, move: 3, jump: 1,
      abilities: [
        { name: "Samnis Press", desc: "Shove adjacent foe 1 tile.", type: "utility", target: "adjacent_enemy", effect: "push" },
        { name: "Veteran's Blow", desc: "1.3× damage, costs 5 HP.", type: "attack", target: "adjacent_enemy", mult: 1.3, selfDamage: 5 },
      ],
    },
  ];

  function classById(id) {
    const c = GLADIATOR_CLASSES.find((g) => g.id === id);
    if (!c) throw new Error("Unknown gladiator class: " + id);
    return c;
  }

  const SVG_NS = "http://www.w3.org/2000/svg";

  // TEAM_PAL and SPRITE_RECTS are loaded from js/sprites.js

  function palColor(team, ref) {
    const p = TEAM_PAL[team];
    if (ref === "black") return "#100810";
    if (ref === "white") return "#f8f4f0";
    if (ref === "brown") return "#5a3820";
    return p[ref] || p.main;
  }

  function addLinearGradient(defs, id, top, bot) {
    const lg = document.createElementNS(SVG_NS, "linearGradient");
    lg.setAttribute("id", id);
    lg.setAttribute("x1", "0%");
    lg.setAttribute("y1", "0%");
    lg.setAttribute("x2", "0%");
    lg.setAttribute("y2", "100%");
    const a = document.createElementNS(SVG_NS, "stop");
    a.setAttribute("offset", "0%");
    a.setAttribute("stop-color", top);
    const b = document.createElementNS(SVG_NS, "stop");
    b.setAttribute("offset", "100%");
    b.setAttribute("stop-color", bot);
    lg.appendChild(a);
    lg.appendChild(b);
    defs.appendChild(lg);
  }

  function appendSpriteGradients(defs, team, uid) {
    const p = TEAM_PAL[team];
    addLinearGradient(defs, uid + "-gmain", p.light, p.main);
    addLinearGradient(defs, uid + "-gmain_mid", p.main, p.main_mid);
    addLinearGradient(defs, uid + "-gleatherHi", p.leather_hi, p.leather);
    addLinearGradient(defs, uid + "-gleather_dark", p.leather, p.leather_dark);
    addLinearGradient(defs, uid + "-gdark", p.main_mid, p.dark);
    addLinearGradient(defs, uid + "-gskin", p.skin, p.skin_shade);
    addLinearGradient(defs, uid + "-ghair", p.hair, "#5a4020");
    addLinearGradient(defs, uid + "-gcloth", p.cloth, p.dark);
    addLinearGradient(defs, uid + "-giron", p.iron_hi, p.iron);
    addLinearGradient(defs, uid + "-giron_dark", p.iron, p.iron_dark);
    addLinearGradient(defs, uid + "-ggold", p.gold, p.gold_dark);
    addLinearGradient(defs, uid + "-gaccent", p.accent, p.main);
  }

  function resolveSpriteFill(team, ref, uid) {
    var gradMap = {
      main: "-gmain", main_mid: "-gmain_mid",
      leather: "-gleatherHi", leather_dark: "-gleather_dark",
      dark: "-gdark", skin: "-gskin", hair: "-ghair",
      cloth: "-gcloth", iron: "-giron", iron_dark: "-giron_dark",
      gold: "-ggold", accent: "-gaccent",
    };
    if (gradMap[ref]) return "url(#" + uid + gradMap[ref] + ")";
    return palColor(team, ref);
  }

  function gladiatorSpriteSvg(classId, team, uniqueId) {
    const uid = "spr" + uniqueId;
    const data = SPRITE_RECTS[classId] || SPRITE_RECTS.murmillo;
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 64 80");
    svg.setAttribute("class", "unit-sprite-svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const defs = document.createElementNS(SVG_NS, "defs");
    appendSpriteGradients(defs, team, uid);
    svg.appendChild(defs);
    const g = document.createElementNS(SVG_NS, "g");
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const x = row[0];
      const y = row[1];
      const w = row[2];
      const h = row[3];
      const ref = row[4];
      const r = document.createElementNS(SVG_NS, "rect");
      r.setAttribute("x", String(x));
      r.setAttribute("y", String(y));
      r.setAttribute("width", String(w));
      r.setAttribute("height", String(h));
      r.setAttribute("fill", resolveSpriteFill(team, ref, uid));
      r.setAttribute("shape-rendering", "crispEdges");
      g.appendChild(r);
    }
    svg.appendChild(g);
    return svg;
  }

  function tileZone(x, y) {
    if (y === BOARD_H - 1) return "gate";
    if (y === 0 || x === 0 || x === BOARD_W - 1) return "wall";
    return "sand";
  }

  /** Pseudo-random arena height (0–2). */
  function buildHeightField(seed) {
    const H = [];
    const rnd = seedRng(seed);
    for (let y = 0; y < BOARD_H; y++) {
      const row = [];
      for (let x = 0; x < BOARD_W; x++) {
        const edge = x === 0 || x === BOARD_W - 1 || y === 0 || y === BOARD_H - 1;
        const centerBias = Math.abs(x - BOARD_W / 2) + Math.abs(y - BOARD_H / 2);
        let h = Math.floor(rnd() * 3);
        if (edge) h = Math.min(h, 1);
        if (centerBias < 4 && rnd() > 0.55) h = Math.min(h + 1, 2);
        row.push(h);
      }
      H.push(row);
    }
    return H;
  }

  const HEIGHT = buildHeightField(42);

  const state = {
    phase: "ludus",
    budget: BUDGET_MAX,
    picks: [],
    deployTemplate: [],
    selectedClassId: null,
    deploySelectedIndex: 0,
    units: [],
    unitSeq: 1,
    height: HEIGHT,
    activeUnit: null,
    battleMode: "idle",
    highlightCells: new Set(),
    hasMoved: false,
    hasActed: false,
    selectedAbilityIndex: -1,
    turnCount: 0,
    totalDamageDealt: 0,
    animating: false,
    boutNumber: 0,
  };

  /** ----- DOM ----- */
  const $ = (sel) => document.querySelector(sel);
  const phaseLabel = $("#phaseLabel");
  const panelRoster = $("#panelRoster");
  const panelDeploy = $("#panelDeploy");
  const panelBattle = $("#panelBattle");
  const classListEl = $("#classList");
  const pickedListEl = $("#pickedList");
  const budgetValue = $("#budgetValue");
  const budgetMax = $("#budgetMax");
  const btnClearRoster = $("#btnClearRoster");
  const btnToDeploy = $("#btnToDeploy");
  const deployQueueEl = $("#deployQueue");
  const btnToBattle = $("#btnToBattle");
  const btnBackLudus = $("#btnBackLudus");
  const isoCanvas = $("#isoCanvas");

  let renderer = null;
  const turnInfo = $("#turnInfo");
  const unitCard = $("#unitCard");
  const ucName = $("#ucName");
  const ucClass = $("#ucClass");
  const ucHp = $("#ucHp");
  const ucAtk = $("#ucAtk");
  const ucDef = $("#ucDef");
  const ucSpd = $("#ucSpd");
  const ucMove = $("#ucMove");
  const ucJump = $("#ucJump");
  const ucAbility = $("#ucAbility");
  const btnMove = $("#btnMove");
  const btnAttack = $("#btnAttack");
  const btnAbility = $("#btnAbility");
  const btnWait = $("#btnWait");
  const abilityMenu = $("#abilityMenu");
  const logFeed = $("#logFeed");
  const tileInfoEl = $("#tileInfo");
  const forecastEl = $("#forecastTooltip");
  const resultOverlay = $("#resultOverlay");
  const resultTitle = $("#resultTitle");
  const resultBody = $("#resultBody");
  const btnResultContinue = $("#btnResultContinue");
  const btnRotL = $("#btnRotL");
  const btnRotR = $("#btnRotR");
  const btnZoomIn = $("#btnZoomIn");
  const btnZoomOut = $("#btnZoomOut");
  const btnCamReset = $("#btnCamReset");

  function log(msg, type) {
    var cls = "log-entry";
    if (type) cls += " log-entry--" + type;
    else {
      if (/miss/i.test(msg)) cls += " log-entry--miss";
      else if (/heal|restore|rally/i.test(msg)) cls += " log-entry--heal";
      else if (/brace|testudo|riposte|umbra|wall/i.test(msg)) cls += " log-entry--buff";
      else if (/\d+ /.test(msg) && /hit|strike|deal|cut|pierce/i.test(msg)) cls += " log-entry--dmg";
    }
    var p = document.createElement("p");
    p.className = cls;
    p.textContent = msg;
    logFeed.appendChild(p);
    while (logFeed.children.length > 40) logFeed.removeChild(logFeed.firstChild);
    logFeed.scrollTop = logFeed.scrollHeight;
  }

  // -- Animation helpers --
  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function animateMove(unit, path) {
    if (!path || path.length === 0) return Promise.resolve();
    SFX.move();
    return new Promise(function (resolve) {
      var stepIdx = 0;
      var stepDur = 80;
      var startTime = null;
      var fromX = unit.x, fromY = unit.y;
      function tick(ts) {
        if (!startTime) startTime = ts;
        var elapsed = ts - startTime;
        var t = Math.min(1, elapsed / stepDur);
        var nx = path[stepIdx][0], ny = path[stepIdx][1];
        unit.animX = fromX + (nx - fromX) * t;
        unit.animY = fromY + (ny - fromY) * t;
        if (t >= 1) {
          unit.x = nx;
          unit.y = ny;
          fromX = nx; fromY = ny;
          stepIdx++;
          startTime = null;
          if (stepIdx >= path.length) {
            delete unit.animX;
            delete unit.animY;
            resolve();
            return;
          }
          if (stepIdx % 2 === 0) SFX.move();
        }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  function animateAttack(attacker, target) {
    return new Promise(function (resolve) {
      var dx = target.x - attacker.x;
      var dy = target.y - attacker.y;
      var lungeAmt = 4;
      attacker.lungeX = dx * lungeAmt;
      attacker.lungeY = dy * lungeAmt * 0.5;
      setTimeout(function () {
        delete attacker.lungeX;
        delete attacker.lungeY;
        resolve();
      }, 120);
    });
  }

  function animateHitFlash(unit) {
    return new Promise(function (resolve) {
      unit._flashAnim = 1;
      var start = performance.now();
      function tick() {
        var t = (performance.now() - start) / 150;
        if (t >= 1) { delete unit._flashAnim; resolve(); return; }
        unit._flashAnim = 1 - t;
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  function screenShake(dur, intensity) {
    if (!renderer) return Promise.resolve();
    return new Promise(function (resolve) {
      var start = performance.now();
      function tick() {
        var t = (performance.now() - start) / dur;
        if (t >= 1) { renderer.shakeX = 0; renderer.shakeY = 0; resolve(); return; }
        var amt = intensity * (1 - t);
        renderer.shakeX = (Math.random() - 0.5) * amt * 2;
        renderer.shakeY = (Math.random() - 0.5) * amt * 2;
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  function animateDeath(unit) {
    SFX.death();
    return new Promise(function (resolve) {
      var start = performance.now();
      var dur = 400;
      function tick() {
        var t = Math.min(1, (performance.now() - start) / dur);
        unit._deathAnim = 1 - t;
        if (t >= 1) { delete unit._deathAnim; refreshCtStrip(); resolve(); return; }
        requestAnimationFrame(tick);
      }
      unit._deathAnim = 1;
      requestAnimationFrame(tick);
    });
  }

  function spawnDmgNumber(unit, text, color) {
    if (!renderer) return;
    var h = state.height[unit.y] ? state.height[unit.y][unit.x] || 0 : 0;
    renderer.spawnText(unit.x, unit.y, h, text, color);
  }

  function computePath(unit, destX, destY) {
    var def = classById(unit.classId);
    var maxMp = effectiveMove(unit);
    var prev = {};
    var cost = {};
    var q = [{ x: unit.x, y: unit.y, c: 0 }];
    var startKey = cellKey(unit.x, unit.y);
    cost[startKey] = 0;
    prev[startKey] = null;
    while (q.length) {
      var cur = q.shift();
      for (var di = 0; di < DIRS.length; di++) {
        var nx = cur.x + DIRS[di][0], ny = cur.y + DIRS[di][1];
        if (!inBounds(nx, ny)) continue;
        if (occupantAt(nx, ny) && !(nx === destX && ny === destY)) continue;
        var nh = state.height[ny][nx], ch = state.height[cur.y][cur.x];
        var dh = nh - ch;
        if (dh > def.jump || dh < -def.jump) continue;
        var step = 1 + Math.max(0, dh);
        var nc = cur.c + step;
        if (nc > maxMp) continue;
        var k = cellKey(nx, ny);
        if (cost[k] != null && cost[k] <= nc) continue;
        cost[k] = nc;
        prev[k] = cellKey(cur.x, cur.y);
        q.push({ x: nx, y: ny, c: nc });
      }
    }
    var dk = cellKey(destX, destY);
    if (cost[dk] == null) return [];
    var path = [];
    var cur2 = dk;
    while (cur2 && cur2 !== startKey) {
      var parts = cur2.split(",").map(Number);
      path.unshift(parts);
      cur2 = prev[cur2];
    }
    return path;
  }

  // -- Status effect helpers --
  var STATUS_DEFS = {
    brace:    { glyph: "B", color: "#88ccff", label: "Brace" },
    testudo:  { glyph: "T", color: "#88ccff", label: "Testudo +3 DEF" },
    riposte:  { glyph: "R", color: "#c8ff88", label: "Riposte" },
    rooted:   { glyph: "N", color: "#ff8888", label: "Netted" },
    surge:    { glyph: "S", color: "#ffcc44", label: "Surge +1 Move" },
    marked:   { glyph: "M", color: "#ff6868", label: "Marked -4 ATK" },
  };

  function getUnitStatusIcons(u) {
    var icons = [];
    if (u.braceCharges > 0) icons.push(STATUS_DEFS.brace);
    if (u.testudoBonus > 0) icons.push(STATUS_DEFS.testudo);
    if (u.riposteActive) icons.push(STATUS_DEFS.riposte);
    if (u.rootedSkip) icons.push(STATUS_DEFS.rooted);
    if (u.tempExtraMove) icons.push(STATUS_DEFS.surge);
    if (u.markDebuffTurns > 0) icons.push(STATUS_DEFS.marked);
    return icons;
  }

  function cellKey(x, y) {
    return x + "," + y;
  }

  function inBounds(x, y) {
    return x >= 0 && x < BOARD_W && y >= 0 && y < BOARD_H;
  }

  function occupantAt(x, y) {
    return state.units.find((u) => u.hp > 0 && u.x === x && u.y === y) || null;
  }

  function isGateTile(x, y) {
    return y >= BOARD_H - 2;
  }

  function effectiveMove(unit) {
    const def = classById(unit.classId);
    let m = def.move;
    if (unit.tempExtraMove) m += 1;
    return m;
  }

  /** Provocator: marked foe hits softer unless they aim at the provocator. */
  function attackerAtkValue(attacker, target) {
    const def = classById(attacker.classId);
    let atk = def.atk;
    if (
      attacker.markDebuffTurns > 0 &&
      attacker.markFocusId != null &&
      target &&
      target.id !== attacker.markFocusId
    ) {
      atk = Math.max(1, atk - 4);
    }
    return atk;
  }

  /** BFS move reach from (ux,uy); costs MP. */
  function computeMoves(unit) {
    const def = classById(unit.classId);
    const maxMp = effectiveMove(unit);
    const startH = state.height[unit.y][unit.x];
    const best = new Map();
    const q = [{ x: unit.x, y: unit.y, cost: 0 }];
    best.set(cellKey(unit.x, unit.y), 0);

    while (q.length) {
      const cur = q.shift();
      for (const [dx, dy] of DIRS) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        if (!inBounds(nx, ny)) continue;
        if (occupantAt(nx, ny)) continue;
        const nh = state.height[ny][nx];
        const ch = state.height[cur.y][cur.x];
        const dh = nh - ch;
        if (dh > def.jump) continue;
        if (dh < -def.jump) continue;
        const step = 1 + Math.max(0, dh);
        const nc = cur.cost + step;
        if (nc > maxMp) continue;
        const k = cellKey(nx, ny);
        if (best.has(k) && best.get(k) <= nc) continue;
        best.set(k, nc);
        q.push({ x: nx, y: ny, cost: nc });
      }
    }
    best.delete(cellKey(unit.x, unit.y));
    return best;
  }

  function manhattan(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  function adjacent(a, b) {
    return manhattan(a, b) === 1;
  }

  function computeHitChance(attacker, defender) {
    const aSpd = classById(attacker.classId).spd;
    const dSpd = classById(defender.classId).spd;
    let chance = 80 + (aSpd - dSpd) * 5;
    const aH = state.height[attacker.y][attacker.x];
    const dH = state.height[defender.y][defender.x];
    if (aH > dH) chance += 10;
    else if (aH < dH) chance -= 10;
    return Math.max(30, Math.min(95, chance));
  }

  function rollHit(attacker, defender) {
    const chance = computeHitChance(attacker, defender);
    return Math.random() * 100 < chance;
  }

  function physicalDamage(attacker, defender, mult, ignoreDefPct, dryRun) {
    const atk = attackerAtkValue(attacker, defender);
    const defC = classById(defender.classId);
    const baseDef = defC.def + (defender.testudoBonus || 0);
    const effectiveDef = ignoreDefPct
      ? Math.round(baseDef * (1 - ignoreDefPct))
      : baseDef;
    const aH = state.height[attacker.y][attacker.x];
    const dH = state.height[defender.y][defender.x];
    let heightMult = 1;
    if (aH > dH) heightMult = 1.15;
    else if (aH < dH) heightMult = 0.85;
    const raw = Math.max(1, Math.round(atk * mult * heightMult) - effectiveDef);
    let dmg = raw;
    if (defender.braceCharges > 0) {
      dmg = Math.max(1, Math.floor(dmg / 2));
      if (!dryRun) defender.braceCharges -= 1;
    }
    return dmg;
  }

  function applyDamage(u, dmg) {
    u.hp -= dmg;
    if (u.hp < 0) u.hp = 0;
    if (u.team === "enemy") state.totalDamageDealt += dmg;
    spawnDmgNumber(u, "-" + dmg, "#ff6040");
  }

  /** CT turn: advance until someone is ready. */
  function nextActor() {
    const alive = state.units.filter((u) => u.hp > 0);
    if (!alive.length) return null;
    for (let guard = 0; guard < 5000; guard++) {
      for (const u of alive) {
        const spd = classById(u.classId).spd;
        u.ct += spd;
      }
      const ready = alive
        .filter((u) => u.ct >= 100)
        .sort((a, b) => b.ct - a.ct || b.id - a.id)[0];
      if (ready) {
        ready.ct -= 100;
        return ready;
      }
    }
    console.warn("nextActor: CT safety guard reached (5000 iterations) with", alive.length, "alive units");
    return null;
  }

  function createUnit(team, classId, x, y) {
    const def = classById(classId);
    const id = state.unitSeq++;
    return {
      id,
      team,
      classId,
      x,
      y,
      hp: def.hp,
      maxHp: def.hp,
      ct: team === "player" ? 20 : 0,
      rootedSkip: false,
      braceCharges: 0,
      riposteActive: false,
      tempExtraMove: false,
      testudoBonus: 0,
      markDebuffTurns: 0,
      markFocusId: null,
    };
  }

  function buildZoneMap() {
    const zones = [];
    for (let y = 0; y < BOARD_H; y++) {
      const row = [];
      for (let x = 0; x < BOARD_W; x++) {
        row.push(tileZone(x, y));
      }
      zones.push(row);
    }
    return zones;
  }

  function buildHighlightMap() {
    const map = {};
    for (const key of state.highlightCells) {
      if (state.battleMode === "move") map[key] = "move";
      else if (state.battleMode === "attack") map[key] = "attack";
      else if (state.battleMode === "ability") map[key] = "ability";
    }
    if (state.phase === "deploy") {
      for (let y = 0; y < BOARD_H; y++) {
        for (let x = 0; x < BOARD_W; x++) {
          if (isGateTile(x, y) && !occupantAt(x, y)) {
            map[cellKey(x, y)] = "gate";
          }
        }
      }
    }
    return map;
  }

  function renderBoard() {
    if (!renderer) return;
    const unitData = state.units
      .filter((u) => u.hp > 0 || u._deathAnim != null)
      .map((u) => ({
        id: u.id,
        x: u.x,
        y: u.y,
        hp: u.hp,
        maxHp: u.maxHp,
        classId: u.classId,
        team: u.team === "player" ? "player" : "enemy",
        exhausted: state.phase === "battle" && u.ct < 50,
        animX: u.animX,
        animY: u.animY,
        lungeX: u.lungeX,
        lungeY: u.lungeY,
        _deathAnim: u._deathAnim,
        _flashAnim: u._flashAnim,
        statusIcons: getUnitStatusIcons(u),
      }));

    renderer.draw({
      heights: state.height,
      zones: buildZoneMap(),
      highlights: buildHighlightMap(),
      units: unitData,
      activeUnitId: state.activeUnit ? state.activeUnit.id : null,
      phase: state.phase,
    });
  }

  function initSpriteCache() {
    if (!renderer) return;
    const teams = ["player", "enemy"];
    for (const cls of GLADIATOR_CLASSES) {
      for (const team of teams) {
        const svg = gladiatorSpriteSvg(cls.id, team, 0);
        renderer.cacheSpriteFromSvg(cls.id, team, svg);
      }
    }
  }

  function syncBodyPhaseClass() {
    document.body.classList.toggle("phase-battle", state.phase === "battle");
    document.body.classList.toggle("phase-deploy", state.phase === "deploy");
    document.body.classList.toggle("phase-ludus", state.phase === "ludus");
  }

  function refreshCtStrip() {
    const el = document.getElementById("ctStrip");
    if (!el) return;
    if (state.phase !== "battle") {
      el.innerHTML = "";
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.innerHTML = "";
    const alive = state.units.filter((u) => u.hp > 0);
    const sorted = [...alive].sort((a, b) => {
      const sa = classById(a.classId).spd;
      const sb = classById(b.classId).spd;
      const ta = (100 - a.ct) / sa;
      const tb = (100 - b.ct) / sb;
      return ta - tb;
    });
    const maxSlots = Math.min(8, sorted.length);
    for (let i = 0; i < maxSlots; i++) {
      const u = sorted[i];
      const def = classById(u.classId);
      const slot = document.createElement("div");
      slot.className =
        "fft-ct-slot " + (u.team === "player" ? "fft-ct-slot--player" : "fft-ct-slot--enemy");
      slot.title = def.name + " · CT " + Math.round(u.ct);
      const mini = gladiatorSpriteSvg(
        u.classId,
        u.team === "player" ? "player" : "enemy",
        9e4 + u.id * 32 + i
      );
      mini.classList.add("fft-ct-slot__sprite");
      const n = document.createElement("span");
      n.className = "fft-ct-slot__n";
      n.textContent = String(i + 1);
      slot.appendChild(mini);
      slot.appendChild(n);
      el.appendChild(slot);
    }
  }

  function showPhasePanels() {
    syncBodyPhaseClass();
    refreshCtStrip();
    const p = state.phase;
    phaseLabel.textContent =
      p === "ludus" ? "Ludus" : p === "deploy" ? "Gates" : "Arena";
    panelRoster.classList.toggle("is-hidden", p !== "ludus");
    panelDeploy.classList.toggle("is-hidden", p !== "deploy");
    panelBattle.classList.toggle("is-hidden", p !== "battle");
  }

  function refreshRosterUI() {
    budgetMax.textContent = String(BUDGET_MAX);
    let spent = 0;
    for (const pick of state.picks) spent += classById(pick.classId).cost;
    state.budget = BUDGET_MAX - spent;
    budgetValue.textContent = String(state.budget);

    classListEl.innerHTML = "";
    for (const c of GLADIATOR_CLASSES) {
      const row = document.createElement("div");
      row.className = "class-row" + (state.selectedClassId === c.id ? " is-selected" : "");

      // Sprite preview thumbnail
      const thumb = document.createElement("div");
      thumb.className = "class-row__sprite";
      const sprSvg = gladiatorSpriteSvg(c.id, "player", "preview_" + c.id);
      thumb.appendChild(sprSvg);

      const left = document.createElement("div");
      left.className = "class-row__info";
      left.innerHTML =
        '<div class="class-row__name">' +
        c.name +
        '</div><div class="class-row__meta">' +
        c.role +
        "</div>" +
        '<div class="class-row__stats">HP ' + c.hp + ' · ATK ' + c.atk +
        ' · DEF ' + c.def + ' · SPD ' + c.spd +
        ' · Move ' + c.move + ' · Jump ' + c.jump + "</div>" +
        '<div class="class-row__meta">' +
        c.abilities.map(function (a) { return a.name; }).join(", ") +
        "</div>";
      left.addEventListener("click", () => {
        state.selectedClassId = c.id;
        refreshRosterUI();
      });

      const hireWrap = document.createElement("div");
      hireWrap.className = "class-row__actions";
      const cost = document.createElement("span");
      cost.className = "class-row__cost";
      cost.textContent = c.cost + " d";
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "btn";
      addBtn.textContent = "Hire";
      addBtn.style.margin = "0";
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        hireClass(c.id);
      });
      hireWrap.appendChild(cost);
      hireWrap.appendChild(addBtn);

      row.appendChild(thumb);
      row.appendChild(left);
      row.appendChild(hireWrap);
      classListEl.appendChild(row);
    }

    pickedListEl.innerHTML = "";
    state.picks.forEach((pick, idx) => {
      const def = classById(pick.classId);
      const li = document.createElement("li");
      const miniSpr = gladiatorSpriteSvg(def.id, "player", "pick_" + idx);
      miniSpr.classList.add("picked__sprite");
      li.appendChild(miniSpr);
      const nameSpan = document.createElement("span");
      nameSpan.textContent = def.name;
      li.appendChild(nameSpan);
      const rm = document.createElement("button");
      rm.type = "button";
      rm.textContent = "Dismiss";
      rm.addEventListener("click", () => {
        state.picks.splice(idx, 1);
        refreshRosterUI();
      });
      li.appendChild(rm);
      pickedListEl.appendChild(li);
    });

    btnToDeploy.disabled = state.picks.length === 0 || state.budget < 0;
  }

  function hireClass(classId) {
    const c = classById(classId);
    const spent = state.picks.reduce((s, p) => s + classById(p.classId).cost, 0);
    if (spent + c.cost > BUDGET_MAX) {
      log("Not enough denarii for " + c.name + ".");
      return;
    }
    state.picks.push({ uid: "p" + state.unitSeq + "_" + state.picks.length, classId: c.id });
    log("Hired " + c.name + ".");
    refreshRosterUI();
  }

  function startDeploy() {
    if (!state.picks.length) return;
    state.phase = "deploy";
    state.deployTemplate = state.picks.map((p) => ({ ...p }));
    state.units = [];
    state.deploySelectedIndex = 0;
    placeEnemies();
    showPhasePanels();
    refreshDeployUI();
    renderBoard();
    log("Place your fighters on the blue gate tiles.");
  }

  function placeEnemies() {
    state.boutNumber++;
    var playerCount = Math.min(6, state.picks.length);
    var enemyCount = playerCount;
    var playerSpent = state.picks.reduce(function (s, p) { return s + classById(p.classId).cost; }, 0);
    var enemyBudget = Math.round(playerSpent * 1.15);

    var rng = seedRng(state.boutNumber * 997 + 13);

    var available = GLADIATOR_CLASSES.slice();
    var chosen = [];
    for (var i = 0; i < enemyCount; i++) {
      var affordable = available.filter(function (c) { return c.cost <= enemyBudget; });
      if (!affordable.length) affordable = GLADIATOR_CLASSES.slice();
      affordable.sort(function () { return rng() - 0.5; });
      var pick = affordable[0];
      chosen.push(pick.id);
      enemyBudget -= pick.cost;
      var idx = available.indexOf(pick);
      if (idx >= 0 && available.length > 1) available.splice(idx, 1);
    }

    var usedPositions = {};
    for (var j = 0; j < chosen.length; j++) {
      var px, py = (rng() < 0.5) ? 0 : 1;
      do { px = 1 + Math.floor(rng() * (BOARD_W - 2)); }
      while (usedPositions[px + "," + py]);
      usedPositions[px + "," + py] = true;
      state.units.push(createUnit("enemy", chosen[j], px, py));
    }
  }

  function refreshDeployUI() {
    deployQueueEl.innerHTML = "";
    const left = state.deployTemplate.filter((p) => !p.placed);
    state.deployTemplate.forEach((p, idx) => {
      const def = classById(p.classId);
      const li = document.createElement("li");
      li.textContent = def.name + (p.placed ? " ✓" : "");
      if (idx === state.deploySelectedIndex && !p.placed) li.classList.add("is-picked");
      li.addEventListener("click", () => {
        state.deploySelectedIndex = idx;
        refreshDeployUI();
        renderBoard();
      });
      deployQueueEl.appendChild(li);
    });
    btnToBattle.disabled = left.length > 0;
  }

  function onTileClick(x, y) {
    if (state.phase === "ludus") return;
    if (state.phase === "deploy") {
      var existing = occupantAt(x, y);
      if (existing && existing.team === "player") {
        var tplIdx = state.deployTemplate.findIndex(
          (p) => p.placed && p.classId === existing.classId
        );
        if (tplIdx >= 0) {
          state.deployTemplate[tplIdx].placed = false;
          state.units = state.units.filter((u) => u !== existing);
          state.deploySelectedIndex = tplIdx;
          refreshDeployUI();
          renderBoard();
          log("Recalled " + classById(existing.classId).name + ".");
        }
        return;
      }
      if (!isGateTile(x, y) || existing) return;
      const pick = state.deployTemplate[state.deploySelectedIndex];
      if (!pick || pick.placed) return;
      state.units.push(createUnit("player", pick.classId, x, y));
      pick.placed = true;
      const next = state.deployTemplate.findIndex((p) => !p.placed);
      state.deploySelectedIndex = next >= 0 ? next : 0;
      refreshDeployUI();
      renderBoard();
      log("Placed " + classById(pick.classId).name + ". Click to recall.");
      return;
    }
    if (state.phase === "battle") {
      handleBattleClick(x, y);
    }
  }

  function startBattle() {
    if (state.deployTemplate.some((p) => !p.placed)) return;
    state.phase = "battle";
    state.activeUnit = null;
    state.battleMode = "idle";
    state.highlightCells.clear();
    state.turnCount = 0;
    state.totalDamageDealt = 0;
    logFeed.innerHTML = "";
    showPhasePanels();
    unitCard.classList.add("is-hidden");
    bindBattleButtons();
    renderBoard();
    log("The editors salute. Fight!", "system");
    SFX.click();
    startBattleLoop();
    tickBattleTurn();
  }

  function bindBattleButtons() {
    btnMove.onclick = () => beginMoveMode();
    btnAttack.onclick = () => beginAttackMode();
    btnAbility.onclick = () => {
      const u = state.activeUnit;
      if (!u || u.team !== "player" || state.hasActed) return;
      if (abilityMenu.classList.contains("is-hidden")) {
        showAbilityMenu(u);
      } else {
        hideAbilityMenu();
      }
    };
    btnWait.onclick = () => waitAction();
  }

  function tickMarkDebuffIfNeeded(u) {
    if (u.markDebuffTurns > 0) {
      u.markDebuffTurns -= 1;
      if (u.markDebuffTurns <= 0) u.markFocusId = null;
    }
  }

  async function tickBattleTurn() {
    if (state.phase !== "battle") return;
    if (await checkVictoryAsync()) return;
    state.turnCount++;
    const actor = nextActor();
    refreshCtStrip();
    if (!actor) {
      log("Combat over.", "system");
      renderBoard();
      return;
    }
    if (actor.team === "enemy") {
      await runEnemyTurn(actor);
      if (await checkVictoryAsync()) return;
      await delay(200);
      tickBattleTurn();
      return;
    }
    if (actor.rootedSkip) {
      actor.rootedSkip = false;
      log(classById(actor.classId).name + " is netted and cannot act!");
      tickMarkDebuffIfNeeded(actor);
      renderBoard();
      await delay(350);
      tickBattleTurn();
      return;
    }
    actor.tempExtraMove = false;
    actor.testudoBonus = 0;
    state.activeUnit = actor;
    state.battleMode = "idle";
    state.highlightCells.clear();
    state.hasMoved = false;
    state.hasActed = false;
    state.selectedAbilityIndex = -1;
    showUnitPanel(actor);
    setBattleButtons(actor);
    renderBoard();
    log("Turn: " + classById(actor.classId).name + " — issue orders.", "system");
  }

  // -- Tile info & forecast --
  function showTileInfo(col, row) {
    if (!inBounds(col, row)) { hideTileInfo(); return; }
    var h = state.height[row][col];
    var zone = tileZone(col, row);
    var hName = h === 0 ? "Low" : h === 1 ? "Mid" : "High";
    var txt = zone.charAt(0).toUpperCase() + zone.slice(1) + " · H:" + hName;
    var occ = occupantAt(col, row);
    if (occ) {
      var def = classById(occ.classId);
      txt += " · " + def.name + " (" + occ.team + ") HP:" + occ.hp + "/" + occ.maxHp;
    }
    tileInfoEl.textContent = txt;
    tileInfoEl.classList.remove("is-hidden");
  }

  function hideTileInfo() {
    tileInfoEl.classList.add("is-hidden");
  }

  function showForecast(attacker, target, abilityIdx) {
    var def = classById(target.classId);
    var hitPct = computeHitChance(attacker, target);
    var label = "Attack";
    var dmg, mult = 1, ignDef = 0;
    if (abilityIdx >= 0) {
      var ab = classById(attacker.classId).abilities[abilityIdx];
      if (ab) { label = ab.name; mult = ab.mult || 1; ignDef = ab.ignoreDefPct || 0; }
    }
    dmg = physicalDamage(attacker, target, mult, ignDef, true);
    var html = '<div class="fc-name">' + def.name + '</div>';
    html += '<div class="fc-hit">Hit: ' + hitPct + '%</div>';
    html += '<div class="fc-dmg">' + label + ': ~' + dmg + ' dmg</div>';
    forecastEl.innerHTML = html;
    forecastEl.classList.remove("is-hidden");
  }

  function hideForecast() {
    forecastEl.classList.add("is-hidden");
  }

  function showUnitPanel(u) {
    const def = classById(u.classId);
    unitCard.classList.remove("is-hidden");
    ucName.textContent = def.name;
    ucClass.textContent = def.role;
    ucHp.textContent = u.hp + " / " + u.maxHp;
    ucAtk.textContent = String(def.atk);
    ucDef.textContent = String(def.def);
    ucSpd.textContent = String(def.spd);
    ucMove.textContent = String(effectiveMove(u));
    ucJump.textContent = String(def.jump);
    ucAbility.textContent = def.abilities.map(function (a) { return a.name + " — " + a.desc; }).join(" | ");
    var existingStatus = unitCard.querySelector(".uc-status");
    if (existingStatus) existingStatus.remove();
    var icons = getUnitStatusIcons(u);
    if (icons.length) {
      var statusDiv = document.createElement("div");
      statusDiv.className = "uc-status";
      for (var i = 0; i < icons.length; i++) {
        var badge = document.createElement("span");
        badge.className = "uc-status__badge";
        badge.textContent = icons[i].label;
        badge.style.borderColor = icons[i].color;
        badge.style.color = icons[i].color;
        statusDiv.appendChild(badge);
      }
      unitCard.appendChild(statusDiv);
    }
  }

  function setBattleButtons(u) {
    const alive = u.hp > 0;
    btnMove.disabled = !alive || state.hasMoved;
    btnAttack.disabled = !alive || state.hasActed;
    btnAbility.disabled = !alive || state.hasActed;
    btnWait.disabled = !alive;
    hideAbilityMenu();
  }

  function showAbilityMenu(u) {
    const def = classById(u.classId);
    abilityMenu.innerHTML = "";
    def.abilities.forEach(function (ab, idx) {
      const btn = document.createElement("button");
      btn.className = "ability-menu__btn";
      btn.innerHTML = ab.name + "<small>" + ab.desc + "</small>";
      btn.addEventListener("click", function () {
        hideAbilityMenu();
        state.selectedAbilityIndex = idx;
        beginAbilityTargeting(u, ab, idx);
      });
      abilityMenu.appendChild(btn);
    });
    abilityMenu.classList.remove("is-hidden");
  }

  function hideAbilityMenu() {
    abilityMenu.classList.add("is-hidden");
    abilityMenu.innerHTML = "";
  }

  async function clearPlayerTurn() {
    const actor = state.activeUnit;
    if (actor) tickMarkDebuffIfNeeded(actor);
    state.activeUnit = null;
    state.battleMode = "idle";
    state.highlightCells.clear();
    state.hasMoved = false;
    state.hasActed = false;
    state.selectedAbilityIndex = -1;
    hideForecast();
    unitCard.classList.add("is-hidden");
    hideAbilityMenu();
    btnMove.disabled = true;
    btnAttack.disabled = true;
    btnAbility.disabled = true;
    btnWait.disabled = true;
    renderBoard();
    await delay(250);
    tickBattleTurn();
  }

  function endMove() {
    state.hasMoved = true;
    state.battleMode = "idle";
    state.highlightCells.clear();
    hideForecast();
    const u = state.activeUnit;
    if (u) {
      showUnitPanel(u);
      setBattleButtons(u);
    }
    renderBoard();
  }

  function endAction() {
    state.hasActed = true;
    clearPlayerTurn();
  }

  function waitAction() {
    if (!state.activeUnit || state.activeUnit.team !== "player") return;
    log("Guard.");
    clearPlayerTurn();
  }

  function beginMoveMode() {
    const u = state.activeUnit;
    if (!u || u.team !== "player" || state.hasMoved) return;
    hideAbilityMenu();
    hideForecast();
    const reach = computeMoves(u);
    state.battleMode = "move";
    state.highlightCells = new Set(reach.keys());
    log("Select a highlighted tile to move.");
    renderBoard();
  }

  function beginAttackMode() {
    const u = state.activeUnit;
    if (!u || u.team !== "player" || state.hasActed) return;
    hideAbilityMenu();
    state.battleMode = "attack";
    state.highlightCells = new Set();
    for (const [dx, dy] of DIRS) {
      const tx = u.x + dx;
      const ty = u.y + dy;
      if (!inBounds(tx, ty)) continue;
      const t = occupantAt(tx, ty);
      if (t && t.team !== u.team) state.highlightCells.add(cellKey(tx, ty));
    }
    log("Select an adjacent foe to strike.");
    renderBoard();
  }

  function beginAbilityTargeting(u, ab, idx) {
    state.battleMode = "ability";
    state.selectedAbilityIndex = idx;
    state.highlightCells.clear();

    if (ab.target === "self" || ab.target === "aoe_adjacent") {
      state.highlightCells.add(cellKey(u.x, u.y));
      log(ab.name + " — click your tile to activate.");
    } else if (ab.target === "adjacent_enemy") {
      for (const [dx, dy] of DIRS) {
        const tx = u.x + dx;
        const ty = u.y + dy;
        if (!inBounds(tx, ty)) continue;
        const t = occupantAt(tx, ty);
        if (t && t.team !== u.team) state.highlightCells.add(cellKey(tx, ty));
      }
      log(ab.name + " — choose adjacent enemy.");
    } else if (ab.target === "line") {
      const range = ab.range || 3;
      for (const [dx, dy] of DIRS) {
        for (let s = 1; s <= range; s++) {
          const tx = u.x + dx * s;
          const ty = u.y + dy * s;
          if (!inBounds(tx, ty)) break;
          state.highlightCells.add(cellKey(tx, ty));
          if (occupantAt(tx, ty)) break;
        }
      }
      log(ab.name + " — pick a direction tile.");
    } else {
      state.battleMode = "idle";
      log("No valid target.");
      return;
    }
    renderBoard();
  }

  async function handleBattleClick(x, y) {
    const u = state.activeUnit;
    if (!u || u.team !== "player" || state.animating) return;

    if (state.battleMode === "move") {
      const k = cellKey(x, y);
      if (!state.highlightCells.has(k)) return;
      state.animating = true;
      var path = computePath(u, x, y);
      await animateMove(u, path);
      state.animating = false;
      log("Advance! — choose an action.");
      endMove();
      return;
    }
    if (state.battleMode === "attack") {
      const k = cellKey(x, y);
      if (!state.highlightCells.has(k)) return;
      const tgt = occupantAt(x, y);
      if (!tgt || tgt.team === u.team) return;
      state.animating = true;
      const hitPct = computeHitChance(u, tgt);
      await animateAttack(u, tgt);
      if (!rollHit(u, tgt)) {
        SFX.miss();
        spawnDmgNumber(tgt, "MISS", "#aaaaaa");
        log(classById(u.classId).name + " misses " + classById(tgt.classId).name + "! (" + hitPct + "% hit)");
        state.animating = false;
        endAction();
        return;
      }
      SFX.hit();
      let dmg = physicalDamage(u, tgt, 1);
      if (tgt.riposteActive) {
        applyDamage(u, 5);
        tgt.riposteActive = false;
        log("Riposte pricks the attacker!");
      }
      applyDamage(tgt, dmg);
      await Promise.all([animateHitFlash(tgt), screenShake(100, 3)]);
      log(
        classById(u.classId).name + " hits " + classById(tgt.classId).name + " for " + dmg + ". (" + hitPct + "% hit)"
      );
      if (tgt.hp <= 0) await animateDeath(tgt);
      state.animating = false;
      if (await checkVictoryAsync()) return;
      endAction();
      return;
    }
    if (state.battleMode === "ability") {
      state.animating = true;
      try {
        await doPlayerAbility(u, x, y);
      } finally {
        state.animating = false;
      }
      if (await checkVictoryAsync()) return;
      return;
    }
  }

  async function doPlayerAbility(u, x, y) {
    const cid = u.classId;
    const k = cellKey(x, y);
    const def = classById(cid);
    const ab = def.abilities[state.selectedAbilityIndex];
    if (!ab) return;
    if (!state.highlightCells.has(k)) return;

    SFX.ability();

    if (ab.target === "self") {
      if (x !== u.x || y !== u.y) return;
      return executeAbilitySelf(u, ab);
    }

    if (ab.target === "aoe_adjacent") {
      if (x !== u.x || y !== u.y) return;
      const foes = [];
      for (const [dx, dy] of DIRS) {
        const tx = u.x + dx;
        const ty = u.y + dy;
        const t = occupantAt(tx, ty);
        if (t && t.team !== u.team) foes.push(t);
      }
      for (const f of foes) {
        const dmg = physicalDamage(u, f, ab.mult || 1);
        if (f.riposteActive) {
          applyDamage(u, 5);
          f.riposteActive = false;
          log("Riposte pricks the whirlwind!");
        }
        applyDamage(f, dmg);
        await Promise.all([animateHitFlash(f), screenShake(80, 2)]);
        log("Cyclone cuts " + classById(f.classId).name + " (" + dmg + ").");
        if (f.hp <= 0) await animateDeath(f);
      }
      if (!foes.length) log("Whirl in empty air.");
      if (ab.selfDamage) applyDamage(u, ab.selfDamage);
      endAction();
      return;
    }

    if (ab.target === "line") {
      const dx = Math.sign(x - u.x);
      const dy = Math.sign(y - u.y);
      if (Math.abs(dx) + Math.abs(dy) !== 1) return;
      const range = ab.range || 3;
      let cx = u.x + dx;
      let cy = u.y + dy;
      let hit = null;
      while (inBounds(cx, cy) && Math.abs(cx - u.x) + Math.abs(cy - u.y) <= range) {
        const occ = occupantAt(cx, cy);
        if (occ && occ.team !== u.team) { hit = occ; break; }
        cx += dx;
        cy += dy;
      }
      if (!hit) {
        log(ab.name + " strikes only sand.");
        endAction();
        return;
      }
      const hitPct = computeHitChance(u, hit);
      await animateAttack(u, { x: cx, y: cy });
      if (!rollHit(u, hit)) {
        SFX.miss();
        spawnDmgNumber(hit, "MISS", "#aaaaaa");
        log(ab.name + " misses! (" + hitPct + "% hit)");
        endAction();
        return;
      }
      SFX.hit();
      const dmg = physicalDamage(u, hit, ab.mult || 1, ab.ignoreDefPct || 0);
      if (hit.riposteActive && manhattan(u, hit) <= 1) {
        applyDamage(u, 5);
        hit.riposteActive = false;
        log("Riposte!");
      }
      applyDamage(hit, dmg);
      await Promise.all([animateHitFlash(hit), screenShake(80, 2)]);
      log(ab.name + " pierces for " + dmg + ". (" + hitPct + "% hit)");
      if (ab.selfDamage) applyDamage(u, ab.selfDamage);
      if (hit.hp <= 0) await animateDeath(hit);
      endAction();
      return;
    }

    if (ab.target === "adjacent_enemy") {
      const tgt = occupantAt(x, y);
      if (!tgt || tgt.team === u.team) return;
      return executeAbilityOnTarget(u, tgt, ab);
    }
  }

  function executeAbilitySelf(u, ab) {
    const cid = u.classId;
    const name = ab.name;

    if (cid === "murmillo" && name === "Cetus Wall") {
      u.braceCharges = 1;
      log("Cetus Wall — you brace for impact.");
    } else if (cid === "murmillo" && name === "Testudo") {
      u.testudoBonus = 3;
      log("Testudo — shield raised, +3 DEF this round.");
    } else if (cid === "thraex" && name === "Sica Riposte") {
      u.riposteActive = true;
      log("Sica Riposte — blade ready.");
    } else if (cid === "secutor" && name === "Umbra") {
      u.tempExtraMove = true;
      log("Umbra — paths lengthen (Move +1).");
      ucMove.textContent = String(effectiveMove(u));
    } else if (cid === "provocator" && name === "Rally") {
      const heal = Math.round(u.maxHp * 0.2);
      u.hp = Math.min(u.maxHp, u.hp + heal);
      spawnDmgNumber(u, "+" + heal, "#70d870");
      log("Rally — restored " + heal + " HP.");
    } else {
      log(ab.name + " activated.");
    }
    endAction();
  }

  async function executeAbilityOnTarget(u, tgt, ab) {
    const cid = u.classId;
    const name = ab.name;

    if (cid === "retiarius" && name === "Iaculum") {
      tgt.rootedSkip = true;
      log("Iaculum — netted!");
      endAction();
      return;
    }

    if (cid === "provocator" && name === "Provocatio") {
      tgt.markDebuffTurns = 2;
      tgt.markFocusId = u.id;
      log("Provocatio — the crowd roars your name.");
      endAction();
      return;
    }

    if (ab.effect === "push") {
      const dx = tgt.x - u.x;
      const dy = tgt.y - u.y;
      const nx = tgt.x + dx;
      const ny = tgt.y + dy;
      if (ab.mult && ab.mult > 0) {
        await animateAttack(u, tgt);
        const hitPct = computeHitChance(u, tgt);
        if (!rollHit(u, tgt)) {
          SFX.miss();
          spawnDmgNumber(tgt, "MISS", "#aaaaaa");
          log(ab.name + " misses! (" + hitPct + "% hit)");
          endAction();
          return;
        }
        SFX.hit();
        const dmg = physicalDamage(u, tgt, ab.mult, ab.ignoreDefPct || 0);
        applyDamage(tgt, dmg);
        await Promise.all([animateHitFlash(tgt), screenShake(80, 2)]);
        log(ab.name + " deals " + dmg + ". (" + hitPct + "% hit)");
        if (tgt.hp <= 0) { await animateDeath(tgt); endAction(); return; }
      }
      if (inBounds(nx, ny) && !occupantAt(nx, ny)) {
        await animateMove(tgt, [[nx, ny]]);
        log((ab.mult ? "" : ab.name + " — ") + "Pushed back!");
      } else {
        if (!ab.mult) log("No room to shove.");
      }
      if (ab.selfDamage) applyDamage(u, ab.selfDamage);
      endAction();
      return;
    }

    if (ab.type === "attack") {
      await animateAttack(u, tgt);
      const hitPct = computeHitChance(u, tgt);
      if (!rollHit(u, tgt)) {
        SFX.miss();
        spawnDmgNumber(tgt, "MISS", "#aaaaaa");
        log(ab.name + " misses! (" + hitPct + "% hit)");
        if (ab.selfDamage) applyDamage(u, ab.selfDamage);
        endAction();
        return;
      }
      SFX.hit();
      const dmg = physicalDamage(u, tgt, ab.mult || 1, ab.ignoreDefPct || 0);
      if (tgt.riposteActive) {
        applyDamage(u, 5);
        tgt.riposteActive = false;
        log("Riposte!");
      }
      applyDamage(tgt, dmg);
      await Promise.all([animateHitFlash(tgt), screenShake(80, 2)]);
      log(ab.name + " deals " + dmg + " to " + classById(tgt.classId).name + ". (" + hitPct + "% hit)");
      if (ab.selfDamage) applyDamage(u, ab.selfDamage);
      if (tgt.hp <= 0) await animateDeath(tgt);
      endAction();
      return;
    }

    endAction();
  }

  function checkVictory() {
    const pAlive = state.units.some((u) => u.team === "player" && u.hp > 0);
    const eAlive = state.units.some((u) => u.team === "enemy" && u.hp > 0);
    if (!eAlive && pAlive) return "victory";
    if (!pAlive) return "defeat";
    return null;
  }

  async function checkVictoryAsync() {
    const result = checkVictory();
    if (!result) return false;
    await delay(300);
    showResultOverlay(result);
    return true;
  }

  function showResultOverlay(result) {
    const won = result === "victory";
    if (won) { SFX.victory(); } else { SFX.defeat(); }
    resultOverlay.classList.remove("is-hidden", "result-overlay--victory", "result-overlay--defeat");
    resultOverlay.classList.add(won ? "result-overlay--victory" : "result-overlay--defeat");
    resultTitle.textContent = won ? "VICTORIA!" : "DEFEAT";

    var pAlive = state.units.filter(function (u) { return u.team === "player" && u.hp > 0; }).length;
    var pTotal = state.units.filter(function (u) { return u.team === "player"; }).length;
    var html = "<p><strong>" + pAlive + "</strong> of <strong>" + pTotal + "</strong> gladiators standing</p>";
    html += "<p><strong>" + state.turnCount + "</strong> turns fought</p>";
    html += "<p><strong>" + state.totalDamageDealt + "</strong> damage dealt to enemies</p>";
    if (won) {
      html += '<p style="color:var(--fft-gold);margin-top:0.5rem;">The crowd chants your name!</p>';
    } else {
      html += '<p style="color:var(--fft-red);margin-top:0.5rem;">The sand claims another lanista\'s pride.</p>';
    }
    resultBody.innerHTML = html;
  }

  function closeResultAndReset() {
    resultOverlay.classList.add("is-hidden");
    state.phase = "ludus";
    state.units = [];
    showPhasePanels();
    refreshRosterUI();
    renderBoard();
    logFeed.innerHTML = "";
  }

  async function runEnemyTurn(enemy) {
    const players = state.units.filter((u) => u.team === "player" && u.hp > 0);
    if (!players.length) return;
    const eDef = classById(enemy.classId);
    enemy.testudoBonus = 0;
    enemy.tempExtraMove = false;

    const target = players.reduce((a, b) =>
      manhattan(enemy, a) <= manhattan(enemy, b) ? a : b
    );

    var usedAbilityPreMove = false;
    if (eDef.abilities && manhattan(enemy, target) > 1) {
      usedAbilityPreMove = await aiTryPreMoveAbility(enemy, eDef, players, target);
    }

    if (!usedAbilityPreMove) {
      const reach = computeMoves(enemy);
      let best = null;
      let bestScore = 1e9;
      for (const [key] of reach) {
        const [sx, sy] = key.split(",").map(Number);
        if (occupantAt(sx, sy) && !(sx === enemy.x && sy === enemy.y)) continue;
        const d = manhattan({ x: sx, y: sy }, target);
        const h = state.height[sy][sx];
        const score = d * 100 - h;
        if (score < bestScore) { bestScore = score; best = { x: sx, y: sy }; }
      }
      if (best && (best.x !== enemy.x || best.y !== enemy.y)) {
        var ePath = computePath(enemy, best.x, best.y);
        if (ePath.length) await animateMove(enemy, ePath);
      }
    }

    const adjTargets = [];
    for (const [dx, dy] of DIRS) {
      const tx = enemy.x + dx;
      const ty = enemy.y + dy;
      const occ = inBounds(tx, ty) ? occupantAt(tx, ty) : null;
      if (occ && occ.team === "player" && occ.hp > 0) adjTargets.push(occ);
    }

    if (adjTargets.length > 0 && !usedAbilityPreMove) {
      const adjTarget = adjTargets.reduce((a, b) => a.hp <= b.hp ? a : b);

      var usedAdj = false;
      if (Math.random() < 0.4 && eDef.abilities) {
        usedAdj = await aiTryAdjacentAbility(enemy, eDef, adjTargets, adjTarget);
      }

      if (!usedAdj) {
        await aiBasicAttack(enemy, adjTarget);
      }
    } else if (adjTargets.length === 0 && !usedAbilityPreMove) {
      if (eDef.abilities && !await aiTryLineAttack(enemy, eDef, players)) {
        log(eDef.name + " closes distance.");
      }
    }

    tickMarkDebuffIfNeeded(enemy);
    renderBoard();
  }

  async function aiTryPreMoveAbility(enemy, eDef, players, target) {
    var hpPct = enemy.hp / enemy.maxHp;
    for (const ab of eDef.abilities) {
      if (ab.type === "heal" && ab.target === "self" && hpPct < 0.5) {
        SFX.ability();
        var heal = Math.round(enemy.maxHp * 0.2);
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
        spawnDmgNumber(enemy, "+" + heal, "#80ff80");
        log(eDef.name + " uses " + ab.name + " (+" + heal + " HP).");
        return true;
      }
      if (ab.type === "buff" && ab.target === "self") {
        if (ab.name === "Testudo" && Math.random() < 0.5) {
          SFX.ability();
          enemy.testudoBonus = 3;
          log(eDef.name + " raises Testudo (+3 DEF).");
          return true;
        }
        if (ab.name === "Cetus Wall" && Math.random() < 0.4) {
          SFX.ability();
          enemy.braceCharges += 1;
          log(eDef.name + " braces with Cetus Wall.");
          return true;
        }
        if (ab.name === "Sica Riposte" && Math.random() < 0.4 && manhattan(enemy, target) <= 2) {
          SFX.ability();
          enemy.riposteActive = true;
          log(eDef.name + " readies Sica Riposte.");
          return true;
        }
        if (ab.name === "Umbra" && Math.random() < 0.6) {
          SFX.ability();
          enemy.tempExtraMove = true;
          log(eDef.name + " uses Umbra (+1 move).");
          return false;
        }
      }
      if (ab.type === "debuff" && ab.target === "adjacent_enemy" && ab.name === "Iaculum") {
        if (manhattan(enemy, target) <= 1 && Math.random() < 0.5 && !target.rootedSkip) {
          SFX.ability();
          target.rootedSkip = true;
          log(eDef.name + " nets " + classById(target.classId).name + "!");
          return true;
        }
      }
    }
    return false;
  }

  async function aiTryAdjacentAbility(enemy, eDef, adjTargets, adjTarget) {
    const abilities = eDef.abilities;
    if (!abilities) return false;

    for (const ab of abilities) {
      if (ab.target === "aoe_adjacent" && adjTargets.length >= 2 && Math.random() < 0.6) {
        SFX.ability();
        for (const t of adjTargets) {
          const dmg = physicalDamage(enemy, t, ab.mult || 1);
          applyDamage(t, dmg);
          await Promise.all([animateHitFlash(t), screenShake(80, 2)]);
          log(eDef.name + " uses " + ab.name + " on " + classById(t.classId).name + " (" + dmg + ").");
          if (t.hp <= 0) await animateDeath(t);
        }
        return true;
      }

      if (ab.type === "debuff" && ab.target === "adjacent_enemy" && ab.name === "Provocatio") {
        if (Math.random() < 0.35 && adjTarget.markDebuffTurns <= 0) {
          SFX.ability();
          adjTarget.markDebuffTurns = 2;
          adjTarget.markFocusId = enemy.id;
          log(eDef.name + " marks " + classById(adjTarget.classId).name + " with Provocatio!");
          return true;
        }
      }

      if (ab.type === "debuff" && ab.target === "adjacent_enemy" && ab.name === "Iaculum") {
        if (Math.random() < 0.45 && !adjTarget.rootedSkip) {
          SFX.ability();
          adjTarget.rootedSkip = true;
          log(eDef.name + " nets " + classById(adjTarget.classId).name + "!");
          return true;
        }
      }

      if (ab.type === "attack" && ab.target === "adjacent_enemy" && ab.effect === "push") {
        if (Math.random() < 0.35) {
          SFX.ability();
          await animateAttack(enemy, adjTarget);
          if (rollHit(enemy, adjTarget)) {
            SFX.hit();
            const dmg = physicalDamage(enemy, adjTarget, ab.mult || 1);
            applyDamage(adjTarget, dmg);
            await Promise.all([animateHitFlash(adjTarget), screenShake(80, 2)]);
            log(eDef.name + " uses " + ab.name + " on " + classById(adjTarget.classId).name + " (" + dmg + ").");
            const pdx = adjTarget.x - enemy.x;
            const pdy = adjTarget.y - enemy.y;
            const pnx = adjTarget.x + pdx;
            const pny = adjTarget.y + pdy;
            if (inBounds(pnx, pny) && !occupantAt(pnx, pny)) {
              await animateMove(adjTarget, [[pnx, pny]]);
            }
            if (adjTarget.hp <= 0) await animateDeath(adjTarget);
          } else {
            SFX.miss();
            spawnDmgNumber(adjTarget, "MISS", "#aaaaaa");
            log(eDef.name + " uses " + ab.name + " — misses!");
          }
          return true;
        }
      }

      if (ab.type === "attack" && ab.target === "adjacent_enemy" && !ab.effect && Math.random() < 0.35) {
        SFX.ability();
        await animateAttack(enemy, adjTarget);
        if (rollHit(enemy, adjTarget)) {
          SFX.hit();
          const dmg = physicalDamage(enemy, adjTarget, ab.mult || 1, ab.ignoreDefPct || 0);
          if (adjTarget.riposteActive) { applyDamage(enemy, 5); adjTarget.riposteActive = false; }
          applyDamage(adjTarget, dmg);
          await Promise.all([animateHitFlash(adjTarget), screenShake(80, 2)]);
          log(eDef.name + " uses " + ab.name + " on " + classById(adjTarget.classId).name + " (" + dmg + ").");
          if (ab.selfDamage) applyDamage(enemy, ab.selfDamage);
          if (adjTarget.hp <= 0) await animateDeath(adjTarget);
        } else {
          SFX.miss();
          spawnDmgNumber(adjTarget, "MISS", "#aaaaaa");
          log(eDef.name + " uses " + ab.name + " — misses!");
        }
        return true;
      }
    }
    return false;
  }

  async function aiTryLineAttack(enemy, eDef, players) {
    const abilities = eDef.abilities;
    if (!abilities) return false;
    for (const ab of abilities) {
      if (ab.type !== "attack" || ab.target !== "line") continue;
      const range = ab.range || 3;
      for (const [dx, dy] of DIRS) {
        for (let s = 1; s <= range; s++) {
          const tx = enemy.x + dx * s;
          const ty = enemy.y + dy * s;
          if (!inBounds(tx, ty)) break;
          const occ = occupantAt(tx, ty);
          if (occ && occ.team === "player" && occ.hp > 0) {
            SFX.ability();
            await animateAttack(enemy, occ);
            if (rollHit(enemy, occ)) {
              SFX.hit();
              const dmg = physicalDamage(enemy, occ, ab.mult || 1, ab.ignoreDefPct || 0);
              if (occ.riposteActive && s === 1) { applyDamage(enemy, 5); occ.riposteActive = false; }
              applyDamage(occ, dmg);
              await Promise.all([animateHitFlash(occ), screenShake(80, 2)]);
              log(eDef.name + " uses " + ab.name + " on " + classById(occ.classId).name + " (" + dmg + ").");
              if (occ.hp <= 0) await animateDeath(occ);
            } else {
              SFX.miss();
              spawnDmgNumber(occ, "MISS", "#aaaaaa");
              log(eDef.name + " uses " + ab.name + " — misses!");
            }
            return true;
          }
          if (occ) break;
        }
      }
    }
    return false;
  }

  async function aiBasicAttack(enemy, adjTarget) {
    const eDef = classById(enemy.classId);
    await animateAttack(enemy, adjTarget);
    const hitPct = computeHitChance(enemy, adjTarget);
    if (rollHit(enemy, adjTarget)) {
      SFX.hit();
      const dmg = physicalDamage(enemy, adjTarget, 1);
      if (adjTarget.riposteActive) {
        applyDamage(enemy, 5);
        adjTarget.riposteActive = false;
      }
      applyDamage(adjTarget, dmg);
      await Promise.all([animateHitFlash(adjTarget), screenShake(100, 3)]);
      log(eDef.name + " strikes " + classById(adjTarget.classId).name + " for " + dmg + ". (" + hitPct + "%)");
      if (adjTarget.hp <= 0) await animateDeath(adjTarget);
    } else {
      SFX.miss();
      spawnDmgNumber(adjTarget, "MISS", "#aaaaaa");
      log(eDef.name + " swings at " + classById(adjTarget.classId).name + " — misses! (" + hitPct + "%)");
    }
  }

  function init() {
    renderer = new IsoRenderer(isoCanvas);
    renderer.resize(BOARD_W, BOARD_H);
    initSpriteCache();

    isoCanvas.addEventListener("click", function (e) {
      const rect = isoCanvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cell = renderer.screenToGrid(mx, my);
      if (cell) onTileClick(cell.col, cell.row);
    });

    isoCanvas.addEventListener("mousemove", function (e) {
      const rect = isoCanvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cell = renderer.screenToGrid(mx, my);
      if (cell) {
        if (state.phase === "battle" || state.phase === "deploy") {
          showTileInfo(cell.col, cell.row);
        }
        const key = cellKey(cell.col, cell.row);
        if (state.highlightCells.has(key)) {
          if (state.battleMode === "attack" || state.battleMode === "ability") {
            isoCanvas.style.cursor = "crosshair";
            var u = state.activeUnit;
            var tgt = occupantAt(cell.col, cell.row);
            if (u && tgt && tgt.team !== u.team) {
              showForecast(u, tgt, state.battleMode === "ability" ? state.selectedAbilityIndex : -1);
            } else {
              hideForecast();
            }
          } else {
            isoCanvas.style.cursor = "pointer";
            hideForecast();
          }
        } else {
          isoCanvas.style.cursor = "default";
          hideForecast();
        }
      } else {
        isoCanvas.style.cursor = "default";
        hideTileInfo();
        hideForecast();
      }
    });

    isoCanvas.addEventListener("mouseleave", function () {
      hideTileInfo();
      hideForecast();
    });

    // Zoom via scroll wheel
    isoCanvas.addEventListener("wheel", function (e) {
      e.preventDefault();
      var delta = e.deltaY > 0 ? -0.1 : 0.1;
      renderer.setZoom(renderer.zoom + delta);
      renderBoard();
    }, { passive: false });

    // Rotation via Q / E keys
    window.addEventListener("keydown", function (e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "q" || e.key === "Q") {
        renderer.rotate(-1);
        renderBoard();
      } else if (e.key === "e" || e.key === "E") {
        renderer.rotate(1);
        renderBoard();
      }
    });

    // Pan via middle-mouse or right-click drag
    isoCanvas.addEventListener("mousedown", function (e) {
      if (e.button === 1 || e.button === 2) {
        e.preventDefault();
        renderer._isPanning = true;
        renderer._panStartX = e.clientX;
        renderer._panStartY = e.clientY;
        renderer._panOriginX = renderer.panX;
        renderer._panOriginY = renderer.panY;
      }
    });
    window.addEventListener("mousemove", function (e) {
      if (!renderer._isPanning) return;
      renderer.panX = renderer._panOriginX + (renderer._panStartX - e.clientX) / renderer.zoom;
      renderer.panY = renderer._panOriginY + (renderer._panStartY - e.clientY) / renderer.zoom;
      renderBoard();
    });
    window.addEventListener("mouseup", function (e) {
      if (e.button === 1 || e.button === 2) {
        renderer._isPanning = false;
      }
    });
    isoCanvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });

    // Camera control buttons
    btnRotL.addEventListener("click", function () { renderer.rotate(-1); renderBoard(); });
    btnRotR.addEventListener("click", function () { renderer.rotate(1); renderBoard(); });
    btnZoomIn.addEventListener("click", function () { renderer.setZoom(renderer.zoom + 0.15); renderBoard(); });
    btnZoomOut.addEventListener("click", function () { renderer.setZoom(renderer.zoom - 0.15); renderBoard(); });
    btnCamReset.addEventListener("click", function () {
      renderer.zoom = 1.0;
      renderer.panX = 0;
      renderer.panY = 0;
      renderer.rotStep = 0;
      renderer._recalcLayout();
      renderBoard();
    });

    window.addEventListener("resize", function () {
      renderer.resize(BOARD_W, BOARD_H);
      renderBoard();
    });

    btnClearRoster.addEventListener("click", () => {
      state.picks = [];
      refreshRosterUI();
    });
    btnToDeploy.addEventListener("click", startDeploy);
    btnToBattle.addEventListener("click", startBattle);
    btnBackLudus.addEventListener("click", () => {
      state.phase = "ludus";
      state.units = [];
      showPhasePanels();
      refreshRosterUI();
      renderBoard();
    });
    btnResultContinue.addEventListener("click", closeResultAndReset);

    budgetMax.textContent = String(BUDGET_MAX);
    refreshRosterUI();
    showPhasePanels();
    setTimeout(renderBoard, 120);

  }

  var battleLoopRunning = false;
  function startBattleLoop() {
    if (battleLoopRunning) return;
    battleLoopRunning = true;
    (function pulseLoop() {
      if (state.phase !== "battle") { battleLoopRunning = false; return; }
      renderBoard();
      requestAnimationFrame(pulseLoop);
    })();
  }

  init();
})();
