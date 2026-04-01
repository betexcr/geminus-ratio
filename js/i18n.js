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
      },
      title: {
        sub: "Ludus Tactics", continueCampaign: "Continue Campaign", newCampaign: "New Campaign", skirmish: "Skirmish", survival: "Survival Arena",
        trophies: "Trophies", bestiary: "Bestiary", tutorial: "Tutorial", slotTitleNew: "Pick a Slot for New Campaign", slotTitleCont: "Continue Campaign",
        slotDiff: "Difficulty", slotBack: "Back", langLabel: "Language",
        slotWord: "Slot", slotEmpty: "Empty", fightersFmt: "{n} fighters · {date}", overwriteConfirm: "Overwrite Slot {n}?",
        slotExportEmpty: "Slot {n} is empty.", exportSave: "Export save", importSave: "Import to slot {n}",
        exportAria: "Export slot {n}", importAria: "Import to slot {n}",
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
      trophy: { heading: "Trophies", back: "Back", listAria: "Trophy list" },
      bestiary: { heading: "Bestiary", back: "Back", listAria: "Class list" },
      survival: { heading: "Survival Arena", diff: "Difficulty", start: "Start", back: "Back", betweenWaves: "Between Waves", nextWave: "Next Wave" },
      promo: { heading: "Promotion", optionsAria: "Promotion options" },
      canvas: { arenaAria: "Isometric battle grid — use Q/E to rotate, scroll to zoom", ctAria: "Upcoming turns", rosterAria: "Roster management", deployAria: "Deployment", battleAria: "Battle", battleActions: "Battle actions", abilitiesMenu: "Abilities", combatLog: "Combat log", deployQueue: "Deployment queue", pickedAria: "Selected fighters", classListAria: "Available fighter classes", rosterStatsAria: "Roster statistics", stageAria: "Arena view", camAria: "Camera controls" },
      cam: { rotL: "Rotate left (Q)", zoomIn: "Zoom in (+)", zoomOut: "Zoom out (-)", rotR: "Rotate right (E)", reset: "Reset camera (R)", mute: "Toggle mute (F2)", speed: "Animation speed (F3)" },
      hud: { diffBracket: "[{label}]" },
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
      },
      title: {
        sub: "Tácticas de ludus", continueCampaign: "Continuar campaña", newCampaign: "Nueva campaña", skirmish: "Combate libre", survival: "Arena de supervivencia",
        trophies: "Trofeos", bestiary: "Bestiario", tutorial: "Tutorial", slotTitleNew: "Elige ranura para nueva campaña", slotTitleCont: "Continuar campaña",
        slotDiff: "Dificultad", slotBack: "Atrás", langLabel: "Idioma",
        slotWord: "Ranura", slotEmpty: "Vacío", fightersFmt: "{n} luchadores · {date}", overwriteConfirm: "¿Sobrescribir la ranura {n}?",
        slotExportEmpty: "La ranura {n} está vacía.", exportSave: "Exportar partida", importSave: "Importar a la ranura {n}",
        exportAria: "Exportar ranura {n}", importAria: "Importar a la ranura {n}",
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
      trophy: { heading: "Trofeos", back: "Atrás", listAria: "Lista de trofeos" },
      bestiary: { heading: "Bestiario", back: "Atrás", listAria: "Lista de clases" },
      survival: { heading: "Arena de supervivencia", diff: "Dificultad", start: "Empezar", back: "Atrás", betweenWaves: "Entre oleadas", nextWave: "Siguiente oleada" },
      promo: { heading: "Ascenso", optionsAria: "Opciones de ascenso" },
      canvas: { arenaAria: "Cuadrícula isométrica — Q/E para girar, rueda para zoom", ctAria: "Próximos turnos", rosterAria: "Gestión de plantilla", deployAria: "Despliegue", battleAria: "Combate", battleActions: "Acciones de combate", abilitiesMenu: "Habilidades", combatLog: "Registro de combate", deployQueue: "Cola de despliegue", pickedAria: "Luchadores elegidos", classListAria: "Clases disponibles", rosterStatsAria: "Estadísticas de plantilla", stageAria: "Vista de arena", camAria: "Cámara" },
      cam: { rotL: "Girar izquierda (Q)", zoomIn: "Acercar (+)", zoomOut: "Alejar (-)", rotR: "Girar derecha (E)", reset: "Restablecer cámara (R)", mute: "Silenciar (F2)", speed: "Velocidad de animación (F3)" },
      hud: { diffBracket: "[{label}]" },
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
      var uc = $("unitCard"); if (uc) uc.setAttribute("aria-label", t("panel.statHp") + "…");
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
