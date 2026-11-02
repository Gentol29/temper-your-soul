import type { BossSummons } from '../minions/minion-definition';
import type { Boss } from './boss';
import type { BossContext } from './boss-context';

/** Un valore che cambia con la fase del boss: `normal` nella prima, `rage` in furia (seconda fase). */
export interface ByPhase<T> {
  readonly normal: T;
  readonly rage: T;
}

export const pick = <T>(values: ByPhase<T>, boss: { readonly isEnraged: boolean }): T =>
  boss.isEnraged ? values.rage : values.normal;

/** Valori di un boss. Provvisori (vedi docs/game-design.md): non definiscono il bilanciamento. */
export interface BossStats {
  readonly maxHealth: number;
  /** Sotto questa frazione di vita il boss entra nella seconda fase (furia). */
  readonly phaseTwoThreshold: number;
  /** Velocita' di inseguimento, normale e con il gelo, in unita' al secondo. */
  readonly speed: number;
  readonly slowedSpeed: number;
  /** Entro questa distanza dal giocatore smette di avvicinarsi e gli gira attorno. */
  readonly orbitDistance: number;
  /** Velocita' di rotazione attorno al giocatore, come frazione della velocita' di inseguimento. */
  readonly orbitSpeedFactor: number;
  /** Secondi prima del primo attacco. */
  readonly firstAttackDelay: number;
  /** Secondi tra la partenza di un attacco e quella del successivo, per fase. */
  readonly attackInterval: ByPhase<number>;
  /** Secondi di posa di lancio all'inizio di ogni attacco (alcuni schemi la prolungano o la ripetono). */
  readonly attackPose: number;
  /** Raggio di colpo del boss contro proiettili e zone del giocatore. */
  readonly hitRadius: number;
  /** Sotto questa distanza tra i centri il boss ferisce il giocatore per contatto, con questo danno. */
  readonly contactDistance: number;
  readonly contactDamage: number;
  /** Secondi fra colpi fisici sullo stesso giocatore; default in CONTACT_ATTACKS. */
  readonly contactInterval?: number;
  /** Danno della carica e distanza dal boss in carica sotto la quale il giocatore viene colpito. */
  readonly chargeDamage: number;
  readonly chargeHitDistance: number;
}

/**
 * Un'azione programmata: esegue `run` quando `delay` arriva a zero. Finche' ce ne sono in attesa il boss non lancia un
 * altro attacco. `tag` e `angle` sono solo etichette (per i test e la lettura).
 */
export interface ScheduledAction {
  delay: number;
  readonly tag: string;
  readonly angle?: number;
  run(boss: Boss, ctx: BossContext): void;
}

export interface BossPattern {
  readonly id: string;
  /** Testo mostrato sopra il boss quando lo schema parte (in italiano). */
  readonly name: string;
  readonly labelColor: string;
  /** Scostamento verticale del testo rispetto al boss (negativo = sopra). */
  readonly labelOffsetY: number;
  execute(boss: Boss, ctx: BossContext): void;
}

/** Un boss: nome, aspetto (id in `presentation/boss-art.ts`), valori e schemi in rotazione. */
export interface BossDefinition {
  /** Id stabile (non rinominarlo: lo usano i salvataggi, i test e la rappresentazione). */
  readonly id: string;
  /** Nome mostrato nell'interfaccia (in italiano, maiuscolo). */
  readonly name: string;
  readonly art: string;
  /** Testo mostrato quando il boss entra in furia; se manca vale "<NOME> SI INFURIA". */
  readonly rageText?: string;
  readonly stats: BossStats;
  /** Gli schemi nell'ordine di rotazione: dopo l'ultimo si riparte dal primo. */
  readonly patterns: readonly BossPattern[];
  /** Servitori che il boss evoca in furia (proposta, vedi `minions/minion-catalog.ts`). Senza, nessun servitore. */
  readonly summons?: BossSummons;
}
