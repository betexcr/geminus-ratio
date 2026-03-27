/**
 * Geminus Ratio — Campaign Data & State
 * Defines all 13 missions, persistent campaign state, and helper functions.
 * Loaded before game.js — exposes globals: CAMPAIGN_MISSIONS, campaignState, Campaign
 */

/* eslint-disable no-unused-vars */

var CAMPAIGN_MISSIONS = [

  // ─── ACT I: THE TOURNAMENT ────────────────────────────────────────

  {
    id: 1,
    title: "The Summons",
    act: 1,
    ritualMeter: 5,
    budget: 100,
    enemyLevel: 1,
    unlockedClasses: ["murmillo", "retiarius", "samnite", "thraex"],
    enemies: [
      { classId: "samnite" },
      { classId: "murmillo" },
      { classId: "thraex" },
    ],
    terrain: [
      { x: 4, y: 3, type: "building" },
      { x: 7, y: 5, type: "building" },
    ],
    mapModifiers: [],
    winCondition: "defeat_all",
    victoryBonus: 15,
    perfectBonus: 5,
    flagsToSet: ["campaign_started"],
    freeRecruits: [],
    skipLudus: false,
    carryHp: false,
    preScene: [
      { speaker: null, text: "The Ludi Aeternales have been announced. Every ludus in the empire is summoned to the Colosseum." },
      { speaker: "CASSIUS", text: "The debts are piling up. Publius's ludus barely fills a practice yard. But the prize money...", style: "internal" },
      { speaker: null, text: "A messenger arrives with a rumor: a gladiator matching Titus's description has been seen in the qualifying rounds. A twin, fighting under no lanista's name." },
      { speaker: "CASSIUS", text: "Fifteen years. I'd given up hoping. I haven't stopped looking.", style: "internal" },
    ],
    postScene: [
      { speaker: null, text: "The crowd is indifferent — a qualifying bout, nothing special. But Cassius is in." },
      { speaker: "CASSIUS", text: "The Colosseum. I never thought I'd stand here.", style: "internal" },
      { speaker: null, text: "A glimpse across the hypogeum corridor: a tall fighter is led past by two arena officials. His face is turned away. Cassius calls out. The officials walk faster." },
    ],
    choices: [],
  },

  {
    id: 2,
    title: "First Blood",
    act: 1,
    ritualMeter: 12,
    budget: 110,
    enemyLevel: 1,
    unlockedClasses: ["murmillo", "retiarius", "samnite", "thraex"],
    enemies: [
      { classId: "provocator" },
      { classId: "samnite" },
      { classId: "samnite" },
      { classId: "provocator" },
    ],
    terrain: [
      { x: 3, y: 3, type: "building" },
      { x: 8, y: 3, type: "building" },
      { x: 5, y: 6, type: "building" },
    ],
    mapModifiers: [],
    winCondition: "defeat_all",
    victoryBonus: 15,
    perfectBonus: 5,
    flagsToSet: ["lurco_defeated_1"],
    freeRecruits: [],
    skipLudus: false,
    carryHp: false,
    preScene: [
      { speaker: null, text: "The Colosseum proper. Fifty thousand voices. The air tastes of sand and iron." },
      { speaker: "LURCO", text: "Publius's boy. I heard the old man died in debt. Fitting you'd come here to do the same." },
      { speaker: "CASSIUS", text: "We'll see who the sand remembers." },
      { speaker: "LURCO", text: "My fighters don't lose to strays." },
    ],
    postScene: [
      { speaker: null, text: "The crowd stirs. A small ludus beating Lurco's funded brutes — that's a story." },
      { speaker: "LURCO", text: "You have no idea whose games these are, boy." },
      { speaker: null, text: "That night, Cassius hears his gladiators talking. Strange dreams. A dark room. Breathing that isn't theirs." },
    ],
    choices: [],
  },

  {
    id: 3,
    title: "The Conspirator",
    act: 1,
    ritualMeter: 20,
    budget: 120,
    enemyLevel: 2,
    unlockedClasses: ["murmillo", "retiarius", "samnite", "thraex", "secutor", "hoplomachus", "sagittarius", "essedarius"],
    enemies: [
      { classId: "secutor" },
      { classId: "thraex" },
      { classId: "murmillo" },
      { classId: "retiarius" },
    ],
    terrain: [
      { x: 3, y: 4, type: "building" },
      { x: 8, y: 4, type: "building" },
      { x: 5, y: 5, type: "water_shallow" },
    ],
    mapModifiers: [],
    winCondition: "defeat_all",
    victoryBonus: 15,
    perfectBonus: 5,
    flagsToSet: [],
    freeRecruits: [{ name: "Nerva", classId: "retiarius" }],
    skipLudus: false,
    carryHp: false,
    preScene: [
      { speaker: null, text: "A woman in a senator's stola finds Cassius in the ludus quarter after hours." },
      { speaker: "LIVIA", text: "You beat Lurco. That's not easy. It's also not supposed to happen." },
      { speaker: "LIVIA", text: "The brackets aren't random. Certain lanistae always advance. Senators who oppose the Emperor have had their gladiators entered — and killed." },
      { speaker: "LIVIA", text: "I need eyes inside the tournament. Someone the Editor hasn't already bought." },
    ],
    postScene: [
      { speaker: "NERVA", text: "Not bad for a first outing. I've had worse lanistae. Most of them are dead, but still.", condition: "nerva_alive" },
      { speaker: null, text: "The dead gladiator from the opposing side is carried out through the hypogeum. As the stretcher passes, the body's hand twitches. A spasm. Probably a spasm." },
    ],
    choices: [
      {
        id: "livia_offer",
        prompt: "Livia awaits your answer.",
        options: [
          { label: "\"I'm listening.\"", flag: "livia_allied_early" },
          { label: "\"I'm here for my brother, not your politics.\"", flag: null },
        ],
      },
    ],
  },

  {
    id: 4,
    title: "The Rigged Bout",
    act: 1,
    ritualMeter: 30,
    budget: 120,
    enemyLevel: 2,
    unlockedClasses: ["murmillo", "retiarius", "samnite", "thraex", "secutor", "hoplomachus", "sagittarius", "essedarius"],
    enemies: [
      { classId: "murmillo" },
      { classId: "provocator" },
      { classId: "samnite" },
      { classId: "secutor" },
      { classId: "thraex" },
    ],
    terrain: [
      { x: 3, y: 2, type: "building" },
      { x: 8, y: 2, type: "building" },
      { x: 3, y: 6, type: "building" },
      { x: 8, y: 6, type: "building" },
    ],
    mapModifiers: [],
    winCondition: "defeat_all",
    victoryBonus: 15,
    perfectBonus: 5,
    flagsToSet: ["rigged_bout_witnessed"],
    freeRecruits: [],
    skipLudus: false,
    carryHp: false,
    preScene: [
      { speaker: null, text: "Before Cassius's match, he watches another bout from the holding area." },
      { speaker: null, text: "A gladiator named Corvinus — strong, experienced, favored to win — enters against an unremarkable opponent. He fights brilliantly for two rounds, then drops his guard. He dies on the sand." },
      { speaker: "CASSIUS", text: "He threw that fight. I've seen enough bouts to know. But why?", style: "internal" },
      { speaker: null, text: "After the match, Corvinus's lanista — Fabius — is found dead in his cell. Officials say heart failure." },
      { speaker: "LIVIA", text: "Fabius was asking questions about the brackets. Now he's dead. Be careful.", condition: "livia_allied_early" },
    ],
    postScene: [
      { speaker: null, text: "Victory. But Cassius is shaken. Fabius is dead. The brackets are rigged. And somewhere in this tournament, his brother is fighting." },
      { speaker: null, text: "Scaeva appears in the corridor. He says nothing. He looks at Cassius for a long moment, then walks away." },
      { speaker: "LIVIA", text: "Tomorrow's matches include a fighter from the Editor's personal stable. I've never seen one fight before. Have you?", condition: "livia_allied_early" },
    ],
    choices: [],
  },

  {
    id: 5,
    title: "The Ghost in the Sand",
    act: 1,
    ritualMeter: 40,
    budget: 130,
    enemyLevel: 2,
    unlockedClasses: ["murmillo", "retiarius", "samnite", "thraex", "secutor", "hoplomachus", "provocator", "dimachaerus", "sagittarius", "essedarius"],
    enemies: [
      { classId: "thraex" },
      { classId: "dimachaerus" },
      { classId: "thraex" },
      { classId: "dimachaerus" },
      { classId: "secutor" },
    ],
    terrain: [
      { x: 4, y: 4, type: "building" },
      { x: 7, y: 4, type: "building" },
    ],
    mapModifiers: [],
    winCondition: "defeat_all",
    victoryBonus: 15,
    perfectBonus: 5,
    flagsToSet: ["titus_glimpsed"],
    freeRecruits: [],
    skipLudus: false,
    carryHp: false,
    preScene: [
      { speaker: null, text: "Before Cassius's match, another bout is staged. The crowd is electric — the Editor's champion is fighting." },
      { speaker: null, text: "Titus enters the arena. Cassius recognizes him instantly — the jawline, the stance, the way he holds his shoulders. But everything else is wrong." },
      { speaker: null, text: "Titus fights a team of four gladiators. He dismantles them in minutes. He moves like something that learned to move by watching humans and decided it could do better. The crowd screams. Titus's face shows nothing." },
      { speaker: null, text: "Arena officials in dark tunics block Cassius's path to the hypogeum entrance." },
      { speaker: "OFFICIAL", text: "The Editor's fighters are in seclusion between bouts. No visitors." },
      { speaker: "CASSIUS", text: "That's my brother." },
      { speaker: "OFFICIAL", text: "I don't know what you mean." },
      { speaker: "LIVIA", text: "You saw him. You see why I need you.", condition: "!livia_allied_early" },
    ],
    postScene: [
      { speaker: "VALERIA", text: "Good fight. Your old man taught you well." },
      { speaker: "CASSIUS", text: "You knew Publius?" },
      { speaker: "VALERIA", text: "My husband did. Before..." },
      { speaker: null, text: "That night, Cassius dreams of the dark room. The stone floor. The breathing. He wakes with the taste of iron in his mouth." },
    ],
    choices: [
      {
        id: "livia_twin",
        prompt: "Livia is watching. She noticed your reaction to the Editor's champion.",
        options: [
          { label: "Tell Livia about Titus.", flag: "livia_knows_twin" },
          { label: "Keep Titus secret.", flag: null },
        ],
      },
    ],
  },

  // ─── ACT II: THE DESCENT ──────────────────────────────────────────

  {
    id: 6,
    title: "Into the Dark",
    act: 2,
    ritualMeter: 50,
    budget: 130,
    enemyLevel: 3,
    unlockedClasses: ["murmillo", "retiarius", "samnite", "thraex", "secutor", "hoplomachus", "provocator", "dimachaerus", "sagittarius", "essedarius"],
    enemies: [
      { classId: "secutor" },
      { classId: "murmillo" },
      { classId: "thraex" },
      { classId: "samnite" },
      { classId: "dimachaerus", gifted: true, name: "Ferox" },
    ],
    terrain: [
      { x: 2, y: 2, type: "building" },
      { x: 9, y: 2, type: "building" },
      { x: 2, y: 6, type: "building" },
      { x: 9, y: 6, type: "building" },
      { x: 5, y: 4, type: "building" },
      { x: 4, y: 7, type: "water_shallow" },
      { x: 7, y: 7, type: "water_shallow" },
      { x: 5, y: 7, type: "water_shallow" },
    ],
    mapModifiers: ["cursed_3"],
    winCondition: "defeat_all",
    victoryBonus: 15,
    perfectBonus: 5,
    flagsToSet: ["gifted_encountered"],
    freeRecruits: [],
    skipLudus: false,
    carryHp: false,
    preScene: [
      { speaker: null, text: "Cassius descends into the hypogeum after hours, following the corridor Titus was led through." },
      { speaker: null, text: "The brick gives way to older stone. The air changes — colder, wetter, wrong. Torches on the walls flicker in unison, a slow pulse like breathing." },
      { speaker: null, text: "In a chamber below, Ferox sits motionless on a stone bench. His eyes are open but unfocused." },
      { speaker: "FEROX", text: "You should not be here. The Editor does not allow visitors." },
      { speaker: "CASSIUS", text: "What did they do to you?" },
      { speaker: "FEROX", text: "They made me better." },
      { speaker: null, text: "Arena officials discover Cassius. He is escorted out. His next match has been \"moved up.\" This is a warning." },
    ],
    postScene: [
      { speaker: null, text: "Ferox, when defeated, does not collapse like normal gladiators. He kneels, slowly, and his eyes focus for the first time." },
      { speaker: "FEROX", text: "...I remember mornings." },
      { speaker: null, text: "The crowd is silent for three heartbeats. Then they cheer. They don't know why they were silent." },
      { speaker: "NERVA", text: "That fighter... he wasn't right. His eyes. Did you see his eyes?", condition: "nerva_alive" },
    ],
    choices: [],
  },

  {
    id: 7,
    title: "The Old Wolf",
    act: 2,
    ritualMeter: 58,
    budget: 140,
    enemyLevel: 3,
    unlockedClasses: ["murmillo", "retiarius", "samnite", "thraex", "secutor", "hoplomachus", "provocator", "dimachaerus", "sagittarius", "essedarius"],
    enemies: [
      { classId: "provocator", atkBonus: 1 },
      { classId: "provocator", atkBonus: 1 },
      { classId: "samnite", atkBonus: 1 },
      { classId: "samnite", atkBonus: 1 },
      { classId: "murmillo", atkBonus: 1 },
    ],
    terrain: [
      { x: 3, y: 3, type: "building" },
      { x: 8, y: 3, type: "building" },
      { x: 5, y: 5, type: "building" },
    ],
    mapModifiers: ["cursed_4", "crowd_surge_5"],
    winCondition: "defeat_all",
    victoryBonus: 15,
    perfectBonus: 5,
    flagsToSet: ["lurco_defeated_2"],
    freeRecruits: [],
    skipLudus: false,
    carryHp: false,
    preScene: [
      { speaker: null, text: "Scaeva corners Cassius in the ludus quarter." },
      { speaker: "SCAEVA", text: "I've been doing this for thirty years. I've seen lanistae poke around the lower levels. Ask questions. I've seen what happens to them." },
      { speaker: "CASSIUS", text: "What happens?" },
      { speaker: "SCAEVA", text: "They stop asking. One way or another." },
      { speaker: "SCAEVA", text: "Your father was a man who asked questions too. I knew Gaius Geminus. I know what he died for." },
      { speaker: "SCAEVA", text: "What's down there is bigger than one man's courage." },
    ],
    postScene: [
      { speaker: "LURCO", text: "The Emperor will hear of this!" },
      { speaker: null, text: "He's right. The Emperor does hear. And the Emperor is not displeased — Lurco was always expendable." },
      { speaker: "SCAEVA", text: "Aemilia. She's one of mine. Sharp eyes, sharper spear. She'll watch your back.", condition: "scaeva_allied" },
      { speaker: "AEMILIA", text: "I've seen those fighters. The empty ones. Something feeds them. I can feel it in the sand.", condition: "scaeva_allied" },
    ],
    choices: [
      {
        id: "scaeva_help",
        prompt: "Scaeva has shown his hand. He knows more than he says.",
        options: [
          { label: "\"Then help me.\"", flag: "scaeva_allied" },
          { label: "\"I understand the warning.\"", flag: null },
        ],
      },
    ],
  },

  {
    id: 8,
    title: "Valeria's Reckoning",
    act: 2,
    ritualMeter: 65,
    budget: 140,
    enemyLevel: 3,
    unlockedClasses: ["murmillo", "retiarius", "samnite", "thraex", "secutor", "hoplomachus", "provocator", "dimachaerus", "sagittarius", "essedarius", "umbra"],
    enemies: [
      { classId: "secutor", gifted: true },
      { classId: "murmillo" },
      { classId: "thraex" },
      { classId: "samnite" },
      { classId: "retiarius" },
      { classId: "provocator" },
    ],
    terrain: [
      { x: 3, y: 3, type: "building" },
      { x: 8, y: 5, type: "building" },
      { x: 5, y: 2, type: "building" },
      { x: 5, y: 6, type: "water_deep" },
      { x: 6, y: 6, type: "water_deep" },
    ],
    mapModifiers: ["cursed_5"],
    winCondition: "defeat_all",
    victoryBonus: 15,
    perfectBonus: 5,
    flagsToSet: [],
    freeRecruits: [],
    skipLudus: false,
    carryHp: false,
    preScene: [
      { speaker: null, text: "Cassius has found maintenance logs in the hypogeum referencing \"Corvus, M.\" — Valeria's husband. The logs describe a \"containment incident\" in the lower levels." },
      { speaker: null, text: "Marcus Corvus found something he shouldn't have. The \"malfunction\" that killed him was no accident." },
    ],
    postScene: [
      { speaker: "VALERIA", text: "Marcus died trying to stop this. I won't let that be for nothing.", condition: "valeria_allied" },
      { speaker: null, text: "Cassius hears that Valeria Corvus's ludus suffered a fire overnight. No survivors among the gladiators. Valeria herself has vanished.", condition: "valeria_unwarned" },
      { speaker: null, text: "That night, Cassius dreams again. The dark room. But this time he sees the stone — black, polished, with symbols carved deep. At the edge of the room, a figure turns toward him. It has his face." },
    ],
    choices: [
      {
        id: "valeria_truth",
        prompt: "You know the truth about Valeria's husband. What do you do?",
        options: [
          { label: "Tell Valeria the truth.", flag: "valeria_allied" },
          { label: "Keep her in the dark.", flag: "valeria_unwarned" },
        ],
      },
    ],
  },

  {
    id: 9,
    title: "The Temple",
    act: 2,
    ritualMeter: 75,
    budget: 150,
    enemyLevel: 4,
    unlockedClasses: ["murmillo", "retiarius", "samnite", "thraex", "secutor", "hoplomachus", "provocator", "dimachaerus", "sagittarius", "essedarius", "umbra"],
    enemies: [
      { classId: "murmillo", gifted: true },
      { classId: "retiarius", gifted: true },
      { classId: "provocator" },
      { classId: "secutor" },
      { classId: "hoplomachus" },
    ],
    terrain: [
      { x: 3, y: 2, type: "building" },
      { x: 8, y: 2, type: "building" },
      { x: 3, y: 6, type: "building" },
      { x: 8, y: 6, type: "building" },
      { x: 5, y: 4, type: "water_deep" },
      { x: 6, y: 4, type: "water_deep" },
      { x: 5, y: 5, type: "water_deep" },
      { x: 6, y: 5, type: "water_deep" },
    ],
    mapModifiers: ["cursed_6", "ritual_pulse_4"],
    winCondition: "defeat_all",
    victoryBonus: 20,
    perfectBonus: 5,
    flagsToSet: ["temple_visited", "emperor_refused"],
    freeRecruits: [],
    skipLudus: false,
    carryHp: false,
    preScene: [
      { speaker: null, text: "Cassius descends to the lowest level. Past the old stone. Past the carvings. Into the temple." },
      { speaker: null, text: "The chamber is circular. The floor is black stone, smooth as glass. In the center, a basin of dark liquid — the black water. On the far wall, scratched with broken fingernails: T-I-T-V-S." },
      { speaker: "CASSIUS", text: "He was here. He tried to remember his own name. And they took even that.", style: "internal" },
      { speaker: null, text: "The temperature drops. The black water ripples without being touched. Something vast and patient becomes aware of Cassius." },
      { speaker: null, text: "He flees. The corridors rearrange behind him. He emerges twenty minutes later — but only five have passed above." },
      { speaker: null, text: "Praetorian guards escort Cassius to the Imperial Box." },
      { speaker: "NERO", text: "You've been to the temple. I can smell it on you. The stone has a scent — something between iron and rain." },
      { speaker: "NERO", text: "I am dying. The ritual can save me. The cost is your blood and your brother's." },
      { speaker: "NERO", text: "Come willingly. Be remembered as heroes of Rome. Your names carved in the Colosseum itself." },
      { speaker: "CASSIUS", text: "And if I refuse?" },
      { speaker: "NERO", text: "Then you die as a traitor, and I take your blood anyway." },
      { speaker: null, text: "Cassius refuses. The Emperor nods, unsurprised." },
      { speaker: "NERO", text: "Then we do it the hard way. Your next matches will be... interesting." },
    ],
    postScene: [
      { speaker: null, text: "The crowd is different now. Their cheering has a rhythm — pulsing, synchronized. Some sway in their seats." },
      { speaker: "LIVIA", text: "My father is preparing to address the Senate. We can expose the political conspiracy — the rigged bouts, the murders.", condition: "livia_allied" },
      { speaker: "CASSIUS", text: "It won't be enough. Politics can't stop what's under the arena. But it might buy time.", style: "internal" },
    ],
    choices: [],
  },

  // ─── ACT III: THE RATIO ───────────────────────────────────────────

  {
    id: 10,
    title: "The Gauntlet",
    act: 3,
    ritualMeter: 83,
    budget: 150,
    enemyLevel: 4,
    unlockedClasses: ["murmillo", "retiarius", "samnite", "thraex", "secutor", "hoplomachus", "provocator", "dimachaerus", "sagittarius", "essedarius", "umbra", "vestige"],
    enemies: [
      { classId: "thraex", gifted: true },
      { classId: "samnite", gifted: true },
      { classId: "hoplomachus", gifted: true },
      { classId: "murmillo" },
      { classId: "secutor" },
      { classId: "retiarius" },
    ],
    terrain: [
      { x: 2, y: 3, type: "building" },
      { x: 5, y: 2, type: "building" },
      { x: 9, y: 3, type: "building" },
      { x: 4, y: 6, type: "building" },
      { x: 7, y: 6, type: "building" },
      { x: 3, y: 5, type: "water_shallow" },
      { x: 8, y: 5, type: "water_shallow" },
    ],
    mapModifiers: ["cursed_8", "ritual_pulse_3", "crowd_madness"],
    winCondition: "defeat_all",
    victoryBonus: 15,
    perfectBonus: 5,
    flagsToSet: ["gauntlet_begun"],
    freeRecruits: [],
    skipLudus: false,
    carryHp: false,
    preScene: [
      { speaker: null, text: "The brackets have been rewritten overnight. Cassius's ludus faces the Cult's strongest stable. The Editor is no longer pretending." },
      { speaker: null, text: "Varro Umbra appears for the first time in person." },
      { speaker: "VARRO", text: "You visited the temple. You heard the voice. You know what waits below." },
      { speaker: "CASSIUS", text: "I know what you've done to my brother." },
      { speaker: "VARRO", text: "I made him sacred. When the rite completes, his name will outlast Rome. Yours too." },
      { speaker: "VARRO", text: "The sand is hungry tonight." },
    ],
    postScene: [
      { speaker: null, text: "The arena is a wreck. Sand stained dark. The crowd screams with a harmonic quality — like a choir that doesn't know it's singing." },
      { speaker: "NERVA", text: "I felt something during the fight. When I stood on that dark sand — something was looking up at me through the ground. Cassius... what are we fighting in?", condition: "nerva_alive" },
      { speaker: "AEMILIA", text: "The Gifted — their movements aren't from training. Something else is moving their bodies. The same something that's under the sand.", condition: "aemilia_alive" },
      { speaker: null, text: "Two more matches. Then the final bout." },
    ],
    choices: [],
  },

  {
    id: 11,
    title: "Alliance and Sacrifice",
    act: 3,
    ritualMeter: 90,
    budget: 160,
    enemyLevel: 5,
    unlockedClasses: ["murmillo", "retiarius", "samnite", "thraex", "secutor", "hoplomachus", "provocator", "dimachaerus", "sagittarius", "essedarius", "umbra", "vestige"],
    enemies: [
      { classId: "dimachaerus", gifted: true },
      { classId: "provocator", gifted: true },
      { classId: "secutor", gifted: true },
      { classId: "murmillo", gifted: true },
      { classId: "thraex" },
      { classId: "retiarius" },
    ],
    terrain: [
      { x: 3, y: 3, type: "building" },
      { x: 8, y: 3, type: "building" },
      { x: 5, y: 5, type: "building" },
      { x: 4, y: 7, type: "water_deep" },
      { x: 5, y: 7, type: "water_deep" },
    ],
    mapModifiers: ["cursed_10", "ritual_pulse_2", "crowd_madness"],
    winCondition: "defeat_all",
    victoryBonus: 15,
    perfectBonus: 5,
    flagsToSet: ["penultimate_complete"],
    freeRecruits: [],
    allianceRecruits: [
      { flag: "livia_allied", name: "Livia's Agent", classId: "secutor" },
      { flag: "scaeva_allied", name: "Scaeva's Veteran", classId: "murmillo" },
      { flag: "valeria_allied", name: "Ferox", classId: "dimachaerus", gifted: true },
    ],
    skipLudus: false,
    carryHp: false,
    preScene: [
      { speaker: null, text: "Cassius gathers his allies." },
      { speaker: "LIVIA", text: "My father speaks to the Senate tomorrow. Once the conspiracy is public, the Emperor loses his political shield. But the ritual... that's on you.", condition: "livia_allied" },
      { speaker: "SCAEVA", text: "I'll send what fighters I can spare. They're old, like me. But they know their craft.", condition: "scaeva_allied" },
      { speaker: "VALERIA", text: "My husband died in that place. I'm sending my best. Make it count.", condition: "valeria_allied" },
    ],
    postScene: [
      { speaker: null, text: "The arena is quiet. Not silent — quiet in the way a held breath is quiet. Fifty thousand people, staring at the sand, waiting." },
      { speaker: "VARRO", text: "One match remains. The ratio must balance. Brother will face brother, as it was always meant to be." },
      { speaker: "CASSIUS", text: "Tomorrow. Titus. The arena. The thing beneath. I don't know if I can save him. I don't know if there's anything left to save. But I have to try.", style: "internal" },
      { speaker: "NERVA", text: "Whatever happens in there tomorrow — we're with you. All of us. To the sand and beyond.", condition: "nerva_alive" },
    ],
    choices: [],
  },

  {
    id: 12,
    title: "The Unmasking",
    act: 3,
    ritualMeter: 95,
    budget: 160,
    enemyLevel: 5,
    unlockedClasses: ["murmillo", "retiarius", "samnite", "thraex", "secutor", "hoplomachus", "provocator", "dimachaerus", "sagittarius", "essedarius", "umbra", "vestige"],
    enemies: [
      { classId: "thraex", gifted: true },
      { classId: "retiarius", gifted: true },
      { classId: "hoplomachus", gifted: true },
      { classId: "samnite" },
    ],
    terrain: [
      { x: 3, y: 2, type: "building" },
      { x: 8, y: 2, type: "building" },
      { x: 5, y: 5, type: "building" },
      { x: 7, y: 5, type: "building" },
      { x: 4, y: 4, type: "water_deep" },
      { x: 5, y: 4, type: "water_deep" },
      { x: 6, y: 4, type: "water_deep" },
    ],
    mapModifiers: ["cursed_12", "ritual_pulse_1", "crowd_madness_2"],
    winCondition: "defeat_all",
    victoryBonus: 0,
    perfectBonus: 0,
    flagsToSet: [],
    freeRecruits: [],
    skipLudus: false,
    carryHp: true,
    preScene: [
      { speaker: null, text: "Senator Pulcher speaks to the Senate. Livia's network has distributed evidence — rigged brackets, murdered lanistae, political purges. The Senate erupts." },
      { speaker: null, text: "But in the Colosseum, nothing changes. The crowd cannot leave. They do not want to leave. The ritual holds them." },
      { speaker: null, text: "Nero Aurelius appears in the Imperial Box, visibly decaying. He is a dying man watching his last gamble play out." },
      { speaker: "NERO", text: "One final bout! The culmination of the Ludi Aeternales!" },
      { speaker: "VARRO", text: "You cannot prevent this. The energy is gathered. The threshold is reached. All that remains is the spark. You and your brother. In the sand. Together." },
    ],
    postScene: [
      { speaker: null, text: "The arena floor is cracked. Through the gaps, a faint glow pulses from below — the temple, directly beneath." },
      { speaker: null, text: "The gate at the far end opens. Titus walks out. Alone." },
      { speaker: null, text: "He is larger than Cassius remembers. His skin has a faint grey cast. His eyes are the color of polished obsidian. He carries two swords." },
      { speaker: null, text: "Titus stops in the center. Looks at Cassius. For one half-second — a flicker. Recognition. Then it's gone." },
      { speaker: "VARRO", text: "Begin." },
    ],
    choices: [],
  },

  {
    id: 13,
    title: "Geminus Ratio",
    act: 3,
    ritualMeter: 99,
    budget: 0,
    enemyLevel: 6,
    unlockedClasses: [],
    enemies: [
      { classId: "dimachaerus", gifted: true, name: "Titus", boss: true },
      { classId: "thraex", gifted: true },
      { classId: "secutor", gifted: true },
    ],
    terrain: [
      { x: 2, y: 2, type: "building" },
      { x: 9, y: 2, type: "building" },
      { x: 2, y: 6, type: "building" },
      { x: 9, y: 6, type: "building" },
      { x: 5, y: 1, type: "building" },
      { x: 6, y: 1, type: "building" },
      { x: 5, y: 4, type: "water_deep" },
      { x: 6, y: 4, type: "water_deep" },
      { x: 5, y: 5, type: "water_deep" },
      { x: 6, y: 5, type: "water_deep" },
    ],
    mapModifiers: ["full_curse", "ritual_pulse_1", "collapsing"],
    winCondition: "defeat_all",
    victoryBonus: 0,
    perfectBonus: 0,
    flagsToSet: [],
    freeRecruits: [],
    skipLudus: true,
    carryHp: true,
    preScene: [
      { speaker: null, text: "No preparation. No rest. The arena has changed — the floor is fractured, glyphs pulse across every tile, and the hypogeum is visible through cracks in the sand." },
      { speaker: null, text: "Titus stands in the center. The Gifted honor guard flanks him. The crowd's chanting is continuous, involuntary." },
      { speaker: "CASSIUS", text: "Titus. If any part of you is still in there — I'm here. I came for you.", style: "internal" },
    ],
    postScene: [],
    endingScenes: {
      a: [
        { speaker: null, text: "Titus's eyes clear. For one moment he speaks." },
        { speaker: "TITUS", text: "...Cassius?" },
        { speaker: null, text: "The ritual energy discharges through the temple below. The arena shakes. The cursed tiles go dark. The crowd falls truly silent for the first time." },
        { speaker: null, text: "The temple collapses. The Colosseum cracks but stands. The Emperor exhales once and does not inhale again." },
        { speaker: "TITUS", text: "I remember the room. The water. The voice. I remember forgetting you." },
        { speaker: "TITUS", text: "I remember you finding me." },
      ],
      b: [
        { speaker: null, text: "Titus falls. The ritual energy, unchanneled, begins to rupture outward." },
        { speaker: "LIVIA", text: "The energy — it's going to tear the Colosseum apart. Thousands of people —" },
        { speaker: null, text: "Cassius descends through the cracked arena floor into the temple. He places his hands on the ritual stone." },
        { speaker: null, text: "He channels the energy through himself, burning the ritual out from within. The temple collapses. The glow dies." },
        { speaker: null, text: "Titus wakes in the arena, restored. Below, the temple is rubble. Cassius is in the rubble." },
        { speaker: "TITUS", text: "You found me. I couldn't find you in time." },
      ],
      c: [
        { speaker: null, text: "Titus falls. The energy ruptures. Cassius has no allies to warn him." },
        { speaker: null, text: "In desperation, he reaches into the boundary. The voice answers." },
        { speaker: "DIS PATER", text: "A vessel. A bridge. Carry the weight. The price is what you were.", style: "internal" },
        { speaker: null, text: "The energy flows through Cassius. He contains it. The temple seals. The crowd is freed. Titus wakes." },
        { speaker: null, text: "Titus looks at his brother. Cassius looks back. But something in his eyes has changed — darker, calmer, old." },
        { speaker: "TITUS", text: "...Cassius?" },
        { speaker: "CASSIUS", text: "Yes. I'm here." },
      ],
    },
    choices: [],
  },

];

// ─── Campaign State ─────────────────────────────────────────────────

var campaignState = {
  active: false,
  missionIndex: 0,
  denarii: 0,
  flags: {},
  survivingRoster: [],
  ritualMeter: 0,
  totalDeaths: 0,
  endingKey: null,
};

// ─── Helper Functions ───────────────────────────────────────────────

var Campaign = {

  getMission: function () {
    if (!campaignState.active) return null;
    return CAMPAIGN_MISSIONS[campaignState.missionIndex] || null;
  },

  getBudget: function () {
    var m = this.getMission();
    if (!m) return 140;
    return m.budget + campaignState.denarii;
  },

  isClassUnlocked: function (classId) {
    var m = this.getMission();
    if (!m) return true;
    return m.unlockedClasses.indexOf(classId) >= 0;
  },

  getUnlockedClasses: function () {
    var m = this.getMission();
    if (!m) return [];
    return m.unlockedClasses || [];
  },

  getFlag: function (key) {
    if (key === "livia_allied") {
      return !!(campaignState.flags.livia_allied_early || campaignState.flags.livia_allied_late);
    }
    return !!campaignState.flags[key];
  },

  setFlag: function (key, val) {
    campaignState.flags[key] = val !== undefined ? val : true;
  },

  isNamedAlive: function (name) {
    var key = name.toLowerCase() + "_alive";
    if (campaignState.flags[key] === false) return false;
    return true;
  },

  checkCondition: function (cond) {
    if (!cond) return true;
    if (cond.charAt(0) === "!") return !this.checkCondition(cond.slice(1));
    if (cond.indexOf("_alive") > -1) return this.isNamedAlive(cond.replace("_alive", ""));
    return this.getFlag(cond);
  },

  saveSurvivors: function (units, carryHp) {
    var survivors = [];
    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      if (u.team === "player" && u.hp > 0) {
        var entry = {
          uid: u.uid || ("surv_" + i),
          classId: u.classId,
          name: u.displayName || null,
          hp: carryHp ? u.hp : u.maxHp,
          maxHp: u.maxHp,
          isFree: u.isFree || false,
          level: u.level || 1,
          xp: u.xp || 0,
          kills: u.kills || 0,
        };
        if (u.gifted) entry.gifted = true;
        survivors.push(entry);
      }
    }
    var dead = [];
    for (var j = 0; j < units.length; j++) {
      var d = units[j];
      if (d.team === "player" && d.hp <= 0) {
        dead.push(d);
        campaignState.totalDeaths++;
        if (d.displayName) {
          campaignState.flags[d.displayName.toLowerCase() + "_alive"] = false;
        }
      }
    }
    campaignState.survivingRoster = survivors;
    return { survivors: survivors, dead: dead };
  },

  advance: function (won) {
    var m = this.getMission();
    if (!m) return null;

    if (won) {
      campaignState.denarii += m.victoryBonus;
      var playerDied = campaignState.survivingRoster.length <
        (campaignState._preBattleCount || 99);
      if (!playerDied) campaignState.denarii += m.perfectBonus;

      for (var i = 0; i < m.flagsToSet.length; i++) {
        this.setFlag(m.flagsToSet[i]);
      }
      campaignState.ritualMeter = m.ritualMeter;

      if (m.id === 5 && !this.getFlag("livia_allied_early")) {
        this.setFlag("livia_allied_late");
      }

      campaignState.missionIndex++;
    }

    return this.getMission();
  },

  isFinished: function () {
    return campaignState.missionIndex >= CAMPAIGN_MISSIONS.length;
  },

  getEndingScenes: function (key) {
    var m13 = CAMPAIGN_MISSIONS[12];
    if (!m13 || !m13.endingScenes) return [];
    return m13.endingScenes[key] || [];
  },

  reset: function () {
    campaignState.active = false;
    campaignState.missionIndex = 0;
    campaignState.denarii = 0;
    campaignState.flags = {};
    campaignState.survivingRoster = [];
    campaignState.ritualMeter = 0;
    campaignState.totalDeaths = 0;
    campaignState.endingKey = null;
  },

  start: function () {
    this.reset();
    campaignState.active = true;
  },

  getFreeRecruits: function () {
    var m = this.getMission();
    if (!m) return [];
    var recruits = (m.freeRecruits || []).slice();
    var alliance = m.allianceRecruits || [];
    for (var i = 0; i < alliance.length; i++) {
      if (this.getFlag(alliance[i].flag)) {
        recruits.push(alliance[i]);
      }
    }
    return recruits;
  },

  getMissionLabel: function () {
    var m = this.getMission();
    if (!m) return "";
    return "Mission " + m.id + ": " + m.title;
  },

  getActLabel: function () {
    var m = this.getMission();
    if (!m) return "";
    var names = { 1: "Act I: The Tournament", 2: "Act II: The Descent", 3: "Act III: The Ratio" };
    return names[m.act] || "";
  },
};
