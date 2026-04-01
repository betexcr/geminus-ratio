/**
 * Geminus Ratio — Campaign Data & State
 * Defines 17 missions (tutorial + 16 story across branching paths), persistent campaign state, and helper functions.
 * Loaded before game.js — exposes globals: CAMPAIGN_MISSIONS, campaignState, Campaign
 */

/* eslint-disable no-unused-vars */

var _VALID_CLASS_IDS = ["murmillo","retiarius","secutor","thraex","hoplomachus","dimachaerus","provocator","samnite","sagittarius","essedarius","umbra","vestige"];

var CAMPAIGN_MISSIONS = [

  // ─── TUTORIAL ─────────────────────────────────────────────────────

  {
    id: "0",
    title: "The Practice Yard",
    missionNum: 0,
    next: "1",
    act: 1,
    tutorial: true,
    ritualMeter: 0,
    budget: 80,
    enemyLevel: 1,
    unlockedClasses: ["murmillo", "retiarius", "thraex"],
    enemies: [
      { classId: "samnite" },
      { classId: "thraex" },
    ],
    terrain: [],
    mapModifiers: [],
    winCondition: "defeat_all",
    victoryBonus: 10,
    perfectBonus: 5,
    flagsToSet: ["tutorial_complete"],
    freeRecruits: [{ name: "Tiro", classId: "murmillo" }],
    skipLudus: false,
    carryHp: false,
    preScene: [
      { speaker: null, text: "Before dawn. The ludus of Publius — a piss-poor yard of packed sand, splintered posts, and men too stubborn or too stupid to die somewhere comfortable." },
      { speaker: "CASSIUS", text: "Half of them can barely hold a sword straight. The other half hold it straight at each other's throats. Gods help me.", style: "internal" },
      { speaker: null, text: "Cassius drags two groaning fighters out of their cots for a practice bout. No crowd, no coin, no glory. Just iron and the sound of bones learning where they shouldn't bend." },
      { speaker: "CASSIUS", text: "If any of you die in practice, I swear to Jupiter I will piss on your graves. Get up." },
    ],
    postScene: [
      { speaker: "CASSIUS", text: "Not terrible. We won't embarrass the old man's name. Not today, anyway.", style: "internal" },
      { speaker: null, text: "A rider dismounts at the gate. He carries a sealed tablet stamped with the Colosseum's sigil. His horse looks better fed than anyone in the ludus." },
      { speaker: null, text: "The Ludi Aeternales. The grandest tournament in the Empire. Every ludus summoned. Prize money enough to drown a man's debts — or bury them with him." },
      { speaker: "CASSIUS", text: "Publius, you old bastard. You died and left me this circus. I hope you're laughing.", style: "internal" },
    ],
    choices: [],
  },

  // ─── ACT I: THE TOURNAMENT ────────────────────────────────────────

  {
    id: "1",
    title: "The Summons",
    missionNum: 1,
    next: "2",
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
      { speaker: null, text: "Rome swallows them whole. The Colosseum rises over the ludus quarter like a limestone god, its shadow cold even at noon." },
      { speaker: "CASSIUS", text: "Debts on every wall. Publius's name scratched off half the creditor's lists because they gave up collecting from a dead man. Lucky me — I inherited the list.", style: "internal" },
      { speaker: null, text: "A runner from the qualifying grounds — breathless, smelling of cheap wine — brings a rumor: a gladiator matching Titus's description. Tall, dark-haired, fights with two blades. No lanista. No name." },
      { speaker: "CASSIUS", text: "Fifteen years. Fifteen years of looking at every fighter in every piss-stained arena from here to Britannia. And now a rumor. A goddamn rumor.", style: "internal" },
      { speaker: "CASSIUS", text: "But that's enough. It's always been enough.", style: "internal" },
    ],
    postScene: [
      { speaker: null, text: "The crowd barely notices — a qualifying bout between no-names. But Cassius is in. His hands are still shaking." },
      { speaker: "CASSIUS", text: "The Colosseum. I used to dream about this place. Now I'm standing in its guts and all I can think about is whether my brother's somewhere in here, and whether he'd even know my face.", style: "internal" },
      { speaker: null, text: "A glimpse across the hypogeum corridor: a tall fighter led past by two officials in dark tunics. His face is turned away. Cassius shouts his brother's name. The officials walk faster. The fighter doesn't turn." },
      { speaker: "CASSIUS", text: "Titus.", style: "internal" },
    ],
    choices: [],
  },

  {
    id: "2",
    title: "First Blood",
    missionNum: 2,
    next: "3",
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
      { speaker: null, text: "Fifty thousand throats screaming for blood that isn't theirs. The sand is still wet from the last bout — they didn't bother raking it. Flies everywhere." },
      { speaker: "LURCO", text: "Well, shit. Publius's whelp actually showed up. Your old man died owing half of Rome. You here to pay it off in teeth?" },
      { speaker: "CASSIUS", text: "I'm here to knock yours out. But please — keep talking." },
      { speaker: "LURCO", text: "Cute. My fighters eat boys like you for breakfast. Literally — one of them's Thracian. They do that." },
      { speaker: "CASSIUS", text: "At least they're eating.", style: "internal" },
    ],
    postScene: [
      { speaker: null, text: "Lurco's funded brutes lie bleeding in the sand. A small ludus from nowhere just gutted the favorite. The crowd smells an underdog story and they're salivating." },
      { speaker: "LURCO", text: "Enjoy it, boy. You have no idea whose games these are. And when you find out, you'll wish you'd stayed in that dirt-floor ludus." },
      { speaker: null, text: "That night, Cassius hears his gladiators whispering. Strange dreams. A dark room beneath stone. Breathing that isn't theirs. One of them was crying in his sleep." },
      { speaker: "CASSIUS", text: "Just nerves. It's just nerves. We're all nervous.", style: "internal" },
    ],
    choices: [],
  },

  {
    id: "3",
    title: "The Conspirator",
    missionNum: 3,
    next: [{ condition: "livia_allied_early", goto: "4A" }, { goto: "4B" }],
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
      { speaker: null, text: "Past midnight. A woman appears in the ludus quarter — expensive stola, expensive perfume, the kind of calm that comes from having men killed for a living." },
      { speaker: "LIVIA", text: "You beat Lurco. Impressive. It's also not supposed to happen. The brackets are rigged, gladiator. Have been for years." },
      { speaker: "CASSIUS", text: "And you know this because...?" },
      { speaker: "LIVIA", text: "Because my father is a senator, and three of his allies have had their champions murdered in this tournament. Not defeated — murdered. Poisoned water, sabotaged armor, bribed referees." },
      { speaker: "LIVIA", text: "I need someone inside. Someone the Editor hasn't bought. Someone too poor and too angry to sell." },
      { speaker: "CASSIUS", text: "Flattering.", style: "internal" },
    ],
    postScene: [
      { speaker: "NERVA", text: "Not bad for a first outing, boss. I've had worse lanistae. Most of them are dead, but still — low bar.", condition: "nerva_alive" },
      { speaker: "NERVA", text: "One of them once tried to pay me in cheese. Actual cheese. I stayed for two months. It was really good cheese.", condition: "nerva_alive" },
      { speaker: null, text: "The dead gladiator from the opposing side is carried out through the hypogeum on a stretcher. As it passes, the body's hand twitches. Fingers curl. A spasm. Probably a spasm." },
      { speaker: "CASSIUS", text: "Probably.", style: "internal" },
    ],
    choices: [
      {
        id: "livia_offer",
        prompt: "Livia waits. She doesn't blink often enough.",
        options: [
          { label: "\"I'm listening. But I don't come cheap.\"", flag: "livia_allied_early" },
          { label: "\"I'm here for my brother, not your Senate shit.\"", flag: null },
        ],
      },
    ],
  },

  {
    id: "4A",
    title: "The Rigged Bout",
    missionNum: 4,
    next: "5A",
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
      { speaker: null, text: "From the holding area, Cassius watches the bout before his. A gladiator named Corvinus — big, experienced, the bookmakers' darling — enters against a nobody." },
      { speaker: null, text: "Corvinus fights beautifully for two rounds. Then he drops his guard like a man setting down a heavy load. The nobody's sword finds his throat. The sand turns dark." },
      { speaker: "CASSIUS", text: "He threw that fight. I've seen a thousand bouts. A man doesn't forget to block. He chooses not to.", style: "internal" },
      { speaker: null, text: "An hour later, Corvinus's lanista — a man named Fabius — is found dead in his cell. Heart failure, the officials say. Fabius was forty, built like a bull, and was asking questions about the brackets." },
      { speaker: "LIVIA", text: "Fabius was getting close to something. Now he's meat. Watch your back — the Editor's people don't warn twice." },
    ],
    postScene: [
      { speaker: null, text: "Victory. But it tastes like ashes. Fabius is dead. The brackets are a slaughterhouse conveyor. And somewhere in this machine, Titus fights." },
      { speaker: null, text: "Scaeva — old, scarred, built like a wall with opinions — appears in the corridor. He says nothing. Looks at Cassius like a man measuring a coffin. Then walks away." },
      { speaker: "LIVIA", text: "Tomorrow's bout features one of the Editor's personal fighters. Nobody's seen them in training. Nobody knows where they come from. Cassius — be careful what you see." },
      { speaker: "CASSIUS", text: "I'm always careful. That's why I'm still breathing.", style: "internal" },
    ],
    choices: [],
  },

  // ─── M4B: THE PIT (LONE WOLF PATH) ────────────────────────────────

  {
    id: "4B",
    title: "The Pit",
    missionNum: 4,
    next: "5B",
    act: 1,
    ritualMeter: 28,
    budget: 115,
    enemyLevel: 2,
    unlockedClasses: ["murmillo", "retiarius", "samnite", "thraex", "secutor", "hoplomachus", "sagittarius", "essedarius"],
    enemies: [
      { classId: "dimachaerus" },
      { classId: "provocator" },
      { classId: "samnite" },
      { classId: "secutor" },
      { classId: "dimachaerus" },
    ],
    terrain: [
      { x: 3, y: 3, type: "building" },
      { x: 8, y: 5, type: "building" },
      { x: 5, y: 4, type: "water_shallow" },
      { x: 6, y: 4, type: "water_shallow" },
    ],
    mapModifiers: [],
    winCondition: "defeat_all",
    victoryBonus: 20,
    perfectBonus: 5,
    flagsToSet: ["pit_fought"],
    freeRecruits: [],
    skipLudus: false,
    carryHp: false,
    preScene: [
      { speaker: null, text: "Without allies, Cassius walks blind. His next match isn't even in the arena — it's in the undercroft. An unsanctioned bout in a room that smells like old blood and rat piss." },
      { speaker: null, text: "No medical staff. No missio. No rules except the last man standing walks out. The Editor wants to make a point about what happens to upstarts." },
      { speaker: "CASSIUS", text: "The Pit. Where they send fighters they want broken before the crowd can fall in love with them. Charming.", style: "internal" },
      { speaker: null, text: "Word reaches the holding area: Fabius, a lanista who was asking questions about rigged brackets, found dead in his cell. Heart failure, they say. Fabius was forty and could bend iron bars." },
      { speaker: "CASSIUS", text: "Heart failure. Sure. And I'm the Emperor's nephew.", style: "internal" },
    ],
    postScene: [
      { speaker: null, text: "Five men down. No crowd to cheer, no sand to soak the blood — just stone and silence and the sound of Cassius's own breathing." },
      { speaker: null, text: "From the corridor above, a woman watches. Senator's stola, eyes like a hawk counting mice." },
      { speaker: "LIVIA", text: "Stubborn man. I like that. But stubbornness has an expiration date down here." },
      { speaker: "CASSIUS", text: "I'm not interested in your games." },
      { speaker: "LIVIA", text: "They're not my games, gladiator. They're the Emperor's. And he plays for keeps." },
      { speaker: null, text: "At the far end of the corridor, Scaeva leans against the wall. He watches. Says nothing. Then leaves." },
    ],
    choices: [],
  },

  {
    id: "5A",
    title: "The Ghost in the Sand",
    missionNum: 5,
    next: "6",
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
      { speaker: null, text: "The crowd goes feral before Cassius's bout even begins. The Editor's champion is fighting. They've been waiting for this." },
      { speaker: null, text: "Titus walks out. Cassius's stomach drops through the floor." },
      { speaker: null, text: "The jawline. The shoulders. The way he shifts his weight before a strike — that's their father's stance, burned into muscle memory since boyhood. But the eyes are dead glass. The skin has a wrong color. He moves like a wolf wearing a man's skin." },
      { speaker: null, text: "Four gladiators charge him. Titus takes them apart in ninety seconds. No wasted movement, no expression, no mercy. One of them is still screaming when officials drag him out." },
      { speaker: "CASSIUS", text: "That's him. That's my brother. What the fuck did they do to him?", style: "internal" },
      { speaker: null, text: "Officials in dark tunics block the hypogeum entrance, arms crossed." },
      { speaker: "OFFICIAL", text: "The Editor's fighters are in seclusion. No exceptions." },
      { speaker: "CASSIUS", text: "That man is my twin brother." },
      { speaker: "OFFICIAL", text: "Sir, I don't know what you mean. Please return to your holding area." },
    ],
    postScene: [
      { speaker: "VALERIA", text: "Good fight out there. Your old man taught you well — I can see Publius in the way you move." },
      { speaker: "CASSIUS", text: "You knew Publius?" },
      { speaker: "VALERIA", text: "My husband did. Before the arena took him too. Before it takes everyone." },
      { speaker: null, text: "That night, Cassius dreams of the dark room again. Stone floor, cold as a tomb. Breathing that isn't his. He wakes with iron on his tongue and tears on his face." },
      { speaker: "CASSIUS", text: "I found you, brother. I found you and they won't even let me look at you.", style: "internal" },
    ],
    choices: [
      {
        id: "livia_twin",
        prompt: "Livia watched your face during Titus's bout. She saw everything.",
        options: [
          { label: "\"The champion is my twin brother. They've done something to him.\"", flag: "livia_knows_twin" },
          { label: "\"It's nothing. I was just... impressed by the fighting.\"", flag: null },
        ],
      },
    ],
  },

  // ─── M5B: GHOST IN THE SAND (LONE WOLF PATH) ──────────────────────

  {
    id: "5B",
    title: "The Ghost in the Sand",
    missionNum: 5,
    next: "6",
    act: 1,
    ritualMeter: 40,
    budget: 125,
    enemyLevel: 2,
    unlockedClasses: ["murmillo", "retiarius", "samnite", "thraex", "secutor", "hoplomachus", "provocator", "dimachaerus", "sagittarius", "essedarius"],
    enemies: [
      { classId: "thraex" },
      { classId: "dimachaerus" },
      { classId: "thraex" },
      { classId: "dimachaerus" },
      { classId: "secutor" },
      { classId: "provocator" },
    ],
    terrain: [
      { x: 4, y: 4, type: "building" },
      { x: 7, y: 4, type: "building" },
      { x: 5, y: 7, type: "water_shallow" },
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
      { speaker: null, text: "The crowd goes feral. The Editor's champion is fighting — the one nobody's seen in training, the ghost that appears only under the lights." },
      { speaker: null, text: "Titus walks out. And Cassius's world stops." },
      { speaker: null, text: "Same face. Same broad shoulders, same way of rolling his wrists before a fight. Their father's stance. But the eyes — dead obsidian. Skin the color of old ash. Something wearing his brother like a suit." },
      { speaker: null, text: "Four gladiators rush him. Titus carves through them like a butcher jointing meat. Methodical. Silent. One of them crawls toward the gate trailing blood. Titus watches him crawl and does nothing." },
      { speaker: "CASSIUS", text: "Titus. Oh gods. Oh gods, what did they do to you?", style: "internal" },
      { speaker: null, text: "Officials block the hypogeum entrance. Arms crossed, faces blank as temple statues." },
      { speaker: "OFFICIAL", text: "No visitors. The Editor's property is in seclusion." },
      { speaker: "CASSIUS", text: "Property? That's my brother, you bureaucratic piece of —" },
      { speaker: "OFFICIAL", text: "Return to your holding area, sir." },
      { speaker: "LIVIA", text: "You saw him. You see what they've done. I can help you — but you have to let me." },
    ],
    postScene: [
      { speaker: "VALERIA", text: "Not bad out there. Your old man would've been proud — Publius always said his boys were fighters." },
      { speaker: "CASSIUS", text: "You knew Publius?" },
      { speaker: "VALERIA", text: "My husband did. Before the arena chewed him up and spat out bones. Same as it does to everyone." },
      { speaker: null, text: "That night, the dream again. Darker now. Stone floor cold as death, breathing that isn't his, and at the edge of vision — a face. His face. Staring back without recognition." },
      { speaker: "CASSIUS", text: "I'm coming for you, brother. Even if I have to tear this whole fucking Colosseum apart.", style: "internal" },
    ],
    choices: [
      {
        id: "livia_alliance_late",
        prompt: "Livia appears in the corridor, backlit by torchlight. \"You saw what they did to that man. I can help you reach him — but I need something in return.\"",
        options: [
          { label: "\"After what I just saw… I'm in. Whatever it takes.\"", flag: "livia_allied_late" },
          { label: "\"I don't need a politician's help. I work alone.\"", flag: null },
        ],
      },
    ],
  },

  // ─── ACT II: THE DESCENT ──────────────────────────────────────────

  {
    id: "6",
    title: "Into the Dark",
    missionNum: 6,
    next: "7",
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
      { speaker: null, text: "After midnight, Cassius descends into the hypogeum. Past the guard rotation, past the holding pens that smell of sweat and fear, following the corridor Titus was led through." },
      { speaker: null, text: "The brick gives way to older stone — Republican-era, maybe older. The air turns cold and wet and wrong. Torches along the walls flicker in unison, a slow pulse like something enormous breathing through the walls." },
      { speaker: "CASSIUS", text: "This doesn't feel like a building. It feels like a throat.", style: "internal" },
      { speaker: null, text: "In a chamber below, a man sits motionless on a stone bench. Ferox. His eyes are open but focused on nothing — or something nobody else can see." },
      { speaker: "FEROX", text: "You should not be here. The Editor does not allow visitors. The Editor does not allow. The Editor." },
      { speaker: "CASSIUS", text: "What did they do to you, man?" },
      { speaker: "FEROX", text: "They made me better. I am better. I do not remember being worse but I was. I was worse. I was..." },
      { speaker: null, text: "Arena officials find Cassius before Ferox can finish. He's escorted out at spear-point. His next match has been 'moved up.' The official smiles when he says it." },
      { speaker: "CASSIUS", text: "A warning. They're sending me a goddamn warning.", style: "internal" },
    ],
    postScene: [
      { speaker: null, text: "When Ferox falls, he doesn't collapse like a man. He kneels, slowly, deliberately, like a puppet whose strings are being cut one by one. His eyes focus for the first time." },
      { speaker: "FEROX", text: "...I remember mornings. Bread. Warm bread, and someone's hand on my shoulder, and I can't remember whose hand." },
      { speaker: null, text: "The crowd goes silent. Fifty thousand people, mid-scream, suddenly mute. Three heartbeats. Then they cheer, and none of them know why they stopped." },
      { speaker: "NERVA", text: "Boss. That fighter — his eyes. They weren't human eyes. Something was looking out of them. Something old.", condition: "nerva_alive" },
      { speaker: null, text: "Ferox lies still. His breathing is shallow, mechanical. Whatever they made him into, the man underneath is a ruin. Shattered pottery with a few painted fragments still showing.", condition: "ferox_mercy" },
      { speaker: null, text: "Ferox kneels in the sand, trembling. He's trying to remember something — you can see it in the way his lips move, shaping words he can't find. Clinging to scraps of himself like a drowning man.", condition: "ferox_spared" },
    ],
    choices: [
      {
        id: "ferox_fate",
        prompt: "Ferox kneels in the sand, trembling. A broken thing. His lips move, shaping words he can't find. The crowd waits. Your sword is in your hand.",
        options: [
          { label: "Put him down. No one should live like that.", flag: "ferox_mercy" },
          { label: "Let him live. He remembered mornings. That's something.", flag: "ferox_spared" },
        ],
      },
    ],
  },

  {
    id: "7",
    title: "The Old Wolf",
    missionNum: 7,
    next: "8",
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
      { speaker: null, text: "Scaeva blocks Cassius's path in the ludus quarter. Up close, the old man looks like a leather map of every bad decision the arena ever made." },
      { speaker: "SCAEVA", text: "Thirty years in this meat grinder, boy. I've watched lanistae poke around the lower levels. Ask the wrong questions. Every single one of them stopped asking." },
      { speaker: "CASSIUS", text: "Stopped how?" },
      { speaker: "SCAEVA", text: "Some stopped breathing. Some just... stopped being themselves. Got that look in their eyes, like the lights were on but nobody was home. Sound familiar?" },
      { speaker: "SCAEVA", text: "I knew your father. Gaius Geminus. Tough bastard, good heart, terrible judgment. He found something under this arena that scared him shitless. And he didn't scare easy." },
      { speaker: "CASSIUS", text: "My father died in a border skirmish." },
      { speaker: "SCAEVA", text: "Is that what they told you? That's cute." },
    ],
    postScene: [
      { speaker: "LURCO", text: "The Emperor will hear of this! You're finished, all of you!" },
      { speaker: null, text: "He's right. The Emperor hears. And the Emperor doesn't mind at all — Lurco was always expendable. The old wolf whimpers off to lick his wounds." },
      { speaker: "SCAEVA", text: "Aemilia. She's mine. Best eyes in the arena and she can put a spear through a denarius at thirty paces. She'll watch your back.", condition: "scaeva_allied" },
      { speaker: "AEMILIA", text: "I've seen the Gifted up close. Those empty-eyed bastards. Something feeds them — I can feel it through the sand, like a heartbeat under the floor.", condition: "scaeva_allied" },
      { speaker: "AEMILIA", text: "Don't give me that look. I'm not crazy. You've felt it too.", condition: "scaeva_allied" },
    ],
    choices: [
      {
        id: "scaeva_help",
        prompt: "Scaeva's said more in five minutes than he has in thirty years. He's scared. And he's offering to help anyway.",
        options: [
          { label: "\"Then fight with me. Whatever's down there — we face it together.\"", flag: "scaeva_allied" },
          { label: "\"I appreciate the warning, old man. But this is my fight.\"", flag: null },
        ],
      },
    ],
  },

  {
    id: "8",
    title: "Valeria's Reckoning",
    missionNum: 8,
    next: "9",
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
      { speaker: null, text: "Cassius finds maintenance logs in a forgotten hypogeum office. Yellowed paper, cramped handwriting. One name keeps appearing: 'Corvus, M.' — Valeria's husband, Marcus." },
      { speaker: null, text: "The logs describe a 'containment incident' in the lower levels. A maintenance worker breached an unauthorized area. The 'malfunction' that killed him involved no machinery. The body showed signs of 'accelerated senescence.' He aged thirty years in minutes." },
      { speaker: "CASSIUS", text: "Marcus didn't die in an accident. He found something, and they killed him for it. And Valeria has no idea.", style: "internal" },
    ],
    postScene: [
      { speaker: "VALERIA", text: "I always knew it wasn't an accident. I knew it in my gut. Marcus was careful — he didn't make mistakes. They murdered him.", condition: "valeria_allied" },
      { speaker: "VALERIA", text: "Thank you for telling me. Most men in this place would have kept their mouths shut. Marcus died trying to stop something terrible. I won't let that be for nothing.", condition: "valeria_allied" },
      { speaker: null, text: "A fire breaks out in Valeria's ludus overnight. By dawn, it's ashes. No survivors among the gladiators. Valeria herself has vanished — fled or buried in the rubble.", condition: "valeria_unwarned" },
      { speaker: "CASSIUS", text: "I should have told her. I should have goddamn told her.", style: "internal", condition: "valeria_unwarned" },
      { speaker: null, text: "The Editor's man delivers a leather pouch. Fifty denarii, freshly minted. That night, Valeria's ludus burns. Cassius hears the screaming from across the quarter.", condition: "valeria_betrayed" },
      { speaker: "CASSIUS", text: "Fifty denarii. I sold a woman's husband's memory for fifty denarii. I sold her gladiators' lives for fifty denarii. I'll count them in hell.", style: "internal", condition: "valeria_betrayed" },
      { speaker: null, text: "The dream comes again. Darker. The room is colder. The black stone has symbols carved deep — not in any alphabet Cassius knows. At the edge of the room, a figure turns toward him. It has his face. It smiles." },
    ],
    choices: [
      {
        id: "valeria_truth",
        prompt: "The logs prove Marcus Corvus was murdered. Valeria deserves to know. The Editor would pay for this information. And silence is always an option.",
        options: [
          { label: "Tell Valeria everything. She deserves the truth.", flag: "valeria_allied" },
          { label: "Say nothing. The less she knows, the safer she is.", flag: "valeria_unwarned" },
          { label: "Sell the logs to the Editor. Fifty denarii buys a lot of survival.", flag: "valeria_betrayed" },
        ],
      },
    ],
  },

  {
    id: "9",
    title: "The Temple",
    missionNum: 9,
    next: [{ condition: "nero_deal", goto: "10D" }, { goto: "10" }],
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
    flagsToSet: ["temple_visited"],
    freeRecruits: [],
    skipLudus: false,
    carryHp: false,
    preScene: [
      { speaker: null, text: "Cassius descends past the last torch. Past the Roman brick, past the Republican stone, into something older. The walls aren't carved — they were grown. The corridor breathes." },
      { speaker: null, text: "The temple. Circular, domed, the floor black stone polished smooth as a mirror. In the center: a basin of liquid so dark it seems to drink the light. The black water." },
      { speaker: null, text: "On the far wall, scratched into stone with broken fingernails: T-I-T-V-S." },
      { speaker: "CASSIUS", text: "He was here. Locked in this hole, and he tried to scratch his own name into the wall so he wouldn't forget who he was. And they took even that from him.", style: "internal" },
      { speaker: null, text: "The temperature drops twenty degrees in a heartbeat. The black water ripples without being touched. Something vast and patient — something that has been waiting since before Rome had a name — becomes aware of Cassius." },
      { speaker: "CASSIUS", text: "Run. RUN.", style: "internal" },
      { speaker: null, text: "He flees. The corridors rearrange behind him — walls where doors were, doors where walls were. He emerges twenty minutes later, gasping, hands shaking. The guards tell him only five minutes have passed." },
      { speaker: null, text: "Praetorian guards escort him to the Imperial Box. Nero Aurelius sits in a chair too large for a man visibly dying. His skin is the color of old parchment. His eyes are terrifyingly sharp." },
      { speaker: "NERO", text: "Ah. You've been to the temple. I can smell it on you — something between iron and rain. The stone has a particular fragrance." },
      { speaker: "NERO", text: "I am dying, gladiator. Quite slowly, quite painfully. The ritual beneath this arena can save me. The cost is twin blood — yours and your brother's. Poured on the stone, under the proper stars." },
      { speaker: "NERO", text: "Come willingly. Be remembered as heroes of Rome. Your names carved in the Colosseum for a thousand years. Or —" },
      { speaker: "CASSIUS", text: "Or?" },
      { speaker: "NERO", text: "Or you die as traitors, I take your blood anyway, and nobody remembers either of you ever existed. I find the second option less elegant, but equally effective." },
    ],
    postScene: [
      { speaker: null, text: "The crowd is different now. Their cheering has a rhythm — pulsing, synchronized, like a fifty-thousand-person heartbeat. Some sway in their seats with their eyes half-closed." },
      { speaker: "NERO", text: "Then we do it the hard way. A pity — you would have made a fine sacrifice. Your next matches will be... educational.", condition: "!nero_deal" },
      { speaker: "NERO", text: "Wise choice. You will fight under my banner. My enemies become your enemies, and your brother lives. A fair trade, no?", condition: "nero_deal" },
      { speaker: "CASSIUS", text: "Nothing about this is fair.", condition: "nero_deal" },
      { speaker: "LIVIA", text: "My father is preparing to address the Senate. Rigged brackets, murdered lanistae, political purges — we can blow this whole conspiracy open.", condition: "livia_allied" },
      { speaker: "LIVIA", text: "And Cassius — I know why you're really here. Your brother. The champion. I've had people watching him. Whatever they did to him, it's connected to the ritual.", condition: "livia_knows_twin" },
      { speaker: "CASSIUS", text: "Politics won't stop what's under this arena. But it might slow the bastards down.", style: "internal", condition: "!nero_deal" },
      { speaker: "CASSIUS", text: "I sold myself to a dying emperor to save my brother's life. Titus, if you could see me now — would you even want to be saved by what I've become?", style: "internal", condition: "nero_deal" },
    ],
    choices: [
      {
        id: "nero_deal",
        prompt: "Nero's dying eyes bore into you. He's offering survival, protection, and your brother's life. The price is your soul and everyone else's blood.",
        options: [
          { label: "\"Fine. I'll be your dog. But Titus lives — that's the deal.\"", flag: "nero_deal" },
          { label: "\"I'd sooner eat my own sword than serve a dying tyrant.\"", flag: "emperor_refused" },
        ],
      },
    ],
  },

  // ─── M10D: THE EMPEROR'S DOG (NERO DEAL PATH) ──────────────────────

  {
    id: "10D",
    title: "The Emperor's Dog",
    missionNum: 10,
    next: "12",
    act: 3,
    ritualMeter: 88,
    budget: 180,
    enemyLevel: 4,
    unlockedClasses: ["murmillo", "retiarius", "samnite", "thraex", "secutor", "hoplomachus", "provocator", "dimachaerus", "sagittarius", "essedarius", "umbra", "vestige"],
    enemies: [
      { classId: "hoplomachus", gifted: true },
      { classId: "samnite", gifted: true },
      { classId: "thraex", gifted: true },
      { classId: "murmillo" },
      { classId: "retiarius" },
      { classId: "provocator" },
    ],
    terrain: [
      { x: 3, y: 2, type: "building" },
      { x: 8, y: 2, type: "building" },
      { x: 5, y: 5, type: "building" },
      { x: 3, y: 6, type: "water_deep" },
      { x: 8, y: 6, type: "water_deep" },
    ],
    mapModifiers: ["cursed_8", "ritual_pulse_3"],
    winCondition: "defeat_all",
    victoryBonus: 25,
    perfectBonus: 10,
    flagsToSet: ["emperor_champion"],
    freeRecruits: [],
    skipLudus: false,
    carryHp: false,
    preScene: [
      { speaker: null, text: "Cassius wears the Emperor's sigil on his shoulder now. A golden eagle. It weighs nothing and it weighs everything. The Praetorian escort clears the hypogeum like Moses parting the Red Sea of shit." },
      { speaker: null, text: "His opponents are senators' champions — good men fighting for masters who dared to question Nero. Their lanistae are already dead or fled. These gladiators have nothing left to fight for except dying well." },
      { speaker: "NERO", text: "These men serve traitors who would see Rome dissolve into factional chaos. Destroy them, and prove the strength of imperial order." },
      { speaker: "CASSIUS", text: "They're gladiators. Same as me. Meat on someone else's table. But I'll kill them because a dying emperor told me to, so I can save my brother from a fate worse than dying. What a world.", style: "internal" },
      { speaker: null, text: "A figure in black emerges from the hypogeum gate — Varro Umbra, the Editor, the architect of every rigged bracket and murdered lanista. He moves like smoke, and his voice carries the easy confidence of a man who has never lost a game he designed." },
      { speaker: "VARRO", text: "The Emperor's new dog. How quickly you learned to heel. Does the leash chafe, or have you grown to like it?" },
      { speaker: "CASSIUS", text: "One day, Varro. One day I will wrap that leash around your throat and find out how long it takes you to stop twitching." },
      { speaker: "VARRO", text: "Promises, promises." },
    ],
    postScene: [
      { speaker: null, text: "The senators' champions lie in the sand. Some dead, some not yet. The crowd chants NERO, NERO, NERO, and Cassius's hands won't stop shaking." },
      { speaker: "NERO", text: "Excellent work, gladiator. You've earned your brother's life. One final bout — the culmination — and our arrangement is complete." },
      { speaker: "CASSIUS", text: "I killed men whose only sin was having the wrong master. I'm worse than Lurco. At least that animal was honest about being a piece of shit.", style: "internal" },
      { speaker: null, text: "In the corridor, Scaeva passes. Doesn't look at Cassius. Doesn't need to. The silence says everything.", condition: "scaeva_allied" },
    ],
    choices: [],
  },

  // ─── ACT III: THE RATIO ───────────────────────────────────────────

  {
    id: "10",
    title: "The Gauntlet",
    missionNum: 10,
    next: "11",
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
      { speaker: null, text: "The brackets have been rewritten overnight. Cassius's ludus draws the Cult's strongest stable — every Gifted fighter, every enhanced killer. The Editor has stopped pretending this is a tournament." },
      { speaker: null, text: "Varro Umbra appears in the arena for the first time in person. Tall, thin, dressed in black that doesn't reflect light properly. Up close, his face is wrong — too smooth, too symmetrical, like a mask that learned to smile." },
      { speaker: "VARRO", text: "You visited the temple. You heard the voice beneath the stone. You know what waits below this sand." },
      { speaker: "CASSIUS", text: "I know what you've done to my brother, you sick bastard." },
      { speaker: "VARRO", text: "Done? I elevated him. When the rite completes, his name will outlast Rome. Yours too — both sides of the Geminus coin, spent at last for a worthy purchase." },
      { speaker: "VARRO", text: "The sand is hungry tonight, gladiator. Can you feel it pulling at your feet? It wants to drink." },
      { speaker: "CASSIUS", text: "It can drink your blood for all I care." },
      { speaker: "VARRO", text: "Oh, it will. Eventually, everything drinks." },
    ],
    postScene: [
      { speaker: null, text: "The arena is a ruin. Sand stained black in places. The crowd screams in harmony — a rising, falling chord, like a choir that doesn't know it's singing, led by a conductor buried under the floor." },
      { speaker: "NERVA", text: "Boss. During the fight, I stood on that dark sand and I swear to every god — something was looking up at me through the ground. Like an eye. What are we fighting in?", condition: "nerva_alive" },
      { speaker: "AEMILIA", text: "The Gifted aren't fighters. They're puppets. Something else is pulling the strings — the same something that's pulsing under the sand. I could feel it in my teeth.", condition: "scaeva_allied" },
      { speaker: null, text: "Two more matches. Then the final bout. The one the entire tournament was designed to produce." },
    ],
    choices: [],
  },

  {
    id: "11",
    title: "Alliance and Sacrifice",
    missionNum: 11,
    next: "12",
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
      { flag: "valeria_allied", name: "Ferox", classId: "dimachaerus", gifted: true, condition: "ferox_spared" },
    ],
    skipLudus: false,
    carryHp: false,
    preScene: [
      { speaker: null, text: "The night before the final matches. Cassius gathers what allies he has in a cramped room beneath the ludus. The air smells of cheap wine and fear." },
      { speaker: "LIVIA", text: "My father addresses the Senate at dawn. Evidence of rigged brackets, murdered lanistae, political assassinations. Once it's public, Nero loses his political shield. But the ritual — that nightmare under the arena — that's on you.", condition: "livia_allied" },
      { speaker: "CASSIUS", text: "No pressure." },
      { speaker: "LIVIA", text: "All the pressure. But I wouldn't have bet on you if I thought you'd fold.", condition: "livia_allied" },
      { speaker: "LIVIA", text: "Your brother — my agents tracked his movements. He's being kept in the temple between bouts. Whatever they pumped into him, it's the same energy source as the ritual. Break one, you might break the other.", condition: "livia_knows_twin" },
      { speaker: "SCAEVA", text: "I'm sending what fighters I've got. They're old, scarred, mean as snakes. Like me. But they know their business, and they won't break.", condition: "scaeva_allied" },
      { speaker: "VALERIA", text: "Marcus died in that hole. My best fighters are yours. Make every swing count — for him.", condition: "valeria_allied" },
    ],
    postScene: [
      { speaker: null, text: "The arena falls quiet. Not silent — quiet in the way a held breath is quiet. Fifty thousand people staring at the sand, every one of them feeling the pulse beneath their feet without knowing what it is." },
      { speaker: "VARRO", text: "One match remains. The ratio must balance. Brother against brother — the geminus completed, as the old rituals demand. Isn't it beautiful?" },
      { speaker: "CASSIUS", text: "Tomorrow I face my own twin brother. The brother I've spent fifteen years searching for. The brother they broke and rebuilt into a weapon. And I have to fight him, or something worse than death swallows us both.", style: "internal" },
      { speaker: "CASSIUS", text: "I don't know if I can save him. I don't know if there's a him left to save. But I have to try. I have to fucking try.", style: "internal" },
      { speaker: "NERVA", text: "Boss. Whatever happens in that sand tomorrow — we're with you. Every last one of us. To the sand and through the other side of it.", condition: "nerva_alive" },
      { speaker: "CASSIUS", text: "Nerva...", condition: "nerva_alive" },
      { speaker: "NERVA", text: "Don't get sentimental on me. I'll start crying, and you know how ugly I look when I cry.", condition: "nerva_alive" },
      { speaker: null, text: "Nerva held the rear guard alone. The Gifted came in waves and he held them, laughing, cursing, fighting with a net in one hand and a broken bottle in the other. He didn't come back. He never expected to.", condition: "nerva_sacrificed" },
      { speaker: "CASSIUS", text: "Sleep well, old friend. You earned it.", style: "internal", condition: "nerva_sacrificed" },
    ],
    choices: [
      {
        id: "nerva_sacrifice",
        condition: "nerva_alive",
        prompt: "Nerva grabs your arm after the others leave. \"Boss. They'll come from behind in the final bout — the Gifted, through the hypogeum. I can hold that corridor. I'm old, I'm mean, and I've got nothing to lose. But I won't be walking out.\"",
        options: [
          { label: "\"Make it count, old friend. I'll pour one out for you.\"", flag: "nerva_sacrificed" },
          { label: "\"No. We walk in together and we walk out together. That's final.\"", flag: null },
        ],
      },
    ],
  },

  {
    id: "12",
    title: "The Unmasking",
    missionNum: 12,
    next: "13",
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
      { speaker: null, text: "At dawn, Senator Pulcher stands before the Senate. Behind him, Livia's dossier: forged brackets, murdered lanistae, a body count that would shame a battlefield. The Senate erupts into chaos.", condition: "livia_allied" },
      { speaker: null, text: "At dawn, Senator Pulcher stands before the Senate. Anonymous evidence has reached him — forged brackets, murdered lanistae, a body count that would shame a battlefield. The Senate erupts into chaos.", condition: "!livia_allied" },
      { speaker: null, text: "But in the Colosseum, nothing changes. The crowd cannot leave. They don't want to leave. Fifty thousand people locked in a collective trance, the ritual's grip tightening like a fist around their minds." },
      { speaker: null, text: "Nero Aurelius drags himself into the Imperial Box. He looks like a corpse that forgot to lie down — skin like wet paper, eyes burning with the desperate hunger of a dying man watching his last chance." },
      { speaker: "NERO", text: "THE CULMINATION! THE LUDI AETERNALES REACH THEIR GLORIOUS CONCLUSION!" },
      { speaker: "VARRO", text: "You cannot prevent this, gladiator. The energy is gathered over months of blood. The threshold is reached. All that remains is the spark — twin blood on the stone. You and your brother, together at last." },
      { speaker: "CASSIUS", text: "I've been looking for my brother for fifteen years, and this is how I find him. In a death trap built by a lunatic and a dying emperor. Some reunion.", style: "internal" },
    ],
    postScene: [
      { speaker: null, text: "The arena floor cracks open. Through the fissures, a faint glow pulses from below — the temple, directly beneath, its light seeping through stone like infection through a wound." },
      { speaker: null, text: "The far gate opens. Titus walks out. Alone." },
      { speaker: null, text: "He is bigger than Cassius remembers. Broader, taller, wrong. His skin has the grey cast of something left too long in dark water. His eyes are polished obsidian — beautiful and completely dead. He carries two swords." },
      { speaker: null, text: "Titus stops in the center of the arena. Looks at Cassius. And for one half-second — barely a heartbeat — something flickers behind those dead eyes. Recognition. A drowning man reaching the surface for one breath." },
      { speaker: null, text: "Then it's gone. The obsidian closes over." },
      { speaker: "LIVIA", text: "That's him, isn't it? Your twin. Gods, Cassius — he looks like you. He looks exactly like you, except for the eyes.", condition: "livia_knows_twin" },
      { speaker: "VARRO", text: "Begin." },
    ],
    choices: [],
  },

  {
    id: "13",
    title: "Geminus Ratio",
    missionNum: 13,
    next: "end",
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
      { speaker: null, text: "No preparation. No rest. No mercy. The arena has transformed — the floor is fractured glass over a glowing abyss, glyphs pulse across every tile like a fever, and the hypogeum is visible through cracks in the sand. It looks like a wound." },
      { speaker: null, text: "Titus stands in the center. The Gifted honor guard flanks him, empty-eyed and trembling with stolen power. The crowd's chanting is continuous, involuntary — a fifty-thousand-voice prayer to something that does not love them." },
      { speaker: "CASSIUS", text: "Titus. Brother. If any scrap of you is still in there — if you can hear me through whatever they've buried you under — I'm here. I came for you. Like I always said I would.", style: "internal" },
      { speaker: "CASSIUS", text: "Fifteen years, you stubborn bastard. Fifteen years and a thousand miles and I found you in the belly of the worst place in the world. So don't you dare be gone.", style: "internal" },
    ],
    postScene: [],
    endingScenes: {
      a: [
        { speaker: null, text: "Cassius stands beside Titus. Not fighting. Just... standing there. The ritual energy writhes around them both — twin blood, twin heartbeats, the geminus ratio completed — but not as a weapon. As a choice." },
        { speaker: null, text: "Titus's dead obsidian eyes crack. Something warm and terrified pushes through from underneath. His mouth moves. His voice sounds like a man who hasn't spoken in years." },
        { speaker: "TITUS", text: "...Cassius?" },
        { speaker: "CASSIUS", text: "Yeah. Yeah, it's me, you idiot." },
        { speaker: null, text: "The ritual energy discharges harmlessly through the temple below. The arena shakes. The cursed tiles go dark like lanterns snuffed. The crowd falls truly silent — the first honest silence in months." },
        { speaker: null, text: "The temple collapses in on itself. The Colosseum cracks but stands. Up in the Imperial Box, Nero Aurelius exhales once and does not inhale again. No one mourns." },
        { speaker: "TITUS", text: "I remember... the room. The water. The voice in the dark. I remember forgetting your name. I remember trying to carve mine into the wall so I wouldn't forget my own." },
        { speaker: "TITUS", text: "And I remember you finding me. Standing next to me when anyone sane would have run." },
        { speaker: "CASSIUS", text: "Since when have I ever been sane?" },
        { speaker: null, text: "For the first time in fifteen years, the twins stand in sunlight together. The crowd is leaving, dazed, blinking, wondering what happened. The sand is just sand again." },
        { speaker: "CASSIUS", text: "Let's go home, brother." },
        { speaker: "TITUS", text: "I don't remember where home is." },
        { speaker: "CASSIUS", text: "Neither do I. We'll figure it out." },
      ],
      b: [
        { speaker: null, text: "Titus falls. The ritual energy — unchanneled, unbound — begins to rupture outward like a cracked dam. The floor splits. Light pours up through every fissure." },
        { speaker: "LIVIA", text: "The energy — it's cascading! It's going to tear the Colosseum apart! Fifty thousand people, Cassius!" },
        { speaker: "CASSIUS", text: "I know. I know what I have to do.", style: "internal" },
        { speaker: null, text: "Cassius drops through the cracked arena floor into the temple below. The black stone pulses like a heart. He places his hands on it." },
        { speaker: null, text: "Pain. Pain like being unmade molecule by molecule. The ritual energy pours through him — twin blood is the bridge, and he makes himself the channel. He burns the ritual out from within, screaming." },
        { speaker: null, text: "The temple collapses. The glow dies. The Colosseum settles. Above, the crowd blinks awake, confused, free." },
        { speaker: null, text: "Titus wakes on the arena floor, whole. The grey gone from his skin. His eyes brown again, human, scared. He looks down through the cracked floor into the rubble below." },
        { speaker: "TITUS", text: "...Cassius? CASSIUS!" },
        { speaker: null, text: "Silence from below. Then, faintly, a cough." },
        { speaker: "CASSIUS", text: "Still... here. Mostly." },
        { speaker: "TITUS", text: "You absolute idiot. You beautiful, suicidal idiot." },
        { speaker: "TITUS", text: "I couldn't find you in time. You found me." },
        { speaker: null, text: "They pull Cassius from the rubble. He's alive, barely. Livia's people are already moving — senators, soldiers, a physician. The cost of love is a broken body and a temple full of dust." },
      ],
      c: [
        { speaker: null, text: "Titus falls. The energy ruptures. No allies to warn him. No voice of reason. Just Cassius, alone, with an exploding temple and a dying arena." },
        { speaker: null, text: "In desperation, he reaches past the boundary of the ritual. Into the dark beneath the dark. The voice that has been waiting since before Rome answers." },
        { speaker: "DIS PATER", text: "A vessel. A bridge. You can contain what your brother cannot. The price is simple: everything you were.", style: "internal" },
        { speaker: "CASSIUS", text: "Take it. Take all of it. Just save him.", style: "internal" },
        { speaker: null, text: "The energy floods through Cassius like a river through a broken dam. He contains it. All of it. The temple seals. The cracks close. The crowd is freed, stumbling out into daylight they didn't know they'd missed." },
        { speaker: null, text: "Titus wakes on the sand. Human again. Scared, shaking, crying. He looks at his brother." },
        { speaker: null, text: "Cassius looks back. Same face. Same scars. But the eyes... deeper now. Older. Something ancient and calm looking out through them, like a lantern lit in a very dark room." },
        { speaker: "TITUS", text: "...Cassius? Is that you?" },
        { speaker: "CASSIUS", text: "Yes. I'm here." },
        { speaker: null, text: "But the pause before he answers is one heartbeat too long. And when he smiles, it doesn't quite reach whatever is looking out through his eyes." },
      ],
      d: [
        { speaker: null, text: "Titus falls. The ritual completes — not as Varro planned, but as Nero demanded. The Emperor's champion has delivered. The twin blood is on the stone." },
        { speaker: null, text: "Nero rises from his chair in the Imperial Box. For one terrible moment, the decay reverses — his skin smooths, his spine straightens, his eyes blaze with stolen life." },
        { speaker: "NERO", text: "YES. The compact holds. The stones remember. I am renewed!" },
        { speaker: null, text: "Then the temple rejects the parasitic connection. The stone cracks. The energy backfires. Nero ages a hundred years in ten seconds. He crumbles like a sand sculpture in the rain." },
        { speaker: null, text: "Titus wakes on the sand. Whole. Human. He looks up at Cassius — and doesn't recognize him." },
        { speaker: "TITUS", text: "Who... who are you? Why are you wearing the Emperor's sigil?" },
        { speaker: "CASSIUS", text: "I'm your brother. I came to save you." },
        { speaker: "TITUS", text: "My brother wouldn't serve a tyrant. My brother wouldn't have the Emperor's eagle on his shoulder and other men's blood on his hands." },
        { speaker: null, text: "The crowd disperses. Nero is dead. Titus walks away. Cassius stands in the empty arena holding a golden eagle badge and wondering when he stopped being the man his brother would recognize." },
        { speaker: "CASSIUS", text: "I saved him. I saved him and he won't even look at me. Was it worth it?", style: "internal" },
        { speaker: "CASSIUS", text: "Was any of it worth it?", style: "internal" },
      ],
      e: [
        { speaker: null, text: "Titus falls. The arena is coming apart. Stone raining from the upper tiers, the floor cracking open like an egg. No allies left. No Livia, no Scaeva, no Nerva. Just a betrayer, alone, reaping what he sowed." },
        { speaker: null, text: "The ritual energy erupts outward, uncontained. The Colosseum groans. Pillars crack. The crowd screams — real screams now, human screams, the trance broken by primal terror." },
        { speaker: "CASSIUS", text: "Everyone I touched, I destroyed. Valeria. Nerva. Everyone. And now fifty thousand people are going to die because I was too selfish, too stupid, and too goddamn late.", style: "internal" },
        { speaker: null, text: "Cassius drags Titus's body through collapsing corridors. Stone falls. Dust blinds. He carries his brother on his back through the hypogeum, through fire, through rubble, out into the grey dawn." },
        { speaker: null, text: "Behind them, the Colosseum's inner ring collapses. Thousands flee. Some don't make it. The greatest arena in the world dies screaming." },
        { speaker: null, text: "Titus wakes in the dust, coughing. Human again. He looks at the ruin behind them, then at Cassius." },
        { speaker: "TITUS", text: "What happened?" },
        { speaker: "CASSIUS", text: "I happened." },
        { speaker: null, text: "They sit in the rubble as Rome burns behind them. Two brothers. Alive. And nothing else." },
      ],
    },
    choices: [],
  },

];

// ─── Post-Battle Vignettes ──────────────────────────────────────────

var VIGNETTE_POOL = [
  { id: "v_mur_ret", classA: "murmillo", classB: "retiarius", condition: "both_survived",
    lines: [{ speaker: "A", text: "Your net caught my ankle out there. My own ally's net." }, { speaker: "B", text: "I saved your life, you ungrateful tin can. That secutor was about to gut you." }, { speaker: "A", text: "...Fair point. Buy you a drink?" }, { speaker: "B", text: "You can't afford my drinks." }] },
  { id: "v_mur_hop", classA: "murmillo", classB: "hoplomachus", condition: "both_survived",
    lines: [{ speaker: "A", text: "Your shield work out there — beautiful. Absolutely beautiful." }, { speaker: "B", text: "Quit flirting." }, { speaker: "A", text: "I'm serious! That wall you made? Nothing got through." }, { speaker: "B", text: "Nothing except your ego. That barely fit behind it." }] },
  { id: "v_ret_dim", classA: "retiarius", classB: "dimachaerus", condition: "both_survived",
    lines: [{ speaker: "A", text: "Two blades against a net and trident. How is that fair?" }, { speaker: "B", text: "It's not. That's why I use two blades." }, { speaker: "A", text: "Smartass." }, { speaker: "B", text: "Fast-ass. There's a difference." }] },
  { id: "v_sec_thr", classA: "secutor", classB: "thraex", condition: "both_survived",
    lines: [{ speaker: "A", text: "Slow down next time. I can't keep up and I'm supposed to be the pursuer." }, { speaker: "B", text: "Maybe eat less bread and more violence, heavy-legs." }] },
  { id: "v_hop_sag", classA: "hoplomachus", classB: "sagittarius", condition: "both_survived",
    lines: [{ speaker: "B", text: "Seven arrows, seven hits. I'm a goddamn poet with a bow." }, { speaker: "A", text: "And I blocked seven swords that were aimed at your 'poetic' hide. You're welcome." }, { speaker: "B", text: "...The arrangement works." }] },
  { id: "v_dim_ess", classA: "dimachaerus", classB: "essedarius", condition: "both_survived",
    lines: [{ speaker: "A", text: "Your charge almost ran over our own murmillo." }, { speaker: "B", text: "Almost is the key word. Besides, the look on his face was worth it." }, { speaker: "A", text: "He's filing a complaint." }, { speaker: "B", text: "He can file it with my horse." }] },
  { id: "v_pro_ves", classA: "provocator", classB: "vestige", condition: "both_survived",
    lines: [{ speaker: "A", text: "I watched you go down. Sword through the chest. Dead. Then you just... got back up." }, { speaker: "B", text: "It's a thing I do." }, { speaker: "A", text: "That's not NORMAL." }, { speaker: "B", text: "Nothing about this place is normal. Relax." }] },
  { id: "v_mur_sag", classA: "murmillo", classB: "sagittarius", condition: "both_survived",
    lines: [{ speaker: "A", text: "Stay behind me. I didn't drag my shield here so you could play hero." }, { speaker: "B", text: "I don't need a shield. I have range." }, { speaker: "A", text: "You have range until someone closes the gap. Then you have my shield." }, { speaker: "B", text: "...Thanks, I guess." }] },
  { id: "v_thr_ess", classA: "thraex", classB: "essedarius", condition: "both_survived",
    lines: [{ speaker: "A", text: "Where did you learn that charging trick? Some military academy?" }, { speaker: "B", text: "The streets of Subura. Everything's a weapon when you grow up hungry enough." }, { speaker: "A", text: "Remind me never to go to Subura." }] },
  { id: "v_sec_hop", classA: "secutor", classB: "hoplomachus", condition: "both_survived",
    lines: [{ speaker: "B", text: "You chased that retreating gladiator clear across the arena. Like a dog after a rabbit." }, { speaker: "A", text: "I'm a secutor. The pursuer. It's literally in the name." }, { speaker: "B", text: "You looked ridiculous." }, { speaker: "A", text: "I looked effective." }] },
  { id: "v_ret_sag", classA: "retiarius", classB: "sagittarius", condition: "both_survived",
    lines: [{ speaker: "A", text: "Good combination out there — you pin them, I reel them in. Like fishing." }, { speaker: "B", text: "Just don't reel me in again. I still have rope burns from last time." }, { speaker: "A", text: "That was once!" }, { speaker: "B", text: "Once was plenty!" }] },
  { id: "v_dim_mur", classA: "dimachaerus", classB: "murmillo", condition: "both_survived",
    lines: [{ speaker: "A", text: "One blade. One shield. Doesn't that feel like you're missing a hand?" }, { speaker: "B", text: "My 'missing hand' stopped three killing blows today. Show some respect to the wood." }] },
  { id: "v_scaeva", classA: "murmillo", classB: null, condition: "scaeva_allied",
    lines: [{ speaker: "A", text: "Scaeva fought beside us today. Thirty years in the arena and the old bastard still hits like a siege engine." }, { speaker: "A", text: "After the bout, he sat in the corner cleaning his blade and humming a lullaby. Scariest thing I've ever seen." }] },
  { id: "v_livia", classA: "thraex", classB: null, condition: "livia_allied",
    lines: [{ speaker: "A", text: "Livia sent one of her agents to fight with us. Senator's spy, my ass — that woman handles a blade like she was born with it." }, { speaker: "A", text: "She killed a man and then straightened her hair. Didn't even breathe hard." }] },
  { id: "v_ferox_mercy", classA: "retiarius", classB: null, condition: "ferox_mercy",
    lines: [{ speaker: "A", text: "Cassius put Ferox down. Quick. Clean. Merciful." }, { speaker: "A", text: "I keep thinking about his eyes in that last moment. Almost looked grateful." }] },
  { id: "v_ferox_spared", classA: "retiarius", classB: null, condition: "ferox_spared",
    lines: [{ speaker: "A", text: "Ferox is alive. Mumbles to himself in the corner of the infirmary. Something about mornings." }, { speaker: "A", text: "The physicians say he's broken beyond repair. But yesterday he smiled at a piece of bread. That's something, right?" }] },
  { id: "v_betrayal", classA: "murmillo", classB: null, condition: "valeria_betrayed",
    lines: [{ speaker: "A", text: "Word in the barracks is Cassius sold someone out for coin. Valeria's people." }, { speaker: "A", text: "I don't judge. We all do ugly things to survive. But I'm sleeping with my eyes open from now on." }] },
  { id: "v_nero_dog", classA: "thraex", classB: null, condition: "nero_deal",
    lines: [{ speaker: "A", text: "We're fighting under the Emperor's eagle now. Fancy shield, fancy armor, same blood." }, { speaker: "A", text: "The crowd loves it. The other gladiators won't look at us. Funny how that works." }] },
  { id: "v_nerva_jokes", classA: "retiarius", classB: "thraex", condition: "both_survived",
    lines: [{ speaker: "A", text: "What's the difference between a gladiator and a donkey?" }, { speaker: "B", text: "I swear if this is another one of Nerva's jokes —" }, { speaker: "A", text: "The donkey gets to retire. Ha!" }, { speaker: "B", text: "...I hate you." }] },
  { id: "v_sam_pro", classA: "samnite", classB: "provocator", condition: "both_survived",
    lines: [{ speaker: "A", text: "You kept taunting that secutor until he charged right into my spear." }, { speaker: "B", text: "Provocator. It's in the name." }, { speaker: "A", text: "He looked really angry." }, { speaker: "B", text: "They always look angry. Right up until they don't." }] },
];

// ─── Mission Lookup Map ──────────────────────────────────────────────

var CAMPAIGN_MAP = {};
(function () {
  for (var i = 0; i < CAMPAIGN_MISSIONS.length; i++) {
    CAMPAIGN_MAP[CAMPAIGN_MISSIONS[i].id] = CAMPAIGN_MISSIONS[i];
  }
})();

function _hashMissionId(id) {
  var h = 0;
  for (var i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || 1;
}

// ─── Campaign State ─────────────────────────────────────────────────

var campaignState = {
  active: false,
  missionId: "0",
  denarii: 0,
  flags: {},
  survivingRoster: [],
  ritualMeter: 0,
  totalDeaths: 0,
  endingKey: null,
  difficulty: "normal",
  campaignStats: { totalBattles: 0, totalKills: 0, totalDamage: 0, totalTurns: 0, deathlessBattles: 0, classesUsed: {}, peakDenarii: 0 },
  inventory: [],
  newGamePlus: 0,
};

// ─── Helper Functions ───────────────────────────────────────────────

var Campaign = {

  getMission: function () {
    if (!campaignState.active) return null;
    return CAMPAIGN_MAP[campaignState.missionId] || null;
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
    if (!m) return _VALID_CLASS_IDS.slice();
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
    if (!name) return true;
    var key = name.toLowerCase() + "_alive";
    if (campaignState.flags[key] === false) return false;
    return true;
  },

  checkCondition: function (cond) {
    if (!cond) return true;
    if (cond.charAt(0) === "!") return !this.checkCondition(cond.slice(1));
    if (cond.length > 6 && cond.slice(-6) === "_alive") return this.isNamedAlive(cond.slice(0, -6));
    return this.getFlag(cond);
  },

  saveSurvivors: function (units, carryHp, skipDeathCount, deployedUids) {
    var survivors = [];
    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      if (u.team === "player" && (u.hp > 0 || skipDeathCount)) {
        var totalKills = (u.kills || 0);
        var title = null;
        if (totalKills >= 25) title = "Legend";
        else if (totalKills >= 15) title = "Champion";
        else if (totalKills >= 8) title = "Veteran";
        else if (totalKills >= 3) title = "Blooded";
        var ndc = u.nearDeathCount || 0;
        if (u.hp > 0 && u.hp < u.maxHp * 0.25) ndc++;
        var safeMaxHp = u.maxHp || 10;
        var safeHp = Math.min(Math.max(1, u.hp || safeMaxHp), safeMaxHp);
        var entry = {
          uid: u.uid || ("surv_" + i),
          classId: u.classId,
          name: u.displayName || null,
          hp: (carryHp && !skipDeathCount) ? safeHp : safeMaxHp,
          maxHp: safeMaxHp,
          isFree: u.isFree || false,
          level: u.level || 1,
          xp: u.xp || 0,
          kills: u.kills || 0,
          battlesSurvived: (u.battlesSurvived || 0) + (skipDeathCount ? 0 : 1),
          nearDeathCount: ndc,
          title: title,
          bonusHp:  u.bonusHp  || 0,
          bonusAtk: u.bonusAtk || 0,
          bonusDef: u.bonusDef || 0,
          bonusSpd: u.bonusSpd || 0,
        };
        if (u.gifted) entry.gifted = true;
        if (u.accent) entry.accent = u.accent;
        if (u.promotionId) entry.promotionId = u.promotionId;
        if (u.equipment) entry.equipment = u.equipment;
        survivors.push(entry);
      }
    }
    var dead = [];
    for (var j = 0; j < units.length; j++) {
      var d = units[j];
      if (d.team === "player" && d.hp <= 0) {
        dead.push(d);
        if (!skipDeathCount) {
          campaignState.totalDeaths++;
          if (d.displayName) {
            campaignState.flags[d.displayName.toLowerCase() + "_alive"] = false;
          }
        }
      }
    }
    campaignState.survivingRoster = survivors;

    // Bond pair tracking (skip for training bouts; only count deployed units)
    if (!skipDeathCount) {
      if (typeof campaignState.flags._bondCounts !== "object" || campaignState.flags._bondCounts === null || Array.isArray(campaignState.flags._bondCounts)) campaignState.flags._bondCounts = {};
      if (!Array.isArray(campaignState.flags._bondPairs)) campaignState.flags._bondPairs = [];
      var bondPool = deployedUids
        ? survivors.filter(function (s) { return deployedUids[s.uid]; })
        : survivors;
      for (var pi = 0; pi < bondPool.length; pi++) {
        for (var pj = pi + 1; pj < bondPool.length; pj++) {
          var _a = bondPool[pi].uid, _b = bondPool[pj].uid;
          if (!_a || !_b) continue;
          var pairKey = _a < _b ? _a + "|" + _b : _b + "|" + _a;
          campaignState.flags._bondCounts[pairKey] = (campaignState.flags._bondCounts[pairKey] || 0) + 1;
          if (campaignState.flags._bondCounts[pairKey] >= 3) {
            var exists = campaignState.flags._bondPairs.some(function(bp) { return bp === pairKey; });
            if (!exists) campaignState.flags._bondPairs.push(pairKey);
          }
        }
      }
    }

    return { survivors: survivors, dead: dead };
  },

  _resolveNext: function (next) {
    if (!next || next === "end") return null;
    if (typeof next === "string") return next;
    if (Array.isArray(next)) {
      for (var i = 0; i < next.length; i++) {
        var entry = next[i];
        if (!entry.condition || this.checkCondition(entry.condition)) {
          return entry.goto || null;
        }
      }
    }
    return null;
  },

  advance: function (won) {
    var m = this.getMission();
    if (!m) return null;

    if (won) {
      campaignState.denarii += (m.victoryBonus || 0);
      var playerDied = campaignState.survivingRoster.length <
        (typeof campaignState._preBattleCount === "number" ? campaignState._preBattleCount : 99);
      if (!playerDied) campaignState.denarii += (m.perfectBonus || 0);

      var flags = m.flagsToSet || [];
      for (var i = 0; i < flags.length; i++) {
        this.setFlag(flags[i]);
      }
      campaignState.ritualMeter = (m.ritualMeter || 0);

      if (campaignState.flags.nerva_sacrificed) {
        campaignState.survivingRoster = campaignState.survivingRoster.filter(function (s) {
          return s.name !== "Nerva";
        });
      }

      var nextId = this._resolveNext(m.next);
      campaignState.missionId = nextId;
    }

    return this.getMission();
  },

  isFinished: function () {
    return campaignState.missionId == null;
  },

  getEndingScenes: function (key) {
    var m13 = CAMPAIGN_MAP["13"];
    if (!m13 || !m13.endingScenes) return [];
    return m13.endingScenes[key] || [];
  },

  reset: function () {
    campaignState.active = false;
    campaignState.missionId = "0";
    campaignState.denarii = 0;
    campaignState.flags = {};
    campaignState.survivingRoster = [];
    campaignState.ritualMeter = 0;
    campaignState.totalDeaths = 0;
    campaignState.endingKey = null;
    campaignState._preBattleCount = 0;
    campaignState.difficulty = "normal";
    campaignState.campaignStats = { totalBattles: 0, totalKills: 0, totalDamage: 0, totalTurns: 0, deathlessBattles: 0, classesUsed: {}, peakDenarii: 0 };
    campaignState.inventory = [];
    campaignState.newGamePlus = 0;
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
      var ar = alliance[i];
      if (this.getFlag(ar.flag) && (!ar.condition || this.checkCondition(ar.condition))) {
        recruits.push(ar);
      }
    }
    return recruits;
  },

  getMissionLabel: function () {
    var m = this.getMission();
    if (!m) return "";
    if (typeof I18n !== "undefined" && I18n.t && I18n.missionTitle) {
      var title = I18n.missionTitle(m.id) || m.title;
      return I18n.t("campaign.missionLine", { id: m.id, title: title });
    }
    return "Mission " + m.id + ": " + m.title;
  },

  getActLabel: function () {
    var m = this.getMission();
    if (!m) return "";
    if (typeof I18n !== "undefined" && I18n.actLabel) {
      var al = I18n.actLabel(m.act);
      if (al) return al;
    }
    var names = { 1: "Act I: The Tournament", 2: "Act II: The Descent", 3: "Act III: The Ratio" };
    return names[m.act] || "";
  },

  // ─── Persistence (localStorage) ──────────────────────────────────

  _SAVE_KEY_PREFIX: "geminus_campaign_v2",
  _activeSlot: 0,

  _slotKey: function (slot) {
    if (slot == null) slot = this._activeSlot;
    return this._SAVE_KEY_PREFIX + "_slot_" + slot;
  },

  setSlot: function (slot) { this._activeSlot = Math.max(0, Math.min(2, parseInt(slot, 10) || 0)); },
  getSlot: function () { return this._activeSlot; },

  saveToDisk: function () {
    if (!campaignState.active) return true;
    try {
      var data = {
        version: 3,
        active: campaignState.active,
        missionId: campaignState.missionId,
        denarii: campaignState.denarii,
        flags: campaignState.flags,
        survivingRoster: campaignState.survivingRoster,
        ritualMeter: campaignState.ritualMeter,
        totalDeaths: campaignState.totalDeaths,
        endingKey: campaignState.endingKey,
        _preBattleCount: campaignState._preBattleCount || 0,
        difficulty: campaignState.difficulty || "normal",
        campaignStats: campaignState.campaignStats || {},
        inventory: campaignState.inventory || [],
        newGamePlus: campaignState.newGamePlus || 0,
        savedAt: Date.now(),
      };
      if (data.campaignStats) {
        data.campaignStats.peakDenarii = Math.max(data.campaignStats.peakDenarii || 0, campaignState.denarii || 0);
      }
      localStorage.setItem(this._slotKey(), JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  },

  _V2_INDEX_TO_ID: ["0","1","2","3","4A","5A","6","7","8","9","10","11","12","13"],

  _sanitizeSaveData: function (data) {
    if (!data || typeof data !== "object" || !data.active) return null;
    var saveVersion = parseInt(data.version, 10) || 1;
    if (saveVersion < 2) {
      if (!data.campaignStats) data.campaignStats = { totalBattles: 0, totalKills: 0, totalDamage: 0, totalTurns: 0, deathlessBattles: 0, classesUsed: {}, peakDenarii: 0 };
      if (!Array.isArray(data.inventory)) data.inventory = [];
    }
    if (saveVersion < 3) {
      var idx = parseInt(data.missionIndex, 10) || 0;
      data.missionId = this._V2_INDEX_TO_ID[idx] || "0";
      delete data.missionIndex;
    }
    var mid = (typeof data.missionId === "string") ? data.missionId : null;
    if (mid !== null && !CAMPAIGN_MAP[mid]) return null;
    var roster = Array.isArray(data.survivingRoster) ? data.survivingRoster : [];
    roster = roster.filter(function (s) {
      return s && typeof s.classId === "string" && _VALID_CLASS_IDS.indexOf(s.classId) !== -1;
    });
    var _uidSeen = {};
    roster = roster.map(function (s) {
      var mHp = Math.max(1, parseInt(s.maxHp, 10) || 10);
      var hp = Math.min(mHp, Math.max(1, parseInt(s.hp, 10) || mHp));
      var uid = (typeof s.uid === "string" && s.uid) ? s.uid : ("unit_" + Math.random().toString(36).slice(2, 8));
      if (_uidSeen[uid]) uid = uid + "_" + Math.random().toString(36).slice(2, 6);
      _uidSeen[uid] = true;
      s.hp = hp;
      s.maxHp = mHp;
      s.level = Math.max(1, Math.min(10, parseInt(s.level, 10) || 1));
      s.xp = Math.max(0, parseInt(s.xp, 10) || 0);
      s.uid = uid;
      s.kills = Math.max(0, parseInt(s.kills, 10) || 0);
      s.battlesSurvived = Math.max(0, parseInt(s.battlesSurvived, 10) || 0);
      s.nearDeathCount = Math.max(0, parseInt(s.nearDeathCount, 10) || 0);
      s.bonusHp  = Math.max(0, parseInt(s.bonusHp,  10) || 0);
      s.bonusAtk = Math.max(0, parseInt(s.bonusAtk, 10) || 0);
      s.bonusDef = Math.max(0, parseInt(s.bonusDef, 10) || 0);
      s.bonusSpd = Math.max(0, parseInt(s.bonusSpd, 10) || 0);
      if (s.name != null && typeof s.name !== "string") s.name = "";
      if (s.title != null && typeof s.title !== "string") s.title = "";
      s.isFree = !!s.isFree;
      s.gifted = !!s.gifted;
      if (s.promotionId != null && typeof s.promotionId !== "string") s.promotionId = null;
      if (s.accent != null && (typeof s.accent !== "string" || s.accent.length > 30)) s.accent = null;
      if (s.equipment && typeof s.equipment === "object" && !Array.isArray(s.equipment)) {
        var _validSlot = function(v) { return v === null || typeof v === "string"; };
        if (!_validSlot(s.equipment.weapon)) s.equipment.weapon = null;
        if (!_validSlot(s.equipment.armor))  s.equipment.armor  = null;
        if (!_validSlot(s.equipment.trinket)) s.equipment.trinket = null;
      } else {
        s.equipment = null;
      }
      return s;
    });
    if (typeof data.flags !== "object" || data.flags === null || Array.isArray(data.flags)) data.flags = {};
    if (Array.isArray(data.flags._bondPairs)) {
      data.flags._bondPairs = data.flags._bondPairs.filter(function(bp) { return typeof bp === "string"; });
    }
    if (data.flags._bondCounts && (typeof data.flags._bondCounts !== "object" || Array.isArray(data.flags._bondCounts))) {
      data.flags._bondCounts = {};
    }
    if (data.flags._bondCounts && typeof data.flags._bondCounts === "object") {
      var _bc = data.flags._bondCounts;
      for (var _bk in _bc) {
        if (_bc.hasOwnProperty(_bk)) _bc[_bk] = Math.max(0, parseInt(_bc[_bk], 10) || 0);
      }
    }
    data.missionId = mid;
    data.survivingRoster = roster;
    data.denarii = Math.max(0, parseInt(data.denarii, 10) || 0);
    data.ritualMeter = Math.max(0, parseInt(data.ritualMeter, 10) || 0);
    data.totalDeaths = Math.max(0, parseInt(data.totalDeaths, 10) || 0);
    data.endingKey = (typeof data.endingKey === "string" && /^[a-e]$/.test(data.endingKey)) ? data.endingKey : null;
    data.difficulty = (data.difficulty === "easy" || data.difficulty === "hard") ? data.difficulty : "normal";
    var rawStats = (typeof data.campaignStats === "object" && data.campaignStats) ? data.campaignStats : {};
    data.campaignStats = {
      totalBattles:    Math.max(0, parseInt(rawStats.totalBattles, 10) || 0),
      totalKills:      Math.max(0, parseInt(rawStats.totalKills, 10) || 0),
      totalDamage:     Math.max(0, parseInt(rawStats.totalDamage, 10) || 0),
      totalTurns:      Math.max(0, parseInt(rawStats.totalTurns, 10) || 0),
      deathlessBattles: Math.max(0, parseInt(rawStats.deathlessBattles, 10) || 0),
      classesUsed:     (typeof rawStats.classesUsed === "object" && rawStats.classesUsed && !Array.isArray(rawStats.classesUsed)) ? rawStats.classesUsed : {},
      peakDenarii:     Math.max(0, parseInt(rawStats.peakDenarii, 10) || 0),
    };
    data.inventory = (Array.isArray(data.inventory) ? data.inventory : []).filter(function(it) {
      return typeof it === "string" && it.length > 0;
    });
    data.newGamePlus = Math.max(0, parseInt(data.newGamePlus, 10) || 0);
    data.savedAt = (typeof data.savedAt === "number" && isFinite(data.savedAt)) ? data.savedAt : 0;
    var _pbc = parseInt(data._preBattleCount, 10);
    data._preBattleCount = (_pbc > 0 && _pbc <= roster.length) ? _pbc : roster.length;
    return data;
  },

  loadFromDisk: function (slot) {
    if (slot != null) this._activeSlot = Math.max(0, Math.min(2, parseInt(slot, 10) || 0));
    try {
      var raw = localStorage.getItem(this._slotKey());
      if (!raw) return false;
      var data = JSON.parse(raw);
      data = this._sanitizeSaveData(data);
      if (!data) return false;
      campaignState.active = true;
      campaignState.missionId = data.missionId;
      campaignState.denarii = data.denarii;
      campaignState.flags = data.flags;
      campaignState.survivingRoster = data.survivingRoster;
      campaignState.ritualMeter = data.ritualMeter;
      campaignState.totalDeaths = data.totalDeaths;
      campaignState.endingKey = data.endingKey;
      var _pbc = parseInt(data._preBattleCount, 10);
      campaignState._preBattleCount = (_pbc > 0) ? _pbc : data.survivingRoster.length;
      campaignState.difficulty = data.difficulty;
      campaignState.campaignStats = data.campaignStats;
      campaignState.inventory = data.inventory;
      campaignState.newGamePlus = parseInt(data.newGamePlus, 10) || 0;
      return true;
    } catch (e) { return false; }
  },

  startNewGamePlus: function () {
    var ngLevel = (campaignState.newGamePlus || 0) + 1;
    var roster = campaignState.survivingRoster.slice();
    var inventory = (campaignState.inventory || []).slice();
    var denarii = campaignState.denarii || 0;
    var diff = campaignState.difficulty || "normal";
    var stats = campaignState.campaignStats;
    this.reset();
    campaignState.active = true;
    campaignState.missionId = "0";
    campaignState.newGamePlus = ngLevel;
    campaignState.survivingRoster = roster;
    campaignState.inventory = inventory;
    campaignState.denarii = denarii;
    campaignState.difficulty = diff;
    campaignState.campaignStats = stats;
    this.saveToDisk();
  },

  clearSave: function (slot) {
    var key = this._slotKey(slot != null ? slot : this._activeSlot);
    try { localStorage.removeItem(key); } catch (e) { /* ok */ }
  },

  hasSave: function (slot) {
    var key = this._slotKey(slot != null ? slot : this._activeSlot);
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return false;
      var data = JSON.parse(raw);
      return !!this._sanitizeSaveData(data);
    } catch (e) { return false; }
  },

  getSlotSummary: function (slot) {
    var key = this._slotKey(slot);
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      var data = JSON.parse(raw);
      data = this._sanitizeSaveData(data);
      if (!data) return null;
      var m = CAMPAIGN_MAP[data.missionId];
      var missionName;
      if (m) {
        if (typeof I18n !== "undefined" && I18n.t && I18n.missionTitle) {
          var mt = I18n.missionTitle(m.id) || m.title;
          missionName = I18n.t("campaign.slotLine", { id: m.id, title: mt });
        } else {
          missionName = "M" + m.id + ": " + m.title;
        }
      } else {
        missionName = (typeof I18n !== "undefined" && I18n.t) ? I18n.t("campaign.completed") : "Completed";
      }
      return {
        slot: slot,
        missionName: missionName,
        savedAt: typeof data.savedAt === "number" ? data.savedAt : 0,
        rosterSize: data.survivingRoster.length,
      };
    } catch (e) { return null; }
  },

  exportSave: function (slot) {
    var key = this._slotKey(slot != null ? slot : this._activeSlot);
    try { return localStorage.getItem(key) || null; } catch (e) { return null; }
  },

  importSave: function (jsonString, slot) {
    var data;
    try {
      data = JSON.parse(jsonString);
    } catch (e) {
      return "parse";
    }
    data = this._sanitizeSaveData(data);
    if (!data) return "invalid";
    try {
      var key = this._slotKey(slot != null ? slot : this._activeSlot);
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      if (e && e.name === "QuotaExceededError") return "quota";
      return "invalid";
    }
  },

  migrateOldSave: function () {
    try {
      var oldKey = "geminus_campaign_v2";
      var raw = localStorage.getItem(oldKey);
      if (!raw) return;
      if (!this.hasSave(0)) {
        localStorage.setItem(this._slotKey(0), raw);
      }
      localStorage.removeItem(oldKey);
    } catch (e) { /* ok */ }
  },
};
