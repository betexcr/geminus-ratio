# -*- coding: utf-8 -*-
"""Build js/abilities-i18n-es.js from js/game.js (Spanish = professional game-localized strings)."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
game = (ROOT / "js" / "game.js").read_text(encoding="utf-8")
pat = re.compile(r'\{ aid: "([^"]+)", name: "([^"]*)", desc: "((?:[^"\\]|\\.)*)"')


def unesc_desc(s: str) -> str:
    return s.replace('\\"', '"').replace("\\u00d7", "×")

entries = []
for m in pat.finditer(game):
    aid, name, desc = m.group(1), m.group(2), unesc_desc(m.group(3))
    entries.append((aid, name, desc))

# Spanish translations: name + desc per aid (game tone)
SP = {
    "murmillo_cetus_wall": ("Muro de Ceto", "Firmeza: el próximo golpe hace la mitad de daño."),
    "murmillo_testudo": ("Testudo", "+3 DEF hasta el próximo turno."),
    "murmillo_aegis_slam": ("Golpe de égida", "0,6× de golpe + aturde al enemigo 1 turno."),
    "murmillo_iron_will": ("Voluntad de hierro", "Cura 15% de PV y limpia raíz."),
    "murmillo_fortress_stance": ("Postura fortaleza", "+4 DEF 2 turnos; enraizado 1 turno."),
    "murmillo_guardian_aura": ("Aura de guardián", "Todos los aliados adyacentes curan 5 PV."),
    "retiarius_iaculum": ("Iaculum", "Enreda a un enemigo adyacente (pierde su próximo turno)."),
    "retiarius_trident_lunge": ("Estocada de tridente", "Ataque en línea alcance 2 por 0,8× de daño."),
    "retiarius_tide_pull": ("Tirón de marea", "Atrae al enemigo adyacente 1 casilla hacia ti."),
    "retiarius_entangle": ("Enredo", "Enraiza y −2 ATA al enemigo (2 turnos)."),
    "retiarius_neptunes_favor": ("Favor de Neptuno", "Cura 20% de PV y +1 movimiento."),
    "retiarius_drag_under": ("Arrastre profundo", "Atrae al enemigo e inflige 1,0× de daño."),
    "secutor_umbra": ("Umbra", "+1 movimiento este turno."),
    "secutor_pursuit": ("Persecución", "Golpe adyacente 1,25× si hay enemigo."),
    "secutor_blind_rush": ("Carga ciega", "+2 ATA esta acción, −2 DEF hasta el próximo turno."),
    "secutor_battle_focus": ("Foco de batalla", "El próximo ataque tiene +25% de acierto."),
    "secutor_relentless": ("Implacable", "Embestida en línea 2 + golpe 0,8×."),
    "secutor_hunters_mark": ("Marca del cazador", "El enemigo recibe +3 de daño de todos (2 turnos)."),
    "thraex_sica_riposte": ("Contragolpe de sica", "Contra el próximo golpe cuerpo a cuerpo por 5 de daño verdadero."),
    "thraex_curved_strike": ("Tajo curvo", "Ataque que ignora el 50% de la DEF."),
    "thraex_bleeding_arc": ("Arco sangrante", "1,1× de golpe + 3 de sangrado (1/turno, 3 turnos)."),
    "thraex_parry": ("Parada", "El próximo golpe se reduce a la mitad; contra 3 de daño."),
    "thraex_crimson_dance": ("Danza carmesí", "1,3× de golpe; cura el 25% del daño."),
    "thraex_blade_storm": ("Tormenta de filos", "Golpea a todos los enemigos adyacentes 1,0×."),
    "hoplomachus_hasta_impetus": ("Ímpetu de hasta", "Embestida en línea (alcance 3) por 1,25×."),
    "hoplomachus_shield_bash": ("Golpe de escudo", "0,5× de daño + empuja 1 casilla."),
    "hoplomachus_phalanx_guard": ("Guardia de falange", "Los aliados adyacentes ganan +2 DEF esta ronda."),
    "hoplomachus_spear_brace": ("Asta en guardia", "El próximo atacante cuerpo a cuerpo recibe 4 de contra."),
    "hoplomachus_piercing_thrust": ("Estocada perforante", "Línea alcance 2, 1,0× ignorando toda la DEF."),
    "hoplomachus_phalanx_advance": ("Avance de falange", "Aliados: +2 ATA, +1 movimiento este turno."),
    "dimachaerus_ferrum_cyclone": ("Ciclón de hierro", "Golpea a todos los adyacentes 0,7×."),
    "dimachaerus_twin_slash": ("Tajo gemelo", "1,4× a un objetivo; cuesta 3 PV."),
    "dimachaerus_shadow_step": ("Paso sombrío", "Teletransporte a una casilla en alcance 2."),
    "dimachaerus_evasion": ("Evasión", "+3 DEF hasta el próximo turno."),
    "dimachaerus_blood_dance": ("Danza sangrienta", "1,5× de golpe; cura el 30% del daño."),
    "dimachaerus_whirlwind_fury": ("Furia torbellino", "1,2× a todos los adyacentes + teletransporte 1."),
    "provocator_provocatio": ("Provocatio", "Marca al enemigo: −4 ATA contra otros (2 turnos)."),
    "provocator_rally": ("Reagrupar", "Autocura 20% de PV máx."),
    "provocator_arena_salute": ("Saludo de arena", "Limpia todos los perjuicios sobre ti."),
    "provocator_inspiring_presence": ("Presencia inspiradora", "Aliados adyacentes +2 ATA este turno."),
    "provocator_guardians_oath": ("Juramento de guardián", "Intercepta el próximo golpe a un aliado adyacente."),
    "provocator_champions_resolve": ("Resolución del campeón", "Curación completa (una vez por batalla)."),
    "samnite_samnis_press": ("Presión samnis", "Empuja al enemigo adyacente 1 casilla."),
    "samnite_veterans_blow": ("Golpe del veterano", "1,3× de daño; cuesta 5 PV."),
    "samnite_war_cry": ("Grito de guerra", "Enemigos adyacentes −2 ATA (2 turnos)."),
    "samnite_battle_hardened": ("Batalla curtida", "+2 DEF, +1 ATA (2 turnos)."),
    "samnite_intimidating_roar": ("Rugido intimidante", "Todos los enemigos adyacentes enraizados 1 turno."),
    "samnite_veterans_fury": ("Furia del veterano", "1,5× de golpe + empuje 2 casillas."),
    "sagittarius_volley": ("Lluvia", "Disparo en línea alcance 4 por 0,7×."),
    "sagittarius_pin_shot": ("Disparo de clavado", "0,6× + enraiza al enemigo 1 turno."),
    "sagittarius_high_ground": ("Terreno alto", "+15% de acierto en el próximo ataque."),
    "sagittarius_poison_arrow": ("Flecha venenosa", "0,5× + 3 de sangrado (1/turno, 3 turnos)."),
    "sagittarius_suppressing_fire": ("Fuego de supresión", "Línea alcance 2, 3 de daño verdadero (perfora)."),
    "sagittarius_eagle_eye": ("Ojo de águila", "Los próximos 2 ataques no pueden fallar."),
    "essedarius_charge": ("Carga", "Embestida en línea 2 + golpe 1,3×."),
    "essedarius_wheel_strike": ("Golpe de rueda", "Golpea a todos los adyacentes 0,6×."),
    "essedarius_rally_charge": ("Carga de ímpetu", "+2 movimiento este turno."),
    "essedarius_momentum": ("Ímpetu", "Pasiva: +3 ATA tras mover 3+ casillas."),
    "essedarius_trample": ("Pisotón", "Línea 3, 0,6× a cada enemigo en la línea."),
    "essedarius_war_chariot": ("Carro de guerra", "Carga 3 + 1,5× sobre el objetivo."),
    "umbra_dark_grasp": ("Garra oscura", "0,9× de golpe, roba 3 PV."),
    "umbra_phase_walk": ("Caminata de fase", "Teletransporte en alcance 3."),
    "umbra_dread_whisper": ("Susurro pavoroso", "Perjuicio: enemigo −3 ATA (2 turnos)."),
    "umbra_shadow_mend": ("Remiendo sombrío", "Cura 25% de PV; −2 ATA 1 turno."),
    "umbra_void_burst": ("Estallido del vacío", "0,8× a adyacentes + roba 2 PV a cada uno."),
    "umbra_abyssal_gate": ("Portal abisal", "Teletransporta a un aliado adyacente en alcance 3."),
    "vestige_revenant_strike": ("Golpe del renacido", "1,2× de golpe; cura el 25% del daño."),
    "vestige_grave_pulse": ("Pulso sepulcral", "4 de daño verdadero a adyacentes; cuesta 5 PV."),
    "vestige_second_wind": ("Segundo aliento", "Pasiva: revive una vez al 25% de PV."),
    "vestige_unholy_resilience": ("Resiliencia impía", "+3 DEF durante 2 turnos."),
    "vestige_soul_drain": ("Drenaje de alma", "1,0× de golpe; cura el 50% del daño."),
    "vestige_deaths_embrace": ("Abrazo de la muerte", "6 de daño verdadero a adyacentes; cura el total."),
    "centurion_legion_wall": ("Muro de legión", "Aliados adyacentes +2 DEF (2 turnos)."),
    "centurion_imperium": ("Imperium", "Golpe 1,0× a todos los enemigos adyacentes."),
    "praetorian_defiant_counter": ("Contra desafiante", "Contra los próximos 2 golpes cuerpo a cuerpo."),
    "praetorian_unyielding": ("Inquebrantable", "Cura 20% de PV; inmune a perjuicios 1 turno."),
    "laquearius_lasso_snare": ("Lazo", "Enraiza en línea 3 + tira 1 casilla."),
    "laquearius_triple_tide": ("Triple marea", "Golpea 3 casillas en línea por 0,7× cada una."),
    "pontarius_bridgekeeper": ("Guardián del puente", "+3 DEF y cura 5 PV."),
    "pontarius_cascade": ("Cascada", "Empuja a todos los enemigos adyacentes 2 casillas."),
    "contraretiarius_net_cutter": ("Cortaredes", "Limpia raíz/aturdimiento + golpe 1,2×."),
    "contraretiarius_pursue_finish": ("Perseguir y rematar", "Avanza 2 casillas + 1,4× si el enemigo está bajo 40% de PV."),
    "scissor_crescent_guard": ("Guardia creciente", "+4 DEF hasta el próximo turno; contra 3 de daño."),
    "scissor_scissor_rend": ("Desgarro de tijera", "1,3× ignorando 30% de DEF."),
    "myrmex_scorpion_sting": ("Aguijón de escorpión", "1,4× + sangrado 4 (2 turnos)."),
    "myrmex_frenzy": ("Frenesí", "Ataca dos veces a 0,7× cada una."),
    "veles_javelin_toss": ("Lanzamiento de jabalina", "Línea alcance 3 por 0,9×."),
    "veles_skirmish_dance": ("Danza de escaramuza", "Ataque + teletransporte 2 casillas atrás."),
    "hoplite_shield_wall": ("Muro de escudos", "Aliados adyacentes +3 DEF (2 turnos)."),
    "hoplite_spartan_thrust": ("Estocada espartana", "Línea 3, 1,3× + empuje 1."),
    "peltast_javelin_barrage": ("Lluvia de jabalinas", "Línea 4, 0,8× + sangrado 2."),
    "peltast_hit_and_run": ("Golpe y huida", "1,1× + retrocede 2 casillas."),
    "gladiatrix_whirling_blades": ("Hojas giratorias", "1,2× a todos los adyacentes + cura 3 por golpe."),
    "gladiatrix_perfect_strike": ("Golpe perfecto", "1,8× a un solo objetivo; no puede fallar."),
    "rudiarius_veterans_wisdom": ("Sabiduría del veterano", "Cura 30% de PV y limpia perjuicios."),
    "rudiarius_freedoms_edge": ("Filo de la libertad", "1,5×; si mata, +1 movimiento el próximo turno."),
    "primus_palus_champion_duel": ("Duelo de campeones", "Marca: ambos +20% de daño mutuo."),
    "primus_palus_crowds_favor": ("Favor del público", "Curación completa +3 ATA (2 turnos, una vez/batalla)."),
    "tertiarius_hold_the_line": ("Sostener la línea", "Intercepta todos los golpes a aliados adyacentes 1 turno."),
    "tertiarius_last_stand": ("Último baluarte", "+5 ATA y +5 DEF por debajo del 30% de PV."),
    "legionary_pilum_throw": ("Lanzamiento de pilum", "Línea 3, 1,0× + −2 DEF al enemigo (2 turnos)."),
    "legionary_testudo_march": ("Marcha testudo", "+4 DEF, +2 movimiento 1 turno."),
    "velite_skirmish_throw": ("Lanzamiento velite", "Línea 2, 0,9× + enraiza 1 turno."),
    "velite_guerrilla": ("Guerrilla", "Teletransporte 3 casillas + sigilo 1 turno."),
    "arcuballista_siege_shot": ("Disparo de asedio", "Línea 5, 1,2× ignora 50% DEF."),
    "arcuballista_rain_of_arrows": ("Lluvia de flechas", "Área 3×3 a distancia 3, 0,5× cada una."),
    "venator_beast_trap": ("Trampa de bestia", "Coloca trampa; el siguiente enemigo recibe 6 de daño + raíz."),
    "venator_marked_prey": ("Presa marcada", "El objetivo +3 de daño de todos los ataques (2 turnos)."),
    "cataphract_armored_charge": ("Carga acorazada", "Línea 3, 1,4× + empuje 2 casillas."),
    "cataphract_iron_rampart": ("Muralla de hierro", "+5 DEF (2 turnos); enraizado."),
    "auriga_chariot_rush": ("Embestida del auriga", "Avanza 4 casillas + 1,0× a cada enemigo en el camino."),
    "auriga_reins_of_war": ("Riendas de guerra", "+3 ATA, +2 movimiento 1 turno."),
    "noctis_shadow_reap": ("Siega sombría", "1,5× + roba 5 PV."),
    "noctis_nightmare": ("Pesadilla", "Todos los adyacentes −3 ATA, −2 VEL (2 turnos)."),
    "augur_prophecy": ("Profecía", "Cura a un aliado adyacente 30% + limpia."),
    "augur_fates_thread": ("Hilo del destino", "Intercambia % de PV con el enemigo objetivo."),
    "lich_soul_siphon": ("Sifón de almas", "1,3× + cura el 50% del daño."),
    "lich_army_of_dead": ("Ejército de muertos", "Invoca 2 esqueletos (1 PV, 5 ATA) por 3 turnos."),
    "revenant_undying_will": ("Voluntad imperecedera", "Sobrevive un golpe letal a 1 PV (una vez/batalla)."),
    "revenant_death_knell": ("Toque de muerte", "1,6×; +0,4× si estás bajo 25% de PV."),
}

out = {}
for aid, en, desc in entries:
    if aid in SP:
        out[aid] = {"name": SP[aid][0], "desc": SP[aid][1]}
    else:
        out[aid] = {"name": en, "desc": desc}

js = (
    '(function () {\n  "use strict";\n  if (typeof I18n === "undefined" || !I18n.mergeEsAbilities) return;\n  I18n.mergeEsAbilities('
    + json.dumps(out, ensure_ascii=False, separators=(",", ":"))
    + ");\n})();\n"
)
(ROOT / "js" / "abilities-i18n-es.js").write_text(js, encoding="utf-8")
print("wrote", len(out), "abilities")
