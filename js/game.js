/**
 * Geminus Ratio — Ludus tactics prototype
 * Phases: ludus (point buy) → deploy → battle (FFT-style CT, grid move/attack)
 */
(function () {
  "use strict";

  var BOARD_W = 12;
  var BOARD_H = 10;
  const MAX_ROSTER = 6;
  const BUDGET_MAX_DEFAULT = 140;
  var budgetCurrent = BUDGET_MAX_DEFAULT;

  var skirmishConfig = {
    enemyCount: 3,
    budget: BUDGET_MAX_DEFAULT,
    mapSize: "medium",
    terrainDensity: "normal",
    seed: null,
    template: null,
  };
  var MAP_SIZES = { small: { w: 8, h: 7 }, medium: { w: 12, h: 10 }, large: { w: 14, h: 12 } };
  var MAP_MODIFIER_DEFS = {
    cursed_3:  { type: "cursed", count: 3, dmg: 3 },
    cursed_4:  { type: "cursed", count: 4, dmg: 3 },
    cursed_5:  { type: "cursed", count: 5, dmg: 3 },
    cursed_6:  { type: "cursed", count: 6, dmg: 3 },
    cursed_8:  { type: "cursed", count: 8, dmg: 4 },
    cursed_10: { type: "cursed", count: 10, dmg: 4 },
    cursed_12: { type: "cursed", count: 12, dmg: 5 },
    full_curse: { type: "full_curse", dmg: 3 },
    ritual_pulse_4: { type: "ritual_pulse", interval: 4, dmg: 2 },
    ritual_pulse_3: { type: "ritual_pulse", interval: 3, dmg: 3 },
    ritual_pulse_2: { type: "ritual_pulse", interval: 2, dmg: 4 },
    ritual_pulse_1: { type: "ritual_pulse", interval: 1, dmg: 3 },
    crowd_surge_5:  { type: "crowd_surge", turn: 5, spdPenalty: 1 },
    crowd_madness:  { type: "crowd_madness", spdPenalty: 1 },
    crowd_madness_2: { type: "crowd_madness", spdPenalty: 2 },
    collapsing: { type: "collapsing" },
  };

  const DIRS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  const LEVEL_TABLE = [
    { level: 1, xp: 0 },
    { level: 2, xp: 20 },
    { level: 3, xp: 50 },
    { level: 4, xp: 100 },
    { level: 5, xp: 170 },
    { level: 6, xp: 260 },
  ];
  const XP_PER_HIT = 5;
  const XP_PER_KILL = 20;
  const MAX_LEVEL = 6;

  const ROMAN_NAMES = [
    "Aelianus","Agrippa","Antonius","Aquila","Atticus","Augustus",
    "Aurelius","Balbus","Blasius","Brennus","Brutus","Caelus",
    "Cassius","Cato","Corvinus","Corvus","Crispus","Cursor",
    "Decimus","Drusus","Fabius","Falco","Felix","Festus",
    "Flaccus","Flavius","Gallus","Gaius","Germanus","Gracchus",
    "Hadrianus","Hector","Horatius","Ignatius","Julianus","Justus",
    "Labienus","Lentulus","Lepidus","Longinus","Lucius","Lucullus",
    "Magnus","Marcellus","Marcus","Marius","Maximus","Metellus",
    "Nero","Nerva","Niger","Norbanus","Octavius","Otho",
    "Paullus","Perseus","Petrus","Pilatus","Pius","Plautus",
    "Pollio","Pompeius","Primus","Priscus","Proculus","Publius",
    "Quintus","Regulus","Rufus","Sabinus","Scaevola","Scipio",
    "Seneca","Septimus","Severus","Sextus","Silius","Silvanus",
    "Soranus","Spurius","Strabo","Sulla","Tacitus","Tarquinius",
    "Tertius","Tiberius","Titus","Trajan","Tullius","Varro",
    "Valerius","Ventidius","Verres","Vespasian","Victor","Vindex",
    "Vitruvius","Volso","Vulso","Zeno",
  ];

  function randomRomanName() {
    var used = {};
    for (var i = 0; i < state.picks.length; i++) {
      if (state.picks[i].displayName) used[state.picks[i].displayName] = true;
    }
    var available = ROMAN_NAMES.filter(function(n) { return !used[n]; });
    if (!available.length) available = ROMAN_NAMES;
    return available[Math.floor(Math.random() * available.length)];
  }

  /**
   * Deterministic hash for growth rolls — same unit + level + stat always
   * produces the same roll so growth is reproducible across save/load.
   */
  function _growthRoll(uid, level, statIdx) {
    var h = 0;
    if (typeof uid === "string") {
      for (var i = 0; i < uid.length; i++) h = ((h << 5) - h + uid.charCodeAt(i)) | 0;
    } else { h = uid | 0; }
    var s = (Math.imul(h, 2654435761) + level * 65537 + statIdx * 97) | 0;
    s = (Math.imul(s, 1103515245) + 12345) | 0;
    return ((s >>> 16) & 0x7FFF) / 0x8000;
  }

  /**
   * FFT-style growth: compute the stat gain for a single level-up.
   * growthVal is in centistats — e.g. 450 → guaranteed 4, plus 50% chance of +1.
   */
  function _statGain(growthVal, uid, level, statIdx) {
    var base = Math.floor(growthVal / 100);
    var remainder = growthVal % 100;
    if (remainder > 0 && _growthRoll(uid, level, statIdx) * 100 < remainder) base++;
    return base;
  }

  /**
   * Compute total growth bonuses for a class from level 1 to targetLevel.
   * Returns { hp, atk, def, spd } accumulated bonuses.
   */
  function computeGrowthBonuses(classId, uid, targetLevel) {
    var g = classById(classId).growth;
    var out = { hp: 0, atk: 0, def: 0, spd: 0 };
    if (!g) return out;
    for (var lv = 2; lv <= targetLevel; lv++) {
      out.hp  += _statGain(g.hp,  uid, lv, 0);
      out.atk += _statGain(g.atk, uid, lv, 1);
      out.def += _statGain(g.def, uid, lv, 2);
      out.spd += _statGain(g.spd, uid, lv, 3);
    }
    return out;
  }

  function levelBonus(unit, stat) {
    var key = "bonus" + stat;
    return unit[key] || 0;
  }

  function levelMaxHpBonus(unit) { return unit.bonusHp || 0; }

  function checkLevelUp(unit) {
    if (!campaignState.active) return;
    if ((unit.level || 1) >= MAX_LEVEL) return;
    var nextIdx = (unit.level || 1);
    if (nextIdx >= LEVEL_TABLE.length) return;
    var next = LEVEL_TABLE[nextIdx];
    if (unit.xp >= next.xp) {
      var oldLevel = unit.level || 1;
      unit.level = next.level;
      var g = classById(unit.classId).growth;
      var uid = unit.uid || unit.id;
      if (g) {
        var hpGain  = _statGain(g.hp,  uid, unit.level, 0);
        var atkGain = _statGain(g.atk, uid, unit.level, 1);
        var defGain = _statGain(g.def, uid, unit.level, 2);
        var spdGain = _statGain(g.spd, uid, unit.level, 3);
        unit.bonusHp  = (unit.bonusHp  || 0) + hpGain;
        unit.bonusAtk = (unit.bonusAtk || 0) + atkGain;
        unit.bonusDef = (unit.bonusDef || 0) + defGain;
        unit.bonusSpd = (unit.bonusSpd || 0) + spdGain;
        unit.maxHp += hpGain;
        unit.hp = Math.min(unit.hp + hpGain, unit.maxHp);
        var parts = [];
        if (hpGain)  parts.push("+" + hpGain + " HP");
        if (atkGain) parts.push("+" + atkGain + " ATK");
        if (defGain) parts.push("+" + defGain + " DEF");
        if (spdGain) parts.push("+" + spdGain + " SPD");
        var cDef = classById(unit.classId);
        log((unit.displayName || cDef.name) + " reached Level " + unit.level + "! " + parts.join(", "), "system");
      } else {
        var cDef2 = classById(unit.classId);
        log((unit.displayName || cDef2.name) + " reached Level " + unit.level + "!", "system");
      }
      spawnDmgNumber(unit, "LV" + unit.level, "#ffdd44");
      if (oldLevel < unit.level) checkLevelUp(unit);
    }
  }

  function awardXp(unit, amount) {
    if (!campaignState.active || !unit || unit.team !== "player") return;
    unit.xp = (unit.xp || 0) + amount;
    checkLevelUp(unit);
  }

  const GLADIATOR_CLASSES = [
    {
      id: "murmillo", name: "Murmillo", role: "Bulwark — scutum & gladius",
      cost: 28, hp: 38, atk: 11, def: 6, spd: 6, move: 3, jump: 1,
      growth: { hp: 450, atk: 30, def: 70, spd: 15 },
      abilities: [
        { name: "Cetus Wall", desc: "Brace: next hit deals half damage.", type: "buff", target: "self", levelReq: 1 },
        { name: "Testudo", desc: "+3 DEF until next turn.", type: "buff", target: "self", levelReq: 2 },
        { name: "Aegis Slam", desc: "0.6× hit + stun foe 1 turn.", type: "attack", target: "adjacent_enemy", mult: 0.6, effect: "stun", levelReq: 3 },
        { name: "Iron Will", desc: "Heal 15% HP + cleanse root.", type: "heal", target: "self", levelReq: 4 },
        { name: "Fortress Stance", desc: "+4 DEF 2 turns; rooted 1 turn.", type: "buff", target: "self", levelReq: 5 },
        { name: "Guardian Aura", desc: "All adjacent allies heal 5 HP.", type: "heal", target: "self", levelReq: 6 },
      ],
    },
    {
      id: "retiarius", name: "Retiarius", role: "Skirmisher — trident & net",
      cost: 24, hp: 28, atk: 10, def: 3, spd: 9, move: 4, jump: 2,
      growth: { hp: 250, atk: 40, def: 20, spd: 60 },
      abilities: [
        { name: "Iaculum", desc: "Net an adjacent foe (skip their next turn).", type: "debuff", target: "adjacent_enemy", levelReq: 1 },
        { name: "Trident Lunge", desc: "Range-2 line attack for 0.8× damage.", type: "attack", target: "line", range: 2, mult: 0.8, levelReq: 2 },
        { name: "Tide Pull", desc: "Pull adjacent foe 1 tile toward you.", type: "utility", target: "adjacent_enemy", effect: "pull", levelReq: 3 },
        { name: "Entangle", desc: "Root + −2 ATK (2 turns) to foe.", type: "debuff", target: "adjacent_enemy", effect: "entangle", levelReq: 4 },
        { name: "Neptune's Favor", desc: "Heal 20% HP + Move +1.", type: "heal", target: "self", levelReq: 5 },
        { name: "Drag Under", desc: "Pull foe + deal 1.0× damage.", type: "attack", target: "adjacent_enemy", mult: 1.0, effect: "drag", levelReq: 6 },
      ],
    },
    {
      id: "secutor", name: "Secutor", role: "Hunter — pursues the nimble",
      cost: 26, hp: 32, atk: 12, def: 4, spd: 8, move: 4, jump: 1,
      growth: { hp: 300, atk: 45, def: 30, spd: 50 },
      abilities: [
        { name: "Umbra", desc: "Move +1 this turn.", type: "buff", target: "self", levelReq: 1 },
        { name: "Pursuit", desc: "Adjacent strike for 1.25× if foe present.", type: "attack", target: "adjacent_enemy", mult: 1.25, levelReq: 2 },
        { name: "Blind Rush", desc: "+2 ATK this action, −2 DEF until next turn.", type: "buff", target: "self", levelReq: 3 },
        { name: "Battle Focus", desc: "Next attack +25% hit chance.", type: "buff", target: "self", levelReq: 4 },
        { name: "Relentless", desc: "Range-2 line dash + 0.8× strike.", type: "attack", target: "line", range: 2, mult: 0.8, levelReq: 5 },
        { name: "Hunter's Mark", desc: "Foe takes +3 dmg from all for 2 turns.", type: "debuff", target: "adjacent_enemy", effect: "huntermark", levelReq: 6 },
      ],
    },
    {
      id: "thraex", name: "Thraex", role: "Duelist — sica & parmula",
      cost: 22, hp: 30, atk: 13, def: 3, spd: 7, move: 3, jump: 2,
      growth: { hp: 250, atk: 60, def: 20, spd: 50 },
      abilities: [
        { name: "Sica Riposte", desc: "Counter next melee hit for 5 true damage.", type: "buff", target: "self", levelReq: 1 },
        { name: "Curved Strike", desc: "Attack ignoring 50% of DEF.", type: "attack", target: "adjacent_enemy", mult: 1, ignoreDefPct: 0.5, levelReq: 2 },
        { name: "Bleeding Arc", desc: "1.1× hit + 3 bleed (1/turn for 3 turns).", type: "attack", target: "adjacent_enemy", mult: 1.1, effect: "bleed", levelReq: 3 },
        { name: "Parry", desc: "Next hit halved, counter 3 dmg.", type: "buff", target: "self", levelReq: 4 },
        { name: "Crimson Dance", desc: "1.3× hit, heal 25% of damage.", type: "attack", target: "adjacent_enemy", mult: 1.3, effect: "lifesteal", steal: 0.25, levelReq: 5 },
        { name: "Blade Storm", desc: "Hit all adjacent foes for 1.0×.", type: "attack", target: "aoe_adjacent", mult: 1.0, levelReq: 6 },
      ],
    },
    {
      id: "hoplomachus", name: "Hoplomachus", role: "Lancer — hasta & small shield",
      cost: 25, hp: 30, atk: 12, def: 4, spd: 7, move: 3, jump: 1,
      growth: { hp: 300, atk: 50, def: 35, spd: 30 },
      abilities: [
        { name: "Hasta Impetus", desc: "Line thrust (range 3) for 1.25× damage.", type: "attack", target: "line", range: 3, mult: 1.25, levelReq: 1 },
        { name: "Shield Bash", desc: "0.5× damage + push foe 1 tile.", type: "attack", target: "adjacent_enemy", mult: 0.5, effect: "push", levelReq: 2 },
        { name: "Phalanx Guard", desc: "Adjacent allies gain +2 DEF this round.", type: "buff", target: "self", levelReq: 3 },
        { name: "Spear Brace", desc: "Next melee attacker takes 4 counter dmg.", type: "buff", target: "self", levelReq: 4 },
        { name: "Piercing Thrust", desc: "Range-2 line, 1.0× ignoring all DEF.", type: "attack", target: "line", range: 2, mult: 1.0, ignoreDefPct: 1.0, levelReq: 5 },
        { name: "Phalanx Advance", desc: "Allies: +2 ATK, +1 Move this turn.", type: "buff", target: "self", levelReq: 6 },
      ],
    },
    {
      id: "dimachaerus", name: "Dimachaerus", role: "Blademaster — twin swords",
      cost: 30, hp: 29, atk: 14, def: 2, spd: 8, move: 4, jump: 2,
      growth: { hp: 200, atk: 70, def: 10, spd: 60 },
      abilities: [
        { name: "Ferrum Cyclone", desc: "Hit all adjacent foes for 0.7×.", type: "attack", target: "aoe_adjacent", mult: 0.7, levelReq: 1 },
        { name: "Twin Slash", desc: "1.4× single target, costs 3 HP.", type: "attack", target: "adjacent_enemy", mult: 1.4, selfDamage: 3, levelReq: 2 },
        { name: "Shadow Step", desc: "Teleport to a tile within range 2.", type: "buff", target: "self", levelReq: 3 },
        { name: "Evasion", desc: "+3 DEF until next turn.", type: "buff", target: "self", levelReq: 4 },
        { name: "Blood Dance", desc: "1.5× hit, heal 30% of damage.", type: "attack", target: "adjacent_enemy", mult: 1.5, effect: "lifesteal", steal: 0.3, levelReq: 5 },
        { name: "Whirlwind Fury", desc: "1.2× all adjacent + teleport 1.", type: "attack", target: "aoe_adjacent", mult: 1.2, effect: "whirlwind", levelReq: 6 },
      ],
    },
    {
      id: "provocator", name: "Provocator", role: "Champion — provocatio rite",
      cost: 27, hp: 34, atk: 10, def: 5, spd: 6, move: 3, jump: 1,
      growth: { hp: 350, atk: 30, def: 50, spd: 25 },
      abilities: [
        { name: "Provocatio", desc: "Mark foe: −4 ATK vs others for 2 turns.", type: "debuff", target: "adjacent_enemy", levelReq: 1 },
        { name: "Rally", desc: "Self-heal 20% of max HP.", type: "heal", target: "self", levelReq: 2 },
        { name: "Arena Salute", desc: "Cleanse all debuffs from self.", type: "buff", target: "self", levelReq: 3 },
        { name: "Inspiring Presence", desc: "Adjacent allies +2 ATK this turn.", type: "buff", target: "self", levelReq: 4 },
        { name: "Guardian's Oath", desc: "Intercept next hit on adjacent ally.", type: "buff", target: "self", levelReq: 5 },
        { name: "Champion's Resolve", desc: "Full heal (once per battle).", type: "heal", target: "self", levelReq: 6 },
      ],
    },
    {
      id: "samnite", name: "Samnite", role: "Veteran — early Italic kit",
      cost: 23, hp: 33, atk: 11, def: 4, spd: 6, move: 3, jump: 1,
      growth: { hp: 350, atk: 35, def: 50, spd: 25 },
      abilities: [
        { name: "Samnis Press", desc: "Shove adjacent foe 1 tile.", type: "utility", target: "adjacent_enemy", effect: "push", levelReq: 1 },
        { name: "Veteran's Blow", desc: "1.3× damage, costs 5 HP.", type: "attack", target: "adjacent_enemy", mult: 1.3, selfDamage: 5, levelReq: 2 },
        { name: "War Cry", desc: "Adjacent foes get −2 ATK for 2 turns.", type: "debuff", target: "self", levelReq: 3 },
        { name: "Battle Hardened", desc: "+2 DEF, +1 ATK for 2 turns.", type: "buff", target: "self", levelReq: 4 },
        { name: "Intimidating Roar", desc: "All adjacent enemies rooted 1 turn.", type: "debuff", target: "self", levelReq: 5 },
        { name: "Veteran's Fury", desc: "1.5× hit + push 2 tiles.", type: "attack", target: "adjacent_enemy", mult: 1.5, effect: "push2", levelReq: 6 },
      ],
    },
    {
      id: "sagittarius", name: "Sagittarius", role: "Archer — composite bow",
      cost: 22, hp: 25, atk: 11, def: 2, spd: 9, move: 3, jump: 2,
      growth: { hp: 200, atk: 50, def: 15, spd: 60 },
      abilities: [
        { name: "Volley", desc: "Range-4 line shot for 0.7×.", type: "attack", target: "line", range: 4, mult: 0.7, levelReq: 1 },
        { name: "Pin Shot", desc: "0.6× hit + root foe 1 turn.", type: "attack", target: "adjacent_enemy", mult: 0.6, effect: "stun", levelReq: 2 },
        { name: "High Ground", desc: "+15% hit on next attack.", type: "buff", target: "self", levelReq: 3 },
        { name: "Poison Arrow", desc: "0.5× + 3 bleed (1/turn, 3 turns).", type: "attack", target: "adjacent_enemy", mult: 0.5, effect: "bleed", levelReq: 4 },
        { name: "Suppressing Fire", desc: "Range-2 line, 3 true dmg (pierces).", type: "attack", target: "line", range: 2, mult: 0, effect: "suppress", levelReq: 5 },
        { name: "Eagle Eye", desc: "Next 2 attacks cannot miss.", type: "buff", target: "self", levelReq: 6 },
      ],
    },
    {
      id: "essedarius", name: "Essedarius", role: "Chariot Fighter — mobile brawler",
      cost: 26, hp: 30, atk: 12, def: 3, spd: 7, move: 5, jump: 1,
      growth: { hp: 300, atk: 40, def: 20, spd: 55 },
      abilities: [
        { name: "Charge", desc: "Range-2 line dash + 1.3× hit.", type: "attack", target: "line", range: 2, mult: 1.3, effect: "charge", levelReq: 1 },
        { name: "Wheel Strike", desc: "Hit all adjacent foes for 0.6×.", type: "attack", target: "aoe_adjacent", mult: 0.6, levelReq: 2 },
        { name: "Rally Charge", desc: "Move +2 this turn.", type: "buff", target: "self", levelReq: 3 },
        { name: "Momentum", desc: "Passive: +3 ATK after moving 3+ tiles.", type: "passive", target: "self", levelReq: 4 },
        { name: "Trample", desc: "Range-3 line, 0.6× each foe in line.", type: "attack", target: "line", range: 3, mult: 0.6, effect: "trample", levelReq: 5 },
        { name: "War Chariot", desc: "Range-3 charge + 1.5× on target.", type: "attack", target: "line", range: 3, mult: 1.5, effect: "charge", levelReq: 6 },
      ],
    },
    {
      id: "umbra", name: "Umbra", role: "Shadow Acolyte — cult-touched",
      cost: 28, hp: 27, atk: 12, def: 3, spd: 8, move: 4, jump: 2,
      growth: { hp: 220, atk: 50, def: 15, spd: 65 },
      abilities: [
        { name: "Dark Grasp", desc: "0.9× hit, steal 3 HP.", type: "attack", target: "adjacent_enemy", mult: 0.9, effect: "lifesteal", steal: 3, levelReq: 1 },
        { name: "Phase Walk", desc: "Teleport within range 3.", type: "buff", target: "self", levelReq: 2 },
        { name: "Dread Whisper", desc: "Debuff: foe −3 ATK for 2 turns.", type: "debuff", target: "adjacent_enemy", effect: "atkdebuff", debuffTurns: 2, debuffAmt: 3, levelReq: 3 },
        { name: "Shadow Mend", desc: "Heal 25% HP; −2 ATK 1 turn.", type: "heal", target: "self", levelReq: 4 },
        { name: "Void Burst", desc: "0.8× adj foes + steal 2 HP each.", type: "attack", target: "aoe_adjacent", mult: 0.8, effect: "voidburst", levelReq: 5 },
        { name: "Abyssal Gate", desc: "Teleport adjacent ally within range 3.", type: "buff", target: "adjacent_ally", levelReq: 6 },
      ],
    },
    {
      id: "vestige", name: "Vestige", role: "Dis Pater's Remnant — undead echo",
      cost: 30, hp: 32, atk: 13, def: 3, spd: 6, move: 3, jump: 1,
      growth: { hp: 400, atk: 50, def: 25, spd: 15 },
      abilities: [
        { name: "Revenant Strike", desc: "1.2× hit, heal 25% of damage.", type: "attack", target: "adjacent_enemy", mult: 1.2, effect: "lifesteal", levelReq: 1 },
        { name: "Grave Pulse", desc: "4 true dmg to all adjacent foes, costs 5 HP.", type: "attack", target: "aoe_adjacent", mult: 0, effect: "grave_pulse", selfDamage: 5, levelReq: 2 },
        { name: "Second Wind", desc: "Passive: revive once at 25% HP.", type: "passive", target: "self", levelReq: 3 },
        { name: "Unholy Resilience", desc: "+3 DEF for 2 turns.", type: "buff", target: "self", levelReq: 4 },
        { name: "Soul Drain", desc: "1.0× hit, heal 50% of damage.", type: "attack", target: "adjacent_enemy", mult: 1.0, effect: "lifesteal", steal: 0.5, levelReq: 5 },
        { name: "Death's Embrace", desc: "6 true dmg adj foes, heal total.", type: "attack", target: "aoe_adjacent", mult: 0, effect: "deathembrace", levelReq: 6 },
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

  var MAP_TEMPLATES = {
    pit: {
      name: "The Pit",
      heightFn: function (x, y, w, h) {
        var cx = w / 2, cy = h / 2;
        var d = Math.abs(x - cx) + Math.abs(y - cy);
        var maxD = cx + cy - 2;
        if (d < 3) return 0;
        return Math.min(2, Math.floor((d / maxD) * 3));
      },
      terrainFn: function () { return null; }
    },
    bridge: {
      name: "Bridge of Chains",
      heightFn: function (x, y, w, h) {
        var midX = Math.floor(w / 2);
        if (Math.abs(x - midX) <= 1) return 1;
        return 0;
      },
      terrainFn: function (x, y, w, h) {
        var midX = Math.floor(w / 2);
        if (Math.abs(x - midX) > 1 && y > 0 && y < h - 1) return "water_deep";
        return null;
      }
    },
    tiers: {
      name: "Colosseum Tiers",
      heightFn: function (x, y, w, h) {
        var ring = Math.min(x, y, w - 1 - x, h - 1 - y);
        return Math.min(2, ring);
      },
      terrainFn: function () { return null; }
    },
    flooded: {
      name: "Flooded Arena",
      heightFn: function (x, y, w, h) {
        var cx = w / 2, cy = h / 2;
        var d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
        return d < 3 ? 1 : 0;
      },
      terrainFn: function (x, y, w, h) {
        var cx = w / 2, cy = h / 2;
        var d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
        if (d >= 3 && y > 0 && y < h - 1) return "water_shallow";
        return null;
      }
    },
    pillared: {
      name: "Pillared Hall",
      heightFn: function (x, y) {
        if (x % 3 === 1 && y % 3 === 1) return 2;
        return 0;
      },
      terrainFn: function (x, y) {
        if (x % 3 === 1 && y % 3 === 1) return "building";
        return null;
      }
    }
  };

  /** Pseudo-random arena height (0–2). */
  function buildHeightField(seed, template) {
    var tmpl = template ? MAP_TEMPLATES[template] : null;
    const H = [];
    const rnd = seedRng(seed);
    for (let y = 0; y < BOARD_H; y++) {
      const row = [];
      for (let x = 0; x < BOARD_W; x++) {
        if (tmpl && tmpl.heightFn) {
          row.push(tmpl.heightFn(x, y, BOARD_W, BOARD_H));
        } else {
          const edge = x === 0 || x === BOARD_W - 1 || y === 0 || y === BOARD_H - 1;
          const centerBias = Math.abs(x - BOARD_W / 2) + Math.abs(y - BOARD_H / 2);
          let h = Math.floor(rnd() * 3);
          if (edge) h = Math.min(h, 1);
          if (centerBias < 4 && rnd() > 0.55) h = Math.min(h + 1, 2);
          row.push(h);
        }
      }
      H.push(row);
    }
    return H;
  }

  const HEIGHT = buildHeightField(42);

  function buildEmptyTerrain() {
    var T = [];
    for (var y = 0; y < BOARD_H; y++) {
      var row = [];
      for (var x = 0; x < BOARD_W; x++) row.push(null);
      T.push(row);
    }
    return T;
  }

  function buildTerrainMap(seed, terrainSpec, template) {
    var T = buildEmptyTerrain();
    var tmpl = template ? MAP_TEMPLATES[template] : null;
    if (tmpl && tmpl.terrainFn) {
      for (var ty = 0; ty < BOARD_H; ty++) {
        for (var tx = 0; tx < BOARD_W; tx++) {
          var tt = tmpl.terrainFn(tx, ty, BOARD_W, BOARD_H);
          if (tt) {
            T[ty][tx] = tt;
            if (tt === "building") state.height[ty][tx] = 2;
            if (tt === "water_deep" || tt === "water_shallow") state.height[ty][tx] = 0;
          }
        }
      }
      return T;
    }
    if (terrainSpec && terrainSpec.length) {
      for (var i = 0; i < terrainSpec.length; i++) {
        var s = terrainSpec[i];
        if (inBounds(s.x, s.y)) {
          T[s.y][s.x] = s.type;
          if (s.type === "building") state.height[s.y][s.x] = 2;
          if (s.type === "water_deep" || s.type === "water_shallow") state.height[s.y][s.x] = 0;
        }
      }
    } else if (seed != null) {
      var rng = seedRng(seed * 311 + 7);
      var densityMult = skirmishConfig.terrainDensity === "sparse" ? 0.5 : (skirmishConfig.terrainDensity === "dense" ? 1.8 : 1);
      var count = Math.round((2 + Math.floor(rng() * 3)) * densityMult);
      for (var b = 0; b < count; b++) {
        var bx, by;
        for (var att = 0; att < 20; att++) {
          bx = 2 + Math.floor(rng() * (BOARD_W - 4));
          by = 1 + Math.floor(rng() * (BOARD_H - 3));
          if (!T[by][bx]) break;
        }
        if (!T[by][bx]) {
          T[by][bx] = "building";
          state.height[by][bx] = 2;
        }
      }
      if (rng() < 0.35 * densityMult) {
        var wCount = Math.round((1 + Math.floor(rng() * 3)) * densityMult);
        for (var w = 0; w < wCount; w++) {
          var wx, wy;
          for (var watt = 0; watt < 20; watt++) {
            wx = 2 + Math.floor(rng() * (BOARD_W - 4));
            wy = 1 + Math.floor(rng() * (BOARD_H - 3));
            if (!T[wy][wx]) break;
          }
          if (!T[wy][wx]) {
            T[wy][wx] = rng() < 0.5 ? "water_deep" : "water_shallow";
            state.height[wy][wx] = 0;
          }
        }
      }
    }
    return T;
  }

  function isTileBuilding(x, y) {
    return state.terrain && state.terrain[y] && state.terrain[y][x] === "building";
  }
  function isTileDeepWater(x, y) {
    return state.terrain && state.terrain[y] && state.terrain[y][x] === "water_deep";
  }
  function isTileShallowWater(x, y) {
    return state.terrain && state.terrain[y] && state.terrain[y][x] === "water_shallow";
  }
  function isTileImpassableTerrain(x, y) {
    return isTileBuilding(x, y) || isTileDeepWater(x, y);
  }

  const state = {
    phase: "ludus",
    budget: budgetCurrent,
    picks: [],
    deployTemplate: [],
    selectedClassId: null,
    deploySelectedIndex: 0,
    units: [],
    unitSeq: 1,
    height: HEIGHT,
    terrain: buildEmptyTerrain(),
    activeUnit: null,
    battleMode: "idle",
    highlightCells: new Set(),
    hasMoved: false,
    hasActed: false,
    preMovePos: null,
    selectedAbilityIndex: -1,
    turnCount: 0,
    totalDamageDealt: 0,
    animating: false,
    boutNumber: 0,
    battleLog: [],
    _mapSeed: 0,
    mapMods: {
      cursedTiles: new Set(),
      cursedDmg: 0,
      fullCurse: false,
      ritualPulse: null,
      crowdSpdPenalty: 0,
      crowdSurgeTurn: 0,
      crowdSurgeApplied: false,
      collapsedTiles: new Set(),
      collapsingActive: false,
      collapsingMission: 0,
      glowTiles: new Set(),
      shiftingSand: false,
      symbolFlashTurn: 0,
      symbolFlashTiles: new Set(),
      sandGlyphTiles: new Set(),
      darkSky: false,
    },
    titusForgottenName: false,
    endingATriggered: false,
    titusTurnCounter: 0,
    tutorialStep: 0,
    cutscene: {
      active: false,
      actors: [],
      actorMap: {},
      currentSpeaker: null,
      bubbleText: "",
      bubbleRevealed: 0,
      bubbleStyle: "dialogue",
      bubbleUnit: null,
      letterbox: 0,
      targetPanX: 0,
      targetPanY: 0,
      targetZoom: 1.3,
      savedPanX: 0,
      savedPanY: 0,
      savedZoom: 1.0,
      rafId: null,
      awaitingEntry: false,
    },
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
  const btnTrainingBout = $("#btnTrainingBout");
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
  const btnUndo = $("#btnUndo");
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
  const btnMute = $("#btnMute");

  var _srEl = document.getElementById("srAnnounce");
  function announce(msg) {
    if (!_srEl) return;
    _srEl.textContent = "";
    setTimeout(function() { _srEl.textContent = msg; }, 50);
  }

  function log(msg, type) {
    var cls = "log-entry";
    if (type) cls += " log-entry--" + type;
    else {
      if (/miss/i.test(msg)) cls += " log-entry--miss";
      else if (/heal|restore|rally/i.test(msg)) cls += " log-entry--heal";
      else if (/brace|testudo|riposte|umbra|wall/i.test(msg)) cls += " log-entry--buff";
      else if (/\d+ /.test(msg) && /hit|strike|deal|cut|pierce/i.test(msg)) cls += " log-entry--dmg";
    }
    state.battleLog.push({ msg: msg, type: type || null, turn: state.turnCount });
    if (state.battleLog.length > 500) state.battleLog.shift();
    var p = document.createElement("p");
    p.className = cls;
    p.textContent = msg;
    logFeed.appendChild(p);
    while (logFeed.children.length > 40) logFeed.removeChild(logFeed.firstChild);
    logFeed.scrollTop = logFeed.scrollHeight;
  }

  function toggleFullLog() {
    var overlay = document.getElementById("logOverlay");
    var trigger = document.getElementById("btnLogExpand");
    if (overlay) {
      overlay.remove();
      if (trigger) { trigger.setAttribute("aria-expanded", "false"); trigger.focus(); }
      return;
    }
    overlay = document.createElement("div");
    overlay.id = "logOverlay";
    overlay.className = "log-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Full battle log");
    var header = document.createElement("div");
    header.className = "log-overlay__header";
    header.innerHTML = '<span>Full Battle Log</span><button type="button" class="btn btn--ghost" aria-label="Close log">✕</button>';
    header.querySelector("button").onclick = function () {
      overlay.remove();
      if (trigger) { trigger.setAttribute("aria-expanded", "false"); trigger.focus(); }
    };
    overlay.appendChild(header);
    var body = document.createElement("div");
    body.className = "log-overlay__body";
    for (var i = 0; i < state.battleLog.length; i++) {
      var entry = state.battleLog[i];
      var p = document.createElement("p");
      var eCls = "log-entry";
      if (entry.type) eCls += " log-entry--" + entry.type;
      p.className = eCls;
      p.textContent = entry.msg;
      body.appendChild(p);
    }
    overlay.appendChild(body);
    document.getElementById("app").appendChild(overlay);
    body.scrollTop = body.scrollHeight;
    overlay.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        overlay.remove();
        if (trigger) { trigger.setAttribute("aria-expanded", "false"); trigger.focus(); }
      }
    });
    overlay.tabIndex = -1;
    overlay.focus();
    if (trigger) trigger.setAttribute("aria-expanded", "true");
  }

  function isTutorial() {
    if (!campaignState.active) return false;
    var m = Campaign.getMission();
    return m && m.tutorial;
  }

  function tutorialTip(step, msg) {
    if (!isTutorial()) return;
    if (state.tutorialStep > step) return;
    state.tutorialStep = step + 1;
    log(msg, "tutorial");
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
    if (!renderer || renderer.reducedMotion) return Promise.resolve();
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
    if (campaignState.active && unit.team === "enemy" && state.activeUnit && state.activeUnit.team === "player") {
      awardXp(state.activeUnit, XP_PER_KILL);
      state.activeUnit.kills = (state.activeUnit.kills || 0) + 1;
    }
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
    var maxMp = effectiveMove(unit);
    var jmp = unitJump(unit);
    var prev = {};
    var cost = {};
    var q = [{ x: unit.x, y: unit.y, c: 0 }];
    var qi = 0;
    var startKey = cellKey(unit.x, unit.y);
    cost[startKey] = 0;
    prev[startKey] = null;
    while (qi < q.length) {
      var cur = q[qi++];
      for (var di = 0; di < DIRS.length; di++) {
        var nx = cur.x + DIRS[di][0], ny = cur.y + DIRS[di][1];
        if (!inBounds(nx, ny)) continue;
        if (isTileCollapsed(nx, ny)) continue;
        if (isTileImpassableTerrain(nx, ny)) continue;
        if (occupantAt(nx, ny) && !(nx === destX && ny === destY)) continue;
        var nh = state.height[ny][nx], ch = state.height[cur.y][cur.x];
        var dh = nh - ch;
        if (dh > jmp || dh < -jmp) continue;
        var step = 1 + Math.max(0, dh);
        if (isTileShallowWater(nx, ny)) step += 1;
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
    phalanx:  { glyph: "P", color: "#88ffcc", label: "Phalanx +2 DEF" },
    riposte:  { glyph: "R", color: "#c8ff88", label: "Riposte" },
    rooted:   { glyph: "N", color: "#ff8888", label: "Netted" },
    surge:    { glyph: "S", color: "#ffcc44", label: "Surge +Move" },
    marked:   { glyph: "M", color: "#ff6868", label: "Marked" },
    gifted:   { glyph: "G", color: "#8aaa80", label: "Gifted" },
    bleed:    { glyph: "!", color: "#ff4040", label: "Bleeding" },
    atkdown:  { glyph: "D", color: "#cc88ff", label: "ATK Down" },
    blindrush:{ glyph: "A", color: "#ffaa44", label: "Blind Rush +2 ATK" },
    highgnd:  { glyph: "H", color: "#aaffaa", label: "High Ground" },
    second:   { glyph: "W", color: "#88eeff", label: "Second Wind ready" },
    parry:    { glyph: "Y", color: "#c8ff88", label: "Parry" },
    spbrace:  { glyph: "X", color: "#88ccff", label: "Spear Brace" },
    intercpt: { glyph: "I", color: "#ffcc88", label: "Intercepting" },
    eagle:    { glyph: "E", color: "#aaff44", label: "Eagle Eye" },
    fortress: { glyph: "F", color: "#8888ff", label: "Fortress Stance" },
    momentum: { glyph: "!", color: "#ffdd44", label: "Momentum" },
    bond:     { glyph: "♥", color: "#ff88cc", label: "Bonded +1 DEF" },
    scarred:  { glyph: "×", color: "#cc4444", label: "Scarred" },
  };

  function getUnitStatusIcons(u) {
    var icons = [];
    if (u.gifted) icons.push(STATUS_DEFS.gifted);
    if (u.braceCharges > 0) icons.push(STATUS_DEFS.brace);
    if (u.testudoBonus > 0) icons.push(STATUS_DEFS.testudo);
    if (u.phalanxBonus > 0) icons.push(STATUS_DEFS.phalanx);
    if (u.riposteActive) icons.push(STATUS_DEFS.riposte);
    if (u.rootedSkip) icons.push(STATUS_DEFS.rooted);
    if (u.tempExtraMove) icons.push(STATUS_DEFS.surge);
    if (u.markDebuffTurns > 0) icons.push(STATUS_DEFS.marked);
    if (u.bleedTurns > 0) icons.push(STATUS_DEFS.bleed);
    if (u.atkDebuffTurns > 0) icons.push(STATUS_DEFS.atkdown);
    if (u.blindRushAtk > 0) icons.push(STATUS_DEFS.blindrush);
    if (u.battleFocusNext) icons.push(STATUS_DEFS.highgnd);
    else if (u.highGroundNext) icons.push(STATUS_DEFS.highgnd);
    if (u.classId === "vestige" && !u.secondWindUsed) icons.push(STATUS_DEFS.second);
    if (u.parryCharges > 0) icons.push(STATUS_DEFS.parry);
    if (u.spearBraceActive) icons.push(STATUS_DEFS.spbrace);
    if (u.interceptActive) icons.push(STATUS_DEFS.intercpt);
    if (u.eagleEyeHits > 0) icons.push(STATUS_DEFS.eagle);
    if (u.fortressRooted > 0) icons.push(STATUS_DEFS.fortress);
    if (u.momentumBonus > 0) icons.push(STATUS_DEFS.momentum);
    if (u.bondBuff) icons.push(STATUS_DEFS.bond);
    if ((u.nearDeathCount || 0) >= 2) icons.push(STATUS_DEFS.scarred);
    return icons;
  }

  function updateBondBuff(u) {
    u.bondBuff = false;
    if (!campaignState.active) return;
    var bonds = campaignState.flags._bondPairs;
    if (!bonds || !bonds.length || !u.uid) return;
    var adj = state.units.filter(function (a) {
      return a.hp > 0 && a.id !== u.id && a.team === u.team && Math.abs(a.x - u.x) + Math.abs(a.y - u.y) === 1;
    });
    for (var bi = 0; bi < bonds.length; bi++) {
      var pair = bonds[bi].split("|");
      if (pair.indexOf(u.uid) === -1) continue;
      var otherUid = pair[0] === u.uid ? pair[1] : pair[0];
      for (var ai = 0; ai < adj.length; ai++) {
        if (adj[ai].uid === otherUid) { u.bondBuff = true; return; }
      }
    }
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

  function unitAtk(u)  { return Math.max(1, (u.giftedAtk || classById(u.classId).atk) + levelBonus(u, "Atk") + (u.blindRushAtk || 0) + (u.atkBonus || 0) + (u.momentumBonus || 0) + (u.battleHardenedTurns > 0 ? (u.battleHardenedAtk || 0) : 0) - (u.shadowMendAtkPenalty || 0) - (u.atkDebuffAmt && u.atkDebuffTurns > 0 ? u.atkDebuffAmt : 0)); }
  function unitDef(u)  { return Math.max(0, (u.giftedDef || classById(u.classId).def) + levelBonus(u, "Def") + (u.phalanxBonus || 0) + (u.battleHardenedTurns > 0 ? (u.battleHardenedDef || 0) : 0) - (u.blindRushDef || 0) + (u.bondBuff ? 1 : 0)); }
  function unitSpd(u)  { return Math.max(1, (u.giftedSpd || classById(u.classId).spd) + levelBonus(u, "Spd") - (u.crowdSpdDebuff || 0)); }
  function unitMove(u) { return u.giftedMove || classById(u.classId).move; }
  function unitJump(u) { return u.giftedJump || classById(u.classId).jump; }

  function unitAbilities(u) {
    var base = classById(u.classId).abilities;
    var all = u.extraAbilities ? base.concat(u.extraAbilities) : base;
    if (campaignState.active && u.level) {
      return all.filter(function (ab) { return !ab.levelReq || ab.levelReq <= u.level; });
    }
    return all;
  }

  function effectiveMove(unit) {
    let m = unitMove(unit);
    if (unit.tempExtraMove) m += (unit.rallyCharge ? 2 : 1);
    return m;
  }

  function attackerAtkValue(attacker, target) {
    let atk = unitAtk(attacker);
    if (state.mapMods.glowTiles.has(cellKey(attacker.x, attacker.y))) {
      atk += 2;
    }
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
    const maxMp = effectiveMove(unit);
    const jmp = unitJump(unit);
    const best = new Map();
    const q = [{ x: unit.x, y: unit.y, cost: 0 }];
    var qi2 = 0;
    best.set(cellKey(unit.x, unit.y), 0);

    while (qi2 < q.length) {
      const cur = q[qi2++];
      for (const [dx, dy] of DIRS) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        if (!inBounds(nx, ny)) continue;
        if (isTileCollapsed(nx, ny)) continue;
        if (isTileImpassableTerrain(nx, ny)) continue;
        if (occupantAt(nx, ny)) continue;
        const nh = state.height[ny][nx];
        const ch = state.height[cur.y][cur.x];
        const dh = nh - ch;
        if (dh > jmp) continue;
        if (dh < -jmp) continue;
        var step = 1 + Math.max(0, dh);
        if (isTileShallowWater(nx, ny)) step += 1;
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
    if (attacker.eagleEyeHits > 0) return 100;
    const aSpd = unitSpd(attacker);
    const dSpd = unitSpd(defender);
    let chance = 80 + (aSpd - dSpd) * 5;
    const aH = state.height[attacker.y][attacker.x];
    const dH = state.height[defender.y][defender.x];
    if (aH > dH) chance += 10;
    else if (aH < dH) chance -= 10;
    if (attacker.battleFocusNext) chance += 25;
    else if (attacker.highGroundNext) chance += 15;
    return Math.max(30, Math.min(95, chance));
  }

  function rollHit(attacker, defender) {
    if (attacker.eagleEyeHits > 0) {
      attacker.eagleEyeHits--;
      return true;
    }
    const chance = computeHitChance(attacker, defender);
    return Math.random() * 100 < chance;
  }

  function consumeAttackBuffs(u) {
    u.highGroundNext = false;
    u.battleFocusNext = false;
  }

  function physicalDamage(attacker, defender, mult, ignoreDefPct, dryRun) {
    const atk = attackerAtkValue(attacker, defender);
    const baseDef = unitDef(defender) + (defender.testudoBonus || 0);
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
    if (attacker.pursuitBonusDmg) {
      dmg += attacker.pursuitBonusDmg;
      if (!dryRun) attacker.pursuitBonusDmg = 0;
    }
    // Obsidian Wall: adjacent allied Gifted Murmillo reduces damage by 2
    if (state.units.some(function (a) {
      return a.hp > 0 && a.gifted && a.classId === "murmillo" &&
        a.team === defender.team && a.id !== defender.id && manhattan(a, defender) === 1;
    })) {
      dmg = Math.max(1, dmg - 2);
    }
    if (defender.braceCharges > 0) {
      dmg = Math.max(1, Math.floor(dmg / 2));
      if (!dryRun) defender.braceCharges -= 1;
    }
    if (defender.parryCharges > 0) {
      dmg = Math.max(1, Math.floor(dmg / 2));
      if (!dryRun) {
        defender.parryCharges -= 1;
        applyDamage(attacker, 3);
        log("Parry counters for 3!");
      }
    }
    return dmg;
  }

  function applyDamage(u, dmg, attacker) {
    if (u.hp <= 0) return;
    var interceptor = (attacker && attacker.team !== u.team) ? state.units.find(function(a) {
      return a.hp > 0 && a.interceptActive && a.team === u.team && a.id !== u.id && manhattan(a, u) <= 1;
    }) : null;
    if (!interceptor && u.markDebuffTurns > 0 && u.dreadMarkDmg) {
      dmg += u.dreadMarkDmg;
    }
    if (interceptor) {
      interceptor.interceptActive = false;
      interceptor.hp -= dmg;
      if (interceptor.hp < 0) interceptor.hp = 0;
      spawnDmgNumber(interceptor, "-" + dmg, "#ff6040");
      log((interceptor.displayName || classById(interceptor.classId).name) + " intercepts the blow!");
      if (interceptor.hp <= 0 && interceptor.classId === "vestige" && !interceptor.secondWindUsed) {
        interceptor.secondWindUsed = true;
        interceptor.hp = Math.max(1, Math.round(interceptor.maxHp * 0.25));
        spawnDmgNumber(interceptor, "REVIVE", "#c8ff88");
      }
      return;
    }
    u.hp -= dmg;
    if (u.hp < 0) u.hp = 0;
    if (u.spearBraceActive && attacker && attacker.hp > 0) {
      u.spearBraceActive = false;
      attacker.hp = Math.max(0, attacker.hp - 4);
      spawnDmgNumber(attacker, "-4", "#ff8040");
      log("Spear Brace counters for 4!");
    }
    if (u.team === "enemy") state.totalDamageDealt += dmg;
    var xpSource = attacker || state.activeUnit;
    if (campaignState.active && xpSource && xpSource.team === "player" && u.team === "enemy") {
      awardXp(xpSource, XP_PER_HIT);
    }
    spawnDmgNumber(u, "-" + dmg, "#ff6040");
    if (u.hp <= 0 && u.classId === "vestige" && !u.secondWindUsed) {
      u.secondWindUsed = true;
      u.hp = Math.max(1, Math.round(u.maxHp * 0.25));
      spawnDmgNumber(u, "REVIVE", "#c8ff88");
      log(classById(u.classId).name + " rises again! Second Wind!");
    }
  }

  /** CT turn: advance until someone is ready. */
  function nextActor() {
    const alive = state.units.filter((u) => u.hp > 0);
    if (!alive.length) return null;
    for (let guard = 0; guard < 5000; guard++) {
      for (const u of alive) {
        u.ct += unitSpd(u);
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
      rootedSkip: 0,
      braceCharges: 0,
      riposteActive: false,
      tempExtraMove: false,
      testudoBonus: 0,
      markDebuffTurns: 0,
      markFocusId: null,
      displayName: null,
      gifted: false,
      boss: false,
      atkBonus: 0,
      isFree: false,
      pursuitBonusDmg: 0,
      dreadMarkDmg: 0,
      extraAbilities: null,
      crowdSpdDebuff: 0,
      glyphStayCount: 0,
      bleedTurns: 0,
      atkDebuffTurns: 0,
      atkDebuffAmt: 0,
      phalanxBonus: 0,
      blindRushAtk: 0,
      blindRushDef: 0,
      highGroundNext: false,
      battleFocusNext: false,
      secondWindUsed: false,
      level: 1,
      xp: 0,
      kills: 0,
      bonusHp: 0,
      bonusAtk: 0,
      bonusDef: 0,
      bonusSpd: 0,
      resolveUsed: false,
      parryCharges: 0,
      spearBraceActive: false,
      interceptActive: false,
      eagleEyeHits: 0,
      fortressRooted: 0,
      battleHardenedTurns: 0,
      battleHardenedAtk: 0,
      battleHardenedDef: 0,
      momentumBonus: 0,
      shadowMendAtkPenalty: 0,
      bondBuff: false,
      nearDeathCount: 0,
      title: null,
    };
  }

  function buildZoneMap() {
    const zones = [];
    for (let y = 0; y < BOARD_H; y++) {
      const row = [];
      for (let x = 0; x < BOARD_W; x++) {
        var t = state.terrain && state.terrain[y] && state.terrain[y][x];
        row.push(t || tileZone(x, y));
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
          if (isGateTile(x, y) && !occupantAt(x, y) && !isTileImpassableTerrain(x, y)) {
            map[cellKey(x, y)] = "gate";
          }
        }
      }
    }
    return map;
  }

  function renderBoard() {
    if (!renderer) return;
    renderer._recalcLayout();
    const unitData = state.units
      .filter((u) => u.hp > 0 || u._deathAnim != null)
      .map((u) => {
        var t = u.isCinematic ? u.team : (u.gifted ? "gifted" : (u.team === "player" ? "player" : "enemy"));
        return {
          id: u.id,
          x: u.x,
          y: u.y,
          hp: u.hp,
          maxHp: u.maxHp,
          classId: u.classId,
          team: t,
          exhausted: u.isCinematic ? false : (state.phase === "battle" && u.ct < 50),
          animX: u.animX,
          animY: u.animY,
          lungeX: u.lungeX,
          lungeY: u.lungeY,
          _deathAnim: u._deathAnim,
          _flashAnim: u._flashAnim,
          statusIcons: u.isCinematic ? [] : getUnitStatusIcons(u),
          isCinematic: u.isCinematic || false,
        };
      });

    var cursedSet = null;
    if (state.mapMods.fullCurse) {
      cursedSet = new Set();
      for (var cy = 0; cy < BOARD_H; cy++)
        for (var cx = 0; cx < BOARD_W; cx++)
          cursedSet.add(cellKey(cx, cy));
    } else if (state.mapMods.cursedTiles.size) {
      cursedSet = state.mapMods.cursedTiles;
    }
    var drawParams = {
      heights: state.height,
      zones: buildZoneMap(),
      highlights: state.cutscene.active ? {} : buildHighlightMap(),
      units: unitData,
      activeUnitId: state.activeUnit ? state.activeUnit.id : null,
      phase: state.phase,
      cursedTiles: cursedSet,
      collapsedTiles: state.mapMods.collapsedTiles.size ? state.mapMods.collapsedTiles : null,
      glowTiles: state.mapMods.glowTiles.size ? state.mapMods.glowTiles : null,
      darkSky: state.mapMods.darkSky,
    };

    if (state.cutscene.active) {
      drawParams.letterbox = state.cutscene.letterbox;
      var bu = state.cutscene.bubbleUnit;
      if (bu && state.cutscene.bubbleText) {
        var bp = renderer.tileToScreen(bu.x, bu.y, state.height[bu.y] ? state.height[bu.y][bu.x] || 0 : 0);
        drawParams.cutsceneBubble = {
          cx: bp.x,
          cy: bp.y,
          text: state.cutscene.bubbleText,
          revealed: state.cutscene.bubbleRevealed,
          style: state.cutscene.bubbleStyle,
        };
      } else if (!bu && state.cutscene.bubbleText && state.cutscene.bubbleStyle === "narration") {
        drawParams.cutsceneBubble = {
          cx: 0,
          cy: 0,
          text: state.cutscene.bubbleText,
          revealed: state.cutscene.bubbleRevealed,
          style: "narration",
        };
      }
    }

    renderer.draw(drawParams);
  }

  var NPC_SPRITE_IDS = ["cassius", "livia", "lurco", "official", "nero", "aemilia", "varro", "dis_pater"];

  var SPEAKER_SPRITES = {
    "CASSIUS":   { classId: "cassius",     team: "npc_cassius" },
    "TITUS":     { classId: "secutor",     team: "gifted" },
    "LIVIA":     { classId: "livia",       team: "npc_livia" },
    "LURCO":     { classId: "lurco",       team: "npc_lurco" },
    "OFFICIAL":  { classId: "official",    team: "npc_official" },
    "NERO":      { classId: "nero",        team: "npc_nero" },
    "AEMILIA":   { classId: "aemilia",     team: "npc_aemilia" },
    "VARRO":     { classId: "varro",       team: "npc_varro" },
    "DIS PATER": { classId: "dis_pater",   team: "npc_dis_pater" },
    "FEROX":     { classId: "dimachaerus", team: "gifted" },
    "NERVA":     { classId: "retiarius",   team: "player" },
    "SCAEVA":    { classId: "murmillo",    team: "player" },
    "VALERIA":   { classId: "hoplomachus", team: "player" },
  };

  function initSpriteCache() {
    if (!renderer) return;
    const teams = ["player", "enemy", "gifted"];
    for (const cls of GLADIATOR_CLASSES) {
      for (const team of teams) {
        const svg = gladiatorSpriteSvg(cls.id, team, 0);
        renderer.cacheSpriteFromSvg(cls.id, team, svg);
      }
    }
    for (var ni = 0; ni < NPC_SPRITE_IDS.length; ni++) {
      var npcId = NPC_SPRITE_IDS[ni];
      var npcTeam = "npc_" + npcId;
      if (SPRITE_RECTS[npcId] && TEAM_PAL[npcTeam]) {
        var svg = gladiatorSpriteSvg(npcId, npcTeam, 0);
        renderer.cacheSpriteFromSvg(npcId, npcTeam, svg);
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
      const ta = (100 - a.ct) / unitSpd(a);
      const tb = (100 - b.ct) / unitSpd(b);
      return ta - tb;
    });
    const maxSlots = Math.min(8, sorted.length);
    for (let i = 0; i < maxSlots; i++) {
      const u = sorted[i];
      const def = classById(u.classId);
      const slot = document.createElement("div");
      var ctTeamClass = u.gifted ? "fft-ct-slot--gifted" : (u.team === "player" ? "fft-ct-slot--player" : "fft-ct-slot--enemy");
      slot.className = "fft-ct-slot " + ctTeamClass;
      var slotDesc = (u.displayName || def.name) + ", " + u.team + ", HP " + u.hp + " of " + u.maxHp + ", CT " + Math.round(u.ct);
      slot.title = def.name + " · CT " + Math.round(u.ct);
      slot.setAttribute("aria-label", slotDesc);
      var sprTeam = u.gifted ? "gifted" : (u.team === "player" ? "player" : "enemy");
      const mini = gladiatorSpriteSvg(
        u.classId,
        sprTeam,
        9e4 + u.id * 32 + i
      );
      mini.classList.add("fft-ct-slot__sprite");
      const n = document.createElement("span");
      n.className = "fft-ct-slot__n";
      var ctLabel = u.displayName ? u.displayName.substring(0, 6) : def.name.substring(0, 6);
      if (campaignState.active && u.level > 1) ctLabel += " L" + u.level;
      n.textContent = ctLabel;
      slot.appendChild(mini);
      slot.appendChild(n);
      el.appendChild(slot);
    }
  }

  function previewCtStrip(action) {
    var el = document.getElementById("ctStrip");
    if (!el) return;
    var preview = el.querySelector(".ct-preview-row");
    if (preview) preview.remove();
    var au = state.activeUnit;
    if (!au || state.phase !== "battle") return;
    var alive = state.units.filter(function (u) { return u.hp > 0; });
    var clones = alive.map(function (u) {
      return { id: u.id, ct: u.ct, classId: u.classId, team: u.team, gifted: u.gifted, displayName: u.displayName, level: u.level, hp: u.hp, maxHp: u.maxHp, _spd: unitSpd(u) };
    });
    var ac = clones.find(function (c) { return c.id === au.id; });
    if (!ac) return;
    var sorted = [];
    for (var guard = 0; guard < 200; guard++) {
      for (var ci = 0; ci < clones.length; ci++) clones[ci].ct += clones[ci]._spd;
      var ready = null;
      for (var ri = 0; ri < clones.length; ri++) {
        if (clones[ri].ct >= 100 && (!ready || clones[ri].ct > ready.ct)) ready = clones[ri];
      }
      if (ready) {
        ready.ct -= 100;
        sorted.push(ready);
        if (sorted.length >= 6) break;
      }
    }
    var row = document.createElement("div");
    row.className = "ct-preview-row";
    for (var si = 0; si < sorted.length; si++) {
      var u = sorted[si];
      var def = classById(u.classId);
      var slot = document.createElement("div");
      var tCls = u.gifted ? "fft-ct-slot--gifted" : (u.team === "player" ? "fft-ct-slot--player" : "fft-ct-slot--enemy");
      slot.className = "fft-ct-slot fft-ct-slot--preview " + tCls;
      slot.title = (action === "wait" ? "After Wait: " : "After Act: ") + def.name;
      var n = document.createElement("span");
      n.className = "fft-ct-slot__n";
      n.textContent = (u.displayName || def.name).substring(0, 6);
      slot.appendChild(n);
      row.appendChild(slot);
    }
    el.appendChild(row);
  }

  function clearCtPreview() {
    var el = document.getElementById("ctStrip");
    if (!el) return;
    var preview = el.querySelector(".ct-preview-row");
    if (preview) preview.remove();
  }

  function showPhasePanels() {
    syncBodyPhaseClass();
    refreshCtStrip();
    const p = state.phase;
    if (p === "ludus") SFX.startAmbient("ludus");
    else if (p === "battle") SFX.startAmbient("battle");
    else SFX.startAmbient("ludus");
    var phaseText = p === "ludus" ? "Ludus" : p === "deploy" ? "Gates" : "Arena";
    if (campaignState.active) {
      var m = Campaign.getMission();
      if (m) phaseText = "M" + m.id + " — " + phaseText;
    }
    phaseLabel.textContent = phaseText;
    panelRoster.classList.toggle("is-hidden", p !== "ludus");
    panelDeploy.classList.toggle("is-hidden", p !== "deploy");
    panelBattle.classList.toggle("is-hidden", p !== "battle");
  }

  var _abilityTipEl = null;
  function _showAbilityTip(e) {
    var tag = e.currentTarget;
    if (!tag._tipText) return;
    if (!_abilityTipEl) {
      _abilityTipEl = document.createElement("span");
      _abilityTipEl.className = "ability-tip";
      document.body.appendChild(_abilityTipEl);
    }
    _abilityTipEl.textContent = tag._tipText;
    _abilityTipEl.classList.remove("ability-tip--above", "ability-tip--below");
    _abilityTipEl.style.left = "0";
    _abilityTipEl.style.top = "0";
    _abilityTipEl.classList.add("is-visible");
    var rect = tag.getBoundingClientRect();
    var tipRect = _abilityTipEl.getBoundingClientRect();
    var above = rect.top - tipRect.height - 8;
    if (above < 4) {
      _abilityTipEl.classList.add("ability-tip--below");
      _abilityTipEl.style.top = (rect.bottom + 8) + "px";
    } else {
      _abilityTipEl.classList.add("ability-tip--above");
      _abilityTipEl.style.top = above + "px";
    }
    var left = rect.left + rect.width / 2 - tipRect.width / 2;
    left = Math.max(4, Math.min(left, window.innerWidth - tipRect.width - 4));
    _abilityTipEl.style.left = left + "px";
  }
  function _hideAbilityTip() {
    if (_abilityTipEl) _abilityTipEl.classList.remove("is-visible");
  }

  function refreshRosterUI() {
    budgetMax.textContent = String(budgetCurrent);
    let spent = 0;
    for (const pick of state.picks) {
      if (pick.isFree) continue;
      spent += classById(pick.classId).cost;
    }
    state.budget = budgetCurrent - spent;
    budgetValue.textContent = String(state.budget);

    classListEl.innerHTML = "";
    var displayClasses = GLADIATOR_CLASSES;
    if (campaignState.active) {
      displayClasses = GLADIATOR_CLASSES.filter(function (c) {
        return Campaign.isClassUnlocked(c.id);
      });
    }
    for (const c of displayClasses) {
      const row = document.createElement("div");
      row.className = "class-row" + (state.selectedClassId === c.id ? " is-selected" : "");
      row.setAttribute("role", "listitem");

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
        '<div class="class-row__abilities"></div>';
      var abilitiesDiv = left.querySelector(".class-row__abilities");
      c.abilities.forEach(function (a) {
        var tag = document.createElement("span");
        tag.className = "ability-tag";
        tag.setAttribute("tabindex", "0");
        tag.textContent = a.name;
        var tipParts = [];
        if (a.type) tipParts.push(a.type.charAt(0).toUpperCase() + a.type.slice(1));
        if (a.range) tipParts.push("Range " + a.range);
        if (a.mult) tipParts.push("×" + a.mult + " dmg");
        if (a.fixedDmg) tipParts.push(a.fixedDmg + " true dmg");
        if (a.healAmt) tipParts.push("Heal " + a.healAmt);
        if (a.levelReq && a.levelReq > 1) tipParts.push("Lv" + a.levelReq);
        tag._tipText = (a.desc || a.name) + (tipParts.length ? "\n" + tipParts.join(" · ") : "");
        tag.addEventListener("mouseenter", _showAbilityTip);
        tag.addEventListener("mouseleave", _hideAbilityTip);
        tag.addEventListener("focus", _showAbilityTip);
        tag.addEventListener("blur", _hideAbilityTip);
        abilitiesDiv.appendChild(tag);
      });
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
      addBtn.setAttribute("aria-label", "Hire " + c.name + " for " + c.cost + " denarii");
      if (c.cost > state.budget || state.picks.length >= MAX_ROSTER) {
        addBtn.disabled = true;
      }
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
      li.setAttribute("data-uid", pick.uid || ("pick_" + idx));
      const miniSpr = gladiatorSpriteSvg(def.id, "player", "pick_" + idx);
      miniSpr.classList.add("picked__sprite");
      li.appendChild(miniSpr);
      const nameSpan = document.createElement("span");
      nameSpan.className = "pick-name";
      var labelSpan = document.createElement("span");
      labelSpan.className = "pick-name-text";
      var label = def.name;
      if (pick.displayName) label = pick.displayName + " (" + def.name + ")";
      if (pick.isFree) label += " [free]";
      labelSpan.textContent = label;
      nameSpan.appendChild(labelSpan);
      li.appendChild(nameSpan);
      if (campaignState.active) {
        var lvl = pick.level || 1;
        var badge = document.createElement("span");
        badge.className = "level-badge";
        badge.textContent = "Lv." + lvl;
        li.appendChild(badge);
      }
      if (pick.isFree && campaignState.active) {
        var kept = document.createElement("span");
        kept.className = "btn-dismiss";
        kept.textContent = "Assigned";
        kept.style.opacity = "0.4";
        kept.style.cursor = "default";
        kept.style.textDecoration = "none";
        li.appendChild(kept);
      } else {
        const rm = document.createElement("button");
        rm.type = "button";
        rm.className = "btn-dismiss";
        rm.textContent = "Dismiss";
        rm.setAttribute("aria-label", "Dismiss " + label);
        rm.addEventListener("click", () => {
          var spliceIdx = state.picks.findIndex(function(p) { return p.uid === pick.uid; });
          if (spliceIdx >= 0) state.picks.splice(spliceIdx, 1);
          refreshRosterUI();
          if (campaignState.active) Campaign.saveToDisk();
        });
        li.appendChild(rm);
      }
      pickedListEl.appendChild(li);
    });

    btnToDeploy.disabled = state.picks.length === 0 || state.budget < 0;
    if (btnTrainingBout) {
      if (campaignState.active && state.picks.length > 0) {
        btnTrainingBout.classList.remove("is-hidden");
      } else {
        btnTrainingBout.classList.add("is-hidden");
      }
    }
    var btnStats = document.getElementById("btnRosterStats");
    if (btnStats) {
      btnStats.classList.toggle("is-hidden", !campaignState.active);
    }
  }

  function toggleRosterStats() {
    var panel = document.getElementById("rosterStatsPanel");
    var btn = document.getElementById("btnRosterStats");
    if (!panel) return;
    if (!panel.classList.contains("is-hidden")) {
      panel.classList.add("is-hidden");
      if (btn) btn.setAttribute("aria-expanded", "false");
      return;
    }
    panel.innerHTML = "";
    var roster = campaignState.survivingRoster;
    if (!roster || !roster.length) {
      panel.textContent = "No roster data yet.";
      panel.classList.remove("is-hidden");
      if (btn) btn.setAttribute("aria-expanded", "true");
      return;
    }
    var table = document.createElement("table");
    table.className = "roster-stats-table";
    var thead = document.createElement("thead");
    thead.innerHTML = "<tr><th>Name</th><th>Class</th><th>Lv</th><th>Kills</th><th>Battles</th><th>Title</th></tr>";
    table.appendChild(thead);
    var tbody = document.createElement("tbody");
    for (var i = 0; i < roster.length; i++) {
      var s = roster[i];
      var def = classById(s.classId);
      var tr = document.createElement("tr");
      var dName = s.name || (s.displayName || def.name);
      var titleStr = s.title || "—";
      if ((s.nearDeathCount || 0) >= 2) titleStr += " (Scarred)";
      tr.innerHTML = "<td>" + dName + "</td><td>" + def.name + "</td><td>" + (s.level || 1) + "</td><td>" + (s.kills || 0) + "</td><td>" + (s.battlesSurvived || 0) + "</td><td>" + titleStr + "</td>";
      if (s.gifted) tr.classList.add("roster-stats--gifted");
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    panel.appendChild(table);

    // Show bonded pairs
    var bonds = campaignState.flags._bondPairs || [];
    if (bonds.length > 0) {
      var bondDiv = document.createElement("div");
      bondDiv.style.marginTop = "0.5rem";
      bondDiv.style.fontSize = "0.7rem";
      bondDiv.style.color = "var(--fft-gold)";
      bondDiv.innerHTML = "<strong>Bonded Pairs:</strong> ";
      for (var bp = 0; bp < bonds.length; bp++) {
        var pair = bonds[bp].split("|");
        var n1 = "", n2 = "";
        for (var ri = 0; ri < roster.length; ri++) {
          if (roster[ri].uid === pair[0]) n1 = roster[ri].name || classById(roster[ri].classId).name;
          if (roster[ri].uid === pair[1]) n2 = roster[ri].name || classById(roster[ri].classId).name;
        }
        if (n1 && n2) bondDiv.innerHTML += (bp > 0 ? ", " : "") + n1 + " & " + n2;
      }
      panel.appendChild(bondDiv);
    }
    panel.classList.remove("is-hidden");
    if (btn) btn.setAttribute("aria-expanded", "true");
  }

  function hireClass(classId) {
    if (state.picks.length >= MAX_ROSTER) {
      log("Roster full (" + MAX_ROSTER + " fighters max).", "system");
      return;
    }
    const c = classById(classId);
    var spent = 0;
    for (var i = 0; i < state.picks.length; i++) {
      if (!state.picks[i].isFree) spent += classById(state.picks[i].classId).cost;
    }
    if (spent + c.cost > budgetCurrent) {
      log("Not enough denarii for " + c.name + ".", "system");
      return;
    }
    var newPick = { uid: "p" + (++state.unitSeq) + "_" + state.picks.length, classId: c.id, displayName: randomRomanName() };
    state.picks.push(newPick);
    log("Hired " + newPick.displayName + " the " + c.name + ".");
    refreshRosterUI();
    if (campaignState.active) Campaign.saveToDisk();
    promptFighterName(newPick);
  }

  function promptFighterName(pick) {
    var existing = pickedListEl.querySelector("[data-uid='" + pick.uid + "']");
    if (!existing) return;
    var nameSpan = existing.querySelector(".pick-name");
    if (!nameSpan) return;
    nameSpan.innerHTML = "";
    var input = document.createElement("input");
    input.type = "text";
    input.className = "name-input";
    input.value = pick.displayName || "";
    input.placeholder = classById(pick.classId).name;
    input.maxLength = 16;
    input.setAttribute("aria-label", "Name for " + classById(pick.classId).name);
    nameSpan.appendChild(input);
    var reroll = document.createElement("button");
    reroll.type = "button";
    reroll.className = "btn-reroll";
    reroll.textContent = "\u2684";
    reroll.title = "Randomize name";
    reroll.setAttribute("aria-label", "Randomize fighter name");
    var _skipBlur = false;
    reroll.addEventListener("mousedown", function(e) {
      e.preventDefault();
    });
    reroll.addEventListener("click", function(e) {
      e.stopPropagation();
      var newName = randomRomanName();
      input.value = newName;
      pick.displayName = newName;
      input.focus();
      input.select();
    });
    nameSpan.appendChild(reroll);

    var dismissBtn = existing.querySelector(".btn-dismiss");
    var origText, origLabel, origHandler;
    if (dismissBtn) {
      origText = dismissBtn.textContent;
      origLabel = dismissBtn.getAttribute("aria-label");
      origHandler = dismissBtn.onclick;
      dismissBtn.textContent = "Accept";
      dismissBtn.setAttribute("aria-label", "Accept name");
      dismissBtn.className = "btn-accept";
      dismissBtn.onclick = null;
      dismissBtn.addEventListener("click", function acceptClick() {
        input.blur();
        dismissBtn.removeEventListener("click", acceptClick);
      }, { once: true });
    }

    input.focus();
    input.select();
    function finalize() {
      var val = input.value.trim();
      if (val) pick.displayName = val;
      if (dismissBtn) {
        dismissBtn.textContent = origText;
        dismissBtn.setAttribute("aria-label", origLabel || "");
        dismissBtn.className = "btn-dismiss";
      }
      refreshRosterUI();
    }
    input.addEventListener("blur", finalize);
    input.addEventListener("keydown", function(e) {
      if (e.key === "Enter") { e.preventDefault(); input.blur(); }
    });
  }

  function startTrainingBout() {
    if (!state.picks.length) return;
    state.trainingBout = true;
    var trainSeed = (state.boutNumber + 1) * 71 + 137;
    state._mapSeed = trainSeed;
    state.height = buildHeightField(trainSeed);
    state.terrain = buildTerrainMap(trainSeed, null);
    state.phase = "deploy";
    state.deployTemplate = state.picks.map((p) => ({ ...p }));
    state.units = [];
    state.deploySelectedIndex = 0;
    placeTrainingEnemies();
    showPhasePanels();
    refreshDeployUI();
    renderBoard();
    log("Training bout — place your fighters on the blue gate tiles.");
  }

  function placeTrainingEnemies() {
    var avgLevel = 1;
    if (state.picks.length) {
      var totalLvl = 0;
      for (var i = 0; i < state.picks.length; i++) totalLvl += (state.picks[i].level || 1);
      avgLevel = Math.round(totalLvl / state.picks.length);
    }
    var enemyLvl = Math.max(1, avgLevel - 1 + Math.floor(Math.random() * 2));
    var unlocked = Campaign.getUnlockedClasses ? Campaign.getUnlockedClasses() : GLADIATOR_CLASSES.map(function(c) { return c.id; });
    var count = state.picks.length;
    for (var j = 0; j < count; j++) {
      var cls = unlocked[Math.floor(Math.random() * unlocked.length)];
      var ex = Math.floor(Math.random() * BOARD_W);
      var ey = Math.floor(Math.random() * 3);
      while (occupantAt(ex, ey) || isTileImpassableTerrain(ex, ey)) { ex = Math.floor(Math.random() * BOARD_W); ey = Math.floor(Math.random() * 3); }
      var eu = createUnit("enemy", cls, ex, ey);
      eu.level = enemyLvl;
      if (enemyLvl > 1) {
        var tgb = computeGrowthBonuses(cls, eu.id, enemyLvl);
        eu.bonusHp = tgb.hp; eu.bonusAtk = tgb.atk;
        eu.bonusDef = tgb.def; eu.bonusSpd = tgb.spd;
        eu.maxHp += tgb.hp;
      }
      eu.hp = eu.maxHp;
      state.units.push(eu);
    }
  }

  function snapshotPicksToRoster() {
    if (!campaignState.active) return;
    campaignState.survivingRoster = state.picks.map(function (p) {
      return {
        uid: p.uid,
        classId: p.classId,
        name: p.displayName || null,
        hp: p.hp || classById(p.classId).hp,
        maxHp: p.maxHp || classById(p.classId).hp,
        isFree: p.isFree || false,
        level: p.level || 1,
        xp: p.xp || 0,
        kills: p.kills || 0,
        gifted: p.gifted || false,
        bonusHp:  p.bonusHp  || 0,
        bonusAtk: p.bonusAtk || 0,
        bonusDef: p.bonusDef || 0,
        bonusSpd: p.bonusSpd || 0,
      };
    });
    Campaign.saveToDisk();
  }

  function startDeploy() {
    if (!state.picks.length) {
      log("Hire at least one fighter before deploying.", "system");
      return;
    }
    try {
      snapshotPicksToRoster();
      state.trainingBout = false;
      var mission = campaignState.active ? Campaign.getMission() : null;
      var nextBout = state.boutNumber + 1;
      var hSeed;
      if (mission) {
        hSeed = mission.id * 97 + 42;
      } else if (skirmishConfig.seed) {
        var h = 0;
        for (var si = 0; si < skirmishConfig.seed.length; si++) h = ((h << 5) - h + skirmishConfig.seed.charCodeAt(si)) | 0;
        hSeed = Math.abs(h);
      } else {
        hSeed = nextBout * 71 + 42;
      }
      state._mapSeed = hSeed;
      var tmplKey = (!mission && !campaignState.active && skirmishConfig.template) ? skirmishConfig.template : null;
      state.height = buildHeightField(hSeed, tmplKey);
      state.terrain = buildTerrainMap(hSeed, mission ? mission.terrain : null, tmplKey);
      state.phase = "deploy";
      state.deployTemplate = state.picks.map((p) => ({ ...p }));
      state.units = [];
      state.deploySelectedIndex = 0;
      placeEnemies();
      showPhasePanels();
      refreshDeployUI();
      renderBoard();
      log("Place your fighters on the blue gate tiles.");
      state.tutorialStep = 10;
      tutorialTip(10, "Click a blue-highlighted tile at the bottom of the arena to place a fighter. Click a placed fighter to recall them.");
      tutorialTip(11, "Once all fighters are placed, click \"Enter arena\" to begin the battle.");
    } catch (e) {
      console.error("startDeploy failed:", e);
      log("Deploy error — retrying. (" + e.message + ")", "system");
      state.phase = "ludus";
      showPhasePanels();
      refreshRosterUI();
      renderBoard();
    }
  }

  function placeEnemies() {

    var mission = campaignState.active ? Campaign.getMission() : null;
    if (mission) {
      placeEnemiesCampaign(mission);
      return;
    }

    var playerCount = Math.min(6, state.picks.length);
    var enemyCount = campaignState.active ? playerCount : (skirmishConfig.enemyCount || playerCount);
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
      var py = (rng() < 0.5) ? 0 : 1;
      var px;
      do { px = 1 + Math.floor(rng() * (BOARD_W - 2)); }
      while (usedPositions[px + "," + py] || isTileImpassableTerrain(px, py));
      usedPositions[px + "," + py] = true;
      state.units.push(createUnit("enemy", chosen[j], px, py));
    }
  }

  function placeEnemiesCampaign(mission) {
    var rng = seedRng(mission.id * 997 + 13);
    var usedPositions = {};
    var enemies = mission.enemies.slice();

    if (mission.id === 13) {
      if (!Campaign.getFlag("scaeva_allied")) {
        enemies.push({ classId: "murmillo", gifted: true });
      }
      if (!Campaign.getFlag("valeria_allied")) {
        enemies.push({ classId: "hoplomachus", gifted: true });
      }
    }

    for (var i = 0; i < enemies.length; i++) {
      var spec = enemies[i];
      var px, py;
      if (spec.x !== undefined && spec.y !== undefined) {
        px = spec.x;
        py = spec.y;
      } else {
        py = (rng() < 0.5) ? 0 : 1;
        var attempts = 0;
        do {
          px = 1 + Math.floor(rng() * (BOARD_W - 2));
          attempts++;
          if (attempts > 40) { py = py === 0 ? 1 : 0; attempts = 0; }
        }
        while (usedPositions[px + "," + py] || isTileImpassableTerrain(px, py));
      }
      usedPositions[px + "," + py] = true;
      var unit = createUnit("enemy", spec.classId, px, py);
      if (spec.name) unit.displayName = spec.name;
      if (spec.gifted) unit.gifted = true;
      if (spec.boss) unit.boss = true;
      if (spec.atkBonus) unit.atkBonus = spec.atkBonus;
      if (unit.gifted) applyGiftedBoosts(unit);
      var eLvl = mission.enemyLevel || 1;
      unit.level = eLvl;
      if (eLvl > 1) {
        var egb = computeGrowthBonuses(unit.classId, unit.id, eLvl);
        unit.bonusHp = egb.hp; unit.bonusAtk = egb.atk;
        unit.bonusDef = egb.def; unit.bonusSpd = egb.spd;
        if (egb.hp > 0) { unit.maxHp += egb.hp; unit.hp = unit.maxHp; }
      }
      state.units.push(unit);
    }
  }

  function applyPickLevel(unit, pick) {
    unit.level = pick.level || 1;
    unit.xp = pick.xp || 0;
    unit.kills = pick.kills || 0;
    unit.nearDeathCount = pick.nearDeathCount || 0;
    unit.title = pick.title || null;
    unit.battlesSurvived = pick.battlesSurvived || 0;
    if (pick.bonusHp != null) {
      unit.bonusHp  = pick.bonusHp  || 0;
      unit.bonusAtk = pick.bonusAtk || 0;
      unit.bonusDef = pick.bonusDef || 0;
      unit.bonusSpd = pick.bonusSpd || 0;
    } else if (unit.level > 1) {
      var gb = computeGrowthBonuses(unit.classId, pick.uid || unit.id, unit.level);
      unit.bonusHp  = gb.hp;
      unit.bonusAtk = gb.atk;
      unit.bonusDef = gb.def;
      unit.bonusSpd = gb.spd;
    }
    var hpBonus = unit.bonusHp || 0;
    if (hpBonus > 0) {
      unit.maxHp += hpBonus;
      unit.hp += hpBonus;
    }
  }

  function applyGiftedBoosts(unit) {
    var def = classById(unit.classId);
    unit.maxHp = Math.ceil(def.hp * 1.3);
    unit.hp = unit.maxHp;
    unit.giftedAtk = Math.ceil(def.atk * 1.25);
    unit.giftedDef = def.def + 1;
    unit.giftedSpd = Math.ceil(def.spd * 1.2);
    unit.giftedMove = def.move + 1;
    unit.giftedJump = def.jump + 1;
    if (unit.classId === "dimachaerus") {
      unit.extraAbilities = [
        { name: "Binding Fury", desc: "1.6× single target, no self-damage.", type: "attack", target: "adjacent_enemy", mult: 1.6 }
      ];
    }
  }

  function refreshDeployUI() {
    deployQueueEl.innerHTML = "";
    const left = state.deployTemplate.filter((p) => !p.placed);
    state.deployTemplate.forEach((p, idx) => {
      const def = classById(p.classId);
      const li = document.createElement("li");
      li.className = "deploy-card" + (idx === state.deploySelectedIndex && !p.placed ? " is-picked" : "") + (p.placed ? " is-placed" : "");

      var sprSvg = gladiatorSpriteSvg(p.classId, "player", "dpl_" + idx);
      sprSvg.classList.add("deploy-card__sprite");
      li.appendChild(sprSvg);

      var info = document.createElement("div");
      info.className = "deploy-card__info";
      var nameStr = p.displayName ? p.displayName : def.name;
      var lvlBadge = campaignState.active ? ' <span class="level-badge">Lv.' + (p.level || 1) + '</span>' : '';
      info.innerHTML = '<span class="deploy-card__name">' + nameStr + lvlBadge + '</span><span class="deploy-card__class">' + def.name + '</span>';
      li.appendChild(info);

      var status = document.createElement("span");
      status.className = "deploy-card__status";
      status.textContent = p.placed ? "✓" : "…";
      li.appendChild(status);

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
          (p) => p.placed && p.uid === existing.uid
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
      if (!isGateTile(x, y) || existing || isTileImpassableTerrain(x, y)) {
        if (existing) log("Tile occupied. Click a placed ally to recall them.");
        else if (!isGateTile(x, y)) log("Select a blue gate tile to place a fighter.");
        return;
      }
      const pick = state.deployTemplate[state.deploySelectedIndex];
      if (!pick || pick.placed) {
        log("Select a fighter from the deploy queue first.");
        return;
      }
      var pu = createUnit("player", pick.classId, x, y);
      if (pick.displayName) pu.displayName = pick.displayName;
      if (pick.isFree) pu.isFree = true;
      if (pick.uid) pu.uid = pick.uid;
      if (pick.gifted) { pu.gifted = true; applyGiftedBoosts(pu); }
      applyPickLevel(pu, pick);
      if (pick.hp != null) { pu.hp = pick.hp; pu.maxHp = pick.maxHp; }
      state.units.push(pu);
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

  function resetMapMods() {
    state.mapMods.cursedTiles = new Set();
    state.mapMods.cursedDmg = 0;
    state.mapMods.fullCurse = false;
    state.mapMods.ritualPulse = null;
    state.mapMods.crowdSpdPenalty = 0;
    state.mapMods.crowdSurgeTurn = 0;
    state.mapMods.crowdSurgeApplied = false;
    state.mapMods.collapsedTiles = new Set();
    state.mapMods.collapsingActive = false;
    state.mapMods.collapsingMission = 0;
    state.mapMods.glowTiles = new Set();
    state.mapMods.shiftingSand = false;
    state.mapMods.symbolFlashTurn = 0;
    state.mapMods.symbolFlashTiles = new Set();
    state.mapMods.sandGlyphTiles = new Set();
    state.mapMods.darkSky = false;
    state.terrain = buildEmptyTerrain();
  }

  function initMapModifiers(mission) {
    resetMapMods();
    if (!mission || !mission.mapModifiers) return;

    var rng = seedRng(mission.id * 1337 + 7);
    var sandTiles = [];
    for (var y = 0; y < BOARD_H; y++) {
      for (var x = 0; x < BOARD_W; x++) {
        if (tileZone(x, y) === "sand") sandTiles.push(cellKey(x, y));
      }
    }

    for (var i = 0; i < mission.mapModifiers.length; i++) {
      var modId = mission.mapModifiers[i];
      var def = MAP_MODIFIER_DEFS[modId];
      if (!def) continue;

      if (def.type === "cursed") {
        state.mapMods.cursedDmg = def.dmg;
        var pool = sandTiles.slice();
        for (var ci = 0; ci < def.count && pool.length; ci++) {
          var idx = Math.floor(rng() * pool.length);
          state.mapMods.cursedTiles.add(pool[idx]);
          pool.splice(idx, 1);
        }
      } else if (def.type === "full_curse") {
        state.mapMods.fullCurse = true;
        state.mapMods.cursedDmg = def.dmg;
      } else if (def.type === "ritual_pulse") {
        state.mapMods.ritualPulse = { interval: def.interval, dmg: def.dmg };
      } else if (def.type === "crowd_surge") {
        state.mapMods.crowdSurgeTurn = def.turn;
      } else if (def.type === "crowd_madness") {
        state.mapMods.crowdSpdPenalty = def.spdPenalty;
      } else if (def.type === "collapsing") {
        state.mapMods.collapsingActive = true;
        state.mapMods.collapsingMission = mission.id;
      }
    }

    if (mission.id >= 10) state.mapMods.darkSky = true;
    if (mission.id === 9) state.mapMods.shiftingSand = true;
    if (mission.id === 8) state.mapMods.symbolFlashTurn = 3;
    if (mission.id === 11) {
      var glyphPool = sandTiles.slice();
      for (var gi = 0; gi < 5 && glyphPool.length; gi++) {
        var gIdx = Math.floor(rng() * glyphPool.length);
        state.mapMods.sandGlyphTiles.add(glyphPool[gIdx]);
        glyphPool.splice(gIdx, 1);
      }
    }
  }

  function applyCrowdMadnessAtBattleStart() {
    if (state.mapMods.crowdSpdPenalty <= 0) return;
    var penalty = state.mapMods.crowdSpdPenalty;
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      if (u.team === "player" && !u.gifted) {
        u.crowdSpdDebuff = penalty;
      }
    }
    log("The crowd's madness weighs on your fighters (−" + penalty + " SPD).", "system");
  }

  function isTileCollapsed(x, y) {
    return state.mapMods.collapsedTiles.has(cellKey(x, y));
  }

  function isTileCursed(x, y) {
    if (state.mapMods.fullCurse) return true;
    return state.mapMods.cursedTiles.has(cellKey(x, y));
  }

  function tickCursedTileDamage(u) {
    if (!state.mapMods.cursedDmg) return false;
    if (!isTileCursed(u.x, u.y)) return false;
    if (u.gifted || u.boss) return false;
    if (u.hp <= 0) return false;
    applyDamage(u, state.mapMods.cursedDmg);
    log(classById(u.classId).name + " burns on cursed sand! (−" + state.mapMods.cursedDmg + ")", "system");
    return u.hp <= 0;
  }

  function tickRitualPulse() {
    var rp = state.mapMods.ritualPulse;
    if (!rp) return [];
    if (state.turnCount % rp.interval !== 0) return [];
    var alive = state.units.filter(function (u) { return u.hp > 0; });
    if (!alive.length) return [];

    var isMission13 = state.mapMods.fullCurse;
    var baseDmg = isMission13 ? 4 : rp.dmg;
    var titusAlive = alive.some(function (u) { return u.boss; });

    log("The ritual pulses through the arena!", "system");
    screenShake(120, 3);

    var killed = [];
    for (var i = 0; i < alive.length; i++) {
      var u = alive[i];
      var dmg = baseDmg;
      if (isMission13 && titusAlive) dmg *= 2;
      if (u.gifted || u.boss) dmg = Math.max(1, Math.floor(dmg / 2));
      applyDamage(u, dmg);
      if (u.hp <= 0) killed.push(u);
    }
    return killed;
  }

  function tickCrowdSurge() {
    if (!state.mapMods.crowdSurgeTurn) return;
    if (state.mapMods.crowdSurgeApplied) return;
    if (state.turnCount < state.mapMods.crowdSurgeTurn) return;
    state.mapMods.crowdSurgeApplied = true;
    var alive = state.units.filter(function (u) { return u.hp > 0; });
    for (var i = 0; i < alive.length; i++) {
      alive[i].crowdSpdDebuff = (alive[i].crowdSpdDebuff || 0) + 1;
    }
    log("The crowd's chanting intensifies — all fighters slow! (−1 SPD)", "system");
  }

  function tickCollapsingArena() {
    if (!state.mapMods.collapsingActive) return;
    var mid = state.mapMods.collapsingMission;
    var shouldCollapse = false;

    if (mid === 12) {
      if (state.turnCount === 6 || state.turnCount === 10) shouldCollapse = true;
    } else if (mid === 13) {
      if (state.turnCount > 0 && state.turnCount % 3 === 0) shouldCollapse = true;
    }
    if (!shouldCollapse) return;

    var candidates = [];
    for (var y = 1; y < BOARD_H - 1; y++) {
      for (var x = 1; x < BOARD_W - 1; x++) {
        var k = cellKey(x, y);
        if (state.mapMods.collapsedTiles.has(k)) continue;
        if (occupantAt(x, y)) continue;
        candidates.push(k);
      }
    }
    var rng = seedRng(state.turnCount * 31 + mid);
    var count = Math.min(2, candidates.length);
    for (var ci = 0; ci < count; ci++) {
      var idx = Math.floor(rng() * candidates.length);
      state.mapMods.collapsedTiles.add(candidates[idx]);
      candidates.splice(idx, 1);
    }
    recalcGlowTiles();
    log("The arena floor cracks and collapses!", "system");
    screenShake(150, 4);
  }

  function recalcGlowTiles() {
    state.mapMods.glowTiles = new Set();
    if (!state.mapMods.fullCurse && state.mapMods.collapsingMission !== 13) return;
    state.mapMods.collapsedTiles.forEach(function (k) {
      var parts = k.split(",").map(Number);
      var cx = parts[0], cy = parts[1];
      for (var di = 0; di < DIRS.length; di++) {
        var nx = cx + DIRS[di][0], ny = cy + DIRS[di][1];
        if (!inBounds(nx, ny)) continue;
        var nk = cellKey(nx, ny);
        if (!state.mapMods.collapsedTiles.has(nk)) {
          state.mapMods.glowTiles.add(nk);
        }
      }
    });
  }

  function tickShiftingSand() {
    if (!state.mapMods.shiftingSand) return;
    if (state.turnCount % 6 !== 0 || state.turnCount === 0) return;
    var candidates = [];
    for (var y = 0; y < BOARD_H; y++) {
      for (var x = 0; x < BOARD_W; x++) {
        if (!occupantAt(x, y) && !isTileCollapsed(x, y) && !isTileImpassableTerrain(x, y)) candidates.push([x, y]);
      }
    }
    if (candidates.length < 2) return;
    var rng = seedRng(state.turnCount * 17 + 3);
    var i1 = Math.floor(rng() * candidates.length);
    var t1 = candidates.splice(i1, 1)[0];
    var i2 = Math.floor(rng() * candidates.length);
    var t2 = candidates[i2];
    var tmp = state.height[t1[1]][t1[0]];
    state.height[t1[1]][t1[0]] = state.height[t2[1]][t2[0]];
    state.height[t2[1]][t2[0]] = tmp;
    log("The sand shifts beneath your feet!", "system");
  }

  function tickSymbolFlash() {
    if (!state.mapMods.symbolFlashTurn) return;
    if (state.turnCount !== state.mapMods.symbolFlashTurn) return;
    state.mapMods.symbolFlashTurn = 0;
    var rng = seedRng(state.turnCount * 53 + 7);
    var candidates = [];
    for (var y = 0; y < BOARD_H; y++) {
      for (var x = 0; x < BOARD_W; x++) {
        if (tileZone(x, y) === "sand") candidates.push([x, y]);
      }
    }
    var count = Math.min(5, candidates.length);
    var stunned = 0;
    for (var i = 0; i < count; i++) {
      var idx = Math.floor(rng() * candidates.length);
      var tile = candidates.splice(idx, 1)[0];
      var occ = occupantAt(tile[0], tile[1]);
      if (occ && occ.hp > 0 && !occ.rootedSkip) {
        occ.rootedSkip = 1;
        stunned++;
        log(classById(occ.classId).name + " is stunned by arcane glyphs!", "system");
      }
    }
    if (!stunned) log("Glyphs flash across the sand, but no one is caught.", "system");
    else log("Symbols burn across the arena!", "system");
  }

  function tickSandGlyphs() {
    if (!state.mapMods.sandGlyphTiles.size) return;
    var alive = state.units.filter(function (u) { return u.hp > 0; });
    for (var i = 0; i < alive.length; i++) {
      var u = alive[i];
      if (state.mapMods.sandGlyphTiles.has(cellKey(u.x, u.y))) {
        u.glyphStayCount = (u.glyphStayCount || 0) + 1;
        if (u.glyphStayCount >= 2 && !u.rootedSkip) {
          u.rootedSkip = 1;
          u.glyphStayCount = 0;
          log(classById(u.classId).name + " lingers on a glyph — stunned!", "system");
        }
      } else {
        u.glyphStayCount = 0;
      }
    }
  }

  async function tickMapModifiers() {
    var pulseKilled = tickRitualPulse();
    for (var pk = 0; pk < pulseKilled.length; pk++) {
      await animateDeath(pulseKilled[pk]);
    }
    tickCrowdSurge();
    tickCollapsingArena();
    tickShiftingSand();
    tickSymbolFlash();
    tickSandGlyphs();
  }

  function startBattle() {
    if (state.deployTemplate.some((p) => !p.placed)) return;
    state.boutNumber++;
    var mission = campaignState.active ? Campaign.getMission() : null;
    var hSeed = state._mapSeed;
    var tmplKey = (!mission && !campaignState.active && skirmishConfig.template) ? skirmishConfig.template : null;
    state.height = buildHeightField(hSeed, tmplKey);
    state.phase = "battle";
    state.activeUnit = null;
    state.battleMode = "idle";
    state.highlightCells.clear();
    state.turnCount = 0;
    state.totalDamageDealt = 0;
    state.battleLog = [];
    state.titusForgottenName = false;
    state.endingATriggered = false;
    state.titusTurnCounter = 0;
    logFeed.innerHTML = "";
    if (campaignState.active) {
      campaignState._preBattleCount = state.units.filter(function (u) { return u.team === "player"; }).length;
    }
    initMapModifiers(mission);
    state.terrain = buildTerrainMap(hSeed, mission ? mission.terrain : null, tmplKey);
    applyCrowdMadnessAtBattleStart();
    showPhasePanels();
    unitCard.classList.add("is-hidden");
    bindBattleButtons();
    renderBoard();
    if (mission) {
      log(Campaign.getMissionLabel(), "system");
      if (state.mapMods.cursedTiles.size || state.mapMods.fullCurse) {
        log("Cursed sand stains the arena floor.", "system");
      }
      if (state.mapMods.ritualPulse) {
        log("The ritual hums beneath the sand.", "system");
      }
    }
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
    btnUndo.onclick = () => undoMove();
  }

  function tickMarkDebuffIfNeeded(u) {
    if (u.markDebuffTurns > 0) {
      u.markDebuffTurns -= 1;
      if (u.markDebuffTurns <= 0) { u.markFocusId = null; u.dreadMarkDmg = 0; }
    }
  }

  function clearTurnBuffs(u) {
    u.tempExtraMove = false;
    u.rallyCharge = false;
    if (!(u.fortressRooted > 0)) u.testudoBonus = 0;
    u.phalanxBonus = 0;
    u.blindRushAtk = 0;
    u.blindRushDef = 0;
    u.highGroundNext = false;
    u.battleFocusNext = false;
    if (u.atkBonusTurns > 0) {
      u.atkBonusTurns--;
      if (u.atkBonusTurns <= 0) u.atkBonus = 0;
    }
    u.momentumBonus = 0;
    u.shadowMendAtkPenalty = 0;
    if (u.battleHardenedTurns > 0) {
      u.battleHardenedTurns--;
      if (u.battleHardenedTurns <= 0) { u.battleHardenedAtk = 0; u.battleHardenedDef = 0; }
    }
    if (u.fortressRooted > 0) u.fortressRooted--;
  }

  async function tickBattleTurn() {
    if (state.phase !== "battle") return;
    if (await checkVictoryAsync()) return;
    state.turnCount++;
    await tickMapModifiers();
    if (await checkVictoryAsync()) return;
    const actor = nextActor();
    refreshCtStrip();
    if (actor) clearTurnBuffs(actor);
    if (!actor) {
      log("CT stall — forcing result.", "system");
      renderBoard();
      await checkVictoryAsync();
      return;
    }
    if (actor.team === "enemy") {
      try {
        await runEnemyTurn(actor);
      } catch (e) {
        console.error("runEnemyTurn failed:", e);
        log("AI error — skipping enemy turn.", "system");
      }
      if (await checkVictoryAsync()) return;
      await delay(200);
      tickBattleTurn();
      return;
    }
    if (actor.atkDebuffTurns > 0) actor.atkDebuffTurns--;
    if (actor.atkDebuffTurns <= 0) actor.atkDebuffAmt = 0;
    if (actor.bleedTurns > 0) {
      actor.bleedTurns--;
      applyDamage(actor, 1);
      log(classById(actor.classId).name + " bleeds! (−1 HP)");
      if (actor.hp <= 0) { await animateDeath(actor); tickBattleTurn(); return; }
    }
    if (actor.rootedSkip) {
      actor.rootedSkip--;
      log(classById(actor.classId).name + " is netted and cannot act!");
      var cursedKillP = tickCursedTileDamage(actor);
      if (cursedKillP) { await animateDeath(actor); tickBattleTurn(); return; }
      tickMarkDebuffIfNeeded(actor);
      renderBoard();
      await delay(350);
      tickBattleTurn();
      return;
    }
    state.activeUnit = actor;
    state.battleMode = "idle";
    state.highlightCells.clear();
    state.hasMoved = false;
    state.hasActed = false;
    state.selectedAbilityIndex = -1;
    updateBondBuff(actor);
    showUnitPanel(actor);
    setBattleButtons(actor);
    renderBoard();
    var turnMsg = "Turn: " + (actor.displayName ? actor.displayName + " the " : "") + classById(actor.classId).name + (actor.title ? " the " + actor.title : "") + " — issue orders.";
    log(turnMsg, "system");
    announce(turnMsg + " HP " + actor.hp + " of " + actor.maxHp);
    if (state.tutorialStep < 20) state.tutorialStep = 20;
    tutorialTip(20, "It's your turn! Use Move (M) to reposition, Attack (A) to strike adjacent foes, Ability (B) for special skills, or Wait (W) to end your turn.");
    tutorialTip(21, "Tip: Move first to get next to an enemy, then Attack. You can also use keyboard shortcuts: M, A, B, W.");
  }

  // -- Tile info & forecast --
  function showTileInfo(col, row) {
    if (!inBounds(col, row)) { hideTileInfo(); return; }
    var h = state.height[row][col];
    var zone = tileZone(col, row);
    var terrain = state.terrain && state.terrain[row] && state.terrain[row][col];
    var hName = h === 0 ? "Low" : h === 1 ? "Mid" : "High";
    var label = zone.charAt(0).toUpperCase() + zone.slice(1);
    if (terrain === "building") label = "Building";
    else if (terrain === "water_deep") label = "Deep Water";
    else if (terrain === "water_shallow") label = "Shallow Water";
    var txt = label + " · H:" + hName;
    if (terrain === "building") txt += " · Impassable";
    else if (terrain === "water_deep") txt += " · Impassable";
    else if (terrain === "water_shallow") txt += " · Slows movement";
    if (isTileCollapsed(col, row)) txt += " · COLLAPSED";
    else if (isTileCursed(col, row)) txt += " · Cursed";
    if (state.mapMods.glowTiles.has(cellKey(col, row))) txt += " · Glow (+2 ATK)";
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
    var ab = null;
    if (abilityIdx >= 0) {
      ab = unitAbilities(attacker)[abilityIdx];
      if (ab) { label = ab.name; mult = ab.mult || 1; ignDef = ab.ignoreDefPct || 0; }
    }
    if (ab && ab.effect === "suppress") {
      dmg = 3;
    } else if (ab && ab.effect === "grave_pulse") {
      dmg = 4;
    } else {
      dmg = physicalDamage(attacker, target, mult, ignDef, true);
    }
    var html = '<div class="fc-name">' + def.name + '</div>';
    html += '<div class="fc-hit">Hit: ' + hitPct + '%</div>';
    var dmgLabel = (ab && (ab.effect === "suppress" || ab.effect === "grave_pulse")) ? " true dmg" : " dmg";
    html += '<div class="fc-dmg">' + label + ': ~' + dmg + dmgLabel + '</div>';
    forecastEl.innerHTML = html;
    forecastEl.classList.remove("is-hidden");
  }

  function hideForecast() {
    forecastEl.classList.add("is-hidden");
  }

  function showUnitPanel(u) {
    const def = classById(u.classId);
    unitCard.classList.remove("is-hidden");
    var uNameStr = u.displayName ? u.displayName : def.name;
    if (u.title) uNameStr += " the " + u.title;
    if (u.displayName) uNameStr += " (" + def.name + ")";
    if (campaignState.active && u.level > 1) uNameStr += " Lv." + u.level;
    ucName.textContent = uNameStr;
    ucClass.textContent = def.role;
    ucHp.textContent = u.hp + " / " + u.maxHp;
    ucAtk.textContent = String(unitAtk(u));
    ucDef.textContent = String(unitDef(u));
    ucSpd.textContent = String(unitSpd(u));
    ucMove.textContent = String(effectiveMove(u));
    ucJump.textContent = String(unitJump(u));
    ucAbility.textContent = unitAbilities(u).map(function (a) { return a.name + " — " + a.desc; }).join(" | ");
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
    btnUndo.disabled = !(alive && state.hasMoved && !state.hasActed && state.preMovePos);
    hideAbilityMenu();
  }

  function showAbilityMenu(u) {
    var abList = unitAbilities(u);
    abilityMenu.innerHTML = "";
    var menuIdx = 0;
    abList.forEach(function (ab, idx) {
      if (ab.type === "passive") return;
      menuIdx++;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ability-menu__btn";
      btn.setAttribute("role", "menuitem");
      btn.innerHTML = "<kbd>" + menuIdx + "</kbd> " + ab.name + "<small>" + ab.desc + "</small>";
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
    if (actor) {
      var cursedKill = tickCursedTileDamage(actor);
      if (cursedKill) await animateDeath(actor);
      tickMarkDebuffIfNeeded(actor);
    }
    state.activeUnit = null;
    state.battleMode = "idle";
    state.highlightCells.clear();
    state.hasMoved = false;
    state.hasActed = false;
    state.preMovePos = null;
    state.selectedAbilityIndex = -1;
    hideForecast();
    unitCard.classList.add("is-hidden");
    hideAbilityMenu();
    btnMove.disabled = true;
    btnAttack.disabled = true;
    btnAbility.disabled = true;
    btnWait.disabled = true;
    btnUndo.disabled = true;
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
    tutorialTip(30, "Good move! Now click Attack (A) to strike an adjacent enemy, or use an Ability (B) if one is available.");
  }

  function undoMove() {
    var u = state.activeUnit;
    if (!u || !state.preMovePos || state.hasActed) return;
    u.x = state.preMovePos.x;
    u.y = state.preMovePos.y;
    u.pursuitBonusDmg = 0;
    u.momentumBonus = 0;
    state.hasMoved = false;
    state.preMovePos = null;
    state.battleMode = "idle";
    state.highlightCells.clear();
    hideForecast();
    showUnitPanel(u);
    setBattleButtons(u);
    renderBoard();
    log("Move undone.");
  }

  function endAction() {
    state.hasActed = true;
    clearPlayerTurn();
  }

  function waitAction() {
    if (!state.activeUnit || state.activeUnit.team !== "player") return;

    if (state.titusForgottenName && !state.endingATriggered) {
      var u = state.activeUnit;
      var titus = state.units.find(function (e) {
        return e.team === "enemy" && e.boss && e.displayName === "Titus" && e.hp > 0;
      });
      if (titus) {
        var dist = Math.abs(u.x - titus.x) + Math.abs(u.y - titus.y);
        if (dist === 1) {
          state.endingATriggered = true;
          Campaign.setFlag("endingA_triggered");
          state.activeUnit = null;
          state.battleMode = "idle";
          log("Cassius reaches out. Titus lowers his blade.", "system");
          log("The twin bond holds. The ritual shatters.", "system");
          showResultOverlay("victory");
          return;
        }
      }
    }

    log("Guard.");
    clearPlayerTurn();
  }

  function cancelTargeting() {
    if (state.battleMode === "idle") return;
    state.battleMode = "idle";
    state.highlightCells.clear();
    state.selectedAbilityIndex = -1;
    hideForecast();
    var u = state.activeUnit;
    if (u && u.team === "player") { showUnitPanel(u); setBattleButtons(u); }
    renderBoard();
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
          if (isTileCollapsed(tx, ty)) break;
          if (isTileImpassableTerrain(tx, ty)) break;
          state.highlightCells.add(cellKey(tx, ty));
          if (occupantAt(tx, ty)) break;
        }
      }
      log(ab.name + " — pick a direction tile.");
    } else if (ab.target === "adjacent_ally") {
      for (var aai = 0; aai < DIRS.length; aai++) {
        var aax = u.x + DIRS[aai][0], aay = u.y + DIRS[aai][1];
        if (!inBounds(aax, aay)) continue;
        var aaOcc = occupantAt(aax, aay);
        if (aaOcc && aaOcc.team === u.team && aaOcc.id !== u.id && aaOcc.hp > 0) {
          state.highlightCells.add(cellKey(aax, aay));
        }
      }
      log(ab.name + " — choose adjacent ally.");
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
      state.preMovePos = { x: u.x, y: u.y };
      state.animating = true;
      var path = computePath(u, x, y);
      await animateMove(u, path);
      if (u.gifted && u.classId === "secutor" && path.length >= 4) {
        u.pursuitBonusDmg = 3;
        log("Pursuit Sense — bonus damage primed!");
      }
      if (u.classId === "essedarius" && path.length >= 3) {
        var hasMomentum = unitAbilities(u).some(function(a) { return a.name === "Momentum"; });
        if (hasMomentum) {
          u.momentumBonus = 3;
          log("Momentum — +3 ATK from charge!");
        }
      }
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
      consumeAttackBuffs(u);
      if (tgt.riposteActive) {
        applyDamage(u, 5);
        tgt.riposteActive = false;
        log("Riposte pricks the attacker!");
      }
      applyDamage(tgt, dmg, u);
      await Promise.all([animateHitFlash(tgt), screenShake(100, 3)]);
      log(
        classById(u.classId).name + " hits " + classById(tgt.classId).name + " for " + dmg + ". (" + hitPct + "% hit)"
      );
      tutorialTip(40, "Hit! Damage is based on your ATK minus the defender's DEF, with height and buffs as modifiers.");
      if (tgt.hp <= 0) {
        await animateDeath(tgt);
        tutorialTip(50, "Enemy down! Defeat all enemies to win the bout.");
      }
      state.animating = false;
      if (await checkVictoryAsync()) return;
      endAction();
      return;
    }
    if (state.battleMode === "shadow_step") {
      const k = cellKey(x, y);
      if (!state.highlightCells.has(k)) return;
      state.animating = true;
      u.x = x;
      u.y = y;
      state.highlightCells.clear();
      state.battleMode = "idle";
      log("Teleported!");
      state.animating = false;
      endAction();
      return;
    }
    if (state.battleMode === "abyssal_gate") {
      const agk = cellKey(x, y);
      if (!state.highlightCells.has(agk)) return;
      var agAlly = occupantAt(x, y);
      if (!agAlly || agAlly.team !== u.team) return;
      state.highlightCells.clear();
      state.battleMode = "abyssal_gate_dest";
      state._abyssalAlly = agAlly;
      for (var ady = 0; ady < BOARD_H; ady++) {
        for (var adx = 0; adx < BOARD_W; adx++) {
          if (manhattan(u, {x: adx, y: ady}) <= 3 && !occupantAt(adx, ady)
              && inBounds(adx, ady) && !isTileCollapsed(adx, ady) && !isTileImpassableTerrain(adx, ady)) {
            state.highlightCells.add(cellKey(adx, ady));
          }
        }
      }
      renderBoard();
      log("Abyssal Gate — select destination for " + (agAlly.displayName || classById(agAlly.classId).name) + ".");
      return;
    }
    if (state.battleMode === "abyssal_gate_dest") {
      const agdk = cellKey(x, y);
      if (!state.highlightCells.has(agdk)) return;
      state.animating = true;
      var agTarget = state._abyssalAlly;
      if (agTarget && agTarget.hp > 0) {
        agTarget.x = x;
        agTarget.y = y;
        log("Abyssal Gate — " + (agTarget.displayName || classById(agTarget.classId).name) + " teleported!");
      }
      state.highlightCells.clear();
      state.battleMode = "idle";
      state._abyssalAlly = null;
      state.animating = false;
      endAction();
      return;
    }
    if (state.battleMode === "ability") {
      state.animating = true;
      try {
        await doPlayerAbility(u, x, y);
        consumeAttackBuffs(u);
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
    const ab = unitAbilities(u)[state.selectedAbilityIndex];
    if (!ab) return;
    if (!state.highlightCells.has(k)) return;

    SFX.ability();

    if (ab.target === "self") {
      if (x !== u.x || y !== u.y) return;
      return executeAbilitySelf(u, ab);
    }

    if (ab.target === "aoe_adjacent") {
      if (x !== u.x || y !== u.y) return;
      if (ab.effect === "grave_pulse") {
        var allAdj = [];
        for (var gd = 0; gd < DIRS.length; gd++) {
          var gx = u.x + DIRS[gd][0], gy = u.y + DIRS[gd][1];
          var gt = occupantAt(gx, gy);
          if (gt && gt.hp > 0 && gt.team !== u.team) allAdj.push(gt);
        }
        for (var gi = 0; gi < allAdj.length; gi++) {
          applyDamage(allAdj[gi], 4);
          await Promise.all([animateHitFlash(allAdj[gi]), screenShake(80, 2)]);
          log("Grave Pulse hits " + classById(allAdj[gi].classId).name + " (4 true dmg).");
          if (allAdj[gi].hp <= 0) await animateDeath(allAdj[gi]);
        }
        if (!allAdj.length) log("The pulse echoes in emptiness.");
        if (ab.selfDamage) applyDamage(u, ab.selfDamage);
        endAction();
        return;
      }
      if (ab.effect === "voidburst") {
        var vbFoes = [];
        for (var vbi = 0; vbi < DIRS.length; vbi++) {
          var vbx = u.x + DIRS[vbi][0], vby = u.y + DIRS[vbi][1];
          var vbt = occupantAt(vbx, vby);
          if (vbt && vbt.team !== u.team && vbt.hp > 0) vbFoes.push(vbt);
        }
        var vbHealTotal = 0;
        for (var vbj = 0; vbj < vbFoes.length; vbj++) {
          var vbDmg = physicalDamage(u, vbFoes[vbj], ab.mult || 0.8);
          applyDamage(vbFoes[vbj], vbDmg);
          await Promise.all([animateHitFlash(vbFoes[vbj]), screenShake(80, 2)]);
          log("Void Burst hits " + classById(vbFoes[vbj].classId).name + " (" + vbDmg + ").");
          vbHealTotal += 2;
          if (vbFoes[vbj].hp <= 0) await animateDeath(vbFoes[vbj]);
        }
        if (vbHealTotal > 0) {
          u.hp = Math.min(u.maxHp, u.hp + vbHealTotal);
          spawnDmgNumber(u, "+" + vbHealTotal, "#70d870");
        }
        endAction();
        return;
      }
      if (ab.effect === "deathembrace") {
        var deFoes = [];
        for (var dei = 0; dei < DIRS.length; dei++) {
          var dex = u.x + DIRS[dei][0], dey = u.y + DIRS[dei][1];
          var det = occupantAt(dex, dey);
          if (det && det.team !== u.team && det.hp > 0) deFoes.push(det);
        }
        var deHeal = 0;
        for (var dej = 0; dej < deFoes.length; dej++) {
          applyDamage(deFoes[dej], 6);
          await Promise.all([animateHitFlash(deFoes[dej]), screenShake(80, 2)]);
          log("Death's Embrace hits " + classById(deFoes[dej].classId).name + " (6 true dmg).");
          deHeal += 6;
          if (deFoes[dej].hp <= 0) await animateDeath(deFoes[dej]);
        }
        if (deHeal > 0) {
          u.hp = Math.min(u.maxHp, u.hp + deHeal);
          spawnDmgNumber(u, "+" + deHeal, "#70d870");
        }
        endAction();
        return;
      }
      if (ab.effect === "whirlwind") {
        var wwFoes = [];
        for (var wwi = 0; wwi < DIRS.length; wwi++) {
          var wwx = u.x + DIRS[wwi][0], wwy = u.y + DIRS[wwi][1];
          var wwt = occupantAt(wwx, wwy);
          if (wwt && wwt.team !== u.team && wwt.hp > 0) wwFoes.push(wwt);
        }
        for (var wwj = 0; wwj < wwFoes.length; wwj++) {
          var wwDmg = physicalDamage(u, wwFoes[wwj], ab.mult || 1.2);
          applyDamage(wwFoes[wwj], wwDmg);
          await Promise.all([animateHitFlash(wwFoes[wwj]), screenShake(80, 2)]);
          log("Whirlwind Fury hits " + classById(wwFoes[wwj].classId).name + " (" + wwDmg + ").");
          if (wwFoes[wwj].hp <= 0) await animateDeath(wwFoes[wwj]);
        }
        state.battleMode = "shadow_step";
        state.highlightCells.clear();
        for (var wws = 0; wws < BOARD_H; wws++) {
          for (var wwsx = 0; wwsx < BOARD_W; wwsx++) {
            if (manhattan(u, {x: wwsx, y: wws}) === 1 && !occupantAt(wwsx, wws) && !isTileCollapsed(wwsx, wws)
                && !isTileImpassableTerrain(wwsx, wws)) {
              state.highlightCells.add(cellKey(wwsx, wws));
            }
          }
        }
        if (state.highlightCells.size > 0) {
          renderBoard();
          log("Whirlwind — select a tile to reposition.");
          return;
        }
        endAction();
        return;
      }
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
        log(ab.name + " cuts " + classById(f.classId).name + " (" + dmg + ").");
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

      if (ab.effect === "trample") {
        var trHits = [];
        var trx = u.x + dx, tryy = u.y + dy;
        while (inBounds(trx, tryy) && Math.abs(trx - u.x) + Math.abs(tryy - u.y) <= range) {
          if (isTileCollapsed(trx, tryy)) break;
          if (isTileImpassableTerrain(trx, tryy)) break;
          var trOcc = occupantAt(trx, tryy);
          if (trOcc && trOcc.team !== u.team && trOcc.hp > 0) trHits.push(trOcc);
          if (trOcc) break;
          trx += dx; tryy += dy;
        }
        for (var tri = 0; tri < trHits.length; tri++) {
          var trDmg = physicalDamage(u, trHits[tri], ab.mult || 0.6);
          applyDamage(trHits[tri], trDmg);
          await Promise.all([animateHitFlash(trHits[tri]), screenShake(80, 2)]);
          log("Trample hits " + classById(trHits[tri].classId).name + " (" + trDmg + ").");
          if (trHits[tri].hp <= 0) await animateDeath(trHits[tri]);
        }
        if (!trHits.length) log("Trample — no targets in line.");
        endAction();
        return;
      }

      if (ab.effect === "suppress") {
        var supHits = [];
        var supx = u.x + dx, supy = u.y + dy;
        while (inBounds(supx, supy) && Math.abs(supx - u.x) + Math.abs(supy - u.y) <= range) {
          if (isTileCollapsed(supx, supy)) break;
          if (isTileImpassableTerrain(supx, supy)) break;
          var supOcc = occupantAt(supx, supy);
          if (supOcc && supOcc.team !== u.team && supOcc.hp > 0) supHits.push(supOcc);
          supx += dx; supy += dy;
        }
        for (var supi = 0; supi < supHits.length; supi++) {
          applyDamage(supHits[supi], 3);
          await Promise.all([animateHitFlash(supHits[supi]), screenShake(80, 2)]);
          log("Suppressing Fire hits " + classById(supHits[supi].classId).name + " (3 true dmg).");
          if (supHits[supi].hp <= 0) await animateDeath(supHits[supi]);
        }
        if (!supHits.length) log("Suppressing Fire — arrows whistle through empty air.");
        endAction();
        return;
      }

      let cx = u.x + dx;
      let cy = u.y + dy;
      let hit = null;
      while (inBounds(cx, cy) && Math.abs(cx - u.x) + Math.abs(cy - u.y) <= range) {
        if (isTileCollapsed(cx, cy)) break;
        if (isTileImpassableTerrain(cx, cy)) break;
        const occ = occupantAt(cx, cy);
        if (occ) {
          if (occ.team !== u.team) hit = occ;
          break;
        }
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
      if (u.gifted && u.classId === "hoplomachus" && hit.hp > 0) {
        var pdx = Math.sign(hit.x - u.x);
        var pdy = Math.sign(hit.y - u.y);
        var pnx = hit.x + pdx;
        var pny = hit.y + pdy;
        if (inBounds(pnx, pny) && !occupantAt(pnx, pny) && !isTileImpassableTerrain(pnx, pny) && !isTileCollapsed(pnx, pny)) {
          await animateMove(hit, [[pnx, pny]]);
          log("Tremor Thrust pushes back!");
        }
      }
      if (ab.effect === "charge" && hit.hp > 0) {
        var adjX = hit.x - dx;
        var adjY = hit.y - dy;
        if (inBounds(adjX, adjY) && !occupantAt(adjX, adjY) && !isTileCollapsed(adjX, adjY) && !isTileImpassableTerrain(adjX, adjY)) {
          await animateMove(u, [[adjX, adjY]]);
          log("Charge closes the gap!");
        }
      } else if (ab.effect === "charge" && hit.hp <= 0) {
        var deadTile = [hit.x, hit.y];
        if (inBounds(deadTile[0], deadTile[1]) && !isTileCollapsed(deadTile[0], deadTile[1])) {
          await animateMove(u, [deadTile]);
        }
      }
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

    if (ab.target === "adjacent_ally") {
      return executeAbilitySelf(u, ab);
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
    } else if (cid === "secutor" && name === "Blind Rush") {
      u.blindRushAtk = 2;
      u.blindRushDef = 2;
      log("Blind Rush — +2 ATK, −2 DEF.");
    } else if (cid === "hoplomachus" && name === "Phalanx Guard") {
      var allies = [];
      for (var pi = 0; pi < DIRS.length; pi++) {
        var px = u.x + DIRS[pi][0], py = u.y + DIRS[pi][1];
        var palc = occupantAt(px, py);
        if (palc && palc.team === u.team && palc.hp > 0) {
          palc.phalanxBonus = 2;
          allies.push(classById(palc.classId).name);
        }
      }
      log("Phalanx Guard — " + (allies.length ? allies.join(", ") + " gain +2 DEF." : "no allies in range."));
    } else if ((cid === "dimachaerus" && name === "Shadow Step") || name === "Phase Walk") {
      state.battleMode = "shadow_step";
      state.highlightCells.clear();
      var stepRange = name === "Phase Walk" ? 3 : 2;
      for (var sy = 0; sy < BOARD_H; sy++) {
        for (var sx = 0; sx < BOARD_W; sx++) {
          if (manhattan(u, {x: sx, y: sy}) <= stepRange && manhattan(u, {x: sx, y: sy}) > 0
              && !occupantAt(sx, sy) && inBounds(sx, sy) && !isTileCollapsed(sx, sy)
              && !isTileImpassableTerrain(sx, sy)) {
            state.highlightCells.add(cellKey(sx, sy));
          }
        }
      }
      renderBoard();
      log(name + " — select a tile to teleport to.");
      return;
    } else if (cid === "provocator" && name === "Arena Salute") {
      u.rootedSkip = 0;
      u.crowdSpdDebuff = 0;
      u.markDebuffTurns = 0;
      u.markFocusId = null;
      u.dreadMarkDmg = 0;
      u.bleedTurns = 0;
      u.atkDebuffTurns = 0;
      u.atkDebuffAmt = 0;
      log("Arena Salute — all debuffs cleansed!");
    } else if (cid === "samnite" && name === "War Cry") {
      var cried = 0;
      for (var wi = 0; wi < DIRS.length; wi++) {
        var wx = u.x + DIRS[wi][0], wy = u.y + DIRS[wi][1];
        var wt = occupantAt(wx, wy);
        if (wt && wt.team !== u.team && wt.hp > 0) {
          wt.atkDebuffTurns = 2;
          wt.atkDebuffAmt = 2;
          cried++;
        }
      }
      log("War Cry — " + (cried ? cried + " foes shaken (−2 ATK)!" : "no foes in range."));
    } else if (name === "High Ground") {
      u.highGroundNext = true;
      log("High Ground — next attack has +15% hit chance.");
    } else if (name === "Rally Charge") {
      u.tempExtraMove = true;
      u.rallyCharge = true;
      log("Rally Charge — Move +2 this turn.");
    } else if (cid === "provocator" && name === "Rally") {
      const heal = Math.round(u.maxHp * 0.2);
      u.hp = Math.min(u.maxHp, u.hp + heal);
      spawnDmgNumber(u, "+" + heal, "#70d870");
      log("Rally — restored " + heal + " HP.");

    } else if (name === "Iron Will") {
      var iwHeal = Math.round(u.maxHp * 0.15);
      u.hp = Math.min(u.maxHp, u.hp + iwHeal);
      u.rootedSkip = 0;
      spawnDmgNumber(u, "+" + iwHeal, "#70d870");
      log("Iron Will — healed " + iwHeal + " HP, root cleansed.");

    } else if (name === "Fortress Stance") {
      u.testudoBonus = 4;
      u.fortressRooted = 2;
      u.rootedSkip = 1;
      log("Fortress Stance — +4 DEF, rooted in place.");

    } else if (name === "Guardian Aura") {
      var gaHealed = 0;
      for (var gai = 0; gai < DIRS.length; gai++) {
        var gax = u.x + DIRS[gai][0], gay = u.y + DIRS[gai][1];
        var gaAlly = occupantAt(gax, gay);
        if (gaAlly && gaAlly.team === u.team && gaAlly.hp > 0 && gaAlly.id !== u.id) {
          gaAlly.hp = Math.min(gaAlly.maxHp, gaAlly.hp + 5);
          spawnDmgNumber(gaAlly, "+5", "#70d870");
          gaHealed++;
        }
      }
      log("Guardian Aura — " + (gaHealed ? gaHealed + " allies healed 5 HP." : "no allies in range."));

    } else if (name === "Neptune's Favor") {
      var nfHeal = Math.round(u.maxHp * 0.2);
      u.hp = Math.min(u.maxHp, u.hp + nfHeal);
      u.tempExtraMove = true;
      spawnDmgNumber(u, "+" + nfHeal, "#70d870");
      log("Neptune's Favor — healed " + nfHeal + " HP, Move +1.");

    } else if (name === "Battle Focus") {
      u.battleFocusNext = true;
      log("Battle Focus — next attack +25% hit chance.");

    } else if (name === "Parry") {
      u.parryCharges = 1;
      log("Parry — next hit halved, counter 3 damage.");

    } else if (name === "Spear Brace") {
      u.spearBraceActive = true;
      log("Spear Brace — next attacker takes 4 counter damage.");

    } else if (name === "Piercing Thrust") {
      log("Piercing Thrust activated.");

    } else if (name === "Phalanx Advance") {
      var paCount = 0;
      for (var pai = 0; pai < DIRS.length; pai++) {
        var pax = u.x + DIRS[pai][0], pay = u.y + DIRS[pai][1];
        var paAlly = occupantAt(pax, pay);
        if (paAlly && paAlly.team === u.team && paAlly.hp > 0 && paAlly.id !== u.id) {
          paAlly.atkBonus += 2;
          paAlly.atkBonusTurns = 2;
          paAlly.tempExtraMove = true;
          paCount++;
        }
      }
      log("Phalanx Advance — " + (paCount ? paCount + " allies gain +2 ATK, +1 Move." : "no allies in range."));

    } else if (name === "Evasion") {
      u.testudoBonus = 3;
      log("Evasion — +3 DEF until next turn.");

    } else if (name === "Inspiring Presence") {
      var ipCount = 0;
      for (var ipi = 0; ipi < DIRS.length; ipi++) {
        var ipx = u.x + DIRS[ipi][0], ipy = u.y + DIRS[ipi][1];
        var ipAlly = occupantAt(ipx, ipy);
        if (ipAlly && ipAlly.team === u.team && ipAlly.hp > 0 && ipAlly.id !== u.id) {
          ipAlly.atkBonus += 2;
          ipAlly.atkBonusTurns = 2;
          ipCount++;
        }
      }
      log("Inspiring Presence — " + (ipCount ? ipCount + " allies gain +2 ATK." : "no allies in range."));

    } else if (name === "Guardian's Oath") {
      u.interceptActive = true;
      log("Guardian's Oath — ready to intercept the next attack on an adjacent ally.");

    } else if (name === "Champion's Resolve") {
      if (u.resolveUsed) {
        log("Champion's Resolve already used this battle.");
        return;
      } else {
        u.hp = u.maxHp;
        u.resolveUsed = true;
        spawnDmgNumber(u, "FULL", "#ffdd44");
        log("Champion's Resolve — fully healed!");
      }

    } else if (name === "Battle Hardened") {
      u.battleHardenedTurns = 2;
      u.battleHardenedAtk = 1;
      u.battleHardenedDef = 2;
      log("Battle Hardened — +2 DEF, +1 ATK for 2 turns.");

    } else if (name === "Intimidating Roar") {
      var irCount = 0;
      for (var iri = 0; iri < DIRS.length; iri++) {
        var irx = u.x + DIRS[iri][0], iry = u.y + DIRS[iri][1];
        var irFoe = occupantAt(irx, iry);
        if (irFoe && irFoe.team !== u.team && irFoe.hp > 0) {
          irFoe.rootedSkip = Math.max(irFoe.rootedSkip, 1);
          irCount++;
        }
      }
      log("Intimidating Roar — " + (irCount ? irCount + " foes rooted!" : "no foes in range."));

    } else if (name === "Eagle Eye") {
      u.eagleEyeHits = 2;
      log("Eagle Eye — next 2 attacks cannot miss.");

    } else if (name === "Shadow Mend") {
      var smHeal = Math.round(u.maxHp * 0.25);
      u.hp = Math.min(u.maxHp, u.hp + smHeal);
      u.shadowMendAtkPenalty = 2;
      spawnDmgNumber(u, "+" + smHeal, "#70d870");
      log("Shadow Mend — healed " + smHeal + " HP, −2 ATK this turn.");

    } else if (name === "Abyssal Gate") {
      state.battleMode = "abyssal_gate";
      state.highlightCells.clear();
      for (var agi = 0; agi < DIRS.length; agi++) {
        var agx = u.x + DIRS[agi][0], agy = u.y + DIRS[agi][1];
        var agAlly = occupantAt(agx, agy);
        if (agAlly && agAlly.team === u.team && agAlly.hp > 0 && agAlly.id !== u.id) {
          state.highlightCells.add(cellKey(agx, agy));
        }
      }
      renderBoard();
      log("Abyssal Gate — select an adjacent ally to teleport.");
      return;

    } else if (name === "Unholy Resilience") {
      u.battleHardenedTurns = 2;
      u.battleHardenedDef = 3;
      u.battleHardenedAtk = 0;
      log("Unholy Resilience — +3 DEF for 2 turns.");

    } else {
      log(ab.name + " activated.");
    }
    endAction();
  }

  async function executeAbilityOnTarget(u, tgt, ab) {
    const cid = u.classId;
    const name = ab.name;

    if (cid === "retiarius" && name === "Iaculum") {
      if (tgt.gifted && tgt.classId === "thraex") {
        log("The net slides off — Stone Eyes!");
        endAction();
        return;
      }
      tgt.rootedSkip = u.gifted ? 2 : 1;
      log("Iaculum — netted!" + (u.gifted ? " Binding Net holds tight!" : ""));
      endAction();
      return;
    }

    if (cid === "provocator" && name === "Provocatio") {
      if (tgt.gifted) {
        log("Provocatio has no hold on a Gifted warrior!");
        endAction();
        return;
      }
      tgt.markDebuffTurns = 2;
      tgt.markFocusId = u.id;
      if (u.gifted) {
        tgt.dreadMarkDmg = 3;
        log("Provocatio — Dread Mark brands the foe!");
      } else {
        log("Provocatio — the crowd roars your name.");
      }
      endAction();
      return;
    }

    if (ab.effect === "stun") {
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
      const dmg = physicalDamage(u, tgt, ab.mult || 1, ab.ignoreDefPct || 0);
      if (tgt.riposteActive) { applyDamage(u, 5); tgt.riposteActive = false; log("Riposte!"); }
      applyDamage(tgt, dmg);
      await Promise.all([animateHitFlash(tgt), screenShake(80, 2)]);
      if (tgt.hp > 0) {
        tgt.rootedSkip = Math.max(tgt.rootedSkip, 1);
        log(ab.name + " deals " + dmg + " and stuns! (" + hitPct + "% hit)");
      } else {
        log(ab.name + " deals " + dmg + ". (" + hitPct + "% hit)");
        await animateDeath(tgt);
      }
      endAction();
      return;
    }

    if (ab.effect === "pull") {
      var plx = u.x - tgt.x;
      var ply = u.y - tgt.y;
      var pullX = tgt.x + Math.sign(plx);
      var pullY = tgt.y + Math.sign(ply);
      if (inBounds(pullX, pullY) && !occupantAt(pullX, pullY) && !isTileCollapsed(pullX, pullY) && !isTileImpassableTerrain(pullX, pullY)) {
        await animateMove(tgt, [[pullX, pullY]]);
        log(ab.name + " — pulled closer!");
      } else {
        log(ab.name + " — no room to pull.");
      }
      endAction();
      return;
    }

    if (ab.effect === "bleed") {
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
      const dmg = physicalDamage(u, tgt, ab.mult || 1, ab.ignoreDefPct || 0);
      if (tgt.riposteActive) { applyDamage(u, 5); tgt.riposteActive = false; log("Riposte!"); }
      applyDamage(tgt, dmg);
      await Promise.all([animateHitFlash(tgt), screenShake(80, 2)]);
      if (tgt.hp > 0) {
        tgt.bleedTurns = 3;
        log(ab.name + " deals " + dmg + " + bleed! (" + hitPct + "% hit)");
      } else {
        log(ab.name + " deals " + dmg + ". (" + hitPct + "% hit)");
        await animateDeath(tgt);
      }
      if (ab.selfDamage) applyDamage(u, ab.selfDamage);
      endAction();
      return;
    }

    if (ab.effect === "lifesteal") {
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
      const dmg = physicalDamage(u, tgt, ab.mult || 1, ab.ignoreDefPct || 0);
      if (tgt.riposteActive) { applyDamage(u, 5); tgt.riposteActive = false; log("Riposte!"); }
      applyDamage(tgt, dmg);
      var stealAmt = ab.steal || 0.25;
      var stolen = typeof stealAmt === "number" && stealAmt < 1 ? Math.round(dmg * stealAmt) : stealAmt;
      u.hp = Math.min(u.maxHp, u.hp + stolen);
      spawnDmgNumber(u, "+" + stolen, "#70d870");
      await Promise.all([animateHitFlash(tgt), screenShake(80, 2)]);
      log(ab.name + " deals " + dmg + ", steals " + stolen + " HP. (" + hitPct + "% hit)");
      if (tgt.hp <= 0) await animateDeath(tgt);
      endAction();
      return;
    }

    if (ab.effect === "atkdebuff") {
      SFX.ability();
      tgt.atkDebuffTurns = ab.debuffTurns || 2;
      tgt.atkDebuffAmt = ab.debuffAmt || 3;
      log(ab.name + " — " + classById(tgt.classId).name + " weakened (−" + tgt.atkDebuffAmt + " ATK)!");
      endAction();
      return;
    }

    if (ab.effect === "push") {
      if (ab.mult && ab.mult > 0) {
        var pdx = tgt.x - u.x;
        var pdy = tgt.y - u.y;
        var pnx = tgt.x + pdx;
        var pny = tgt.y + pdy;
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
        if (tgt.riposteActive) { applyDamage(u, 5); tgt.riposteActive = false; log("Riposte!"); }
        applyDamage(tgt, dmg);
        await Promise.all([animateHitFlash(tgt), screenShake(80, 2)]);
        log(ab.name + " deals " + dmg + ". (" + hitPct + "% hit)");
        if (tgt.hp <= 0) { await animateDeath(tgt); endAction(); return; }
        if (inBounds(pnx, pny) && !occupantAt(pnx, pny) && !isTileImpassableTerrain(pnx, pny) && !isTileCollapsed(pnx, pny)) {
          await animateMove(tgt, [[pnx, pny]]);
        }
      } else if (u.gifted && u.classId === "samnite") {
        var pushed = 0;
        for (var di = 0; di < DIRS.length; di++) {
          var ax = u.x + DIRS[di][0], ay = u.y + DIRS[di][1];
          var adj = occupantAt(ax, ay);
          if (!adj || adj.team === u.team) continue;
          var bx = ax + DIRS[di][0], by = ay + DIRS[di][1];
          if (inBounds(bx, by) && !occupantAt(bx, by) && !isTileImpassableTerrain(bx, by) && !isTileCollapsed(bx, by)) {
            await animateMove(adj, [[bx, by]]);
            pushed++;
          }
        }
        log("Tremor Press — " + (pushed ? pushed + " foes shoved!" : "no room to shove."));
      } else {
        var sdx = tgt.x - u.x;
        var sdy = tgt.y - u.y;
        var snx = tgt.x + sdx;
        var sny = tgt.y + sdy;
        if (inBounds(snx, sny) && !occupantAt(snx, sny) && !isTileImpassableTerrain(snx, sny) && !isTileCollapsed(snx, sny)) {
          await animateMove(tgt, [[snx, sny]]);
          log(ab.name + " — Pushed back!");
        } else {
          log("No room to shove.");
        }
      }
      if (ab.selfDamage) applyDamage(u, ab.selfDamage);
      endAction();
      return;
    }

    if (ab.effect === "entangle") {
      tgt.rootedSkip = Math.max(tgt.rootedSkip, 1);
      tgt.atkDebuffTurns = 2;
      tgt.atkDebuffAmt = 2;
      log("Entangle — " + classById(tgt.classId).name + " rooted and weakened!");
      endAction();
      return;
    }

    if (ab.effect === "drag") {
      await animateAttack(u, tgt);
      var dragHitPct = computeHitChance(u, tgt);
      if (!rollHit(u, tgt)) {
        SFX.miss();
        spawnDmgNumber(tgt, "MISS", "#aaaaaa");
        log(ab.name + " misses! (" + dragHitPct + "% hit)");
        endAction();
        return;
      }
      SFX.hit();
      var dragDmg = physicalDamage(u, tgt, ab.mult || 1, 0);
      if (tgt.riposteActive) { applyDamage(u, 5); tgt.riposteActive = false; log("Riposte!"); }
      applyDamage(tgt, dragDmg);
      await Promise.all([animateHitFlash(tgt), screenShake(80, 2)]);
      log(ab.name + " deals " + dragDmg + ". (" + dragHitPct + "% hit)");
      if (tgt.hp > 0) {
        var drPx = tgt.x + Math.sign(u.x - tgt.x);
        var drPy = tgt.y + Math.sign(u.y - tgt.y);
        if (inBounds(drPx, drPy) && !occupantAt(drPx, drPy) && !isTileCollapsed(drPx, drPy) && !isTileImpassableTerrain(drPx, drPy)) {
          await animateMove(tgt, [[drPx, drPy]]);
          log("Dragged under!");
        }
      } else {
        await animateDeath(tgt);
      }
      endAction();
      return;
    }

    if (ab.effect === "huntermark") {
      tgt.markDebuffTurns = 2;
      tgt.markFocusId = null;
      tgt.dreadMarkDmg = 3;
      log("Hunter's Mark — " + classById(tgt.classId).name + " takes +3 dmg from all sources!");
      endAction();
      return;
    }

    if (ab.effect === "push2") {
      await animateAttack(u, tgt);
      var p2HitPct = computeHitChance(u, tgt);
      if (!rollHit(u, tgt)) {
        SFX.miss();
        spawnDmgNumber(tgt, "MISS", "#aaaaaa");
        log(ab.name + " misses! (" + p2HitPct + "% hit)");
        endAction();
        return;
      }
      SFX.hit();
      var p2Dmg = physicalDamage(u, tgt, ab.mult || 1, 0);
      if (tgt.riposteActive) { applyDamage(u, 5); tgt.riposteActive = false; log("Riposte!"); }
      applyDamage(tgt, p2Dmg);
      await Promise.all([animateHitFlash(tgt), screenShake(80, 2)]);
      log(ab.name + " deals " + p2Dmg + ". (" + p2HitPct + "% hit)");
      if (tgt.hp > 0) {
        var p2dx = Math.sign(tgt.x - u.x);
        var p2dy = Math.sign(tgt.y - u.y);
        for (var p2i = 0; p2i < 2; p2i++) {
          var p2nx = tgt.x + p2dx;
          var p2ny = tgt.y + p2dy;
          if (inBounds(p2nx, p2ny) && !occupantAt(p2nx, p2ny) && !isTileCollapsed(p2nx, p2ny) && !isTileImpassableTerrain(p2nx, p2ny)) {
            await animateMove(tgt, [[p2nx, p2ny]]);
          } else break;
        }
        log("Pushed 2 tiles!");
      } else {
        await animateDeath(tgt);
      }
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
    if (result === "victory") {
      tutorialTip(60, "Victoria! You've completed the practice bout. Surviving fighters carry over to the next mission.");
    }
    await delay(300);
    showResultOverlay(result);
    return true;
  }

  function showResultOverlay(result) {
    const won = result === "victory";
    if (won) { SFX.victory(); } else { SFX.defeat(); }
    resultOverlay.classList.remove("is-hidden", "result-overlay--victory", "result-overlay--defeat");
    resultOverlay.classList.add(won ? "result-overlay--victory" : "result-overlay--defeat");

    var mission = campaignState.active ? Campaign.getMission() : null;
    var titleText;
    if (state.trainingBout) {
      titleText = won ? "TRAINING — VICTORY" : "TRAINING — DEFEAT";
    } else {
      titleText = won ? "VICTORIA!" : "DEFEAT";
    }
    resultTitle.textContent = titleText;
    announce(titleText);

    var pAlive = state.units.filter(function (u) { return u.team === "player" && u.hp > 0; }).length;
    var pTotal = state.units.filter(function (u) { return u.team === "player"; }).length;
    var html = "<p><strong>" + pAlive + "</strong> of <strong>" + pTotal + "</strong> gladiators standing</p>";
    html += "<p><strong>" + state.turnCount + "</strong> turns fought</p>";
    html += "<p><strong>" + state.totalDamageDealt + "</strong> damage dealt to enemies</p>";

    if (campaignState.active && won && mission && !state.trainingBout) {
      var bonus = mission.victoryBonus;
      if (pAlive === pTotal) bonus += mission.perfectBonus;
      html += '<p style="color:var(--fft-gold);margin-top:0.5rem;">+' + bonus + ' denarii earned</p>';
      var xpRows = state.units.filter(function(u) { return u.team === "player"; });
      if (xpRows.length) {
        html += '<div style="margin-top:0.5rem;font-size:0.85rem;color:var(--fft-text-dim);">';
        for (var xi = 0; xi < xpRows.length; xi++) {
          var xu = xpRows[xi];
          var xName = xu.displayName || classById(xu.classId).name;
          html += '<div>' + xName + ' — Lv.' + (xu.level || 1) + ', ' + (xu.xp || 0) + ' XP, ' + (xu.kills || 0) + ' kills</div>';
        }
        html += '</div>';
      }
    } else if (won) {
      html += '<p style="color:var(--fft-gold);margin-top:0.5rem;">The crowd chants your name!</p>';
    } else {
      html += '<p style="color:var(--fft-red);margin-top:0.5rem;">The sand claims another lanista\'s pride.</p>';
    }
    resultBody.innerHTML = html;

    var btnRetry = $("#btnResultRetry");
    if (btnRetry) {
      btnRetry.classList.toggle("is-hidden", !campaignState.active || won);
    }
    setTimeout(function() { ($("#btnResultContinue") || resultOverlay).focus(); }, 100);
  }

  function closeResultAndReset() {
    resultOverlay.classList.add("is-hidden");

    if (campaignState.active) {
      closeResultCampaign();
      return;
    }

    resetMapMods();
    state.phase = "ludus";
    state.units = [];
    showPhasePanels();
    refreshRosterUI();
    renderBoard();
    logFeed.innerHTML = "";
  }

  function pickVignette() {
    if (!campaignState.active || typeof VIGNETTE_POOL === "undefined") return [];
    var alive = state.units.filter(function (u) { return u.team === "player" && u.hp > 0; });
    var classSet = {};
    for (var ai = 0; ai < alive.length; ai++) classSet[alive[ai].classId] = alive[ai];
    if (!campaignState.flags._shownVignettes) campaignState.flags._shownVignettes = {};
    var shown = campaignState.flags._shownVignettes;
    for (var vi = 0; vi < VIGNETTE_POOL.length; vi++) {
      var v = VIGNETTE_POOL[vi];
      if (shown[v.id]) continue;
      if (v.condition === "both_survived") {
        if (!classSet[v.classA] || (v.classB && !classSet[v.classB])) continue;
      } else if (v.condition === "scaeva_allied" && !Campaign.getFlag("scaeva_allied")) continue;
      else if (v.condition === "livia_allied" && !Campaign.getFlag("livia_allied")) continue;
      shown[v.id] = true;
      var unitA = classSet[v.classA];
      var unitB = v.classB ? classSet[v.classB] : null;
      var nameA = unitA ? (unitA.displayName || classById(unitA.classId).name) : classById(v.classA).name;
      var nameB = unitB ? (unitB.displayName || classById(unitB.classId).name) : null;
      return v.lines.map(function (l) {
        return { speaker: l.speaker === "A" ? nameA : (l.speaker === "B" ? nameB : l.speaker), text: l.text };
      });
    }
    return [];
  }

  function closeResultCampaign() {
    if (state.trainingBout) {
      Campaign.saveSurvivors(state.units, false, true);
      var tbWon = checkVictory() === "victory";
      if (tbWon) {
        campaignState.denarii += 5;
      }
      state.trainingBout = false;
      resetMapMods();
      loadMissionIntoLudus();
      return; // saveToDisk called inside loadMissionIntoLudus
    }

    var result = state.endingATriggered ? "victory" : checkVictory();
    var won = result === "victory";
    var mission = Campaign.getMission();

    if (!mission) {
      if (campaignState.endingKey || Campaign.isFinished()) {
        campaignState.active = false;
        showTitleScreen();
      } else {
        runEndingScene();
      }
      return;
    }

    if (won) {
      var _deployedUids = {};
      state.units.forEach(function (u) { if (u.team === "player") _deployedUids[u.uid] = true; });
      Campaign.saveSurvivors(state.units, mission.carryHp, false, _deployedUids);

      if (mission.id === 13) {
        Campaign.advance(true);
        runEndingScene();
        return;
      }

      Campaign.advance(true);

      if (Campaign.isFinished()) {
        runEndingScene();
        return;
      }

      var vignette = pickVignette();
      var postScene = filterScene(mission.postScene);
      var allSteps = vignette.concat(postScene);
      if (allSteps.length > 0) {
        runScene(allSteps, function () {
          loadNextMission();
        });
      } else {
        loadNextMission();
      }
    } else {
      retryCampaignMission();
    }
  }

  function retryCampaignMission() {
    resetMapMods();
    state.phase = "ludus";
    state.units = [];
    loadMissionIntoLudus();
  }

  function loadNextMission() {
    var nextMission = Campaign.getMission();
    if (!nextMission) {
      runEndingScene();
      return;
    }

    state.units = [];
    state.phase = "ludus";

    var preScene = filterScene(nextMission.preScene);
    var choices = nextMission.choices || [];

    if (choices.length > 0) {
      var combined = preScene.slice();
      for (var i = 0; i < choices.length; i++) {
        if (Campaign.checkCondition(choices[i].condition)) {
          combined.push({ choice: choices[i] });
        }
      }
      runScene(combined, function () {
        loadMissionIntoLudus();
      });
    } else if (preScene.length > 0) {
      runScene(preScene, function () {
        loadMissionIntoLudus();
      });
    } else {
      loadMissionIntoLudus();
    }
  }

  function loadMissionIntoLudus() {
    var mission = Campaign.getMission();
    if (!mission) return;

    // Defensive: ensure cutscene overlays are cleaned up
    if (state.cutscene.active) teardownCutscene();
    var _advEl = $("#cutsceneAdvance");
    if (_advEl) _advEl.classList.add("is-hidden");
    var _choEl = $("#cutsceneChoices");
    if (_choEl) _choEl.classList.add("is-hidden");

    resetMapMods();
    state.phase = "ludus";
    state.units = [];
    budgetCurrent = Campaign.getBudget();

    state.picks = [];

    var survivors = campaignState.survivingRoster;
    for (var i = 0; i < survivors.length; i++) {
      var s = survivors[i];
      var pick = {
        uid: s.uid,
        classId: s.classId,
        displayName: s.name,
        isFree: s.isFree || false,
        level: s.level || 1,
        xp: s.xp || 0,
        kills: s.kills || 0,
        bonusHp:  s.bonusHp  || 0,
        bonusAtk: s.bonusAtk || 0,
        bonusDef: s.bonusDef || 0,
        bonusSpd: s.bonusSpd || 0,
      };
      if (s.gifted) pick.gifted = true;
      if (s.hp != null) { pick.hp = s.hp; pick.maxHp = s.maxHp; }
      state.picks.push(pick);
    }

    var recruits = Campaign.getFreeRecruits();
    for (var j = 0; j < recruits.length; j++) {
      var r = recruits[j];
      var alreadyHave = state.picks.some(function (p) { return p.displayName === r.name; });
      if (!alreadyHave) {
        var recruitPick = {
          uid: "free_" + r.classId + "_" + j,
          classId: r.classId,
          displayName: r.name,
          isFree: true,
        };
        if (r.gifted) recruitPick.gifted = true;
        state.picks.push(recruitPick);
      }
    }

    if (state.picks.length > MAX_ROSTER) {
      log("Roster trimmed to " + MAX_ROSTER + " fighters.", "system");
      state.picks = state.picks.slice(0, MAX_ROSTER);
    }

    updateCampaignHud();
    showPhasePanels();

    Campaign.saveToDisk();

    if (mission.skipLudus) {
      autoDeployAndStart();
    } else {
      refreshRosterUI();
      renderBoard();
      logFeed.innerHTML = "";
      state.tutorialStep = 0;
      tutorialTip(0, "Welcome, Lanista! This is the Ludus — your roster screen. Tiro, a free Murmillo, is already hired.");
      tutorialTip(1, "Spend denarii to hire more fighters from the class list on the left. Each class has different stats and abilities.");
      tutorialTip(2, "When ready, click \"To the gates\" to deploy your fighters onto the arena.");
    }
  }

  function autoDeployAndStart() {
    if (!state.picks.length) return;
    var mission = campaignState.active ? Campaign.getMission() : null;
    var nextBout = state.boutNumber + 1;
    var hSeed = mission ? mission.id * 97 + 42 : (nextBout * 71 + 42);
    state._mapSeed = hSeed;
    state.height = buildHeightField(hSeed);
    state.terrain = buildTerrainMap(hSeed, mission ? mission.terrain : null);
    state.phase = "deploy";
    state.deployTemplate = state.picks.map(function (p) { return Object.assign({}, p); });
    state.units = [];
    placeEnemies();

    var gateTiles = [];
    for (var gy = BOARD_H - 2; gy < BOARD_H; gy++) {
      for (var gx = 0; gx < BOARD_W; gx++) {
        if (!occupantAt(gx, gy) && !isTileImpassableTerrain(gx, gy)) gateTiles.push([gx, gy]);
      }
    }

    var placed = 0;
    for (var i = 0; i < state.deployTemplate.length && i < gateTiles.length; i++) {
      var pick = state.deployTemplate[i];
      var t = gateTiles[i];
      var pu = createUnit("player", pick.classId, t[0], t[1]);
      if (pick.displayName) pu.displayName = pick.displayName;
      if (pick.isFree) pu.isFree = true;
      if (pick.uid) pu.uid = pick.uid;
      if (pick.gifted) { pu.gifted = true; applyGiftedBoosts(pu); }
      applyPickLevel(pu, pick);
      if (pick.hp != null) { pu.hp = pick.hp; pu.maxHp = pick.maxHp; }
      state.units.push(pu);
      pick.placed = true;
      placed++;
    }
    if (placed < state.deployTemplate.length) {
      log("Warning: only " + placed + " of " + state.deployTemplate.length + " fighters could be placed.", "system");
      for (var r = placed; r < state.deployTemplate.length; r++) {
        state.deployTemplate[r].placed = true;
      }
    }

    startBattle();
  }

  function filterScene(sceneSteps) {
    if (!sceneSteps) return [];
    var result = [];
    for (var i = 0; i < sceneSteps.length; i++) {
      var step = sceneSteps[i];
      if (step.condition && !Campaign.checkCondition(step.condition)) continue;
      result.push(step);
    }
    return result;
  }

  function determineEnding() {
    if (Campaign.getFlag("endingA_triggered")) return "a";
    if (Campaign.getFlag("livia_allied") && Campaign.getFlag("temple_visited")) return "b";
    return "c";
  }

  function runEndingScene(onComplete) {
    var key = determineEnding();
    campaignState.endingKey = key;
    var scenes = Campaign.getEndingScenes(key);
    if (scenes.length > 0) {
      runScene(scenes.slice(), function () {
        showCampaignComplete();
        if (onComplete) onComplete();
      });
    } else {
      showCampaignComplete();
      if (onComplete) onComplete();
    }
  }

  function showCampaignComplete() {
    Campaign.clearSave();
    resultOverlay.classList.remove("is-hidden", "result-overlay--victory", "result-overlay--defeat");
    resultOverlay.classList.add("result-overlay--victory");

    var endingLabels = { a: "Ending A — Geminus", b: "Ending B — The Sacrifice", c: "Ending C — The Vessel" };
    var endingDescs = {
      a: "Both brothers survive. The ritual is broken. The twins walk out of the arena together.",
      b: "Titus is restored, but Cassius gives himself to seal the temple. The cost of love.",
      c: "Cassius absorbs Dis Pater's power. Titus is free — but Cassius is changed forever.",
    };
    var key = campaignState.endingKey || "c";

    resultTitle.textContent = endingLabels[key] || "CAMPAIGN COMPLETE";
    resultBody.innerHTML = '<p style="color:var(--fft-gold);">' + (endingDescs[key] || "The Ludi Aeternales are over.") + '</p>' +
      '<p style="color:var(--fft-text-dim);margin-top:0.5rem;">The sand remembers.</p>';
    var btnRetry = $("#btnResultRetry");
    if (btnRetry) btnRetry.classList.add("is-hidden");
  }

  function updateCampaignHud() {
    var hud = $("#campaignHud");
    if (!hud) return;
    if (!campaignState.active) {
      hud.classList.add("is-hidden");
      return;
    }
    hud.classList.remove("is-hidden");
    var m = Campaign.getMission();
    if (m) {
      hud.innerHTML = '<span class="campaign-hud__mission">' + Campaign.getMissionLabel() + '</span>' +
        ' &mdash; ' + Campaign.getActLabel();
    }
  }

  // ─── Scene Runner ─────────────────────────────────────────────────

  var sceneQueue = [];
  var sceneCallback = null;

  var _cutsceneUidCounter = 9000;

  function stageCutscene(steps) {
    SFX.startAmbient("cutscene");
    var cs = state.cutscene;
    cs.savedPanX = renderer.panX;
    cs.savedPanY = renderer.panY;
    cs.savedZoom = renderer.zoom;
    cs.actors = [];
    cs.actorMap = {};

    var speakers = [];
    var seen = {};
    for (var i = 0; i < steps.length; i++) {
      var sp = steps[i].speaker;
      if (sp && !seen[sp]) {
        seen[sp] = true;
        speakers.push(sp);
      }
    }

    var midY = Math.floor(BOARD_H / 2);
    var count = speakers.length;
    var spacing = Math.max(2, Math.floor((BOARD_W - 2) / Math.max(count, 1)));
    var startX = Math.max(1, Math.floor((BOARD_W - spacing * (count - 1)) / 2));

    for (var si = 0; si < speakers.length; si++) {
      var name = speakers[si];
      var info = SPEAKER_SPRITES[name];
      if (!info) continue;
      var gx = Math.min(BOARD_W - 2, startX + si * spacing);
      var gy = midY;
      var actor = {
        classId: info.classId,
        team: info.team,
        x: gx,
        y: gy,
        hp: 1,
        maxHp: 1,
        id: "cine_" + (++_cutsceneUidCounter),
        uid: "cine_" + _cutsceneUidCounter,
        isCinematic: true,
        exhausted: false,
        ct: 0,
        spawnEdgeX: (si % 2 === 0) ? -2 : BOARD_W + 1,
        spawnEdgeY: gy,
        entered: false,
      };
      cs.actors.push(actor);
      cs.actorMap[name] = actor;
      state.units.push(actor);
    }

    cs.active = true;
    cs.letterbox = 0;
    cs.bubbleText = "";
    cs.bubbleRevealed = 0;
    cs.currentSpeaker = null;
    cs.bubbleUnit = null;
    cs.targetZoom = 1.3;
  }

  function teardownCutscene() {
    var cs = state.cutscene;
    for (var i = state.units.length - 1; i >= 0; i--) {
      if (state.units[i].isCinematic) state.units.splice(i, 1);
    }
    cs.actors = [];
    cs.actorMap = {};
    cs.active = false;
    cs.currentSpeaker = null;
    cs.bubbleText = "";
    cs.bubbleRevealed = 0;
    cs.bubbleUnit = null;
    cs.targetPanX = 0;
    cs.targetPanY = 0;
    cs.targetZoom = 1.3;
    cs.letterbox = 0;
    cs.awaitingEntry = false;
    renderer.panX = cs.savedPanX;
    renderer.panY = cs.savedPanY;
    renderer.zoom = cs.savedZoom;
    if (cs.rafId) {
      cancelAnimationFrame(cs.rafId);
      cs.rafId = null;
    }
  }

  function _walkInActor(actor) {
    if (actor.entered) return Promise.resolve();
    actor.entered = true;
    var targetX = actor.x;
    var targetY = actor.y;
    actor.x = actor.spawnEdgeX;
    actor.y = actor.spawnEdgeY;

    var path = [];
    var dx = targetX > actor.x ? 1 : -1;
    var cx = actor.x;
    while (cx !== targetX) {
      cx += dx;
      path.push([cx, actor.y]);
    }
    if (actor.y !== targetY) {
      var dy = targetY > actor.y ? 1 : -1;
      var cy = actor.y;
      while (cy !== targetY) {
        cy += dy;
        path.push([targetX, cy]);
      }
    }
    if (path.length === 0) {
      actor.x = targetX;
      actor.y = targetY;
      return Promise.resolve();
    }

    return animateMove(actor, path);
  }

  function _fadeOutCutsceneActors(onDone) {
    var cs = state.cutscene;
    var actors = cs.actors;
    if (actors.length === 0) { onDone(); return; }

    var startTime = null;
    var dur = 600;
    function tick(ts) {
      var t;
      try {
        if (!startTime) startTime = ts;
        t = Math.min(1, (ts - startTime) / dur);
        for (var i = 0; i < actors.length; i++) {
          actors[i]._deathAnim = 1 - t;
        }
        cs.letterbox = 1 - t;
        renderBoard();
      } catch (e) {
        console.error("Cutscene fade error:", e);
        t = 1;
      }
      if (t >= 1) {
        onDone();
      } else {
        requestAnimationFrame(tick);
      }
    }
    if (cs.rafId) { cancelAnimationFrame(cs.rafId); cs.rafId = null; }
    requestAnimationFrame(tick);
  }

  function tickCutscene() {
    var cs = state.cutscene;
    if (!cs.active) return;

    if (cs.letterbox < 1) {
      cs.letterbox = Math.min(1, cs.letterbox + 0.04);
    }

    if (cs.bubbleText && cs.bubbleRevealed < cs.bubbleText.length) {
      cs.bubbleRevealed = Math.min(cs.bubbleText.length, cs.bubbleRevealed + 2);
    }

    if (cs.bubbleUnit) {
      var dpr = window.devicePixelRatio || 1;
      var cw = renderer.canvas.width / dpr;
      var ch = renderer.canvas.height / dpr;
      var bup = renderer.tileToScreen(cs.bubbleUnit.x, cs.bubbleUnit.y,
        state.height[cs.bubbleUnit.y] ? state.height[cs.bubbleUnit.y][cs.bubbleUnit.x] || 0 : 0);
      cs.targetPanX = bup.x - cw / 2;
      cs.targetPanY = bup.y - ch / 2 - 20;
    } else {
      cs.targetPanX = 0;
      cs.targetPanY = 0;
    }

    renderer.panX += (cs.targetPanX - renderer.panX) * 0.12;
    renderer.panY += (cs.targetPanY - renderer.panY) * 0.12;
    renderer.zoom += (cs.targetZoom - renderer.zoom) * 0.10;

    renderBoard();

    cs.rafId = requestAnimationFrame(tickCutscene);
  }

  function runScene(steps, onComplete) {
    if (state.cutscene.active) teardownCutscene();
    sceneQueue = steps.slice();
    sceneCallback = onComplete || null;

    if (renderer && steps.length > 0) {
      stageCutscene(steps);
      showNextSceneStep();
      return;
    }
    showNextSceneStep();
  }

  function showNextSceneStep() {
    var cs = state.cutscene;

    if (!cs.active) {
      _showNextSceneStepDOM();
      return;
    }

    var advanceEl = $("#cutsceneAdvance");
    var choicesEl = $("#cutsceneChoices");

    if (sceneQueue.length === 0) {
      if (advanceEl) advanceEl.classList.add("is-hidden");
      if (choicesEl) choicesEl.classList.add("is-hidden");
      _fadeOutCutsceneActors(function () {
        teardownCutscene();
        renderBoard();
        if (sceneCallback) {
          var cb = sceneCallback;
          sceneCallback = null;
          cb();
        }
      });
      return;
    }

    var step = sceneQueue.shift();

    if (step.choice) {
      cs.bubbleText = step.choice.prompt || "";
      cs.bubbleRevealed = cs.bubbleText.length;
      cs.bubbleStyle = "narration";
      cs.bubbleUnit = null;
      cs.currentSpeaker = null;

      if (advanceEl) advanceEl.classList.add("is-hidden");
      if (choicesEl) { choicesEl.classList.remove("is-hidden"); choicesEl.innerHTML = ""; }
      var _focusFirst = true;
      for (var i = 0; i < step.choice.options.length; i++) {
        (function (opt) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "btn btn--ghost";
          btn.textContent = opt.label;
          btn.addEventListener("click", function () {
            if (opt.flag === "scaeva_allied" && campaignState.totalDeaths > 2) {
              sceneQueue.unshift({
                speaker: "SCAEVA",
                text: "You have lost too many. I cannot risk my people on a losing cause.",
              });
            } else if (opt.flag) {
              Campaign.setFlag(opt.flag);
            }
            if (choicesEl) choicesEl.classList.add("is-hidden");
            if (advanceEl) advanceEl.classList.remove("is-hidden");
            showNextSceneStep();
          });
          if (choicesEl) choicesEl.appendChild(btn);
          if (_focusFirst) { setTimeout(function() { btn.focus(); }, 100); _focusFirst = false; }
        })(step.choice.options[i]);
      }
      if (!cs.rafId) cs.rafId = requestAnimationFrame(tickCutscene);
      return;
    }

    var speaker = step.speaker || null;
    var actor = speaker ? cs.actorMap[speaker] : null;

    cs.currentSpeaker = speaker;
    cs.bubbleText = "";
    cs.bubbleRevealed = 0;
    cs.bubbleStyle = step.style || ((speaker && actor) ? "dialogue" : "narration");
    cs.bubbleUnit = actor;
    if (!cs.rafId) cs.rafId = requestAnimationFrame(tickCutscene);

    if (choicesEl) choicesEl.classList.add("is-hidden");
    if (advanceEl) advanceEl.classList.remove("is-hidden");

    var textToShow = step.text || "";

    function startTypewriter() {
      if (!state.cutscene.active) return;
      cs.awaitingEntry = false;
      cs.bubbleText = textToShow;
      cs.bubbleRevealed = 0;
    }

    if (actor && !actor.entered) {
      cs.awaitingEntry = true;
      _walkInActor(actor).then(startTypewriter);
    } else {
      startTypewriter();
    }
  }

  function _showNextSceneStepDOM() {
    var sceneOverlay = $("#sceneOverlay");
    var sceneSpeaker = $("#sceneSpeaker");
    var sceneText = $("#sceneText");
    var sceneChoices = $("#sceneChoices");
    var btnNext = $("#btnSceneNext");

    if (sceneQueue.length === 0) {
      sceneOverlay.classList.add("is-hidden");
      if (sceneCallback) {
        var cb = sceneCallback;
        sceneCallback = null;
        cb();
      }
      return;
    }

    var step = sceneQueue.shift();

    if (step.choice) {
      sceneOverlay.classList.remove("is-hidden");
      sceneSpeaker.textContent = "";
      sceneText.textContent = step.choice.prompt;
      sceneText.className = "scene-text";
      btnNext.classList.add("is-hidden");
      sceneChoices.classList.remove("is-hidden");
      sceneChoices.innerHTML = "";
      var _focusFirst = true;
      for (var i = 0; i < step.choice.options.length; i++) {
        (function (opt) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "btn btn--ghost";
          btn.textContent = opt.label;
          btn.addEventListener("click", function () {
            if (opt.flag === "scaeva_allied" && campaignState.totalDeaths > 2) {
              sceneQueue.unshift({
                speaker: "SCAEVA",
                text: "You have lost too many. I cannot risk my people on a losing cause.",
              });
            } else if (opt.flag) {
              Campaign.setFlag(opt.flag);
            }
            sceneChoices.classList.add("is-hidden");
            btnNext.classList.remove("is-hidden");
            _showNextSceneStepDOM();
          });
          sceneChoices.appendChild(btn);
          if (_focusFirst) { setTimeout(function() { btn.focus(); }, 100); _focusFirst = false; }
        })(step.choice.options[i]);
      }
      return;
    }

    sceneOverlay.classList.remove("is-hidden");
    sceneSpeaker.textContent = step.speaker || "";
    sceneOverlay.setAttribute("aria-label", step.speaker || "Narration");
    sceneText.textContent = step.text || "";
    sceneText.className = "scene-text" + (step.style === "internal" ? " scene-text--internal" : "");
    sceneChoices.classList.add("is-hidden");
    btnNext.classList.remove("is-hidden");
    setTimeout(function() { btnNext.focus(); }, 100);
  }

  // ─── Title Screen & Campaign Init ─────────────────────────────────

  function showTitleScreen() {
    Campaign.migrateOldSave();
    var overlay = $("#titleOverlay");
    var btnContinue = $("#btnContinueCampaign");
    var anySave = Campaign.hasSave(0) || Campaign.hasSave(1) || Campaign.hasSave(2);
    if (btnContinue) {
      btnContinue.classList.toggle("is-hidden", !anySave);
    }
    document.getElementById("slotPicker").classList.add("is-hidden");
    if (overlay) {
      overlay.classList.remove("is-hidden");
      var focusBtn = (btnContinue && !btnContinue.classList.contains("is-hidden")) ? btnContinue : $("#btnNewCampaign");
      setTimeout(function() { (focusBtn || overlay).focus(); }, 100);
    }
    panelRoster.classList.add("is-hidden");
    panelDeploy.classList.add("is-hidden");
    panelBattle.classList.add("is-hidden");
  }

  function showSlotPicker(mode) {
    var picker = document.getElementById("slotPicker");
    var slotsDiv = document.getElementById("slotPickerSlots");
    var titleEl = picker.querySelector(".slot-picker__title");
    titleEl.textContent = mode === "new" ? "Pick a Slot for New Campaign" : "Continue Campaign";
    slotsDiv.innerHTML = "";
    for (var i = 0; i < 3; i++) {
      (function (slot) {
        var summary = Campaign.getSlotSummary(slot);
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn slot-picker__btn";
        if (summary) {
          var d = new Date(summary.savedAt);
          btn.innerHTML = "<strong>Slot " + (slot + 1) + "</strong><br>" + summary.missionName + "<br><small>" + summary.rosterSize + " fighters · " + d.toLocaleDateString() + "</small>";
        } else {
          btn.innerHTML = "<strong>Slot " + (slot + 1) + "</strong><br><em>Empty</em>";
        }
        btn.addEventListener("click", function () {
          if (mode === "new") {
            if (summary && !confirm("Overwrite Slot " + (slot + 1) + "?")) return;
            picker.classList.add("is-hidden");
            Campaign.setSlot(slot);
            Campaign.clearSave(slot);
            startCampaign();
          } else {
            if (!summary) return;
            picker.classList.add("is-hidden");
            Campaign.setSlot(slot);
            continueCampaign();
          }
        });
        if (mode === "continue" && !summary) btn.disabled = true;
        slotsDiv.appendChild(btn);
      })(i);
    }
    picker.classList.remove("is-hidden");
  }

  function hideTitleScreen() {
    var overlay = $("#titleOverlay");
    if (overlay) overlay.classList.add("is-hidden");
  }

  function startCampaign() {
    hideTitleScreen();
    BOARD_W = 12;
    BOARD_H = 10;
    if (renderer) renderer.resize(BOARD_W, BOARD_H);
    Campaign.start();

    var mission = Campaign.getMission();
    budgetCurrent = Campaign.getBudget();

    var preScene = filterScene(mission.preScene);
    var choices = mission.choices || [];

    var combined = preScene.slice();
    for (var i = 0; i < choices.length; i++) {
      if (Campaign.checkCondition(choices[i].condition)) {
        combined.push({ choice: choices[i] });
      }
    }

    if (combined.length > 0) {
      runScene(combined, function () {
        loadMissionIntoLudus();
      });
    } else {
      loadMissionIntoLudus();
    }
  }

  function continueCampaign() {
    if (!Campaign.loadFromDisk()) {
      startCampaign();
      return;
    }
    if (Campaign.isFinished()) {
      Campaign.clearSave();
      showTitleScreen();
      return;
    }
    BOARD_W = 12;
    BOARD_H = 10;
    if (renderer) renderer.resize(BOARD_W, BOARD_H);
    hideTitleScreen();
    budgetCurrent = Campaign.getBudget();
    loadMissionIntoLudus();
  }

  function showSkirmishSettings() {
    var title = document.getElementById("titleOverlay");
    if (title) title.classList.add("is-hidden");
    document.getElementById("skirmishSettings").classList.remove("is-hidden");
  }

  function hideSkirmishSettings() {
    document.getElementById("skirmishSettings").classList.add("is-hidden");
    var title = document.getElementById("titleOverlay");
    if (title) title.classList.remove("is-hidden");
  }

  function startSkirmish() {
    hideSkirmishSettings();
    hideTitleScreen();
    Campaign.reset();
    resetMapMods();
    var sz = MAP_SIZES[skirmishConfig.mapSize] || MAP_SIZES.medium;
    BOARD_W = sz.w;
    BOARD_H = sz.h;
    budgetCurrent = skirmishConfig.budget;
    state.phase = "ludus";
    state.picks = [];
    state.units = [];
    state.height = buildHeightField(42);
    state.terrain = buildEmptyTerrain();
    if (renderer) renderer.resize(BOARD_W, BOARD_H);
    updateCampaignHud();
    showPhasePanels();
    refreshRosterUI();
    renderBoard();
  }

  async function titusBossAbilities(titus) {
    if (!state.titusForgottenName && titus.hp > 0 && titus.hp <= titus.maxHp * 0.5) {
      state.titusForgottenName = true;
      await screenShake(200, 4);
      log("Titus stares into the sand... he mouths a name...", "system");
      spawnDmgNumber(titus, "...", "#c080ff");
      await delay(600);
    }

    state.titusTurnCounter++;
    if (state.titusTurnCounter % 4 === 0) {
      var candidates = [];
      for (var ry = 1; ry < BOARD_H - 1; ry++) {
        for (var rx = 1; rx < BOARD_W - 1; rx++) {
          if (!isTileCollapsed(rx, ry) && !occupantAt(rx, ry)) {
            candidates.push({ x: rx, y: ry });
          }
        }
      }
      if (candidates.length > 0) {
        var pick = candidates[Math.floor(Math.random() * candidates.length)];
        state.mapMods.collapsedTiles.add(pick.x + "," + pick.y);
        recalcGlowTiles();
        await screenShake(120, 3);
        log("Dis Pater's Reach — the arena cracks!", "system");
        renderBoard();
      }
    }
  }

  async function runEnemyTurn(enemy) {
    const players = state.units.filter((u) => u.team === "player" && u.hp > 0);
    if (!players.length) return;
    const eDef = classById(enemy.classId);
    if (enemy.atkDebuffTurns > 0) enemy.atkDebuffTurns--;
    if (enemy.atkDebuffTurns <= 0) enemy.atkDebuffAmt = 0;
    if (enemy.bleedTurns > 0) {
      enemy.bleedTurns--;
      applyDamage(enemy, 1);
      log(eDef.name + " bleeds! (−1 HP)");
      if (enemy.hp <= 0) { await animateDeath(enemy); return; }
    }

    if (enemy.rootedSkip > 0) {
      enemy.rootedSkip--;
      log(eDef.name + " is rooted and cannot act!");
      var cursedKillRoot = tickCursedTileDamage(enemy);
      if (cursedKillRoot) await animateDeath(enemy);
      tickMarkDebuffIfNeeded(enemy);
      renderBoard();
      return;
    }

    if (enemy.boss && enemy.displayName === "Titus") {
      await titusBossAbilities(enemy);
    }

    const target = players.reduce((a, b) =>
      manhattan(enemy, a) <= manhattan(enemy, b) ? a : b
    );

    var usedAbilityPreMove = false;
    if (unitAbilities(enemy).length && manhattan(enemy, target) > 1) {
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
        if (ePath.length) {
          await animateMove(enemy, ePath);
          if (enemy.gifted && enemy.classId === "secutor" && ePath.length >= 4) {
            enemy.pursuitBonusDmg = 3;
          }
        }
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
      if (Math.random() < 0.4 && unitAbilities(enemy).length) {
        usedAdj = await aiTryAdjacentAbility(enemy, eDef, adjTargets, adjTarget);
      }

      if (!usedAdj) {
        await aiBasicAttack(enemy, adjTarget);
      }
    } else if (adjTargets.length === 0 && !usedAbilityPreMove) {
      if (unitAbilities(enemy).length && !await aiTryLineAttack(enemy, eDef, players)) {
        log(eDef.name + " closes distance.");
      }
    }

    consumeAttackBuffs(enemy);
    var cursedKill = tickCursedTileDamage(enemy);
    if (cursedKill) await animateDeath(enemy);
    tickMarkDebuffIfNeeded(enemy);
    renderBoard();
  }

  async function aiTryPreMoveAbility(enemy, eDef, players, target) {
    var hpPct = enemy.hp / enemy.maxHp;
    for (const ab of unitAbilities(enemy)) {
      var _namedHeals = ["Iron Will", "Shadow Mend", "Guardian Aura", "Champion's Resolve", "Neptune's Favor"];
      if (ab.type === "heal" && ab.target === "self" && hpPct < 0.5 && _namedHeals.indexOf(ab.name) === -1) {
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
          enemy.braceCharges = 1;
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
        if (ab.name === "Blind Rush" && Math.random() < 0.4) {
          SFX.ability();
          enemy.blindRushAtk = 2;
          enemy.blindRushDef = 2;
          log(eDef.name + " uses Blind Rush (+2 ATK, −2 DEF).");
          return false;
        }
        if (ab.name === "Phalanx Guard" && Math.random() < 0.35) {
          var pAllies = 0;
          for (var pd = 0; pd < DIRS.length; pd++) {
            var ppx = enemy.x + DIRS[pd][0], ppy = enemy.y + DIRS[pd][1];
            var pa = occupantAt(ppx, ppy);
            if (pa && pa.team === enemy.team && pa.hp > 0) { pa.phalanxBonus = 2; pAllies++; }
          }
          if (pAllies) { SFX.ability(); log(eDef.name + " raises Phalanx Guard!"); return true; }
        }
        if (ab.name === "Arena Salute" && (enemy.rootedSkip || enemy.atkDebuffTurns > 0 || enemy.bleedTurns > 0)) {
          SFX.ability();
          enemy.rootedSkip = 0; enemy.crowdSpdDebuff = 0; enemy.markDebuffTurns = 0;
          enemy.markFocusId = null; enemy.dreadMarkDmg = 0; enemy.bleedTurns = 0;
          enemy.atkDebuffTurns = 0; enemy.atkDebuffAmt = 0;
          log(eDef.name + " uses Arena Salute — cleansed!");
          return true;
        }
        if (ab.name === "Rally Charge" && Math.random() < 0.4) {
          SFX.ability();
          enemy.tempExtraMove = true;
          enemy.rallyCharge = true;
          log(eDef.name + " uses Rally Charge (+2 move).");
          return false;
        }
        if (ab.name === "Phase Walk" && manhattan(enemy, target) > 2 && Math.random() < 0.5) {
          var bestTile = null, bestDist = 999;
          for (var pwy = 0; pwy < BOARD_H; pwy++) {
            for (var pwx = 0; pwx < BOARD_W; pwx++) {
              if (manhattan(enemy, {x: pwx, y: pwy}) <= 3 && manhattan(enemy, {x: pwx, y: pwy}) > 0
                  && !occupantAt(pwx, pwy) && inBounds(pwx, pwy) && !isTileCollapsed(pwx, pwy) && !isTileImpassableTerrain(pwx, pwy)) {
                var pd = manhattan({x: pwx, y: pwy}, target);
                if (pd < bestDist) { bestDist = pd; bestTile = [pwx, pwy]; }
              }
            }
          }
          if (bestTile && bestDist < manhattan(enemy, target)) {
            SFX.ability();
            enemy.x = bestTile[0]; enemy.y = bestTile[1];
            log(eDef.name + " Phase Walks closer!");
            return false;
          }
        }
        if (ab.name === "Shadow Step" && manhattan(enemy, target) > 2 && Math.random() < 0.4) {
          var bst = null, bsd = 999;
          for (var ssy = 0; ssy < BOARD_H; ssy++) {
            for (var ssx = 0; ssx < BOARD_W; ssx++) {
              if (manhattan(enemy, {x: ssx, y: ssy}) <= 2 && manhattan(enemy, {x: ssx, y: ssy}) > 0
                  && !occupantAt(ssx, ssy) && inBounds(ssx, ssy) && !isTileCollapsed(ssx, ssy) && !isTileImpassableTerrain(ssx, ssy)) {
                var sd = manhattan({x: ssx, y: ssy}, target);
                if (sd < bsd) { bsd = sd; bst = [ssx, ssy]; }
              }
            }
          }
          if (bst && bsd < manhattan(enemy, target)) {
            SFX.ability();
            enemy.x = bst[0]; enemy.y = bst[1];
            log(eDef.name + " Shadow Steps closer!");
            return false;
          }
        }
        if (ab.name === "High Ground" && Math.random() < 0.35) {
          SFX.ability();
          enemy.highGroundNext = true;
          log(eDef.name + " uses High Ground (+15% accuracy).");
          return false;
        }
        if (ab.name === "Battle Focus" && Math.random() < 0.35) {
          SFX.ability();
          enemy.battleFocusNext = true;
          log(eDef.name + " uses Battle Focus (+25% accuracy).");
          return false;
        }
        if (ab.name === "Evasion" && Math.random() < 0.35 && hpPct < 0.6) {
          SFX.ability();
          enemy.testudoBonus = 3;
          log(eDef.name + " uses Evasion (+3 DEF).");
          return true;
        }
        if (ab.name === "Eagle Eye" && Math.random() < 0.35) {
          SFX.ability();
          enemy.eagleEyeHits = 2;
          log(eDef.name + " uses Eagle Eye — cannot miss!");
          return false;
        }
        if (ab.name === "Unholy Resilience" && Math.random() < 0.3 && hpPct < 0.5) {
          SFX.ability();
          enemy.battleHardenedTurns = 2;
          enemy.battleHardenedDef = 3;
          enemy.battleHardenedAtk = 0;
          log(eDef.name + " uses Unholy Resilience (+3 DEF).");
          return true;
        }
        if (ab.name === "Parry" && Math.random() < 0.3 && manhattan(enemy, target) <= 2) {
          SFX.ability();
          enemy.parryCharges = 1;
          log(eDef.name + " uses Parry.");
          return true;
        }
        if (ab.name === "Spear Brace" && Math.random() < 0.3 && manhattan(enemy, target) <= 2) {
          SFX.ability();
          enemy.spearBraceActive = true;
          log(eDef.name + " readies Spear Brace.");
          return true;
        }
      }
      if (ab.type === "heal" && ab.target === "self" && ab.name === "Iron Will" && hpPct < 0.5) {
        SFX.ability();
        var iwH = Math.round(enemy.maxHp * 0.15);
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + iwH);
        enemy.rootedSkip = 0;
        spawnDmgNumber(enemy, "+" + iwH, "#70d870");
        log(eDef.name + " uses Iron Will (+" + iwH + " HP).");
        return true;
      }
      if (ab.name === "Neptune's Favor" && ab.type === "heal" && hpPct < 0.5) {
        SFX.ability();
        var nfH = Math.round(enemy.maxHp * 0.2);
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + nfH);
        enemy.tempExtraMove = true;
        spawnDmgNumber(enemy, "+" + nfH, "#70d870");
        log(eDef.name + " uses Neptune's Favor.");
        return false;
      }
      if (ab.name === "Shadow Mend" && ab.type === "heal" && hpPct < 0.4) {
        SFX.ability();
        var smH = Math.round(enemy.maxHp * 0.25);
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + smH);
        enemy.shadowMendAtkPenalty = 2;
        spawnDmgNumber(enemy, "+" + smH, "#70d870");
        log(eDef.name + " uses Shadow Mend.");
        return true;
      }
      if (ab.name === "Champion's Resolve" && hpPct < 0.3 && !enemy.resolveUsed) {
        SFX.ability();
        enemy.hp = enemy.maxHp;
        enemy.resolveUsed = true;
        spawnDmgNumber(enemy, "FULL", "#ffdd44");
        log(eDef.name + " uses Champion's Resolve — fully healed!");
        return true;
      }
      if (ab.name === "Battle Hardened" && Math.random() < 0.3) {
        SFX.ability();
        enemy.battleHardenedTurns = 2;
        enemy.battleHardenedAtk = 1;
        enemy.battleHardenedDef = 2;
        log(eDef.name + " uses Battle Hardened (+2 DEF, +1 ATK).");
        return true;
      }
      if (ab.name === "Intimidating Roar" && manhattan(enemy, target) <= 1 && Math.random() < 0.4) {
        var irC = 0;
        for (var iri = 0; iri < DIRS.length; iri++) {
          var eirx = enemy.x + DIRS[iri][0], eiry = enemy.y + DIRS[iri][1];
          var eirt = occupantAt(eirx, eiry);
          if (eirt && eirt.team !== enemy.team && eirt.hp > 0) {
            eirt.rootedSkip = Math.max(eirt.rootedSkip, 1);
            irC++;
          }
        }
        if (irC) { SFX.ability(); log(eDef.name + " Intimidating Roar — " + irC + " foes rooted!"); return true; }
      }
      if (ab.name === "Inspiring Presence" && Math.random() < 0.3) {
        var ipC = 0;
        for (var ipi = 0; ipi < DIRS.length; ipi++) {
          var eipx = enemy.x + DIRS[ipi][0], eipy = enemy.y + DIRS[ipi][1];
          var eipt = occupantAt(eipx, eipy);
          if (eipt && eipt.team === enemy.team && eipt.hp > 0) { eipt.atkBonus += 2; eipt.atkBonusTurns = 2; ipC++; }
        }
        if (ipC) { SFX.ability(); log(eDef.name + " Inspiring Presence — " + ipC + " allies buffed!"); return true; }
      }
      if (ab.name === "War Cry" && ab.type === "debuff" && ab.target === "self") {
        if (manhattan(enemy, target) <= 1 && Math.random() < 0.35) {
          SFX.ability();
          var wc = 0;
          for (var wd = 0; wd < DIRS.length; wd++) {
            var ewx = enemy.x + DIRS[wd][0], ewy = enemy.y + DIRS[wd][1];
            var ewt = occupantAt(ewx, ewy);
            if (ewt && ewt.team !== enemy.team && ewt.hp > 0) { ewt.atkDebuffTurns = 2; ewt.atkDebuffAmt = 2; wc++; }
          }
          if (wc) { log(eDef.name + " War Cry — " + wc + " foes weakened!"); return true; }
        }
      }
      if (ab.type === "debuff" && ab.target === "adjacent_enemy" && ab.name === "Iaculum") {
        if (target.gifted && target.classId === "thraex") continue;
        if (manhattan(enemy, target) <= 1 && Math.random() < 0.5 && !target.rootedSkip) {
          SFX.ability();
          target.rootedSkip = enemy.gifted ? 2 : 1;
          log(eDef.name + " nets " + classById(target.classId).name + "!" + (enemy.gifted ? " Binding Net!" : ""));
          return true;
        }
      }
    }
    return false;
  }

  async function aiTryAdjacentAbility(enemy, eDef, adjTargets, adjTarget) {
    const abilities = unitAbilities(enemy);
    if (!abilities.length) return false;

    for (const ab of abilities) {
      if (ab.target === "aoe_adjacent" && ab.effect === "grave_pulse" && adjTargets.length >= 1 && Math.random() < 0.4) {
        SFX.ability();
        var allAdj = [];
        for (var gdi = 0; gdi < DIRS.length; gdi++) {
          var ggx = enemy.x + DIRS[gdi][0], ggy = enemy.y + DIRS[gdi][1];
          var ggt = occupantAt(ggx, ggy);
          if (ggt && ggt.hp > 0 && ggt.team !== enemy.team) allAdj.push(ggt);
        }
        for (var ggi = 0; ggi < allAdj.length; ggi++) {
          applyDamage(allAdj[ggi], 4);
          await Promise.all([animateHitFlash(allAdj[ggi]), screenShake(80, 2)]);
          log(eDef.name + " Grave Pulse hits " + classById(allAdj[ggi].classId).name + " (4).");
          if (allAdj[ggi].hp <= 0) await animateDeath(allAdj[ggi]);
        }
        if (ab.selfDamage) applyDamage(enemy, ab.selfDamage);
        return true;
      }

      if (ab.target === "aoe_adjacent" && !ab.effect && adjTargets.length >= 2 && Math.random() < 0.6) {
        SFX.ability();
        for (const t of adjTargets) {
          const dmg = physicalDamage(enemy, t, ab.mult || 1);
          if (t.riposteActive) { applyDamage(enemy, 5); t.riposteActive = false; log("Riposte!"); }
          applyDamage(t, dmg);
          await Promise.all([animateHitFlash(t), screenShake(80, 2)]);
          log(eDef.name + " uses " + ab.name + " on " + classById(t.classId).name + " (" + dmg + ").");
          if (t.hp <= 0) await animateDeath(t);
        }
        return true;
      }

      if (ab.type === "debuff" && ab.target === "adjacent_enemy" && ab.name === "Provocatio") {
        if (adjTarget.gifted) continue;
        if (Math.random() < 0.35 && adjTarget.markDebuffTurns <= 0) {
          SFX.ability();
          adjTarget.markDebuffTurns = 2;
          adjTarget.markFocusId = enemy.id;
          if (enemy.gifted) {
            adjTarget.dreadMarkDmg = 3;
            log(eDef.name + " brands " + classById(adjTarget.classId).name + " with Dread Mark!");
          } else {
            log(eDef.name + " marks " + classById(adjTarget.classId).name + " with Provocatio!");
          }
          return true;
        }
      }

      if (ab.type === "debuff" && ab.target === "adjacent_enemy" && ab.name === "Iaculum") {
        if (adjTarget.gifted && adjTarget.classId === "thraex") continue;
        if (Math.random() < 0.45 && !adjTarget.rootedSkip) {
          SFX.ability();
          adjTarget.rootedSkip = enemy.gifted ? 2 : 1;
          log(eDef.name + " nets " + classById(adjTarget.classId).name + "!" + (enemy.gifted ? " Binding Net!" : ""));
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
            if (inBounds(pnx, pny) && !occupantAt(pnx, pny) && !isTileImpassableTerrain(pnx, pny) && !isTileCollapsed(pnx, pny)) {
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

      if (ab.type === "utility" && ab.effect === "push" && ab.target === "adjacent_enemy") {
        if (enemy.gifted && enemy.classId === "samnite" && Math.random() < 0.4) {
          SFX.ability();
          var pushed = 0;
          for (var di = 0; di < DIRS.length; di++) {
            var ax = enemy.x + DIRS[di][0], ay = enemy.y + DIRS[di][1];
            var adj = occupantAt(ax, ay);
            if (!adj || adj.team === enemy.team) continue;
            var bx = ax + DIRS[di][0], by = ay + DIRS[di][1];
            if (inBounds(bx, by) && !occupantAt(bx, by) && !isTileImpassableTerrain(bx, by) && !isTileCollapsed(bx, by)) {
              await animateMove(adj, [[bx, by]]);
              pushed++;
            }
          }
          if (pushed) {
            log(eDef.name + " Tremor Press — " + pushed + " foes shoved!");
            return true;
          }
        } else if (Math.random() < 0.25) {
          SFX.ability();
          var sdx = adjTarget.x - enemy.x;
          var sdy = adjTarget.y - enemy.y;
          var snx = adjTarget.x + sdx;
          var sny = adjTarget.y + sdy;
          if (inBounds(snx, sny) && !occupantAt(snx, sny) && !isTileImpassableTerrain(snx, sny) && !isTileCollapsed(snx, sny)) {
            await animateMove(adjTarget, [[snx, sny]]);
            log(eDef.name + " shoves " + classById(adjTarget.classId).name + "!");
            return true;
          }
        }
      }

      if (ab.type === "attack" && ab.target === "adjacent_enemy" && ab.effect === "stun" && Math.random() < 0.35) {
        SFX.ability();
        await animateAttack(enemy, adjTarget);
        if (rollHit(enemy, adjTarget)) {
          SFX.hit();
          const dmg = physicalDamage(enemy, adjTarget, ab.mult || 1);
          if (adjTarget.riposteActive) { applyDamage(enemy, 5); adjTarget.riposteActive = false; }
          applyDamage(adjTarget, dmg);
          await Promise.all([animateHitFlash(adjTarget), screenShake(80, 2)]);
          if (adjTarget.hp > 0) adjTarget.rootedSkip = Math.max(adjTarget.rootedSkip, 1);
          log(eDef.name + " uses " + ab.name + " on " + classById(adjTarget.classId).name + " (" + dmg + " + stun).");
          if (adjTarget.hp <= 0) await animateDeath(adjTarget);
        } else {
          SFX.miss();
          spawnDmgNumber(adjTarget, "MISS", "#aaaaaa");
          log(eDef.name + " uses " + ab.name + " — misses!");
        }
        return true;
      }

      if (ab.effect === "pull" && ab.target === "adjacent_enemy" && Math.random() < 0.3) {
        SFX.ability();
        var plx = enemy.x - adjTarget.x;
        var ply = enemy.y - adjTarget.y;
        var pullX = adjTarget.x + Math.sign(plx);
        var pullY = adjTarget.y + Math.sign(ply);
        if (inBounds(pullX, pullY) && !occupantAt(pullX, pullY) && !isTileCollapsed(pullX, pullY) && !isTileImpassableTerrain(pullX, pullY)) {
          await animateMove(adjTarget, [[pullX, pullY]]);
          log(eDef.name + " pulls " + classById(adjTarget.classId).name + " closer!");
        }
        return true;
      }

      if (ab.type === "attack" && ab.target === "adjacent_enemy" && ab.effect === "bleed" && Math.random() < 0.35) {
        SFX.ability();
        await animateAttack(enemy, adjTarget);
        if (rollHit(enemy, adjTarget)) {
          SFX.hit();
          const dmg = physicalDamage(enemy, adjTarget, ab.mult || 1);
          if (adjTarget.riposteActive) { applyDamage(enemy, 5); adjTarget.riposteActive = false; }
          applyDamage(adjTarget, dmg);
          await Promise.all([animateHitFlash(adjTarget), screenShake(80, 2)]);
          if (adjTarget.hp > 0) adjTarget.bleedTurns = 3;
          log(eDef.name + " uses " + ab.name + " on " + classById(adjTarget.classId).name + " (" + dmg + " + bleed).");
          if (adjTarget.hp <= 0) await animateDeath(adjTarget);
        } else {
          SFX.miss();
          spawnDmgNumber(adjTarget, "MISS", "#aaaaaa");
          log(eDef.name + " uses " + ab.name + " — misses!");
        }
        return true;
      }

      if (ab.type === "attack" && ab.target === "adjacent_enemy" && ab.effect === "lifesteal" && Math.random() < 0.4) {
        SFX.ability();
        await animateAttack(enemy, adjTarget);
        if (rollHit(enemy, adjTarget)) {
          SFX.hit();
          const dmg = physicalDamage(enemy, adjTarget, ab.mult || 1);
          if (adjTarget.riposteActive) { applyDamage(enemy, 5); adjTarget.riposteActive = false; }
          applyDamage(adjTarget, dmg);
          var stealAmt = ab.steal || 0.25;
          var stolen = (typeof stealAmt === "number" && stealAmt < 1) ? Math.round(dmg * stealAmt) : stealAmt;
          enemy.hp = Math.min(enemy.maxHp, enemy.hp + stolen);
          spawnDmgNumber(enemy, "+" + stolen, "#80ff80");
          await Promise.all([animateHitFlash(adjTarget), screenShake(80, 2)]);
          log(eDef.name + " uses " + ab.name + " (" + dmg + " dmg, +" + stolen + " HP).");
          if (adjTarget.hp <= 0) await animateDeath(adjTarget);
        } else {
          SFX.miss();
          spawnDmgNumber(adjTarget, "MISS", "#aaaaaa");
          log(eDef.name + " uses " + ab.name + " — misses!");
        }
        return true;
      }

      if (ab.effect === "atkdebuff" && ab.target === "adjacent_enemy" && Math.random() < 0.35) {
        SFX.ability();
        adjTarget.atkDebuffTurns = ab.debuffTurns || 2;
        adjTarget.atkDebuffAmt = ab.debuffAmt || 3;
        log(eDef.name + " uses " + ab.name + " on " + classById(adjTarget.classId).name + " (−" + adjTarget.atkDebuffAmt + " ATK)!");
        return true;
      }

      if (ab.effect === "entangle" && ab.target === "adjacent_enemy" && Math.random() < 0.35 && !adjTarget.rootedSkip) {
        SFX.ability();
        adjTarget.rootedSkip = Math.max(adjTarget.rootedSkip, 1);
        adjTarget.atkDebuffTurns = 2;
        adjTarget.atkDebuffAmt = 2;
        log(eDef.name + " Entangle — " + classById(adjTarget.classId).name + " rooted and weakened!");
        return true;
      }

      if (ab.effect === "huntermark" && ab.target === "adjacent_enemy" && Math.random() < 0.35) {
        SFX.ability();
        adjTarget.markDebuffTurns = 2;
        adjTarget.dreadMarkDmg = 3;
        log(eDef.name + " Hunter's Mark — " + classById(adjTarget.classId).name + " takes +3 damage!");
        return true;
      }

      if (ab.effect === "drag" && ab.target === "adjacent_enemy" && Math.random() < 0.35) {
        SFX.ability();
        await animateAttack(enemy, adjTarget);
        if (rollHit(enemy, adjTarget)) {
          SFX.hit();
          var drDmg = physicalDamage(enemy, adjTarget, ab.mult || 1);
          applyDamage(adjTarget, drDmg);
          await Promise.all([animateHitFlash(adjTarget), screenShake(80, 2)]);
          log(eDef.name + " Drag Under hits " + classById(adjTarget.classId).name + " (" + drDmg + ").");
          if (adjTarget.hp > 0) {
            var drPx = adjTarget.x + Math.sign(enemy.x - adjTarget.x);
            var drPy = adjTarget.y + Math.sign(enemy.y - adjTarget.y);
            if (inBounds(drPx, drPy) && !occupantAt(drPx, drPy) && !isTileCollapsed(drPx, drPy) && !isTileImpassableTerrain(drPx, drPy)) {
              await animateMove(adjTarget, [[drPx, drPy]]);
            }
          }
          if (adjTarget.hp <= 0) await animateDeath(adjTarget);
        } else {
          SFX.miss();
          spawnDmgNumber(adjTarget, "MISS", "#aaaaaa");
          log(eDef.name + " Drag Under — misses!");
        }
        return true;
      }

      if (ab.effect === "push2" && ab.target === "adjacent_enemy" && Math.random() < 0.35) {
        SFX.ability();
        await animateAttack(enemy, adjTarget);
        if (rollHit(enemy, adjTarget)) {
          SFX.hit();
          var p2D = physicalDamage(enemy, adjTarget, ab.mult || 1);
          applyDamage(adjTarget, p2D);
          await Promise.all([animateHitFlash(adjTarget), screenShake(80, 2)]);
          log(eDef.name + " Veteran's Fury (" + p2D + ").");
          if (adjTarget.hp > 0) {
            var pdx2 = Math.sign(adjTarget.x - enemy.x);
            var pdy2 = Math.sign(adjTarget.y - enemy.y);
            for (var pi2 = 0; pi2 < 2; pi2++) {
              var pnx2 = adjTarget.x + pdx2;
              var pny2 = adjTarget.y + pdy2;
              if (inBounds(pnx2, pny2) && !occupantAt(pnx2, pny2) && !isTileCollapsed(pnx2, pny2) && !isTileImpassableTerrain(pnx2, pny2)) {
                await animateMove(adjTarget, [[pnx2, pny2]]);
              } else break;
            }
          }
          if (adjTarget.hp <= 0) await animateDeath(adjTarget);
        } else {
          SFX.miss();
          spawnDmgNumber(adjTarget, "MISS", "#aaaaaa");
          log(eDef.name + " Veteran's Fury — misses!");
        }
        return true;
      }

      if (ab.target === "aoe_adjacent" && (ab.effect === "voidburst" || ab.effect === "deathembrace" || ab.effect === "whirlwind") && adjTargets.length >= 1 && Math.random() < 0.45) {
        SFX.ability();
        var aoeD = ab.effect === "deathembrace" ? 6 : 0;
        var totalStolen = 0;
        for (var aoei = 0; aoei < adjTargets.length; aoei++) {
          var aoeDmg = aoeD > 0 ? aoeD : physicalDamage(enemy, adjTargets[aoei], ab.mult || 1);
          applyDamage(adjTargets[aoei], aoeDmg);
          await Promise.all([animateHitFlash(adjTargets[aoei]), screenShake(80, 2)]);
          log(eDef.name + " " + ab.name + " hits " + classById(adjTargets[aoei].classId).name + " (" + aoeDmg + ").");
          if (ab.effect === "voidburst") totalStolen += 2;
          if (ab.effect === "deathembrace") totalStolen += 6;
          if (adjTargets[aoei].hp <= 0) await animateDeath(adjTargets[aoei]);
        }
        if (totalStolen > 0) {
          enemy.hp = Math.min(enemy.maxHp, enemy.hp + totalStolen);
          spawnDmgNumber(enemy, "+" + totalStolen, "#80ff80");
        }
        return true;
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
    const abilities = unitAbilities(enemy);
    if (!abilities.length) return false;
    for (const ab of abilities) {
      if (ab.type !== "attack" || ab.target !== "line") continue;
      const range = ab.range || 3;
      for (const [dx, dy] of DIRS) {
        for (let s = 1; s <= range; s++) {
          const tx = enemy.x + dx * s;
          const ty = enemy.y + dy * s;
          if (!inBounds(tx, ty)) break;
          if (isTileCollapsed(tx, ty)) break;
          if (isTileImpassableTerrain(tx, ty)) break;
          const occ = occupantAt(tx, ty);
          if (occ && occ.team === "player" && occ.hp > 0) {
            SFX.ability();
            await animateAttack(enemy, occ);
            if (rollHit(enemy, occ)) {
              SFX.hit();
              var dmg;
              if (ab.effect === "suppress") {
                dmg = 3;
              } else {
                dmg = physicalDamage(enemy, occ, ab.mult || 1, ab.ignoreDefPct || 0);
              }
              if (occ.riposteActive && s === 1) { applyDamage(enemy, 5); occ.riposteActive = false; }
              applyDamage(occ, dmg);
              await Promise.all([animateHitFlash(occ), screenShake(80, 2)]);
              log(eDef.name + " uses " + ab.name + " on " + classById(occ.classId).name + " (" + dmg + ").");
              if (enemy.gifted && enemy.classId === "hoplomachus" && occ.hp > 0) {
                var ppx = occ.x + dx, ppy = occ.y + dy;
                if (inBounds(ppx, ppy) && !occupantAt(ppx, ppy) && !isTileImpassableTerrain(ppx, ppy) && !isTileCollapsed(ppx, ppy)) {
                  await animateMove(occ, [[ppx, ppy]]);
                  log("Tremor Thrust pushes back!");
                }
              }
              if (ab.effect === "charge") {
                var chX = occ.x - dx, chY = occ.y - dy;
                if (occ.hp > 0 && inBounds(chX, chY) && !occupantAt(chX, chY) && !isTileCollapsed(chX, chY) && !isTileImpassableTerrain(chX, chY)) {
                  enemy.x = chX; enemy.y = chY;
                } else if (occ.hp <= 0 && inBounds(occ.x, occ.y) && !isTileCollapsed(occ.x, occ.y) && !isTileImpassableTerrain(occ.x, occ.y)) {
                  enemy.x = occ.x; enemy.y = occ.y;
                }
              }
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
      if (state.cutscene.active) return;
      var delta = e.deltaY > 0 ? -0.1 : 0.1;
      renderer.setZoom(renderer.zoom + delta);
      renderBoard();
    }, { passive: false });

    window.addEventListener("keydown", function (e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (state.cutscene.active) {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          var cs = state.cutscene;
          if (cs.awaitingEntry) return;
          var choicesVis = $("#cutsceneChoices");
          if (choicesVis && !choicesVis.classList.contains("is-hidden")) return;
          if (cs.bubbleRevealed < cs.bubbleText.length) {
            cs.bubbleRevealed = cs.bubbleText.length;
          } else {
            showNextSceneStep();
          }
        }
        return;
      }
      var key = e.key.toLowerCase();

      // Camera controls
      if (key === "q") { renderer.rotate(-1); renderBoard(); return; }
      if (key === "e") { renderer.rotate(1); renderBoard(); return; }
      if (key === "=" || key === "+") { renderer.setZoom(renderer.zoom + 0.15); renderBoard(); return; }
      if (key === "-" || key === "_") { renderer.setZoom(renderer.zoom - 0.15); renderBoard(); return; }
      if (key === "r" || key === "home") { renderer.zoom = 1.0; renderer.panX = 0; renderer.panY = 0; renderer.rotStep = 0; renderer._recalcLayout(); renderBoard(); return; }

      // Battle shortcuts — (A)ttack, a(B)ility, (W)ait, E(sc)ape to cancel
      if (state.phase === "battle" && state.activeUnit && state.activeUnit.team === "player") {
        if (key === "m" && !btnMove.disabled) { btnMove.click(); return; }
        if (key === "a" && !btnAttack.disabled) { btnAttack.click(); return; }
        if (key === "b" && !btnAbility.disabled) { btnAbility.click(); return; }
        if (key === "w" && !btnWait.disabled) { btnWait.click(); return; }
        if (key === "u" && !btnUndo.disabled) { btnUndo.click(); return; }
        if (key === "escape") { cancelTargeting(); hideAbilityMenu(); return; }
        // Number keys 1-9 to pick ability from the menu
        if (key >= "1" && key <= "9" && !abilityMenu.classList.contains("is-hidden")) {
          var idx = parseInt(key) - 1;
          var btns = abilityMenu.querySelectorAll(".ability-menu__btn:not(:disabled)");
          if (idx < btns.length) { btns[idx].click(); return; }
        }
      }

      if (key === "m") { btnMute.click(); return; }
    });

    // Pan via middle-mouse or right-click drag
    isoCanvas.addEventListener("mousedown", function (e) {
      if (state.cutscene.active) return;
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

    // Touch support: tap = click, drag = pan, pinch = zoom
    var _touch = { startX: 0, startY: 0, panOX: 0, panOY: 0, moved: false, pinchDist: 0, pinchZoom: 1 };
    function _touchDist(t) {
      var dx = t[0].clientX - t[1].clientX;
      var dy = t[0].clientY - t[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }
    isoCanvas.addEventListener("touchstart", function (e) {
      if (e.touches.length === 1) {
        _touch.startX = e.touches[0].clientX;
        _touch.startY = e.touches[0].clientY;
        _touch.panOX = renderer.panX;
        _touch.panOY = renderer.panY;
        _touch.moved = false;
      } else if (e.touches.length === 2) {
        _touch.pinchDist = _touchDist(e.touches);
        _touch.pinchZoom = renderer.zoom;
      }
    }, { passive: true });
    isoCanvas.addEventListener("touchmove", function (e) {
      e.preventDefault();
      if (state.cutscene.active) return;
      if (e.touches.length === 1) {
        var dx = _touch.startX - e.touches[0].clientX;
        var dy = _touch.startY - e.touches[0].clientY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) _touch.moved = true;
        if (_touch.moved) {
          renderer.panX = _touch.panOX + dx / renderer.zoom;
          renderer.panY = _touch.panOY + dy / renderer.zoom;
          renderBoard();
        }
      } else if (e.touches.length === 2) {
        var dist = _touchDist(e.touches);
        if (_touch.pinchDist > 0) {
          renderer.setZoom(_touch.pinchZoom * (dist / _touch.pinchDist));
          renderBoard();
        }
      }
    }, { passive: false });
    isoCanvas.addEventListener("touchend", function (e) {
      if (e.changedTouches.length === 1 && !_touch.moved && e.touches.length === 0) {
        var rect = isoCanvas.getBoundingClientRect();
        var mx = _touch.startX - rect.left;
        var my = _touch.startY - rect.top;
        var cell = renderer.screenToGrid(mx, my);
        if (cell) onTileClick(cell.col, cell.row);
      }
    }, { passive: true });

    // Camera control buttons
    btnRotL.addEventListener("click", function () { if (state.cutscene.active) return; renderer.rotate(-1); renderBoard(); });
    btnRotR.addEventListener("click", function () { if (state.cutscene.active) return; renderer.rotate(1); renderBoard(); });
    btnZoomIn.addEventListener("click", function () { if (state.cutscene.active) return; renderer.setZoom(renderer.zoom + 0.15); renderBoard(); });
    btnZoomOut.addEventListener("click", function () { if (state.cutscene.active) return; renderer.setZoom(renderer.zoom - 0.15); renderBoard(); });
    btnCamReset.addEventListener("click", function () {
      if (state.cutscene.active) return;
      renderer.zoom = 1.0;
      renderer.panX = 0;
      renderer.panY = 0;
      renderer.rotStep = 0;
      renderer._recalcLayout();
      renderBoard();
    });

    btnWait.addEventListener("mouseenter", function () { previewCtStrip("wait"); });
    btnWait.addEventListener("mouseleave", function () { clearCtPreview(); });

    btnMute.addEventListener("click", function () {
      var muted = SFX.mute();
      btnMute.innerHTML = (muted ? "🔇" : "♪") + "<kbd>M</kbd>";
      btnMute.setAttribute("aria-label", muted ? "Unmute (M)" : "Mute (M)");
    });

    window.addEventListener("resize", function () {
      renderer.resize(BOARD_W, BOARD_H);
      renderBoard();
    });

    btnClearRoster.addEventListener("click", () => {
      state.picks = [];
      if (campaignState.active) {
        campaignState.survivingRoster = [];
        // Re-add free recruits so the player always has a baseline roster
        var recruits = Campaign.getFreeRecruits();
        for (var fi = 0; fi < recruits.length; fi++) {
          var fr = recruits[fi];
          var recruitPick = {
            uid: "free_" + fr.classId + "_" + fi,
            classId: fr.classId,
            displayName: fr.name,
            isFree: true,
          };
          if (fr.gifted) recruitPick.gifted = true;
          state.picks.push(recruitPick);
        }
        Campaign.saveToDisk();
      }
      refreshRosterUI();
    });
    btnToDeploy.addEventListener("click", startDeploy);
    btnTrainingBout.addEventListener("click", startTrainingBout);
    btnToBattle.addEventListener("click", startBattle);
    document.getElementById("btnLogExpand").addEventListener("click", toggleFullLog);
    document.getElementById("btnRosterStats").addEventListener("click", toggleRosterStats);
    btnBackLudus.addEventListener("click", () => {
      state.phase = "ludus";
      state.units = [];
      showPhasePanels();
      refreshRosterUI();
      renderBoard();
    });
    btnResultContinue.addEventListener("click", closeResultAndReset);

    var btnRetry = $("#btnResultRetry");
    if (btnRetry) {
      btnRetry.addEventListener("click", function () {
        resultOverlay.classList.add("is-hidden");
        retryCampaignMission();
      });
    }

    var btnSceneNext = $("#btnSceneNext");
    if (btnSceneNext) {
      btnSceneNext.addEventListener("click", function () {
        if (state.cutscene.active) return;
        _showNextSceneStepDOM();
      });
    }

    var cutsceneAdv = $("#cutsceneAdvance");
    if (cutsceneAdv) {
      function onCutsceneAdvance(e) {
        e.preventDefault();
        var cs = state.cutscene;
        if (!cs.active) return;
        if (cs.awaitingEntry) return;
        var choicesVis = $("#cutsceneChoices");
        if (choicesVis && !choicesVis.classList.contains("is-hidden")) return;
        if (cs.bubbleRevealed < cs.bubbleText.length) {
          cs.bubbleRevealed = cs.bubbleText.length;
        } else {
          showNextSceneStep();
        }
      }
      cutsceneAdv.addEventListener("click", onCutsceneAdvance);
      cutsceneAdv.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") onCutsceneAdvance(e);
      });
    }

    var btnNewCampaign = $("#btnNewCampaign");
    var btnSkirmish = $("#btnSkirmish");
    var btnContinueCampaign = $("#btnContinueCampaign");
    if (btnNewCampaign) btnNewCampaign.addEventListener("click", function () {
      showSlotPicker("new");
    });
    if (btnSkirmish) btnSkirmish.addEventListener("click", showSkirmishSettings);

    // Skirmish settings wiring
    var skEnemyCount = document.getElementById("skEnemyCount");
    var skBudget = document.getElementById("skBudget");
    var skMapSize = document.getElementById("skMapSize");
    var skTerrain = document.getElementById("skTerrain");
    var skSeed = document.getElementById("skSeed");
    if (skEnemyCount) {
      skEnemyCount.addEventListener("input", function () {
        skirmishConfig.enemyCount = parseInt(this.value) || 3;
        document.getElementById("skEnemyVal").textContent = this.value;
      });
      skBudget.addEventListener("input", function () {
        skirmishConfig.budget = parseInt(this.value) || BUDGET_MAX_DEFAULT;
        document.getElementById("skBudgetVal").textContent = this.value;
      });
      skMapSize.addEventListener("change", function () { skirmishConfig.mapSize = this.value; });
      skTerrain.addEventListener("change", function () { skirmishConfig.terrainDensity = this.value; });
      skSeed.addEventListener("input", function () { skirmishConfig.seed = this.value.trim() || null; });
      document.getElementById("skTemplate").addEventListener("change", function () { skirmishConfig.template = this.value || null; });
      document.getElementById("btnSkirmishStart").addEventListener("click", startSkirmish);
      document.getElementById("btnSkirmishBack").addEventListener("click", hideSkirmishSettings);
    }
    if (btnContinueCampaign) btnContinueCampaign.addEventListener("click", function () {
      showSlotPicker("continue");
    });
    document.getElementById("btnSlotBack").addEventListener("click", function () {
      document.getElementById("slotPicker").classList.add("is-hidden");
    });

    budgetMax.textContent = String(budgetCurrent);
    showTitleScreen();
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
