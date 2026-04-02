/**
 * Geminus Ratio — Ludus tactics prototype
 * Phases: ludus (point buy) → deploy → battle (FFT-style CT, grid move/attack)
 */
(function () {
  "use strict";

  // Gesture prevention is scoped to the canvas in init() so the rest of the
  // page remains pinch-zoomable for accessibility.

  function _esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function abilityName(ab) {
    if (typeof I18n !== "undefined" && I18n.abilityName) return I18n.abilityName(ab);
    return ab && ab.name ? ab.name : "";
  }
  function abilityDesc(ab) {
    if (typeof I18n !== "undefined" && I18n.abilityDesc) return I18n.abilityDesc(ab);
    return ab && ab.desc ? ab.desc : "";
  }

  var BOARD_W = 12;
  var BOARD_H = 10;
  const MAX_ROSTER = 6;
  const BUDGET_MAX_DEFAULT = 140;
  var budgetCurrent = BUDGET_MAX_DEFAULT;

  var gameRng = Math.random;

  var DIFFICULTY = {
    easy:   { label: "Novice",    hpMul: 0.8, atkMul: 0.85, spdMul: 0.9, xpMul: 0.75, aiFocusFire: false },
    normal: { label: "Gladiator", hpMul: 1.0, atkMul: 1.0,  spdMul: 1.0, xpMul: 1.0,  aiFocusFire: true },
    hard:   { label: "Lanista",   hpMul: 1.3, atkMul: 1.2,  spdMul: 1.1, xpMul: 1.25, aiFocusFire: true },
  };

  function getDiff() { return DIFFICULTY[(campaignState.active ? campaignState.difficulty : null) || skirmishConfig.difficulty] || DIFFICULTY.normal; }
  function ngPlusScale(stat) {
    var ng = campaignState.newGamePlus || 0;
    if (ng <= 0) return 1;
    if (stat === "hp") return 1 + 0.2 * ng;
    if (stat === "atk") return 1 + 0.15 * ng;
    if (stat === "spd") return 1 + 0.05 * ng;
    return 1;
  }

  var _animSpeed = 1;
  var _ANIM_SPEEDS = [1, 2, 0];
  var _ANIM_LABELS = ["1×", "2×", "⚡"];
  try { var _savedSpeed = parseInt(localStorage.getItem("geminus_anim_speed"), 10); if (_ANIM_SPEEDS.indexOf(_savedSpeed) !== -1) _animSpeed = _savedSpeed; } catch (e) {}
  function adjDelay(ms) { return _animSpeed === 0 ? 0 : Math.round(ms / _animSpeed); }

  var skirmishConfig = {
    enemyCount: 3,
    budget: BUDGET_MAX_DEFAULT,
    mapSize: "medium",
    terrainDensity: "normal",
    seed: null,
    template: null,
    difficulty: "normal",
  };
  var lastSlotPickerMode = "new";
  var MAP_SIZES = { small: { w: 8, h: 7 }, medium: { w: 12, h: 10 }, large: { w: 14, h: 12 } };

  var ACCENT_COLORS = [
    { id: "gold", hex: "#e8c040" },
    { id: "crimson", hex: "#d84838" },
    { id: "teal", hex: "#48c8a8" },
    { id: "purple", hex: "#a878d8" },
    { id: "silver", hex: "#c0c0c0" },
    { id: "bronze", hex: "#c08848" },
  ];

  var EQUIPMENT_DB = [
    { id: "gladius_iron",    name: "Iron Gladius",     slot: "weapon",  rarity: "common",    cost: 12, mods: { atk: 2 } },
    { id: "gladius_steel",   name: "Steel Gladius",    slot: "weapon",  rarity: "common",    cost: 16, mods: { atk: 3 } },
    { id: "spatha_bronze",   name: "Bronze Spatha",    slot: "weapon",  rarity: "common",    cost: 14, mods: { atk: 2, spd: 1 } },
    { id: "falcata",         name: "Falcata",          slot: "weapon",  rarity: "rare",      cost: 22, mods: { atk: 4 } },
    { id: "pugio_venom",     name: "Venomed Pugio",    slot: "weapon",  rarity: "rare",      cost: 20, mods: { atk: 3, spd: 1 } },
    { id: "gladius_gold",    name: "Gilded Gladius",   slot: "weapon",  rarity: "legendary", cost: 35, mods: { atk: 5, spd: 1 } },
    { id: "hasta_mars",      name: "Hasta of Mars",    slot: "weapon",  rarity: "legendary", cost: 38, mods: { atk: 6 } },
    { id: "trident_neptune", name: "Neptune's Fork",   slot: "weapon",  rarity: "legendary", cost: 36, mods: { atk: 4, def: 2 } },
    { id: "scutum_oak",      name: "Oak Scutum",       slot: "armor",   rarity: "common",    cost: 10, mods: { def: 2 } },
    { id: "scutum_iron",     name: "Iron Scutum",      slot: "armor",   rarity: "common",    cost: 14, mods: { def: 3 } },
    { id: "lorica_leather",  name: "Leather Lorica",   slot: "armor",   rarity: "common",    cost: 12, mods: { def: 1, hp: 4 } },
    { id: "lorica_chain",    name: "Chain Lorica",     slot: "armor",   rarity: "rare",      cost: 22, mods: { def: 3, hp: 4 } },
    { id: "manica_steel",    name: "Steel Manica",     slot: "armor",   rarity: "rare",      cost: 18, mods: { def: 2, spd: 1 } },
    { id: "aegis_minerva",   name: "Aegis of Minerva", slot: "armor",   rarity: "legendary", cost: 35, mods: { def: 5, hp: 6 } },
    { id: "lorica_praetor",  name: "Praetorian Plate", slot: "armor",   rarity: "legendary", cost: 38, mods: { def: 4, hp: 8 } },
    { id: "sandals_mercury", name: "Mercury Sandals",  slot: "trinket", rarity: "rare",      cost: 20, mods: { spd: 2, move: 1 } },
    { id: "amulet_fortuna",  name: "Fortuna's Charm",  slot: "trinket", rarity: "common",    cost: 10, mods: { spd: 1 } },
    { id: "ring_vigor",      name: "Ring of Vigor",    slot: "trinket", rarity: "common",    cost: 12, mods: { hp: 6 } },
    { id: "belt_titan",      name: "Titan Belt",       slot: "trinket", rarity: "common",    cost: 14, mods: { hp: 4, def: 1 } },
    { id: "cloak_shadow",    name: "Shadow Cloak",     slot: "trinket", rarity: "rare",      cost: 18, mods: { spd: 2 } },
    { id: "gauntlets_fury",  name: "Gauntlets of Fury",slot: "trinket", rarity: "rare",      cost: 20, mods: { atk: 2, spd: 1 } },
    { id: "crown_sol",       name: "Crown of Sol",     slot: "trinket", rarity: "legendary", cost: 32, mods: { atk: 2, def: 2, spd: 1 } },
    { id: "torc_war",        name: "War Torc",         slot: "trinket", rarity: "legendary", cost: 30, mods: { atk: 3, hp: 5 } },
    { id: "helm_centurion",  name: "Centurion Helm",   slot: "armor",   rarity: "rare",      cost: 20, mods: { def: 2, hp: 6 } },
    { id: "dagger_shade",    name: "Shade Dagger",     slot: "weapon",  rarity: "rare",      cost: 18, mods: { atk: 3, move: 1 } },
    { id: "shield_titan",    name: "Titan Shield",     slot: "armor",   rarity: "common",    cost: 15, mods: { def: 2, hp: 2 } },
    { id: "greaves_wind",    name: "Windrunner Greaves",slot: "trinket", rarity: "rare",     cost: 22, mods: { move: 1, spd: 2 } },
    { id: "spear_achilles",  name: "Spear of Achilles",slot: "weapon",  rarity: "legendary", cost: 40, mods: { atk: 5, move: 1 } },
  ];
  var _equipById = {};
  (function() { for (var i = 0; i < EQUIPMENT_DB.length; i++) _equipById[EQUIPMENT_DB[i].id] = EQUIPMENT_DB[i]; })();

  function equipMod(unit, stat) {
    if (!unit.equipment) return 0;
    var total = 0;
    var slots = ["weapon", "armor", "trinket"];
    for (var i = 0; i < slots.length; i++) {
      var eid = unit.equipment[slots[i]];
      if (eid && _equipById[eid]) total += (_equipById[eid].mods[stat] || 0);
    }
    return total;
  }

  var AI_PROFILES = {
    balanced:  { targetPref: "closest",   retreatPct: 0.15, abilityBias: 0.4, label: "Balanced" },
    berserker: { targetPref: "weakest",   retreatPct: 0,    abilityBias: 0.2, label: "Berserker" },
    tactician: { targetPref: "strongest", retreatPct: 0.25, abilityBias: 0.7, label: "Tactician" },
    assassin:  { targetPref: "lowest_hp", retreatPct: 0.2,  abilityBias: 0.5, label: "Assassin" },
    guardian:  { targetPref: "closest",   retreatPct: 0.3,  abilityBias: 0.8, label: "Guardian" },
  };
  var _aiProfileKeys = Object.keys(AI_PROFILES);

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
    return available[Math.floor(gameRng() * available.length)];
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
        { aid: "murmillo_cetus_wall", name: "Cetus Wall", desc: "Brace: next hit deals half damage.", type: "buff", target: "self", levelReq: 1 },
        { aid: "murmillo_testudo", name: "Testudo", desc: "+3 DEF until next turn.", type: "buff", target: "self", levelReq: 2 },
        { aid: "murmillo_aegis_slam", name: "Aegis Slam", desc: "0.6× hit + stun foe 1 turn.", type: "attack", target: "adjacent_enemy", mult: 0.6, effect: "stun", levelReq: 3 },
        { aid: "murmillo_iron_will", name: "Iron Will", desc: "Heal 15% HP + cleanse root.", type: "heal", target: "self", levelReq: 4 },
        { aid: "murmillo_fortress_stance", name: "Fortress Stance", desc: "+4 DEF 2 turns; rooted 1 turn.", type: "buff", target: "self", levelReq: 5 },
        { aid: "murmillo_guardian_aura", name: "Guardian Aura", desc: "All adjacent allies heal 5 HP.", type: "heal", target: "self", levelReq: 6 },
      ],
    },
    {
      id: "retiarius", name: "Retiarius", role: "Skirmisher — trident & net",
      cost: 24, hp: 28, atk: 10, def: 3, spd: 9, move: 4, jump: 2,
      growth: { hp: 250, atk: 40, def: 20, spd: 60 },
      abilities: [
        { aid: "retiarius_iaculum", name: "Iaculum", desc: "Net an adjacent foe (skip their next turn).", type: "debuff", target: "adjacent_enemy", levelReq: 1 },
        { aid: "retiarius_trident_lunge", name: "Trident Lunge", desc: "Range-2 line attack for 0.8× damage.", type: "attack", target: "line", range: 2, mult: 0.8, levelReq: 2 },
        { aid: "retiarius_tide_pull", name: "Tide Pull", desc: "Pull adjacent foe 1 tile toward you.", type: "utility", target: "adjacent_enemy", effect: "pull", levelReq: 3 },
        { aid: "retiarius_entangle", name: "Entangle", desc: "Root + −2 ATK (2 turns) to foe.", type: "debuff", target: "adjacent_enemy", effect: "entangle", levelReq: 4 },
        { aid: "retiarius_neptunes_favor", name: "Neptune's Favor", desc: "Heal 20% HP + Move +1.", type: "heal", target: "self", levelReq: 5 },
        { aid: "retiarius_drag_under", name: "Drag Under", desc: "Pull foe + deal 1.0× damage.", type: "attack", target: "adjacent_enemy", mult: 1.0, effect: "drag", levelReq: 6 },
      ],
    },
    {
      id: "secutor", name: "Secutor", role: "Hunter — pursues the nimble",
      cost: 26, hp: 32, atk: 12, def: 4, spd: 8, move: 4, jump: 1,
      growth: { hp: 300, atk: 45, def: 30, spd: 50 },
      abilities: [
        { aid: "secutor_umbra", name: "Umbra", desc: "Move +1 this turn.", type: "buff", target: "self", levelReq: 1 },
        { aid: "secutor_pursuit", name: "Pursuit", desc: "Adjacent strike for 1.25× if foe present.", type: "attack", target: "adjacent_enemy", mult: 1.25, levelReq: 2 },
        { aid: "secutor_blind_rush", name: "Blind Rush", desc: "+2 ATK this action, −2 DEF until next turn.", type: "buff", target: "self", levelReq: 3 },
        { aid: "secutor_battle_focus", name: "Battle Focus", desc: "Next attack +25% hit chance.", type: "buff", target: "self", levelReq: 4 },
        { aid: "secutor_relentless", name: "Relentless", desc: "Range-2 line dash + 0.8× strike.", type: "attack", target: "line", range: 2, mult: 0.8, levelReq: 5 },
        { aid: "secutor_hunters_mark", name: "Hunter's Mark", desc: "Foe takes +3 dmg from all for 2 turns.", type: "debuff", target: "adjacent_enemy", effect: "huntermark", levelReq: 6 },
      ],
    },
    {
      id: "thraex", name: "Thraex", role: "Duelist — sica & parmula",
      cost: 22, hp: 30, atk: 13, def: 3, spd: 7, move: 3, jump: 2,
      growth: { hp: 250, atk: 60, def: 20, spd: 50 },
      abilities: [
        { aid: "thraex_sica_riposte", name: "Sica Riposte", desc: "Counter next melee hit for 5 true damage.", type: "buff", target: "self", levelReq: 1 },
        { aid: "thraex_curved_strike", name: "Curved Strike", desc: "Attack ignoring 50% of DEF.", type: "attack", target: "adjacent_enemy", mult: 1, ignoreDefPct: 0.5, levelReq: 2 },
        { aid: "thraex_bleeding_arc", name: "Bleeding Arc", desc: "1.1× hit + 3 bleed (1/turn for 3 turns).", type: "attack", target: "adjacent_enemy", mult: 1.1, effect: "bleed", levelReq: 3 },
        { aid: "thraex_parry", name: "Parry", desc: "Next hit halved, counter 3 dmg.", type: "buff", target: "self", levelReq: 4 },
        { aid: "thraex_crimson_dance", name: "Crimson Dance", desc: "1.3× hit, heal 25% of damage.", type: "attack", target: "adjacent_enemy", mult: 1.3, effect: "lifesteal", steal: 0.25, levelReq: 5 },
        { aid: "thraex_blade_storm", name: "Blade Storm", desc: "Hit all adjacent foes for 1.0×.", type: "attack", target: "aoe_adjacent", mult: 1.0, levelReq: 6 },
      ],
    },
    {
      id: "hoplomachus", name: "Hoplomachus", role: "Lancer — hasta & small shield",
      cost: 25, hp: 30, atk: 12, def: 4, spd: 7, move: 3, jump: 1,
      growth: { hp: 300, atk: 50, def: 35, spd: 30 },
      abilities: [
        { aid: "hoplomachus_hasta_impetus", name: "Hasta Impetus", desc: "Line thrust (range 3) for 1.25× damage.", type: "attack", target: "line", range: 3, mult: 1.25, levelReq: 1 },
        { aid: "hoplomachus_shield_bash", name: "Shield Bash", desc: "0.5× damage + push foe 1 tile.", type: "attack", target: "adjacent_enemy", mult: 0.5, effect: "push", levelReq: 2 },
        { aid: "hoplomachus_phalanx_guard", name: "Phalanx Guard", desc: "Adjacent allies gain +2 DEF this round.", type: "buff", target: "self", levelReq: 3 },
        { aid: "hoplomachus_spear_brace", name: "Spear Brace", desc: "Next melee attacker takes 4 counter dmg.", type: "buff", target: "self", levelReq: 4 },
        { aid: "hoplomachus_piercing_thrust", name: "Piercing Thrust", desc: "Range-2 line, 1.0× ignoring all DEF.", type: "attack", target: "line", range: 2, mult: 1.0, ignoreDefPct: 1.0, levelReq: 5 },
        { aid: "hoplomachus_phalanx_advance", name: "Phalanx Advance", desc: "Allies: +2 ATK, +1 Move this turn.", type: "buff", target: "self", levelReq: 6 },
      ],
    },
    {
      id: "dimachaerus", name: "Dimachaerus", role: "Blademaster — twin swords",
      cost: 30, hp: 29, atk: 14, def: 2, spd: 8, move: 4, jump: 2,
      growth: { hp: 200, atk: 70, def: 10, spd: 60 },
      abilities: [
        { aid: "dimachaerus_ferrum_cyclone", name: "Ferrum Cyclone", desc: "Hit all adjacent foes for 0.7×.", type: "attack", target: "aoe_adjacent", mult: 0.7, levelReq: 1 },
        { aid: "dimachaerus_twin_slash", name: "Twin Slash", desc: "1.4× single target, costs 3 HP.", type: "attack", target: "adjacent_enemy", mult: 1.4, selfDamage: 3, levelReq: 2 },
        { aid: "dimachaerus_shadow_step", name: "Shadow Step", desc: "Teleport to a tile within range 2.", type: "buff", target: "self", levelReq: 3 },
        { aid: "dimachaerus_evasion", name: "Evasion", desc: "+3 DEF until next turn.", type: "buff", target: "self", levelReq: 4 },
        { aid: "dimachaerus_blood_dance", name: "Blood Dance", desc: "1.5× hit, heal 30% of damage.", type: "attack", target: "adjacent_enemy", mult: 1.5, effect: "lifesteal", steal: 0.3, levelReq: 5 },
        { aid: "dimachaerus_whirlwind_fury", name: "Whirlwind Fury", desc: "1.2× all adjacent + teleport 1.", type: "attack", target: "aoe_adjacent", mult: 1.2, effect: "whirlwind", levelReq: 6 },
      ],
    },
    {
      id: "provocator", name: "Provocator", role: "Champion — provocatio rite",
      cost: 27, hp: 34, atk: 10, def: 5, spd: 6, move: 3, jump: 1,
      growth: { hp: 350, atk: 30, def: 50, spd: 25 },
      abilities: [
        { aid: "provocator_provocatio", name: "Provocatio", desc: "Mark foe: −4 ATK vs others for 2 turns.", type: "debuff", target: "adjacent_enemy", levelReq: 1 },
        { aid: "provocator_rally", name: "Rally", desc: "Self-heal 20% of max HP.", type: "heal", target: "self", levelReq: 2 },
        { aid: "provocator_arena_salute", name: "Arena Salute", desc: "Cleanse all debuffs from self.", type: "buff", target: "self", levelReq: 3 },
        { aid: "provocator_inspiring_presence", name: "Inspiring Presence", desc: "Adjacent allies +2 ATK this turn.", type: "buff", target: "self", levelReq: 4 },
        { aid: "provocator_guardians_oath", name: "Guardian's Oath", desc: "Intercept next hit on adjacent ally.", type: "buff", target: "self", levelReq: 5 },
        { aid: "provocator_champions_resolve", name: "Champion's Resolve", desc: "Full heal (once per battle).", type: "heal", target: "self", levelReq: 6 },
      ],
    },
    {
      id: "samnite", name: "Samnite", role: "Veteran — early Italic kit",
      cost: 23, hp: 33, atk: 11, def: 4, spd: 6, move: 3, jump: 1,
      growth: { hp: 350, atk: 35, def: 50, spd: 25 },
      abilities: [
        { aid: "samnite_samnis_press", name: "Samnis Press", desc: "Shove adjacent foe 1 tile.", type: "utility", target: "adjacent_enemy", effect: "push", levelReq: 1 },
        { aid: "samnite_veterans_blow", name: "Veteran's Blow", desc: "1.3× damage, costs 5 HP.", type: "attack", target: "adjacent_enemy", mult: 1.3, selfDamage: 5, levelReq: 2 },
        { aid: "samnite_war_cry", name: "War Cry", desc: "Adjacent foes get −2 ATK for 2 turns.", type: "debuff", target: "self", levelReq: 3 },
        { aid: "samnite_battle_hardened", name: "Battle Hardened", desc: "+2 DEF, +1 ATK for 2 turns.", type: "buff", target: "self", levelReq: 4 },
        { aid: "samnite_intimidating_roar", name: "Intimidating Roar", desc: "All adjacent enemies rooted 1 turn.", type: "debuff", target: "self", levelReq: 5 },
        { aid: "samnite_veterans_fury", name: "Veteran's Fury", desc: "1.5× hit + push 2 tiles.", type: "attack", target: "adjacent_enemy", mult: 1.5, effect: "push2", levelReq: 6 },
      ],
    },
    {
      id: "sagittarius", name: "Sagittarius", role: "Archer — composite bow",
      cost: 22, hp: 25, atk: 11, def: 2, spd: 9, move: 3, jump: 2,
      growth: { hp: 200, atk: 50, def: 15, spd: 60 },
      abilities: [
        { aid: "sagittarius_volley", name: "Volley", desc: "Range-4 line shot for 0.7×.", type: "attack", target: "line", range: 4, mult: 0.7, levelReq: 1 },
        { aid: "sagittarius_pin_shot", name: "Pin Shot", desc: "0.6× hit + root foe 1 turn.", type: "attack", target: "adjacent_enemy", mult: 0.6, effect: "stun", levelReq: 2 },
        { aid: "sagittarius_high_ground", name: "High Ground", desc: "+15% hit on next attack.", type: "buff", target: "self", levelReq: 3 },
        { aid: "sagittarius_poison_arrow", name: "Poison Arrow", desc: "0.5× + 3 bleed (1/turn, 3 turns).", type: "attack", target: "adjacent_enemy", mult: 0.5, effect: "bleed", levelReq: 4 },
        { aid: "sagittarius_suppressing_fire", name: "Suppressing Fire", desc: "Range-2 line, 3 true dmg (pierces).", type: "attack", target: "line", range: 2, mult: 0, effect: "suppress", levelReq: 5 },
        { aid: "sagittarius_eagle_eye", name: "Eagle Eye", desc: "Next 2 attacks cannot miss.", type: "buff", target: "self", levelReq: 6 },
      ],
    },
    {
      id: "essedarius", name: "Essedarius", role: "Chariot Fighter — mobile brawler",
      cost: 26, hp: 30, atk: 12, def: 3, spd: 7, move: 5, jump: 1,
      growth: { hp: 300, atk: 40, def: 20, spd: 55 },
      abilities: [
        { aid: "essedarius_charge", name: "Charge", desc: "Range-2 line dash + 1.3× hit.", type: "attack", target: "line", range: 2, mult: 1.3, effect: "charge", levelReq: 1 },
        { aid: "essedarius_wheel_strike", name: "Wheel Strike", desc: "Hit all adjacent foes for 0.6×.", type: "attack", target: "aoe_adjacent", mult: 0.6, levelReq: 2 },
        { aid: "essedarius_rally_charge", name: "Rally Charge", desc: "Move +2 this turn.", type: "buff", target: "self", levelReq: 3 },
        { aid: "essedarius_momentum", name: "Momentum", desc: "Passive: +3 ATK after moving 3+ tiles.", type: "passive", target: "self", levelReq: 4 },
        { aid: "essedarius_trample", name: "Trample", desc: "Range-3 line, 0.6× each foe in line.", type: "attack", target: "line", range: 3, mult: 0.6, effect: "trample", levelReq: 5 },
        { aid: "essedarius_war_chariot", name: "War Chariot", desc: "Range-3 charge + 1.5× on target.", type: "attack", target: "line", range: 3, mult: 1.5, effect: "charge", levelReq: 6 },
      ],
    },
    {
      id: "umbra", name: "Umbra", role: "Shadow Acolyte — cult-touched",
      cost: 28, hp: 27, atk: 12, def: 3, spd: 8, move: 4, jump: 2,
      growth: { hp: 220, atk: 50, def: 15, spd: 65 },
      abilities: [
        { aid: "umbra_dark_grasp", name: "Dark Grasp", desc: "0.9× hit, steal 3 HP.", type: "attack", target: "adjacent_enemy", mult: 0.9, effect: "lifesteal", steal: 3, levelReq: 1 },
        { aid: "umbra_phase_walk", name: "Phase Walk", desc: "Teleport within range 3.", type: "buff", target: "self", levelReq: 2 },
        { aid: "umbra_dread_whisper", name: "Dread Whisper", desc: "Debuff: foe −3 ATK for 2 turns.", type: "debuff", target: "adjacent_enemy", effect: "atkdebuff", debuffTurns: 2, debuffAmt: 3, levelReq: 3 },
        { aid: "umbra_shadow_mend", name: "Shadow Mend", desc: "Heal 25% HP; −2 ATK 1 turn.", type: "heal", target: "self", levelReq: 4 },
        { aid: "umbra_void_burst", name: "Void Burst", desc: "0.8× adj foes + steal 2 HP each.", type: "attack", target: "aoe_adjacent", mult: 0.8, effect: "voidburst", levelReq: 5 },
        { aid: "umbra_abyssal_gate", name: "Abyssal Gate", desc: "Teleport adjacent ally within range 3.", type: "buff", target: "adjacent_ally", levelReq: 6 },
      ],
    },
    {
      id: "vestige", name: "Vestige", role: "Dis Pater's Remnant — undead echo",
      cost: 30, hp: 32, atk: 13, def: 3, spd: 6, move: 3, jump: 1,
      growth: { hp: 400, atk: 50, def: 25, spd: 15 },
      abilities: [
        { aid: "vestige_revenant_strike", name: "Revenant Strike", desc: "1.2× hit, heal 25% of damage.", type: "attack", target: "adjacent_enemy", mult: 1.2, effect: "lifesteal", levelReq: 1 },
        { aid: "vestige_grave_pulse", name: "Grave Pulse", desc: "4 true dmg to all adjacent foes, costs 5 HP.", type: "attack", target: "aoe_adjacent", mult: 0, effect: "grave_pulse", selfDamage: 5, levelReq: 2 },
        { aid: "vestige_second_wind", name: "Second Wind", desc: "Passive: revive once at 25% HP.", type: "passive", target: "self", levelReq: 3 },
        { aid: "vestige_unholy_resilience", name: "Unholy Resilience", desc: "+3 DEF for 2 turns.", type: "buff", target: "self", levelReq: 4 },
        { aid: "vestige_soul_drain", name: "Soul Drain", desc: "1.0× hit, heal 50% of damage.", type: "attack", target: "adjacent_enemy", mult: 1.0, effect: "lifesteal", steal: 0.5, levelReq: 5 },
        { aid: "vestige_deaths_embrace", name: "Death's Embrace", desc: "6 true dmg adj foes, heal total.", type: "attack", target: "aoe_adjacent", mult: 0, effect: "deathembrace", levelReq: 6 },
      ],
    },
  ];

  var CLASS_PROMOTIONS = {
    murmillo: [
      { id: "centurion", name: "Centurion", statBonus: { hp: 8, def: 3 },
        abilities: [
          { aid: "centurion_legion_wall", name: "Legion Wall", desc: "Adjacent allies gain +2 DEF for 2 turns.", type: "buff", target: "self", levelReq: 5 },
          { aid: "centurion_imperium", name: "Imperium", desc: "AoE 1.0\u00d7 hit to all adjacent enemies.", type: "attack", target: "aoe_adjacent", mult: 1.0, levelReq: 6 },
        ] },
      { id: "praetorian", name: "Praetorian", statBonus: { hp: 4, atk: 2, def: 1 },
        abilities: [
          { aid: "praetorian_defiant_counter", name: "Defiant Counter", desc: "Riposte: counter next 2 melee hits.", type: "buff", target: "self", levelReq: 5 },
          { aid: "praetorian_unyielding", name: "Unyielding", desc: "Heal 20% HP; immune to debuffs 1 turn.", type: "heal", target: "self", levelReq: 6 },
        ] },
    ],
    retiarius: [
      { id: "laquearius", name: "Laquearius", statBonus: { spd: 3, atk: 1 },
        abilities: [
          { aid: "laquearius_lasso_snare", name: "Lasso Snare", desc: "Range-3 root + pull 1 tile.", type: "debuff", target: "line", range: 3, effect: "pull", levelReq: 5 },
          { aid: "laquearius_triple_tide", name: "Triple Tide", desc: "Hit 3 tiles in a line for 0.7\u00d7 each.", type: "attack", target: "line", range: 3, mult: 0.7, levelReq: 6 },
        ] },
      { id: "pontarius", name: "Pontarius", statBonus: { hp: 5, def: 2 },
        abilities: [
          { aid: "pontarius_bridgekeeper", name: "Bridgekeeper", desc: "+3 DEF and heal 5 HP.", type: "buff", target: "self", levelReq: 5 },
          { aid: "pontarius_cascade", name: "Cascade", desc: "Push all adjacent foes 2 tiles.", type: "utility", target: "self", effect: "push2", levelReq: 6 },
        ] },
    ],
    secutor: [
      { id: "contraretiarius", name: "Contraretiarius", statBonus: { atk: 3, spd: 1 },
        abilities: [
          { aid: "contraretiarius_net_cutter", name: "Net Cutter", desc: "Cleanse root/stun + 1.2\u00d7 strike.", type: "attack", target: "adjacent_enemy", mult: 1.2, effect: "cleanse_self", levelReq: 5 },
          { aid: "contraretiarius_pursue_finish", name: "Pursue & Finish", desc: "Dash 2 tiles + 1.4\u00d7 hit if foe below 40% HP.", type: "attack", target: "line", range: 2, mult: 1.4, levelReq: 6 },
        ] },
      { id: "scissor", name: "Scissor", statBonus: { def: 2, hp: 4 },
        abilities: [
          { aid: "scissor_crescent_guard", name: "Crescent Guard", desc: "+4 DEF until next turn, counter 3 dmg.", type: "buff", target: "self", levelReq: 5 },
          { aid: "scissor_scissor_rend", name: "Scissor Rend", desc: "1.3\u00d7 hit ignoring 30% DEF.", type: "attack", target: "adjacent_enemy", mult: 1.3, ignoreDefPct: 0.3, levelReq: 6 },
        ] },
    ],
    thraex: [
      { id: "hoplomachus_thraex", name: "Myrmex", statBonus: { atk: 4, spd: 1 },
        abilities: [
          { aid: "myrmex_scorpion_sting", name: "Scorpion Sting", desc: "1.4\u00d7 hit + bleed 4 (2 turns).", type: "attack", target: "adjacent_enemy", mult: 1.4, effect: "bleed", levelReq: 5 },
          { aid: "myrmex_frenzy", name: "Frenzy", desc: "Attack twice at 0.7\u00d7 each.", type: "attack", target: "adjacent_enemy", mult: 0.7, effect: "double_strike", levelReq: 6 },
        ] },
      { id: "veles_thraex", name: "Veles", statBonus: { spd: 3, move: 1 },
        abilities: [
          { aid: "veles_javelin_toss", name: "Javelin Toss", desc: "Range-3 line shot for 0.9\u00d7.", type: "attack", target: "line", range: 3, mult: 0.9, levelReq: 5 },
          { aid: "veles_skirmish_dance", name: "Skirmish Dance", desc: "Attack + teleport 2 tiles away.", type: "attack", target: "adjacent_enemy", mult: 1.0, effect: "teleport_back", levelReq: 6 },
        ] },
    ],
    hoplomachus: [
      { id: "hoplite", name: "Hoplite", statBonus: { def: 3, hp: 5 },
        abilities: [
          { aid: "hoplite_shield_wall", name: "Shield Wall", desc: "Adjacent allies +3 DEF for 2 turns.", type: "buff", target: "self", levelReq: 5 },
          { aid: "hoplite_spartan_thrust", name: "Spartan Thrust", desc: "Range-3 line 1.3\u00d7 + push 1.", type: "attack", target: "line", range: 3, mult: 1.3, effect: "push", levelReq: 6 },
        ] },
      { id: "peltast", name: "Peltast", statBonus: { atk: 2, spd: 2, move: 1 },
        abilities: [
          { aid: "peltast_javelin_barrage", name: "Javelin Barrage", desc: "Range-4 line 0.8\u00d7 + bleed 2.", type: "attack", target: "line", range: 4, mult: 0.8, effect: "bleed", levelReq: 5 },
          { aid: "peltast_hit_and_run", name: "Hit and Run", desc: "1.1\u00d7 hit + move 2 tiles back.", type: "attack", target: "adjacent_enemy", mult: 1.1, effect: "teleport_back", levelReq: 6 },
        ] },
    ],
    dimachaerus: [
      { id: "gladiatrix", name: "Gladiatrix", statBonus: { atk: 3, spd: 2 },
        abilities: [
          { aid: "gladiatrix_whirling_blades", name: "Whirling Blades", desc: "1.2\u00d7 all adjacent + heal 3 per hit.", type: "attack", target: "aoe_adjacent", mult: 1.2, effect: "lifesteal", steal: 3, levelReq: 5 },
          { aid: "gladiatrix_perfect_strike", name: "Perfect Strike", desc: "1.8\u00d7 single hit, cannot miss.", type: "attack", target: "adjacent_enemy", mult: 1.8, alwaysHit: true, levelReq: 6 },
        ] },
      { id: "rudiarius", name: "Rudiarius", statBonus: { hp: 6, def: 2 },
        abilities: [
          { aid: "rudiarius_veterans_wisdom", name: "Veteran's Wisdom", desc: "Heal 30% HP + cleanse all debuffs.", type: "heal", target: "self", levelReq: 5 },
          { aid: "rudiarius_freedoms_edge", name: "Freedom's Edge", desc: "1.5\u00d7 hit; if kill, +1 Move next turn.", type: "attack", target: "adjacent_enemy", mult: 1.5, levelReq: 6 },
        ] },
    ],
    provocator: [
      { id: "primus_palus", name: "Primus Palus", statBonus: { hp: 6, atk: 2 },
        abilities: [
          { aid: "primus_palus_champion_duel", name: "Champion Duel", desc: "Mark foe: both deal +20% vs each other.", type: "debuff", target: "adjacent_enemy", effect: "duel", levelReq: 5 },
          { aid: "primus_palus_crowds_favor", name: "Crowd's Favor", desc: "Full heal + +3 ATK for 2 turns (once/battle).", type: "heal", target: "self", levelReq: 6 },
        ] },
      { id: "tertiarius", name: "Tertiarius", statBonus: { def: 3, hp: 4 },
        abilities: [
          { aid: "tertiarius_hold_the_line", name: "Hold the Line", desc: "Intercept all hits on adjacent allies 1 turn.", type: "buff", target: "self", levelReq: 5 },
          { aid: "tertiarius_last_stand", name: "Last Stand", desc: "+5 ATK, +5 DEF when below 30% HP.", type: "buff", target: "self", levelReq: 6 },
        ] },
    ],
    samnite: [
      { id: "secutor_sam", name: "Legionary", statBonus: { hp: 5, atk: 2, def: 1 },
        abilities: [
          { aid: "legionary_pilum_throw", name: "Pilum Throw", desc: "Range-3 line 1.0\u00d7 + \u22122 DEF on foe 2 turns.", type: "attack", target: "line", range: 3, mult: 1.0, effect: "defdebuff", levelReq: 5 },
          { aid: "legionary_testudo_march", name: "Testudo March", desc: "+4 DEF, +2 Move for 1 turn.", type: "buff", target: "self", levelReq: 6 },
        ] },
      { id: "velite", name: "Velite", statBonus: { spd: 3, move: 1 },
        abilities: [
          { aid: "velite_skirmish_throw", name: "Skirmish Throw", desc: "Range-2 line 0.9\u00d7 + root 1 turn.", type: "attack", target: "line", range: 2, mult: 0.9, effect: "stun", levelReq: 5 },
          { aid: "velite_guerrilla", name: "Guerrilla", desc: "Teleport 3 tiles + stealth 1 turn.", type: "buff", target: "self", levelReq: 6 },
        ] },
    ],
    sagittarius: [
      { id: "arcuballista", name: "Arcuballista", statBonus: { atk: 4 },
        abilities: [
          { aid: "arcuballista_siege_shot", name: "Siege Shot", desc: "Range-5 line 1.2\u00d7, ignores 50% DEF.", type: "attack", target: "line", range: 5, mult: 1.2, ignoreDefPct: 0.5, levelReq: 5 },
          { aid: "arcuballista_rain_of_arrows", name: "Rain of Arrows", desc: "3\u00d73 AoE at range 3, 0.5\u00d7 each.", type: "attack", target: "aoe_range", range: 3, mult: 0.5, levelReq: 6 },
        ] },
      { id: "venator", name: "Venator", statBonus: { spd: 2, move: 1, hp: 3 },
        abilities: [
          { aid: "venator_beast_trap", name: "Beast Trap", desc: "Place trap on tile; next foe stepping takes 6 dmg + root.", type: "utility", target: "self", levelReq: 5 },
          { aid: "venator_marked_prey", name: "Marked Prey", desc: "Target takes +3 dmg from all attacks for 2 turns.", type: "debuff", target: "adjacent_enemy", effect: "huntermark", levelReq: 6 },
        ] },
    ],
    essedarius: [
      { id: "cataphract", name: "Cataphract", statBonus: { hp: 6, def: 2 },
        abilities: [
          { aid: "cataphract_armored_charge", name: "Armored Charge", desc: "Range-3 line 1.4\u00d7 + push 2 tiles.", type: "attack", target: "line", range: 3, mult: 1.4, effect: "push2", levelReq: 5 },
          { aid: "cataphract_iron_rampart", name: "Iron Rampart", desc: "+5 DEF for 2 turns; rooted.", type: "buff", target: "self", levelReq: 6 },
        ] },
      { id: "auriga", name: "Auriga", statBonus: { spd: 3, atk: 1, move: 1 },
        abilities: [
          { aid: "auriga_chariot_rush", name: "Chariot Rush", desc: "Dash 4 tiles + 1.0\u00d7 each foe in path.", type: "attack", target: "line", range: 4, mult: 1.0, effect: "trample", levelReq: 5 },
          { aid: "auriga_reins_of_war", name: "Reins of War", desc: "+3 ATK, +2 Move for 1 turn.", type: "buff", target: "self", levelReq: 6 },
        ] },
    ],
    umbra: [
      { id: "noctis", name: "Noctis", statBonus: { atk: 3, spd: 2 },
        abilities: [
          { aid: "noctis_shadow_reap", name: "Shadow Reap", desc: "1.5\u00d7 hit + steal 5 HP.", type: "attack", target: "adjacent_enemy", mult: 1.5, effect: "lifesteal", steal: 5, levelReq: 5 },
          { aid: "noctis_nightmare", name: "Nightmare", desc: "All adjacent foes \u22123 ATK, \u22122 SPD for 2 turns.", type: "debuff", target: "self", levelReq: 6 },
        ] },
      { id: "augur", name: "Augur", statBonus: { hp: 5, def: 1, spd: 1 },
        abilities: [
          { aid: "augur_prophecy", name: "Prophecy", desc: "Heal adjacent ally 30% + cleanse.", type: "heal", target: "adjacent_ally", levelReq: 5 },
          { aid: "augur_fates_thread", name: "Fate's Thread", desc: "Swap HP% with target foe.", type: "utility", target: "adjacent_enemy", effect: "hpswap", levelReq: 6 },
        ] },
    ],
    vestige: [
      { id: "lich", name: "Lich", statBonus: { atk: 4, hp: 3 },
        abilities: [
          { aid: "lich_soul_siphon", name: "Soul Siphon", desc: "1.3\u00d7 hit + heal 50% of damage.", type: "attack", target: "adjacent_enemy", mult: 1.3, effect: "lifesteal", steal: 0.5, levelReq: 5 },
          { aid: "lich_army_of_dead", name: "Army of the Dead", desc: "Summon 2 skeletal allies (1 HP, 5 ATK) for 3 turns.", type: "summon", target: "self", levelReq: 6 },
        ] },
      { id: "revenant", name: "Revenant", statBonus: { hp: 8, def: 2 },
        abilities: [
          { aid: "revenant_undying_will", name: "Undying Will", desc: "Survive lethal hit at 1 HP (once/battle).", type: "passive", target: "self", levelReq: 5 },
          { aid: "revenant_death_knell", name: "Death Knell", desc: "1.6\u00d7 hit; +0.4\u00d7 if below 25% HP.", type: "attack", target: "adjacent_enemy", mult: 1.6, levelReq: 6 },
        ] },
    ],
  };

  var _promotionIndex = {};
  (function() {
    for (var cls in CLASS_PROMOTIONS) {
      var promos = CLASS_PROMOTIONS[cls];
      for (var i = 0; i < promos.length; i++) {
        _promotionIndex[promos[i].id] = { classId: cls, promo: promos[i] };
      }
    }
  })();

  function getPromotion(promotionId) {
    var entry = _promotionIndex[promotionId];
    return entry ? entry.promo : null;
  }

  function classById(id) {
    const c = GLADIATOR_CLASSES.find((g) => g.id === id);
    if (!c) throw new Error("Unknown gladiator class: " + id);
    return c;
  }

  function displayClassById(id) {
    var c = classById(id);
    if (typeof I18n !== "undefined" && I18n.localizeClassDef) return I18n.localizeClassDef(c);
    return c;
  }

  function collectPendingPromotions() {
    var eligible = [];
    var playerUnits = state.units.filter(function(u) { return u.team === "player" && u.hp > 0; });
    for (var i = 0; i < playerUnits.length; i++) {
      var u = playerUnits[i];
      if ((u.level || 1) >= 5 && !u.promotionId && CLASS_PROMOTIONS[u.classId]) {
        eligible.push(u);
      }
    }
    return eligible;
  }

  function showPromotionChoice(unit, callback) {
    var overlay = document.getElementById("promoOverlay");
    var unitLabel = document.getElementById("promoUnit");
    var choicesEl = document.getElementById("promoChoices");
    var cDef = classById(unit.classId);
    var promos = CLASS_PROMOTIONS[unit.classId];
    if (!promos || promos.length === 0) { callback(); return; }

    unitLabel.textContent = (unit.displayName || cDef.name) + " has reached Level 5!";
    choicesEl.innerHTML = "";

    for (var i = 0; i < promos.length; i++) {
      (function(promo) {
        var card = document.createElement("button");
        card.className = "promo-card";
        card.type = "button";

        var statParts = [];
        if (promo.statBonus.hp) statParts.push("+" + promo.statBonus.hp + " HP");
        if (promo.statBonus.atk) statParts.push("+" + promo.statBonus.atk + " ATK");
        if (promo.statBonus.def) statParts.push("+" + promo.statBonus.def + " DEF");
        if (promo.statBonus.spd) statParts.push("+" + promo.statBonus.spd + " SPD");
        if (promo.statBonus.move) statParts.push("+" + promo.statBonus.move + " MOV");

        var html = '<div class="promo-card__name">' + _esc(promo.name) + '</div>';
        html += '<div class="promo-card__stats">' + statParts.join(", ") + '</div>';
        for (var j = 0; j < promo.abilities.length; j++) {
          html += '<div class="promo-card__ability">' + _esc(abilityName(promo.abilities[j])) + ': ' + _esc(abilityDesc(promo.abilities[j])) + '</div>';
        }
        card.innerHTML = html;

        card.addEventListener("click", function() {
          unit.promotionId = promo.id;
          unit.promoStatBonus = promo.statBonus;
          if (promo.statBonus.hp) { unit.maxHp += promo.statBonus.hp; unit.hp = Math.min(unit.hp + promo.statBonus.hp, unit.maxHp); }
          if (promo.statBonus.move) { unit.giftedMove = (unit.giftedMove || cDef.move) + promo.statBonus.move; }

          var matchPick = state.picks.find(function(p) { return p.uid === unit.uid; });
          if (matchPick) {
            matchPick.promotionId = promo.id;
          }

          overlay.classList.add("is-hidden");
          releaseFocusTrap();
          log((unit.displayName || cDef.name) + " promoted to " + promo.name + "!", "system");
          callback();
        });
        choicesEl.appendChild(card);
      })(promos[i]);
    }
    overlay.classList.remove("is-hidden");
    trapFocus(overlay);
  }

  function processPromotionQueue(units, index, callback) {
    if (index >= units.length) { callback(); return; }
    showPromotionChoice(units[index], function() {
      processPromotionQueue(units, index + 1, callback);
    });
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

  function appendSpriteGradients(defs, team, uid, accentOverride) {
    const p = TEAM_PAL[team];
    var accent = accentOverride || p.accent;
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
    addLinearGradient(defs, uid + "-gaccent", accent, p.main);
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

  function gladiatorSpriteSvg(classId, team, uniqueId, accentHex) {
    const uid = "spr" + uniqueId;
    const data = SPRITE_RECTS[classId] || SPRITE_RECTS.murmillo;
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 64 80");
    svg.setAttribute("class", "unit-sprite-svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const defs = document.createElementNS(SVG_NS, "defs");
    appendSpriteGradients(defs, team, uid, accentHex);
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
    },
    colosseum: {
      name: "Grand Colosseum",
      heightFn: function (x, y, w, h) {
        var cx = w / 2 - 0.5, cy = h / 2 - 0.5;
        var d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
        var maxR = Math.min(cx, cy);
        if (d < 2.5) return 0;
        if (d > maxR - 1) return 2;
        return 1;
      },
      terrainFn: function (x, y, w, h) {
        var cx = w / 2 - 0.5, cy = h / 2 - 0.5;
        var d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
        if (d < 1.5) return "trap_spike";
        return null;
      }
    },
    ruins: {
      name: "Crumbling Ruins",
      heightFn: function (x, y, w, h) {
        var s = Math.sin(x * 2.3 + y * 1.7);
        if (s > 0.6) return 2;
        if (s > -0.2) return 1;
        return 0;
      },
      terrainFn: function (x, y, w, h) {
        var s = Math.sin(x * 2.3 + y * 1.7);
        if (s > 0.85 && x > 0 && y > 0 && x < w - 1 && y < h - 1) return "building";
        if ((x + y) % 7 === 0 && x > 0 && y > 0) return "trap_fire";
        return null;
      }
    },
    marshland: {
      name: "Marshland",
      heightFn: function (x, y, w, h) {
        if ((x === 3 || x === 8) && y >= 2 && y <= h - 3) return 1;
        return 0;
      },
      terrainFn: function (x, y, w, h) {
        if ((x === 3 || x === 8) && y >= 2 && y <= h - 3) return null;
        if (x > 0 && x < w - 1 && y > 0 && y < h - 1) {
          if ((x + y * 3) % 5 === 0) return "fountain";
          return "water_shallow";
        }
        return null;
      }
    },
    fortress: {
      name: "Fortress Gate",
      heightFn: function (x, y, w, h) {
        if (x >= w - 3) return 2;
        if (x >= w - 5) return 1;
        return 0;
      },
      terrainFn: function (x, y, w, h) {
        if (x === w - 5 && y !== Math.floor(h / 2)) return "barricade";
        if (x === w - 3 && (y === 1 || y === h - 2)) return "trap_fire";
        return null;
      }
    },
    labyrinth: {
      name: "The Labyrinth",
      heightFn: function (x, y, w, h) {
        if (x % 2 === 0 && y % 2 === 0) return 0;
        if ((x % 4 === 2 && y > 0 && y < h - 1) || (y % 4 === 2 && x > 0 && x < w - 1)) return 2;
        return 0;
      },
      terrainFn: function (x, y, w, h) {
        if ((x % 4 === 2 && y > 0 && y < h - 1 && y % 2 !== 0) || (y % 4 === 2 && x > 0 && x < w - 1 && x % 2 !== 0)) return "building";
        if (x % 4 === 0 && y % 4 === 0 && x > 0 && y > 0) return "fountain";
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
            if (tt === "barricade") { if (!state.barricadeHp) state.barricadeHp = {}; state.barricadeHp[tx + "," + ty] = 8; }
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
      var interactTypes = ["trap_spike", "trap_fire", "fountain", "high_ground", "barricade"];
      var iCount = Math.round((1 + Math.floor(rng() * 2)) * densityMult);
      for (var ii = 0; ii < iCount; ii++) {
        var ix, iy;
        for (var iatt = 0; iatt < 20; iatt++) {
          ix = 2 + Math.floor(rng() * (BOARD_W - 4));
          iy = 2 + Math.floor(rng() * (BOARD_H - 4));
          if (!T[iy][ix]) break;
        }
        if (!T[iy][ix]) {
          var iType = interactTypes[Math.floor(rng() * interactTypes.length)];
          T[iy][ix] = iType;
          if (iType === "high_ground") state.height[iy][ix] = 2;
          if (iType === "barricade") {
            if (!state.barricadeHp) state.barricadeHp = {};
            state.barricadeHp[ix + "," + iy] = 8;
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
  function isTileBarricade(x, y) {
    return state.terrain && state.terrain[y] && state.terrain[y][x] === "barricade";
  }
  function isTileImpassableTerrain(x, y) {
    return isTileBuilding(x, y) || isTileDeepWater(x, y) || (isTileBarricade(x, y) && state.barricadeHp && state.barricadeHp[x + "," + y] > 0);
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
      collapsingMission: "0",
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
    cursor: { x: 0, y: 0, visible: false },
    survivalMode: false,
    survivalWave: 0,
    survivalScore: 0,
    survivalDenarii: 0,
    battleRecord: [],
    barricadeHp: {},
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

  var _activeFocusTrap = null;
  var _focusableSelector = 'button:not(:disabled):not(.is-hidden), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

  function _docFocusGuard(e) {
    if (!_activeFocusTrap) return;
    if (_activeFocusTrap.el.contains(e.target)) return;
    var first = _activeFocusTrap.el.querySelector(_focusableSelector);
    if (first) { first.focus(); }
    else { _activeFocusTrap.el.setAttribute("tabindex", "-1"); _activeFocusTrap.el.focus(); }
  }
  document.addEventListener("focusin", _docFocusGuard);

  function trapFocus(el) {
    releaseFocusTrap();
    function handler(e) {
      if (e.key !== "Tab") return;
      var focusable = el.querySelectorAll(_focusableSelector);
      if (!focusable.length) { e.preventDefault(); el.focus(); return; }
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    el.addEventListener("keydown", handler);
    _activeFocusTrap = { el: el, handler: handler };
  }
  function releaseFocusTrap() {
    if (_activeFocusTrap) {
      _activeFocusTrap.el.removeEventListener("keydown", _activeFocusTrap.handler);
      _activeFocusTrap = null;
    }
  }

  var _saveWarned = false;
  function safeSave() {
    if (!campaignState.active) return;
    if (!Campaign.saveToDisk() && !_saveWarned) {
      _saveWarned = true;
      log("Save failed \u2014 storage may be full.", "system");
    }
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
      releaseFocusTrap();
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
    header.innerHTML = '<span>Full Battle Log</span><button type="button" class="btn btn--ghost btn--tiny" id="btnCopyLog" aria-label="Copy log">Copy</button><button type="button" class="btn btn--ghost" aria-label="Close log">✕</button>';
    header.querySelector("#btnCopyLog").onclick = function () {
      var text = state.battleLog.map(function(e) { return "[T" + e.turn + "] " + e.msg; }).join("\n");
      navigator.clipboard.writeText(text).then(function() {
        var btn = document.getElementById("btnCopyLog");
        if (btn) { btn.textContent = "Copied!"; setTimeout(function() { btn.textContent = "Copy"; }, 1500); }
      }).catch(function() {});
    };
    header.querySelector("button[aria-label='Close log']").onclick = function () {
      releaseFocusTrap();
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
        releaseFocusTrap();
        overlay.remove();
        if (trigger) { trigger.setAttribute("aria-expanded", "false"); trigger.focus(); }
      }
    });
    overlay.tabIndex = -1;
    trapFocus(overlay);
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
    var key = "tutorial.s" + step;
    var text = (typeof I18n !== "undefined" && I18n.t) ? I18n.t(key) : null;
    if (!text || text === key) text = msg;
    log(text, "tutorial");
  }

  // -- Animation helpers --
  function delay(ms) { return new Promise(function (r) { setTimeout(r, adjDelay(ms)); }); }

  function animateMove(unit, path) {
    if (!path || path.length === 0) return Promise.resolve();
    unit._statTilesMoved = (unit._statTilesMoved || 0) + path.length;
    var last = path[path.length - 1];
    recordAction(unit, "move", { fromCol: unit.x, fromRow: unit.y, toCol: last[0], toRow: last[1] });
    SFX.move();
    unit._animGen = (unit._animGen || 0) + 1;
    var gen = unit._animGen;
    if (_animSpeed === 0) {
      var last2 = path[path.length - 1];
      unit.x = last2[0]; unit.y = last2[1];
      delete unit.animX; delete unit.animY;
      triggerTerrainStep(unit);
      return Promise.resolve();
    }
    return new Promise(function (resolve) {
      var stepIdx = 0;
      var stepDur = adjDelay(80);
      var startTime = null;
      var fromX = unit.x, fromY = unit.y;
      function tick(ts) {
        if (unit._animGen !== gen) { delete unit.animX; delete unit.animY; resolve(); return; }
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
            triggerTerrainStep(unit);
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
    if (_animSpeed === 0) return Promise.resolve();
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
      }, adjDelay(120));
    });
  }

  function animateHitFlash(unit) {
    unit._animGen = (unit._animGen || 0) + 1;
    var gen = unit._animGen;
    if (_animSpeed === 0) { delete unit._flashAnim; return Promise.resolve(); }
    return new Promise(function (resolve) {
      unit._flashAnim = 1;
      var start = performance.now();
      function tick() {
        if (unit._animGen !== gen) { delete unit._flashAnim; resolve(); return; }
        var t = (performance.now() - start) / adjDelay(150);
        if (t >= 1) { delete unit._flashAnim; resolve(); return; }
        unit._flashAnim = 1 - t;
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  var _shakeGen = 0;
  function screenShake(dur, intensity) {
    if (!renderer || renderer.reducedMotion || _animSpeed === 0) return Promise.resolve();
    var gen = ++_shakeGen;
    return new Promise(function (resolve) {
      var start = performance.now();
      function tick() {
        if (_shakeGen !== gen) { renderer.shakeX = 0; renderer.shakeY = 0; resolve(); return; }
        var t = (performance.now() - start) / adjDelay(dur);
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
    if (unit.duelTarget) {
      var _duelPartner = state.units.find(function(u) { return u.uid === unit.duelTarget; });
      if (_duelPartner) { _duelPartner.duelTarget = null; _duelPartner.duelTurns = 0; }
      unit.duelTarget = null; unit.duelTurns = 0;
    }
    if (campaignState.active && unit.team === "enemy" && state.activeUnit && state.activeUnit.team === "player") {
      awardXp(state.activeUnit, Math.round(XP_PER_KILL * getDiff().xpMul));
      state.activeUnit.kills = (state.activeUnit.kills || 0) + 1;
    }
    if (state.activeUnit && unit.team !== state.activeUnit.team) {
      state.activeUnit._statKills = (state.activeUnit._statKills || 0) + 1;
    }
    if (unit.team === "enemy" && state.activeUnit && state.activeUnit.team === "player") {
      state._playerKilledThisTurn = true;
    }
    if (!state._statFirstBlood) state._statFirstBlood = unit.displayName || classById(unit.classId).name;
    unit._animGen = (unit._animGen || 0) + 1;
    var gen = unit._animGen;
    if (_animSpeed === 0) { delete unit._deathAnim; return Promise.resolve(); }
    return new Promise(function (resolve) {
      var start = performance.now();
      var dur = adjDelay(400);
      function tick() {
        if (unit._animGen !== gen) { delete unit._deathAnim; resolve(); return; }
        var t = Math.min(1, (performance.now() - start) / dur);
        unit._deathAnim = 1 - t;
        if (t >= 1) { delete unit._deathAnim; resolve(); return; }
        requestAnimationFrame(tick);
      }
      unit._deathAnim = 1;
      requestAnimationFrame(tick);
    });
  }

  function _h(y, x) { return state.height[y] ? state.height[y][x] || 0 : 0; }

  function spawnDmgNumber(unit, text, color) {
    if (!renderer) return;
    var h = _h(unit.y, unit.x);
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
    while (cur2 != null && cur2 !== startKey) {
      path.unshift([cellKeyX(cur2), cellKeyY(cur2)]);
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
    defdown:  { glyph: "d", color: "#cc88ff", label: "DEF Down" },
    dbfimmun: { glyph: "U", color: "#88ffcc", label: "Debuff Immune" },
  };

  function getUnitStatusIcons(u) {
    var icons = [];
    if (u.gifted) icons.push(STATUS_DEFS.gifted);
    if (u.braceCharges > 0) icons.push(STATUS_DEFS.brace);
    if (u.testudoBonus > 0) icons.push(STATUS_DEFS.testudo);
    if (u.phalanxBonus > 0) icons.push(STATUS_DEFS.phalanx);
    if (u.riposteCharges > 0) icons.push(STATUS_DEFS.riposte);
    if (u.rootedSkip) icons.push(STATUS_DEFS.rooted);
    if (u.tempExtraMove) icons.push(STATUS_DEFS.surge);
    if (u.markDebuffTurns > 0) icons.push(STATUS_DEFS.marked);
    if (u.bleedTurns > 0) icons.push(STATUS_DEFS.bleed);
    if (u.atkDebuffTurns > 0) icons.push(STATUS_DEFS.atkdown);
    if (u.defDebuffTurns > 0) icons.push(STATUS_DEFS.defdown);
    if (u.debuffImmuneTurns > 0) icons.push(STATUS_DEFS.dbfimmun);
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
    if (u.statuses) {
      for (var _si = 0; _si < u.statuses.length; _si++) {
        var _ss = u.statuses[_si];
        icons.push({ glyph: _ss.icon || "?", color: _ss.debuff ? "#ff4040" : "#88ffcc", label: _ss.name + " (" + _ss.duration + "t)" });
      }
    }
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
    return (y << 8) | x;
  }
  function cellKeyX(k) { return k & 0xff; }
  function cellKeyY(k) { return k >> 8; }

  function inBounds(x, y) {
    return x >= 0 && x < BOARD_W && y >= 0 && y < BOARD_H;
  }

  function occupantAt(x, y) {
    return state.units.find((u) => u.hp > 0 && u.x === x && u.y === y) || null;
  }

  function isGateTile(x, y) {
    return y >= BOARD_H - 2;
  }

  function unitAtk(u)  { return Math.max(1, (u.giftedAtk || classById(u.classId).atk) + levelBonus(u, "Atk") + equipMod(u, "atk") + (u.blindRushAtk || 0) + (u.atkBonus || 0) + (u.momentumBonus || 0) + (u.battleHardenedTurns > 0 ? (u.battleHardenedAtk || 0) : 0) - (u.shadowMendAtkPenalty || 0) - (u.atkDebuffAmt && u.atkDebuffTurns > 0 ? u.atkDebuffAmt : 0) + (u.promoStatBonus ? (u.promoStatBonus.atk || 0) : 0) + (u.lastStandActive && u.hp <= u.maxHp * 0.3 ? 5 : 0) + _statusMod(u, "atk")); }
  function unitDef(u)  { return Math.max(0, (u.giftedDef || classById(u.classId).def) + levelBonus(u, "Def") + equipMod(u, "def") + (u.phalanxBonus || 0) + (u.battleHardenedTurns > 0 ? (u.battleHardenedDef || 0) : 0) - (u.blindRushDef || 0) + (u.bondBuff ? 1 : 0) + (u.promoStatBonus ? (u.promoStatBonus.def || 0) : 0) - (u.defDebuffAmt && u.defDebuffTurns > 0 ? u.defDebuffAmt : 0) + (u.lastStandActive && u.hp <= u.maxHp * 0.3 ? 5 : 0) + _statusMod(u, "def")); }
  function unitSpd(u)  { return Math.max(1, (u.giftedSpd || classById(u.classId).spd) + levelBonus(u, "Spd") + equipMod(u, "spd") - (u.crowdSpdDebuff || 0) + (u.promoStatBonus ? (u.promoStatBonus.spd || 0) : 0) + _statusMod(u, "spd")); }
  function unitMove(u) { return (u.giftedMove || classById(u.classId).move) + equipMod(u, "move"); }
  function unitJump(u) { return u.giftedJump || classById(u.classId).jump; }

  function canDebuff(u) { return !(u.debuffImmuneTurns > 0); }

  function unitAbilities(u) {
    var base = classById(u.classId).abilities;
    if (u.promotionId) {
      var promo = getPromotion(u.promotionId);
      if (promo && promo.abilities) {
        base = base.filter(function(ab) { return !ab.levelReq || ab.levelReq < 5; })
          .concat(promo.abilities);
      }
    }
    var all = u.extraAbilities ? base.concat(u.extraAbilities) : base;
    var lvl = u.level || 1;
    return all.filter(function (ab) { return !ab.levelReq || ab.levelReq <= lvl; });
  }

  function effectiveMove(unit) {
    let m = unitMove(unit) + _statusMod(unit, "move");
    if (unit.tempExtraMove) m += (unit.rallyCharge ? 2 : 1);
    return Math.max(1, m);
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
    const aH = _h(attacker.y, attacker.x);
    const dH = _h(defender.y, defender.x);
    if (aH > dH) chance += 10;
    else if (aH < dH) chance -= 10;
    if (attacker.battleFocusNext) chance += 25;
    else if (attacker.highGroundNext) chance += 15;
    return Math.max(30, Math.min(95, chance));
  }

  function rollHit(attacker, defender, ab) {
    if (ab && ab.alwaysHit) return true;
    if (attacker.eagleEyeHits > 0) {
      attacker.eagleEyeHits--;
      return true;
    }
    const chance = computeHitChance(attacker, defender);
    return gameRng() * 100 < chance;
  }

  function consumeAttackBuffs(u) {
    u.highGroundNext = false;
    u.battleFocusNext = false;
  }

  function physicalDamage(attacker, defender, mult, ignoreDefPct, dryRun) {
    const atk = attackerAtkValue(attacker, defender);
    const baseDef = unitDef(defender) + (defender.testudoBonus || 0);
    const clampedIgnore = Math.min(1, Math.max(0, ignoreDefPct || 0));
    const effectiveDef = clampedIgnore
      ? Math.round(baseDef * (1 - clampedIgnore))
      : baseDef;
    const aH = _h(attacker.y, attacker.x);
    const dH = _h(defender.y, defender.x);
    let heightMult = 1;
    if (aH > dH) heightMult = 1.15;
    else if (aH < dH) heightMult = 0.85;
    var duelMult = (attacker.duelTarget && attacker.duelTarget === defender.uid) ? 1.2 : 1;
    const raw = Math.max(1, Math.round(atk * mult * heightMult * duelMult) - effectiveDef);
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
        applyDamage(attacker, 3, defender);
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
    dmg = Math.max(0, dmg);
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
    u._statDmgTaken = (u._statDmgTaken || 0) + dmg;
    if (dmg > 0 && u.team === "player" && state.activeUnit && state.activeUnit.team === "player") {
      state._noDamageTurn = false;
    }
    if (attacker) {
      attacker._statDmgDealt = (attacker._statDmgDealt || 0) + dmg;
      if (dmg > (state._statMaxSingleHit || 0)) state._statMaxSingleHit = dmg;
    }
    if (u.spearBraceActive && attacker && attacker.hp > 0) {
      u.spearBraceActive = false;
      attacker.hp = Math.max(0, attacker.hp - 4);
      spawnDmgNumber(attacker, "-4", "#ff8040");
      log("Spear Brace counters for 4!");
    }
    if (u.team === "enemy") state.totalDamageDealt += dmg;
    var xpSource = attacker || state.activeUnit;
    if (campaignState.active && xpSource && xpSource.team === "player" && u.team === "enemy") {
      awardXp(xpSource, Math.round(XP_PER_HIT * getDiff().xpMul));
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
      uid: "unit_" + Math.random().toString(36).slice(2, 8),
      team,
      classId,
      x,
      y,
      hp: def.hp,
      maxHp: def.hp,
      ct: team === "player" ? 20 : 0,
      rootedSkip: 0,
      braceCharges: 0,
      riposteCharges: 0,
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
      crowdsFavorUsed: false,
      lastStandActive: false,
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
      defDebuffTurns: 0,
      defDebuffAmt: 0,
      debuffImmuneTurns: 0,
      title: null,
      statuses: [],
    };
  }

  var STATUS_REGISTRY = {};
  STATUS_REGISTRY.poison = { id: "poison", name: "Poison", icon: "☠", debuff: true, duration: 3, stackable: true, mods: null, onTick: function(u, s) { if (u.hp <= 0) return; var dmg = 2 * (s.stacks || 1); applyDamage(u, dmg); var n = u.displayName || classById(u.classId).name; log(n + " takes " + dmg + " poison damage!", "system"); } };
  STATUS_REGISTRY.bleed_s = { id: "bleed_s", name: "Bleed", icon: "🩸", debuff: true, duration: 2, stackable: false, mods: null, onTick: function(u, s) { if (u.hp <= 0) return; applyDamage(u, 3); var n = u.displayName || classById(u.classId).name; log(n + " bleeds for 3 damage!", "system"); } };
  STATUS_REGISTRY.stun = { id: "stun", name: "Stun", icon: "⚡", debuff: true, duration: 1, stackable: false, mods: null };
  STATUS_REGISTRY.slow = { id: "slow", name: "Slow", icon: "🐌", debuff: true, duration: 2, stackable: false, mods: { spd: -3 } };
  STATUS_REGISTRY.burn = { id: "burn", name: "Burn", icon: "🔥", debuff: true, duration: 2, stackable: false, mods: null, onTick: function(u, s) { if (u.hp <= 0) return; applyDamage(u, 4); var n = u.displayName || classById(u.classId).name; log(n + " burns for 4 damage!", "system"); } };
  STATUS_REGISTRY.fortify = { id: "fortify", name: "Fortify", icon: "🛡", debuff: false, duration: 2, stackable: false, mods: { def: 3 } };
  STATUS_REGISTRY.haste = { id: "haste", name: "Haste", icon: "💨", debuff: false, duration: 2, stackable: false, mods: { spd: 3, move: 1 } };

  function _statusMod(unit, stat) {
    var total = 0;
    if (!unit.statuses) return 0;
    for (var i = 0; i < unit.statuses.length; i++) {
      var s = unit.statuses[i];
      if (s.mods && s.mods[stat]) total += s.mods[stat];
    }
    return total;
  }
  function applyStatus(unit, defOrId, source) {
    if (!unit.statuses) unit.statuses = [];
    var def = typeof defOrId === "string" ? STATUS_REGISTRY[defOrId] : defOrId;
    if (!def) return;
    if (unit.debuffImmuneTurns > 0 && def.debuff) return;
    var existing = null;
    for (var i = 0; i < unit.statuses.length; i++) { if (unit.statuses[i].id === def.id) { existing = unit.statuses[i]; break; } }
    if (existing) {
      if (def.stackable) { existing.stacks = (existing.stacks || 1) + 1; }
      existing.duration = def.duration;
      return;
    }
    var inst = { id: def.id, name: def.name, icon: def.icon, duration: def.duration, debuff: !!def.debuff, stackable: !!def.stackable, stacks: 1, mods: def.mods || null, onTick: def.onTick || null, onExpire: def.onExpire || null };
    unit.statuses.push(inst);
    var uName = unit.displayName || classById(unit.classId).name;
    log(uName + " gains " + def.icon + " " + def.name + "!", "system");
  }
  function removeStatus(unit, statusId) {
    if (!unit.statuses) return;
    for (var i = unit.statuses.length - 1; i >= 0; i--) {
      if (unit.statuses[i].id === statusId) {
        var s = unit.statuses[i];
        if (s.onExpire) s.onExpire(unit, s);
        unit.statuses.splice(i, 1);
        return;
      }
    }
  }
  function tickStatuses(unit) {
    if (!unit.statuses || !unit.statuses.length) return;
    for (var i = unit.statuses.length - 1; i >= 0; i--) {
      var s = unit.statuses[i];
      if (s.onTick) s.onTick(unit, s);
      s.duration--;
      if (s.duration <= 0) {
        if (s.onExpire) s.onExpire(unit, s);
        var uName = unit.displayName || classById(unit.classId).name;
        log(uName + "'s " + s.name + " fades.", "system");
        unit.statuses.splice(i, 1);
      }
    }
  }
  function hasStatus(unit, statusId) {
    if (!unit.statuses) return false;
    for (var i = 0; i < unit.statuses.length; i++) { if (unit.statuses[i].id === statusId) return true; }
    return false;
  }
  function unitStunned(unit) { return hasStatus(unit, "stun"); }

  var _cachedZoneMap = null;
  var _zoneMapTerrain = null;
  function buildZoneMap() {
    if (_cachedZoneMap && _zoneMapTerrain === state.terrain) return _cachedZoneMap;
    _zoneMapTerrain = state.terrain;
    const zones = [];
    for (let y = 0; y < BOARD_H; y++) {
      const row = [];
      for (let x = 0; x < BOARD_W; x++) {
        var t = state.terrain && state.terrain[y] && state.terrain[y][x];
        row.push(t || tileZone(x, y));
      }
      zones.push(row);
    }
    _cachedZoneMap = zones;
    return zones;
  }

  var _highlightMapBuf = {};
  var _hlDirty = true;
  var _hlLastSize = -1;
  var _hlLastMode = null;
  var _hlLastPhase = null;

  function invalidateHighlights() { _hlDirty = true; }

  function buildHighlightMap() {
    var sz = state.highlightCells.size;
    if (!_hlDirty && sz === _hlLastSize && state.battleMode === _hlLastMode && state.phase === _hlLastPhase && state.phase !== "deploy") {
      return _highlightMapBuf;
    }
    var map = _highlightMapBuf;
    for (var k in map) { if (map.hasOwnProperty(k)) delete map[k]; }
    for (const key of state.highlightCells) {
      if (state.battleMode === "move") map[key] = "move";
      else if (state.battleMode === "attack") map[key] = "attack";
      else if (state.battleMode === "ability") map[key] = "ability";
    }
    if (state.phase === "deploy") {
      for (let y = 0; y < BOARD_H; y++) {
        for (let x = 0; x < BOARD_W; x++) {
          if (isGateTile(x, y) && !occupantAt(x, y) && !isTileImpassableTerrain(x, y) && !isTileCollapsed(x, y)) {
            map[cellKey(x, y)] = "gate";
          }
        }
      }
    }
    _hlLastSize = sz;
    _hlLastMode = state.battleMode;
    _hlLastPhase = state.phase;
    _hlDirty = false;
    return map;
  }

  var _unitDataBuf = [];
  var _drawParamsBuf = {
    heights: null, zones: null, highlights: null, units: null,
    activeUnitId: null, phase: null, cursedTiles: null,
    collapsedTiles: null, glowTiles: null, darkSky: false,
    letterbox: undefined, cutsceneBubble: undefined,
  };
  var _fullCurseSet = null;
  var _fullCurseKey = "";
  var _statusIconsBuf = [];

  function renderBoard() {
    if (!renderer) return;
    renderer._recalcLayout();

    var udIdx = 0;
    for (var ui = 0; ui < state.units.length; ui++) {
      var u = state.units[ui];
      if (u.hp <= 0 && u._deathAnim == null) continue;
      var entry = _unitDataBuf[udIdx];
      if (!entry) { entry = {}; _unitDataBuf[udIdx] = entry; }
      entry.id = u.id;
      entry.x = u.x;
      entry.y = u.y;
      entry.hp = u.hp;
      entry.maxHp = u.maxHp;
      entry.classId = u.classId;
      entry.team = u.isCinematic ? u.team : (u.gifted ? "gifted" : (u.team === "player" ? "player" : "enemy"));
      entry.exhausted = u.isCinematic ? false : (state.phase === "battle" && u.ct < 50);
      entry.animX = u.animX;
      entry.animY = u.animY;
      entry.lungeX = u.lungeX;
      entry.lungeY = u.lungeY;
      entry._deathAnim = u._deathAnim;
      entry._flashAnim = u._flashAnim;
      entry.isCinematic = u.isCinematic || false;

      if (u.isCinematic) {
        entry.statusIcons = _statusIconsBuf;
        _statusIconsBuf.length = 0;
      } else {
        var icons = [];
        if (u.gifted) icons.push(STATUS_DEFS.gifted);
        if (u.braceCharges > 0) icons.push(STATUS_DEFS.brace);
        if (u.testudoBonus > 0) icons.push(STATUS_DEFS.testudo);
        if (u.phalanxBonus > 0) icons.push(STATUS_DEFS.phalanx);
        if (u.riposteCharges > 0) icons.push(STATUS_DEFS.riposte);
        if (u.rootedSkip) icons.push(STATUS_DEFS.rooted);
        if (u.tempExtraMove) icons.push(STATUS_DEFS.surge);
        if (u.markDebuffTurns > 0) icons.push(STATUS_DEFS.marked);
        if (u.bleedTurns > 0) icons.push(STATUS_DEFS.bleed);
        if (u.atkDebuffTurns > 0) icons.push(STATUS_DEFS.atkdown);
        if (u.defDebuffTurns > 0) icons.push(STATUS_DEFS.defdown);
        if (u.debuffImmuneTurns > 0) icons.push(STATUS_DEFS.dbfimmun);
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
        if (u.statuses) {
          for (var _si = 0; _si < u.statuses.length; _si++) {
            var _st = u.statuses[_si];
            if (_st.icon) icons.push({ icon: _st.icon, label: _st.name || _st.id });
          }
        }
        entry.statusIcons = icons;
      }
      udIdx++;
    }
    _unitDataBuf.length = udIdx;

    var cursedSet = null;
    if (state.mapMods.fullCurse) {
      var cKey = BOARD_W + "," + BOARD_H;
      if (_fullCurseKey !== cKey) {
        _fullCurseSet = new Set();
        for (var cy = 0; cy < BOARD_H; cy++)
          for (var cx = 0; cx < BOARD_W; cx++)
            _fullCurseSet.add(cellKey(cx, cy));
        _fullCurseKey = cKey;
      }
      cursedSet = _fullCurseSet;
    } else if (state.mapMods.cursedTiles.size) {
      cursedSet = state.mapMods.cursedTiles;
    }

    var dp = _drawParamsBuf;
    dp.heights = state.height;
    dp.zones = buildZoneMap();
    dp.highlights = state.cutscene.active ? {} : buildHighlightMap();
    dp.units = _unitDataBuf;
    dp.activeUnitId = state.activeUnit ? state.activeUnit.id : null;
    dp.phase = state.phase;
    dp.cursedTiles = cursedSet;
    dp.collapsedTiles = state.mapMods.collapsedTiles.size ? state.mapMods.collapsedTiles : null;
    dp.glowTiles = state.mapMods.glowTiles.size ? state.mapMods.glowTiles : null;
    dp.darkSky = state.mapMods.darkSky;
    dp.cursor = state.cursor.visible ? { x: state.cursor.x, y: state.cursor.y } : null;
    dp.letterbox = undefined;
    dp.cutsceneBubble = undefined;

    if (state.cutscene.active) {
      dp.letterbox = state.cutscene.letterbox;
      var bu = state.cutscene.bubbleUnit;
      if (bu && state.cutscene.bubbleText) {
        var bp = renderer.tileToScreen(bu.x, bu.y, state.height[bu.y] ? state.height[bu.y][bu.x] || 0 : 0);
        dp.cutsceneBubble = {
          cx: bp.x,
          cy: bp.y,
          text: state.cutscene.bubbleText,
          revealed: state.cutscene.bubbleRevealed,
          style: state.cutscene.bubbleStyle,
        };
      } else if (!bu && state.cutscene.bubbleText && state.cutscene.bubbleStyle === "narration") {
        dp.cutsceneBubble = {
          cx: 0,
          cy: 0,
          text: state.cutscene.bubbleText,
          revealed: state.cutscene.bubbleRevealed,
          style: "narration",
        };
      }
    }

    renderer.draw(dp);
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

  function ensureAccentSprite(unit) {
    if (!unit.accentColor || !renderer) return;
    var team = unit.gifted ? "gifted" : unit.team;
    var key = unit.classId + "_" + team + "_" + unit.accentColor;
    if (!renderer.spriteCache[key]) {
      var svg = gladiatorSpriteSvg(unit.classId, team, "ac_" + unit.id, unit.accentColor);
      renderer.cacheSpriteFromSvg(key, "", svg, true);
    }
    unit._spriteKey = key;
  }

  function syncBodyPhaseClass() {
    document.body.classList.toggle("phase-battle", state.phase === "battle");
  }

  var _ctStripKey = "";
  function refreshCtStrip() {
    const el = document.getElementById("ctStrip");
    if (!el) return;
    if (state.phase !== "battle") {
      el.innerHTML = "";
      el.hidden = true;
      _ctStripKey = "";
      return;
    }
    el.hidden = false;
    const alive = state.units.filter((u) => u.hp > 0);
    const sorted = [...alive].sort((a, b) => {
      const ta = Math.max(0, 100 - a.ct) / unitSpd(a);
      const tb = Math.max(0, 100 - b.ct) / unitSpd(b);
      return ta - tb;
    });
    const maxSlots = Math.min(8, sorted.length);
    var ctKey = "";
    for (var ci = 0; ci < maxSlots; ci++) ctKey += sorted[ci].id + "," + sorted[ci].hp + ";";
    if (ctKey === _ctStripKey) return;
    _ctStripKey = ctKey;
    el.innerHTML = "";
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
        9e4 + u.id * 32 + i,
        u.accentColor || null
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

  function updatePhaseBannerText() {
    var p = state.phase;
    var phaseText;
    if (typeof I18n !== "undefined" && I18n.t) {
      phaseText = p === "ludus" ? I18n.t("phase.ludus") : p === "deploy" ? I18n.t("phase.gates") : I18n.t("phase.arena");
      if (campaignState.active) {
        var m = Campaign.getMission();
        if (m) phaseText = I18n.t("phase.missionPrefix", { mid: m.id }) + phaseText;
      }
    } else {
      phaseText = p === "ludus" ? "Ludus" : p === "deploy" ? "Gates" : "Arena";
      if (campaignState.active) {
        var m2 = Campaign.getMission();
        if (m2) phaseText = "M" + m2.id + " — " + phaseText;
      }
    }
    phaseLabel.textContent = phaseText;
  }

  function showPhasePanels() {
    syncBodyPhaseClass();
    refreshCtStrip();
    const p = state.phase;
    if (p === "ludus") { SFX.startAmbient("ludus"); SFX.startMusic("ludus"); }
    else if (p === "deploy") { SFX.startAmbient("ludus"); SFX.startMusic("deploy"); }
    else if (p === "battle") { SFX.startAmbient("battle"); SFX.startMusic("battle"); }
    else { SFX.startAmbient("ludus"); SFX.startMusic("ludus"); }
    updatePhaseBannerText();
    panelRoster.classList.toggle("is-hidden", p !== "ludus");
    panelDeploy.classList.toggle("is-hidden", p !== "deploy");
    panelBattle.classList.toggle("is-hidden", p !== "battle");
    setTimeout(function () {
      var target = p === "ludus" ? panelRoster.querySelector(".class-row, button:not(:disabled)")
        : p === "deploy" ? (deployQueueEl.querySelector(".deploy-card") || btnToBattle)
        : btnMove.disabled ? btnWait : btnMove;
      if (target) target.focus();
    }, 120);
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
      var dispC = displayClassById(c.id);
      const row = document.createElement("div");
      row.className = "class-row" + (state.selectedClassId === c.id ? " is-selected" : "");
      row.setAttribute("role", "listitem");

      // Sprite preview thumbnail
      const thumb = document.createElement("div");
      thumb.className = "class-row__sprite";
      const sprSvg = gladiatorSpriteSvg(c.id, "player", "preview_" + c.id);
      thumb.appendChild(sprSvg);

      var statsLine = "HP " + c.hp + " · ATK " + c.atk + " · DEF " + c.def + " · SPD " + c.spd + " · Move " + c.move + " · Jump " + c.jump;
      if (typeof I18n !== "undefined" && I18n.t) {
        statsLine = I18n.t("panel.statsFmt", { hp: c.hp, atk: c.atk, def: c.def, spd: c.spd, mv: c.move, jp: c.jump });
      }
      const left = document.createElement("div");
      left.className = "class-row__info";
      left.innerHTML =
        '<div class="class-row__name">' +
        dispC.name +
        '</div><div class="class-row__meta">' +
        dispC.role +
        "</div>" +
        '<div class="class-row__stats">' + statsLine + "</div>" +
        '<div class="class-row__abilities"></div>';
      var abilitiesDiv = left.querySelector(".class-row__abilities");
      c.abilities.forEach(function (a) {
        var tag = document.createElement("span");
        tag.className = "ability-tag";
        tag.setAttribute("tabindex", "0");
        tag.setAttribute("role", "button");
        tag.textContent = abilityName(a);
        var tipExtra = (typeof I18n !== "undefined" && I18n.abilityTipExtras) ? I18n.abilityTipExtras(a) : "";
        if (!tipExtra) {
          var tipParts = [];
          if (a.type) tipParts.push(a.type.charAt(0).toUpperCase() + a.type.slice(1));
          if (a.range) tipParts.push("Range " + a.range);
          if (a.mult) tipParts.push("×" + a.mult + " dmg");
          if (a.fixedDmg) tipParts.push(a.fixedDmg + " true dmg");
          if (a.healAmt) tipParts.push("Heal " + a.healAmt);
          if (a.levelReq && a.levelReq > 1) tipParts.push("Lv" + a.levelReq);
          tipExtra = tipParts.length ? "\n" + tipParts.join(" · ") : "";
        }
        tag._tipText = abilityDesc(a) + tipExtra;
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
      addBtn.textContent = (typeof I18n !== "undefined" && I18n.t) ? I18n.t("panel.hire") : "Hire";
      addBtn.style.margin = "0";
      addBtn.setAttribute("aria-label", (typeof I18n !== "undefined" && I18n.t)
        ? I18n.t("panel.hireAria", { name: dispC.name, cost: c.cost })
        : ("Hire " + c.name + " for " + c.cost + " denarii"));
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
      var _pickAc = pick.accent ? (ACCENT_COLORS.find(function(a) { return a.id === pick.accent; }) || {}).hex : null;
      const miniSpr = gladiatorSpriteSvg(def.id, "player", "pick_" + idx, _pickAc || null);
      miniSpr.classList.add("picked__sprite");
      li.appendChild(miniSpr);
      const nameSpan = document.createElement("span");
      nameSpan.className = "pick-name";
      var labelSpan = document.createElement("span");
      labelSpan.className = "pick-name-text";
      var dispPick = displayClassById(pick.classId);
      var className = dispPick.name;
      if (pick.promotionId) { var _pr = getPromotion(pick.promotionId); if (_pr) className = _pr.name; }
      var label = className;
      if (pick.displayName) label = pick.displayName + " (" + className + ")";
      if (pick.isFree) label += (typeof I18n !== "undefined" && I18n.t) ? I18n.t("panel.freeTag") : " [free]";
      labelSpan.textContent = label;
      nameSpan.appendChild(labelSpan);
      var renameBtn = document.createElement("button");
      renameBtn.type = "button"; renameBtn.className = "btn-rename"; renameBtn.textContent = "\u270E";
      renameBtn.title = "Rename"; renameBtn.setAttribute("aria-label", "Rename fighter");
      renameBtn.addEventListener("click", function(e) { e.stopPropagation(); promptFighterName(pick); });
      nameSpan.appendChild(renameBtn);
      var accentWrap = document.createElement("span");
      accentWrap.className = "accent-picker";
      ACCENT_COLORS.forEach(function(ac) {
        var dot = document.createElement("button");
        dot.type = "button"; dot.className = "accent-dot" + (pick.accent === ac.id ? " is-active" : "");
        dot.style.backgroundColor = ac.hex;
        dot.title = ac.id; dot.setAttribute("aria-label", "Set accent " + ac.id);
        dot.addEventListener("click", function(e) {
          e.stopPropagation();
          pick.accent = (pick.accent === ac.id) ? null : ac.id;
          refreshRosterUI(); safeSave();
        });
        accentWrap.appendChild(dot);
      });
      nameSpan.appendChild(accentWrap);
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
          safeSave();
        });
        li.appendChild(rm);
      }
      pickedListEl.appendChild(li);
    });

    renderEquipShop();
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

  function renderEquipShop() {
    var existing = document.getElementById("equipShopSection");
    if (existing) existing.remove();
    if (!campaignState.active && !state.survivalMode) return;
    if (state.picks.length === 0) return;
    var section = document.createElement("div");
    section.id = "equipShopSection"; section.className = "equip-shop";
    section.innerHTML = '<div class="equip-shop__title">Equipment Shop</div>';
    var row = document.createElement("div");
    row.className = "equip-shop__row";
    var shopPool = EQUIPMENT_DB.filter(function(e) { return e.cost <= state.budget + 10; });
    shopPool.sort(function(a, b) { return a.cost - b.cost; });
    if (shopPool.length > 12) shopPool = shopPool.slice(0, 12);
    for (var i = 0; i < shopPool.length; i++) {
      (function(item) {
        var card = document.createElement("div");
        card.className = "equip-card" + (item.rarity === "rare" ? " equip-card--rare" : item.rarity === "legendary" ? " equip-card--legendary" : "");
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.innerHTML = '<div class="equip-card__name">' + _esc(item.name) + '</div>' +
          '<div>' + item.slot + '</div>' +
          '<div>' + Object.keys(item.mods).map(function(k) { return "+" + item.mods[k] + " " + k.toUpperCase(); }).join(", ") + '</div>' +
          '<div class="equip-card__cost">' + item.cost + ' d</div>';
        var handler = function() { showEquipPicker(item); };
        card.addEventListener("click", handler);
        card.addEventListener("keydown", function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handler(); } });
        row.appendChild(card);
      })(shopPool[i]);
    }
    section.appendChild(row);

    var inv = campaignState.inventory || [];
    if (inv.length > 0) {
      var invDiv = document.createElement("div");
      invDiv.style.marginTop = "0.3rem";
      invDiv.style.fontSize = "0.65rem";
      invDiv.style.color = "var(--fft-text-dim)";
      invDiv.textContent = "Inventory: " + inv.map(function(id) { return _equipById[id] ? _equipById[id].name : id; }).join(", ");
      section.appendChild(invDiv);
    }
    var rosterSection = document.getElementById("panelRoster");
    var btnToDeploy = document.getElementById("btnToDeploy");
    if (rosterSection && btnToDeploy) {
      rosterSection.insertBefore(section, btnToDeploy.parentElement || btnToDeploy);
    }
  }

  function showEquipPicker(item) {
    if (item.cost > state.budget) {
      log("Not enough denarii for " + item.name + ".", "system");
      return;
    }
    var msg = "Buy " + item.name + " (" + item.cost + "d)?\\nAssign to which fighter?\\n";
    for (var i = 0; i < state.picks.length; i++) {
      msg += (i + 1) + ": " + (state.picks[i].displayName || classById(state.picks[i].classId).name) + "\\n";
    }
    var choice = prompt(msg, "1");
    if (!choice) return;
    var idx = parseInt(choice, 10) - 1;
    if (idx < 0 || idx >= state.picks.length) return;
    var pick = state.picks[idx];
    if (!pick.equipment) pick.equipment = { weapon: null, armor: null, trinket: null };
    var oldId = pick.equipment[item.slot];
    if (oldId) {
      campaignState.inventory.push(oldId);
    }
    pick.equipment[item.slot] = item.id;
    state.budget -= item.cost;
    budgetCurrent -= item.cost;
    if (campaignState.active) campaignState.denarii -= item.cost;
    log("Equipped " + item.name + " on " + (pick.displayName || classById(pick.classId).name) + ".");
    refreshRosterUI();
    safeSave();
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
      var dName = _esc(s.name || (s.displayName || def.name));
      var titleStr = _esc(s.title || "—");
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
        if (n1 && n2) bondDiv.innerHTML += (bp > 0 ? ", " : "") + _esc(n1) + " &amp; " + _esc(n2);
      }
      panel.appendChild(bondDiv);
    }
    var cs = campaignState.campaignStats;
    if (cs && cs.totalBattles > 0) {
      var csDiv = document.createElement("div");
      csDiv.style.marginTop = "0.5rem";
      csDiv.style.fontSize = "0.7rem";
      csDiv.style.color = "var(--fft-cyan-dim)";
      csDiv.innerHTML = "<strong>Campaign Totals:</strong> " +
        cs.totalBattles + " battles · " + cs.totalKills + " kills · " +
        cs.totalDamage + " dmg · " + cs.totalTurns + " turns";
      panel.appendChild(csDiv);
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
    safeSave();
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
    gameRng = seedRng(trainSeed * 1999 + 1);
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
    var enemyLvl = Math.max(1, avgLevel - 1 + Math.floor(gameRng() * 2));
    var unlocked = Campaign.getUnlockedClasses ? Campaign.getUnlockedClasses() : GLADIATOR_CLASSES.map(function(c) { return c.id; });
    var count = state.picks.length;
    for (var j = 0; j < count; j++) {
      var cls = unlocked[Math.floor(gameRng() * unlocked.length)];
      var ex = Math.floor(gameRng() * BOARD_W);
      var ey = Math.floor(gameRng() * 3);
      while (occupantAt(ex, ey) || isTileImpassableTerrain(ex, ey)) { ex = Math.floor(gameRng() * BOARD_W); ey = Math.floor(gameRng() * 3); }
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
      var entry = {
        uid: p.uid,
        classId: p.classId,
        name: p.displayName || null,
        hp: p.hp != null ? p.hp : classById(p.classId).hp,
        maxHp: p.maxHp != null ? p.maxHp : classById(p.classId).hp,
        isFree: p.isFree || false,
        level: p.level || 1,
        xp: p.xp || 0,
        kills: p.kills || 0,
        gifted: p.gifted || false,
        bonusHp:  p.bonusHp  || 0,
        bonusAtk: p.bonusAtk || 0,
        bonusDef: p.bonusDef || 0,
        bonusSpd: p.bonusSpd || 0,
        battlesSurvived: p.battlesSurvived || 0,
        nearDeathCount: p.nearDeathCount || 0,
        title: p.title || null,
      };
      if (p.promotionId) entry.promotionId = p.promotionId;
      if (p.equipment) entry.equipment = p.equipment;
      if (p.accent) entry.accent = p.accent;
      return entry;
    });
    safeSave();
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
        hSeed = _hashMissionId(mission.id) * 97 + 42;
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
      var eu = createUnit("enemy", chosen[j], px, py);
      eu.aiProfile = _aiProfileKeys[Math.floor(rng() * _aiProfileKeys.length)];
      var diff = getDiff();
      eu.maxHp = Math.round(eu.maxHp * diff.hpMul); eu.hp = eu.maxHp;
      var _bAtk = classById(eu.classId).atk, _bSpd = classById(eu.classId).spd;
      eu.bonusAtk = (eu.bonusAtk || 0) + Math.round(_bAtk * (diff.atkMul - 1));
      eu.bonusSpd = (eu.bonusSpd || 0) + Math.round(_bSpd * (diff.spdMul - 1));
      state.units.push(eu);
    }
  }

  function placeEnemiesCampaign(mission) {
    var rng = seedRng(_hashMissionId(mission.id) * 997 + 13);
    var usedPositions = {};
    var enemies = mission.enemies.slice();

    if (mission.id === "13") {
      if (!Campaign.getFlag("scaeva_allied")) {
        enemies.push({ classId: "murmillo", gifted: true });
      }
      if (!Campaign.getFlag("valeria_allied")) {
        enemies.push({ classId: "hoplomachus", gifted: true });
      }
      if (Campaign.getFlag("valeria_betrayed")) {
        enemies.push({ classId: "provocator", gifted: true });
      }
      if (Campaign.getFlag("nero_deal")) {
        enemies.push({ classId: "samnite", gifted: true });
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
      unit.aiProfile = (spec.boss || spec.gifted) ? "tactician" : _aiProfileKeys[Math.floor(rng() * _aiProfileKeys.length)];
      if (unit.gifted) applyGiftedBoosts(unit);
      var eLvl = mission.enemyLevel || 1;
      unit.level = eLvl;
      if (eLvl > 1) {
        var egb = computeGrowthBonuses(unit.classId, unit.id, eLvl);
        unit.bonusHp = egb.hp; unit.bonusAtk = egb.atk;
        unit.bonusDef = egb.def; unit.bonusSpd = egb.spd;
        if (egb.hp > 0) { unit.maxHp += egb.hp; unit.hp = unit.maxHp; }
      }
      var diff = getDiff();
      unit.maxHp = Math.round(unit.maxHp * diff.hpMul); unit.hp = unit.maxHp;
      var _bAtk = classById(unit.classId).atk, _bSpd = classById(unit.classId).spd;
      unit.bonusAtk = (unit.bonusAtk || 0) + Math.round(_bAtk * (diff.atkMul - 1));
      unit.bonusSpd = (unit.bonusSpd || 0) + Math.round(_bSpd * (diff.spdMul - 1));
      if (campaignState.newGamePlus > 0) {
        unit.maxHp = Math.round(unit.maxHp * ngPlusScale("hp")); unit.hp = unit.maxHp;
        unit.bonusAtk += Math.round(classById(unit.classId).atk * (ngPlusScale("atk") - 1));
        unit.bonusSpd += Math.round(_bSpd * (ngPlusScale("spd") - 1));
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
    if (pick.accent) {
      unit.accent = pick.accent;
      var acObj = ACCENT_COLORS.find(function(a) { return a.id === pick.accent; });
      if (acObj) { unit.accentColor = acObj.hex; ensureAccentSprite(unit); }
    }
    if (pick.promotionId) {
      unit.promotionId = pick.promotionId;
      var promo = getPromotion(pick.promotionId);
      if (promo && promo.statBonus) {
        unit.promoStatBonus = promo.statBonus;
        if (promo.statBonus.hp) { unit.maxHp += promo.statBonus.hp; unit.hp += promo.statBonus.hp; }
        if (promo.statBonus.move) { unit.giftedMove = (unit.giftedMove || classById(unit.classId).move) + promo.statBonus.move; }
      }
    }
    if (pick.equipment) {
      unit.equipment = pick.equipment;
      var eqHp = equipMod(unit, "hp");
      if (eqHp > 0) { unit.maxHp += eqHp; unit.hp += eqHp; }
    }
    if (pick.hp != null && pick.maxHp != null) {
      unit.maxHp = pick.maxHp + (unit.bonusHp || 0) + equipMod(unit, "hp");
      unit.hp = Math.min(pick.hp + (unit.bonusHp || 0) + equipMod(unit, "hp"), unit.maxHp);
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

      var _dplAccent = p.accent ? (ACCENT_COLORS.find(function(a) { return a.id === p.accent; }) || {}).hex : null;
      var sprSvg = gladiatorSpriteSvg(p.classId, "player", "dpl_" + idx, _dplAccent || null);
      sprSvg.classList.add("deploy-card__sprite");
      li.appendChild(sprSvg);

      var info = document.createElement("div");
      info.className = "deploy-card__info";
      var nameStr = p.displayName ? _esc(p.displayName) : def.name;
      var lvlBadge = campaignState.active ? ' <span class="level-badge">Lv.' + (p.level || 1) + '</span>' : '';
      info.innerHTML = '<span class="deploy-card__name">' + nameStr + lvlBadge + '</span><span class="deploy-card__class">' + def.name + '</span>';
      li.appendChild(info);

      var status = document.createElement("span");
      status.className = "deploy-card__status";
      status.textContent = p.placed ? "✓" : "…";
      li.appendChild(status);

      li.setAttribute("tabindex", "0");
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", String(idx === state.deploySelectedIndex && !p.placed));
      function selectDeploy() {
        state.deploySelectedIndex = idx;
        refreshDeployUI();
        renderBoard();
      }
      li.addEventListener("click", selectDeploy);
      li.addEventListener("keydown", function (e) {
        if (e.repeat) return;
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectDeploy(); }
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
      if (!isGateTile(x, y) || existing || isTileImpassableTerrain(x, y) || isTileCollapsed(x, y)) {
        if (existing) log("Tile occupied. Click a placed ally to recall them.");
        else if (!isGateTile(x, y)) log("Select a highlighted gate tile to place a fighter.");
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
      handleBattleClick(x, y).catch(function(e) { console.error("Battle click error:", e); state.animating = false; });
    }
  }

  function resetMapMods() {
    state.barricadeHp = {};
    state.mapMods.cursedTiles = new Set();
    state.mapMods.cursedDmg = 0;
    state.mapMods.fullCurse = false;
    state.mapMods.ritualPulse = null;
    state.mapMods.crowdSpdPenalty = 0;
    state.mapMods.crowdSurgeTurn = 0;
    state.mapMods.crowdSurgeApplied = false;
    state.mapMods.collapsedTiles = new Set();
    state.mapMods.collapsingActive = false;
    state.mapMods.collapsingMission = "0";
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

    var rng = seedRng(_hashMissionId(mission.id) * 1337 + 7);
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

    if (mission.missionNum >= 10) state.mapMods.darkSky = true;
    if (mission.id === "9") state.mapMods.shiftingSand = true;
    if (mission.id === "8") state.mapMods.symbolFlashTurn = 3;
    if (mission.id === "11") {
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

  function triggerTerrainStep(u) {
    if (u.hp <= 0) return;
    if (u.isCinematic) return;
    var zone = tileZone(u.x, u.y);
    var uName = u.displayName || classById(u.classId).name;
    if (zone === "trap_spike") {
      var _cm = Campaign.getMission();
      var dmg = 3 + Math.floor((_cm ? _cm.missionNum : 0) / 3);
      applyDamage(u, dmg);
      spawnDmgNumber(u, "-" + dmg, "#ff4444");
      SFX.hit();
      log(uName + " steps on spikes! (-" + dmg + ")", "system");
      if (state.terrain[u.y]) state.terrain[u.y][u.x] = "sand";
    } else if (zone === "trap_fire") {
      applyDamage(u, 4);
      spawnDmgNumber(u, "-4", "#ff6600");
      SFX.hit();
      applyStatus(u, "burn");
      log(uName + " walks through fire! (-4, burning)", "system");
    } else if (zone === "fountain") {
      var heal = Math.min(5, u.maxHp - u.hp);
      if (heal > 0) {
        u.hp += heal;
        u._statHealing = (u._statHealing || 0) + heal;
        spawnDmgNumber(u, "+" + heal, "#80ff80");
        log(uName + " is healed by the fountain! (+" + heal + ")", "heal");
      }
    }
  }

  function damageBarricade(x, y, dmg) {
    var key = x + "," + y;
    if (!state.barricadeHp || !state.barricadeHp[key]) return false;
    state.barricadeHp[key] = Math.max(0, state.barricadeHp[key] - dmg);
    if (state.barricadeHp[key] <= 0) {
      if (state.terrain[y]) state.terrain[y][x] = "sand";
      delete state.barricadeHp[key];
      log("Barricade destroyed!", "system");
      return true;
    }
    return false;
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

    if (mid === "13") {
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
    var rng = seedRng(state.turnCount * 31 + _hashMissionId(mid || "0"));
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
    if (!state.mapMods.fullCurse && state.mapMods.collapsingMission !== "13") return;
    state.mapMods.collapsedTiles.forEach(function (k) {
      var cx = cellKeyX(k), cy = cellKeyY(k);
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
    gameRng = seedRng(hSeed * 1999 + state.boutNumber * 41 + 1);
    var tmplKey = (!mission && !campaignState.active && skirmishConfig.template) ? skirmishConfig.template : null;
    state.height = buildHeightField(hSeed, tmplKey);
    state.phase = "battle";
    state.activeUnit = null;
    state.battleMode = "idle";
    state.highlightCells.clear();
    state.turnCount = 0;
    state.totalDamageDealt = 0;
    state._statMaxSingleHit = 0;
    state._resultBookkept = false;
    state._statFirstBlood = null;
    state._statPacifistTurn = false;
    state._pacifistStreak = 0;
    state._playerKilledThisTurn = false;
    state._ctStallCount = 0;
    state.battleLog = [];
    state.battleRecord = [];
    if (renderer) renderer.floatingTexts = [];
    for (var _si = 0; _si < state.units.length; _si++) {
      var _su = state.units[_si];
      _su._statDmgDealt = 0; _su._statDmgTaken = 0; _su._statHealing = 0;
      _su._statKills = 0; _su._statTilesMoved = 0; _su._statAbilitiesUsed = 0;
    }
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
    tickBattleTurn().catch(function(e) {
      console.error("tickBattleTurn:", e);
      state.animating = false;
      log("Turn error — you may continue.", "system");
    });
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
    u.interceptActive = false;
    tickStatuses(u);
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
    if (actor && actor.hp <= 0) {
      await animateDeath(actor);
      if (await checkVictoryAsync()) return;
      await tickBattleTurn();
      return;
    }
    if (!actor) {
      log("CT stall — forcing result.", "system");
      renderBoard();
      if (await checkVictoryAsync()) return;
      state._ctStallCount = (state._ctStallCount || 0) + 1;
      if (state._ctStallCount >= 3) {
        log("Repeated CT stall — battle ended.", "system");
        showResultOverlay("defeat");
        return;
      }
      await delay(100);
      await tickBattleTurn();
      return;
    }
    state._ctStallCount = 0;
    state.activeUnit = actor;
    if (unitStunned(actor)) {
      var _sname = actor.displayName || classById(actor.classId).name;
      log(_sname + " is stunned and cannot act!", "system");
      removeStatus(actor, "stun");
      renderBoard();
      await delay(400);
      await tickBattleTurn();
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
      await tickBattleTurn();
      return;
    }
    if (actor.atkDebuffTurns > 0) actor.atkDebuffTurns--;
    if (actor.atkDebuffTurns <= 0) actor.atkDebuffAmt = 0;
    if (actor.defDebuffTurns > 0) actor.defDebuffTurns--;
    if (actor.defDebuffTurns <= 0) actor.defDebuffAmt = 0;
    if (actor.debuffImmuneTurns > 0) actor.debuffImmuneTurns--;
    if (actor.duelTurns > 0) { actor.duelTurns--; if (actor.duelTurns <= 0) actor.duelTarget = null; }
    if (actor.bleedTurns > 0) {
      actor.bleedTurns--;
      applyDamage(actor, 1);
      log(classById(actor.classId).name + " bleeds! (−1 HP)");
      if (actor.hp <= 0) { tickMarkDebuffIfNeeded(actor); await animateDeath(actor); await tickBattleTurn(); return; }
    }
    if (actor.rootedSkip) {
      actor.rootedSkip--;
      log(classById(actor.classId).name + " is netted and cannot act!");
      var cursedKillP = tickCursedTileDamage(actor);
      if (cursedKillP) { tickMarkDebuffIfNeeded(actor); await animateDeath(actor); await tickBattleTurn(); return; }
      tickMarkDebuffIfNeeded(actor);
      renderBoard();
      await delay(350);
      await tickBattleTurn();
      return;
    }
    state.activeUnit = actor;
    state.battleMode = "idle";
    state.highlightCells.clear();
    state.hasMoved = false;
    state.hasActed = false;
    state.selectedAbilityIndex = -1;
    state._noDamageTurn = true;
    state._playerKilledThisTurn = false;
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
    tutorialTip(22, "The CT strip at the top shows turn order. Faster units (higher SPD) act more often. Height gives +15% damage.");
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
    else if (terrain === "trap_spike") { txt = "Spike Trap · H:" + hName; }
    else if (terrain === "trap_fire") { txt = "Fire Trap · H:" + hName; }
    else if (terrain === "barricade") { txt = "Barricade · Impassable"; var bhp = state.barricadeHp ? state.barricadeHp[col+","+row] : 0; if (bhp > 0) txt += " HP:" + bhp; }
    else if (terrain === "fountain") { txt = "Fountain · Heals +5/turn · H:" + hName; }
    else if (terrain === "high_ground") { txt = "High Ground · +15% dmg · H:" + hName; }
    if (isTileCollapsed(col, row)) txt += " · COLLAPSED";
    else if (isTileCursed(col, row)) txt += " · Cursed";
    if (state.mapMods.glowTiles.has(cellKey(col, row))) txt += " · Glow (+2 ATK)";
    var occ = occupantAt(col, row);
    if (occ) {
      var occDisp = displayClassById(occ.classId);
      var occName = occDisp.name;
      if (occ.promotionId) { var occPromo = getPromotion(occ.promotionId); if (occPromo) occName = occPromo.name; }
      txt += " \u00b7 " + occName + " (" + occ.team + ") HP:" + occ.hp + "/" + occ.maxHp;
      if (occ.aiProfile && AI_PROFILES[occ.aiProfile]) {
        var _aiLab = (typeof I18n !== "undefined" && I18n.aiProfileLabel) ? I18n.aiProfileLabel(occ.aiProfile) : AI_PROFILES[occ.aiProfile].label;
        txt += " [" + _aiLab + "]";
      }
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
      if (ab) { label = abilityName(ab); mult = ab.mult || 1; ignDef = ab.ignoreDefPct || 0; }
    }
    if (ab && ab.effect === "hpswap") {
      var html = '<div class="fc-name">' + _esc(def.name) + '</div>';
      html += '<div class="fc-dmg">' + _esc(label) + ': Swap HP%</div>';
      forecastEl.innerHTML = html;
      forecastEl.classList.remove("is-hidden");
      announce(def.name + " — " + label + ": Swap HP%");
      return;
    }
    if (ab && ab.effect === "suppress") {
      dmg = 3;
    } else if (ab && ab.effect === "grave_pulse") {
      dmg = 4;
    } else {
      dmg = physicalDamage(attacker, target, mult, ignDef, true);
    }
    var dmgLabel = (ab && (ab.effect === "suppress" || ab.effect === "grave_pulse")) ? " true dmg" : " dmg";
    var dmgPrefix = "~";
    if (ab && ab.effect === "double_strike") {
      dmgPrefix = "2x ~";
    }
    var dmgSuffix = "";
    if (ab && (ab.target === "aoe_adjacent" || ab.target === "aoe_range")) {
      dmgSuffix = " (per foe)";
    }
    var html = '<div class="fc-name">' + _esc(def.name) + '</div>';
    html += '<div class="fc-hit">Hit: ' + hitPct + '%</div>';
    html += '<div class="fc-dmg">' + _esc(label) + ': ' + dmgPrefix + dmg + dmgLabel + dmgSuffix + '</div>';
    forecastEl.innerHTML = html;
    forecastEl.classList.remove("is-hidden");
    announce(def.name + " — Hit: " + hitPct + "% — " + label + ": " + dmgPrefix + dmg + dmgLabel + dmgSuffix);
  }

  function showAreaForecast(attacker, ab) {
    var label = abilityName(ab);
    var dmg = physicalDamage(attacker, attacker, ab.mult || 1, ab.ignoreDefPct || 0, true);
    var html = '<div class="fc-name">' + _esc(label) + '</div>';
    html += '<div class="fc-dmg">~' + dmg + ' dmg per foe in area</div>';
    forecastEl.innerHTML = html;
    forecastEl.classList.remove("is-hidden");
  }

  function hideForecast() {
    forecastEl.classList.add("is-hidden");
    announce("");
  }

  function showUnitPanel(u) {
    const def = classById(u.classId);
    var disp = displayClassById(u.classId);
    unitCard.classList.remove("is-hidden");
    var uNameStr = u.displayName ? u.displayName : disp.name;
    if (u.title) uNameStr += " the " + u.title;
    if (u.displayName) uNameStr += " (" + disp.name + ")";
    if (campaignState.active && u.level > 1) uNameStr += " Lv." + u.level;
    ucName.textContent = uNameStr;
    ucClass.textContent = disp.role;
    ucHp.textContent = u.hp + " / " + u.maxHp;
    ucAtk.textContent = String(unitAtk(u));
    ucDef.textContent = String(unitDef(u));
    ucSpd.textContent = String(unitSpd(u));
    ucMove.textContent = String(effectiveMove(u));
    ucJump.textContent = String(unitJump(u));
    ucAbility.textContent = unitAbilities(u).map(function (a) { return abilityName(a) + " — " + abilityDesc(a); }).join(" | ");
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
      if (ab.type === "passive" || ab.type === "summon") return;
      menuIdx++;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ability-menu__btn";
      btn.setAttribute("role", "menuitem");
      btn.innerHTML = "<kbd>" + menuIdx + "</kbd> " + _esc(abilityName(ab)) + "<small>" + _esc(abilityDesc(ab)) + "</small>";
      btn.addEventListener("click", function () {
        hideAbilityMenu();
        state.selectedAbilityIndex = idx;
        beginAbilityTargeting(u, ab, idx);
      });
      abilityMenu.appendChild(btn);
    });
    if (menuIdx === 0) {
      log((typeof I18n !== "undefined" && I18n.t) ? I18n.t("battle.noUsableAbilities") : "No usable abilities.");
      return;
    }
    abilityMenu.classList.remove("is-hidden");
    btnAbility.setAttribute("aria-expanded", "true");
  }

  function hideAbilityMenu() {
    abilityMenu.classList.add("is-hidden");
    abilityMenu.innerHTML = "";
    btnAbility.setAttribute("aria-expanded", "false");
  }

  async function clearPlayerTurn() {
    const actor = state.activeUnit;
    if (actor) {
      if (state._playerKilledThisTurn) {
        state._pacifistStreak = 0;
      } else {
        state._pacifistStreak = (state._pacifistStreak || 0) + 1;
        if (state._pacifistStreak >= 5) state._statPacifistTurn = true;
      }
      state._playerKilledThisTurn = false;
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
    await tickBattleTurn();
  }

  function endMove() {
    state.hasMoved = true;
    state.battleMode = "idle";
    state.highlightCells.clear();
    hideForecast();
    const u = state.activeUnit;
    if (u) {
      updateBondBuff(u);
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
    updateBondBuff(u);
    showUnitPanel(u);
    setBattleButtons(u);
    renderBoard();
    log("Move undone.");
  }

  function endAction() {
    state.hasActed = true;
    clearPlayerTurn().catch(function(e) { console.error("Turn error:", e); state.animating = false; });
  }

  async function waitAction() {
    if (state.animating) return;
    if (!state.activeUnit || state.activeUnit.team !== "player") return;
    recordAction(state.activeUnit, "wait", {});

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
          battleLoopRunning = false;
          await delay(300);
          showResultOverlay("victory");
          return;
        }
      }
    }

    log("Guard.");
    clearPlayerTurn().catch(function(e) { console.error("Turn error:", e); state.animating = false; });
  }

  function cancelTargeting() {
    if (state.battleMode === "idle") return;
    state.battleMode = "idle";
    state.highlightCells.clear();
    state.selectedAbilityIndex = -1;
    state._abyssalAlly = null;
    hideForecast();
    var u = state.activeUnit;
    if (u && u.team === "player") { showUnitPanel(u); setBattleButtons(u); }
    renderBoard();
  }

  function beginMoveMode() {
    if (state.animating) return;
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
    if (state.animating) return;
    const u = state.activeUnit;
    if (!u || u.team !== "player" || state.hasActed) return;
    hideAbilityMenu();
    hideForecast();
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
    if (state.animating) return;
    hideForecast();
    state.battleMode = "ability";
    state.selectedAbilityIndex = idx;
    state.highlightCells.clear();

    if (ab.target === "self" || ab.target === "aoe_adjacent") {
      state.highlightCells.add(cellKey(u.x, u.y));
      log(abilityName(ab) + " — click your tile to activate.");
    } else if (ab.target === "adjacent_enemy") {
      for (const [dx, dy] of DIRS) {
        const tx = u.x + dx;
        const ty = u.y + dy;
        if (!inBounds(tx, ty)) continue;
        const t = occupantAt(tx, ty);
        if (t && t.team !== u.team) state.highlightCells.add(cellKey(tx, ty));
      }
      if (state.highlightCells.size === 0) {
        state.battleMode = "idle";
        log(abilityName(ab) + " — no adjacent enemies.");
        return;
      }
      log(abilityName(ab) + " — choose adjacent enemy.");
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
      if (state.highlightCells.size === 0) {
        state.battleMode = "idle";
        log(abilityName(ab) + " — no valid line targets.");
        return;
      }
      log(abilityName(ab) + " — pick a direction tile.");
    } else if (ab.target === "adjacent_ally") {
      for (var aai = 0; aai < DIRS.length; aai++) {
        var aax = u.x + DIRS[aai][0], aay = u.y + DIRS[aai][1];
        if (!inBounds(aax, aay)) continue;
        var aaOcc = occupantAt(aax, aay);
        if (aaOcc && aaOcc.team === u.team && aaOcc.id !== u.id && aaOcc.hp > 0) {
          state.highlightCells.add(cellKey(aax, aay));
        }
      }
      if (state.highlightCells.size === 0) {
        state.battleMode = "idle";
        log(abilityName(ab) + " — no adjacent allies.");
        return;
      }
      log(abilityName(ab) + " — choose adjacent ally.");
    } else if (ab.target === "aoe_range") {
      var aoerRange = ab.range || 3;
      for (var aoerX = 0; aoerX < BOARD_W; aoerX++) {
        for (var aoerY = 0; aoerY < BOARD_H; aoerY++) {
          if (Math.abs(aoerX - u.x) + Math.abs(aoerY - u.y) <= aoerRange && (aoerX !== u.x || aoerY !== u.y)) {
            state.highlightCells.add(cellKey(aoerX, aoerY));
          }
        }
      }
      if (state.highlightCells.size === 0) {
        state.battleMode = "idle";
        log(abilityName(ab) + " — no tiles in range.");
        return;
      }
      log(abilityName(ab) + " — choose center tile for area attack.");
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
    if (state.battleMode === "idle") return;
    state.animating = true;

    if (state.battleMode === "move") {
      const k = cellKey(x, y);
      if (!state.highlightCells.has(k)) { state.animating = false; return; }
      state.preMovePos = { x: u.x, y: u.y };
      try {
        var path = computePath(u, x, y);
        if (path.length === 0) { state.animating = false; return; }
        await animateMove(u, path);
        if (u.gifted && u.classId === "secutor" && path.length >= 4) {
          u.pursuitBonusDmg = 3;
          log("Pursuit Sense — bonus damage primed!");
        }
        if (u.classId === "essedarius" && path.length >= 3) {
          var hasMomentum = unitAbilities(u).some(function(a) { return a.aid === "essedarius_momentum"; });
          if (hasMomentum) {
            u.momentumBonus = 3;
            log("Momentum — +3 ATK from charge!");
          }
        }
      } finally {
        state.animating = false;
      }
      log("Advance! — choose an action.");
      endMove();
      return;
    }
    if (state.battleMode === "attack") {
      const k = cellKey(x, y);
      if (!state.highlightCells.has(k)) { state.animating = false; return; }
      const tgt = occupantAt(x, y);
      if (!tgt || tgt.team === u.team) { state.animating = false; return; }
      recordAction(u, "attack", { targetName: tgt.displayName || classById(tgt.classId).name, targetId: tgt.id });
      try {
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
        if (tgt.riposteCharges > 0) {
          applyDamage(u, 5, tgt);
          tgt.riposteCharges--;
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
        if (u.hp <= 0) await animateDeath(u);
      } finally {
        state.animating = false;
      }
      if (await checkVictoryAsync()) return;
      endAction();
      return;
    }
    if (state.battleMode === "shadow_step") {
      const k = cellKey(x, y);
      if (!state.highlightCells.has(k)) { state.animating = false; return; }
      try {
        u.x = x;
        u.y = y;
        state.highlightCells.clear();
        state.battleMode = "idle";
        log("Teleported!");
      } finally {
        state.animating = false;
      }
      endAction();
      return;
    }
    if (state.battleMode === "abyssal_gate") {
      const agk = cellKey(x, y);
      if (!state.highlightCells.has(agk)) { state.animating = false; return; }
      var agAlly = occupantAt(x, y);
      if (!agAlly || agAlly.team !== u.team) { state.animating = false; return; }
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
      if (state.highlightCells.size === 0) {
        state.battleMode = "idle";
        state._abyssalAlly = null;
        state.animating = false;
        log("Abyssal Gate — no valid destination tiles.");
        endAction();
        return;
      }
      state.animating = false;
      renderBoard();
      log("Abyssal Gate — select destination for " + (agAlly.displayName || classById(agAlly.classId).name) + ".");
      return;
    }
    if (state.battleMode === "abyssal_gate_dest") {
      const agdk = cellKey(x, y);
      if (!state.highlightCells.has(agdk)) { state.animating = false; return; }
      try {
        var agTarget = state._abyssalAlly;
        if (agTarget && agTarget.hp > 0) {
          agTarget.x = x;
          agTarget.y = y;
          log("Abyssal Gate — " + (agTarget.displayName || classById(agTarget.classId).name) + " teleported!");
        }
        state.highlightCells.clear();
        state.battleMode = "idle";
        state._abyssalAlly = null;
      } finally {
        state.animating = false;
      }
      endAction();
      return;
    }
    if (state.battleMode === "ability") {
      try {
        var _ab = unitAbilities(u)[state.selectedAbilityIndex];
        var abilityResult = await doPlayerAbility(u, x, y);
        if (abilityResult !== false && _ab && _ab.target !== "self") consumeAttackBuffs(u);
      } finally {
        state.animating = false;
      }
      if (await checkVictoryAsync()) return;
      return;
    }
    state.animating = false;
  }

  async function doPlayerAbility(u, x, y) {
    const cid = u.classId;
    const k = cellKey(x, y);
    const ab = unitAbilities(u)[state.selectedAbilityIndex];
    if (!ab) return false;
    if (!state.highlightCells.has(k)) return false;

    SFX.ability();

    if (ab.target === "self") {
      if (x !== u.x || y !== u.y) return false;
      return executeAbilitySelf(u, ab);
    }

    if (ab.target === "aoe_adjacent") {
      if (x !== u.x || y !== u.y) return false;
      if (ab.effect === "grave_pulse") {
        var allAdj = [];
        for (var gd = 0; gd < DIRS.length; gd++) {
          var gx = u.x + DIRS[gd][0], gy = u.y + DIRS[gd][1];
          var gt = occupantAt(gx, gy);
          if (gt && gt.hp > 0 && gt.team !== u.team) allAdj.push(gt);
        }
        for (var gi = 0; gi < allAdj.length; gi++) {
          applyDamage(allAdj[gi], 4, u);
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
          applyDamage(vbFoes[vbj], vbDmg, u);
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
          applyDamage(deFoes[dej], 6, u);
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
          if (wwFoes[wwj].riposteCharges > 0) {
            applyDamage(u, 5, wwFoes[wwj]);
            wwFoes[wwj].riposteCharges--;
            log("Riposte pricks the attacker!");
          }
          if (u.hp <= 0) { await animateDeath(u); break; }
          applyDamage(wwFoes[wwj], wwDmg, u);
          await Promise.all([animateHitFlash(wwFoes[wwj]), screenShake(80, 2)]);
          log("Whirlwind Fury hits " + classById(wwFoes[wwj].classId).name + " (" + wwDmg + ").");
          if (wwFoes[wwj].hp <= 0) await animateDeath(wwFoes[wwj]);
        }
        if (u.hp <= 0) { endAction(); return; }
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
          return false;
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
      var _lsTotal = 0;
      for (const f of foes) {
        const dmg = physicalDamage(u, f, ab.mult || 1);
        if (f.riposteCharges > 0) {
          applyDamage(u, 5, f);
          f.riposteCharges--;
          log("Riposte pricks the attacker!");
        }
        applyDamage(f, dmg, u);
        await Promise.all([animateHitFlash(f), screenShake(80, 2)]);
        log(abilityName(ab) + " cuts " + classById(f.classId).name + " (" + dmg + ").");
        if (ab.effect === "lifesteal" && ab.steal && u.hp > 0) {
          var _lsAmt = (typeof ab.steal === "number" && ab.steal >= 1) ? ab.steal : Math.round(dmg * (ab.steal || 0.25));
          u.hp = Math.min(u.maxHp, u.hp + _lsAmt);
          spawnDmgNumber(u, "+" + _lsAmt, "#70d870");
          _lsTotal += _lsAmt;
        }
        if (f.hp <= 0) await animateDeath(f);
      }
      if (_lsTotal > 0) log(abilityName(ab) + " heals " + (u.displayName || classById(u.classId).name) + " for " + _lsTotal + " HP.");
      if (!foes.length) log("Whirl in empty air.");
      if (ab.selfDamage) applyDamage(u, ab.selfDamage);
      endAction();
      return;
    }

    if (ab.target === "aoe_range") {
      var arTargets = [];
      for (var arDx = -1; arDx <= 1; arDx++) {
        for (var arDy = -1; arDy <= 1; arDy++) {
          var arTx = x + arDx, arTy = y + arDy;
          if (!inBounds(arTx, arTy)) continue;
          var arOcc = occupantAt(arTx, arTy);
          if (arOcc && arOcc.team !== u.team && arOcc.hp > 0) arTargets.push(arOcc);
        }
      }
      for (var arI = 0; arI < arTargets.length; arI++) {
        if (!rollHit(u, arTargets[arI])) {
          SFX.miss();
          spawnDmgNumber(arTargets[arI], "MISS", "#aaaaaa");
          log(abilityName(ab) + " misses " + (arTargets[arI].displayName || classById(arTargets[arI].classId).name) + "!");
          continue;
        }
        SFX.hit();
        var arDmg = physicalDamage(u, arTargets[arI], ab.mult || 0.5);
        if (arTargets[arI].riposteCharges > 0 && manhattan(u, arTargets[arI]) <= 1) { applyDamage(u, 5, arTargets[arI]); arTargets[arI].riposteCharges--; log("Riposte!"); }
        applyDamage(arTargets[arI], arDmg, u);
        await Promise.all([animateHitFlash(arTargets[arI]), screenShake(80, 2)]);
        log(abilityName(ab) + " rains on " + (arTargets[arI].displayName || classById(arTargets[arI].classId).name) + " (" + arDmg + " dmg).");
        if (arTargets[arI].hp <= 0) await animateDeath(arTargets[arI]);
      }
      if (!arTargets.length) log("Arrows rain on empty ground.");
      endAction();
      return;
    }

    if (ab.target === "line") {
      const dx = Math.sign(x - u.x);
      const dy = Math.sign(y - u.y);
      if (Math.abs(dx) + Math.abs(dy) !== 1) return false;
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
          applyDamage(trHits[tri], trDmg, u);
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
          applyDamage(supHits[supi], 3, u);
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
        log(abilityName(ab) + " strikes only sand.");
        endAction();
        return;
      }
      const hitPct = computeHitChance(u, hit);
      await animateAttack(u, { x: cx, y: cy });
      if (!rollHit(u, hit)) {
        SFX.miss();
        spawnDmgNumber(hit, "MISS", "#aaaaaa");
        log(abilityName(ab) + " misses! (" + hitPct + "% hit)");
        endAction();
        return;
      }
      SFX.hit();
      const dmg = physicalDamage(u, hit, ab.mult || 1, ab.ignoreDefPct || 0);
      if (hit.riposteCharges > 0 && manhattan(u, hit) <= 1) {
        applyDamage(u, 5, hit);
        hit.riposteCharges--;
        log("Riposte!");
      }
      if (u.hp <= 0) { await animateDeath(u); endAction(); return; }
      applyDamage(hit, dmg, u);
      await Promise.all([animateHitFlash(hit), screenShake(80, 2)]);
      log(abilityName(ab) + " pierces for " + dmg + ". (" + hitPct + "% hit)");
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
      if (ab.effect === "defdebuff" && hit.hp > 0) {
        hit.defDebuffTurns = 2;
        hit.defDebuffAmt = 2;
        log(classById(hit.classId).name + " DEF reduced by 2 for 2 turns!");
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
      if (ab.effect === "bleed" && hit.hp > 0 && canDebuff(hit)) {
        hit.bleedTurns = 3;
        log(classById(hit.classId).name + " is bleeding!");
      }
      if (ab.effect === "stun" && hit.hp > 0 && canDebuff(hit)) {
        hit.rootedSkip = Math.max(hit.rootedSkip, 1);
        log(classById(hit.classId).name + " is stunned!");
      }
      if (ab.effect === "push" && hit.hp > 0) {
        var lpnx = hit.x + dx, lpny = hit.y + dy;
        if (inBounds(lpnx, lpny) && !occupantAt(lpnx, lpny) && !isTileImpassableTerrain(lpnx, lpny) && !isTileCollapsed(lpnx, lpny)) {
          await animateMove(hit, [[lpnx, lpny]]);
          log("Pushed back!");
        }
      }
      if (ab.effect === "push2" && hit.hp > 0) {
        var lp2dx = dx, lp2dy = dy;
        for (var lp2i = 0; lp2i < 2; lp2i++) {
          var lp2nx = hit.x + lp2dx, lp2ny = hit.y + lp2dy;
          if (inBounds(lp2nx, lp2ny) && !occupantAt(lp2nx, lp2ny) && !isTileCollapsed(lp2nx, lp2ny) && !isTileImpassableTerrain(lp2nx, lp2ny)) {
            await animateMove(hit, [[lp2nx, lp2ny]]);
          } else break;
        }
        log("Pushed 2 tiles!");
      }
      if (ab.selfDamage) applyDamage(u, ab.selfDamage);
      if (hit.hp <= 0) await animateDeath(hit);
      endAction();
      return;
    }

    if (ab.target === "adjacent_enemy") {
      const tgt = occupantAt(x, y);
      if (!tgt || tgt.team === u.team) return false;
      return executeAbilityOnTarget(u, tgt, ab);
    }

    if (ab.target === "adjacent_ally") {
      var allyTgt = occupantAt(x, y);
      if (!allyTgt || allyTgt.team !== u.team || allyTgt.id === u.id) return false;
      if (ab.aid === "umbra_abyssal_gate") {
        return executeAbilitySelf(u, ab);
      }
      if (ab.type === "heal") {
        var healAmt = Math.max(1, Math.round(allyTgt.maxHp * 0.3));
        allyTgt.hp = Math.min(allyTgt.maxHp, allyTgt.hp + healAmt);
        spawnDmgNumber(allyTgt, "+" + healAmt, "#70d870");
        allyTgt.atkDebuffTurns = 0; allyTgt.atkDebuffAmt = 0;
        allyTgt.defDebuffTurns = 0; allyTgt.defDebuffAmt = 0;
        allyTgt.bleedTurns = 0;
        allyTgt.markDebuffTurns = 0; allyTgt.dreadMarkDmg = 0;
        allyTgt.rootedSkip = 0;
        log(abilityName(ab) + " heals " + (allyTgt.displayName || classById(allyTgt.classId).name) + " for " + healAmt + " HP and cleanses debuffs!");
        endAction();
        return true;
      }
      return executeAbilitySelf(u, ab);
    }
  }

  function executeAbilitySelf(u, ab) {
    recordAction(u, "ability", { abilityName: abilityName(ab) });
    u._statAbilitiesUsed = (u._statAbilitiesUsed || 0) + 1;
    const cid = u.classId;
    const aid = ab.aid;

    if (cid === "murmillo" && aid === "murmillo_cetus_wall") {
      u.braceCharges = 1;
      log(abilityName(ab) + " — you brace for impact.");
    } else if (cid === "murmillo" && aid === "murmillo_testudo") {
      u.testudoBonus = 3;
      log(abilityName(ab) + " — shield raised, +3 DEF this round.");
    } else if (aid === "praetorian_defiant_counter") {
      u.riposteCharges = 2;
      log(abilityName(ab) + " — ready to counter next 2 melee hits.");
    } else if (cid === "thraex" && aid === "thraex_sica_riposte") {
      u.riposteCharges = 1;
      log(abilityName(ab) + " — blade ready.");
    } else if (cid === "secutor" && aid === "secutor_umbra") {
      u.tempExtraMove = true;
      log(abilityName(ab) + " — paths lengthen (Move +1).");
      ucMove.textContent = String(effectiveMove(u));
    } else if (cid === "secutor" && aid === "secutor_blind_rush") {
      u.blindRushAtk = 2;
      u.blindRushDef = 2;
      log(abilityName(ab) + " — +2 ATK, −2 DEF.");
    } else if (cid === "hoplomachus" && aid === "hoplomachus_phalanx_guard") {
      var allies = [];
      for (var pi = 0; pi < DIRS.length; pi++) {
        var px = u.x + DIRS[pi][0], py = u.y + DIRS[pi][1];
        var palc = occupantAt(px, py);
        if (palc && palc.team === u.team && palc.hp > 0) {
          palc.phalanxBonus = 2;
          allies.push(classById(palc.classId).name);
        }
      }
      log(abilityName(ab) + " — " + (allies.length ? allies.join(", ") + " gain +2 DEF." : "no allies in range."));
    } else if (aid === "dimachaerus_shadow_step" || aid === "umbra_phase_walk") {
      state.battleMode = "shadow_step";
      state.highlightCells.clear();
      var stepRange = aid === "umbra_phase_walk" ? 3 : 2;
      for (var sy = 0; sy < BOARD_H; sy++) {
        for (var sx = 0; sx < BOARD_W; sx++) {
          if (manhattan(u, {x: sx, y: sy}) <= stepRange && manhattan(u, {x: sx, y: sy}) > 0
              && !occupantAt(sx, sy) && inBounds(sx, sy) && !isTileCollapsed(sx, sy)
              && !isTileImpassableTerrain(sx, sy)) {
            state.highlightCells.add(cellKey(sx, sy));
          }
        }
      }
      if (state.highlightCells.size === 0) {
        state.battleMode = "idle";
        log(abilityName(ab) + " — no valid tiles in range.");
        endAction();
        return;
      }
      renderBoard();
      log(abilityName(ab) + " — select a tile to teleport to.");
      return false;
    } else if (cid === "provocator" && aid === "provocator_arena_salute") {
      u.rootedSkip = 0;
      u.crowdSpdDebuff = 0;
      u.markDebuffTurns = 0;
      u.markFocusId = null;
      u.dreadMarkDmg = 0;
      u.bleedTurns = 0;
      u.atkDebuffTurns = 0;
      u.atkDebuffAmt = 0;
      u.defDebuffTurns = 0;
      u.defDebuffAmt = 0;
      log(abilityName(ab) + " — all debuffs cleansed!");
    } else if (cid === "samnite" && aid === "samnite_war_cry") {
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
      log(abilityName(ab) + " — " + (cried ? cried + " foes shaken (−2 ATK)!" : "no foes in range."));
    } else if (aid === "sagittarius_high_ground") {
      u.highGroundNext = true;
      log(abilityName(ab) + " — next attack has +15% hit chance.");
    } else if (aid === "essedarius_rally_charge") {
      u.tempExtraMove = true;
      u.rallyCharge = true;
      log(abilityName(ab) + " — Move +2 this turn.");
    } else if (cid === "provocator" && aid === "provocator_rally") {
      const heal = Math.round(u.maxHp * 0.2);
      u.hp = Math.min(u.maxHp, u.hp + heal);
      spawnDmgNumber(u, "+" + heal, "#70d870");
      log(abilityName(ab) + " — restored " + heal + " HP.");

    } else if (aid === "murmillo_iron_will") {
      var iwHeal = Math.round(u.maxHp * 0.15);
      u.hp = Math.min(u.maxHp, u.hp + iwHeal);
      u.rootedSkip = 0;
      spawnDmgNumber(u, "+" + iwHeal, "#70d870");
      log(abilityName(ab) + " — healed " + iwHeal + " HP, root cleansed.");

    } else if (aid === "murmillo_fortress_stance") {
      u.testudoBonus = 4;
      u.fortressRooted = 2;
      u.rootedSkip = 1;
      log(abilityName(ab) + " — +4 DEF, rooted in place.");

    } else if (aid === "murmillo_guardian_aura") {
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
      log(abilityName(ab) + " — " + (gaHealed ? gaHealed + " allies healed 5 HP." : "no allies in range."));

    } else if (aid === "retiarius_neptunes_favor") {
      var nfHeal = Math.round(u.maxHp * 0.2);
      u.hp = Math.min(u.maxHp, u.hp + nfHeal);
      u.tempExtraMove = true;
      spawnDmgNumber(u, "+" + nfHeal, "#70d870");
      log(abilityName(ab) + " — healed " + nfHeal + " HP, Move +1.");

    } else if (aid === "secutor_battle_focus") {
      u.battleFocusNext = true;
      log(abilityName(ab) + " — next attack +25% hit chance.");

    } else if (aid === "thraex_parry") {
      u.parryCharges = 1;
      log(abilityName(ab) + " — next hit halved, counter 3 damage.");

    } else if (aid === "hoplomachus_spear_brace") {
      u.spearBraceActive = true;
      log(abilityName(ab) + " — next attacker takes 4 counter damage.");

    } else if (aid === "hoplomachus_piercing_thrust") {
      log(abilityName(ab) + " activated.");

    } else if (aid === "hoplomachus_phalanx_advance") {
      var paCount = 0;
      for (var pai = 0; pai < DIRS.length; pai++) {
        var pax = u.x + DIRS[pai][0], pay = u.y + DIRS[pai][1];
        var paAlly = occupantAt(pax, pay);
        if (paAlly && paAlly.team === u.team && paAlly.hp > 0 && paAlly.id !== u.id) {
          paAlly.atkBonus = Math.min((paAlly.atkBonus || 0) + 2, 6);
          paAlly.atkBonusTurns = 2;
          paAlly.tempExtraMove = true;
          paCount++;
        }
      }
      log(abilityName(ab) + " — " + (paCount ? paCount + " allies gain +2 ATK, +1 Move." : "no allies in range."));

    } else if (aid === "dimachaerus_evasion") {
      u.testudoBonus = 3;
      log(abilityName(ab) + " — +3 DEF until next turn.");

    } else if (aid === "provocator_inspiring_presence") {
      var ipCount = 0;
      for (var ipi = 0; ipi < DIRS.length; ipi++) {
        var ipx = u.x + DIRS[ipi][0], ipy = u.y + DIRS[ipi][1];
        var ipAlly = occupantAt(ipx, ipy);
        if (ipAlly && ipAlly.team === u.team && ipAlly.hp > 0 && ipAlly.id !== u.id) {
          ipAlly.atkBonus = Math.min((ipAlly.atkBonus || 0) + 2, 6);
          ipAlly.atkBonusTurns = 2;
          ipCount++;
        }
      }
      log(abilityName(ab) + " — " + (ipCount ? ipCount + " allies gain +2 ATK." : "no allies in range."));

    } else if (aid === "provocator_guardians_oath") {
      u.interceptActive = true;
      log(abilityName(ab) + " — ready to intercept the next attack on an adjacent ally.");

    } else if (aid === "provocator_champions_resolve") {
      if (u.resolveUsed) {
        log(abilityName(ab) + " already used this battle.");
        state.battleMode = "idle";
        state.highlightCells.clear();
        state.selectedAbilityIndex = -1;
        setBattleButtons(u);
        return false;
      } else {
        u.hp = u.maxHp;
        u.resolveUsed = true;
        spawnDmgNumber(u, "FULL", "#ffdd44");
        log(abilityName(ab) + " — fully healed!");
      }

    } else if (aid === "samnite_battle_hardened") {
      u.battleHardenedTurns = 2;
      u.battleHardenedAtk = 1;
      u.battleHardenedDef = 2;
      log(abilityName(ab) + " — +2 DEF, +1 ATK for 2 turns.");

    } else if (aid === "samnite_intimidating_roar") {
      var irCount = 0;
      for (var iri = 0; iri < DIRS.length; iri++) {
        var irx = u.x + DIRS[iri][0], iry = u.y + DIRS[iri][1];
        var irFoe = occupantAt(irx, iry);
        if (irFoe && irFoe.team !== u.team && irFoe.hp > 0) {
          irFoe.rootedSkip = Math.max(irFoe.rootedSkip, 1);
          irCount++;
        }
      }
      log(abilityName(ab) + " — " + (irCount ? irCount + " foes rooted!" : "no foes in range."));

    } else if (aid === "sagittarius_eagle_eye") {
      u.eagleEyeHits = 2;
      log(abilityName(ab) + " — next 2 attacks cannot miss.");

    } else if (aid === "umbra_shadow_mend") {
      var smHeal = Math.round(u.maxHp * 0.25);
      u.hp = Math.min(u.maxHp, u.hp + smHeal);
      u.shadowMendAtkPenalty = 2;
      spawnDmgNumber(u, "+" + smHeal, "#70d870");
      log(abilityName(ab) + " — healed " + smHeal + " HP, −2 ATK this turn.");

    } else if (aid === "umbra_abyssal_gate") {
      state.battleMode = "abyssal_gate";
      state.highlightCells.clear();
      for (var agi = 0; agi < DIRS.length; agi++) {
        var agx = u.x + DIRS[agi][0], agy = u.y + DIRS[agi][1];
        var agAlly = occupantAt(agx, agy);
        if (agAlly && agAlly.team === u.team && agAlly.hp > 0 && agAlly.id !== u.id) {
          state.highlightCells.add(cellKey(agx, agy));
        }
      }
      if (state.highlightCells.size === 0) {
        state.battleMode = "idle";
        log(abilityName(ab) + " — no adjacent allies to teleport.");
        endAction();
        return;
      }
      renderBoard();
      log(abilityName(ab) + " — select an adjacent ally to teleport.");
      return false;

    } else if (aid === "vestige_unholy_resilience") {
      u.battleHardenedTurns = 2;
      u.battleHardenedDef = 3;
      u.battleHardenedAtk = 0;
      log(abilityName(ab) + " — +3 DEF for 2 turns.");

    } else if (aid === "praetorian_unyielding") {
      var healAmt = Math.floor(u.maxHp * 0.2);
      u.hp = Math.min(u.maxHp, u.hp + healAmt);
      spawnDmgNumber(u, "+" + healAmt, "#80ff80");
      u.debuffImmuneTurns = 1;
      log(abilityName(ab) + " — healed " + healAmt + " HP, immune to debuffs for 1 turn.");

    } else if (aid === "primus_palus_crowds_favor") {
      if (u.crowdsFavorUsed) {
        log(abilityName(ab) + " already used this battle.");
        state.battleMode = "idle";
        renderBoard();
        return false;
      }
      u.crowdsFavorUsed = true;
      u.hp = u.maxHp;
      u.battleHardenedTurns = 2;
      u.battleHardenedAtk = 3;
      u.battleHardenedDef = 0;
      spawnDmgNumber(u, "FULL", "#ffdd44");
      log(abilityName(ab) + " — fully healed, +3 ATK for 2 turns!");

    } else if (aid === "tertiarius_hold_the_line") {
      u.interceptActive = true;
      spawnDmgNumber(u, "GUARD", "#70b0ff");
      log(abilityName(ab) + " — intercepting hits on adjacent allies!");

    } else if (aid === "tertiarius_last_stand") {
      u.lastStandActive = true;
      spawnDmgNumber(u, "STAND", "#ff6040");
      log(abilityName(ab) + " — +5 ATK, +5 DEF while below 30% HP!");

    } else {
      log(abilityName(ab) + " activated.");
    }
    endAction();
  }

  async function executeAbilityOnTarget(u, tgt, ab) {
    recordAction(u, "ability", { abilityName: abilityName(ab), targetName: tgt.displayName || classById(tgt.classId).name, targetId: tgt.id });
    u._statAbilitiesUsed = (u._statAbilitiesUsed || 0) + 1;
    const cid = u.classId;

    if (cid === "retiarius" && ab.aid === "retiarius_iaculum") {
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

    if (cid === "provocator" && ab.aid === "provocator_provocatio") {
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

    if (ab.effect === "double_strike") {
      for (var _ds = 0; _ds < 2; _ds++) {
        if (tgt.hp <= 0) break;
        await animateAttack(u, tgt);
        var dsHitPct = computeHitChance(u, tgt);
        if (!rollHit(u, tgt)) {
          SFX.miss();
          spawnDmgNumber(tgt, "MISS", "#aaaaaa");
          log(abilityName(ab) + " strike " + (_ds + 1) + " misses! (" + dsHitPct + "% hit)");
          continue;
        }
        SFX.hit();
        var dsDmg = physicalDamage(u, tgt, ab.mult || 0.7, ab.ignoreDefPct || 0);
        if (tgt.riposteCharges > 0) { applyDamage(u, 5, tgt); tgt.riposteCharges--; log("Riposte!"); }
        applyDamage(tgt, dsDmg, u);
        await Promise.all([animateHitFlash(tgt), screenShake(80, 2)]);
        log(abilityName(ab) + " strike " + (_ds + 1) + " deals " + dsDmg + ". (" + dsHitPct + "% hit)");
        if (tgt.hp <= 0) await animateDeath(tgt);
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
        log(abilityName(ab) + " misses! (" + hitPct + "% hit)");
        endAction();
        return;
      }
      SFX.hit();
      const dmg = physicalDamage(u, tgt, ab.mult || 1, ab.ignoreDefPct || 0);
      if (tgt.riposteCharges > 0) { applyDamage(u, 5, tgt); tgt.riposteCharges--; log("Riposte!"); }
      applyDamage(tgt, dmg, u);
      await Promise.all([animateHitFlash(tgt), screenShake(80, 2)]);
      if (tgt.hp > 0) {
        tgt.rootedSkip = Math.max(tgt.rootedSkip, 1);
        log(abilityName(ab) + " deals " + dmg + " and stuns! (" + hitPct + "% hit)");
      } else {
        log(abilityName(ab) + " deals " + dmg + ". (" + hitPct + "% hit)");
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
        log(abilityName(ab) + " — pulled closer!");
      } else {
        log(abilityName(ab) + " — no room to pull.");
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
        log(abilityName(ab) + " misses! (" + hitPct + "% hit)");
        endAction();
        return;
      }
      SFX.hit();
      const dmg = physicalDamage(u, tgt, ab.mult || 1, ab.ignoreDefPct || 0);
      if (tgt.riposteCharges > 0) { applyDamage(u, 5, tgt); tgt.riposteCharges--; log("Riposte!"); }
      applyDamage(tgt, dmg, u);
      await Promise.all([animateHitFlash(tgt), screenShake(80, 2)]);
      if (tgt.hp > 0) {
        tgt.bleedTurns = 3;
        log(abilityName(ab) + " deals " + dmg + " + bleed! (" + hitPct + "% hit)");
      } else {
        log(abilityName(ab) + " deals " + dmg + ". (" + hitPct + "% hit)");
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
        log(abilityName(ab) + " misses! (" + hitPct + "% hit)");
        endAction();
        return;
      }
      SFX.hit();
      const dmg = physicalDamage(u, tgt, ab.mult || 1, ab.ignoreDefPct || 0);
      if (tgt.riposteCharges > 0) { applyDamage(u, 5, tgt); tgt.riposteCharges--; log("Riposte!"); }
      applyDamage(tgt, dmg, u);
      var stealAmt = ab.steal || 0.25;
      var stolen = typeof stealAmt === "number" && stealAmt < 1 ? Math.round(dmg * stealAmt) : stealAmt;
      u.hp = Math.min(u.maxHp, u.hp + stolen);
      spawnDmgNumber(u, "+" + stolen, "#70d870");
      await Promise.all([animateHitFlash(tgt), screenShake(80, 2)]);
      log(abilityName(ab) + " deals " + dmg + ", steals " + stolen + " HP. (" + hitPct + "% hit)");
      if (tgt.hp <= 0) await animateDeath(tgt);
      endAction();
      return;
    }

    if (ab.effect === "atkdebuff") {
      tgt.atkDebuffTurns = ab.debuffTurns || 2;
      tgt.atkDebuffAmt = ab.debuffAmt || 3;
      log(abilityName(ab) + " — " + classById(tgt.classId).name + " weakened (−" + tgt.atkDebuffAmt + " ATK)!");
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
          log(abilityName(ab) + " misses! (" + hitPct + "% hit)");
          endAction();
          return;
        }
        SFX.hit();
        const dmg = physicalDamage(u, tgt, ab.mult, ab.ignoreDefPct || 0);
        if (tgt.riposteCharges > 0) { applyDamage(u, 5, tgt); tgt.riposteCharges--; log("Riposte!"); }
        applyDamage(tgt, dmg, u);
        await Promise.all([animateHitFlash(tgt), screenShake(80, 2)]);
        log(abilityName(ab) + " deals " + dmg + ". (" + hitPct + "% hit)");
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
          log(abilityName(ab) + " — Pushed back!");
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
        log(abilityName(ab) + " misses! (" + dragHitPct + "% hit)");
        endAction();
        return;
      }
      SFX.hit();
      var dragDmg = physicalDamage(u, tgt, ab.mult || 1, 0);
      if (tgt.riposteCharges > 0) { applyDamage(u, 5, tgt); tgt.riposteCharges--; log("Riposte!"); }
      applyDamage(tgt, dragDmg, u);
      await Promise.all([animateHitFlash(tgt), screenShake(80, 2)]);
      log(abilityName(ab) + " deals " + dragDmg + ". (" + dragHitPct + "% hit)");
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

    if (ab.effect === "hpswap") {
      await animateAttack(u, tgt);
      var swapUPct = u.maxHp > 0 ? Math.max(0, u.hp / u.maxHp) : 0;
      var swapTPct = tgt.maxHp > 0 ? Math.max(0, tgt.hp / tgt.maxHp) : 0;
      var newUHp = Math.max(1, Math.min(u.maxHp, Math.round(swapTPct * u.maxHp)));
      var newTHp = Math.max(1, Math.min(tgt.maxHp, Math.round(swapUPct * tgt.maxHp)));
      var uDelta = newUHp - u.hp;
      var tDelta = newTHp - tgt.hp;
      u.hp = newUHp;
      tgt.hp = newTHp;
      if (uDelta > 0) spawnDmgNumber(u, "+" + uDelta, "#70d870");
      else if (uDelta < 0) spawnDmgNumber(u, String(uDelta), "#ff6040");
      if (tDelta > 0) spawnDmgNumber(tgt, "+" + tDelta, "#70d870");
      else if (tDelta < 0) spawnDmgNumber(tgt, String(tDelta), "#ff6040");
      await Promise.all([animateHitFlash(tgt), screenShake(80, 2)]);
      log(abilityName(ab) + " — HP swapped! " + (u.displayName || classById(u.classId).name) + ": " + u.hp + "/" + u.maxHp + ", " + (tgt.displayName || classById(tgt.classId).name) + ": " + tgt.hp + "/" + tgt.maxHp);
      endAction();
      return;
    }

    if (ab.effect === "push2") {
      await animateAttack(u, tgt);
      var p2HitPct = computeHitChance(u, tgt);
      if (!rollHit(u, tgt)) {
        SFX.miss();
        spawnDmgNumber(tgt, "MISS", "#aaaaaa");
        log(abilityName(ab) + " misses! (" + p2HitPct + "% hit)");
        endAction();
        return;
      }
      SFX.hit();
      var p2Dmg = physicalDamage(u, tgt, ab.mult || 1, 0);
      if (tgt.riposteCharges > 0) { applyDamage(u, 5, tgt); tgt.riposteCharges--; log("Riposte!"); }
      applyDamage(tgt, p2Dmg, u);
      await Promise.all([animateHitFlash(tgt), screenShake(80, 2)]);
      log(abilityName(ab) + " deals " + p2Dmg + ". (" + p2HitPct + "% hit)");
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

    if (ab.effect === "cleanse_self") {
      var _cleansed = [];
      if (u.rootedSkip > 0) { u.rootedSkip = 0; _cleansed.push("root"); }
      if (u.atkDebuffTurns > 0) { u.atkDebuffTurns = 0; u.atkDebuffAmt = 0; _cleansed.push("ATK debuff"); }
      if (u.defDebuffTurns > 0) { u.defDebuffTurns = 0; u.defDebuffAmt = 0; _cleansed.push("DEF debuff"); }
      if (u.bleedTurns > 0) { u.bleedTurns = 0; _cleansed.push("bleed"); }
      if (_cleansed.length) log(abilityName(ab) + " cleanses " + _cleansed.join(", ") + "!");
      else log(abilityName(ab) + " — nothing to cleanse.");
      await animateAttack(u, tgt);
      var csHitPct = computeHitChance(u, tgt);
      if (!rollHit(u, tgt, ab)) {
        SFX.miss();
        spawnDmgNumber(tgt, "MISS", "#aaaaaa");
        log(abilityName(ab) + " strike misses! (" + csHitPct + "% hit)");
        endAction();
        return;
      }
      SFX.hit();
      var csDmg = physicalDamage(u, tgt, ab.mult || 1, ab.ignoreDefPct || 0);
      if (tgt.riposteCharges > 0) { applyDamage(u, 5, tgt); tgt.riposteCharges--; log("Riposte!"); }
      applyDamage(tgt, csDmg, u);
      await Promise.all([animateHitFlash(tgt), screenShake(80, 2)]);
      log(abilityName(ab) + " strikes for " + csDmg + ". (" + csHitPct + "% hit)");
      if (tgt.hp <= 0) await animateDeath(tgt);
      endAction();
      return;
    }

    if (ab.effect === "duel") {
      u.duelTarget = tgt.uid;
      u.duelTurns = 3;
      tgt.duelTarget = u.uid;
      tgt.duelTurns = 3;
      spawnDmgNumber(u, "DUEL", "#e8c040");
      spawnDmgNumber(tgt, "DUEL", "#e8c040");
      log(abilityName(ab) + ": " + (u.displayName || classById(u.classId).name) + " and " + (tgt.displayName || classById(tgt.classId).name) + " deal +20% to each other for 3 turns!");
      endAction();
      return;
    }

    if (ab.effect === "teleport_back") {
      await animateAttack(u, tgt);
      var tbHitPct = computeHitChance(u, tgt);
      if (!rollHit(u, tgt, ab)) {
        SFX.miss();
        spawnDmgNumber(tgt, "MISS", "#aaaaaa");
        log(abilityName(ab) + " misses! (" + tbHitPct + "% hit)");
        endAction();
        return;
      }
      SFX.hit();
      var tbDmg = physicalDamage(u, tgt, ab.mult || 1, ab.ignoreDefPct || 0);
      if (tgt.riposteCharges > 0) { applyDamage(u, 5, tgt); tgt.riposteCharges--; log("Riposte!"); }
      applyDamage(tgt, tbDmg, u);
      await Promise.all([animateHitFlash(tgt), screenShake(80, 2)]);
      log(abilityName(ab) + " hits " + classById(tgt.classId).name + " for " + tbDmg + ". (" + tbHitPct + "% hit)");
      if (tgt.hp <= 0) await animateDeath(tgt);
      if (u.hp > 0) {
        var _tbDx = u.x - tgt.x, _tbDy = u.y - tgt.y;
        for (var _tbDist = 2; _tbDist >= 1; _tbDist--) {
          var _tbNx = u.x + _tbDx * _tbDist, _tbNy = u.y + _tbDy * _tbDist;
          if (inBounds(_tbNx, _tbNy) && !occupantAt(_tbNx, _tbNy) && !isTileImpassableTerrain(_tbNx, _tbNy) && !isTileCollapsed(_tbNx, _tbNy)) {
            await animateMove(u, [[_tbNx, _tbNy]]);
            log("Repositions " + _tbDist + " tile(s) back.");
            break;
          }
        }
      }
      endAction();
      return;
    }

    if (ab.type === "attack") {
      await animateAttack(u, tgt);
      const hitPct = computeHitChance(u, tgt);
      if (!rollHit(u, tgt, ab)) {
        SFX.miss();
        spawnDmgNumber(tgt, "MISS", "#aaaaaa");
        log(abilityName(ab) + " misses! (" + hitPct + "% hit)");
        if (ab.selfDamage) applyDamage(u, ab.selfDamage);
        endAction();
        return;
      }
      SFX.hit();
      const dmg = physicalDamage(u, tgt, ab.mult || 1, ab.ignoreDefPct || 0);
      if (tgt.riposteCharges > 0) {
        applyDamage(u, 5, tgt);
        tgt.riposteCharges--;
        log("Riposte!");
      }
      applyDamage(tgt, dmg, u);
      await Promise.all([animateHitFlash(tgt), screenShake(80, 2)]);
      log(abilityName(ab) + " deals " + dmg + " to " + classById(tgt.classId).name + ". (" + hitPct + "% hit)");
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
    if (!pAlive && !eAlive) return "defeat";
    if (!eAlive) return "victory";
    if (!pAlive) return "defeat";
    return null;
  }

  async function checkVictoryAsync() {
    const result = checkVictory();
    if (!result) return false;
    battleLoopRunning = false;
    if (result === "victory") {
      tutorialTip(60, "Victoria! You've completed the practice bout. Surviving fighters carry over to the next mission.");
    }
    await delay(300);
    showResultOverlay(result);
    return true;
  }

  function showResultOverlay(result, opts) {
    opts = opts || {};
    var quiet = opts.quiet === true;
    state._lastBattleResult = result;
    const won = result === "victory";
    if (!quiet) {
      SFX.stopAmbient();
      SFX.stopMusic();
      if (won) { SFX.victory(); } else { SFX.defeat(); }
      SFX.playBattleResultMusic(won);
    }
    resultOverlay.classList.remove("is-hidden", "result-overlay--victory", "result-overlay--defeat");
    resultOverlay.classList.add(won ? "result-overlay--victory" : "result-overlay--defeat");

    var mission = campaignState.active ? Campaign.getMission() : null;
    var _i18 = typeof I18n !== "undefined" && I18n.t;
    var titleText;
    if (state.trainingBout) {
      titleText = _i18 ? (won ? I18n.t("result.trainingVictory") : I18n.t("result.trainingDefeat")) : (won ? "TRAINING — VICTORY" : "TRAINING — DEFEAT");
    } else {
      titleText = _i18 ? (won ? I18n.t("result.victoria") : I18n.t("result.defeat")) : (won ? "VICTORIA!" : "DEFEAT");
    }
    resultTitle.textContent = titleText;
    if (!quiet) announce(titleText);

    var pAlive = state.units.filter(function (u) { return u.team === "player" && u.hp > 0; }).length;
    var pTotal = state.units.filter(function (u) { return u.team === "player"; }).length;
    var html = _i18
      ? "<p>" + I18n.t("result.standing", { alive: pAlive, total: pTotal }) + "</p>"
      : "<p><strong>" + pAlive + "</strong> of <strong>" + pTotal + "</strong> gladiators standing</p>";
    html += _i18
      ? "<p>" + I18n.t("result.turns", { n: state.turnCount }) + "</p>"
      : "<p><strong>" + state.turnCount + "</strong> turns fought</p>";
    html += _i18
      ? "<p>" + I18n.t("result.damageDealt", { n: state.totalDamageDealt }) + "</p>"
      : "<p><strong>" + state.totalDamageDealt + "</strong> damage dealt to enemies</p>";

    var playerUnits = state.units.filter(function (u) { return u.team === "player"; });
    var mvp = playerUnits.reduce(function(best, u) {
      return (u._statDmgDealt || 0) > (best._statDmgDealt || 0) ? u : best;
    }, playerUnits[0]);
    if (mvp && (mvp._statDmgDealt || 0) > 0) {
      var mvpName = _esc(mvp.displayName || displayClassById(mvp.classId).name);
      html += _i18
        ? '<p class="result-mvp">' + I18n.t("result.mvp", { name: mvpName, dmg: mvp._statDmgDealt, kills: mvp._statKills || 0 }) + "</p>"
        : '<p class="result-mvp">MVP: ' + mvpName + " — " + mvp._statDmgDealt + " dmg, " + (mvp._statKills || 0) + " kills</p>";
    }
    if (state._statFirstBlood) {
      html += _i18
        ? '<p style="font-size:0.8rem;color:var(--fft-text-dim);">' + I18n.t("result.firstBlood", { name: _esc(state._statFirstBlood) }) + "</p>"
        : '<p style="font-size:0.8rem;color:var(--fft-text-dim);">First blood: ' + _esc(state._statFirstBlood) + "</p>";
    }

    html += '<div class="result-stats-grid">';
    playerUnits.sort(function(a, b) { return (b._statDmgDealt || 0) - (a._statDmgDealt || 0); });
    for (var _ri = 0; _ri < playerUnits.length; _ri++) {
      var _ru = playerUnits[_ri];
      var _rn = _esc(_ru.displayName || displayClassById(_ru.classId).name);
      var _rowStats = _i18
        ? I18n.t("result.statRow", { dmg: _ru._statDmgDealt || 0, k: _ru._statKills || 0, taken: _ru._statDmgTaken || 0 })
        : (_ru._statDmgDealt || 0) + " dmg · " + (_ru._statKills || 0) + "K · " + (_ru._statDmgTaken || 0) + " taken";
      html += "<div><span>" + _rn + "</span><span>" + _rowStats + "</span></div>";
    }
    html += "</div>";

    if (campaignState.active && won && mission && !state.trainingBout) {
      var bonus = mission.victoryBonus;
      if (pAlive === pTotal) bonus += mission.perfectBonus;
      html += _i18
        ? '<p style="color:var(--fft-gold);margin-top:0.5rem;">' + I18n.t("result.denariiEarned", { n: bonus }) + "</p>"
        : '<p style="color:var(--fft-gold);margin-top:0.5rem;">+' + bonus + " denarii earned</p>";
      var xpRows = playerUnits;
      if (xpRows.length) {
        html += '<div style="margin-top:0.5rem;font-size:0.85rem;color:var(--fft-text-dim);">';
        for (var xi = 0; xi < xpRows.length; xi++) {
          var xu = xpRows[xi];
          var xName = _esc(xu.displayName || displayClassById(xu.classId).name);
          html += _i18
            ? "<div>" + I18n.t("result.xpLine", { name: xName, lv: xu.level || 1, xp: xu.xp || 0, kills: xu.kills || 0 }) + "</div>"
            : "<div>" + xName + " — Lv." + (xu.level || 1) + ", " + (xu.xp || 0) + " XP, " + (xu.kills || 0) + " kills</div>";
        }
        html += "</div>";
      }
      if (!state._resultBookkept) {
        state._resultBookkept = true;
        campaignState.campaignStats.totalBattles++;
        campaignState.campaignStats.totalKills += playerUnits.reduce(function(s, u) { return s + (u._statKills || 0); }, 0);
        campaignState.campaignStats.totalDamage += state.totalDamageDealt;
        campaignState.campaignStats.totalTurns += state.turnCount;
        var _battleDeaths = playerUnits.filter(function(u) { return u.hp <= 0; }).length;
        if (_battleDeaths === 0 && won) {
          campaignState.campaignStats.deathlessBattles = (campaignState.campaignStats.deathlessBattles || 0) + 1;
        }
        if (!campaignState.campaignStats.classesUsed) campaignState.campaignStats.classesUsed = {};
        for (var _ci = 0; _ci < playerUnits.length; _ci++) {
          campaignState.campaignStats.classesUsed[playerUnits[_ci].classId] = true;
        }
        campaignState.campaignStats.peakDenarii = Math.max(campaignState.campaignStats.peakDenarii || 0, campaignState.denarii || 0);
      }
    } else if (won) {
      html += _i18
        ? '<p style="color:var(--fft-gold);margin-top:0.5rem;">' + I18n.t("result.crowdChants") + "</p>"
        : '<p style="color:var(--fft-gold);margin-top:0.5rem;">The crowd chants your name!</p>';
    } else {
      html += _i18
        ? '<p style="color:var(--fft-red);margin-top:0.5rem;">' + I18n.t("result.sandClaims") + "</p>"
        : '<p style="color:var(--fft-red);margin-top:0.5rem;">The sand claims another lanista\'s pride.</p>';
    }
    resultBody.innerHTML = html;

    var btnRetry = $("#btnResultRetry");
    if (btnRetry) {
      btnRetry.classList.toggle("is-hidden", !campaignState.active || won);
    }
    var btnReplay = document.getElementById("btnWatchReplay");
    if (btnReplay) {
      btnReplay.classList.toggle("is-hidden", !state.battleRecord || state.battleRecord.length === 0);
    }
    if (!quiet) {
      trapFocus(resultOverlay);
      setTimeout(function() { ($("#btnResultContinue") || resultOverlay).focus(); }, 100);
      checkAchievements();
    }
  }

  function closeResultAndReset() {
    resultOverlay.classList.add("is-hidden");
    releaseFocusTrap();

    var promoEligible = collectPendingPromotions();
    if (promoEligible.length > 0) {
      processPromotionQueue(promoEligible, 0, function() {
        _postPromotionContinue();
      });
      return;
    }
    _postPromotionContinue();
  }

  function _postPromotionContinue() {
    if (campaignState.active) {
      closeResultCampaign();
      return;
    }

    if (state.survivalMode) {
      var result = checkVictory();
      if (result === "victory") {
        for (var i = 0; i < state.picks.length; i++) {
          var p = state.picks[i];
          var u = state.units.find(function(u) { return u.uid === p.uid; });
          if (u && u.hp > 0) { p.hp = u.hp; p.maxHp = u.maxHp; p.level = u.level; p.xp = u.xp; p.kills = u.kills; if (u.promotionId) p.promotionId = u.promotionId; }
          else { p.hp = 0; }
        }
        state.picks = state.picks.filter(function(p) { return p.hp > 0; });
        state.survivalDenarii += 15 + state.survivalWave * 5;
        resetMapMods();
        state.units = [];
        if (state.picks.length === 0) {
          survivalDefeat();
          state.survivalMode = false;
          showTitleScreen();
        } else {
          var alive = state.picks.filter(function(p) { return p.hp > 0; });
          state.survivalScore += alive.length * 20 + state.survivalWave * 50 + state.totalDamageDealt;
          state.totalDamageDealt = 0;
          showSurvivalShop();
        }
      } else {
        survivalDefeat();
        state.survivalMode = false;
        resetMapMods();
        state.units = [];
        showTitleScreen();
      }
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
      } else if (v.condition && !Campaign.checkCondition(v.condition)) continue;
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
      var lootCount = 1 + (gameRng() < 0.4 ? 1 : 0);
      var lootPool = EQUIPMENT_DB.filter(function(e) {
        return e.rarity === "common" || (e.rarity === "rare" && gameRng() < 0.4) || (e.rarity === "legendary" && gameRng() < 0.1);
      });
      for (var _li = 0; _li < lootCount && lootPool.length > 0; _li++) {
        var lootItem = lootPool[Math.floor(gameRng() * lootPool.length)];
        campaignState.inventory.push(lootItem.id);
        log("Loot: " + lootItem.name + "!", "system");
      }

      var _deployedUids = {};
      state.units.forEach(function (u) { if (u.team === "player") _deployedUids[u.uid] = true; });
      Campaign.saveSurvivors(state.units, mission.carryHp, false, _deployedUids);

      if (mission.id === "13") {
        Campaign.advance(true);
        Campaign.saveToDisk();
        runEndingScene();
        return;
      }

      Campaign.advance(true);
      Campaign.saveToDisk();

      if (Campaign.isFinished()) {
        runEndingScene();
        return;
      }

      var vignette = pickVignette();
      var rawPost = mission.postScene || [];
      var locPost = (typeof I18n !== "undefined" && I18n.localizeMissionSteps)
        ? I18n.localizeMissionSteps(mission.id, "post", rawPost) : rawPost;
      var postScene = filterScene(locPost);
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

    var rawPreNext = nextMission.preScene || [];
    var preScene = filterScene((typeof I18n !== "undefined" && I18n.localizeMissionSteps)
      ? I18n.localizeMissionSteps(nextMission.id, "pre", rawPreNext) : rawPreNext);
    var choices = nextMission.choices || [];
    var locChoices = (typeof I18n !== "undefined" && I18n.localizeChoices)
      ? I18n.localizeChoices(nextMission.id, choices) : choices;

    if (locChoices.length > 0) {
      var combined = preScene.slice();
      for (var i = 0; i < locChoices.length; i++) {
        if (Campaign.checkCondition(locChoices[i].condition)) {
          combined.push({ choice: locChoices[i] });
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
        nearDeathCount: s.nearDeathCount || 0,
        battlesSurvived: s.battlesSurvived || 0,
        title: s.title || "",
        bonusHp:  s.bonusHp  || 0,
        bonusAtk: s.bonusAtk || 0,
        bonusDef: s.bonusDef || 0,
        bonusSpd: s.bonusSpd || 0,
      };
      if (s.gifted) pick.gifted = true;
      if (s.hp != null) { pick.hp = s.hp; pick.maxHp = s.maxHp; }
      if (s.accent) pick.accent = s.accent;
      if (s.promotionId && _promotionIndex[s.promotionId]) pick.promotionId = s.promotionId;
      if (s.equipment) pick.equipment = s.equipment;
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

    safeSave();

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
    var hSeed = mission ? _hashMissionId(mission.id) * 97 + 42 : (nextBout * 71 + 42);
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
        if (!occupantAt(gx, gy) && !isTileImpassableTerrain(gx, gy) && !isTileCollapsed(gx, gy)) gateTiles.push([gx, gy]);
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
    if (Campaign.getFlag("nero_deal")) return "d";
    if (Campaign.getFlag("valeria_betrayed") || (campaignState.totalDeaths > 5 && !Campaign.getFlag("livia_allied") && !Campaign.getFlag("scaeva_allied"))) return "e";
    if (Campaign.getFlag("livia_allied") && Campaign.getFlag("temple_visited")) return "b";
    return "c";
  }

  function runEndingScene(onComplete) {
    var key = determineEnding();
    campaignState.endingKey = key;
    var scenes = filterScene(Campaign.getEndingScenes(key));
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

  function _renderCampaignCompleteBody() {
    var ngBtn = document.getElementById("btnNewGamePlus");
    if (ngBtn) {
      ngBtn.classList.remove("is-hidden");
      var ngLvl = (campaignState.newGamePlus || 0) + 1;
      if (typeof I18n !== "undefined" && I18n.t) {
        ngBtn.textContent = ngLvl > 1 ? I18n.t("result.ngPlusCycle", { n: ngLvl }) : I18n.t("result.ngPlus");
      } else {
        ngBtn.textContent = "New Game+ " + (ngLvl > 1 ? "(Cycle " + ngLvl + ")" : "");
      }
    }

    var endingLabels = {
      a: "Ending A — Geminus",
      b: "Ending B — The Sacrifice",
      c: "Ending C — The Vessel",
      d: "Ending D — The Emperor's Dog",
      e: "Ending E — The Pyre",
    };
    var endingDescs = {
      a: "Both brothers survive. The ritual is broken by an act of stubborn, stupid love. They walk out of the arena together, into sunlight, into whatever comes next.",
      b: "Titus is restored. Cassius burns the ritual out from within, breaking himself to save everyone else. The cost of love is a broken body and a brother who will never forgive himself.",
      c: "Cassius becomes a vessel for the power beneath the arena. Titus is free. But something ancient looks out through Cassius's eyes now, and it smiles too slowly.",
      d: "Nero's champion wins — but the victory is ashes. Titus doesn't recognize the man who served a tyrant to save him. Cassius stands alone in an empty arena, holding a golden eagle badge worth nothing.",
      e: "The arena burns. The Colosseum screams. Cassius drags his brother from the rubble — alive, human, free. But everyone else is gone. Two brothers, surrounded by the wreckage of every choice that brought them here.",
    };
    var key = campaignState.endingKey || "c";
    var _i18e = typeof I18n !== "undefined" && I18n.t;
    var titleEnd = _i18e ? I18n.t("endings." + key) : (endingLabels[key] || "CAMPAIGN COMPLETE");
    if (!titleEnd || titleEnd === "endings." + key) titleEnd = endingLabels[key] || "CAMPAIGN COMPLETE";
    resultTitle.textContent = titleEnd;
    var desc = _i18e ? I18n.t("endings.desc." + key) : endingDescs[key];
    if (!desc || desc === "endings.desc." + key) desc = endingDescs[key] || (_i18e ? I18n.t("result.campaignOver") : "The Ludi Aeternales are over.");
    var sand = _i18e ? I18n.t("endings.sandRemembers") : "The sand remembers.";
    resultBody.innerHTML = '<p style="color:var(--fft-gold);">' + desc + '</p>' +
      '<p style="color:var(--fft-text-dim);margin-top:0.5rem;">' + sand + "</p>";
    var btnRetry = $("#btnResultRetry");
    if (btnRetry) btnRetry.classList.add("is-hidden");
  }

  function showCampaignComplete() {
    Campaign.clearSave();
    SFX.stopAmbient();
    SFX.stopMusic();
    SFX.startMusic("credits");
    resultOverlay.classList.remove("is-hidden", "result-overlay--victory", "result-overlay--defeat");
    resultOverlay.classList.add("result-overlay--victory");
    _renderCampaignCompleteBody();
    trapFocus(resultOverlay);
    setTimeout(function() { ($("#btnResultContinue") || resultOverlay).focus(); }, 100);
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
      var diffLabel = (typeof I18n !== "undefined" && I18n.difficultyLabel)
        ? I18n.difficultyLabel(campaignState.difficulty || "normal")
        : (DIFFICULTY[campaignState.difficulty] || DIFFICULTY.normal).label;
      hud.innerHTML = '<span class="campaign-hud__mission">' + Campaign.getMissionLabel() + '</span>' +
        ' &mdash; ' + Campaign.getActLabel() +
        ' <span class="campaign-hud__diff">' + _esc((typeof I18n !== "undefined" && I18n.t) ? I18n.t("hud.diffBracket", { label: diffLabel }) : ("[" + diffLabel + "]")) + '</span>';
    }
  }

  // ─── Scene Runner ─────────────────────────────────────────────────

  var sceneQueue = [];
  var sceneCallback = null;

  var _cutsceneUidCounter = 9000;

  function stageCutscene(steps) {
    SFX.startAmbient("cutscene");
    SFX.startMusic("cutscene");
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
      if (!cs.active) { onDone(); return; }
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
        cs.rafId = requestAnimationFrame(tick);
      }
    }
    if (cs.rafId) { cancelAnimationFrame(cs.rafId); cs.rafId = null; }
    cs.rafId = requestAnimationFrame(tick);
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
    if (sceneQueue && sceneQueue.length > 0 && sceneCallback) {
      var prevCb = sceneCallback;
      sceneCallback = null;
      try { prevCb(); } catch (e) { console.error("Scene callback error:", e); }
    }
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
            if (opt.flag === "valeria_betrayed") {
              campaignState.denarii += 50;
            }
            if (opt.flag === "nerva_sacrificed") {
              Campaign.setFlag("nerva_alive", false);
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
      _walkInActor(actor).then(startTypewriter).catch(function() { startTypewriter(); });
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
      releaseFocusTrap();
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
            if (opt.flag === "valeria_betrayed") {
              campaignState.denarii += 50;
            }
            if (opt.flag === "nerva_sacrificed") {
              Campaign.setFlag("nerva_alive", false);
            }
            sceneChoices.classList.add("is-hidden");
            btnNext.classList.remove("is-hidden");
            _showNextSceneStepDOM();
          });
          sceneChoices.appendChild(btn);
          if (_focusFirst) { setTimeout(function() { btn.focus(); }, 100); _focusFirst = false; }
        })(step.choice.options[i]);
      }
      trapFocus(sceneOverlay);
      return;
    }

    sceneOverlay.classList.remove("is-hidden");
    trapFocus(sceneOverlay);
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
    var _ngBadge = document.getElementById("ngPlusBadge");
    if (_ngBadge) _ngBadge.remove();
    if (campaignState.newGamePlus > 0) {
      var badge = document.createElement("div");
      badge.id = "ngPlusBadge";
      badge.className = "ng-plus-badge";
      badge.textContent = "NG+" + campaignState.newGamePlus;
      var sub = document.querySelector(".title-panel__sub");
      if (sub) sub.parentElement.insertBefore(badge, sub.nextSibling);
    }
    if (overlay) {
      overlay.classList.remove("is-hidden");
      trapFocus(overlay);
      var focusBtn = (btnContinue && !btnContinue.classList.contains("is-hidden")) ? btnContinue : $("#btnNewCampaign");
      setTimeout(function() { (focusBtn || overlay).focus(); }, 100);
    }
    SFX.stopAmbient();
    SFX.startMusic("title");
    panelRoster.classList.add("is-hidden");
    panelDeploy.classList.add("is-hidden");
    panelBattle.classList.add("is-hidden");
  }

  function showSlotPicker(mode) {
    lastSlotPickerMode = mode;
    var picker = document.getElementById("slotPicker");
    var slotsDiv = document.getElementById("slotPickerSlots");
    var titleEl = picker.querySelector(".slot-picker__title");
    var _sl = typeof I18n !== "undefined" && I18n.t;
    titleEl.textContent = _sl
      ? (mode === "new" ? I18n.t("title.slotTitleNew") : I18n.t("title.slotTitleCont"))
      : (mode === "new" ? "Pick a Slot for New Campaign" : "Continue Campaign");
    slotsDiv.innerHTML = "";

    var diffPicker = document.getElementById("slotDiffPicker");
    if (diffPicker) diffPicker.classList.toggle("is-hidden", mode !== "new");

    for (var i = 0; i < 3; i++) {
      (function (slot) {
        var summary = Campaign.getSlotSummary(slot);
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn slot-picker__btn";
        if (summary) {
          var d = new Date(summary.savedAt);
          var slotWord = _sl ? I18n.t("title.slotWord") : "Slot";
          var fightLine = _sl
            ? I18n.t("title.fightersFmt", { n: summary.rosterSize, date: d.toLocaleDateString() })
            : (summary.rosterSize + " fighters · " + d.toLocaleDateString());
          btn.innerHTML = "<strong>" + _esc(slotWord) + " " + (slot + 1) + "</strong><br>" + _esc(summary.missionName) + "<br><small>" + fightLine + "</small>";
        } else {
          var slotWordE = _sl ? I18n.t("title.slotWord") : "Slot";
          var emptyW = _sl ? I18n.t("title.slotEmpty") : "Empty";
          btn.innerHTML = "<strong>" + _esc(slotWordE) + " " + (slot + 1) + "</strong><br><em>" + _esc(emptyW) + "</em>";
        }
        var expBtn = document.createElement("button");
        expBtn.type = "button"; expBtn.className = "btn btn--ghost btn--tiny"; expBtn.textContent = "\u2b07";
        expBtn.title = _sl ? I18n.t("title.exportSave") : "Export save";
        expBtn.setAttribute("aria-label", _sl ? I18n.t("title.exportAria", { n: slot + 1 }) : ("Export slot " + (slot + 1)));
        expBtn.addEventListener("click", function(e) { e.stopPropagation(); exportSlot(slot); });
        var impBtn = document.createElement("button");
        impBtn.type = "button"; impBtn.className = "btn btn--ghost btn--tiny"; impBtn.textContent = "\u2b06";
        impBtn.title = _sl ? I18n.t("title.importSave", { n: slot + 1 }) : "Import save";
        impBtn.setAttribute("aria-label", _sl ? I18n.t("title.importAria", { n: slot + 1 }) : ("Import to slot " + (slot + 1)));
        impBtn.addEventListener("click", function(e) { e.stopPropagation(); importSlot(slot); });

        var wrap = document.createElement("div");
        wrap.className = "slot-picker__slot-wrap";
        wrap.appendChild(btn);
        var btns = document.createElement("div");
        btns.className = "slot-picker__io";
        btns.appendChild(expBtn);
        btns.appendChild(impBtn);
        wrap.appendChild(btns);

        btn.addEventListener("click", function () {
          if (mode === "new") {
            var omsg = (_sl ? I18n.t("title.overwriteConfirm", { n: slot + 1 }) : ("Overwrite Slot " + (slot + 1) + "?"));
            if (summary && !confirm(omsg)) return;
            var sel = document.getElementById("slotDiffSelect");
            campaignState.difficulty = sel ? sel.value : "normal";
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
        slotsDiv.appendChild(wrap);
      })(i);
    }
    picker.classList.remove("is-hidden");
  }

  function exportSlot(slot) {
    var json = Campaign.exportSave(slot);
    if (!json) {
      var em = (typeof I18n !== "undefined" && I18n.t) ? I18n.t("title.slotExportEmpty", { n: slot + 1 }) : ("Slot " + (slot + 1) + " is empty.");
      alert(em);
      return;
    }
    var blob = new Blob([json], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "geminus_save_slot_" + (slot+1) + ".json";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importSlot(slot) {
    var inp = document.createElement("input");
    inp.type = "file"; inp.accept = ".json";
    inp.addEventListener("change", function() {
      if (!inp.files || !inp.files[0]) return;
      var reader = new FileReader();
      reader.onload = function() {
        var importResult = Campaign.importSave(reader.result, slot);
        if (importResult === true) {
          alert("Save imported to Slot " + (slot+1) + ".");
          showSlotPicker(document.getElementById("slotDiffPicker").classList.contains("is-hidden") ? "continue" : "new");
        } else if (importResult === "quota") {
          alert("Storage full — cannot import save. Clear browser data or remove other saves.");
        } else if (importResult === "parse") {
          alert("Could not read file — not a valid JSON save.");
        } else {
          alert("Invalid save file.");
        }
      };
      reader.readAsText(inp.files[0]);
    });
    inp.click();
  }

  function hideTitleScreen() {
    releaseFocusTrap();
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

    var rawPre = mission.preScene || [];
    var preScene = filterScene((typeof I18n !== "undefined" && I18n.localizeMissionSteps)
      ? I18n.localizeMissionSteps(mission.id, "pre", rawPre) : rawPre);
    var choices = mission.choices || [];
    var locChoices = (typeof I18n !== "undefined" && I18n.localizeChoices)
      ? I18n.localizeChoices(mission.id, choices) : choices;

    var combined = preScene.slice();
    for (var i = 0; i < locChoices.length; i++) {
      if (Campaign.checkCondition(locChoices[i].condition)) {
        combined.push({ choice: locChoices[i] });
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
    var skEl = document.getElementById("skirmishSettings");
    skEl.classList.remove("is-hidden");
    trapFocus(skEl);
    setTimeout(function() { var b = skEl.querySelector(".btn--gold"); if (b) b.focus(); }, 100);
  }

  function hideSkirmishSettings() {
    document.getElementById("skirmishSettings").classList.add("is-hidden");
    releaseFocusTrap();
    var title = document.getElementById("titleOverlay");
    if (title) { title.classList.remove("is-hidden"); trapFocus(title); }
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

  function startSurvival() {
    var settingsEl = document.getElementById("survivalSettings");
    var diffSel = document.getElementById("survDifficulty");
    settingsEl.classList.add("is-hidden");
    hideTitleScreen();
    Campaign.reset();
    resetMapMods();
    campaignState.difficulty = diffSel ? diffSel.value : "normal";
    state.survivalMode = true;
    state.survivalWave = 0;
    state.survivalScore = 0;
    state.survivalDenarii = 80;
    BOARD_W = 12; BOARD_H = 10;
    budgetCurrent = 140;
    state.phase = "ludus"; state.picks = []; state.units = [];
    state.height = buildHeightField(42);
    state.terrain = buildEmptyTerrain();
    if (renderer) renderer.resize(BOARD_W, BOARD_H);
    updateCampaignHud();
    showPhasePanels();
    refreshRosterUI();
    renderBoard();
  }

  function survivalNextWave() {
    state.survivalWave++;
    var wave = state.survivalWave;
    var enemyCount = Math.min(6, 2 + Math.floor(wave * 0.7));
    var enemyLevel = Math.min(6, 1 + Math.floor((wave - 1) / 2));
    var seed = wave * 997 + 42;
    var rng = seedRng(seed);
    gameRng = seedRng(seed * 1999 + wave);
    BOARD_W = 12; BOARD_H = 10;
    var _survTemplateKeys = Object.keys(MAP_TEMPLATES);
    var _survTemplate = (wave % 4 === 0) ? _survTemplateKeys[Math.floor(rng() * _survTemplateKeys.length)] : null;
    state.height = buildHeightField(seed, _survTemplate);
    state.terrain = buildTerrainMap(seed, null, _survTemplate);
    if (renderer) renderer.resize(BOARD_W, BOARD_H);

    for (var i = 0; i < state.picks.length; i++) {
      var pick = state.picks[i];
      var u = createUnit("player", pick.classId, 0, 0);
      u.uid = pick.uid;
      u.displayName = pick.displayName;
      applyPickLevel(u, pick);
      if (pick.hp != null) { u.hp = Math.min(pick.hp, u.maxHp); }
      state.units.push(u);
    }

    var usedPositions = {};
    var classPool = GLADIATOR_CLASSES.slice();
    for (var j = 0; j < enemyCount; j++) {
      var cls = classPool[Math.floor(rng() * classPool.length)];
      var py = (rng() < 0.5) ? 0 : 1;
      var px;
      do { px = 1 + Math.floor(rng() * (BOARD_W - 2)); }
      while (usedPositions[px + "," + py] || isTileImpassableTerrain(px, py));
      usedPositions[px + "," + py] = true;
      var eu = createUnit("enemy", cls.id, px, py);
      eu.aiProfile = _aiProfileKeys[Math.floor(rng() * _aiProfileKeys.length)];
      eu.level = enemyLevel;
      if (enemyLevel > 1) {
        var egb = computeGrowthBonuses(eu.classId, eu.id, enemyLevel);
        eu.bonusHp = egb.hp; eu.bonusAtk = egb.atk;
        eu.bonusDef = egb.def; eu.bonusSpd = egb.spd;
        if (egb.hp > 0) { eu.maxHp += egb.hp; eu.hp = eu.maxHp; }
      }
      if (wave >= 5) {
        var eqPool = EQUIPMENT_DB.filter(function(e) { return e.rarity === "common" || (wave >= 8 && e.rarity === "rare"); });
        if (eqPool.length) {
          var eq = eqPool[Math.floor(rng() * eqPool.length)];
          if (!eu.equipment) eu.equipment = { weapon: null, armor: null, trinket: null };
          eu.equipment[eq.slot] = eq.id;
        }
      }
      if (wave >= 8 && j === 0) {
        eu.aiProfile = "tactician";
        eu.boss = true;
      }
      var diff = getDiff();
      eu.maxHp = Math.round(eu.maxHp * diff.hpMul); eu.hp = eu.maxHp;
      var _bAtk = classById(eu.classId).atk, _bSpd = classById(eu.classId).spd;
      eu.bonusAtk = (eu.bonusAtk || 0) + Math.round(_bAtk * (diff.atkMul - 1));
      eu.bonusSpd = (eu.bonusSpd || 0) + Math.round(_bSpd * (diff.spdMul - 1));
      state.units.push(eu);
    }
  }

  function showSurvivalShop() {
    var overlay = document.getElementById("survShopOverlay");
    var body = document.getElementById("survShopBody");
    var alive = state.picks.filter(function(p) { return p.hp > 0; });

    var html = '<p>Wave ' + state.survivalWave + ' cleared! Score: ' + state.survivalScore + '</p>';
    html += '<p>Denarii: ' + state.survivalDenarii + '</p>';
    for (var i = 0; i < alive.length; i++) {
      var p = alive[i];
      var name = _esc(p.displayName || classById(p.classId).name);
      html += '<div class="surv-unit-row"><span>' + name + ' HP:' + p.hp + '/' + p.maxHp + '</span>';
      if (p.hp < p.maxHp) {
        html += '<button type="button" class="btn btn--ghost btn--tiny" data-heal="' + i + '">Heal 10HP (5d)</button>';
      }
      html += '</div>';
    }
    body.innerHTML = html;
    body.querySelectorAll("[data-heal]").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var idx = parseInt(btn.getAttribute("data-heal"), 10);
        if (state.survivalDenarii >= 5 && alive[idx].hp < alive[idx].maxHp) {
          state.survivalDenarii -= 5;
          alive[idx].hp = Math.min(alive[idx].maxHp, alive[idx].hp + 10);
          showSurvivalShop();
        }
      });
    });
    overlay.classList.remove("is-hidden");
    trapFocus(overlay);
    SFX.startAmbient("ludus");
    SFX.startMusic("ludus");
  }

  function survivalDefeat() {
    var entry = {
      wave: state.survivalWave,
      score: state.survivalScore,
      date: Date.now(),
      difficulty: campaignState.difficulty || "normal",
      roster: state.picks.map(function(p) { return p.classId; }),
    };
    try {
      var raw = localStorage.getItem("geminus_survival_v1");
      var lb = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(lb)) lb = [];
      lb.push(entry);
      lb.sort(function(a, b) { return b.wave - a.wave || b.score - a.score; });
      if (lb.length > 10) lb = lb.slice(0, 10);
      localStorage.setItem("geminus_survival_v1", JSON.stringify(lb));
    } catch(e) {}
  }

  function showSurvivalLeaderboard() {
    var div = document.getElementById("survLeaderboard");
    try {
      var raw = localStorage.getItem("geminus_survival_v1");
      var lb = raw ? JSON.parse(raw) : [];
      if (!lb.length) { div.innerHTML = "<p>No records yet.</p>"; return; }
      var html = '<table><tr><th>#</th><th>Wave</th><th>Score</th><th>Diff</th></tr>';
      for (var i = 0; i < lb.length; i++) {
        var e = lb[i];
        html += '<tr><td>' + (i+1) + '</td><td>' + _esc(String(e.wave)) + '</td><td>' + _esc(String(e.score)) + '</td><td>' + _esc(String(e.difficulty || "?")) + '</td></tr>';
      }
      html += '</table>';
      div.innerHTML = html;
    } catch(e) { div.innerHTML = ""; }
  }

  var ACHIEVEMENTS = [
    { id: "first_blood",    name: "First Blood",        desc: "Win your first battle.",                icon: "\u2694" },
    { id: "veteran",        name: "Veteran Lanista",     desc: "Win 10 battles.",                       icon: "\u2605" },
    { id: "centurion",      name: "Centurion",           desc: "Win 25 battles.",                       icon: "\u2655" },
    { id: "flawless",       name: "Flawless Victory",    desc: "Win a battle without losing a unit.",   icon: "\u2727" },
    { id: "massacre",       name: "Massacre",            desc: "Deal 100+ damage in a single battle.",  icon: "\ud83d\udca5" },
    { id: "collector",      name: "Collector",           desc: "Own 5 equipment items.",                icon: "\ud83d\udee1\ufe0f" },
    { id: "hoarder",        name: "Hoarder",             desc: "Own 15 equipment items.",               icon: "\ud83c\udfe6" },
    { id: "wave_5",         name: "Arena Survivor",      desc: "Reach wave 5 in Survival.",             icon: "\ud83c\udf0a" },
    { id: "wave_10",        name: "Decimator",           desc: "Reach wave 10 in Survival.",            icon: "\ud83d\udd25" },
    { id: "wave_15",        name: "Unstoppable",         desc: "Reach wave 15 in Survival.",            icon: "\ud83c\udf1f" },
    { id: "full_roster",    name: "Full House",          desc: "Have 6 gladiators in your roster.",     icon: "\ud83c\udfe0" },
    { id: "promotion",      name: "Promoted",            desc: "Promote a unit to an advanced class.",  icon: "\u2b06\ufe0f" },
    { id: "all_classes",    name: "Diversity",           desc: "Use all 12 base classes in battle.",    icon: "\ud83c\udf08" },
    { id: "campaign_clear", name: "Ave Imperator",       desc: "Complete the campaign.",                icon: "\ud83c\udfdb\ufe0f" },
    { id: "campaign_hard",  name: "Invictus",            desc: "Complete the campaign on Lanista.",     icon: "\ud83d\udc51" },
    { id: "overkill",       name: "Overkill",            desc: "Land a single hit for 20+ damage.",    icon: "\u26a1" },
    { id: "pacifist_turn",  name: "Mercy",               desc: "Win a battle dealing no kills for 5+ turns.", icon: "\u2618\ufe0f" },
    { id: "speedrunner",    name: "Speedrunner",         desc: "Win a battle in 5 turns or fewer.",    icon: "\u23f1\ufe0f" },
    { id: "deathless",      name: "Deathless",           desc: "Complete 5 campaign battles with no deaths.", icon: "\ud83d\udee1\ufe0f" },
    { id: "hundred_kills",  name: "Hecatomb",            desc: "Accumulate 100 total kills.",           icon: "\ud83d\udc80" },
    { id: "max_level",      name: "Apex",                desc: "Reach maximum level with any unit.",    icon: "\ud83c\udf1e" },
    { id: "rich",           name: "Plutocrat",           desc: "Accumulate 500 denarii.",               icon: "\ud83d\udcb0" },
    { id: "bond_pair",      name: "Brothers in Arms",    desc: "Form a bond between two gladiators.",  icon: "\ud83e\udd1d" },
    { id: "scarred",        name: "Battle-Scarred",      desc: "Have a unit survive near death 3 times.", icon: "\ud83e\ude78" },
  ];

  function _loadAchievements() {
    try {
      var raw = localStorage.getItem("geminus_achievements_v1");
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function _saveAchievements(data) {
    try { localStorage.setItem("geminus_achievements_v1", JSON.stringify(data)); } catch (e) {}
  }

  function _buildAchievementStats() {
    var s = {
      totalBattles: campaignState.campaignStats ? campaignState.campaignStats.totalBattles : 0,
      totalKills: campaignState.campaignStats ? campaignState.campaignStats.totalKills : 0,
      totalDamage: campaignState.campaignStats ? campaignState.campaignStats.totalDamage : 0,
      lastBattleDamage: state.totalDamageDealt || 0,
      lastBattleTurns: state.turnCount || 0,
      lastBattleFlawless: false,
      inventoryCount: campaignState.inventory ? campaignState.inventory.length : 0,
      rosterSize: state.picks ? state.picks.length : 0,
      hasPromotion: false,
      classesUsed: {},
      campaignComplete: false,
      campaignCompleteHard: false,
      survivalBest: 0,
      maxSingleHit: state._statMaxSingleHit || 0,
      deathlessBattles: campaignState.campaignStats ? (campaignState.campaignStats.deathlessBattles || 0) : 0,
      maxDenarii: campaignState.denarii || 0,
      peakDenarii: campaignState.campaignStats ? (campaignState.campaignStats.peakDenarii || 0) : 0,
      hasBond: false,
      maxNearDeath: 0,
      maxLevel: 1,
      pacifistTurn: !!state._statPacifistTurn,
      lastBattleWon: state._lastBattleResult === "victory",
    };

    var playerUnits = state.units ? state.units.filter(function(u) { return u.team === "player"; }) : [];
    var deadCount = playerUnits.filter(function(u) { return u.hp <= 0; }).length;
    s.lastBattleFlawless = playerUnits.length > 0 && deadCount === 0;

    var persistedClasses = (campaignState.campaignStats && campaignState.campaignStats.classesUsed) || {};
    for (var ck in persistedClasses) { if (persistedClasses.hasOwnProperty(ck)) s.classesUsed[ck] = true; }
    for (var i = 0; i < playerUnits.length; i++) {
      s.classesUsed[playerUnits[i].classId] = true;
      if (playerUnits[i].promotionId) s.hasPromotion = true;
      if ((playerUnits[i].level || 1) >= MAX_LEVEL) s.maxLevel = MAX_LEVEL;
    }
    if (state.picks) {
      for (var j = 0; j < state.picks.length; j++) {
        if (state.picks[j].promotionId) s.hasPromotion = true;
        if ((state.picks[j].level || 1) > s.maxLevel) s.maxLevel = state.picks[j].level;
        if ((state.picks[j].nearDeathCount || 0) >= 3) s.maxNearDeath = 3;
      }
    }

    if (campaignState.endingKey) s.campaignComplete = true;
    if (campaignState.endingKey && campaignState.difficulty === "hard") s.campaignCompleteHard = true;

    try {
      var survRaw = localStorage.getItem("geminus_survival_v1");
      var survLb = survRaw ? JSON.parse(survRaw) : [];
      if (survLb.length) s.survivalBest = survLb[0].wave || 0;
    } catch (e) {}

    if (campaignState.flags && campaignState.flags._bondPairs && campaignState.flags._bondPairs.length > 0) {
      s.hasBond = true;
    }

    return s;
  }

  function checkAchievements() {
    var stats = _buildAchievementStats();
    var data = _loadAchievements();
    var newUnlocks = [];

    var checks = {
      first_blood:    function(s) { return s.totalBattles >= 1; },
      veteran:        function(s) { return s.totalBattles >= 10; },
      centurion:      function(s) { return s.totalBattles >= 25; },
      flawless:       function(s) { return s.lastBattleWon && s.lastBattleFlawless; },
      massacre:       function(s) { return s.lastBattleWon && s.lastBattleDamage >= 100; },
      collector:      function(s) { return s.inventoryCount >= 5; },
      hoarder:        function(s) { return s.inventoryCount >= 15; },
      wave_5:         function(s) { return s.survivalBest >= 5; },
      wave_10:        function(s) { return s.survivalBest >= 10; },
      wave_15:        function(s) { return s.survivalBest >= 15; },
      full_roster:    function(s) { return s.rosterSize >= 6; },
      promotion:      function(s) { return s.hasPromotion; },
      all_classes:    function(s) { return Object.keys(s.classesUsed).length >= 12; },
      campaign_clear: function(s) { return s.campaignComplete; },
      campaign_hard:  function(s) { return s.campaignCompleteHard; },
      overkill:       function(s) { return s.maxSingleHit >= 20; },
      pacifist_turn:  function(s) { return s.lastBattleWon && s.pacifistTurn; },
      speedrunner:    function(s) { return s.lastBattleWon && s.lastBattleTurns > 0 && s.lastBattleTurns <= 5; },
      deathless:      function(s) { return s.deathlessBattles >= 5; },
      hundred_kills:  function(s) { return s.totalKills >= 100; },
      max_level:      function(s) { return s.maxLevel >= MAX_LEVEL; },
      rich:           function(s) { return Math.max(s.maxDenarii, s.peakDenarii || 0) >= 500; },
      bond_pair:      function(s) { return s.hasBond; },
      scarred:        function(s) { return s.maxNearDeath >= 3; },
    };

    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      var ach = ACHIEVEMENTS[i];
      if (data[ach.id]) continue;
      var fn = checks[ach.id];
      if (fn && fn(stats)) {
        data[ach.id] = Date.now();
        newUnlocks.push(ach);
      }
    }

    if (newUnlocks.length) {
      _saveAchievements(data);
      _showAchievementToasts(newUnlocks, 0);
    }
  }

  function _showAchievementToasts(list, idx) {
    if (idx >= list.length) return;
    var ach = list[idx];
    var toast = document.getElementById("achieveToast");
    toast.textContent = ach.icon + " " + ach.name + " — " + ach.desc;
    toast.classList.remove("is-hidden");
    toast.classList.add("is-visible");
    setTimeout(function() {
      toast.classList.remove("is-visible");
      setTimeout(function() {
        toast.classList.add("is-hidden");
        _showAchievementToasts(list, idx + 1);
      }, 500);
    }, 3000);
  }

  function showTrophyPanel() {
    var overlay = document.getElementById("trophyOverlay");
    var grid = document.getElementById("trophyGrid");
    var data = _loadAchievements();
    grid.innerHTML = "";
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      var ach = ACHIEVEMENTS[i];
      var unlocked = !!data[ach.id];
      var card = document.createElement("div");
      card.className = "trophy-card" + (unlocked ? " trophy-card--unlocked" : " trophy-card--locked");
      var nameEl = document.createElement("div");
      nameEl.className = "trophy-card__name";
      nameEl.textContent = unlocked ? (ach.icon + " " + ach.name) : "???";
      card.appendChild(nameEl);
      var descEl = document.createElement("div");
      descEl.textContent = unlocked ? ach.desc : "Locked";
      card.appendChild(descEl);
      grid.appendChild(card);
    }
    hideTitleScreen();
    overlay.classList.remove("is-hidden");
    trapFocus(overlay);
  }

  function showBestiaryPanel() {
    var overlay = document.getElementById("bestiaryOverlay");
    var grid = document.getElementById("bestiaryGrid");
    if (!overlay || !grid) return;
    grid.innerHTML = "";
    for (var i = 0; i < GLADIATOR_CLASSES.length; i++) {
      var cls = GLADIATOR_CLASSES[i];
      var card = document.createElement("div");
      card.className = "bestiary-card";
      var header = document.createElement("div");
      header.className = "bestiary-card__header";
      var svgStr = gladiatorSpriteSvg(cls.id, "player");
      var svgWrap = document.createElement("div");
      svgWrap.className = "bestiary-card__sprite";
      svgWrap.innerHTML = svgStr;
      header.appendChild(svgWrap);
      var nameEl = document.createElement("div");
      nameEl.className = "bestiary-card__name";
      nameEl.textContent = cls.name;
      header.appendChild(nameEl);
      card.appendChild(header);
      var stats = document.createElement("div");
      stats.className = "bestiary-card__stats";
      stats.innerHTML = "HP:" + cls.hp + " ATK:" + cls.atk + " DEF:" + cls.def + " SPD:" + cls.spd + " MV:" + cls.move + " JMP:" + cls.jump;
      card.appendChild(stats);
      var abs = cls.abilities || [];
      for (var j = 0; j < abs.length; j++) {
        var ab = abs[j];
        var abEl = document.createElement("div");
        abEl.className = "bestiary-card__ability";
        abEl.textContent = abilityName(ab) + (abilityDesc(ab) ? " — " + abilityDesc(ab) : "");
        card.appendChild(abEl);
      }
      var promos = CLASS_PROMOTIONS[cls.id] || [];
      for (var k = 0; k < promos.length; k++) {
        var pr = promos[k];
        var prEl = document.createElement("div");
        prEl.className = "bestiary-card__promo";
        prEl.textContent = "⬆ " + pr.name;
        if (pr.abilities) {
          for (var pa = 0; pa < pr.abilities.length; pa++) {
            prEl.textContent += " | " + abilityName(pr.abilities[pa]);
          }
        }
        card.appendChild(prEl);
      }
      grid.appendChild(card);
    }
    hideTitleScreen();
    overlay.classList.remove("is-hidden");
    trapFocus(overlay);
  }

  function _snapshotPositions() {
    var snap = [];
    for (var i = 0; i < state.units.length; i++) {
      var u = state.units[i];
      snap.push({ id: u.id, classId: u.classId, team: u.team, col: u.x, row: u.y, hp: u.hp, maxHp: u.maxHp, displayName: u.displayName || null });
    }
    return snap;
  }

  function recordAction(actor, action, details) {
    if (!state.battleRecord) return;
    if (actor && actor.isCinematic) return;
    var entry = {
      turn: state.turnCount,
      actorId: actor ? actor.id : null,
      actorName: actor ? (actor.displayName || classById(actor.classId).name) : "?",
      action: action,
      details: details || {},
      snapshot: _snapshotPositions(),
    };
    state.battleRecord.push(entry);
  }

  var _replayIdx = 0;

  function showReplayOverlay() {
    if (!state.battleRecord || state.battleRecord.length === 0) return;
    var overlay = document.getElementById("replayOverlay");
    var canvas = document.getElementById("replayCanvas");
    var descEl = document.getElementById("replayDesc");
    var stepEl = document.getElementById("replayStep");
    _replayIdx = 0;

    function renderReplayStep() {
      var entry = state.battleRecord[_replayIdx];
      if (!entry) return;
      stepEl.textContent = (_replayIdx + 1) + " / " + state.battleRecord.length;

      var desc = "Turn " + entry.turn + ": " + entry.actorName + " ";
      if (entry.action === "move") desc += "moved to (" + entry.details.toCol + "," + entry.details.toRow + ")";
      else if (entry.action === "attack") desc += "attacked" + (entry.details.targetName ? " " + entry.details.targetName : "") + (entry.details.damage ? " for " + entry.details.damage + " dmg" : "");
      else if (entry.action === "ability") desc += "used " + (entry.details.abilityName || "ability") + (entry.details.targetName ? " on " + entry.details.targetName : "");
      else if (entry.action === "wait") desc += "waited.";
      else desc += entry.action;
      descEl.textContent = desc;

      var rCtx = canvas.getContext("2d");
      var cw = canvas.width;
      var ch = canvas.height;
      rCtx.fillStyle = "#181018";
      rCtx.fillRect(0, 0, cw, ch);

      var snap = entry.snapshot;
      var maxCol = 0, maxRow = 0;
      for (var i = 0; i < snap.length; i++) {
        if (snap[i].col > maxCol) maxCol = snap[i].col;
        if (snap[i].row > maxRow) maxRow = snap[i].row;
      }
      var gridW = Math.max(maxCol + 1, BOARD_W || 12);
      var gridH = Math.max(maxRow + 1, BOARD_H || 10);
      var tileW = Math.floor(cw / (gridW + 1));
      var tileH = Math.floor(ch / (gridH + 1));
      var tileSize = Math.min(tileW, tileH, 40);
      var offX = Math.floor((cw - gridW * tileSize) / 2);
      var offY = Math.floor((ch - gridH * tileSize) / 2);

      rCtx.strokeStyle = "#2a2a2a";
      rCtx.lineWidth = 1;
      for (var gr = 0; gr < gridH; gr++) {
        for (var gc = 0; gc < gridW; gc++) {
          rCtx.strokeRect(offX + gc * tileSize, offY + gr * tileSize, tileSize, tileSize);
        }
      }

      for (var j = 0; j < snap.length; j++) {
        var su = snap[j];
        if (su.hp <= 0) continue;
        var cx = offX + su.col * tileSize + tileSize / 2;
        var cy = offY + su.row * tileSize + tileSize / 2;
        var r = tileSize * 0.35;
        rCtx.beginPath();
        rCtx.arc(cx, cy, r, 0, Math.PI * 2);
        rCtx.fillStyle = su.team === "player" ? "#4488cc" : "#cc4444";
        rCtx.fill();
        if (entry.actorId === su.id) {
          rCtx.lineWidth = 2;
          rCtx.strokeStyle = "#ffdd44";
          rCtx.stroke();
        }
        rCtx.fillStyle = "#fff";
        rCtx.font = "bold " + Math.max(8, tileSize * 0.25) + "px monospace";
        rCtx.textAlign = "center";
        rCtx.textBaseline = "middle";
        var initial = (su.displayName || su.classId || "?").charAt(0).toUpperCase();
        rCtx.fillText(initial, cx, cy);

        var barW = tileSize * 0.7;
        var barH = 3;
        var barX = cx - barW / 2;
        var barY = cy + r + 2;
        rCtx.fillStyle = "#333";
        rCtx.fillRect(barX, barY, barW, barH);
        var hpPct = su.maxHp > 0 ? su.hp / su.maxHp : 0;
        rCtx.fillStyle = hpPct > 0.5 ? "#4a4" : hpPct > 0.25 ? "#aa4" : "#a44";
        rCtx.fillRect(barX, barY, barW * hpPct, barH);
      }
    }

    renderReplayStep();
    resultOverlay.classList.add("is-hidden");
    overlay.classList.remove("is-hidden");
    trapFocus(overlay);

    document.getElementById("btnReplayStart").onclick = function() { _replayIdx = 0; renderReplayStep(); };
    document.getElementById("btnReplayPrev").onclick = function() { if (_replayIdx > 0) _replayIdx--; renderReplayStep(); };
    document.getElementById("btnReplayNext").onclick = function() { if (_replayIdx < state.battleRecord.length - 1) _replayIdx++; renderReplayStep(); };
    document.getElementById("btnReplayEnd").onclick = function() { _replayIdx = state.battleRecord.length - 1; renderReplayStep(); };
    document.getElementById("btnReplayClose").onclick = function() {
      overlay.classList.add("is-hidden");
      releaseFocusTrap();
      resultOverlay.classList.remove("is-hidden");
      trapFocus(resultOverlay);
    };
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
        var pick = candidates[Math.floor(gameRng() * candidates.length)];
        state.mapMods.collapsedTiles.add(cellKey(pick.x, pick.y));
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
    if (enemy.defDebuffTurns > 0) enemy.defDebuffTurns--;
    if (enemy.defDebuffTurns <= 0) enemy.defDebuffAmt = 0;
    if (enemy.debuffImmuneTurns > 0) enemy.debuffImmuneTurns--;
    if (enemy.duelTurns > 0) { enemy.duelTurns--; if (enemy.duelTurns <= 0) enemy.duelTarget = null; }
    if (enemy.bleedTurns > 0) {
      enemy.bleedTurns--;
      applyDamage(enemy, 1);
      log(eDef.name + " bleeds! (−1 HP)");
      if (enemy.hp <= 0) { tickMarkDebuffIfNeeded(enemy); await animateDeath(enemy); return; }
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

    var profile = AI_PROFILES[enemy.aiProfile] || AI_PROFILES.balanced;
    var target;
    if (!getDiff().aiFocusFire && gameRng() < 0.3) {
      target = players[Math.floor(gameRng() * players.length)];
    } else if (profile.targetPref === "weakest" || profile.targetPref === "lowest_hp") {
      target = players.reduce((a, b) => a.hp <= b.hp ? a : b);
    } else if (profile.targetPref === "strongest") {
      target = players.reduce((a, b) => unitAtk(a) >= unitAtk(b) ? a : b);
    } else {
      target = players.reduce((a, b) => manhattan(enemy, a) <= manhattan(enemy, b) ? a : b);
    }

    if (profile.retreatPct > 0 && enemy.maxHp > 0 && enemy.hp / enemy.maxHp < profile.retreatPct) {
      target = players.reduce((a, b) => manhattan(enemy, a) >= manhattan(enemy, b) ? a : b);
    }

    var usedAbilityPreMove = false;
    if (unitAbilities(enemy).length && manhattan(enemy, target) > 1) {
      usedAbilityPreMove = await aiTryPreMoveAbility(enemy, eDef, players, target);
    }

    if (!usedAbilityPreMove) {
      const reach = computeMoves(enemy);
      let best = null;
      let bestScore = 1e9;
      for (const [key] of reach) {
        const sx = cellKeyX(key), sy = cellKeyY(key);
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
      var adjTarget;
      if (!getDiff().aiFocusFire && gameRng() < 0.3) {
        adjTarget = adjTargets[Math.floor(gameRng() * adjTargets.length)];
      } else {
        adjTarget = adjTargets.reduce((a, b) => a.hp <= b.hp ? a : b);
      }

      var usedAdj = false;
      var _abBias = (AI_PROFILES[enemy.aiProfile] || AI_PROFILES.balanced).abilityBias;
      if (gameRng() < _abBias && unitAbilities(enemy).length) {
        usedAdj = await aiTryAdjacentAbility(enemy, eDef, adjTargets, adjTarget);
      }

      if (!usedAdj) {
        await aiBasicAttack(enemy, adjTarget);
      }
    } else if (adjTargets.length === 0 && !usedAbilityPreMove) {
      var _rangedUsed = false;
      if (unitAbilities(enemy).length) {
        _rangedUsed = await aiTryLineAttack(enemy, eDef, players);
        if (!_rangedUsed) _rangedUsed = await aiTryAoeRangeAbility(enemy, eDef, players);
      }
      if (!_rangedUsed) log(eDef.name + " closes distance.");
    }

    if (enemy.hp <= 0) { renderBoard(); return; }
    consumeAttackBuffs(enemy);
    var cursedKill = tickCursedTileDamage(enemy);
    if (cursedKill) await animateDeath(enemy);
    tickMarkDebuffIfNeeded(enemy);
    renderBoard();
  }

  async function aiTryPreMoveAbility(enemy, eDef, players, target) {
    var hpPct = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 1;
    var _namedHealAids = ["murmillo_iron_will", "umbra_shadow_mend", "murmillo_guardian_aura", "provocator_champions_resolve", "retiarius_neptunes_favor"];
    for (const ab of unitAbilities(enemy)) {
      if (ab.type === "heal" && ab.target === "self" && hpPct < 0.5 && _namedHealAids.indexOf(ab.aid) === -1) {
        SFX.ability();
        var heal = Math.round(enemy.maxHp * 0.2);
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
        spawnDmgNumber(enemy, "+" + heal, "#80ff80");
        log(eDef.name + " uses " + abilityName(ab) + " (+" + heal + " HP).");
        return true;
      }
      if (ab.type === "buff" && ab.target === "self") {
        if (ab.aid === "murmillo_testudo" && gameRng() < 0.5) {
          SFX.ability();
          enemy.testudoBonus = 3;
          log(eDef.name + " raises Testudo (+3 DEF).");
          return true;
        }
        if (ab.aid === "murmillo_cetus_wall" && gameRng() < 0.4) {
          SFX.ability();
          enemy.braceCharges = 1;
          log(eDef.name + " braces with Cetus Wall.");
          return true;
        }
        if (ab.aid === "thraex_sica_riposte" && gameRng() < 0.4 && manhattan(enemy, target) <= 2) {
          SFX.ability();
          enemy.riposteCharges = 1;
          log(eDef.name + " readies Sica Riposte.");
          return true;
        }
        if (ab.aid === "secutor_umbra" && gameRng() < 0.6) {
          SFX.ability();
          enemy.tempExtraMove = true;
          log(eDef.name + " uses Umbra (+1 move).");
          return false;
        }
        if (ab.aid === "secutor_blind_rush" && gameRng() < 0.4) {
          SFX.ability();
          enemy.blindRushAtk = 2;
          enemy.blindRushDef = 2;
          log(eDef.name + " uses Blind Rush (+2 ATK, −2 DEF).");
          return false;
        }
        if (ab.aid === "hoplomachus_phalanx_guard" && gameRng() < 0.35) {
          var pAllies = 0;
          for (var pd = 0; pd < DIRS.length; pd++) {
            var ppx = enemy.x + DIRS[pd][0], ppy = enemy.y + DIRS[pd][1];
            var pa = occupantAt(ppx, ppy);
            if (pa && pa.team === enemy.team && pa.hp > 0) { pa.phalanxBonus = 2; pAllies++; }
          }
          if (pAllies) { SFX.ability(); log(eDef.name + " raises Phalanx Guard!"); return true; }
        }
        if (ab.aid === "provocator_arena_salute" && (enemy.rootedSkip || enemy.atkDebuffTurns > 0 || enemy.defDebuffTurns > 0 || enemy.bleedTurns > 0)) {
          SFX.ability();
          enemy.rootedSkip = 0; enemy.crowdSpdDebuff = 0; enemy.markDebuffTurns = 0;
          enemy.markFocusId = null; enemy.dreadMarkDmg = 0; enemy.bleedTurns = 0;
          enemy.atkDebuffTurns = 0; enemy.atkDebuffAmt = 0;
          enemy.defDebuffTurns = 0; enemy.defDebuffAmt = 0;
          log(eDef.name + " uses Arena Salute — cleansed!");
          return true;
        }
        if (ab.aid === "essedarius_rally_charge" && gameRng() < 0.4) {
          SFX.ability();
          enemy.tempExtraMove = true;
          enemy.rallyCharge = true;
          log(eDef.name + " uses Rally Charge (+2 move).");
          return false;
        }
        if (ab.aid === "umbra_phase_walk" && manhattan(enemy, target) > 2 && gameRng() < 0.5) {
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
        if (ab.aid === "dimachaerus_shadow_step" && manhattan(enemy, target) > 2 && gameRng() < 0.4) {
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
        if (ab.aid === "sagittarius_high_ground" && gameRng() < 0.35) {
          SFX.ability();
          enemy.highGroundNext = true;
          log(eDef.name + " uses High Ground (+15% accuracy).");
          return false;
        }
        if (ab.aid === "secutor_battle_focus" && gameRng() < 0.35) {
          SFX.ability();
          enemy.battleFocusNext = true;
          log(eDef.name + " uses Battle Focus (+25% accuracy).");
          return false;
        }
        if (ab.aid === "dimachaerus_evasion" && gameRng() < 0.35 && hpPct < 0.6) {
          SFX.ability();
          enemy.testudoBonus = 3;
          log(eDef.name + " uses Evasion (+3 DEF).");
          return true;
        }
        if (ab.aid === "sagittarius_eagle_eye" && gameRng() < 0.35) {
          SFX.ability();
          enemy.eagleEyeHits = 2;
          log(eDef.name + " uses Eagle Eye — cannot miss!");
          return false;
        }
        if (ab.aid === "vestige_unholy_resilience" && gameRng() < 0.3 && hpPct < 0.5) {
          SFX.ability();
          enemy.battleHardenedTurns = 2;
          enemy.battleHardenedDef = 3;
          enemy.battleHardenedAtk = 0;
          log(eDef.name + " uses Unholy Resilience (+3 DEF).");
          return true;
        }
        if (ab.aid === "thraex_parry" && gameRng() < 0.3 && manhattan(enemy, target) <= 2) {
          SFX.ability();
          enemy.parryCharges = 1;
          log(eDef.name + " uses Parry.");
          return true;
        }
        if (ab.aid === "hoplomachus_spear_brace" && gameRng() < 0.3 && manhattan(enemy, target) <= 2) {
          SFX.ability();
          enemy.spearBraceActive = true;
          log(eDef.name + " readies Spear Brace.");
          return true;
        }
      }
      if (ab.type === "heal" && ab.target === "self" && ab.aid === "murmillo_iron_will" && hpPct < 0.5) {
        SFX.ability();
        var iwH = Math.round(enemy.maxHp * 0.15);
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + iwH);
        enemy.rootedSkip = 0;
        spawnDmgNumber(enemy, "+" + iwH, "#70d870");
        log(eDef.name + " uses Iron Will (+" + iwH + " HP).");
        return true;
      }
      if (ab.aid === "retiarius_neptunes_favor" && ab.type === "heal" && hpPct < 0.5) {
        SFX.ability();
        var nfH = Math.round(enemy.maxHp * 0.2);
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + nfH);
        enemy.tempExtraMove = true;
        spawnDmgNumber(enemy, "+" + nfH, "#70d870");
        log(eDef.name + " uses Neptune's Favor.");
        return false;
      }
      if (ab.aid === "umbra_shadow_mend" && ab.type === "heal" && hpPct < 0.4) {
        SFX.ability();
        var smH = Math.round(enemy.maxHp * 0.25);
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + smH);
        enemy.shadowMendAtkPenalty = 2;
        spawnDmgNumber(enemy, "+" + smH, "#70d870");
        log(eDef.name + " uses Shadow Mend.");
        return true;
      }
      if (ab.aid === "provocator_champions_resolve" && hpPct < 0.3 && !enemy.resolveUsed) {
        SFX.ability();
        enemy.hp = enemy.maxHp;
        enemy.resolveUsed = true;
        spawnDmgNumber(enemy, "FULL", "#ffdd44");
        log(eDef.name + " uses Champion's Resolve — fully healed!");
        return true;
      }
      if (ab.aid === "primus_palus_crowds_favor" && hpPct < 0.3 && !enemy.crowdsFavorUsed) {
        SFX.ability();
        enemy.hp = enemy.maxHp;
        enemy.crowdsFavorUsed = true;
        enemy.battleHardenedTurns = 2; enemy.battleHardenedAtk = 3; enemy.battleHardenedDef = 0;
        spawnDmgNumber(enemy, "FAVOR", "#ffdd44");
        log(eDef.name + " uses " + abilityName(ab) + " — fully healed!");
        return true;
      }
      if (ab.aid === "tertiarius_hold_the_line" && hpPct > 0.5 && gameRng() < 0.25) {
        var htlAdj = false;
        for (var htli = 0; htli < DIRS.length; htli++) {
          var htlx = enemy.x + DIRS[htli][0], htly = enemy.y + DIRS[htli][1];
          var htlt = occupantAt(htlx, htly);
          if (htlt && htlt.team !== enemy.team && htlt.hp > 0) { htlAdj = true; break; }
        }
        if (htlAdj) {
          SFX.ability();
          enemy.interceptActive = true;
          log(eDef.name + " uses Hold the Line!");
          return true;
        }
      }
      if (ab.aid === "tertiarius_last_stand" && hpPct < 0.35 && !enemy.lastStandActive) {
        SFX.ability();
        enemy.lastStandActive = true;
        spawnDmgNumber(enemy, "STAND", "#ff8844");
        log(eDef.name + " activates Last Stand!");
        return true;
      }
      if (ab.aid === "samnite_battle_hardened" && gameRng() < 0.3) {
        SFX.ability();
        enemy.battleHardenedTurns = 2;
        enemy.battleHardenedAtk = 1;
        enemy.battleHardenedDef = 2;
        log(eDef.name + " uses Battle Hardened (+2 DEF, +1 ATK).");
        return true;
      }
      if (ab.aid === "samnite_intimidating_roar" && manhattan(enemy, target) <= 1 && gameRng() < 0.4) {
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
      if (ab.aid === "provocator_inspiring_presence" && gameRng() < 0.3) {
        var ipC = 0;
        for (var ipi = 0; ipi < DIRS.length; ipi++) {
          var eipx = enemy.x + DIRS[ipi][0], eipy = enemy.y + DIRS[ipi][1];
          var eipt = occupantAt(eipx, eipy);
          if (eipt && eipt.team === enemy.team && eipt.hp > 0) { eipt.atkBonus = Math.min((eipt.atkBonus || 0) + 2, 6); eipt.atkBonusTurns = 2; ipC++; }
        }
        if (ipC) { SFX.ability(); log(eDef.name + " Inspiring Presence — " + ipC + " allies buffed!"); return true; }
      }
      if (ab.aid === "samnite_war_cry" && ab.type === "debuff" && ab.target === "self") {
        if (manhattan(enemy, target) <= 1 && gameRng() < 0.35) {
          SFX.ability();
          var wc = 0;
          for (var wd = 0; wd < DIRS.length; wd++) {
            var ewx = enemy.x + DIRS[wd][0], ewy = enemy.y + DIRS[wd][1];
            var ewt = occupantAt(ewx, ewy);
            if (ewt && ewt.team !== enemy.team && ewt.hp > 0 && canDebuff(ewt)) { ewt.atkDebuffTurns = 2; ewt.atkDebuffAmt = 2; wc++; }
          }
          if (wc) { log(eDef.name + " War Cry — " + wc + " foes weakened!"); return true; }
        }
      }
      if (ab.type === "debuff" && ab.target === "adjacent_enemy" && ab.aid === "retiarius_iaculum") {
        if (target.gifted && target.classId === "thraex") continue;
        if (manhattan(enemy, target) <= 1 && gameRng() < 0.5 && !target.rootedSkip && canDebuff(target)) {
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
      if (ab.target === "aoe_adjacent" && ab.effect === "grave_pulse" && adjTargets.length >= 1 && gameRng() < 0.4) {
        SFX.ability();
        var allAdj = [];
        for (var gdi = 0; gdi < DIRS.length; gdi++) {
          var ggx = enemy.x + DIRS[gdi][0], ggy = enemy.y + DIRS[gdi][1];
          var ggt = occupantAt(ggx, ggy);
          if (ggt && ggt.hp > 0 && ggt.team !== enemy.team) allAdj.push(ggt);
        }
        for (var ggi = 0; ggi < allAdj.length; ggi++) {
          applyDamage(allAdj[ggi], 4, enemy);
          await Promise.all([animateHitFlash(allAdj[ggi]), screenShake(80, 2)]);
          log(eDef.name + " Grave Pulse hits " + classById(allAdj[ggi].classId).name + " (4).");
          if (allAdj[ggi].hp <= 0) await animateDeath(allAdj[ggi]);
          if (enemy.hp <= 0) break;
        }
        if (ab.selfDamage && enemy.hp > 0) applyDamage(enemy, ab.selfDamage);
        return true;
      }

      if (ab.target === "aoe_adjacent" && !ab.effect && adjTargets.length >= 2 && gameRng() < 0.6) {
        SFX.ability();
        for (const t of adjTargets) {
          const dmg = physicalDamage(enemy, t, ab.mult || 1);
          if (t.riposteCharges > 0) { applyDamage(enemy, 5, t); t.riposteCharges--; log("Riposte!"); }
          if (enemy.hp <= 0) { await animateDeath(enemy); break; }
          applyDamage(t, dmg, enemy);
          await Promise.all([animateHitFlash(t), screenShake(80, 2)]);
          log(eDef.name + " uses " + abilityName(ab) + " on " + classById(t.classId).name + " (" + dmg + ").");
          if (t.hp <= 0) await animateDeath(t);
        }
        return true;
      }

      if (ab.type === "debuff" && ab.target === "adjacent_enemy" && ab.aid === "provocator_provocatio") {
        if (adjTarget.gifted) continue;
        if (gameRng() < 0.35 && adjTarget.markDebuffTurns <= 0 && canDebuff(adjTarget)) {
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

      if (ab.type === "debuff" && ab.target === "adjacent_enemy" && ab.aid === "retiarius_iaculum") {
        if (adjTarget.gifted && adjTarget.classId === "thraex") continue;
        if (gameRng() < 0.45 && !adjTarget.rootedSkip && canDebuff(adjTarget)) {
          SFX.ability();
          adjTarget.rootedSkip = enemy.gifted ? 2 : 1;
          log(eDef.name + " nets " + classById(adjTarget.classId).name + "!" + (enemy.gifted ? " Binding Net!" : ""));
          return true;
        }
      }

      if (ab.effect === "duel" && !enemy.duelTarget && gameRng() < 0.3) {
        var bestDuelTgt = null, bestDuelAtk = -1;
        for (var dli = 0; dli < adjTargets.length; dli++) {
          var dtAtk = unitAtk(adjTargets[dli]);
          if (dtAtk > bestDuelAtk) { bestDuelAtk = dtAtk; bestDuelTgt = adjTargets[dli]; }
        }
        if (bestDuelTgt) {
          SFX.ability();
          enemy.duelTarget = bestDuelTgt.uid; enemy.duelTurns = 3;
          bestDuelTgt.duelTarget = enemy.uid; bestDuelTgt.duelTurns = 3;
          spawnDmgNumber(enemy, "DUEL", "#ffdd44");
          spawnDmgNumber(bestDuelTgt, "DUEL", "#ffdd44");
          log(eDef.name + " challenges " + classById(bestDuelTgt.classId).name + " to a duel!");
          return true;
        }
      }

      if (ab.type === "attack" && ab.target === "adjacent_enemy" && ab.effect === "push") {
        if (gameRng() < 0.35) {
          SFX.ability();
          await animateAttack(enemy, adjTarget);
          if (rollHit(enemy, adjTarget)) {
            SFX.hit();
            const dmg = physicalDamage(enemy, adjTarget, ab.mult || 1);
            applyDamage(adjTarget, dmg, enemy);
            await Promise.all([animateHitFlash(adjTarget), screenShake(80, 2)]);
            log(eDef.name + " uses " + abilityName(ab) + " on " + classById(adjTarget.classId).name + " (" + dmg + ").");
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
            log(eDef.name + " uses " + abilityName(ab) + " — misses!");
          }
          return true;
        }
      }

      if (ab.type === "utility" && ab.effect === "push" && ab.target === "adjacent_enemy") {
        if (enemy.gifted && enemy.classId === "samnite" && gameRng() < 0.4) {
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
        } else if (gameRng() < 0.25) {
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

      if (ab.type === "attack" && ab.target === "adjacent_enemy" && ab.effect === "stun" && gameRng() < 0.35) {
        SFX.ability();
        await animateAttack(enemy, adjTarget);
        if (rollHit(enemy, adjTarget)) {
          SFX.hit();
          const dmg = physicalDamage(enemy, adjTarget, ab.mult || 1);
          if (adjTarget.riposteCharges > 0) { applyDamage(enemy, 5, adjTarget); adjTarget.riposteCharges--; }
          applyDamage(adjTarget, dmg, enemy);
          await Promise.all([animateHitFlash(adjTarget), screenShake(80, 2)]);
          if (adjTarget.hp > 0 && canDebuff(adjTarget)) adjTarget.rootedSkip = Math.max(adjTarget.rootedSkip, 1);
          log(eDef.name + " uses " + abilityName(ab) + " on " + classById(adjTarget.classId).name + " (" + dmg + (canDebuff(adjTarget) ? " + stun" : "") + ").");
          if (adjTarget.hp <= 0) await animateDeath(adjTarget);
        } else {
          SFX.miss();
          spawnDmgNumber(adjTarget, "MISS", "#aaaaaa");
          log(eDef.name + " uses " + abilityName(ab) + " — misses!");
        }
        return true;
      }

      if (ab.effect === "pull" && ab.target === "adjacent_enemy" && gameRng() < 0.3) {
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

      if (ab.type === "attack" && ab.target === "adjacent_enemy" && ab.effect === "bleed" && gameRng() < 0.35) {
        SFX.ability();
        await animateAttack(enemy, adjTarget);
        if (rollHit(enemy, adjTarget)) {
          SFX.hit();
          const dmg = physicalDamage(enemy, adjTarget, ab.mult || 1);
          if (adjTarget.riposteCharges > 0) { applyDamage(enemy, 5, adjTarget); adjTarget.riposteCharges--; }
          applyDamage(adjTarget, dmg, enemy);
          await Promise.all([animateHitFlash(adjTarget), screenShake(80, 2)]);
          if (adjTarget.hp > 0 && canDebuff(adjTarget)) adjTarget.bleedTurns = 3;
          log(eDef.name + " uses " + abilityName(ab) + " on " + classById(adjTarget.classId).name + " (" + dmg + (adjTarget.hp > 0 && canDebuff(adjTarget) ? " + bleed" : "") + ").");
          if (adjTarget.hp <= 0) await animateDeath(adjTarget);
        } else {
          SFX.miss();
          spawnDmgNumber(adjTarget, "MISS", "#aaaaaa");
          log(eDef.name + " uses " + abilityName(ab) + " — misses!");
        }
        return true;
      }

      if (ab.type === "attack" && ab.target === "adjacent_enemy" && ab.effect === "lifesteal" && gameRng() < 0.4) {
        SFX.ability();
        await animateAttack(enemy, adjTarget);
        if (rollHit(enemy, adjTarget)) {
          SFX.hit();
          const dmg = physicalDamage(enemy, adjTarget, ab.mult || 1);
          if (adjTarget.riposteCharges > 0) { applyDamage(enemy, 5, adjTarget); adjTarget.riposteCharges--; }
          applyDamage(adjTarget, dmg, enemy);
          var stealAmt = ab.steal || 0.25;
          var stolen = (typeof stealAmt === "number" && stealAmt < 1) ? Math.round(dmg * stealAmt) : stealAmt;
          enemy.hp = Math.min(enemy.maxHp, enemy.hp + stolen);
          spawnDmgNumber(enemy, "+" + stolen, "#80ff80");
          await Promise.all([animateHitFlash(adjTarget), screenShake(80, 2)]);
          log(eDef.name + " uses " + abilityName(ab) + " (" + dmg + " dmg, +" + stolen + " HP).");
          if (adjTarget.hp <= 0) await animateDeath(adjTarget);
        } else {
          SFX.miss();
          spawnDmgNumber(adjTarget, "MISS", "#aaaaaa");
          log(eDef.name + " uses " + abilityName(ab) + " — misses!");
        }
        return true;
      }

      if (ab.effect === "atkdebuff" && ab.target === "adjacent_enemy" && gameRng() < 0.35 && canDebuff(adjTarget)) {
        SFX.ability();
        adjTarget.atkDebuffTurns = ab.debuffTurns || 2;
        adjTarget.atkDebuffAmt = ab.debuffAmt || 3;
        log(eDef.name + " uses " + abilityName(ab) + " on " + classById(adjTarget.classId).name + " (−" + adjTarget.atkDebuffAmt + " ATK)!");
        return true;
      }

      if (ab.effect === "entangle" && ab.target === "adjacent_enemy" && gameRng() < 0.35 && !adjTarget.rootedSkip && canDebuff(adjTarget)) {
        SFX.ability();
        adjTarget.rootedSkip = Math.max(adjTarget.rootedSkip, 1);
        adjTarget.atkDebuffTurns = 2;
        adjTarget.atkDebuffAmt = 2;
        log(eDef.name + " Entangle — " + classById(adjTarget.classId).name + " rooted and weakened!");
        return true;
      }

      if (ab.effect === "huntermark" && ab.target === "adjacent_enemy" && gameRng() < 0.35 && canDebuff(adjTarget)) {
        SFX.ability();
        adjTarget.markDebuffTurns = 2;
        adjTarget.markFocusId = null;
        adjTarget.dreadMarkDmg = 3;
        log(eDef.name + " Hunter's Mark — " + classById(adjTarget.classId).name + " takes +3 damage!");
        return true;
      }

      if (ab.effect === "drag" && ab.target === "adjacent_enemy" && gameRng() < 0.35) {
        SFX.ability();
        await animateAttack(enemy, adjTarget);
        if (rollHit(enemy, adjTarget)) {
          SFX.hit();
          var drDmg = physicalDamage(enemy, adjTarget, ab.mult || 1);
          applyDamage(adjTarget, drDmg, enemy);
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

      if (ab.effect === "push2" && ab.target === "adjacent_enemy" && gameRng() < 0.35) {
        SFX.ability();
        await animateAttack(enemy, adjTarget);
        if (rollHit(enemy, adjTarget)) {
          SFX.hit();
          var p2D = physicalDamage(enemy, adjTarget, ab.mult || 1);
          applyDamage(adjTarget, p2D, enemy);
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

      if (ab.target === "aoe_adjacent" && (ab.effect === "voidburst" || ab.effect === "deathembrace" || ab.effect === "whirlwind") && adjTargets.length >= 1 && gameRng() < 0.45) {
        SFX.ability();
        var aoeD = ab.effect === "deathembrace" ? 6 : 0;
        var totalStolen = 0;
        for (var aoei = 0; aoei < adjTargets.length; aoei++) {
          var aoeDmg = aoeD > 0 ? aoeD : physicalDamage(enemy, adjTargets[aoei], ab.mult || 1);
          applyDamage(adjTargets[aoei], aoeDmg, enemy);
          await Promise.all([animateHitFlash(adjTargets[aoei]), screenShake(80, 2)]);
          log(eDef.name + " " + abilityName(ab) + " hits " + classById(adjTargets[aoei].classId).name + " (" + aoeDmg + ").");
          if (ab.effect === "voidburst") totalStolen += 2;
          if (ab.effect === "deathembrace") totalStolen += 6;
          if (adjTargets[aoei].hp <= 0) await animateDeath(adjTargets[aoei]);
          if (enemy.hp <= 0) break;
        }
        if (totalStolen > 0 && enemy.hp > 0) {
          enemy.hp = Math.min(enemy.maxHp, enemy.hp + totalStolen);
          spawnDmgNumber(enemy, "+" + totalStolen, "#80ff80");
        }
        return true;
      }

      if (ab.type === "attack" && ab.target === "adjacent_enemy" && ab.effect === "double_strike" && gameRng() < 0.4) {
        SFX.ability();
        for (var _dsi = 0; _dsi < 2; _dsi++) {
          if (adjTarget.hp <= 0) break;
          await animateAttack(enemy, adjTarget);
          if (rollHit(enemy, adjTarget)) {
            SFX.hit();
            var dsDmg = physicalDamage(enemy, adjTarget, ab.mult || 0.7);
            if (adjTarget.riposteCharges > 0) { applyDamage(enemy, 5, adjTarget); adjTarget.riposteCharges--; log("Riposte!"); }
            applyDamage(adjTarget, dsDmg, enemy);
            await Promise.all([animateHitFlash(adjTarget), screenShake(80, 2)]);
            log(eDef.name + " Frenzy strike " + (_dsi + 1) + " hits " + classById(adjTarget.classId).name + " (" + dsDmg + ").");
            if (adjTarget.hp <= 0) await animateDeath(adjTarget);
          } else {
            SFX.miss();
            spawnDmgNumber(adjTarget, "MISS", "#aaaaaa");
            log(eDef.name + " Frenzy strike " + (_dsi + 1) + " misses!");
          }
        }
        return true;
      }

      if (ab.effect === "hpswap" && ab.target === "adjacent_enemy" && gameRng() < 0.3) {
        var ePct = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
        var tPct = adjTarget.maxHp > 0 ? adjTarget.hp / adjTarget.maxHp : 0;
        if (tPct - ePct >= 0.25) {
          SFX.ability();
          await animateAttack(enemy, adjTarget);
          var newEHp = Math.max(1, Math.min(enemy.maxHp, Math.round(tPct * enemy.maxHp)));
          var newTHp = Math.max(1, Math.min(adjTarget.maxHp, Math.round(ePct * adjTarget.maxHp)));
          enemy.hp = newEHp;
          adjTarget.hp = newTHp;
          await Promise.all([animateHitFlash(adjTarget), screenShake(80, 2)]);
          log(eDef.name + " Fate's Thread — HP swapped!");
          return true;
        }
      }

      if (ab.type === "attack" && ab.target === "adjacent_enemy" && !ab.effect && gameRng() < 0.35) {
        SFX.ability();
        await animateAttack(enemy, adjTarget);
        if (rollHit(enemy, adjTarget)) {
          SFX.hit();
          const dmg = physicalDamage(enemy, adjTarget, ab.mult || 1, ab.ignoreDefPct || 0);
          if (adjTarget.riposteCharges > 0) { applyDamage(enemy, 5, adjTarget); adjTarget.riposteCharges--; }
          if (enemy.hp <= 0) { await animateDeath(enemy); return true; }
          applyDamage(adjTarget, dmg, enemy);
          await Promise.all([animateHitFlash(adjTarget), screenShake(80, 2)]);
          log(eDef.name + " uses " + abilityName(ab) + " on " + classById(adjTarget.classId).name + " (" + dmg + ").");
          if (ab.selfDamage && enemy.hp > 0) applyDamage(enemy, ab.selfDamage);
          if (adjTarget.hp <= 0) await animateDeath(adjTarget);
        } else {
          SFX.miss();
          spawnDmgNumber(adjTarget, "MISS", "#aaaaaa");
          log(eDef.name + " uses " + abilityName(ab) + " — misses!");
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
              if (occ.riposteCharges > 0 && s === 1) { applyDamage(enemy, 5, occ); occ.riposteCharges--; }
              applyDamage(occ, dmg, enemy);
              await Promise.all([animateHitFlash(occ), screenShake(80, 2)]);
              log(eDef.name + " uses " + abilityName(ab) + " on " + classById(occ.classId).name + " (" + dmg + ").");
              if (enemy.gifted && enemy.classId === "hoplomachus" && occ.hp > 0) {
                var ppx = occ.x + dx, ppy = occ.y + dy;
                if (inBounds(ppx, ppy) && !occupantAt(ppx, ppy) && !isTileImpassableTerrain(ppx, ppy) && !isTileCollapsed(ppx, ppy)) {
                  await animateMove(occ, [[ppx, ppy]]);
                  log("Tremor Thrust pushes back!");
                }
              }
              if (ab.effect === "defdebuff" && occ.hp > 0 && canDebuff(occ)) {
                occ.defDebuffTurns = 2;
                occ.defDebuffAmt = 2;
                log(classById(occ.classId).name + " DEF reduced by 2 for 2 turns!");
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
              log(eDef.name + " uses " + abilityName(ab) + " — misses!");
            }
            return true;
          }
          if (occ) break;
        }
      }
    }
    return false;
  }

  async function aiTryAoeRangeAbility(enemy, eDef, players) {
    var abilities = unitAbilities(enemy);
    for (var _ari = 0; _ari < abilities.length; _ari++) {
      var ab = abilities[_ari];
      if (ab.target !== "aoe_range") continue;
      if (gameRng() > 0.4) continue;
      var range = ab.range || 3;
      var bestCenter = null, bestCount = 0;
      for (var cx = 0; cx < BOARD_W; cx++) {
        for (var cy = 0; cy < BOARD_H; cy++) {
          if (Math.abs(cx - enemy.x) + Math.abs(cy - enemy.y) > range) continue;
          if (cx === enemy.x && cy === enemy.y) continue;
          var count = 0;
          for (var adx = -1; adx <= 1; adx++) {
            for (var ady = -1; ady <= 1; ady++) {
              var tx = cx + adx, ty = cy + ady;
              if (!inBounds(tx, ty)) continue;
              var occ = occupantAt(tx, ty);
              if (occ && occ.team === "player" && occ.hp > 0) count++;
            }
          }
          if (count > bestCount) { bestCount = count; bestCenter = { x: cx, y: cy }; }
        }
      }
      if (bestCount === 0 || !bestCenter) continue;
      SFX.ability();
      var targets = [];
      for (var adx2 = -1; adx2 <= 1; adx2++) {
        for (var ady2 = -1; ady2 <= 1; ady2++) {
          var tx2 = bestCenter.x + adx2, ty2 = bestCenter.y + ady2;
          if (!inBounds(tx2, ty2)) continue;
          var occ2 = occupantAt(tx2, ty2);
          if (occ2 && occ2.team === "player" && occ2.hp > 0) targets.push(occ2);
        }
      }
      for (var ti = 0; ti < targets.length; ti++) {
        if (rollHit(enemy, targets[ti])) {
          SFX.hit();
          var dmg = physicalDamage(enemy, targets[ti], ab.mult || 0.5);
          applyDamage(targets[ti], dmg, enemy);
          await Promise.all([animateHitFlash(targets[ti]), screenShake(80, 2)]);
          log(eDef.name + " " + abilityName(ab) + " hits " + classById(targets[ti].classId).name + " (" + dmg + ").");
          if (targets[ti].hp <= 0) await animateDeath(targets[ti]);
        } else {
          SFX.miss();
          spawnDmgNumber(targets[ti], "MISS", "#aaaaaa");
          log(eDef.name + " " + abilityName(ab) + " misses " + classById(targets[ti].classId).name + "!");
        }
      }
      return true;
    }
    return false;
  }

  async function aiBasicAttack(enemy, adjTarget) {
    const eDef = classById(enemy.classId);
    recordAction(enemy, "attack", { targetName: adjTarget.displayName || classById(adjTarget.classId).name, targetId: adjTarget.id });
    await animateAttack(enemy, adjTarget);
    const hitPct = computeHitChance(enemy, adjTarget);
    if (rollHit(enemy, adjTarget)) {
      SFX.hit();
      const dmg = physicalDamage(enemy, adjTarget, 1);
      if (adjTarget.riposteCharges > 0) {
        applyDamage(enemy, 5, adjTarget);
        adjTarget.riposteCharges--;
      }
      applyDamage(adjTarget, dmg, enemy);
      await Promise.all([animateHitFlash(adjTarget), screenShake(100, 3)]);
      log(eDef.name + " strikes " + classById(adjTarget.classId).name + " for " + dmg + ". (" + hitPct + "%)");
      if (adjTarget.hp <= 0) await animateDeath(adjTarget);
      if (enemy.hp <= 0) await animateDeath(enemy);
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

    if (typeof I18n !== "undefined") {
      I18n.applyMeta();
      I18n.applyStaticLabels();
      if (I18n.syncLangButtons) I18n.syncLangButtons();
      document.addEventListener("geminus-locale-change", function () {
        I18n.applyMeta();
        I18n.applyStaticLabels();
        if (I18n.syncLangButtons) I18n.syncLangButtons();
        updateCampaignHud();
        updatePhaseBannerText();
        if (state.phase === "ludus" || state.phase === "deploy") refreshRosterUI();
        if (I18n.refreshSkirmishLabels) I18n.refreshSkirmishLabels();
        var sp = document.getElementById("slotPicker");
        if (sp && !sp.classList.contains("is-hidden")) showSlotPicker(lastSlotPickerMode);
        var ro = document.getElementById("resultOverlay");
        if (ro && !ro.classList.contains("is-hidden")) {
          var ngVis = document.getElementById("btnNewGamePlus");
          if (ngVis && !ngVis.classList.contains("is-hidden")) _renderCampaignCompleteBody();
          else if (state._lastBattleResult) showResultOverlay(state._lastBattleResult, { quiet: true });
        }
      });
    }
    var btnLangEn = document.getElementById("btnLangEn");
    var btnLangEs = document.getElementById("btnLangEs");
    if (btnLangEn && typeof I18n !== "undefined" && I18n.setLocale) {
      btnLangEn.addEventListener("click", function () { I18n.setLocale("en"); });
    }
    if (btnLangEs && typeof I18n !== "undefined" && I18n.setLocale) {
      btnLangEs.addEventListener("click", function () { I18n.setLocale("es"); });
    }

    isoCanvas.addEventListener("gesturestart", function (e) { e.preventDefault(); }, { passive: false });
    isoCanvas.addEventListener("gesturechange", function (e) { e.preventDefault(); }, { passive: false });
    isoCanvas.addEventListener("gestureend", function (e) { e.preventDefault(); }, { passive: false });

    var _spacePanArm = false;
    var _panFromSpace = false;
    var _spacePanStartX = 0;
    var _spacePanStartY = 0;
    var _suppressNextCanvasClick = false;

    window.addEventListener("keydown", function (e) {
      if (e.key !== " " && e.code !== "Space") return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT" || e.target.isContentEditable) return;
      if (state.cutscene.active) return;
      e.preventDefault();
      _spacePanArm = true;
    }, true);
    window.addEventListener("keyup", function (e) {
      if (e.key !== " " && e.code !== "Space") return;
      _spacePanArm = false;
      if (_panFromSpace) {
        _panFromSpace = false;
        renderer._isPanning = false;
      }
    }, true);

    isoCanvas.addEventListener("click", function (e) {
      if (_suppressNextCanvasClick) {
        e.preventDefault();
        e.stopPropagation();
        _suppressNextCanvasClick = false;
        return;
      }
      const rect = isoCanvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cell = renderer.screenToGrid(mx, my);
      state.cursor.visible = false;
      if (cell) onTileClick(cell.col, cell.row);
    });

    var _lastHoverCol = -1, _lastHoverRow = -1, _lastHoverMode = null;
    isoCanvas.addEventListener("mousemove", function (e) {
      const rect = isoCanvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cell = renderer.screenToGrid(mx, my);
      if (cell) {
        if (cell.col === _lastHoverCol && cell.row === _lastHoverRow && state.battleMode === _lastHoverMode) return;
        _lastHoverCol = cell.col;
        _lastHoverRow = cell.row;
        _lastHoverMode = state.battleMode;
        if (state.phase === "battle" || state.phase === "deploy") {
          showTileInfo(cell.col, cell.row);
        }
        const key = cellKey(cell.col, cell.row);
        if (_spacePanArm && !state.cutscene.active) {
          isoCanvas.style.cursor = renderer._isPanning ? "grabbing" : "grab";
        } else if (state.highlightCells.has(key)) {
          if (state.battleMode === "attack" || state.battleMode === "ability") {
            isoCanvas.style.cursor = "crosshair";
            var u = state.activeUnit;
            var tgt = occupantAt(cell.col, cell.row);
            if (u && tgt && tgt.team !== u.team) {
              showForecast(u, tgt, state.battleMode === "ability" ? state.selectedAbilityIndex : -1);
            } else if (u && !tgt && state.battleMode === "ability" && state.selectedAbilityIndex >= 0) {
              var _hoverAb = unitAbilities(u)[state.selectedAbilityIndex];
              if (_hoverAb && _hoverAb.target === "aoe_range") {
                showAreaForecast(u, _hoverAb);
              } else {
                hideForecast();
              }
            } else {
              hideForecast();
            }
          } else if (state.battleMode === "move" && state.activeUnit) {
            isoCanvas.style.cursor = "pointer";
            var _mu = state.activeUnit;
            var _adjEnemy = state.units.find(function(u) {
              return u.hp > 0 && u.team !== _mu.team && Math.abs(u.x - cell.col) + Math.abs(u.y - cell.row) === 1;
            });
            if (_adjEnemy) {
              var _origX = _mu.x, _origY = _mu.y;
              try {
                _mu.x = cell.col; _mu.y = cell.row;
                var _preDmg = physicalDamage(_mu, _adjEnemy, 1, 0, true);
                var _preHit = computeHitChance(_mu, _adjEnemy);
              } finally {
                _mu.x = _origX; _mu.y = _origY;
              }
              var _eName = classById(_adjEnemy.classId).name;
              forecastEl.innerHTML = '<div class="fc-name">' + _esc(_eName) + '</div><div class="fc-hit">Hit: ' + _preHit + '%</div><div class="fc-dmg">~' + _preDmg + ' dmg (if moved here)</div>';
              forecastEl.classList.remove("is-hidden");
            } else {
              hideForecast();
            }
          } else {
            isoCanvas.style.cursor = "pointer";
            hideForecast();
          }
        } else {
          if (_spacePanArm && !state.cutscene.active) {
            isoCanvas.style.cursor = renderer._isPanning ? "grabbing" : "grab";
          } else {
            isoCanvas.style.cursor = "default";
          }
          hideForecast();
        }
      } else {
        if (_lastHoverCol === -1 && _lastHoverRow === -1) return;
        _lastHoverCol = -1;
        _lastHoverRow = -1;
        isoCanvas.style.cursor = (_spacePanArm && !state.cutscene.active) ? "grab" : "default";
        hideTileInfo();
        hideForecast();
      }
    });

    isoCanvas.addEventListener("mouseleave", function () {
      _lastHoverCol = -1;
      _lastHoverRow = -1;
      _lastHoverMode = null;
      hideTileInfo();
      hideForecast();
    });

    // Zoom via scroll wheel
    isoCanvas.addEventListener("wheel", function (e) {
      e.preventDefault();
      if (state.cutscene.active) return;
      var delta = e.deltaY > 0 ? -0.1 : 0.1;
      renderer.setZoom(renderer.zoom + delta);
      scheduleRender();
    }, { passive: false });

    window.addEventListener("keydown", function (e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
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
      if (e.key === "Escape") {
        var _esc_overlays = [
          { id: "bestiaryOverlay", action: function() { document.getElementById("bestiaryOverlay").classList.add("is-hidden"); releaseFocusTrap(); showTitleScreen(); } },
          { id: "trophyOverlay", action: function() { document.getElementById("trophyOverlay").classList.add("is-hidden"); releaseFocusTrap(); showTitleScreen(); } },
          { id: "skirmishSettings", action: hideSkirmishSettings },
          { id: "survivalSettings", action: function() { document.getElementById("survivalSettings").classList.add("is-hidden"); releaseFocusTrap(); showTitleScreen(); } },
          { id: "slotPicker", action: function() { document.getElementById("slotPicker").classList.add("is-hidden"); var btn = document.getElementById("btnNewCampaign"); if (btn) btn.focus(); } },
        ];
        for (var _oi = 0; _oi < _esc_overlays.length; _oi++) {
          var _el = document.getElementById(_esc_overlays[_oi].id);
          if (_el && !_el.classList.contains("is-hidden")) {
            e.preventDefault();
            _esc_overlays[_oi].action();
            return;
          }
        }
      }

      var key = e.key.toLowerCase();
      if (e.repeat) return;

      // Camera controls
      if (key === "q") { renderer.rotate(-1); scheduleRender(); return; }
      if (key === "e") { renderer.rotate(1); scheduleRender(); return; }
      if (key === "=" || key === "+") { renderer.setZoom(renderer.zoom + 0.15); scheduleRender(); return; }
      if (key === "-" || key === "_") { renderer.setZoom(renderer.zoom - 0.15); scheduleRender(); return; }
      if (key === "r" || key === "home") { renderer.zoom = 1.0; renderer.panX = 0; renderer.panY = 0; renderer.rotStep = 0; renderer._recalcLayout(); scheduleRender(); return; }

      if ((state.phase === "battle" || state.phase === "deploy") && (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        state.cursor.visible = true;
        var dx = 0, dy = 0;
        if (e.key === "ArrowUp") dy = -1;
        else if (e.key === "ArrowDown") dy = 1;
        else if (e.key === "ArrowLeft") dx = -1;
        else if (e.key === "ArrowRight") dx = 1;
        state.cursor.x = Math.max(0, Math.min(BOARD_W - 1, state.cursor.x + dx));
        state.cursor.y = Math.max(0, Math.min(BOARD_H - 1, state.cursor.y + dy));
        var _cx = state.cursor.x, _cy = state.cursor.y;
        showTileInfo(_cx, _cy);
        var _cKey = cellKey(_cx, _cy);
        if (state.highlightCells.has(_cKey)) {
          if (state.battleMode === "attack" || state.battleMode === "ability") {
            var _cTgt = occupantAt(_cx, _cy);
            if (state.activeUnit && _cTgt && _cTgt.team !== state.activeUnit.team) {
              showForecast(state.activeUnit, _cTgt, state.battleMode === "ability" ? state.selectedAbilityIndex : -1);
            } else if (state.activeUnit && !_cTgt && state.battleMode === "ability" && state.selectedAbilityIndex >= 0) {
              var _kab = unitAbilities(state.activeUnit)[state.selectedAbilityIndex];
              if (_kab && _kab.target === "aoe_range") showAreaForecast(state.activeUnit, _kab);
              else hideForecast();
            } else { hideForecast(); }
          } else if (state.battleMode === "move" && state.activeUnit) {
            var _kmu = state.activeUnit;
            var _kadj = state.units.find(function(u) {
              return u.hp > 0 && u.team !== _kmu.team && Math.abs(u.x - _cx) + Math.abs(u.y - _cy) === 1;
            });
            if (_kadj) {
              var _koX = _kmu.x, _koY = _kmu.y;
              try {
                _kmu.x = _cx; _kmu.y = _cy;
                var _kDmg = physicalDamage(_kmu, _kadj, 1, 0, true);
                var _kHit = computeHitChance(_kmu, _kadj);
              } finally { _kmu.x = _koX; _kmu.y = _koY; }
              var _kName = classById(_kadj.classId).name;
              forecastEl.innerHTML = '<div class="fc-name">' + _esc(_kName) + '</div><div class="fc-hit">Hit: ' + _kHit + '%</div><div class="fc-dmg">~' + _kDmg + ' dmg (if moved here)</div>';
              forecastEl.classList.remove("is-hidden");
            } else { hideForecast(); }
          } else { hideForecast(); }
        } else { hideForecast(); }
        scheduleRender();
        return;
      }
      if (state.phase === "battle" && state.cursor.visible && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        onTileClick(state.cursor.x, state.cursor.y);
        return;
      }

      // Battle shortcuts — (A)ttack, a(B)ility, (W)ait, E(sc)ape to cancel
      if (state.phase === "battle" && !state.animating && state.activeUnit && state.activeUnit.team === "player") {
        if (key === "m" && !btnMove.disabled) { btnMove.click(); return; }
        if (key === "a" && !btnAttack.disabled) { btnAttack.click(); return; }
        if (key === "b" && !btnAbility.disabled) { btnAbility.click(); return; }
        if (key === "w" && !btnWait.disabled) { btnWait.click(); return; }
        if (key === "u" && !btnUndo.disabled) { btnUndo.click(); return; }
        if (key === "escape") { cancelTargeting(); hideAbilityMenu(); return; }
        // Number keys 1-9 to pick ability from the menu
        if (key >= "1" && key <= "9" && !abilityMenu.classList.contains("is-hidden")) {
          var idx = parseInt(key, 10) - 1;
          var btns = abilityMenu.querySelectorAll(".ability-menu__btn:not(:disabled)");
          if (idx < btns.length) { btns[idx].click(); return; }
        }
      }

      if (key === "f2") { e.preventDefault(); btnMute.click(); return; }
      if (key === "f3") { e.preventDefault(); var _sb = document.getElementById("btnSpeed"); if (_sb) _sb.click(); return; }
    });

    // Pan via middle-mouse, right-click drag, or Space + left-drag
    isoCanvas.addEventListener("mousedown", function (e) {
      if (state.cutscene.active) return;
      if (e.button === 0 && _spacePanArm) {
        e.preventDefault();
        _panFromSpace = true;
        _spacePanStartX = e.clientX;
        _spacePanStartY = e.clientY;
        renderer._isPanning = true;
        renderer._panStartX = e.clientX;
        renderer._panStartY = e.clientY;
        renderer._panOriginX = renderer.panX;
        renderer._panOriginY = renderer.panY;
        return;
      }
      if (e.button === 1 || e.button === 2) {
        e.preventDefault();
        renderer._isPanning = true;
        renderer._panStartX = e.clientX;
        renderer._panStartY = e.clientY;
        renderer._panOriginX = renderer.panX;
        renderer._panOriginY = renderer.panY;
      }
    });
    var _maxPanX = BOARD_W * 64 * 0.5;
    var _maxPanY = BOARD_H * 32 * 0.5;
    function _clampPan() {
      renderer.panX = Math.max(-_maxPanX, Math.min(_maxPanX, renderer.panX));
      renderer.panY = Math.max(-_maxPanY, Math.min(_maxPanY, renderer.panY));
    }
    window.addEventListener("mousemove", function (e) {
      if (!renderer._isPanning) return;
      renderer.panX = renderer._panOriginX + (renderer._panStartX - e.clientX) / renderer.zoom;
      renderer.panY = renderer._panOriginY + (renderer._panStartY - e.clientY) / renderer.zoom;
      _clampPan();
      scheduleRender();
    });
    window.addEventListener("mouseup", function (e) {
      if (e.button === 1 || e.button === 2) {
        renderer._isPanning = false;
      }
      if (e.button === 0 && _panFromSpace) {
        var _sdx = Math.abs(e.clientX - _spacePanStartX);
        var _sdy = Math.abs(e.clientY - _spacePanStartY);
        if (_sdx + _sdy > 10) _suppressNextCanvasClick = true;
        _panFromSpace = false;
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
      // Ludus: canvas is non-interactive (onTileClick returns immediately). Let touches
      // propagate so the page/panel can scroll on phones — otherwise preventDefault traps drags.
      if (state.phase === "ludus") return;
      e.preventDefault();
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
    }, { passive: false });
    isoCanvas.addEventListener("touchmove", function (e) {
      if (state.phase === "ludus") return;
      e.preventDefault();
      if (state.cutscene.active) return;
      if (e.touches.length === 1) {
        var dx = _touch.startX - e.touches[0].clientX;
        var dy = _touch.startY - e.touches[0].clientY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) _touch.moved = true;
        if (_touch.moved) {
          renderer.panX = _touch.panOX + dx / renderer.zoom;
          renderer.panY = _touch.panOY + dy / renderer.zoom;
          _clampPan();
          scheduleRender();
        }
      } else if (e.touches.length === 2) {
        var dist = _touchDist(e.touches);
        if (_touch.pinchDist > 0) {
          renderer.setZoom(_touch.pinchZoom * (dist / _touch.pinchDist));
          scheduleRender();
        }
      }
    }, { passive: false });
    isoCanvas.addEventListener("touchend", function (e) {
      if (state.phase === "ludus") return;
      if (e.changedTouches.length === 1 && !_touch.moved && e.touches.length === 0) {
        var rect = isoCanvas.getBoundingClientRect();
        var mx = _touch.startX - rect.left;
        var my = _touch.startY - rect.top;
        var cell = renderer.screenToGrid(mx, my);
        if (cell) onTileClick(cell.col, cell.row);
      }
    }, { passive: true });

    // Camera control buttons
    btnRotL.addEventListener("click", function () { if (state.cutscene.active) return; renderer.rotate(-1); scheduleRender(); });
    btnRotR.addEventListener("click", function () { if (state.cutscene.active) return; renderer.rotate(1); scheduleRender(); });
    btnZoomIn.addEventListener("click", function () { if (state.cutscene.active) return; renderer.setZoom(renderer.zoom + 0.15); scheduleRender(); });
    btnZoomOut.addEventListener("click", function () { if (state.cutscene.active) return; renderer.setZoom(renderer.zoom - 0.15); scheduleRender(); });
    btnCamReset.addEventListener("click", function () {
      if (state.cutscene.active) return;
      renderer.zoom = 1.0;
      renderer.panX = 0;
      renderer.panY = 0;
      renderer.rotStep = 0;
      renderer._recalcLayout();
      scheduleRender();
    });

    btnWait.addEventListener("mouseenter", function () { previewCtStrip("wait"); });
    btnWait.addEventListener("mouseleave", function () { clearCtPreview(); });

    btnMute.addEventListener("click", function () {
      var muted = SFX.mute();
      btnMute.innerHTML = (muted ? "🔇" : "♪") + "<kbd>F2</kbd>";
      btnMute.setAttribute("aria-label", muted ? "Unmute (F2)" : "Mute (F2)");
    });

    var btnSpeed = document.getElementById("btnSpeed");
    if (btnSpeed) {
      function _updateSpeedBtn() {
        var idx = _ANIM_SPEEDS.indexOf(_animSpeed);
        btnSpeed.innerHTML = _ANIM_LABELS[idx >= 0 ? idx : 0] + "<kbd>F3</kbd>";
        btnSpeed.setAttribute("aria-label", "Animation speed: " + _ANIM_LABELS[idx >= 0 ? idx : 0] + " (F3)");
      }
      _updateSpeedBtn();
      btnSpeed.addEventListener("click", function () {
        var idx = _ANIM_SPEEDS.indexOf(_animSpeed);
        _animSpeed = _ANIM_SPEEDS[(idx + 1) % _ANIM_SPEEDS.length];
        try { localStorage.setItem("geminus_anim_speed", String(_animSpeed)); } catch (e) {}
        _updateSpeedBtn();
      });
    }

    var _resizeTimer = null;
    window.addEventListener("resize", function () {
      clearTimeout(_resizeTimer);
      _resizeTimer = setTimeout(function () {
        renderer.resize(BOARD_W, BOARD_H);
        scheduleRender();
      }, 150);
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        SFX.pause();
      } else {
        SFX.resume();
      }
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
        safeSave();
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
      scheduleRender();
    });
    btnResultContinue.addEventListener("click", closeResultAndReset);

    var btnNGPlus = document.getElementById("btnNewGamePlus");
    if (btnNGPlus) btnNGPlus.addEventListener("click", function () {
      Campaign.startNewGamePlus();
      resultOverlay.classList.add("is-hidden");
      btnNGPlus.classList.add("is-hidden");
      releaseFocusTrap();
      showTitleScreen();
    });

    var btnWatchReplay = document.getElementById("btnWatchReplay");
    if (btnWatchReplay) btnWatchReplay.addEventListener("click", showReplayOverlay);

    var btnRetry = $("#btnResultRetry");
    if (btnRetry) {
      btnRetry.addEventListener("click", function () {
        resultOverlay.classList.add("is-hidden");
        releaseFocusTrap();
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
      var _lastAdvanceTime = 0;
      function onCutsceneAdvance(e) {
        e.preventDefault();
        var now = performance.now();
        if (now - _lastAdvanceTime < 150) return;
        _lastAdvanceTime = now;
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
        if (e.repeat) return;
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

    var btnTutorial = document.getElementById("btnTutorial");
    if (btnTutorial) btnTutorial.addEventListener("click", function () {
      Campaign.setSlot(0);
      startCampaign();
    });

    // Skirmish settings wiring
    var skEnemyCount = document.getElementById("skEnemyCount");
    var skBudget = document.getElementById("skBudget");
    var skMapSize = document.getElementById("skMapSize");
    var skTerrain = document.getElementById("skTerrain");
    var skSeed = document.getElementById("skSeed");
    if (skEnemyCount) {
      skEnemyCount.addEventListener("input", function () {
        skirmishConfig.enemyCount = parseInt(this.value, 10) || 3;
        document.getElementById("skEnemyVal").textContent = this.value;
      });
      skBudget.addEventListener("input", function () {
        skirmishConfig.budget = parseInt(this.value, 10) || BUDGET_MAX_DEFAULT;
        document.getElementById("skBudgetVal").textContent = this.value;
      });
      skMapSize.addEventListener("change", function () { skirmishConfig.mapSize = this.value; });
      skTerrain.addEventListener("change", function () { skirmishConfig.terrainDensity = this.value; });
      skSeed.addEventListener("input", function () { skirmishConfig.seed = this.value.trim() || null; });
      document.getElementById("skTemplate").addEventListener("change", function () { skirmishConfig.template = this.value || null; });
      var skDiff = document.getElementById("skDifficulty");
      if (skDiff) skDiff.addEventListener("change", function () { skirmishConfig.difficulty = this.value; });
      document.getElementById("btnSkirmishStart").addEventListener("click", startSkirmish);
      document.getElementById("btnSkirmishBack").addEventListener("click", hideSkirmishSettings);
    }
    if (btnContinueCampaign) btnContinueCampaign.addEventListener("click", function () {
      showSlotPicker("continue");
    });
    var btnSurvival = document.getElementById("btnSurvival");
    if (btnSurvival) btnSurvival.addEventListener("click", function() {
      var title = document.getElementById("titleOverlay");
      if (title) title.classList.add("is-hidden");
      var survEl = document.getElementById("survivalSettings");
      showSurvivalLeaderboard();
      survEl.classList.remove("is-hidden");
      trapFocus(survEl);
    });
    var btnSurvStart = document.getElementById("btnSurvStart");
    if (btnSurvStart) btnSurvStart.addEventListener("click", startSurvival);
    var btnSurvBack = document.getElementById("btnSurvBack");
    if (btnSurvBack) btnSurvBack.addEventListener("click", function() {
      document.getElementById("survivalSettings").classList.add("is-hidden");
      releaseFocusTrap();
      showTitleScreen();
    });
    var btnSurvShopNext = document.getElementById("btnSurvShopNext");
    if (btnSurvShopNext) btnSurvShopNext.addEventListener("click", function() {
      document.getElementById("survShopOverlay").classList.add("is-hidden");
      releaseFocusTrap();
      state.units = [];
      state._mapSeed = (state.survivalWave + 1) * 997 + 42;
      survivalNextWave();
      state.phase = "battle";
      state.activeUnit = null;
      state.battleMode = "idle";
      state.highlightCells.clear();
      state.turnCount = 0;
      state.totalDamageDealt = 0;
      state._statMaxSingleHit = 0;
      state.battleLog = [];
      state.battleRecord = [];
      if (renderer) renderer.floatingTexts = [];
      for (var si = 0; si < state.units.length; si++) {
        var su = state.units[si];
        su._statDmgDealt = 0; su._statDmgTaken = 0; su._statHealing = 0;
        su._statKills = 0; su._statTilesMoved = 0; su._statAbilitiesUsed = 0;
      }
      logFeed.innerHTML = "";
      initMapModifiers(null);
      showPhasePanels();
      unitCard.classList.add("is-hidden");
      bindBattleButtons();
      renderBoard();
      log("Wave " + state.survivalWave + " — Fight!", "system");
      SFX.click();
      startBattleLoop();
      tickBattleTurn().catch(function(e) {
        console.error("tickBattleTurn:", e);
        state.animating = false;
        log("Turn error — you may continue.", "system");
      });
    });
    var btnTrophies = document.getElementById("btnTrophies");
    if (btnTrophies) btnTrophies.addEventListener("click", showTrophyPanel);
    var btnTrophyBack = document.getElementById("btnTrophyBack");
    if (btnTrophyBack) btnTrophyBack.addEventListener("click", function() {
      document.getElementById("trophyOverlay").classList.add("is-hidden");
      releaseFocusTrap();
      showTitleScreen();
    });
    var btnBestiary = document.getElementById("btnBestiary");
    if (btnBestiary) btnBestiary.addEventListener("click", showBestiaryPanel);
    var btnBestiaryBack = document.getElementById("btnBestiaryBack");
    if (btnBestiaryBack) btnBestiaryBack.addEventListener("click", function() {
      document.getElementById("bestiaryOverlay").classList.add("is-hidden");
      releaseFocusTrap();
      showTitleScreen();
    });
    document.getElementById("btnSlotBack").addEventListener("click", function () {
      document.getElementById("slotPicker").classList.add("is-hidden");
      var btn = document.getElementById("btnNewCampaign");
      if (btn) btn.focus();
    });

    budgetMax.textContent = String(budgetCurrent);
    showTitleScreen();
    setTimeout(scheduleRender, 120);

  }

  var battleLoopRunning = false;
  var _renderScheduled = false;
  var _cameraDirty = false;

  function scheduleRender() {
    if (battleLoopRunning) {
      _cameraDirty = true;
      _battleNeedsRender = true;
      return;
    }
    if (_renderScheduled) return;
    _renderScheduled = true;
    requestAnimationFrame(function () {
      _renderScheduled = false;
      renderBoard();
    });
  }

  var _battleNeedsRender = true;
  function markBattleDirty() { _battleNeedsRender = true; }

  function startBattleLoop() {
    if (battleLoopRunning) return;
    battleLoopRunning = true;
    _battleNeedsRender = true;
    (function pulseLoop() {
      if (state.phase !== "battle") { battleLoopRunning = false; return; }
      var needsDraw = _battleNeedsRender || _cameraDirty || state.animating
        || (renderer && renderer.floatingTexts.length > 0)
        || state.units.some(function(u) { return u._deathAnim != null; });
      _cameraDirty = false;
      _battleNeedsRender = false;
      if (needsDraw) renderBoard();
      requestAnimationFrame(pulseLoop);
    })();
  }

  init();
})();
