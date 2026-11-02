import type { DangerZoneSpec } from '../combat/danger-zone';
import type { ProjectileSpec } from '../combat/projectile';

/**
 * Come si muove e attacca un servitore (il comportamento sta in `minion-ai.ts`):
 * - `chaser`: insegue il giocatore piu' vicino e lo ferisce per contatto (con l'invulnerabilita' dopo il colpo);
 * - `kamikaze`: insegue e, arrivato a contatto, esplode ferendo chi e' vicino e muore;
 * - `turret`: resta fermo e spara (o lancia zone) a intervalli;
 * - `shooter`: tiene la distanza (`preferredDistance`) e spara colpi annunciati;
 * - `charger`: si avvicina, segna una linea a terra e scatta (`charge`);
 * - `flyer`: vola sopra i ripari con una traiettoria ondulata (`weave`);
 * - `leaper`: salta sul giocatore; il punto d'atterraggio e' una zona segnalata (`leap`);
 * - `burrower`: si muove sotto terra, emerge con un segnale e frusta in linea (`burrow`);
 * - `nest`: fermo, genera altri servitori finche' vive (`nest`);
 * - `support`: resta lontano e protegge i vicini (`aura`);
 * - `orbiter`: gira attorno al giocatore sparando (`orbit`);
 * - `fleer`: fugge dai giocatori (la preda della stanza Caccia).
 */
export type MinionBehavior =
  | 'chaser'
  | 'kamikaze'
  | 'turret'
  | 'shooter'
  | 'charger'
  | 'flyer'
  | 'leaper'
  | 'burrower'
  | 'nest'
  | 'support'
  | 'orbiter'
  | 'fleer';

/** Ruolo per il regista delle ondate: decide il costo e le regole di composizione. */
export type MinionTier = 'swarm' | 'base' | 'heavy' | 'nest' | 'support';

/** Disposizione dei colpi di una raffica. */
export type ShotPattern =
  /** `count` colpi a ventaglio verso il bersaglio, distanziati di `spread` radianti. */
  | { readonly kind: 'aimed'; readonly count: number; readonly spread: number }
  /**
   * Anello di `count` colpi; senza i `gap` colpi rivolti verso il bersaglio (il varco), ruotato di `turn` a ogni raffica.
   * Con `mirror` spara anche un secondo anello che ruota nel verso opposto (la spirale doppia).
   */
  | { readonly kind: 'ring'; readonly count: number; readonly gap?: number; readonly turn?: number; readonly mirror?: boolean }
  /** Quattro colpi a croce, allineati al bersaglio o in diagonale. */
  | { readonly kind: 'cross'; readonly diagonal?: boolean }
  /** Due colpi perpendicolari alla direzione del bersaglio, in versi opposti. */
  | { readonly kind: 'pair' }
  /** Anello di `count` colpi su un cerchio di raggio `radius` attorno al bersaglio, che si stringe; `gap` colpi mancanti. */
  | { readonly kind: 'implode'; readonly count: number; readonly radius: number; readonly gap: number };

export interface MinionShot {
  readonly projectile: ProjectileSpec;
  /** Secondi tra una raffica e la successiva. */
  readonly interval: number;
  /** Secondi prima della prima raffica. */
  readonly firstDelay: number;
  /** Disposizione dei colpi (predefinita: un colpo mirato). */
  readonly pattern?: ShotPattern;
  /** Secondi di posa annunciata prima della raffica (il tempo della raffica non cambia: la posa la precede). */
  readonly windup?: number;
  /** Spara solo se il bersaglio e' entro questa distanza. */
  readonly range?: number;
  /**
   * Raffica in serie: dopo la prima, altre `count - 1` raffiche a `gap` secondi una dall'altra, senza nuova posa. Ognuna
   * mira di nuovo il bersaglio, ruotata di `turn` radianti in piu' rispetto alla precedente.
   */
  readonly series?: { readonly count: number; readonly gap: number; readonly turn?: number };
}

/** Anello di proiettili sparato all'arrivo (fine della carica, atterraggio del salto, emersione dello scavatore). */
export interface MinionArrivalRing {
  readonly projectile: ProjectileSpec;
  readonly count: number;
}

/** Carica: preparazione con la linea a terra, scatto rettilineo, poi un attimo di respiro in cui e' vulnerabile. */
export interface MinionCharge {
  readonly range: number;
  readonly windup: number;
  readonly distance: number;
  readonly speed: number;
  readonly recover: number;
  readonly cooldown: number;
  readonly damage: number;
  /** Zone lasciate lungo il percorso (ogni `trailSpacing` unita'). */
  readonly trail?: DangerZoneSpec;
  readonly trailSpacing?: number;
  /** Anello di colpi a fine carica. */
  readonly arrivalRing?: MinionArrivalRing;
  /** Quante volte rimbalza sui muri della stanza prima di fermarsi (la distanza che resta continua di rimbalzo). */
  readonly bounces?: number;
}

/** Salto: il punto d'arrivo e' una zona segnalata che esplode all'atterraggio. */
export interface MinionLeap {
  readonly range: number;
  readonly windup: number;
  readonly flight: number;
  readonly cooldown: number;
  readonly zone: DangerZoneSpec;
  /** Anello di colpi all'atterraggio. */
  readonly arrivalRing?: MinionArrivalRing;
}

/**
 * Agguato: vicino al bersaglio segna a terra un punto dietro di lui (sulla via di fuga), poi ci ricompare e morde con
 * un ventaglio di colpi verso il bersaglio. Solo per gli inseguitori senza carica (`chaser`).
 */
export interface MinionAmbush {
  /** Distanza dal bersaglio a cui scatta. */
  readonly trigger: number;
  /** Quanto dietro il bersaglio ricompare. */
  readonly behind: number;
  readonly windup: number;
  readonly cooldown: number;
  readonly projectile: ProjectileSpec;
  readonly count: number;
  readonly spread: number;
}

/** Scavatore: sotto terra non si colpisce; emerge con un segnale, frusta in linea e resta scoperto per un po'. */
export interface MinionBurrow {
  readonly emergeRange: number;
  readonly emergeTime: number;
  readonly exposed: number;
  readonly lash: { readonly zone: DangerZoneSpec; readonly count: number; readonly spacing: number };
  /** Anello di colpi quando emerge, insieme alla frusta. */
  readonly arrivalRing?: MinionArrivalRing;
}

/** Nido: genera servitori di un altro tipo finche' vive. */
export interface MinionNest {
  /** Id del servitore generato (in `MINIONS`). */
  readonly spawn: string;
  readonly interval: number;
  readonly firstDelay: number;
  readonly burst: number;
  readonly maxChildren: number;
}

/**
 * Sostegno: a intervalli agisce sui servitori vicini.
 * - `shield`: uno scudo che assorbe i proiettili (`amount`);
 * - `haste` (fervore): per `duration` secondi i loro intervalli d'attacco si moltiplicano per `amount` (sotto 1);
 * - `repair` (riparazione): recuperano `amount` della vita massima.
 */
export interface MinionAura {
  readonly kind: 'shield' | 'haste' | 'repair';
  readonly radius: number;
  readonly amount: number;
  readonly interval: number;
  readonly duration?: number;
}

/** Zone lanciate sul bersaglio (artiglieria) o una fila di zone di traverso sul suo percorso. */
export interface MinionLob {
  readonly zone: DangerZoneSpec;
  readonly interval: number;
  readonly firstDelay: number;
  readonly range: number;
  /**
   * - `spots`: `count` zone attorno al bersaglio (entro `scatter`);
   * - `wall`: una fila perpendicolare con un varco;
   * - `ring`: `count` zone su un cerchio di raggio `scatter` attorno al bersaglio, il centro resta libero;
   * - `cross`: una zona sul bersaglio e quattro bracci di `count` zone, che scoppiano dal centro verso fuori;
   * - `cone`: `count` ondate di `rows` zone (predefinito 3) dal servitore verso il bersaglio, una dopo l'altra.
   */
  readonly shape: 'spots' | 'wall' | 'ring' | 'cross' | 'cone';
  readonly count: number;
  readonly scatter: number;
  readonly rows?: number;
}

/** Teletrasporto difensivo: se un giocatore si avvicina troppo, sparisce e ricompare lontano dopo un segnale. */
export interface MinionBlink {
  readonly trigger: number;
  readonly range: number;
  readonly windup: number;
  readonly cooldown: number;
}

/** Che cosa succede alla morte. */
export type MinionDeath =
  /** Si divide in `count` servitori `into`. */
  | { readonly kind: 'split'; readonly into: string; readonly count: number }
  /** Lascia una pozza: `pulses` zone nello stesso punto, una ogni `interval` secondi. */
  | { readonly kind: 'pool'; readonly zone: DangerZoneSpec; readonly pulses: number; readonly interval: number }
  /** Si frantuma in un anello di `count` proiettili. */
  | { readonly kind: 'ring'; readonly projectile: ProjectileSpec; readonly count: number }
  /** Si rialza una volta dopo `delay` secondi con `fraction` della vita, se non lo finisce una zona o un colpo ravvicinato. */
  | { readonly kind: 'revive'; readonly delay: number; readonly fraction: number };

/** Un tipo di servitore. Dati di sola lettura e provvisori (vedi docs/game-design.md). */
export interface MinionDefinition {
  /** Id stabile: lo usano rete, test e rappresentazione. */
  readonly id: string;
  /** Nome in italiano. */
  readonly name: string;
  /** Aspetto (id in `presentation/minion-art.ts`). Il prefisso del tema (`crypt_`, `swamp_`...) sceglie anche il suono. */
  readonly visual: string;
  readonly behavior: MinionBehavior;
  /** Ruolo per il regista (predefinito dal comportamento: vedi `minionTier`). */
  readonly tier?: MinionTier;
  readonly maxHealth: number;
  /** Velocita' in unita' al secondo (zero per le torrette). */
  readonly speed: number;
  /** Raggio di colpo contro proiettili, zone e colpi ravvicinati del giocatore; anche corpo contro i pilastri. */
  readonly hitRadius: number;
  /** Danno al contatto (o dell'esplosione, per `kamikaze`). */
  readonly contactDamage: number;
  /** Secondi fra colpi fisici sullo stesso giocatore; default in CONTACT_ATTACKS. */
  readonly contactInterval?: number;
  /** Solo `kamikaze`: raggio dell'esplosione attorno al servitore. */
  readonly blastRadius?: number;
  /** Raffiche a intervalli (torrette, tiratori, orbitanti, pesanti che colpiscono da vicino). */
  readonly shot?: MinionShot;
  readonly charge?: MinionCharge;
  readonly leap?: MinionLeap;
  readonly burrow?: MinionBurrow;
  readonly nest?: MinionNest;
  readonly aura?: MinionAura;
  readonly lob?: MinionLob;
  readonly blink?: MinionBlink;
  readonly ambush?: MinionAmbush;
  readonly onDeath?: MinionDeath;
  /** Zone lasciate camminando, una ogni `interval` secondi. */
  readonly trail?: { readonly zone: DangerZoneSpec; readonly interval: number };
  /** Distanza a cui resta (tiratori, sostegni, orbitanti). */
  readonly preferredDistance?: number;
  /** Ampiezza dell'ondeggiamento dei volanti, in unita'. */
  readonly weave?: number;
  /** Raggio e velocita' angolare (radianti al secondo) attorno al giocatore. */
  readonly orbit?: { readonly radius: number; readonly speed: number };
  /** Vola sopra i pilastri (non ne e' fermato). */
  readonly flying?: boolean;
  /** Parte addormentato (sembra arredo) e si sveglia quando un giocatore si avvicina o lo colpisce. */
  readonly dormant?: { readonly wakeRadius: number };
  /** I suoi colpi rallentano il giocatore per questi secondi. */
  readonly slowOnHit?: number;
  /** Se e' rallentato quando muore, non si divide (il metallo fuso si fredda). */
  readonly inertWhenSlowed?: boolean;
}

/** Quando e quanti servitori evoca un boss. Provvisorio. */
export interface BossSummons {
  readonly minion: MinionDefinition;
  /** Quanti ne evoca entrando in furia (fase 2). */
  readonly onRage: number;
  /** In furia, ogni quanti attacchi ne evoca altri `wave`. */
  readonly everyAttacks: number;
  readonly wave: number;
  /** Mai piu' di questi vivi insieme. */
  readonly maxAlive: number;
  /** Distanza dal boss a cui compaiono (in cerchio). */
  readonly ringRadius: number;
}

/** Il ruolo di un servitore per il regista: dichiarato, o dedotto dal comportamento. */
export function minionTier(definition: MinionDefinition): MinionTier {
  if (definition.tier !== undefined) return definition.tier;
  switch (definition.behavior) {
    case 'nest':
      return 'nest';
    case 'support':
      return 'support';
    case 'flyer':
    case 'chaser':
      return 'swarm';
    default:
      return 'base';
  }
}
