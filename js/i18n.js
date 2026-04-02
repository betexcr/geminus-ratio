/**
 * Geminus Ratio — lightweight i18n (en / es).
 * Locale persisted in localStorage: geminus_locale
 */
"use strict";

var I18n = (function () {
  var STORAGE_KEY = "geminus_locale";
  var FALLBACK = "en";
  var _locale = FALLBACK;

  function _get(obj, path) {
    if (!obj || !path) return null;
    var parts = path.split(".");
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      cur = cur[parts[i]];
      if (cur === undefined || cur === null) return null;
    }
    return cur;
  }

  function _interpolate(str, params) {
    if (!params || typeof str !== "string") return str;
    return str.replace(/\{(\w+)\}/g, function (_, k) {
      return params[k] != null ? String(params[k]) : "";
    });
  }

  var STRINGS = {
    en: {
      meta: { htmlLang: "en", pageTitle: "Geminus Ratio — Ludus Tactics", pageDescription: "Turn-based gladiator tactics. Build a ludus, deploy fighters, battle on an isometric arena." },
      a11y: { skip: "Skip to content" },
      banner: { tagline: "Rome · Ludus · Tactics" },
      phase: { ludus: "Ludus", gates: "Gates", arena: "Arena", missionPrefix: "M{mid} — " },
      difficulty: { easy: "Novice", normal: "Gladiator", hard: "Lanista" },
      acts: { "1": "Act I: The Tournament", "2": "Act II: The Descent", "3": "Act III: The Ratio" },
      campaign: {
        completed: "Completed", missionWord: "Mission", missionLine: "Mission {id}: {title}", slotLine: "M{id}: {title}",
      },
      missions: {
        "0": "The Practice Yard", "1": "The Summons", "2": "First Blood", "3": "The Conspirator",
        "4A": "The Rigged Bout", "4B": "The Pit", "5A": "The Ghost in the Sand", "5B": "The Ghost in the Sand",
        "6": "Into the Dark", "7": "The Old Wolf", "8": "Valeria's Reckoning", "9": "The Temple",
        "10D": "The Emperor's Dog", "10": "The Gauntlet", "11": "Alliance and Sacrifice", "12": "The Unmasking", "13": "Geminus Ratio",
      },
      panel: {
        rosterTitle: "Hire for the bout", denarii: "Denarii", rosterHint: "Each class has different stats, move, jump, and a unique arena ability.",
        picksTitle: "Your lanista’s picks", clearRoster: "Clear roster", toGates: "To the gates", trainingBout: "Training Bout", rosterStats: "Roster Stats",
        deployTitle: "Deploy", deployHint: "Click a highlighted gate tile, then a fighter below to place. Ready when all are placed.",
        enterArena: "Enter arena", backLudus: "Back to Ludus",
        battleTitle: "Arena", statHp: "HP", statAtk: "ATK", statDef: "DEF", statSpd: "SPD", statMove: "Move", statJump: "Jump",
        btnMove: "Move", btnAttack: "Attack", btnAbility: "Ability",         btnWait: "Wait", btnUndo: "Undo", fullLog: "Full Log", unitCardAria: "Active unit stats",
        hire: "Hire", freeTag: " [free]", statsFmt: "HP {hp} · ATK {atk} · DEF {def} · SPD {spd} · Move {mv} · Jump {jp}",
        hireAria: "Hire {name} for {cost} denarii",
        clearRosterConfirmSkirmish: "Remove all fighters from your roster?",
        clearRosterConfirmCampaign: "Reset roster to free recruits only? Hired fighters will be cleared.",
        toGatesNeedPick: "Hire at least one fighter to continue.",
        toGatesNeedBudget: "You are over budget — remove or adjust hires.",
        enterArenaNeedPlace: "Place every fighter on a gate tile before entering.",
        objectiveDefeatAll: "Objective: Defeat all enemies.",
      },
      dialog: { ok: "OK", cancel: "Cancel", overwrite: "Overwrite", clearRoster: "Clear roster" },
      ux: {
        saveFailed: "Save failed — storage may be full.",
        saveFailedHint: "Export your current slot to a file so you don't lose progress. You can import it again from the title screen.",
        saveFailedExport: "Export save",
        saveOk: "Saved.",
        noOpBattleOnly: "That action is only available during your battle turn.",
        noOpContinueNeedsSave: "Choose a slot with saved progress to continue.",
        touchPanTip: "Tip: drag to pan, pinch to zoom, tap to select.",
        swUpdateReady: "A new version is ready. Refresh to update.",
        exportReminder: "Backup reminder: export your save slot periodically.",
        localeChanged: "Language updated.",
        replayHelp: "Replay tips: use |< and >| for start/end, < > for step, and Close to return.",
        adaptiveHelp: "Having trouble? Try lowering difficulty in Skirmish/Survival settings or open Glossary in battle.",
        battleSelectHighlighted: "Choose a highlighted tile for that action.",
        battleSelectEnemy: "Select an enemy on a highlighted tile.",
      },
      replay: {
        stepMove: "Turn {turn}: {actor} — moved to ({col},{row}).",
        stepAttack: "Turn {turn}: {actor} — attacked{who}{dmg}.",
        stepAbility: "Turn {turn}: {actor} — used {ability}{on}.",
        stepWait: "Turn {turn}: {actor} — waited.",
        stepOther: "Turn {turn}: {actor} — {action}.",
        forDmg: " for {n} dmg",
        onTarget: " on {name}",
        abilityFallback: "ability",
      },
      logLudus: {
        rosterFull: "Roster full ({max} fighters max).",
        notEnoughDenariiClass: "Not enough denarii for {name}.",
        hired: "Hired {name} the {className}.",
        equippedOn: "Equipped {item} on {fighter}.",
        notEnoughDenariiItem: "Not enough denarii for {name}.",
        trainingPlaceGates: "Training bout — place your fighters on the blue gate tiles.",
        hireBeforeDeploy: "Hire at least one fighter before deploying.",
        placeOnGates: "Place your fighters on the blue gate tiles.",
        deployError: "Deploy error — retrying. ({message})",
        recalled: "Recalled {className}.",
        tileOccupied: "Tile occupied. Click a placed ally to recall them.",
        selectGateTile: "Select a highlighted gate tile to place a fighter.",
        selectFighterFirst: "Select a fighter from the deploy queue first.",
        placedRecall: "Placed {className}. Click to recall.",
      },
      logBattle: {
        turnErrorContinue: "Turn error — you may continue.",
        ctStallForce: "CT stall — forcing result.",
        ctStallBattleEnd: "Repeated CT stall — battle ended.",
        aiErrorSkipEnemy: "AI error — skipping enemy turn.",
        stunnedCannotAct: "{name} is stunned and cannot act!",
        bleedTick: "{name} bleeds! (−1 HP)",
        nettedCannotAct: "{name} is netted and cannot act!",
        rootedCannotAct: "{name} is rooted and cannot act!",
        moveUndone: "Move undone.",
        guard: "Guard.",
        selectMoveTile: "Select a highlighted tile to move.",
        selectAdjacentFoe: "Select an adjacent foe to strike.",
        noValidTarget: "No valid target.",
        crowdMadness: "The crowd's madness weighs on your fighters (−{penalty} SPD).",
        cursedSandBurn: "{name} burns on cursed sand! (−{dmg})",
        stepsSpikes: "{name} steps on spikes! (-{dmg})",
        walksFire: "{name} walks through fire! (-4, burning)",
        fountainHeal: "{name} is healed by the fountain! (+{heal})",
        barricadeDestroyed: "Barricade destroyed!",
        ritualPulses: "The ritual pulses through the arena!",
        crowdChantingSlow: "The crowd's chanting intensifies — all fighters slow! (−1 SPD)",
        arenaCollapses: "The arena floor cracks and collapses!",
        sandShifts: "The sand shifts beneath your feet!",
        glyphStunned: "{name} is stunned by arcane glyphs!",
        glyphsNoCatch: "Glyphs flash across the sand, but no one is caught.",
        symbolsBurn: "Symbols burn across the arena!",
        glyphLingerStun: "{name} lingers on a glyph — stunned!",
        cursedSandStains: "Cursed sand stains the arena floor.",
        ritualHums: "The ritual hums beneath the sand.",
        editorsSalute: "The editors salute. Fight!",
        survivalWaveFight: "Wave {wave} — Fight!",
        rosterTrimmed: "Roster trimmed to {max} fighters.",
        partialDeployWarning: "Warning: only {placed} of {total} fighters could be placed.",
        pursuitSensePrimed: "Pursuit Sense — bonus damage primed!",
        momentumCharge: "Momentum — +3 ATK from charge!",
        advanceChooseAction: "Advance! — choose an action.",
        attackerMisses: "{attacker} misses {defender}! ({pct}% hit)",
        attackerHitsFor: "{attacker} hits {defender} for {dmg}. ({pct}% hit)",
        ripostePricks: "Riposte pricks the attacker!",
        parryCounters: "Parry counters for 3!",
        spearBraceCounters: "Spear Brace counters for 4!",
        interceptsBlow: "{name} intercepts the blow!",
        secondWind: "{name} rises again! Second Wind!",
        teleported: "Teleported!",
        abyssalNoDest: "Abyssal Gate — no valid destination tiles.",
        abyssalSelectDest: "Abyssal Gate — select destination for {name}.",
        abyssalTeleported: "Abyssal Gate — {name} teleported!",
        gravePulseHits: "Grave Pulse hits {name} (4 true dmg).",
        pulseEchoesEmpty: "The pulse echoes in emptiness.",
        voidBurstHits: "Void Burst hits {name} ({dmg}).",
        deathsEmbraceHits: "Death's Embrace hits {name} (6 true dmg).",
        whirlwindFuryHits: "Whirlwind Fury hits {name} ({dmg}).",
        whirlwindSelectRepo: "Whirlwind — select a tile to reposition.",
        whirlInEmptyAir: "Whirl in empty air.",
        arrowsEmptyGround: "Arrows rain on empty ground.",
        trampleHits: "Trample hits {name} ({dmg}).",
        trampleNoTargets: "Trample — no targets in line.",
        suppressingFireHits: "Suppressing Fire hits {name} (3 true dmg).",
        suppressingFireEmpty: "Suppressing Fire — arrows whistle through empty air.",
        riposteExclaim: "Riposte!",
        tremorThrustPushes: "Tremor Thrust pushes back!",
        chargeClosesGap: "Charge closes the gap!",
        pushedBack: "Pushed back!",
        pushedTwoTiles: "Pushed 2 tiles!",
        netSlidesOff: "The net slides off — Stone Eyes!",
        iaculumNetted: "Iaculum — netted!{extra}",
        iaculumBindingExtra: " Binding Net holds tight!",
        provocatioNoHoldGifted: "Provocatio has no hold on a Gifted warrior!",
        provocatioDreadMark: "Provocatio — Dread Mark brands the foe!",
        provocatioCrowdRoars: "Provocatio — the crowd roars your name.",
        tremorPress: "Tremor Press — {detail}",
        tremorPressShoved: "{n} foes shoved!",
        tremorPressNoRoom: "no room to shove.",
        noRoomToShove: "No room to shove.",
        entangleRooted: "Entangle — {name} rooted and weakened!",
        draggedUnder: "Dragged under!",
        huntersMark: "Hunter's Mark — {name} takes +3 dmg from all sources!",
        repositionsBack: "Repositions {n} tile(s) back.",
        lootFound: "Loot: {name}!",
        titusStares: "Titus stares into the sand... he mouths a name...",
        disPaterReach: "Dis Pater's Reach — the arena cracks!",
        defReducedTwoTurns: "{name} DEF reduced by 2 for 2 turns!",
        statusBleeding: "{name} is bleeding!",
        statusStunned: "{name} is stunned!",
      },
      logAbility: {
        clickTileActivate: "{ability} — click your tile to activate.",
        noAdjacentEnemies: "{ability} — no adjacent enemies.",
        chooseAdjacentEnemy: "{ability} — choose adjacent enemy.",
        noValidLineTargets: "{ability} — no valid line targets.",
        pickDirectionTile: "{ability} — pick a direction tile.",
        noAdjacentAllies: "{ability} — no adjacent allies.",
        chooseAdjacentAlly: "{ability} — choose adjacent ally.",
        noTilesInRange: "{ability} — no tiles in range.",
        chooseCenterArea: "{ability} — choose center tile for area attack.",
        cutsTarget: "{ability} cuts {target} ({dmg}).",
        healsSelfFor: "{ability} heals {name} for {hp} HP.",
        missesArcherTarget: "{ability} misses {name}!",
        rainsOn: "{ability} rains on {name} ({dmg} dmg).",
        strikesOnlySand: "{ability} strikes only sand.",
        missesHitPct: "{ability} misses! ({pct}% hit)",
        piercesFor: "{ability} pierces for {dmg}. ({pct}% hit)",
        healsAllyCleanse: "{ability} heals {name} for {hp} HP and cleanses debuffs!",
        braceImpact: "{ability} — you brace for impact.",
        shieldRaised: "{ability} — shield raised, +3 DEF this round.",
        readyCounterTwo: "{ability} — ready to counter next 2 melee hits.",
        bladeReady: "{ability} — blade ready.",
        pathsLengthen: "{ability} — paths lengthen (Move +1).",
        atkDefTrade: "{ability} — +2 ATK, −2 DEF.",
        allyGainDef: "{ability} — {list} gain +2 DEF.",
        noAlliesInRangeAb: "{ability} — no allies in range.",
        noValidTilesRange: "{ability} — no valid tiles in range.",
        selectTileTeleport: "{ability} — select a tile to teleport to.",
        allDebuffsCleansed: "{ability} — all debuffs cleansed!",
        battleCry: "{ability} — {detail}",
        foesShaken: "{n} foes shaken (−2 ATK)!",
        noFoesInRangeAb: "{ability} — no foes in range.",
        nextAttackHit15: "{ability} — next attack has +15% hit chance.",
        movePlusTwo: "{ability} — Move +2 this turn.",
        restoredHp: "{ability} — restored {hp} HP.",
        healedRootCleansed: "{ability} — healed {hp} HP, root cleansed.",
        defRooted: "{ability} — +4 DEF, rooted in place.",
        groupHeal5: "{ability} — {n} allies healed 5 HP.",
        healedMovePlusOne: "{ability} — healed {hp} HP, Move +1.",
        nextAttackHit25: "{ability} — next attack +25% hit chance.",
        nextHitHalved: "{ability} — next hit halved, counter 3 damage.",
        nextAttackerCounter4: "{ability} — next attacker takes 4 counter damage.",
        activated: "{ability} activated.",
        alliesAtkMove: "{ability} — {n} allies gain +2 ATK, +1 Move.",
        defUntilTurn: "{ability} — +3 DEF until next turn.",
        alliesAtkOnly: "{ability} — {n} allies gain +2 ATK.",
        interceptAdjacent: "{ability} — ready to intercept the next attack on an adjacent ally.",
        alreadyUsedBattle: "{ability} already used this battle.",
        fullyHealed: "{ability} — fully healed!",
        defAtkTwoTurns: "{ability} — +2 DEF, +1 ATK for 2 turns.",
        foesRooted: "{ability} — {n} foes rooted!",
        nextTwoNoMiss: "{ability} — next 2 attacks cannot miss.",
        healedAtkDebuff: "{ability} — healed {hp} HP, −2 ATK this turn.",
        noAdjacentAlliesTeleport: "{ability} — no adjacent allies to teleport.",
        selectAllyTeleport: "{ability} — select an adjacent ally to teleport.",
        defTwoTurns: "{ability} — +3 DEF for 2 turns.",
        healedImmune: "{ability} — healed {hp} HP, immune to debuffs for 1 turn.",
        fullyHealedAtk: "{ability} — fully healed, +3 ATK for 2 turns!",
        interceptingAdjacent: "{ability} — intercepting hits on adjacent allies!",
        lowHpBuff: "{ability} — +5 ATK, +5 DEF while below 30% HP!",
        strikeNMisses: "{ability} strike {n} misses! ({pct}% hit)",
        strikeNDeals: "{ability} strike {n} deals {dmg}. ({pct}% hit)",
        dealsStuns: "{ability} deals {dmg} and stuns! ({pct}% hit)",
        dealsHitPct: "{ability} deals {dmg}. ({pct}% hit)",
        pulledCloser: "{ability} — pulled closer!",
        noRoomPull: "{ability} — no room to pull.",
        dealsBleed: "{ability} deals {dmg} + bleed! ({pct}% hit)",
        dealsStealLife: "{ability} deals {dmg}, steals {stolen} HP. ({pct}% hit)",
        targetWeakened: "{ability} — {name} weakened (−{amt} ATK)!",
        pushedBackEx: "{ability} — Pushed back!",
        hpSwapped: "{ability} — HP swapped! {detail}",
        cleansesList: "{ability} cleanses {list}!",
        nothingToCleanse: "{ability} — nothing to cleanse.",
        strikeMissesCs: "{ability} strike misses! ({pct}% hit)",
        strikesFor: "{ability} strikes for {dmg}. ({pct}% hit)",
        bondDamageAmp: "{ability}: {a} and {b} deal +20% to each other for 3 turns!",
        hitsFor: "{ability} hits {name} for {dmg}. ({pct}% hit)",
        dealsTo: "{ability} deals {dmg} to {name}. ({pct}% hit)",
        hpSwapPairs: "{a}: {ahp}/{amax}, {b}: {bhp}/{bmax}",
      },
      logStory: {
        endingAReach: "Cassius reaches out. Titus lowers his blade.",
        endingABond: "The twin bond holds. The ritual shatters.",
      },
      logEnemy: {
        closesDistance: "{name} closes distance.",
        usesAbilityHeal: "{name} uses {ability} (+{heal} HP).",
        raisesTestudo: "{name} raises Testudo (+3 DEF).",
        bracesCetus: "{name} braces with Cetus Wall.",
        readiesSicaRiposte: "{name} readies Sica Riposte.",
        usesUmbra: "{name} uses Umbra (+1 move).",
        usesBlindRush: "{name} uses Blind Rush (+2 ATK, −2 DEF).",
        raisesPhalanx: "{name} raises Phalanx Guard!",
        arenaSalute: "{name} uses Arena Salute — cleansed!",
        rallyCharge: "{name} uses Rally Charge (+2 move).",
        phaseWalkCloser: "{name} Phase Walks closer!",
        shadowStepsCloser: "{name} Shadow Steps closer!",
        highGround: "{name} uses High Ground (+15% accuracy).",
        battleFocus: "{name} uses Battle Focus (+25% accuracy).",
        evasion: "{name} uses Evasion (+3 DEF).",
        eagleEye: "{name} uses Eagle Eye — cannot miss!",
        unholyResilience: "{name} uses Unholy Resilience (+3 DEF).",
        usesParry: "{name} uses Parry.",
        readiesSpearBrace: "{name} readies Spear Brace.",
        ironWill: "{name} uses Iron Will (+{heal} HP).",
        neptunesFavor: "{name} uses Neptune's Favor.",
        shadowMend: "{name} uses Shadow Mend.",
        championsResolve: "{name} uses Champion's Resolve — fully healed!",
        crowdsFavorFull: "{name} uses {ability} — fully healed!",
        holdTheLine: "{name} uses Hold the Line!",
        lastStand: "{name} activates Last Stand!",
        battleHardened: "{name} uses Battle Hardened (+2 DEF, +1 ATK).",
        intimidatingRoar: "{name} Intimidating Roar — {n} foes rooted!",
        inspiringPresence: "{name} Inspiring Presence — {n} allies buffed!",
        warCry: "{name} War Cry — {n} foes weakened!",
        netsTarget: "{name} nets {target}!{extra}",
        bindingNetExtra: " Binding Net!",
        gravePulseHit: "{name} Grave Pulse hits {target} (4).",
        usesAbilityOn: "{name} uses {ability} on {target} ({dmg}).",
        brandsDreadMark: "{name} brands {target} with Dread Mark!",
        marksProvocatio: "{name} marks {target} with Provocatio!",
        challengesDuel: "{name} challenges {target} to a duel!",
        usesAbilityMisses: "{name} uses {ability} — misses!",
        tremorPressAi: "Tremor Press — {detail}",
        tremorPressShovedAi: "{name} Tremor Press — {n} foes shoved!",
        shovesTarget: "{name} shoves {target}!",
        usesAbilityOnExtra: "{name} uses {ability} on {target} ({extra}).",
        lifeStealAi: "{name} uses {ability} ({dmg} dmg, +{stolen} HP).",
        atkDebuffAi: "{name} uses {ability} on {target} (−{amt} ATK)!",
        entangleAi: "{name} Entangle — {target} rooted and weakened!",
        huntersMarkAi: "{name} Hunter's Mark — {target} takes +3 damage!",
        dragUnderHit: "{name} Drag Under hits {target} ({dmg}).",
        dragUnderMiss: "{name} Drag Under — misses!",
        veteransFury: "{name} Veteran's Fury ({dmg}).",
        veteransFuryMiss: "{name} Veteran's Fury — misses!",
        aoeAbilityHit: "{name} {ability} hits {target} ({dmg}).",
        aoeAbilityMiss: "{name} {ability} misses {target}!",
        frenzyHit: "{name} Frenzy strike {n} hits {target} ({dmg}).",
        frenzyMiss: "{name} Frenzy strike {n} misses!",
        fatesThread: "{name} Fate's Thread — HP swapped!",
        basicStrike: "{name} strikes {target} for {dmg}. ({pct}%)",
        basicSwingMiss: "{name} swings at {target} — misses! ({pct}%)",
        pullsCloser: "{name} pulls {target} closer!",
      },
      log: { fullTitle: "Full battle log", copy: "Copy", copied: "Copied to clipboard", close: "Close" },
      controls: {
        heading: "Controls",
        close: "Close",
        secBattle: "Battle",
        secMove: "Cursor & tiles",
        secCam: "Camera",
        secDeploy: "Deployment",
        secTouch: "Touch",
        b1: "M — Move, A — Attack, B — Ability menu, W — Wait, U — Undo move.",
        b2: "Esc — cancel targeting or close ability menu. Arrow keys, Tab / Shift+Tab, or keys 1–9 navigate and pick abilities when the menu is open.",
        m1: "Arrow keys move the cursor; Enter or Space confirms the tile.",
        d1: "Tab to the deployment list; Enter or Space selects a fighter. Click a highlighted gate tile to place; click your fighter on the map to recall.",
        c1: "Q / E — rotate view. + / − — zoom. R — reset camera.",
        c2: "Scroll wheel — zoom. Space + drag — pan. Middle or right mouse drag — pan.",
        c3: "F2 — mute. F3 — animation speed.",
        t1: "Drag with one finger — pan. Pinch — zoom. Tap — select tile (same as click).",
        secBanner: "Banner (in Ludus / battle)",
        ban1: "Settings — language, audio, animation speed, and save-toast preference.",
        ban2: "Controls — keyboard and touch summary (same as title screen).",
        ban3: "F2 (mute) and F3 (animation speed) are on the camera bar; Settings offers the same options.",
        secResult: "After battle",
        r1: "Continue focuses the primary button; Esc is handled by the focused control.",
      },
      settings: {
        heading: "Settings",
        close: "Close",
        language: "Language",
        audio: "Audio",
        mute: "Mute",
        unmute: "Unmute",
        animSpeed: "Animation speed",
        speedHint: "Uses the same control as F3 on the toolbar.",
        saveToast: "Save confirmation toast",
        toastOn: "Every save (default)",
        toastMinimal: "Less often",
        toastOff: "Off",
        banner: "Settings",
      },
      skirmishTip: {
        title: "Skirmish tips",
        line1: "Q / E — rotate the view. + / − — zoom. R — reset the camera.",
        line2: "Space + drag — pan. Choose a fighter in the list, then click a blue gate tile to deploy.",
        continue: "Continue",
        dontShow: "Don't show again",
      },
      survivalLb: {
        empty: "No records yet.",
        thRank: "#",
        thWave: "Wave",
        thScore: "Score",
        thDiff: "Diff",
      },
      deploy: {
        cardAria: "{name}, {className}. {status}",
        statusPending: "Not placed",
        statusPlaced: "Placed",
      },
      tileInfo: {
        zoneGate: "Gate",
        zoneWall: "Wall",
        zoneSand: "Sand",
        heightLow: "Low",
        heightMid: "Mid",
        heightHigh: "High",
        sep: " · ",
        hPrefix: "H:",
        terrainBuilding: "Building",
        waterDeep: "Deep Water",
        waterShallow: "Shallow Water",
        impassable: "Impassable",
        slowsMove: "Slows movement",
        spikeTrap: "Spike Trap",
        fireTrap: "Fire Trap",
        barricade: "Barricade",
        barricadeHp: "HP:{n}",
        fountain: "Fountain",
        fountainExtra: "Heals +5/turn",
        highGround: "High Ground",
        highGroundExtra: "+15% dmg",
        collapsed: "COLLAPSED",
        cursed: "Cursed",
        glowAtk: "Glow (+2 ATK)",
        teamPlayer: "player",
        teamEnemy: "enemy",
        occupant: "{name} ({team}) HP:{hp}/{maxHp}",
      },
      title: {
        sub: "Ludus Tactics", continueCampaign: "Continue Campaign", newCampaign: "New Campaign", skirmish: "Skirmish", survival: "Survival Arena",
        trophies: "Trophies", bestiary: "Bestiary", tutorial: "Tutorial", controls: "Controls", slotTitleNew: "Pick a Slot for New Campaign", slotTitleCont: "Continue Campaign",
        slotDiff: "Difficulty", slotBack: "Back", langLabel: "Language",
        slotWord: "Slot", slotEmpty: "Empty", fightersFmt: "{n} fighters · {date}", overwriteConfirm: "Overwrite Slot {n}?",
        slotExportEmpty: "Slot {n} is empty.", exportSave: "Export save", importSave: "Import to slot {n}",
        exportAria: "Export slot {n}", importAria: "Import to slot {n}",
        importSuccess: "Save imported to slot {n}.",
        importQuota: "Storage full — cannot import save. Clear browser data or remove other saves.",
        importParse: "Could not read file — not valid JSON.",
        importInvalid: "Invalid save file.",
      },
      skirmish: {
        heading: "Skirmish Settings", enemies: "Enemies", budget: "Budget", mapSize: "Map Size", terrain: "Terrain", mapTemplate: "Map Template", difficulty: "Difficulty", seed: "Seed", seedPh: "random", start: "Start", back: "Back",
        sizeSmall: "Small (8×7)", sizeMedium: "Medium (12×10)", sizeLarge: "Large (14×12)", sparse: "Sparse", normal: "Normal", dense: "Dense", random: "Random",
        tmplPit: "The Pit", tmplBridge: "Bridge of Chains", tmplTiers: "Colosseum Tiers", tmplFlooded: "Flooded Arena", tmplPillared: "Pillared Hall",
      },
      scene: { continue: "Continue", advanceAria: "Click to advance dialogue", choices: "Story choices" },
      result: {
        continue: "Continue", retry: "Retry Mission", ngPlus: "New Game+", ngPlusCycle: "New Game+ (Cycle {n})", watchReplay: "Watch Replay", trainingVictory: "TRAINING — VICTORY", trainingDefeat: "TRAINING — DEFEAT", victoria: "VICTORIA!", defeat: "DEFEAT",
        standing: "<strong>{alive}</strong> of <strong>{total}</strong> gladiators standing", turns: "<strong>{n}</strong> turns fought", damageDealt: "<strong>{n}</strong> damage dealt to enemies",
        mvp: "MVP: {name} — {dmg} dmg, {kills} kills", firstBlood: "First blood: {name}", denariiEarned: "+{n} denarii earned", xpLine: "{name} — Lv.{lv}, {xp} XP, {kills} kills",
        statRow: "{dmg} dmg · {k}K · {taken} taken", crowdChants: "The crowd chants your name!", sandClaims: "The sand claims another lanista's pride.", campaignOver: "The Ludi Aeternales are over.",
      },
      replay: { heading: "Battle Replay", close: "Close", ariaReplay: "Battle replay", goStart: "Go to start", prev: "Previous step", next: "Next step", goEnd: "Go to end" },
      trophy: { heading: "Trophies", back: "Back", listAria: "Trophy list", lockedHint: "Locked", hiddenName: "???" },
      postMissionTip: {
        title: "Quick tips",
        body: "Change language, sound, and animation speed anytime from Settings in the top bar. Controls lists every shortcut.",
        gotIt: "Got it",
      },
      trophyAch: {
        first_blood: { name: "First Blood", desc: "Win your first battle." },
        veteran: { name: "Veteran Lanista", desc: "Win 10 battles." },
        centurion: { name: "Centurion", desc: "Win 25 battles." },
        flawless: { name: "Flawless Victory", desc: "Win a battle without losing a unit." },
        massacre: { name: "Massacre", desc: "Deal 100+ damage in a single battle." },
        collector: { name: "Collector", desc: "Own 5 equipment items." },
        hoarder: { name: "Hoarder", desc: "Own 15 equipment items." },
        wave_5: { name: "Arena Survivor", desc: "Reach wave 5 in Survival." },
        wave_10: { name: "Decimator", desc: "Reach wave 10 in Survival." },
        wave_15: { name: "Unstoppable", desc: "Reach wave 15 in Survival." },
        full_roster: { name: "Full House", desc: "Have 6 gladiators in your roster." },
        promotion: { name: "Promoted", desc: "Promote a unit to an advanced class." },
        all_classes: { name: "Diversity", desc: "Use all 12 base classes in battle." },
        campaign_clear: { name: "Ave Imperator", desc: "Complete the campaign." },
        campaign_hard: { name: "Invictus", desc: "Complete the campaign on Lanista." },
        overkill: { name: "Overkill", desc: "Land a single hit for 20+ damage." },
        pacifist_turn: { name: "Mercy", desc: "Win a battle dealing no kills for 5+ turns." },
        speedrunner: { name: "Speedrunner", desc: "Win a battle in 5 turns or fewer." },
        deathless: { name: "Deathless", desc: "Complete 5 campaign battles with no deaths." },
        hundred_kills: { name: "Hecatomb", desc: "Accumulate 100 total kills." },
        max_level: { name: "Apex", desc: "Reach maximum level with any unit." },
        rich: { name: "Plutocrat", desc: "Accumulate 500 denarii." },
        bond_pair: { name: "Brothers in Arms", desc: "Form a bond between two gladiators." },
        scarred: { name: "Battle-Scarred", desc: "Have a unit survive near death 3 times." },
      },
      bestiary: { heading: "Bestiary", back: "Back", listAria: "Class list" },
      survival: { heading: "Survival Arena", diff: "Difficulty", start: "Start", back: "Back", betweenWaves: "Between Waves", nextWave: "Next Wave", leaderboardAria: "Survival high scores" },
      promo: { heading: "Promotion", optionsAria: "Promotion options" },
      equip: {
        shopTitle: "Equipment Shop",
        inventoryPrefix: "Inventory:",
        slotWeapon: "weapon",
        slotArmor: "armor",
        slotTrinket: "trinket",
        modFmt: "+{n} {stat}",
        denShort: "d",
        assignPrompt: "Assign {name} ({cost} d) — choose a fighter:",
        assignGroupAria: "Assign equipment to a fighter",
        assignToAria: "Assign to {name}",
        statAtk: "ATK",
        statDef: "DEF",
        statSpd: "SPD",
        statHp: "HP",
        statMove: "MOVE",
      },
      rosterStats: {
        empty: "No roster data yet.",
        thName: "Name",
        thClass: "Class",
        thLv: "Lv",
        thKills: "Kills",
        thBattles: "Battles",
        thTitle: "Title",
        dash: "—",
        scarred: "(Scarred)",
        bonded: "Bonded Pairs:",
        campaignTotals: "Campaign Totals: {battles} battles · {kills} kills · {dmg} dmg · {turns} turns",
      },
      survivalShop: {
        waveLine: "Wave {wave} cleared! Score: {score}",
        denariiLine: "Denarii: {n}",
        hpLabel: "HP:",
        healBtn: "Heal {hp}HP ({cost}d)",
      },
      rename: {
        hint: "Enter to confirm · Esc to cancel",
        accept: "Accept",
        acceptAria: "Accept name",
        randomAria: "Randomize fighter name",
      },
      canvas: { arenaAria: "Isometric battle grid — Q/E rotate, scroll zoom, Space+drag or middle/right mouse to pan; touch: drag to pan, pinch to zoom", ctAria: "Upcoming turns", rosterAria: "Roster management", deployAria: "Deployment", battleAria: "Battle", battleActions: "Battle actions", abilitiesMenu: "Abilities", combatLog: "Combat log", deployQueue: "Deployment queue", pickedAria: "Selected fighters", classListAria: "Available fighter classes", rosterStatsAria: "Roster statistics", stageAria: "Arena view", camAria: "Camera controls" },
      cam: { rotL: "Rotate left (Q)", zoomIn: "Zoom in (+)", zoomOut: "Zoom out (-)", rotR: "Rotate right (E)", reset: "Reset camera (R)", mute: "Toggle mute (F2)", speed: "Animation speed (F3)" },
      hud: { diffBracket: "[{label}]" },
      battle: {
        noUsableAbilities: "No usable abilities.",
        noAdjacentFoes: "No adjacent foe to attack.",
        abilityMenuEscHint: "Esc — close menu",
        glossary: "Glossary",
        keybindToggle: "Keys",
        keybindSummary: "M move · A attack · B ability · W wait · U undo · Esc cancel",
        forecastBasicAttack: "Attack",
        forecastEffects: "Effects: {effects}",
        forecastTempo: "Tempo: {tempo}",
        forecastHit: "Hit: {pct}%",
        forecastDmg: " dmg",
        forecastDmgTrue: " true dmg",
        forecastPerFoe: " (per foe)",
        forecastSwapHp: "Swap HP%",
        forecastAreaPerFoe: "~{n} dmg per foe in area",
        forecastIfMovedHere: "~{dmg} dmg (if moved here)",
        forecastIgnoreDef: "Ignore DEF {pct}%",
        forecastTempoStandard: "standard",
        forecastFx: {
          generic: "{id}",
          stun: "Stun",
          pull: "Pull",
          entangle: "Root / ATK down",
          drag: "Drag",
          huntermark: "Marked prey",
          bleed: "Bleed",
          lifesteal: "Lifesteal",
          whirlwind: "Whirlwind",
          push: "Shove",
          push2: "Heavy shove",
          suppress: "Suppress",
          charge: "Charge",
          trample: "Trample",
          atkdebuff: "ATK down",
          voidburst: "Void burst",
          grave_pulse: "Grave pulse",
          deathembrace: "Death's embrace",
          cleanse_self: "Cleanse",
          double_strike: "Double strike",
          teleport_back: "Reposition",
          duel: "Duel mark",
          defdebuff: "DEF down",
          hpswap: "HP swap",
        },
      },
      resultInsights: {
        title: "Battle notes",
        win: {
          highDamage: "Strong pressure: dealt {n} total damage.",
          lowDamage: "Low pressure: dealt only {n} damage.",
          allyLosses: "Losses taken: {n} ally units fell.",
          cleanFight: "Clean execution: no ally losses this battle.",
          longBattle: "Extended fight: {n} turns.",
          shortBattle: "Quick finish: {n} turns.",
        },
        loss: {
          highDamage: "You still dealt {n} damage — the opening was there.",
          lowDamage: "Low damage ({n}) — look for height, focus fire, and safer trades.",
          casualties: "Casualties: {n} fighters lost.",
          longBattle: "Long fight ({n} turns) — resources and positioning wore you down.",
          shortBattle: "Short fight ({n} turns) — the decisive exchange went against you.",
        },
      },
      saveBadge: { saved: "Saved", unsaved: "Unsaved", issue: "Save issue" },
      settingsExtra: {
        highContrast: "High contrast",
        highContrastOn: "On",
        highContrastOff: "Off",
        resetUxCounters: "Reset UX counters",
        resetUxCountersDone: "UX counters cleared.",
      },
      phaseAnnounce: { ludus: "Ludus phase.", deploy: "Deployment phase.", battle: "Battle phase." },
      difficultyHelp: {
        easy: "Novice: lower enemy stats and gentler pacing.",
        normal: "Gladiator: standard challenge.",
        hard: "Lanista: stronger enemies and tighter margins.",
      },
      titleRecap: {
        none: "No campaign save yet.",
        lastPlayed: "Last played: Slot {slot} · M{mid} {mission} · {date}",
      },
      abilityTip: {
        range: "Range {r}", multDmg: "×{m} dmg", trueDmg: "{n} true dmg", heal: "Heal {n}", lvl: "Lv{n}",
      },
      ai: { balanced: "Balanced", berserker: "Berserker", tactician: "Tactician", assassin: "Assassin", guardian: "Guardian" },
      endings: {
        a: "Ending A — Geminus", b: "Ending B — The Sacrifice", c: "Ending C — The Vessel", d: "Ending D — The Emperor's Dog", e: "Ending E — The Pyre",
        complete: "CAMPAIGN COMPLETE", sandRemembers: "The sand remembers.", ngCycle: "New Game+ (Cycle {n})",
        desc: {
          a: "Both brothers survive. The ritual is broken by an act of stubborn, stupid love. They walk out of the arena together, into sunlight, into whatever comes next.",
          b: "Titus is restored. Cassius burns the ritual out from within, breaking himself to save everyone else. The cost of love is a broken body and a brother who will never forgive himself.",
          c: "Cassius becomes a vessel for the power beneath the arena. Titus is free. But something ancient looks out through Cassius's eyes now, and it smiles too slowly.",
          d: "Nero's champion wins — but the victory is ashes. Titus doesn't recognize the man who served a tyrant to save him. Cassius stands alone in an empty arena, holding a golden eagle badge worth nothing.",
          e: "The arena burns. The Colosseum screams. Cassius drags his brother from the rubble — alive, human, free. But everyone else is gone. Two brothers, surrounded by the wreckage of every choice that brought them here.",
        },
      },
      tutorial: {
        s0: "Welcome, Lanista! This is the Ludus — your roster screen. Tiro, a free Murmillo, is already hired.",
        s1: "Spend denarii to hire more fighters from the class list on the left. Each class has different stats and abilities.",
        s2: "When ready, click \"To the gates\" to deploy your fighters onto the arena.",
        s10: "Click a blue-highlighted tile at the bottom of the arena to place a fighter. Click a placed fighter to recall them.",
        s11: "Once all fighters are placed, click \"Enter arena\" to begin the battle.",
        s20: "It's your turn! Use Move (M) to reposition, Attack (A) to strike adjacent foes, Ability (B) for special skills, or Wait (W) to end your turn.",
        s21: "Tip: Move first to get next to an enemy, then Attack. You can also use keyboard shortcuts: M, A, B, W.",
        s22: "The CT strip at the top shows turn order. Faster units (higher SPD) act more often. Height gives +15% damage.",
        s30: "Good move! Now click Attack (A) to strike an adjacent enemy, or use an Ability (B) if one is available.",
        s40: "Hit! Damage is based on your ATK minus the defender's DEF, with height and buffs as modifiers.",
        s50: "Enemy down! Defeat all enemies to win the bout.",
        s60: "Victoria! You've completed the practice bout. Surviving fighters carry over to the next mission.",
      },
    },
    es: {
      meta: { htmlLang: "es", pageTitle: "Geminus Ratio — Tácticas de ludus", pageDescription: "Tácticas por turnos de gladiadores. Forma un ludus, despliega luchadores y combate en una arena isométrica." },
      a11y: { skip: "Saltar al contenido" },
      banner: { tagline: "Roma · Ludus · Tácticas" },
      phase: { ludus: "Ludus", gates: "Puertas", arena: "Arena", missionPrefix: "M{mid} — " },
      difficulty: { easy: "Novato", normal: "Gladiador", hard: "Lanista" },
      acts: { "1": "Acto I: El torneo", "2": "Acto II: El descenso", "3": "Acto III: La razón gemela" },
      campaign: {
        completed: "Completado", missionWord: "Misión", missionLine: "Misión {id}: {title}", slotLine: "M{id}: {title}",
      },
      missions: {
        "0": "El patio de prácticas", "1": "La convocatoria", "2": "Primera sangre", "3": "La conspiradora",
        "4A": "El combate amañado", "4B": "El foso", "5A": "El fantasma en la arena", "5B": "El fantasma en la arena",
        "6": "Hacia la oscuridad", "7": "El viejo lobo", "8": "El juicio de Valeria", "9": "El templo",
        "10D": "El perro del emperador", "10": "La garganta", "11": "Alianza y sacrificio", "12": "El desenmascaramiento", "13": "Geminus Ratio",
      },
      panel: {
        rosterTitle: "Contrata para el combate", denarii: "Denarios", rosterHint: "Cada clase tiene distintas estadísticas, movimiento, salto y una habilidad única en arena.",
        picksTitle: "Elegidos por tu lanista", clearRoster: "Vaciar plantilla", toGates: "A las puertas", trainingBout: "Combate de entrenamiento", rosterStats: "Estadísticas",
        deployTitle: "Despliegue", deployHint: "Haz clic en una casilla azul de la puerta, luego en un luchador abajo para colocarlo. Listo cuando todos estén colocados.",
        enterArena: "Entrar en la arena", backLudus: "Volver al ludus",
        battleTitle: "Arena", statHp: "PV", statAtk: "ATA", statDef: "DEF", statSpd: "VEL", statMove: "Mov", statJump: "Salto",
        btnMove: "Mover", btnAttack: "Atacar", btnAbility: "Habilidad",         btnWait: "Esperar", btnUndo: "Deshacer", fullLog: "Registro completo", unitCardAria: "Estadísticas del combatiente activo",
        hire: "Contratar", freeTag: " [gratis]", statsFmt: "PV {hp} · ATA {atk} · DEF {def} · VEL {spd} · Mov {mv} · Sal {jp}",
        hireAria: "Contratar a {name} por {cost} denarios",
        clearRosterConfirmSkirmish: "¿Quitar a todos los luchadores de la plantilla?",
        clearRosterConfirmCampaign: "¿Restablecer solo a los reclutas gratuitos? Se borrarán los contratados.",
        toGatesNeedPick: "Contrata al menos un luchador para continuar.",
        toGatesNeedBudget: "Presupuesto excedido — quita o ajusta contrataciones.",
        enterArenaNeedPlace: "Coloca a todos en una casilla de puerta antes de entrar.",
        objectiveDefeatAll: "Objetivo: derrota a todos los enemigos.",
      },
      dialog: { ok: "Aceptar", cancel: "Cancelar", overwrite: "Sobrescribir", clearRoster: "Vaciar plantilla" },
      ux: {
        saveFailed: "No se pudo guardar — el almacenamiento puede estar lleno.",
        saveFailedHint: "Exporta la ranura actual a un archivo para no perder el progreso. Puedes importarla de nuevo desde la pantalla de título.",
        saveFailedExport: "Exportar partida",
        saveOk: "Guardado.",
        noOpBattleOnly: "Esa acción solo está disponible durante tu turno de combate.",
        noOpContinueNeedsSave: "Elige una ranura con progreso guardado para continuar.",
        touchPanTip: "Consejo: arrastra para mover la cámara, pellizca para zoom, toca para seleccionar.",
        swUpdateReady: "Hay una nueva versión lista. Recarga para actualizar.",
        exportReminder: "Recordatorio de copia: exporta tu ranura de guardado periódicamente.",
        localeChanged: "Idioma actualizado.",
        replayHelp: "Consejos de repetición: usa |< y >| para inicio/final, < > para avanzar, y Cerrar para volver.",
        adaptiveHelp: "¿Te está costando? Baja la dificultad en ajustes de Combate libre/Supervivencia o abre el Glosario en combate.",
        battleSelectHighlighted: "Elige una casilla resaltada para esa acción.",
        battleSelectEnemy: "Selecciona un enemigo en una casilla resaltada.",
      },
      replay: {
        stepMove: "Turno {turn}: {actor} — se movió a ({col},{row}).",
        stepAttack: "Turno {turn}: {actor} — atacó{who}{dmg}.",
        stepAbility: "Turno {turn}: {actor} — usó {ability}{on}.",
        stepWait: "Turno {turn}: {actor} — esperó.",
        stepOther: "Turno {turn}: {actor} — {action}.",
        forDmg: " por {n} de daño",
        onTarget: " a {name}",
        abilityFallback: "habilidad",
      },
      logLudus: {
        rosterFull: "Plantilla llena (máx. {max} luchadores).",
        notEnoughDenariiClass: "No hay denarios suficientes para {name}.",
        hired: "Contratado {name}, {className}.",
        equippedOn: "Equipado {item} en {fighter}.",
        notEnoughDenariiItem: "No hay denarios suficientes para {name}.",
        trainingPlaceGates: "Combate de entrenamiento — coloca a tus luchadores en las casillas azules de la puerta.",
        hireBeforeDeploy: "Contrata al menos un luchador antes de desplegar.",
        placeOnGates: "Coloca a tus luchadores en las casillas azules de la puerta.",
        deployError: "Error de despliegue — reintentando. ({message})",
        recalled: "Retirado {className}.",
        tileOccupied: "Casilla ocupada. Haz clic en un aliado colocado para retirarlo.",
        selectGateTile: "Elige una casilla de puerta resaltada para colocar un luchador.",
        selectFighterFirst: "Elige primero un luchador en la cola de despliegue.",
        placedRecall: "Colocado {className}. Clic para retirar.",
      },
      logBattle: {
        turnErrorContinue: "Error de turno — puedes continuar.",
        ctStallForce: "Bloqueo de CT — forzando resultado.",
        ctStallBattleEnd: "Bloqueo de CT repetido — combate terminado.",
        aiErrorSkipEnemy: "Error de IA — saltando turno enemigo.",
        stunnedCannotAct: "¡{name} está aturdido y no puede actuar!",
        bleedTick: "¡{name} sangra! (−1 PV)",
        nettedCannotAct: "¡{name} está enredado y no puede actuar!",
        rootedCannotAct: "¡{name} está enraizado y no puede actuar!",
        moveUndone: "Movimiento deshecho.",
        guard: "Guardia.",
        selectMoveTile: "Elige una casilla resaltada para moverte.",
        selectAdjacentFoe: "Elige un enemigo adyacente para golpear.",
        noValidTarget: "Ningún objetivo válido.",
        crowdMadness: "La locura de la multitud pesa sobre tus luchadores (−{penalty} VEL).",
        cursedSandBurn: "¡{name} arde en arena maldita! (−{dmg})",
        stepsSpikes: "{name} pisa pinchos (-{dmg})",
        walksFire: "{name} atraviesa el fuego (-4, ardiendo)",
        fountainHeal: "{name} es curado por la fuente (+{heal})",
        barricadeDestroyed: "¡Barricada destruida!",
        ritualPulses: "¡El ritual palpita en la arena!",
        crowdChantingSlow: "El cántico de la multitud se intensifica — ¡todos ralentizan! (−1 VEL)",
        arenaCollapses: "¡El suelo de la arena se agrieta y colapsa!",
        sandShifts: "¡La arena se mueve bajo tus pies!",
        glyphStunned: "¡{name} queda aturdido por glifos arcanos!",
        glyphsNoCatch: "Los glifos brillan en la arena, pero no atrapan a nadie.",
        symbolsBurn: "¡Los símbolos arden en la arena!",
        glyphLingerStun: "¡{name} se demora en un glifo — aturdido!",
        cursedSandStains: "Arena maldita mancha el suelo de la arena.",
        ritualHums: "El ritual vibra bajo la arena.",
        editorsSalute: "Los editores saludan. ¡A luchar!",
        survivalWaveFight: "Oleada {wave} — ¡A luchar!",
        rosterTrimmed: "Plantilla recortada a {max} luchadores.",
        partialDeployWarning: "Aviso: solo {placed} de {total} luchadores pudieron colocarse.",
        pursuitSensePrimed: "Perspicacia — ¡daño extra preparado!",
        momentumCharge: "Ímpetu — +3 ATA por la carga!",
        advanceChooseAction: "¡Avanza! — elige una acción.",
        attackerMisses: "{attacker} falla contra {defender} ({pct}% acierto)",
        attackerHitsFor: "{attacker} golpea a {defender} por {dmg}. ({pct}% acierto)",
        ripostePricks: "¡La estocada responde al atacante!",
        parryCounters: "¡Parada contraataque por 3!",
        spearBraceCounters: "¡Firma de lanza contraataque por 4!",
        interceptsBlow: "¡{name} intercepta el golpe!",
        secondWind: "¡{name} se levanta de nuevo! ¡Segundo aliento!",
        teleported: "¡Teletransportado!",
        abyssalNoDest: "Puerta abisal — no hay casillas de destino válidas.",
        abyssalSelectDest: "Puerta abisal — elige destino para {name}.",
        abyssalTeleported: "Puerta abisal — ¡{name} teletransportado!",
        gravePulseHits: "Pulso sepulcral golpea a {name} (4 daño verdadero).",
        pulseEchoesEmpty: "El pulso resuena en el vacío.",
        voidBurstHits: "Ráfaga del vacío golpea a {name} ({dmg}).",
        deathsEmbraceHits: "Abrazo de la muerte golpea a {name} (6 daño verdadero).",
        whirlwindFuryHits: "Furia torbellino golpea a {name} ({dmg}).",
        whirlwindSelectRepo: "Torbellino — elige una casilla para reposicionarte.",
        whirlInEmptyAir: "Giras en el aire vacío.",
        arrowsEmptyGround: "Las flechas caen en suelo vacío.",
        trampleHits: "Pisotón golpea a {name} ({dmg}).",
        trampleNoTargets: "Pisotón — ningún objetivo en línea.",
        suppressingFireHits: "Fuego de supresión golpea a {name} (3 daño verdadero).",
        suppressingFireEmpty: "Fuego de supresión — las flechas silban en el vacío.",
        riposteExclaim: "¡Estocada!",
        tremorThrustPushes: "¡Empuje sísmico retrocede!",
        chargeClosesGap: "¡La carga cierra la distancia!",
        pushedBack: "¡Empujado!",
        pushedTwoTiles: "¡Empujado 2 casillas!",
        netSlidesOff: "La red resbala — ¡Ojos de piedra!",
        iaculumNetted: "¡Iaculum — enredado!{extra}",
        iaculumBindingExtra: " ¡Red de sujeción firme!",
        provocatioNoHoldGifted: "¡La provocatio no afeta a un guerrero dotado!",
        provocatioDreadMark: "Provocatio — ¡Marca de pavor marca al enemigo!",
        provocatioCrowdRoars: "Provocatio — la multitud ruge tu nombre.",
        tremorPress: "Presión sísmica — {detail}",
        tremorPressShoved: "¡{n} enemigos empujados!",
        tremorPressNoRoom: "sin sitio para empujar.",
        noRoomToShove: "Sin sitio para empujar.",
        entangleRooted: "Enredar — ¡{name} enraizado y debilitado!",
        draggedUnder: "¡Arrastrado bajo!",
        huntersMark: "Marca del cazador — ¡{name} recibe +3 daño de todas las fuentes!",
        repositionsBack: "Se reposiciona {n} casilla(s) atrás.",
        lootFound: "¡Botín: {name}!",
        titusStares: "Titus mira la arena... murmura un nombre...",
        disPaterReach: "Alcance de Dis Pater — ¡la arena se agrieta!",
        defReducedTwoTurns: "¡DEF de {name} reducida 2 puntos durante 2 turnos!",
        statusBleeding: "¡{name} sangra!",
        statusStunned: "¡{name} aturdido!",
      },
      logAbility: {
        clickTileActivate: "{ability} — haz clic en tu casilla para activar.",
        noAdjacentEnemies: "{ability} — no hay enemigos adyacentes.",
        chooseAdjacentEnemy: "{ability} — elige un enemigo adyacente.",
        noValidLineTargets: "{ability} — no hay objetivos en línea válidos.",
        pickDirectionTile: "{ability} — elige una casilla de dirección.",
        noAdjacentAllies: "{ability} — no hay aliados adyacentes.",
        chooseAdjacentAlly: "{ability} — elige un aliado adyacente.",
        noTilesInRange: "{ability} — no hay casillas en alcance.",
        chooseCenterArea: "{ability} — elige casilla central para el área.",
        cutsTarget: "{ability} hiere a {target} ({dmg}).",
        healsSelfFor: "{ability} cura a {name} por {hp} PV.",
        missesArcherTarget: "¡{ability} falla contra {name}!",
        rainsOn: "{ability} llueve sobre {name} ({dmg} daño).",
        strikesOnlySand: "{ability} solo golpea arena.",
        missesHitPct: "{ability} falla ({pct}% acierto)",
        piercesFor: "{ability} perfora por {dmg}. ({pct}% acierto)",
        healsAllyCleanse: "{ability} cura a {name} por {hp} PV y limpia perjuicios.",
        braceImpact: "{ability} — te preparas para el impacto.",
        shieldRaised: "{ability} — escudo en alto, +3 DEF este asalto.",
        readyCounterTwo: "{ability} — listo para contrarrestar los próximos 2 golpes cuerpo a cuerpo.",
        bladeReady: "{ability} — hoja lista.",
        pathsLengthen: "{ability} — los caminos se alargan (Mov +1).",
        atkDefTrade: "{ability} — +2 ATA, −2 DEF.",
        allyGainDef: "{ability} — {list} ganan +2 DEF.",
        noAlliesInRangeAb: "{ability} — no hay aliados en alcance.",
        noValidTilesRange: "{ability} — no hay casillas válidas en alcance.",
        selectTileTeleport: "{ability} — elige una casilla para teletransportarte.",
        allDebuffsCleansed: "{ability} — ¡todos los perjuicios limpiados!",
        battleCry: "{ability} — {detail}",
        foesShaken: "¡{n} enemigos amedrentados (−2 ATA)!",
        noFoesInRangeAb: "{ability} — no hay enemigos en alcance.",
        nextAttackHit15: "{ability} — el próximo ataque tiene +15% de acierto.",
        movePlusTwo: "{ability} — Mov +2 este turno.",
        restoredHp: "{ability} — restaurados {hp} PV.",
        healedRootCleansed: "{ability} — curados {hp} PV, raíz limpiada.",
        defRooted: "{ability} — +4 DEF, enraizado.",
        groupHeal5: "{ability} — {n} aliados curados 5 PV.",
        healedMovePlusOne: "{ability} — curados {hp} PV, Mov +1.",
        nextAttackHit25: "{ability} — próximo ataque +25% acierto.",
        nextHitHalved: "{ability} — próximo golpe mitad, contra 3 daño.",
        nextAttackerCounter4: "{ability} — el próximo atacante recibe 4 de contra.",
        activated: "{ability} activada.",
        alliesAtkMove: "{ability} — {n} aliados ganan +2 ATA, +1 Mov.",
        defUntilTurn: "{ability} — +3 DEF hasta el próximo turno.",
        alliesAtkOnly: "{ability} — {n} aliados ganan +2 ATA.",
        interceptAdjacent: "{ability} — listo para interceptar el próximo ataque a un aliado adyacente.",
        alreadyUsedBattle: "{ability} ya usada en este combate.",
        fullyHealed: "{ability} — ¡totalmente curado!",
        defAtkTwoTurns: "{ability} — +2 DEF, +1 ATA durante 2 turnos.",
        foesRooted: "{ability} — ¡{n} enemigos enraizados!",
        nextTwoNoMiss: "{ability} — los próximos 2 ataques no pueden fallar.",
        healedAtkDebuff: "{ability} — curados {hp} PV, −2 ATA este turno.",
        noAdjacentAlliesTeleport: "{ability} — no hay aliados adyacentes para teletransportar.",
        selectAllyTeleport: "{ability} — elige un aliado adyacente para teletransportar.",
        defTwoTurns: "{ability} — +3 DEF durante 2 turnos.",
        healedImmune: "{ability} — curados {hp} PV, inmune a perjuicios 1 turno.",
        fullyHealedAtk: "{ability} — ¡totalmente curado, +3 ATA durante 2 turnos!",
        interceptingAdjacent: "{ability} — interceptando golpes a aliados adyacentes.",
        lowHpBuff: "{ability} — +5 ATA, +5 DEF con menos del 30% PV.",
        strikeNMisses: "{ability} golpe {n} falla ({pct}% acierto)",
        strikeNDeals: "{ability} golpe {n} inflige {dmg}. ({pct}% acierto)",
        dealsStuns: "{ability} inflige {dmg} y aturde ({pct}% acierto)",
        dealsHitPct: "{ability} inflige {dmg}. ({pct}% acierto)",
        pulledCloser: "{ability} — ¡más cerca!",
        noRoomPull: "{ability} — sin sitio para tirar.",
        dealsBleed: "{ability} inflige {dmg} + sangrado ({pct}% acierto)",
        dealsStealLife: "{ability} inflige {dmg}, roba {stolen} PV ({pct}% acierto)",
        targetWeakened: "{ability} — {name} debilitado (−{amt} ATA)",
        pushedBackEx: "{ability} — ¡empujado atrás!",
        hpSwapped: "{ability} — ¡PV intercambiados! {detail}",
        cleansesList: "{ability} limpia {list}",
        nothingToCleanse: "{ability} — nada que limpiar.",
        strikeMissesCs: "{ability} golpe falla ({pct}% acierto)",
        strikesFor: "{ability} golpea por {dmg}. ({pct}% acierto)",
        bondDamageAmp: "{ability}: {a} y {b} se infligen +20% mutuamente durante 3 turnos.",
        hitsFor: "{ability} golpea a {name} por {dmg}. ({pct}% acierto)",
        dealsTo: "{ability} inflige {dmg} a {name}. ({pct}% acierto)",
        hpSwapPairs: "{a}: {ahp}/{amax}, {b}: {bhp}/{bmax}",
      },
      logStory: {
        endingAReach: "Cassius extiende la mano. Titus baja la espada.",
        endingABond: "El vínculo gemelo resiste. El ritual se hace añicos.",
      },
      logEnemy: {
        closesDistance: "{name} acorta distancias.",
        usesAbilityHeal: "{name} usa {ability} (+{heal} PV).",
        raisesTestudo: "{name} alza el Testudo (+3 DEF).",
        bracesCetus: "{name} se prepara con Muro del Ceto.",
        readiesSicaRiposte: "{name} prepara Sica en contraestocada.",
        usesUmbra: "{name} usa Umbra (+1 movimiento).",
        usesBlindRush: "{name} usa Carga ciega (+2 ATA, −2 DEF).",
        raisesPhalanx: "¡{name} alza la Falange!",
        arenaSalute: "{name} usa Saludo de arena — ¡limpio!",
        rallyCharge: "{name} usa Carga de arenga (+2 movimiento).",
        phaseWalkCloser: "¡{name} camina en fase más cerca!",
        shadowStepsCloser: "¡{name} da un paso sombrío más cerca!",
        highGround: "{name} usa Terreno elevado (+15% precisión).",
        battleFocus: "{name} usa Foco de batalla (+25% precisión).",
        evasion: "{name} usa Evasión (+3 DEF).",
        eagleEye: "{name} usa Ojo de águila — ¡no puede fallar!",
        unholyResilience: "{name} usa Resiliencia profana (+3 DEF).",
        usesParry: "{name} usa Parada.",
        readiesSpearBrace: "{name} prepara Firma de lanza.",
        ironWill: "{name} usa Voluntad de hierro (+{heal} PV).",
        neptunesFavor: "{name} usa Favor de Neptuno.",
        shadowMend: "{name} usa Remiendo sombrío.",
        championsResolve: "{name} usa Resolución de campeón — ¡totalmente curado!",
        crowdsFavorFull: "{name} usa {ability} — ¡totalmente curado!",
        holdTheLine: "¡{name} usa Mantener la línea!",
        lastStand: "¡{name} activa Último aliento!",
        battleHardened: "{name} usa Veterano curtido (+2 DEF, +1 ATA).",
        intimidatingRoar: "{name} Rugido intimidatorio — ¡{n} enemigos enraizados!",
        inspiringPresence: "{name} Presencia inspiradora — ¡{n} aliados potenciados!",
        warCry: "{name} Grito de guerra — ¡{n} enemigos debilitados!",
        netsTarget: "¡{name} enreda a {target}!{extra}",
        bindingNetExtra: " ¡Red de sujeción!",
        gravePulseHit: "{name} Pulso sepulcral golpea a {target} (4).",
        usesAbilityOn: "{name} usa {ability} sobre {target} ({dmg}).",
        brandsDreadMark: "¡{name} marca a {target} con Marca de pavor!",
        marksProvocatio: "¡{name} marca a {target} con Provocatio!",
        challengesDuel: "¡{name} reta a {target} a duelo!",
        usesAbilityMisses: "{name} usa {ability} — ¡falla!",
        tremorPressAi: "Presión sísmica — {detail}",
        tremorPressShovedAi: "{name} Presión sísmica — ¡{n} enemigos empujados!",
        shovesTarget: "¡{name} empuja a {target}!",
        usesAbilityOnExtra: "{name} usa {ability} sobre {target} ({extra}).",
        lifeStealAi: "{name} usa {ability} ({dmg} daño, +{stolen} PV).",
        atkDebuffAi: "{name} usa {ability} sobre {target} (−{amt} ATA)!",
        entangleAi: "{name} Enredar — ¡{target} enraizado y debilitado!",
        huntersMarkAi: "{name} Marca del cazador — ¡{target} recibe +3 daño!",
        dragUnderHit: "{name} Arrastre bajo golpea a {target} ({dmg}).",
        dragUnderMiss: "{name} Arrastre bajo — ¡falla!",
        veteransFury: "{name} Furia del veterano ({dmg}).",
        veteransFuryMiss: "{name} Furia del veterano — ¡falla!",
        aoeAbilityHit: "{name} {ability} golpea a {target} ({dmg}).",
        aoeAbilityMiss: "¡{name} {ability} falla contra {target}!",
        frenzyHit: "{name} Golpe frenético {n} hiere a {target} ({dmg}).",
        frenzyMiss: "¡{name} Golpe frenético {n} falla!",
        fatesThread: "{name} Hilo del destino — ¡PV intercambiados!",
        basicStrike: "{name} golpea a {target} por {dmg}. ({pct}%)",
        basicSwingMiss: "{name} embiste a {target} — ¡falla! ({pct}%)",
        pullsCloser: "¡{name} tira de {target} hacia sí!",
      },
      log: { fullTitle: "Registro de combate completo", copy: "Copiar", copied: "Copiado al portapapeles", close: "Cerrar" },
      controls: {
        heading: "Controles",
        close: "Cerrar",
        secBattle: "Combate",
        secMove: "Cursor y casillas",
        secCam: "Cámara",
        secDeploy: "Despliegue",
        secTouch: "Táctil",
        b1: "M — Mover, A — Atacar, B — menú de habilidad, W — Esperar, U — Deshacer movimiento.",
        b2: "Esc — cancelar selección o cerrar el menú. Flechas, Tab / Mayús+Tab o teclas 1–9 navegan y eligen habilidades con el menú abierto.",
        m1: "Flechas mueven el cursor; Intro o Espacio confirman la casilla.",
        d1: "Tab al listado de despliegue; Intro o Espacio eligen luchador. Clic en casilla de puerta resaltada para colocar; clic en tu luchador en el mapa para retirar.",
        c1: "Q / E — girar la vista. + / − — zoom. R — restablecer cámara.",
        c2: "Rueda — zoom. Espacio + arrastrar — desplazar. Clic central o derecho arrastrando — desplazar.",
        c3: "F2 — silenciar. F3 — velocidad de animación.",
        t1: "Un dedo arrastrando — desplazar. Pellizco — zoom. Toque — casilla (como clic).",
        secBanner: "Barra superior (en Ludus / combate)",
        ban1: "Ajustes — idioma, audio, velocidad de animación y aviso de guardado.",
        ban2: "Controles — resumen de teclado y táctil (igual que en el título).",
        ban3: "F2 (silenciar) y F3 (velocidad de animación) están en la barra de cámara; Ajustes ofrece las mismas opciones.",
        secResult: "Tras el combate",
        r1: "Continuar enfoca el botón principal; Esc lo gestiona el control enfocado.",
      },
      settings: {
        heading: "Ajustes",
        close: "Cerrar",
        language: "Idioma",
        audio: "Audio",
        mute: "Silenciar",
        unmute: "Activar sonido",
        animSpeed: "Velocidad de animación",
        speedHint: "Mismo control que F3 en la barra.",
        saveToast: "Toast de partida guardada",
        toastOn: "En cada guardado (por defecto)",
        toastMinimal: "Menos a menudo",
        toastOff: "Desactivado",
        banner: "Ajustes",
      },
      skirmishTip: {
        title: "Consejos de combate libre",
        line1: "Q / E — girar la vista. + / − — zoom. R — restablecer cámara.",
        line2: "Espacio + arrastrar — desplazar. Elige un luchador en la lista y luego una casilla azul de puerta para desplegar.",
        continue: "Continuar",
        dontShow: "No volver a mostrar",
      },
      survivalLb: {
        empty: "Aún no hay registros.",
        thRank: "#",
        thWave: "Oleada",
        thScore: "Puntuación",
        thDiff: "Dif.",
      },
      deploy: {
        cardAria: "{name}, {className}. {status}",
        statusPending: "Sin colocar",
        statusPlaced: "Colocado",
      },
      tileInfo: {
        zoneGate: "Puerta",
        zoneWall: "Muro",
        zoneSand: "Arena",
        heightLow: "Bajo",
        heightMid: "Medio",
        heightHigh: "Alto",
        sep: " · ",
        hPrefix: "A:",
        terrainBuilding: "Edificio",
        waterDeep: "Agua profunda",
        waterShallow: "Agua poco profunda",
        impassable: "Impasable",
        slowsMove: "Ralentiza el movimiento",
        spikeTrap: "Trampa de pinchos",
        fireTrap: "Trampa de fuego",
        barricade: "Barricada",
        barricadeHp: "PV:{n}",
        fountain: "Fuente",
        fountainExtra: "Cura +5/turno",
        highGround: "Terreno alto",
        highGroundExtra: "+15% daño",
        collapsed: "DERRUMBADO",
        cursed: "Maldito",
        glowAtk: "Brillo (+2 ATA)",
        teamPlayer: "aliado",
        teamEnemy: "enemigo",
        occupant: "{name} ({team}) PV:{hp}/{maxHp}",
      },
      title: {
        sub: "Tácticas de ludus", continueCampaign: "Continuar campaña", newCampaign: "Nueva campaña", skirmish: "Combate libre", survival: "Arena de supervivencia",
        trophies: "Trofeos", bestiary: "Bestiario", tutorial: "Tutorial", controls: "Controles", slotTitleNew: "Elige ranura para nueva campaña", slotTitleCont: "Continuar campaña",
        slotDiff: "Dificultad", slotBack: "Atrás", langLabel: "Idioma",
        slotWord: "Ranura", slotEmpty: "Vacío", fightersFmt: "{n} luchadores · {date}", overwriteConfirm: "¿Sobrescribir la ranura {n}?",
        slotExportEmpty: "La ranura {n} está vacía.", exportSave: "Exportar partida", importSave: "Importar a la ranura {n}",
        exportAria: "Exportar ranura {n}", importAria: "Importar a la ranura {n}",
        importSuccess: "Partida importada en la ranura {n}.",
        importQuota: "Almacenamiento lleno — no se puede importar. Libera datos del navegador u otras partidas.",
        importParse: "No se pudo leer el archivo — JSON no válido.",
        importInvalid: "Archivo de partida no válido.",
      },
      skirmish: {
        heading: "Ajustes de combate libre", enemies: "Enemigos", budget: "Presupuesto", mapSize: "Tamaño del mapa", terrain: "Terreno", mapTemplate: "Plantilla", difficulty: "Dificultad", seed: "Semilla", seedPh: "aleatoria", start: "Empezar", back: "Atrás",
        sizeSmall: "Pequeño (8×7)", sizeMedium: "Mediano (12×10)", sizeLarge: "Grande (14×12)", sparse: "Escaso", normal: "Normal", dense: "Denso", random: "Aleatorio",
        tmplPit: "El foso", tmplBridge: "Puente de cadenas", tmplTiers: "Gradas del Coliseo", tmplFlooded: "Arena inundada", tmplPillared: "Salón de columnas",
      },
      scene: { continue: "Continuar", advanceAria: "Clic para avanzar el diálogo", choices: "Decisiones" },
      result: {
        continue: "Continuar", retry: "Reintentar misión", ngPlus: "Nueva partida+", ngPlusCycle: "Nueva partida+ (Ciclo {n})", watchReplay: "Ver repetición", trainingVictory: "ENTRENAMIENTO — VICTORIA", trainingDefeat: "ENTRENAMIENTO — DERROTA", victoria: "¡VICTORIA!", defeat: "DERROTA",
        standing: "<strong>{alive}</strong> de <strong>{total}</strong> gladiadores en pie", turns: "<strong>{n}</strong> turnos combatidos", damageDealt: "<strong>{n}</strong> de daño infligido a enemigos",
        mvp: "MVP: {name} — {dmg} daño, {kills} bajas", firstBlood: "Primera sangre: {name}", denariiEarned: "+{n} denarios ganados", xpLine: "{name} — Nv.{lv}, {xp} XP, {kills} bajas",
        statRow: "{dmg} daño · {k}B · {taken} recibido", crowdChants: "¡La multitud corea tu nombre!", sandClaims: "La arena se lleva el orgullo de otro lanista.", campaignOver: "Los Ludi Aeternales han terminado.",
      },
      replay: { heading: "Repetición de combate", close: "Cerrar", ariaReplay: "Repetición de combate", goStart: "Ir al inicio", prev: "Paso anterior", next: "Paso siguiente", goEnd: "Ir al final" },
      trophy: { heading: "Trofeos", back: "Atrás", listAria: "Lista de trofeos", lockedHint: "Bloqueado", hiddenName: "???" },
      postMissionTip: {
        title: "Consejos rápidos",
        body: "Cambia idioma, sonido y velocidad de animación cuando quieras en Ajustes (barra superior). Controles lista todos los atajos.",
        gotIt: "Entendido",
      },
      trophyAch: {
        first_blood: { name: "Primera sangre", desc: "Gana tu primer combate." },
        veteran: { name: "Lanista veterano", desc: "Gana 10 combates." },
        centurion: { name: "Centurión", desc: "Gana 25 combates." },
        flawless: { name: "Victoria impecable", desc: "Gana un combate sin perder unidades." },
        massacre: { name: "Masacre", desc: "Inflige 100+ de daño en un solo combate." },
        collector: { name: "Coleccionista", desc: "Posee 5 piezas de equipo." },
        hoarder: { name: "Acaparador", desc: "Posee 15 piezas de equipo." },
        wave_5: { name: "Superviviente de arena", desc: "Alcanza la oleada 5 en Supervivencia." },
        wave_10: { name: "Diezmador", desc: "Alcanza la oleada 10 en Supervivencia." },
        wave_15: { name: "Imparable", desc: "Alcanza la oleada 15 en Supervivencia." },
        full_roster: { name: "Lleno total", desc: "Ten 6 gladiadores en la plantilla." },
        promotion: { name: "Ascendido", desc: "Asciende una unidad a clase avanzada." },
        all_classes: { name: "Diversidad", desc: "Usa las 12 clases base en combate." },
        campaign_clear: { name: "Ave Imperator", desc: "Completa la campaña." },
        campaign_hard: { name: "Invictus", desc: "Completa la campaña en Lanista." },
        overkill: { name: "Exceso", desc: "Asesta un golpe de 20+ de daño." },
        pacifist_turn: { name: "Misericordia", desc: "Gana un combate sin bajas durante 5+ turnos." },
        speedrunner: { name: "Contrarreloj", desc: "Gana un combate en 5 turnos o menos." },
        deathless: { name: "Sin bajas", desc: "Completa 5 combates de campaña sin muertes." },
        hundred_kills: { name: "Hecatombe", desc: "Acumula 100 bajas en total." },
        max_level: { name: "Cumbre", desc: "Alcanza el nivel máximo con una unidad." },
        rich: { name: "Plutócrata", desc: "Acumula 500 denarios." },
        bond_pair: { name: "Hermanos de armas", desc: "Forma un vínculo entre dos gladiadores." },
        scarred: { name: "Marcado por la batalla", desc: "Una unidad sobrevive al borde de la muerte 3 veces." },
      },
      bestiary: { heading: "Bestiario", back: "Atrás", listAria: "Lista de clases" },
      survival: { heading: "Arena de supervivencia", diff: "Dificultad", start: "Empezar", back: "Atrás", betweenWaves: "Entre oleadas", nextWave: "Siguiente oleada", leaderboardAria: "Mejores puntuaciones de supervivencia" },
      promo: { heading: "Ascenso", optionsAria: "Opciones de ascenso" },
      equip: {
        shopTitle: "Tienda de equipo",
        inventoryPrefix: "Inventario:",
        slotWeapon: "arma",
        slotArmor: "armadura",
        slotTrinket: "accesorio",
        modFmt: "+{n} {stat}",
        denShort: "d",
        assignPrompt: "Asignar {name} ({cost} d) — elige un luchador:",
        assignGroupAria: "Asignar equipo a un luchador",
        assignToAria: "Asignar a {name}",
        statAtk: "ATA",
        statDef: "DEF",
        statSpd: "VEL",
        statHp: "PV",
        statMove: "MOV",
      },
      rosterStats: {
        empty: "Aún no hay datos de plantilla.",
        thName: "Nombre",
        thClass: "Clase",
        thLv: "Nv",
        thKills: "Bajas",
        thBattles: "Combates",
        thTitle: "Título",
        dash: "—",
        scarred: "(Marcado)",
        bonded: "Parejas vinculadas:",
        campaignTotals: "Totales de campaña: {battles} combates · {kills} bajas · {dmg} daño · {turns} turnos",
      },
      survivalShop: {
        waveLine: "¡Oleada {wave} superada! Puntuación: {score}",
        denariiLine: "Denarios: {n}",
        hpLabel: "PV:",
        healBtn: "Curar {hp}PV ({cost}d)",
      },
      rename: {
        hint: "Intro para confirmar · Esc para cancelar",
        accept: "Aceptar",
        acceptAria: "Aceptar nombre",
        randomAria: "Nombre aleatorio",
      },
      canvas: { arenaAria: "Cuadrícula isométrica — Q/E girar, rueda zoom, Espacio+arrastrar o botón central/derecho para desplazar; táctil: arrastrar para mover, pellizco para zoom", ctAria: "Próximos turnos", rosterAria: "Gestión de plantilla", deployAria: "Despliegue", battleAria: "Combate", battleActions: "Acciones de combate", abilitiesMenu: "Habilidades", combatLog: "Registro de combate", deployQueue: "Cola de despliegue", pickedAria: "Luchadores elegidos", classListAria: "Clases disponibles", rosterStatsAria: "Estadísticas de plantilla", stageAria: "Vista de arena", camAria: "Cámara" },
      cam: { rotL: "Girar izquierda (Q)", zoomIn: "Acercar (+)", zoomOut: "Alejar (-)", rotR: "Girar derecha (E)", reset: "Restablecer cámara (R)", mute: "Silenciar (F2)", speed: "Velocidad de animación (F3)" },
      hud: { diffBracket: "[{label}]" },
      battle: {
        noUsableAbilities: "No hay habilidades usables.",
        noAdjacentFoes: "No hay enemigo adyacente para atacar.",
        abilityMenuEscHint: "Esc — cerrar menú",
        glossary: "Glosario",
        keybindToggle: "Teclas",
        keybindSummary: "M mover · A atacar · B habilidad · W esperar · U deshacer · Esc cancelar",
        forecastBasicAttack: "Ataque",
        forecastEffects: "Efectos: {effects}",
        forecastTempo: "Ritmo: {tempo}",
        forecastHit: "Acierto: {pct}%",
        forecastDmg: " de daño",
        forecastDmgTrue: " de daño verdadero",
        forecastPerFoe: " (por enemigo)",
        forecastSwapHp: "Intercambiar % de PV",
        forecastAreaPerFoe: "~{n} de daño por enemigo en el área",
        forecastIfMovedHere: "~{dmg} de daño (si te mueves aquí)",
        forecastIgnoreDef: "Ignora DEF {pct}%",
        forecastTempoStandard: "estándar",
        forecastFx: {
          generic: "{id}",
          stun: "Aturdir",
          pull: "Tirón",
          entangle: "Raíz / ATA −",
          drag: "Arrastre",
          huntermark: "Presa marcada",
          bleed: "Sangrado",
          lifesteal: "Robo de vida",
          whirlwind: "Torbellino",
          push: "Empujón",
          push2: "Empujón fuerte",
          suppress: "Supresión",
          charge: "Carga",
          trample: "Pasada",
          atkdebuff: "ATA −",
          voidburst: "Ráfaga del vacío",
          grave_pulse: "Pulso sepulcral",
          deathembrace: "Abrazo de la muerte",
          cleanse_self: "Limpieza",
          double_strike: "Doble golpe",
          teleport_back: "Reubicación",
          duel: "Duelo",
          defdebuff: "DEF −",
          hpswap: "Intercambio de PV",
        },
      },
      resultInsights: {
        title: "Notas del combate",
        win: {
          highDamage: "Buena presión: {n} de daño total.",
          lowDamage: "Poca presión: solo {n} de daño.",
          allyLosses: "Bajas sufridas: {n} unidades aliadas cayeron.",
          cleanFight: "Ejecución limpia: sin bajas aliadas en este combate.",
          longBattle: "Combate largo: {n} turnos.",
          shortBattle: "Resolución rápida: {n} turnos.",
        },
        loss: {
          highDamage: "Aun así infligiste {n} de daño — la apertura existió.",
          lowDamage: "Poco daño ({n}) — busca altura, foco y intercambios más seguros.",
          casualties: "Bajas: {n} luchadores perdidos.",
          longBattle: "Combate largo ({n} turnos) — recursos y posición se agotaron.",
          shortBattle: "Combate corto ({n} turnos) — el golpe decisivo te fue adverso.",
        },
      },
      saveBadge: { saved: "Guardado", unsaved: "Sin guardar", issue: "Error de guardado" },
      settingsExtra: {
        highContrast: "Alto contraste",
        highContrastOn: "Activado",
        highContrastOff: "Desactivado",
        resetUxCounters: "Reiniciar contadores UX",
        resetUxCountersDone: "Contadores UX borrados.",
      },
      phaseAnnounce: { ludus: "Fase de ludus.", deploy: "Fase de despliegue.", battle: "Fase de combate." },
      difficultyHelp: {
        easy: "Novato: estadísticas enemigas más bajas y ritmo más suave.",
        normal: "Gladiador: desafío estándar.",
        hard: "Lanista: enemigos más fuertes y menos margen de error.",
      },
      titleRecap: {
        none: "Aún no hay campaña guardada.",
        lastPlayed: "Última sesión: Ranura {slot} · M{mid} {mission} · {date}",
      },
      abilityTip: {
        range: "Alcance {r}", multDmg: "×{m} daño", trueDmg: "{n} daño verdadero", heal: "Cura {n}", lvl: "Nv{n}",
      },
      abilities: {},
      ai: { balanced: "Equilibrado", berserker: "Berserker", tactician: "Táctico", assassin: "Asesino", guardian: "Guardián" },
      endings: {
        a: "Final A — Geminus", b: "Final B — El sacrificio", c: "Final C — El recipiente", d: "Final D — El perro del emperador", e: "Final E — La pira",
        complete: "CAMPAÑA COMPLETADA", sandRemembers: "La arena lo recuerda.", ngCycle: "Nueva partida+ (Ciclo {n})",
        desc: {
          a: "Ambos hermanos sobreviven. El ritual se rompe por un acto de amor testarudo y estúpido. Salen juntos de la arena, a la luz del sol, hacia lo que venga.",
          b: "Titus se restaura. Cassius quema el ritual desde dentro, destrozándose para salvar a los demás. El precio del amor es un cuerpo roto y un hermano que nunca se perdonará.",
          c: "Cassius se convierte en recipiente del poder bajo la arena. Titus es libre. Pero algo antiguo mira a través de los ojos de Cassius ahora, y sonríe demasiado despacio.",
          d: "El campeón de Nerón gana — pero la victoria es ceniza. Titus no reconoce al hombre que sirvió a un tirano para salvarlo. Cassius queda solo en una arena vacía, con una águila dorada que no vale nada.",
          e: "La arena arde. El Coliseo grita. Cassius arrastra a su hermano entre los escombros — vivo, humano, libre. Pero los demás han desaparecido. Dos hermanos, rodeados por los restos de cada elección que los trajo aquí.",
        },
      },
      tutorial: {
        s0: "¡Bienvenido, lanista! Este es el ludus — tu pantalla de plantilla. Tiro, un murmillo gratuito, ya está contratado.",
        s1: "Gasta denarios para contratar más luchadores en la lista de la izquierda. Cada clase tiene distintas estadísticas y habilidades.",
        s2: "Cuando estés listo, pulsa «A las puertas» para desplegar a tus gladiadores en la arena.",
        s10: "Haz clic en una casilla azul al pie de la arena para colocar un luchador. Clic en uno colocado para retirarlo.",
        s11: "Cuando todos estén colocados, pulsa «Entrar en la arena» para comenzar el combate.",
        s20: "¡Es tu turno! Usa Mover (M), Atacar (A), Habilidad (B) o Esperar (W) para terminar el turno.",
        s21: "Consejo: muévete primero junto a un enemigo y luego ataca. Atajos: M, A, B, W.",
        s22: "La franja CT arriba muestra el orden de turno. Más VEL = más acciones. La altura da +15% de daño.",
        s30: "¡Buen movimiento! Ahora Atacar (A) a un enemigo adyacente o Habilidad (B) si hay alguna.",
        s40: "¡Impacto! El daño depende de tu ATA menos la DEF del defensor, con altura y efectos.",
        s50: "¡Enemigo abajo! Derrota a todos para ganar el combate.",
        s60: "¡Victoria! Has completado el entrenamiento. Los supervivientes pasan a la siguiente misión.",
      },
      classes: {
        murmillo: { name: "Murmillo", role: "Baluarte — escudo y gladius" },
        retiarius: { name: "Retiario", role: "Hostigador — tridente y red" },
        secutor: { name: "Secutor", role: "Cazador — persigue al ágil" },
        thraex: { name: "Tracio", role: "Duelista — sica y pármulo" },
        hoplomachus: { name: "Hopómaco", role: "Lancero — hasta y broquel" },
        dimachaerus: { name: "Dimáquero", role: "Maestro de acero — espadas gemelas" },
        provocator: { name: "Provocador", role: "Campeón — rito de provocatio" },
        samnite: { name: "Samnita", role: "Veterano — armamento itálico" },
        sagittarius: { name: "Sagitario", role: "Arquero — arco compuesto" },
        essedarius: { name: "Esedario", role: "Carro — luchador móvil" },
        umbra: { name: "Umbra", role: "Acólito sombrío — tocado por el culto" },
        vestige: { name: "Vestigio", role: "Eco de Dis Pater — sombra" },
      },
      campaignScenes: {
        "0": {
          pre: [
            "Antes del alba. El ludus de Publius: un patio miserable de arena apisonada, postes astillados y hombres demasiado testarudos o estúpidos para morir cómodos.",
            "La mitad apenas sostiene la espada recta. La otra la clava en las gargantas de los demás. Que los dioses me ayuden.",
            "Cassius arrastra a dos combatientes gimiendo de sus catres para un combate de práctica. Sin público, sin moneda, sin gloria. Solo hierro y el sonido de huesos aprendiendo dónde no doblarse.",
            "Si alguno muere en práctica, juro por Júpiter que me orinaré en sus tumbas. Arriba.",
          ],
          post: [
            "No estuvo mal. No avergonzaremos el nombre del viejo. Hoy no.",
            "Un jinete desmonta en la puerta. Trae una tablilla sellada con el sello del Coliseo. Su caballo está mejor alimentado que nadie en el ludus.",
            "Los Ludi Aeternales. El gran torneo del Imperio. Cada ludus convocado. Premio suficiente para ahogar las deudas de un hombre — o enterrarlo con ellas.",
            "Publius, viejo bastardo. Moriste y me dejaste este circo. Espero que te estés riendo.",
          ],
        },
        "1": {
          pre: [
            "Roma los traga enteros. El Coliseo se alza sobre el barrio del ludus como un dios de caliza, su sombra fría incluso al mediodía.",
            "Deudas en cada muro. El nombre de Publius tachado en la mitad de las listas de acreedores porque ya no cobran a un muerto. Yo heredé la lista.",
            "Un mensajero del campo de clasificación — sin aliento, a vino barato — trae un rumor: un gladiatorio que encaja con Titus. Alto, moreno, lucha con dos hojas. Sin lanista. Sin nombre.",
            "Quince años. Quince años mirando a cada luchador en cada arena manchada desde aquí hasta Britania. Y ahora un rumor. Un maldito rumor.",
            "Pero basta. Siempre ha bastado.",
          ],
          post: [
            "El público apenas lo nota: un combate de clasificación entre don nadie. Pero Cassius está dentro. Le tiemblan las manos.",
            "El Coliseo. Soñaba con este sitio. Ahora estoy en sus entrañas y solo pienso si mi hermano está en alguna parte y si reconocería mi cara.",
            "Un vistazo en el corredor del hipogeo: un luchador alto escoltado por dos funcionarios de túnica oscura. Tiene la cara vuelta. Cassius grita el nombre de su hermano. Los funcionarios aceleran. El luchador no se gira.",
            "Titus.",
          ],
        },
        "2": {
          pre: [
            "Cincuenta mil gargantas gritando por sangre que no es suya. La arena sigue húmeda del último combate — ni la rastrillaron. Moscas por todas partes.",
            "Vaya, mierda. La cría de Publius sí que apareció. Tu viejo murió debiendo a media Roma. ¿Viniste a pagarlo con dientes?",
            "Estoy aquí para sacarte los tuyos. Pero sigue hablando.",
            "Qué mono. Mis luchadores se desayunan chicos como tú. Literalmente: uno es tracio. Así son.",
            "Al menos comen.",
          ],
          post: [
            "Los matones financiados por Lurco yacen sangrando en la arena. Un ludus pequeño de la nada destripó al favorito. El público huele historia de debilucho y babea.",
            "Disfrútalo, chico. No tienes idea de de quién son estos juegos. Cuando lo descubras, desearás haberte quedado en ese ludus de suelo de tierra.",
            "Esa noche, Cassius oye a sus gladiadores susurrar. Sueños extraños. Una sala oscura bajo la piedra. Respiración que no es la suya. Uno lloraba dormido.",
            "Solo nervios. Solo nervios. Todos estamos nerviosos.",
          ],
        },
        "3": {
          pre: [
            "Pasada la medianoche. Una mujer aparece en el barrio del ludus: estola cara, perfume caro, la calma de quien manda matar por oficio.",
            "Venciste a Lurco. Impresionante. Tampoco debía pasar. Los cuadros están amañados, gladiador. Llevan años.",
            "¿Y sabes eso porque…?",
            "Porque mi padre es senador y tres de sus aliados han visto a sus campeones asesinados en este torneo. No derrotados — asesinados. Agua envenenada, armadura saboteada, árbitros sobornados.",
            "Necesito a alguien dentro. Alguien que el Editor no haya comprado. Alguien demasiado pobre y demasiado furioso para venderse.",
            "Halagador.",
          ],
          post: [
            "No está mal para una primera salida, jefe. He tenido peores lanistas. La mayoría están muertos, pero aun así — listón bajo.",
            "Uno intentó pagarme con queso. Queso de verdad. Me quedé dos meses. Era muy buen queso.",
            "El gladiador muerto del bando contrario lo sacan en camilla por el hipogeo. Al pasar, la mano del cadáver se crispa. Los dedos se curvan. Un espasmo. Probablemente un espasmo.",
            "Probablemente.",
          ],
          choices: [
            {
              prompt: "Livia espera. No parpadea lo bastante.",
              options: [
                "\"Escucho. Pero no salgo barato.\"",
                "\"Estoy aquí por mi hermano, no por vuestra mierda del Senado.\"",
              ],
            },
          ],
        },
      },
    },
  };

  function _loadLocale() {
    try {
      var s = localStorage.getItem(STORAGE_KEY);
      if (s === "es" || s === "en") _locale = s;
      else _locale = FALLBACK;
    } catch (e) {
      _locale = FALLBACK;
    }
  }

  _loadLocale();

  function getLocale() {
    return _locale;
  }

  function setLocale(code) {
    if (code !== "es" && code !== "en") return;
    _locale = code;
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch (e) { /* ok */ }
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.lang = STRINGS[code] && STRINGS[code].meta ? STRINGS[code].meta.htmlLang : "en";
    }
    var ev;
    try {
      ev = new CustomEvent("geminus-locale-change", { detail: { locale: code } });
    } catch (e2) {
      ev = document.createEvent("CustomEvent");
      ev.initCustomEvent("geminus-locale-change", false, false, { locale: code });
    }
    if (typeof document !== "undefined") document.dispatchEvent(ev);
  }

  function t(path, params) {
    var cur = STRINGS[_locale] || STRINGS.en;
    var v = _get(cur, path);
    if (typeof v !== "string") {
      v = _get(STRINGS.en, path);
    }
    if (typeof v !== "string") return path;
    return _interpolate(v, params);
  }

  function missionTitle(missionId) {
    var cur = STRINGS[_locale] || STRINGS.en;
    var m = cur.missions && cur.missions[missionId];
    if (typeof m === "string") return m;
    m = STRINGS.en.missions && STRINGS.en.missions[missionId];
    return typeof m === "string" ? m : null;
  }

  function actLabel(actNum) {
    return t("acts." + actNum);
  }

  function difficultyLabel(key) {
    return t("difficulty." + key);
  }

  function aiProfileLabel(key) {
    return t("ai." + key);
  }

  function mergeEsAbilities(map) {
    if (!STRINGS.es) return;
    STRINGS.es.abilities = STRINGS.es.abilities || {};
    for (var k in map) {
      if (map[k] && typeof map[k].name === "string") STRINGS.es.abilities[k] = map[k];
    }
  }

  function abilityName(ab) {
    if (!ab) return "";
    if (_locale === "es" && ab.aid && STRINGS.es.abilities && STRINGS.es.abilities[ab.aid] && STRINGS.es.abilities[ab.aid].name) {
      return STRINGS.es.abilities[ab.aid].name;
    }
    return ab.name || "";
  }

  function abilityDesc(ab) {
    if (!ab) return "";
    if (_locale === "es" && ab.aid && STRINGS.es.abilities && STRINGS.es.abilities[ab.aid]) {
      var d = STRINGS.es.abilities[ab.aid].desc;
      if (d != null && d !== "") return d;
    }
    return ab.desc || "";
  }

  var _ABILITY_TYPE_ES = { attack: "Ataque", buff: "Beneficio", debuff: "Perjuicio", heal: "Curación", utility: "Utilidad", passive: "Pasiva", summon: "Invocación" };

  function abilityTipExtras(ab) {
    if (!ab) return "";
    var parts = [];
    if (ab.type) {
      if (_locale === "es") {
        parts.push(_ABILITY_TYPE_ES[ab.type] || ab.type.charAt(0).toUpperCase() + ab.type.slice(1));
      } else {
        parts.push(ab.type.charAt(0).toUpperCase() + ab.type.slice(1));
      }
    }
    if (ab.range != null) parts.push(t("abilityTip.range", { r: ab.range }));
    if (ab.mult != null) parts.push(t("abilityTip.multDmg", { m: ab.mult }));
    if (ab.fixedDmg) parts.push(t("abilityTip.trueDmg", { n: ab.fixedDmg }));
    if (ab.healAmt) parts.push(t("abilityTip.heal", { n: ab.healAmt }));
    if (ab.levelReq && ab.levelReq > 1) parts.push(t("abilityTip.lvl", { n: ab.levelReq }));
    return parts.length ? "\n" + parts.join(" · ") : "";
  }

  function localizeClassDef(classDef) {
    if (_locale !== "es" || !classDef || !classDef.id) return classDef;
    var pack = STRINGS.es.classes && STRINGS.es.classes[classDef.id];
    if (!pack) return classDef;
    var out = {};
    for (var k in classDef) out[k] = classDef[k];
    if (pack.name) out.name = pack.name;
    if (pack.role) out.role = pack.role;
    return out;
  }

  function _cloneStep(step) {
    var o = {};
    for (var k in step) o[k] = step[k];
    return o;
  }

  function localizeMissionSteps(missionId, kind, steps) {
    if (_locale !== "es" || !steps || !steps.length) return steps;
    var pack = STRINGS.es.campaignScenes && STRINGS.es.campaignScenes[missionId];
    if (!pack) return steps;
    var texts = kind === "pre" ? pack.pre : pack.post;
    if (!texts || !texts.length) return steps;
    var out = [];
    for (var i = 0; i < steps.length; i++) {
      var s = _cloneStep(steps[i]);
      if (typeof texts[i] === "string" && s.text !== undefined) s.text = texts[i];
      out.push(s);
    }
    return out;
  }

  function localizeChoices(missionId, choices) {
    if (_locale !== "es" || !choices || !choices.length) return choices;
    var pack = STRINGS.es.campaignScenes && STRINGS.es.campaignScenes[missionId];
    if (!pack || !pack.choices || !pack.choices.length) return choices;
    var out = [];
    for (var ci = 0; ci < choices.length; ci++) {
      var c = choices[ci];
      var tr = pack.choices[ci];
      if (!tr) {
        out.push(c);
        continue;
      }
      var nc = {};
      for (var k in c) nc[k] = c[k];
      if (tr.prompt) nc.prompt = tr.prompt;
      if (tr.options && c.options) {
        nc.options = [];
        for (var oi = 0; oi < c.options.length; oi++) {
          var opt = c.options[oi];
          var no = {};
          for (var ok in opt) no[ok] = opt[ok];
          if (tr.options[oi]) no.label = tr.options[oi];
          nc.options.push(no);
        }
      }
      out.push(nc);
    }
    return out;
  }

  function applyMeta() {
    if (typeof document === "undefined") return;
    var m = STRINGS[_locale] && STRINGS[_locale].meta;
    if (!m) return;
    document.documentElement.lang = m.htmlLang || "en";
    var titleEl = document.querySelector("title");
    if (titleEl && m.pageTitle) titleEl.textContent = m.pageTitle;
    var md = document.querySelector('meta[name="description"]');
    if (md && m.pageDescription) md.setAttribute("content", m.pageDescription);
  }

  function applyStaticLabels() {
    if (typeof document === "undefined") return;
    var $ = function (id) { return document.getElementById(id); };

    var skip = $("skipLink");
    if (skip) skip.textContent = t("a11y.skip");

    var tag = document.querySelector(".tagline");
    if (tag) tag.textContent = t("banner.tagline");

    var pr = document.getElementById("panelRoster");
    if (pr) {
      var h2 = pr.querySelector("h2");
      if (h2) h2.textContent = t("panel.rosterTitle");
      var bl = document.getElementById("budgetLabel");
      if (bl) bl.textContent = t("panel.denarii");
      var hints = pr.querySelectorAll(".hint");
      if (hints[0]) hints[0].textContent = t("panel.rosterHint");
      var h3 = pr.querySelector("h3");
      if (h3) h3.textContent = t("panel.picksTitle");
    }
    var bcr = $("btnClearRoster"); if (bcr) bcr.textContent = t("panel.clearRoster");
    var btd = $("btnToDeploy"); if (btd) btd.textContent = t("panel.toGates");
    var btr = $("btnTrainingBout"); if (btr) btr.textContent = t("panel.trainingBout");
    var brs = $("btnRosterStats"); if (brs) brs.textContent = t("panel.rosterStats");

    var pd = $("panelDeploy");
    if (pd) {
      var dh2 = pd.querySelector("h2");
      if (dh2) dh2.textContent = t("panel.deployTitle");
      var dh = pd.querySelector(".hint");
      if (dh) dh.textContent = t("panel.deployHint");
    }
    var btb = $("btnToBattle"); if (btb) btb.textContent = t("panel.enterArena");
    var bbl = $("btnBackLudus"); if (bbl) bbl.textContent = t("panel.backLudus");

    var pbat = $("panelBattle");
    if (pbat) {
      var bh2 = pbat.querySelector("h2");
      if (bh2) bh2.textContent = t("panel.battleTitle");
      var ob = $("objectiveInfo"); if (ob) ob.textContent = t("panel.objectiveDefeatAll");
      var sg = pbat.querySelectorAll(".stat-grid dt");
      var keys = ["statHp", "statAtk", "statDef", "statSpd", "statMove", "statJump"];
      for (var si = 0; si < sg.length && si < keys.length; si++) sg[si].textContent = t("panel." + keys[si]);
    }
    var bm = $("btnMove"); if (bm) { bm.innerHTML = "<kbd>M</kbd> " + t("panel.btnMove"); bm.setAttribute("aria-label", t("panel.btnMove") + " (M)"); }
    var ba = $("btnAttack"); if (ba) { ba.innerHTML = "<kbd>A</kbd> " + t("panel.btnAttack"); ba.setAttribute("aria-label", t("panel.btnAttack") + " (A)"); }
    var bb = $("btnAbility"); if (bb) { bb.innerHTML = "<kbd>B</kbd> " + t("panel.btnAbility"); bb.setAttribute("aria-label", t("panel.btnAbility") + " (B)"); }
    var bw = $("btnWait"); if (bw) { bw.innerHTML = "<kbd>W</kbd> " + t("panel.btnWait"); bw.setAttribute("aria-label", t("panel.btnWait") + " (W)"); }
    var bu = $("btnUndo"); if (bu) { bu.innerHTML = "<kbd>U</kbd> " + t("panel.btnUndo"); bu.setAttribute("aria-label", t("panel.btnUndo") + " (U)"); }
    var ble = $("btnLogExpand"); if (ble) { ble.textContent = t("panel.fullLog"); ble.setAttribute("aria-label", t("panel.fullLog")); }

    var th = $("titleHeading"); if (th) th.textContent = "Geminus Ratio";
    var ts = document.querySelector(".title-panel__sub"); if (ts) ts.textContent = t("title.sub");
    var bcc = $("btnContinueCampaign"); if (bcc) bcc.textContent = t("title.continueCampaign");
    var bnc = $("btnNewCampaign"); if (bnc) bnc.textContent = t("title.newCampaign");
    var bsk = $("btnSkirmish"); if (bsk) bsk.textContent = t("title.skirmish");
    var bsv = $("btnSurvival"); if (bsv) bsv.textContent = t("title.survival");
    var btp = $("btnTrophies"); if (btp) btp.textContent = t("title.trophies");
    var bbe = $("btnBestiary"); if (bbe) bbe.textContent = t("title.bestiary");
    var btu = $("btnTutorial"); if (btu) btu.textContent = t("title.tutorial");
    var bch = $("btnControlsHelp"); if (bch) { bch.textContent = t("title.controls"); bch.setAttribute("aria-label", t("title.controls")); }
    var bset = $("btnSettings"); if (bset) { bset.textContent = t("settings.banner"); bset.setAttribute("aria-label", t("settings.banner")); }
    var bcht = $("btnControlsHelpTitle"); if (bcht) { bcht.textContent = t("title.controls"); bcht.setAttribute("aria-label", t("title.controls")); }

    var sp = $("slotPicker");
    if (sp) {
      var sdt = sp.querySelector(".slot-picker__title");
      var sdp = $("slotDiffPicker");
      if (sdp && !sdp.classList.contains("is-hidden")) { if (sdt) sdt.textContent = t("title.slotTitleNew"); }
      var lab = sp.querySelector("label");
      if (lab && lab.firstChild && lab.firstChild.nodeType === 3) {
        lab.firstChild.textContent = t("title.slotDiff") + " ";
      }
    }
    var bsb = $("btnSlotBack"); if (bsb) bsb.textContent = t("title.slotBack");

    var skh = $("skirmishHeading"); if (skh) skh.textContent = t("skirmish.heading");
    _applySkirmishSelects();

    var sh = $("sceneOverlay"); if (sh) {
      var btn = $("btnSceneNext"); if (btn) btn.textContent = t("scene.continue");
    }
    var ca = $("cutsceneAdvance"); if (ca) ca.setAttribute("aria-label", t("scene.advanceAria"));

    var brc = $("btnResultContinue"); if (brc) brc.textContent = t("result.continue");
    var brr = $("btnResultRetry"); if (brr) brr.textContent = t("result.retry");
    var bng = $("btnNewGamePlus"); if (bng) bng.textContent = t("result.ngPlus");
    var bwr = $("btnWatchReplay"); if (bwr) bwr.textContent = t("result.watchReplay");

    var rh = $("replayHeading"); if (rh) rh.textContent = t("replay.heading");
    var rc = $("btnReplayClose"); if (rc) rc.textContent = t("replay.close");
    var rpc = $("replayCanvas"); if (rpc) rpc.setAttribute("aria-label", t("replay.ariaReplay"));

    var trh = $("trophyHeading"); if (trh) trh.textContent = t("trophy.heading");
    var btbk = $("btnTrophyBack"); if (btbk) btbk.textContent = t("trophy.back");

    var beh = $("bestiaryHeading"); if (beh) beh.textContent = t("bestiary.heading");
    var bbb = $("btnBestiaryBack"); if (bbb) bbb.textContent = t("bestiary.back");

    var suh = $("survivalHeading"); if (suh) suh.textContent = t("survival.heading");
    var bss = $("btnSurvStart"); if (bss) bss.textContent = t("survival.start");
    var bsb2 = $("btnSurvBack"); if (bsb2) bsb2.textContent = t("survival.back");
    var slb = $("survLeaderboard"); if (slb) slb.setAttribute("aria-label", t("survival.leaderboardAria"));

    var ssh = $("survShopHeading"); if (ssh) ssh.textContent = t("survival.betweenWaves");
    var bsn = $("btnSurvShopNext"); if (bsn) bsn.textContent = t("survival.nextWave");

    var ph = $("promoHeading"); if (ph) ph.textContent = t("promo.heading");

    var tll = $("titleLangLabel"); if (tll) tll.textContent = t("title.langLabel");

    _applyAriaAndSkirmishButtons();
    syncLangButtons();
  }

  function _applySkirmishSelects() {
    function $(id) { return document.getElementById(id); }
    var skMap = $("skMapSize");
    if (skMap && skMap.options.length >= 3) {
      skMap.options[0].textContent = t("skirmish.sizeSmall");
      skMap.options[1].textContent = t("skirmish.sizeMedium");
      skMap.options[2].textContent = t("skirmish.sizeLarge");
    }
    var skTer = $("skTerrain");
    if (skTer && skTer.options.length >= 3) {
      skTer.options[0].textContent = t("skirmish.sparse");
      skTer.options[1].textContent = t("skirmish.normal");
      skTer.options[2].textContent = t("skirmish.dense");
    }
    var skTpl = $("skTemplate");
    if (skTpl && skTpl.options.length >= 6) {
      skTpl.options[0].textContent = t("skirmish.random");
      skTpl.options[1].textContent = t("skirmish.tmplPit");
      skTpl.options[2].textContent = t("skirmish.tmplBridge");
      skTpl.options[3].textContent = t("skirmish.tmplTiers");
      skTpl.options[4].textContent = t("skirmish.tmplFlooded");
      skTpl.options[5].textContent = t("skirmish.tmplPillared");
    }
    var skDf = $("skDifficulty");
    var survDf = $("survDifficulty");
    var slotDf = $("slotDiffSelect");
    _fillDiffSelect(skDf);
    _fillDiffSelect(survDf);
    _fillDiffSelect(slotDf);
  }

  function _fillDiffSelect(sel) {
    if (!sel || sel.options.length < 3) return;
    sel.options[0].textContent = t("difficulty.easy");
    sel.options[1].textContent = t("difficulty.normal");
    sel.options[2].textContent = t("difficulty.hard");
  }

  function _applyAriaAndSkirmishButtons() {
    function $(id) { return document.getElementById(id); }
    var main = $("main-content");
    if (main) main.setAttribute("aria-label", t("canvas.stageAria"));
    var prs = $("panelRoster");
    if (prs) {
      prs.setAttribute("aria-label", t("canvas.rosterAria"));
      var cl = $("classList"); if (cl) cl.setAttribute("aria-label", t("canvas.classListAria"));
      var pl = $("pickedList"); if (pl) pl.setAttribute("aria-label", t("canvas.pickedAria"));
      var rsp = $("rosterStatsPanel"); if (rsp) rsp.setAttribute("aria-label", t("canvas.rosterStatsAria"));
    }
    var pde = $("panelDeploy");
    if (pde) {
      pde.setAttribute("aria-label", t("canvas.deployAria"));
      var dq = $("deployQueue"); if (dq) dq.setAttribute("aria-label", t("canvas.deployQueue"));
    }
    var pba = $("panelBattle");
    if (pba) {
      pba.setAttribute("aria-label", t("canvas.battleAria"));
      var uc = $("unitCard"); if (uc) uc.setAttribute("aria-label", t("panel.unitCardAria"));
      var ba = $("battleActions"); if (ba) ba.setAttribute("aria-label", t("canvas.battleActions"));
      var am = $("abilityMenu"); if (am) am.setAttribute("aria-label", t("canvas.abilitiesMenu"));
      var lf = $("logFeed"); if (lf) lf.setAttribute("aria-label", t("canvas.combatLog"));
    }
    var ic = $("isoCanvas"); if (ic) ic.setAttribute("aria-label", t("canvas.arenaAria"));
    var cts = $("ctStrip"); if (cts) cts.setAttribute("aria-label", t("canvas.ctAria"));

    var skFields = document.querySelector(".skirmish-fields");
    if (skFields) {
      var labels = skFields.querySelectorAll("label");
      if (labels[0]) _setLabelText(labels[0], t("skirmish.enemies"));
      if (labels[1]) _setLabelText(labels[1], t("skirmish.budget"));
      if (labels[2]) _setLabelText(labels[2], t("skirmish.mapSize"));
      if (labels[3]) _setLabelText(labels[3], t("skirmish.terrain"));
      if (labels[4]) _setLabelText(labels[4], t("skirmish.mapTemplate"));
      if (labels[5]) _setLabelText(labels[5], t("skirmish.difficulty"));
      if (labels[6]) _setLabelText(labels[6], t("skirmish.seed"));
      var skSeed = $("skSeed"); if (skSeed) skSeed.placeholder = t("skirmish.seedPh");
    }
    var bss = $("btnSkirmishStart"); if (bss) bss.textContent = t("skirmish.start");
    var bskb = $("btnSkirmishBack"); if (bskb) bskb.textContent = t("skirmish.back");

    var survLab = document.querySelector("#survivalSettings .skirmish-fields label");
    if (survLab) _setLabelText(survLab, t("survival.diff"));
    var skDh = $("skDifficultyHelp"); if (skDh) skDh.textContent = t("difficultyHelp." + (($("skDifficulty") && $("skDifficulty").value) || "normal"));
    var svDh = $("survDifficultyHelp"); if (svDh) svDh.textContent = t("difficultyHelp." + (($("survDifficulty") && $("survDifficulty").value) || "normal"));

    var rotL = $("btnRotL"); if (rotL) { rotL.setAttribute("aria-label", t("cam.rotL")); rotL.setAttribute("title", t("cam.rotL")); }
    var zi = $("btnZoomIn"); if (zi) { zi.setAttribute("aria-label", t("cam.zoomIn")); zi.setAttribute("title", t("cam.zoomIn")); }
    var zo = $("btnZoomOut"); if (zo) { zo.setAttribute("aria-label", t("cam.zoomOut")); zo.setAttribute("title", t("cam.zoomOut")); }
    var rotR = $("btnRotR"); if (rotR) { rotR.setAttribute("aria-label", t("cam.rotR")); rotR.setAttribute("title", t("cam.rotR")); }
    var rst = $("btnCamReset"); if (rst) { rst.setAttribute("aria-label", t("cam.reset")); rst.setAttribute("title", t("cam.reset")); }
    var mut = $("btnMute"); if (mut) { mut.setAttribute("aria-label", t("cam.mute")); mut.setAttribute("title", t("cam.mute")); }
    var spd = $("btnSpeed"); if (spd) { spd.setAttribute("aria-label", t("cam.speed")); spd.setAttribute("title", t("cam.speed")); }

    var rps = document.querySelector(".replay-controls");
    if (rps) {
      var bts = rps.querySelectorAll("button");
      if (bts[0]) { bts[0].setAttribute("aria-label", t("replay.goStart")); bts[0].setAttribute("title", t("replay.goStart")); }
      if (bts[1]) { bts[1].setAttribute("aria-label", t("replay.prev")); bts[1].setAttribute("title", t("replay.prev")); }
      if (bts[2]) { bts[2].setAttribute("aria-label", t("replay.next")); bts[2].setAttribute("title", t("replay.next")); }
      if (bts[3]) { bts[3].setAttribute("aria-label", t("replay.goEnd")); bts[3].setAttribute("title", t("replay.goEnd")); }
    }

    var tg = $("trophyGrid"); if (tg) tg.setAttribute("aria-label", t("trophy.listAria"));
    var bg = $("bestiaryGrid"); if (bg) bg.setAttribute("aria-label", t("bestiary.listAria"));
    var pc = $("promoChoices"); if (pc) pc.setAttribute("aria-label", t("promo.optionsAria"));
    var sc = $("sceneChoices"); if (sc) sc.setAttribute("aria-label", t("scene.choices"));
    var cc = $("cutsceneChoices"); if (cc) cc.setAttribute("aria-label", t("scene.choices"));
    var sp2 = $("slotPicker"); if (sp2) sp2.setAttribute("aria-label", t("title.slotTitleNew"));
  }

  function syncLangButtons() {
    var en = document.getElementById("btnLangEn");
    var es = document.getElementById("btnLangEs");
    if (!en || !es) return;
    en.classList.toggle("is-current-lang", _locale === "en");
    es.classList.toggle("is-current-lang", _locale === "es");
  }

  function _setLabelText(label, text) {
    var sel = label.querySelector("select");
    var inp = label.querySelector("input");
    if (sel) {
      label.childNodes[0].textContent = text + " ";
    } else if (inp) {
      var tn = label.childNodes[0];
      if (tn && tn.nodeType === 3) tn.textContent = text + " ";
      else label.insertBefore(document.createTextNode(text + " "), inp);
    } else {
      label.textContent = text;
    }
  }

  return {
    getLocale: getLocale,
    setLocale: setLocale,
    t: t,
    missionTitle: missionTitle,
    actLabel: actLabel,
    difficultyLabel: difficultyLabel,
    aiProfileLabel: aiProfileLabel,
    mergeEsAbilities: mergeEsAbilities,
    abilityName: abilityName,
    abilityDesc: abilityDesc,
    abilityTipExtras: abilityTipExtras,
    localizeClassDef: localizeClassDef,
    localizeMissionSteps: localizeMissionSteps,
    localizeChoices: localizeChoices,
    applyMeta: applyMeta,
    applyStaticLabels: applyStaticLabels,
    syncLangButtons: syncLangButtons,
    refreshSkirmishLabels: function () {
      _applySkirmishSelects();
      var skh = document.getElementById("skirmishHeading");
      if (skh) skh.textContent = t("skirmish.heading");
    },
  };
})();
