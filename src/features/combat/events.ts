import type { Vec2 } from '../../core/vec2';
import type { ProjectileVisual } from './projectile';
import type { Team } from './team';

/**
 * Da dove viene un danno subito da un giocatore: tipo di colpo e nome da mostrare (lo schema del boss, "Contatto",
 * il nome del servitore). Serve alla schermata di sconfitta per dire cosa ha colpito di piu'.
 */
export interface DamageSource {
  readonly kind: 'projectile' | 'zone' | 'contact' | 'charge' | 'minion';
  readonly name: string;
}

/** Che cosa ha fermato un proiettile. */
export type ProjectileStrike = 'boss' | 'player' | 'minion' | 'obstacle';

/**
 * Eventi che la simulazione emette e che rappresentazione (particelle, numeri, pose) e audio ascoltano.
 * Sono dati semplici: la simulazione non sa chi li ascolta e non dipende dal disegno.
 */
export type GameEvent = (
  /**
   * Il giocatore ha usato una skill. `visual` e' l'id dell'aspetto/suono della skill, `kind` il tipo di effetto,
   * `origin` il punto di emissione, `destination` dove e' finito (scatto: punto d'arrivo). `range` e `arc` solo per
   * il colpo ravvicinato.
   */
  | {
      type: 'skill_cast';
      skillId: string;
      visual: string;
      kind: 'projectile' | 'ground_blast' | 'dash' | 'melee_arc' | 'buff' | 'summon';
      origin: Vec2;
      destination: Vec2;
      angle: number;
      range?: number;
      arc?: number;
      travelSeconds?: number;
    }
  /**
   * Danno inflitto (`amount` è la perdita intera effettiva, dopo modificatori, difetto e limite agli HP rimasti). Ai giocatori porta la fonte; ai
   * servitori l'id del servitore. `playerId` (in fondo) e' chi ha colpito o, per il bersaglio `player`, chi e' stato colpito.
   */
  | { type: 'damage_dealt'; target: 'player' | 'boss' | 'minion'; amount: number; position: Vec2; source?: DamageSource; minionId?: number }
  /**
   * Un proiettile si e' fermato su qualcosa (anche se il bersaglio era invulnerabile). `struck` dice su cosa: un colpo
   * a segno e uno su un pilastro si rappresentano diversi.
   */
  | { type: 'projectile_hit'; position: Vec2; radius: number; visual: ProjectileVisual; team: Team; struck?: ProjectileStrike }
  /** Un proiettile del giocatore e' finito nel vuoto (vita esaurita o fuori dall'arena): un colpo mancato. */
  | { type: 'projectile_faded'; position: Vec2; visual: ProjectileVisual }
  | { type: 'zone_detonated'; position: Vec2; radius: number; team: Team; visual?: string }
  | { type: 'boss_phase_changed'; position: Vec2; phase: number; text: string }
  /** Il boss annuncia un attacco: testo sopra la testa. */
  | { type: 'boss_attack'; patternId: string; position: Vec2; name: string; color: string; labelOffsetY: number }
  /** Il boss assume la posa di lancio per `seconds` secondi. */
  | { type: 'status_applied'; position: Vec2; status: string; seconds: number }
  | { type: 'guard_blocked'; position: Vec2 }
  | { type: 'channel_started'; position: Vec2; seconds: number }
  | { type: 'boss_pose'; seconds: number }
  | { type: 'boss_charge_finished'; position: Vec2 }
  /** Il boss si sposta di colpo (teletrasporto): la rappresentazione puo' mostrare un'esplosione nei due punti. */
  | { type: 'boss_teleported'; from: Vec2; to: Vec2 }
  | { type: 'boss_defeated'; position: Vec2 }
  /** Un servitore e' comparso (`visual` sceglie aspetto e suono; `elite` il modificatore, se c'e'). */
  | { type: 'minion_spawned'; position: Vec2; minionId: number; visual: string; elite?: string }
  /**
   * Un servitore e' morto: colpito, esploso a contatto (`exploded`) o sparito con il boss. `revives`: e' crollato ma
   * si rialzera' (scheletri): non conta come abbattuto.
   */
  | { type: 'minion_defeated'; position: Vec2; minionId: number; visual: string; exploded?: boolean; revives?: boolean }
  /** Segnale a terra: fra `delay` secondi qui comparira' un servitore. */
  | { type: 'minion_incoming'; position: Vec2; visual: string; delay: number; elite?: string }
  /** Un servitore addormentato (arredo) si e' svegliato. */
  | { type: 'minion_woke'; position: Vec2; minionId: number; visual: string }
  /** Uno scheletro si e' rialzato. */
  | { type: 'minion_revived'; position: Vec2; minionId: number; visual: string }
  /** Un servitore si e' teletrasportato da `from` a `position`. */
  | { type: 'minion_blinked'; position: Vec2; from: Vec2; minionId: number; visual: string }
  /** Un sostegno ha coperto di scudi i servitori entro `radius`. */
  | { type: 'minion_aura'; position: Vec2; radius: number; minionId: number; aura?: 'shield' | 'haste' | 'repair' }
  /**
   * Un servitore annuncia un'azione per `seconds` secondi: una raffica, una carica (fino a `to`), l'uscita da sotto
   * terra o un teletrasporto (verso `to`).
   */
  | { type: 'minion_telegraph'; action: 'shot' | 'charge' | 'emerge' | 'blink'; minionId: number; position: Vec2; to?: Vec2; seconds: number }
  /** Parte l'ondata `wave` di `waves` della stanza. */
  | { type: 'wave_started'; wave: number; waves: number }
  /** Resta un solo nemico nella stanza. */
  | { type: 'last_enemy'; position: Vec2 }
  /** La stanza e' libera: le porte si aprono e compare il premio. */
  | { type: 'room_cleared'; position: Vec2 }
  /** Un colpo ha raggiunto un riparo (fase 5): `left` e' la vita che gli resta, da 0 a 1. */
  | { type: 'cover_hit'; position: Vec2; cover: number; left: number }
  /** Un riparo si e' rotto: non ferma piu' corpi e colpi. */
  | { type: 'cover_broken'; position: Vec2; cover: number }
  /** Un giocatore ha ottenuto un premio (`reward`: tipo; `xp` dopo un'uccisione, `amount` è l'XP assegnato). */
  | { type: 'reward_taken'; position: Vec2; reward: string; amount?: number }
  /** Un giocatore ha scelto una tempra. */
  | { type: 'temper_chosen'; temperId: string; slot: number; grade: number }
  /** Il gruppo ha attraversato la porta `door` (indice fra quelle d'uscita). */
  | { type: 'room_exited'; door: number }
  | { type: 'match_ended'; won: boolean }) & { readonly playerId?: string };
