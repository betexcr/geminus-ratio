# Geminus Ratio — Campaign Design Document

> Reference: [Lore Bible](lore-bible.md) for narrative details, character backgrounds, and world-building.

---

## I. Campaign Overview

### Structure

The campaign consists of **12 missions** across three acts, plus a **final confrontation** that plays differently depending on the player's choices. Total play time target: 3-5 hours.

| Act | Missions | Focus | Tone |
|-----|----------|-------|------|
| **I: The Tournament** | 1-5 | Arena politics, rival lanistae, the conspiracy's surface | Grounded, tense, competitive |
| **II: The Descent** | 6-9 | Supernatural revelation, the hypogeum, Titus's fate | Unsettling, escalating dread |
| **III: The Ratio** | 10-12 + Finale | The gauntlet, alliances, the final choice | Desperate, horrific, cathartic |

### Persistent Campaign State

Between missions, the game tracks:

- **Roster:** Which gladiators survived the previous mission. Dead gladiators are gone permanently. Named characters who die trigger specific narrative consequences.
- **Denarii:** The player's budget for hiring. Grows after each victory. Carries over between missions (unspent denarii persist).
- **Alliance Flags:** Boolean flags tracking relationship milestones with Livia, Scaeva, and Valeria. These gate dialogue options, roster unlocks, and ending availability.
- **Ritual Meter:** A hidden progress value (0-100) representing how close the ritual is to completion. Rises each mission. Certain player actions can slow it marginally. Affects the intensity of supernatural manifestations in later missions.

### Expanded Game Loop

The current loop is: **Ludus -> Deploy -> Battle**

The campaign loop becomes:

```
Story Scene (pre-mission)
    -> Ludus (hire/manage roster within budget)
    -> Deploy (place units on the grid)
    -> Battle (tactical combat)
    -> Result Scene (post-mission narrative, unlocks, choices)
```

**Story scenes** are text-driven sequences with speaker names, dialogue, and occasional player choices. They display over the existing UI using a dialogue overlay. No voice acting — text only, matching the VT323/Cinzel aesthetic.

---

## II. Progression Curve

### Budget Scaling

The player's denarii budget grows across the campaign. Unspent denarii carry over, rewarding efficiency.

| Mission | Base Budget | Cumulative Max | Notes |
|---------|-------------|----------------|-------|
| 1 | 100 | 100 | Tutorial-sized roster, 3-4 fighters |
| 2 | 110 | ~120 | Slight bump, Lurco rematch pressure |
| 3 | 120 | ~135 | Nerva joins free (24 cost saved) |
| 4 | 120 | ~140 | Standard, but rigged bout drains resources |
| 5 | 130 | ~150 | Preparing for Titus reveal |
| 6 | 130 | ~155 | First Gifted encounter |
| 7 | 140 | ~165 | Aemilia joins free if Scaeva trusts you |
| 8 | 140 | ~170 | Valeria's fighters available if allied |
| 9 | 150 | ~180 | The temple — hardest fight yet |
| 10 | 150 | ~185 | Gauntlet begins |
| 11 | 160 | ~195 | Alliance payoff — bonus fighters |
| 12 | 160 | ~200 | Penultimate battle |
| Finale | Special | — | Fixed roster, see Mission 13 |

**Victory bonus:** +15 denarii added to the pool after each win. An additional +5 if no gladiators died.

### Class Unlocks

Not all 8 gladiator classes are available from the start. Unlocks create a sense of progression and tie to story beats.

| Mission | Newly Available |
|---------|-----------------|
| 1 | Murmillo, Retiarius, Samnite, Thraex (4 starter classes) |
| 3 | Secutor, Hoplomachus (Livia's contacts expand the market) |
| 5 | Provocator, Dimachaerus (full roster unlocked after Act I) |
| 8 | Gifted Recruit — Ferox (if Valeria allied, see Choice Branches) |

### Enemy Scaling

| Act | Enemy Budget Multiplier | Max Enemies | Gifted Count | Notes |
|-----|------------------------|-------------|--------------|-------|
| I (1-5) | 1.0x - 1.15x | 4-5 | 0 | Standard gladiators, rival lanista compositions |
| II (6-9) | 1.15x - 1.3x | 5-6 | 1-2 | Gifted introduced at Mission 6 |
| III (10-12) | 1.3x - 1.5x | 5-6 | 2-4 | Gifted-heavy, map modifiers stack |
| Finale | Fixed | 1 (Titus) + 2-4 Gifted | All | Unique encounter, see Mission 13 |

### Difficulty Tuning Principles

- **Gifted fighters are quality, not quantity.** A single Gifted in a squad of normal enemies creates tactical problems. Three Gifted in a squad is a crisis. The campaign never fields more than 4 at once (finale excepted).
- **Map modifiers compensate for stat inflation.** Rather than just making enemies numerically stronger, Act III difficulty comes from the arena itself: cursed tiles, shifting sand, crowd interference.
- **Named allies are pressure valves.** Alliance-locked recruits (Nerva, Aemilia, Ferox) give the player powerful options to offset escalating difficulty. Players who miss alliances face a harder but not impossible late game.
- **The finale is not about winning a fair fight.** It has a unique win condition. See Mission 13.

---

## III. Mission Specifications

---

### Mission 1: "The Summons"

**Story Beat:** #1 — The Summons
**Ritual Meter:** 5/100

**Pre-Battle Scene:**
- NARRATOR: The Ludi Aeternales have been announced. Every ludus in the empire is called.
- CASSIUS: (internal) The debts are piling up. Publius's ludus barely fills a practice yard. But the prize money...
- A MESSENGER arrives: a rumor — a gladiator matching Titus's description has been seen in the qualifying rounds. A twin. Fighting under no lanista's name.
- CASSIUS: (internal) Fifteen years. I'd given up hoping. I haven't stopped looking.
- No player choice. This is the hook.

**Encounter:**
- **Enemy lanista:** Unnamed provincial rival (not a story character)
- **Enemy comp:** 3 units — Samnite, Murmillo, Thraex
- **Enemy budget:** 1.0x player spending
- **Placement:** Enemies on wall row (y=0-1), player on gate row (y=9)

**Map Modifiers:** None. Clean arena, standard height field. The tutorial fight.

**Win Condition:** Defeat all enemies.

**Post-Battle Scene:**
- The crowd is indifferent — a qualifying bout, nothing special. But Cassius is in.
- CASSIUS: (internal) The Colosseum. I never thought I'd stand here.
- A glimpse across the hypogeum corridor: a tall fighter is led past by two arena officials. His face is turned away. Cassius calls out. The officials walk faster.
- Sets flag: `campaign_started`

**Unlocks:** +15 denarii bonus. Access to Mission 2.

---

### Mission 2: "First Blood"

**Story Beat:** #2 — First Blood
**Ritual Meter:** 12/100

**Pre-Battle Scene:**
- The Colosseum proper. Fifty thousand voices.
- LURCO approaches before the match. He recognizes Cassius's ludus — small, underfunded, beneath notice.
- LURCO: "Publius's boy. I heard the old man died in debt. Fitting you'd come here to do the same."
- CASSIUS: (dialogue option, flavor only — no mechanical consequence)
  - A) "We'll see who the sand remembers." (defiant)
  - B) [Silence] (stoic)
- LURCO: "My fighters don't lose to strays."

**Encounter:**
- **Enemy lanista:** Gnaeus Lurco
- **Enemy comp:** 4 units — Provocator, Samnite, Samnite, Provocator
- **Enemy budget:** 1.1x player spending
- **Placement:** Standard. Lurco's fighters favor the center.
- **AI behavior:** Aggressive. Provocators use Provocatio early to lock down the player's best fighter.

**Map Modifiers:** None. Standard Colosseum arena.

**Win Condition:** Defeat all enemies.

**Post-Battle Scene:**
- The crowd stirs. A small ludus beating Lurco's funded brutes — that's a story.
- LURCO: (furious, post-match corridor) "You have no idea whose games these are, boy."
- NARRATOR: That night, Cassius hears his gladiators talking. Strange dreams. A dark room. Breathing that isn't theirs.
- Sets flag: `lurco_defeated_1`

**Unlocks:** +15 denarii. Lurco established as recurring antagonist.

---

### Mission 3: "The Conspirator"

**Story Beat:** #3 — Livia's Approach
**Ritual Meter:** 20/100

**Pre-Battle Scene:**
- A woman in a senator's stola finds Cassius in the ludus quarter after hours.
- LIVIA: "You beat Lurco. That's not easy. It's also not supposed to happen."
- She explains: the brackets aren't random. Certain lanistae always advance. Others are matched against impossible odds. Senators who oppose the Emperor have had their personal gladiators entered — and killed.
- LIVIA: "I need eyes inside the tournament. Someone the Editor hasn't already bought."
- PLAYER CHOICE:
  - A) **"I'm listening."** — Accept Livia's intel network. Sets flag: `livia_allied_early`. Unlocks Secutor and Hoplomachus for hire. Livia provides pre-battle intel in future missions.
  - B) **"I'm here for my brother, not your politics."** — Decline for now. Classes still unlock (through other channels), but Livia's intel is delayed until she approaches again at Mission 5. No flag set.
- Regardless of choice, LIVIA: "There's a Retiarius in the slave market. Good fighter, cheap. Consider it a gift." — **Nerva** becomes available.

**Encounter:**
- **Enemy lanista:** A mid-tier opponent aligned with the Imperial Court
- **Enemy comp:** 4 units — Secutor, Thraex, Murmillo, Retiarius
- **Enemy budget:** 1.1x
- **Placement:** Standard.
- **Special:** If `livia_allied_early`, a pre-deploy intel note appears: "Livia's informant says their Secutor always charges the left flank."

**Map Modifiers:** Subtle — one cluster of tiles near center has height 0 instead of the normal height variance. Cosmetically, the sand is slightly darker there. No mechanical effect yet. Foreshadowing.

**Win Condition:** Defeat all enemies.

**Post-Battle Scene:**
- NERVA: (if hired) "Not bad for a first outing. I've had worse lanistae. Most of them are dead, but still."
- NARRATOR: The dead gladiator from the opposing side is carried out through the hypogeum. As the stretcher passes, Cassius notices something: the body's hand twitches. A spasm. Probably a spasm.

**Unlocks:** Nerva (Retiarius, free recruit — see Named Characters). Secutor and Hoplomachus available for hire. +15 denarii.

---

### Mission 4: "The Rigged Bout"

**Story Beat:** #4 — The Rigged Bout
**Ritual Meter:** 30/100

**Pre-Battle Scene:**
- Before Cassius's match, he watches another bout from the holding area.
- A gladiator named CORVINUS — strong, experienced, favored to win — enters the arena against an unremarkable opponent. Corvinus fights brilliantly for two rounds, then suddenly drops his guard. He dies on the sand.
- CASSIUS: (internal) He threw that fight. I've seen enough bouts to know. But why?
- After the match, Corvinus's lanista — a man named FABIUS — is found dead in his cell. Officials say heart failure.
- If `livia_allied_early`: LIVIA: (message) "Fabius was asking questions about the brackets. Now he's dead. Be careful."
- NARRATOR: Cassius's match is next. His opponent: one of the Emperor's sponsored lanistae. The crowd is watching.

**Encounter:**
- **Enemy lanista:** Imperial-sponsored (unnamed)
- **Enemy comp:** 5 units — Murmillo, Provocator, Samnite, Secutor, Thraex
- **Enemy budget:** 1.15x (first real spike)
- **Placement:** Standard, but one enemy Samnite starts on a height-2 tile (advantageous position).
- **AI behavior:** The Provocator targets the player's highest-ATK unit with Provocatio immediately.

**Map Modifiers:** Two "dark sand" tiles in the arena center (height 0, cosmetically stained). No mechanical effect. The ritual meter is rising but not yet affecting the arena.

**Win Condition:** Defeat all enemies.

**Post-Battle Scene:**
- Victory, but Cassius is shaken. Fabius is dead. The brackets are rigged. And somewhere in this tournament, his brother is fighting.
- SCAEVA appears in the corridor. He says nothing. He looks at Cassius for a long moment, then walks away.
- If `livia_allied_early`: LIVIA: "Tomorrow's matches include a fighter from the Editor's personal stable. I've never seen one fight before. Have you?"

**Unlocks:** +15 denarii. Story flag: `rigged_bout_witnessed`.

---

### Mission 5: "The Ghost in the Sand"

**Story Beat:** #5 — First Glimpse of Titus
**Ritual Meter:** 40/100

**Pre-Battle Scene:**
- Before Cassius's match, another bout is staged. The crowd is electric — the Editor's champion is fighting.
- TITUS enters the arena. Cassius recognizes him instantly — the jawline, the stance, the way he holds his shoulders. But everything else is wrong.
- NARRATOR: Titus fights a team of four gladiators. He dismantles them in minutes. He moves like something that learned to move by watching humans and decided it could do better. The crowd screams. Titus's face shows nothing.
- After the bout, Cassius pushes through the crowd toward the hypogeum entrance. Arena officials — men in dark tunics — block his path.
- OFFICIAL: "The Editor's fighters are in seclusion between bouts. No visitors."
- CASSIUS: "That's my brother."
- OFFICIAL: (pause) "I don't know what you mean." They close the gate.
- If NOT `livia_allied_early`: Livia approaches now. "You saw him. You see why I need you." — Sets `livia_allied_late`. Same effect as early alliance going forward.
- PLAYER CHOICE:
  - A) **Tell Livia about Titus.** — Sets `livia_knows_twin`. She incorporates this into her intelligence. Stronger intel in Act II.
  - B) **Keep Titus secret.** — Cassius plays it close. No intel bonus, but Livia can't use Titus as leverage later.

**Encounter:**
- **Enemy lanista:** Valeria Corvus (first encounter as opponent)
- **Enemy comp:** 5 units — Thraex, Dimachaerus, Thraex, Dimachaerus, Secutor
- **Enemy budget:** 1.15x
- **AI behavior:** Aggressive, high-mobility. Valeria's fighters swarm and flank.

**Map Modifiers:** The dark sand patches from Mission 4 have spread. Three tiles now have a faint visual distortion (the renderer jitters their height slightly each frame). No mechanical effect yet. Players who notice will feel uneasy.

**Win Condition:** Defeat all enemies.

**Post-Battle Scene:**
- VALERIA: (post-match, respectful) "Good fight. Your old man taught you well."
- CASSIUS: "You knew Publius?"
- VALERIA: "My husband did. Before..." (she trails off, changes subject)
- NARRATOR: That night, Cassius dreams of the dark room. The stone floor. The breathing. He wakes with the taste of iron in his mouth.
- Provocator and Dimachaerus unlock for hire. All 8 base classes now available.

**Unlocks:** Full class roster. +15 denarii. Story flag: `titus_glimpsed`. Valeria introduced as potential ally.

---

### Mission 6: "Into the Dark"

**Story Beat:** #6 — The Lower Hypogeum
**Ritual Meter:** 50/100

**Pre-Battle Scene:**
- Cassius descends into the hypogeum after hours, following the corridor Titus was led through.
- NARRATOR: The brick gives way to older stone. The air changes — colder, wetter, wrong. Torches on the walls flicker in unison, a slow pulse like breathing.
- Cassius finds a chamber. Inside: FEROX, sitting motionless on a stone bench. His eyes are open but unfocused. When Cassius speaks, Ferox turns his head with mechanical precision.
- FEROX: (flat, empty) "You should not be here. The Editor does not allow visitors."
- CASSIUS: "What did they do to you?"
- FEROX: (long pause) "They made me better." (He smiles. It does not reach his eyes.)
- Arena officials discover Cassius. He is escorted out and told his next match has been "moved up."
- NARRATOR: The match is against the Editor's fighters. This is a warning.

**Encounter:**
- **Enemy faction:** The Cult's stable
- **Enemy comp:** 5 units — Secutor, Murmillo, Thraex, Samnite, **Ferox (Gifted Dimachaerus)**
- **Enemy budget:** 1.2x (Ferox is fixed, remaining budget fills standard units)
- **Ferox stats:** See Gifted Fighter Specs — enhanced Dimachaerus with unique ability "Binding Fury"
- **AI behavior:** Standard units fight normally. Ferox targets the player's weakest unit relentlessly.

**Map Modifiers:**
- **Cursed Tiles (x3):** Three tiles glow faintly dark. Any unit ending its turn on a cursed tile loses 3 HP. These are the "dark sand" patches from previous missions — now mechanically active.
- Visual: occasional sand particle effects rising from cursed tiles.

**Win Condition:** Defeat all enemies (including Ferox).

**Post-Battle Scene:**
- Ferox, when defeated, does not collapse like normal gladiators. He kneels, slowly, and his eyes focus for the first time.
- FEROX: (whisper) "...I remember mornings." Then he goes still.
- NARRATOR: The crowd is silent for three heartbeats. Then they cheer. They don't know why they were silent.
- If Nerva survived: NERVA: "That fighter... he wasn't right. His eyes. Did you see his eyes?"

**Unlocks:** +15 denarii. Story flag: `gifted_encountered`. The word "Gifted" appears in Cassius's internal monologue going forward.

---

### Mission 7: "The Old Wolf"

**Story Beat:** #7 — Scaeva's Warning
**Ritual Meter:** 58/100

**Pre-Battle Scene:**
- SCAEVA corners Cassius in the ludus quarter.
- SCAEVA: "I've been doing this for thirty years. I've seen lanistae poke around the lower levels. Ask questions. I've seen what happens to them."
- CASSIUS: "What happens?"
- SCAEVA: "They stop asking. One way or another." (beat) "Your father was a man who asked questions too."
- CASSIUS: "You knew my father?"
- SCAEVA: "I knew Gaius Geminus. I know what he died for. And I'm telling you — what's down there is bigger than one man's courage."
- PLAYER CHOICE:
  - A) **"Then help me."** — Sets `scaeva_asked`. If the player has shown strength (won all previous missions without losing more than 2 gladiators total), Scaeva agrees reluctantly. Sets `scaeva_allied`. Aemilia (Hoplomachus) joins the roster free.
  - B) **"I understand the warning."** — Respectful decline. Scaeva nods. No alliance, but no enmity. Aemilia is available for hire at normal cost instead.

**Encounter:**
- **Enemy lanista:** Lurco rematch (he demanded it through Imperial channels)
- **Enemy comp:** 5 units — Provocator, Provocator, Samnite, Samnite, Murmillo. All have a +1 ATK buff (Lurco spent money on better equipment since last time).
- **Enemy budget:** 1.25x
- **AI behavior:** Provocators double-team the player's star fighter. Samnites push aggressively.

**Map Modifiers:**
- **Cursed Tiles (x4):** The dark patches are spreading. -3 HP per turn if a unit ends on one.
- **Crowd Surge:** At the start of turn 5, the crowd's chanting intensifies. All units (both sides) get -1 SPD for the remainder of the match. Represents the ritual's ambient influence on the arena.

**Win Condition:** Defeat all enemies.

**Post-Battle Scene:**
- LURCO: (defeated, bleeding, dragged off) "The Emperor will hear of this!"
- NARRATOR: He's right. The Emperor does hear. And the Emperor is not displeased — Lurco was always expendable.
- If `scaeva_allied`: SCAEVA: (quietly) "Aemilia. She's one of mine. Sharp eyes, sharper spear. She'll watch your back." — Aemilia joins.
- AEMILIA: (if present) "I've seen those fighters. The empty ones. Something feeds them. I can feel it in the sand."

**Unlocks:** +15 denarii. Aemilia available (free if `scaeva_allied`, otherwise 25 denarii). Story flag: `lurco_defeated_2`.

---

### Mission 8: "Valeria's Reckoning"

**Story Beat:** #8 — Valeria's Reckoning
**Ritual Meter:** 65/100

**Pre-Battle Scene:**
- Cassius has been investigating. He's found records in the hypogeum — maintenance logs that reference "Corvus, M." — Valeria's husband, Marcus Corvus. The logs describe a "containment incident" in the lower levels. Marcus found something he shouldn't have. The "malfunction" that killed him was no accident.
- PLAYER CHOICE (major branch):
  - A) **Tell Valeria the truth.** — Scene plays out:
    - CASSIUS: "Your husband was murdered. He found the lower hypogeum and they killed him for it."
    - VALERIA: (silence, then fury) "Who?"
    - CASSIUS: "The people who run the games. The Editor. The Cult beneath the arena."
    - VALERIA: "Then we burn them." — Sets `valeria_allied`. Valeria's best fighters (2 Thraex, 1 Dimachaerus) become available for hire at reduced cost (50% off). Valeria provides tactical support in Act III.
  - B) **Keep her in the dark.** — Cassius says nothing. Valeria continues making deals with the Court, unaware. She does not appear as an ally in Act III. Her ludus is later destroyed by the Cult between missions (reported in narration). Sets `valeria_unwarned`.

**Encounter:**
- **Enemy faction:** Mixed — Cult stable + Imperial-sponsored fighters
- **Enemy comp:** 6 units — **Gifted Secutor**, Murmillo, Thraex, Samnite, Retiarius, Provocator
- **Enemy budget:** 1.25x (Gifted is fixed cost)
- **Special:** The Gifted Secutor has the "Pursuit Sense" ability — can move through cursed tiles without taking damage.

**Map Modifiers:**
- **Cursed Tiles (x5):** Spreading further. Same -3 HP effect.
- **Symbol Flash:** At the start of turn 3, glyphs flash across random tiles for one turn. Units standing on a glyph tile when it appears are stunned for 1 turn (skip next activation). Both sides affected. The pattern corresponds to the temple symbols.

**Win Condition:** Defeat all enemies.

**Post-Battle Scene:**
- If `valeria_allied`: VALERIA: "Marcus died trying to stop this. I won't let that be for nothing."
- If `valeria_unwarned`: NARRATOR: Cassius hears that Valeria Corvus's ludus suffered a fire overnight. No survivors among the gladiators. Valeria herself has vanished.
- Regardless: that night, Cassius dreams again. The dark room. But this time he sees the stone — black, polished, with symbols carved deep. And at the edge of the room, a figure. It turns toward him. It has his face.

**Unlocks:** +15 denarii. Valeria branch resolved. If allied, her fighters become available.

---

### Mission 9: "The Temple"

**Story Beat:** #9 — The Temple + #10 — The Emperor's Offer
**Ritual Meter:** 75/100

**Pre-Battle Scene (two-part):**

**Part 1 — The Temple:**
- Cassius descends to the lowest level. Past the old stone. Past the carvings. Into the temple.
- NARRATOR: The chamber is circular. The floor is black stone, smooth as glass. In the center, a basin filled with dark liquid — the black water. The walls are carved with symbols that seem to shift when you look at them sideways. And on the far wall, scratched into the stone with broken fingernails: T-I-T-V-S.
- CASSIUS: (internal) He was here. He tried to remember his own name. And they took even that.
- The temperature drops. The black water ripples without being touched. Cassius hears — not hears, *feels* — something vast and patient, aware of him, curious.
- He flees. The corridors rearrange behind him. He emerges in the upper hypogeum twenty minutes later, though only five minutes have passed above.

**Part 2 — The Emperor's Offer:**
- Cassius is summoned to the Imperial Box. Praetorian guards escort him.
- NERO AURELIUS: "You've been to the temple. I can smell it on you. The stone has a scent — something between iron and rain."
- The Emperor explains everything: the ritual, the Cult, the purpose of the games. He is matter-of-fact. Almost kind.
- NERO AURELIUS: "I am dying. The ritual can save me. The cost is your blood and your brother's. I am offering you a choice most sacrifices don't receive: come willingly. Be remembered as heroes of Rome. Your names carved in the Colosseum itself."
- CASSIUS: "And if I refuse?"
- NERO AURELIUS: "Then you die as a traitor, and I take your blood anyway. The only variable is whether the crowd cheers or weeps."
- No player choice here — Cassius refuses (the refusal is the character's nature, not the player's decision). The Emperor nods, unsurprised.
- NERO AURELIUS: "Then we do it the hard way. Your next matches will be... interesting."

**Encounter:**
- **Enemy faction:** The Cult's enforcers
- **Enemy comp:** 5 units — **Gifted Murmillo**, **Gifted Retiarius**, Provocator, Secutor, Hoplomachus
- **Enemy budget:** 1.3x
- **Special:** Two Gifted in one fight for the first time. The Gifted Murmillo has "Obsidian Wall" (damage reduction aura — adjacent allied units take -2 damage from all attacks). The Gifted Retiarius has "Binding Net" (net effect lasts 2 turns instead of 1).

**Map Modifiers:**
- **Cursed Tiles (x6):** -3 HP per turn.
- **Ritual Pulse:** Every 4 turns, ALL tiles flash. Every unit on the field takes 2 unblockable damage. Represents the ritual's power bleeding into the arena.
- **Shifting Sand:** At the start of each round, 2 random non-occupied tiles swap heights. The arena is physically unstable.

**Win Condition:** Defeat all enemies.

**Post-Battle Scene:**
- NARRATOR: The crowd is different now. Their cheering has a rhythm to it — pulsing, synchronized. Some of them sway in their seats. The editores minores move through the stands, and no one looks at them.
- If `livia_allied_early` or `livia_allied_late`: LIVIA: "My father is preparing to address the Senate. We can expose part of this. Not all — not the supernatural. They'd never believe it. But the political conspiracy, the rigged bouts, the murders — we can break that open."
- CASSIUS: (internal) It won't be enough. Politics can't stop what's under the arena. But it might buy time.
- Sets flag: `emperor_refused`. Act III begins.

**Unlocks:** +20 denarii (larger bonus — the stakes are higher). Story flag: `temple_visited`, `emperor_refused`.

---

### Mission 10: "The Gauntlet"

**Story Beat:** #11 — The Gauntlet
**Ritual Meter:** 83/100

**Pre-Battle Scene:**
- NARRATOR: The brackets have been rewritten overnight. Cassius's ludus faces the Cult's strongest stable — back to back, no rest between bouts. The Editor is no longer pretending.
- VARRO UMBRA appears for the first time in person. He visits Cassius in the holding cell.
- VARRO: "You visited the temple. You heard the voice. You know what waits below."
- CASSIUS: "I know what you've done to my brother."
- VARRO: "I made him sacred. When the rite completes, his name will outlast Rome. Yours too." (He smiles. It is the smile of someone who has smiled at thousands of condemned men.) "The sand is hungry tonight."

**Encounter:**
- **Enemy faction:** The Cult's elite
- **Enemy comp:** 6 units — **Gifted Thraex**, **Gifted Samnite**, Gifted Hoplomachus, Murmillo, Secutor, Retiarius
- **Enemy budget:** 1.4x
- **Special:** Three Gifted in one fight. The Gifted Thraex has "Stone Eyes" — immune to debuffs. The Gifted Samnite has "Tremor Press" — push now affects all adjacent enemies, not just one.
- **AI behavior:** Gifted fighters coordinate — they focus fire on a single player unit per turn.

**Map Modifiers:**
- **Cursed Tiles (x8):** Covers significant arena area now. -4 HP (increased from 3).
- **Ritual Pulse:** Every 3 turns (accelerated from 4). 3 damage.
- **Crowd Madness:** The crowd chants continuously. All player units have -1 SPD for the entire match. Enemy Gifted are immune (they draw strength from the ritual).
- **Dark Sky:** The renderer darkens the background. Torchlight flickers. Pure atmosphere.

**Win Condition:** Defeat all enemies. **If Nerva is in the roster and survives, bonus scene triggers.**

**Post-Battle Scene:**
- The arena is a wreck. Sand stained dark. The crowd is screaming, but the screams have a harmonic quality — like a choir that doesn't know it's singing.
- If Nerva survived: NERVA: "I felt something during the fight. When I stood on that dark sand — it was like something was looking up at me through the ground. Cassius... what are we fighting in?"
- If Aemilia present: AEMILIA: "The Gifted. I watched the Thraex. His movements — they're not from training. Something else is moving his body. The same something that's under the sand."
- NARRATOR: Two more matches. Then the final bout. The one they've been building toward since the games began.

**Unlocks:** +15 denarii. Story flag: `gauntlet_begun`.

---

### Mission 11: "Alliance and Sacrifice"

**Story Beat:** #12 — Alliance and Sacrifice
**Ritual Meter:** 90/100

**Pre-Battle Scene:**
- CASSIUS gathers his allies.
- If `livia_allied_early` or `livia_allied_late`: LIVIA: "My father speaks to the Senate tomorrow. Once the conspiracy is public, the Emperor loses his political shield. But the ritual... that's on you."
- If `scaeva_allied`: SCAEVA: "I'll send what fighters I can spare. They're old, like me. But they know their craft."
- If `valeria_allied`: VALERIA: "My husband died in that place. I'm sending my best. Make it count."
- **Alliance Payoff:** Depending on flags, the player receives bonus fighters for this mission:
  - `livia_allied`: +1 free Secutor (Livia's informant, a gladiator who defected from the Cult's stable)
  - `scaeva_allied`: +1 free Murmillo (veteran from Scaeva's ludus)
  - `valeria_allied`: +1 free Dimachaerus (Valeria's champion)
  - These are in ADDITION to the player's normal budget. Maximum 3 bonus units.

**Encounter:**
- **Enemy faction:** The Cult's honor guard
- **Enemy comp:** 6 units — **Gifted Dimachaerus**, **Gifted Provocator**, Gifted Secutor, Gifted Murmillo, Thraex, Retiarius
- **Enemy budget:** 1.45x
- **Special:** Four Gifted. This is the hardest standard fight in the game. The alliance bonus fighters are the intended counterweight.
- The Gifted Provocator has "Dread Mark" — marked units also take +3 damage from all sources.

**Map Modifiers:**
- **Cursed Tiles (x10):** Covering nearly half the arena. -4 HP. Moving without crossing cursed ground requires careful routing.
- **Ritual Pulse:** Every 2 turns. 4 damage. The ritual is almost complete.
- **Sand Glyphs:** The sand forms symbols continuously. Units that stand on an active glyph for 2 consecutive turns are stunned for 1 turn.
- **Crowd Madness:** -1 SPD to all player units. Gifted immune.

**Win Condition:** Defeat all enemies. **At least 2 of the player's gladiators must survive** (if all die, the game proceeds but the finale is harder).

**Post-Battle Scene:**
- NARRATOR: The arena is quiet. Not silent — quiet in the way a held breath is quiet. The crowd sits motionless. Fifty thousand people, staring at the sand, waiting.
- VARRO UMBRA's voice, from everywhere and nowhere: "One match remains. The ratio must balance. Brother will face brother, as it was always meant to be."
- CASSIUS: (internal) Tomorrow. Titus. The arena. The thing beneath. I don't know if I can save him. I don't know if there's anything left to save. But I have to try.
- If Nerva survived all missions: NERVA: "Whatever happens in there tomorrow — we're with you. All of us. To the sand and beyond."

**Unlocks:** Story flag: `penultimate_complete`. All flags locked — no more alliance changes.

---

### Mission 12: "The Unmasking"

**Story Beat:** #13 — The Unmasking
**Ritual Meter:** 95/100

**Pre-Battle Scene:**
- NARRATOR: Senator Pulcher speaks to the Senate. Livia's network has distributed evidence — rigged brackets, murdered lanistae, the connection between arena deaths and political purges. The Senate erupts. Praetorian guards are dispatched. The Emperor's political apparatus cracks.
- But in the Colosseum, nothing changes. The crowd is here. They cannot leave. They do not want to leave. The ritual holds them.
- NERO AURELIUS appears in the Imperial Box, visibly decaying. The cosmetics are gone. The stimulants have stopped working. He is a dying man watching his last gamble play out.
- NERO AURELIUS: (to the crowd, amplified) "One final bout! The culmination of the Ludi Aeternales! The Editor's champion — against the lanista who dared challenge the games themselves!"
- The crowd roars. They have no choice. The ritual roars through them.
- VARRO: (to Cassius, in the holding cell) "You cannot prevent this. The energy is gathered. The threshold is reached. All that remains is the spark. You and your brother. In the sand. Together."

**Encounter:**
- **Enemy faction:** Cult's final guard — this is the buffer before Titus
- **Enemy comp:** 4 units — **Gifted Thraex**, **Gifted Retiarius**, **Gifted Hoplomachus**, Samnite
- **Enemy budget:** 1.5x
- **Special:** Three Gifted with max-level abilities. The Cult is throwing everything at Cassius to weaken his roster before the finale.

**Map Modifiers:**
- **Cursed Tiles (x12):** The arena floor is more cursed than clean. -5 HP.
- **Ritual Pulse:** Every turn. 3 damage. Constant.
- **Collapsing Arena:** At the end of turn 6, two random non-edge tiles become impassable (the floor cracks, revealing the hypogeum below). At turn 10, two more collapse. The arena is literally breaking apart.
- **Crowd Madness:** -2 SPD to player units. Gifted immune.

**Win Condition:** Defeat all enemies. Surviving gladiators carry their current HP into the finale (no full heal between 12 and 13).

**Post-Battle Scene:**
- The arena floor is cracked. Through the gaps, a faint glow pulses from below — the temple, directly beneath.
- The gate at the far end of the arena opens. TITUS walks out. Alone.
- NARRATOR: He is larger than Cassius remembers. His skin has a faint grey cast. His eyes — the eyes Cassius used to see across the breakfast table, the eyes that cried when their father was taken — are the color of polished obsidian. He carries two swords.
- TITUS stops in the center of the arena. Looks at Cassius. For one half-second — a flicker. Recognition. Then it's gone.
- VARRO UMBRA: (from the shadows) "Begin."

**Unlocks:** Immediate transition to Mission 13 (the Finale). No ludus phase. No healing. What you have is what you bring.

---

### Mission 13: "Geminus Ratio" (The Finale)

**Story Beat:** #14 — Brother Against Brother
**Ritual Meter:** 99/100

**Pre-Battle Setup:**
- No Ludus phase. The player's surviving gladiators from Mission 12 enter at their current HP.
- The player deploys on the gate row as normal, but the arena has changed: the floor is fractured, glyphs pulse across every tile, and the hypogeum is visible through cracks in the sand.
- Titus stands alone in the center. The Gifted honor guard (2-4 units depending on difficulty/alliance state) flanks him.

**Encounter:**
- **TITUS** — Unique boss unit (see stat profile below).
  - Class: Custom "Geminus" — combines Dimachaerus speed with Murmillo durability
  - HP: 60 | ATK: 18 | DEF: 7 | SPD: 10 | Move: 5 | Jump: 3
  - Ability 1: "Forgotten Name" — AoE attack hitting all adjacent for 1.0x damage. After use, Titus pauses for 1 turn (his CT resets to 0). The remnant of his identity disrupts the Binding momentarily.
  - Ability 2: "Dis Pater's Reach" — Line attack, range 4, 1.5x damage. The arena floor cracks along the line.
  - Passive: "Twinned Blood" — While both Cassius (represented by the player's lead gladiator) and Titus are alive, the ritual pulse deals double damage to all OTHER units. The twins are conduits.
- **Gifted Honor Guard:** 2 units base. +1 if NOT `scaeva_allied`. +1 if NOT `valeria_allied`. (Maximum 4, minimum 2.) Standard Gifted stat profiles, mixed classes.

**Map Modifiers:**
- **Full Curse:** Every tile is cursed. -3 HP per turn to non-Gifted units. Titus and the Gifted are immune.
- **Ritual Pulse:** Every turn, 4 damage to all non-Gifted. Doubled (8 damage) while Titus and the player's lead unit are both alive (Twinned Blood).
- **Collapsing Arena:** Every 3 turns, 2 tiles become impassable. The arena shrinks.
- **The Glow Below:** Tiles adjacent to collapsed tiles have a faint upward glow. Units on these "edge" tiles receive +2 ATK (the boundary energy empowers them — both sides).

**Win Condition — SPECIAL:**
The player does NOT need to kill Titus. Instead, there are two paths:

- **Reduce Titus to 0 HP** — Titus falls. The manner of his defeat determines the ending (see Endings below).
- **"Reach" Titus** — If the player's lead gladiator (the one deployed first, representing Cassius's personal champion) moves adjacent to Titus AND uses the Wait action (not attack, not ability — Wait), a special scene triggers. This only works after Titus has used "Forgotten Name" at least once (the pause after the ability represents the moment his true self surfaces). This triggers Ending A.

The Gifted honor guard must be defeated regardless. They will not stop fighting.

**Ending Resolution:**

**Ending A — "Break the Chain"**
Trigger: Lead gladiator Waits adjacent to Titus after "Forgotten Name" fires.
- The screen flashes. Titus's eyes clear. For one moment he speaks: "...Cassius?"
- Titus turns on the remaining Gifted (if any). The ritual energy discharges through the temple below. The arena shakes. The cursed tiles go dark. The crowd gasps and falls silent — truly silent, for the first time.
- NARRATOR: The temple collapses. The Colosseum cracks but stands. The Emperor, in the Imperial Box, exhales once and does not inhale again. The ritual that sustained him is gone.
- Final scene: Titus and Cassius in the ruined arena. Titus is diminished — human again, but broken. He remembers everything.
- TITUS: "I remember the room. The water. The voice. I remember forgetting you." (pause) "I remember you finding me."
- Available if: No special requirements beyond surviving and executing the "Reach" maneuver.

**Ending B — "The Sacrifice"**
Trigger: Titus reduced to 0 HP AND `livia_allied` (early or late) AND `temple_visited`.
- Titus falls. The ritual energy, unchanneled, begins to rupture outward. The arena shakes violently.
- LIVIA: (from the stands) "The energy — it's going to tear the Colosseum apart. Thousands of people —"
- Cassius descends through the cracked arena floor into the temple below. He places his hands on the ritual stone.
- NARRATOR: Cassius channels the energy through himself. The twin bond — even with Titus fallen — is enough to redirect it. The temple absorbs it. The stone cracks. The glow dies.
- Final scene: Titus wakes in the arena, restored. Below, the temple is rubble. Cassius is in the rubble.
- TITUS: (carrying his brother out) "You found me." (silence) "I couldn't find you in time."

**Ending C — "Dis Pater's Bargain"**
Trigger: Titus reduced to 0 HP AND NOT (`livia_allied`) — i.e., Cassius is alone, no political cover, no safe way to discharge the energy.
- Titus falls. The energy ruptures. Cassius has no allies to warn him, no knowledge of how to redirect safely.
- In desperation, he reaches into the boundary. The voice answers.
- DIS PATER: (not words — impressions) *A vessel. A bridge. Carry the weight. The price is what you were.*
- Cassius accepts. The energy flows through him. He contains it. The temple seals. The crowd is freed. Titus wakes.
- Final scene: Titus looks at his brother. Cassius looks back. But something in his eyes has changed — they are darker. Calmer. Old.
- TITUS: "...Cassius?"
- CASSIUS: (smiles — but it is not quite Cassius's smile) "Yes. I'm here."

---

## IV. Choice Branch Summary

| Flag | Set At | Condition | Effect |
|------|--------|-----------|--------|
| `livia_allied_early` | Mission 3 | Accept Livia's offer | Intel bonuses M4+, class unlocks, Ending B available |
| `livia_allied_late` | Mission 5 | Auto if not early | Same as above but delayed |
| `livia_knows_twin` | Mission 5 | Tell Livia about Titus | Stronger intel in Act II, Livia references Titus in dialogue |
| `scaeva_allied` | Mission 7 | Ask for help + roster in good shape | Aemilia free, +1 bonus unit M11, -1 Gifted guard in finale |
| `valeria_allied` | Mission 8 | Tell Valeria the truth | Her fighters available cheap, +1 bonus unit M11, -1 Gifted guard in finale |
| `valeria_unwarned` | Mission 8 | Keep quiet | Valeria's ludus destroyed, no Act III support |
| `emperor_refused` | Mission 9 | Automatic (Cassius refuses) | Triggers Act III |
| `temple_visited` | Mission 9 | Automatic | Required for Ending B |

**Ending Gate Logic:**
- **Ending A:** Always available. Requires tactical execution (Reach maneuver during Forgotten Name window).
- **Ending B:** Requires `livia_allied` (early or late) + `temple_visited` + Titus reduced to 0.
- **Ending C:** Titus reduced to 0 + NOT `livia_allied`. The "failure state" ending — still a complete story, but darker.
- If `livia_allied` and Titus is reduced to 0, Ending B triggers (Livia's network provides the knowledge to redirect). Ending C only fires when Cassius is truly alone.

---

## V. Named Character Roster

### Player-Side Named Gladiators

| Name | Class | Available | Cost | HP | ATK | DEF | SPD | Move | Jump | Special |
|------|-------|-----------|------|----|-----|-----|-----|------|------|---------|
| **Nerva** | Retiarius | Mission 3 (free) | 0 | 30 | 11 | 3 | 10 | 4 | 2 | +2 HP, +1 ATK, +1 SPD vs. base Retiarius. If alive at Mission 10+, triggers bonus dialogue. |
| **Aemilia** | Hoplomachus | Mission 7 (free if `scaeva_allied`, else 25 dn) | 0/25 | 33 | 13 | 5 | 8 | 3 | 1 | +3 HP, +1 ATK, +1 DEF, +1 SPD vs. base Hoplomachus. Senses Gifted — if adjacent to a Gifted at start of her turn, gains +2 ATK for that turn. |
| **Ferox** | Dimachaerus (Gifted, defected) | Mission 11 (if `valeria_allied`) | 0 | 35 | 16 | 3 | 9 | 5 | 2 | A redeemed Gifted. Retains Gifted stat boosts but fights for the player. Immune to cursed tile damage. Unique ability: "Remnant Fury" — 1.5x single target, self-stun for 1 turn. |

**Permadeath Consequences:**
- If **Nerva** dies before Mission 10: his subplot (the "human heart of the roster") is lost. Other gladiators reference his death in post-battle scenes. A gap in the emotional texture of Act III.
- If **Aemilia** dies: the player loses the "Gifted sensor" mechanic and her dialogue about the supernatural. The mystery is slightly harder to piece together.
- If **Ferox** dies: no narrative consequence (he's a late addition), but losing a Gifted-immune fighter in the finale is a significant tactical loss.

### Enemy Named Characters

| Name | Class | Appears | HP | ATK | DEF | SPD | Move | Jump | Special |
|------|-------|---------|-----|-----|-----|-----|------|------|---------|
| **Ferox** (enemy) | Gifted Dimachaerus | Mission 6 | 38 | 17 | 3 | 10 | 5 | 2 | "Binding Fury" — 1.6x single target. Ignores cursed tile damage. |
| **Titus** | Geminus (unique) | Finale | 60 | 18 | 7 | 10 | 5 | 3 | See Mission 13 encounter spec. |

---

## VI. Gifted Fighter Specs

### Base Modifier

Any standard gladiator class can be "Gifted." Apply these modifiers to the base class stats:

| Stat | Modifier |
|------|----------|
| HP | +30% (round up) |
| ATK | +25% (round up) |
| DEF | +1 |
| SPD | +20% (round up) |
| Move | +1 |
| Jump | +1 |

**Example — Gifted Secutor:**
Base: HP 32, ATK 12, DEF 4, SPD 8, Move 4, Jump 1
Gifted: HP 42, ATK 15, DEF 5, SPD 10, Move 5, Jump 2

### Gifted Universal Traits

All Gifted fighters share:
- **Curse Immunity:** No damage from cursed tiles.
- **Ritual Attunement:** Immune to the SPD penalty from Crowd Madness.
- **No Morale:** Cannot be affected by Provocatio's mark effect.

### Gifted Unique Abilities

Each Gifted gains one unique ability in addition to their class abilities:

| Gifted Class | Ability | Effect |
|---|---|---|
| Gifted Murmillo | Obsidian Wall | Passive: adjacent allied units take -2 damage from all attacks. |
| Gifted Retiarius | Binding Net | Net effect lasts 2 turns instead of 1. |
| Gifted Secutor | Pursuit Sense | Can move through cursed tiles without damage. After moving 4+ tiles, next attack deals +3 bonus damage. |
| Gifted Thraex | Stone Eyes | Immune to all debuffs (net, mark, stun). |
| Gifted Hoplomachus | Tremor Thrust | Hasta Impetus also pushes all units in the line back 1 tile. |
| Gifted Dimachaerus | Binding Fury | 1.6x single target attack. No self-damage cost (unlike Twin Slash). |
| Gifted Provocator | Dread Mark | Provocatio mark also causes the target to take +3 damage from all sources. |
| Gifted Samnite | Tremor Press | Push affects all adjacent enemies simultaneously. |

### Visual and Audio Tells

For the renderer (`renderer.js`) and SFX (`sfx.js`) systems:

**Visual:**
- Gifted sprites use a third team palette: desaturated player/enemy colors with a faint grey-green tint on skin tones.
- Gifted units have a subtle particle effect — small dark motes rising from their feet (like reverse ash), rendered as 2-3 pixel rectangles that drift upward and fade.
- When a Gifted unit activates (their CT triggers), a brief pulse of dark light expands from their tile (1-frame flash, dark overlay on adjacent tiles).

**Audio:**
- Gifted attacks produce a lower-pitched version of the standard attack SFX, with a faint reverb tail.
- When a Gifted enters the arena (placed during deploy), a low sub-bass drone plays for 1 second.
- The "Forgotten Name" ability (Titus only) has a unique sound: a human voice, distorted, trying to say a word that doesn't come.
