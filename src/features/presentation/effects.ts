import { SpriteEffects, replacesLegacy } from './vfx/sprite-effects';
import { CombatVfx } from './vfx/combat-vfx';
import { isBasicAttackCast, isBasicAttackVisual } from './vfx/basic-attack-visuals';
import type { Camera } from '../../core/camera';
import { cosmeticRng, type Rng } from '../../core/rng';
import { TAU, Vec2 } from '../../core/vec2';
import type { Boss } from '../boss/boss';
import type { GameEvent } from '../combat/events';
import type { Projectile } from '../combat/projectile';
import type { Match } from '../match/match';
import { bossFx } from './boss-fx';
import { minionArt } from './minion-art';
import { projectileLook, zoneLook, type ZoneLook } from './visuals';

/** Numero massimo di particelle e di onde contemporanee. */
const MAX_PARTICLES = 1400;
const MAX_WAVES = 80;
/** Ogni quanti secondi un proiettile lascia un punto della scia e una particella. */
const TRAIL_INTERVAL = 0.025;
const TRAIL_LENGTH = 9;
/** Oltre questo numero di proiettili le particelle di scia si dimezzano. */
const DENSE_PROJECTILES = 40;

/**
 * Durate degli effetti di risposta ai colpi e dei momenti chiave, in secondi. Provvisorie (vedi
 * docs/studio-combattimento-e-vittoria.md): si tarano con la prova manuale.
 */
export const FEEDBACK = {
  /** Lampo bianco del bersaglio colpito. */
  hitFlash: 0.09,
  /** Sobbalzo dello sprite colpito. */
  jolt: 0.08,
  /** Vignetta rossa dopo un colpo subito. */
  hurtFlash: 0.35,
  /** Lampo rosso dello schermo al passaggio in furia. */
  rageFlash: 0.7,
  /** Animazione di trasformazione del boss al passaggio in furia (dentro la pausa di 1,6 s della partita singola). */
  bossTransform: 1.2,
  /** Sequenza della morte del boss (lampeggia, trema, si frantuma) prima della schermata di vittoria. */
  bossDeath: 1.4,
  /** Lampo bianco dello schermo quando il boss si frantuma. */
  screenFlash: 0.3,
} as const;

/**
 * Livelli dei numeri del danno: dimensione e colore crescono con il danno del colpo, cosi' un colpo pesante si
 * riconosce a colpo d'occhio. Il primo livello con `min` <= danno vince (ordine decrescente). Provvisori.
 */
export const DAMAGE_TIERS: readonly { readonly min: number; readonly size: number; readonly color: string }[] = [
  { min: 200, size: 24, color: '#ff8a4c' },
  { min: 100, size: 20, color: '#ffb35c' },
  { min: 40, size: 16, color: '#ffd889' },
  { min: 0, size: 13, color: '#fff1cf' },
];

export function damageTier(amount: number): { readonly size: number; readonly color: string } {
  return DAMAGE_TIERS.find((tier) => amount >= tier.min) ?? DAMAGE_TIERS[DAMAGE_TIERS.length - 1]!;
}

/**
 * Colore dello scoppio al lancio, per id di aspetto della skill, dove differisce dal colore del proiettile
 * (valori del prototipo per le skill base). Se manca si usa il colore del proiettile.
 */
const CAST_COLORS: Readonly<Record<string, string>> = {
  arcane_bolt: '#c8a7ff',
  frost_orb: '#a5efff',
  meteor: '#cba5ff',
  grave_step:'#b7d5b9',ember_step:'#ff8c49',rime_step:'#9fe5ff',reed_burst:'#a8cb75',
};

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  remaining: number;
  total: number;
  color: string;
  size: number;
  gravity: number;
  /** Il punto del mondo da cui la particella e' partita: in isometria il moto resta sullo schermo attorno al suo punto. */
  ax?: number;
  ay?: number;
}

/** Anello che si espande da un punto. */
export interface Wave {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly color: string;
  remaining: number;
  readonly total: number;
}

/** Testo che sale e svanisce (numeri del danno, nomi degli attacchi). `size` in pixel; `outline` per la leggibilita'. */
export interface FloatingText {
  x: number;
  y: number;
  readonly text: string;
  readonly color: string;
  remaining: number;
  readonly total: number;
  readonly size: number;
  /** Deriva orizzontale, perche' i numeri vicini non si sovrappongano. */
  readonly vx: number;
  readonly outline: boolean;
  /** Le etichette XP usano lo stesso carattere pixel dei numeri, pur contenendo lettere. */
  readonly pixel?: boolean;
  /** Gli XP restano sopra il destinatario anche mentre cammina. */
  readonly attachment?: { readonly owner: string; readonly offsetY: number };
  /**
   * Il punto a terra del mondo a cui il testo appartiene (chi e' colpito, chi riceve gli XP): `x`, `y` meno questo punto e'
   * lo scostamento sullo schermo. In isometria il testo sta sopra il punto proiettato. Senza, il testo e' tutto nel mondo.
   */
  anchorX?: number;
  anchorY?: number;
}

export const XP_FEEDBACK = { life: 1.2, size: 16, color: '#efc0a1', offsetY: 46, stackGap: 24, maxTexts: 48 } as const;
export const GOLD_FEEDBACK = { ...XP_FEEDBACK, color:'#f5d58b' } as const;

/** Scintilla d'impatto: stella a quattro punte che si allarga e svanisce in un lampo. */
export interface Spark {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly color: string;
  readonly angle: number;
  remaining: number;
  readonly total: number;
}

/** Bagliore residuo di una zona dopo lo scoppio. */
export interface ZoneFlash {
  readonly position: Vec2;
  readonly radius: number;
  readonly look: ZoneLook;
  remaining: number;
  readonly total: number;
}

/** Fendente visibile di un colpo ravvicinato: un arco davanti al giocatore che svanisce in fretta. */
export interface Slash {
  readonly position: Vec2;
  readonly angle: number;
  readonly range: number;
  readonly arc: number;
  readonly color: string;
  remaining: number;
  readonly total: number;
}

/** La morte del boss in corso: il boss resta visibile mentre lampeggia, trema e si frantuma. */
export interface BossDeath {
  readonly position: Vec2;
  remaining: number;
  readonly total: number;
}

/**
 * Un segnale a terra a tempo: un servitore in arrivo (`incoming`), la linea di una carica, il cerchio di un'uscita da
 * sotto terra o di un teletrasporto, la posa di una raffica. Nasce dagli eventi, cosi' funziona anche in cooperativa.
 */
export interface Telegraph {
  readonly kind: 'incoming' | 'shot' | 'charge' | 'emerge' | 'blink' | 'aura';
  readonly position: Vec2;
  readonly to?: Vec2;
  /** Servitore annunciato (per seguirne la posa) o aspetto del servitore in arrivo. */
  readonly minionId?: number;
  readonly visual?: string;
  readonly elite?: string;
  readonly radius?: number;
  /** Tipo d'aura (scudo, fervore, riparazione): cambia il colore dell'onda. */
  readonly aura?: 'shield' | 'haste' | 'repair';
  remaining: number;
  readonly total: number;
}

/**
 * Traccia dello scontro sul pavimento: la bruciatura di una zona scoppiata o i resti di un servitore abbattuto. Resta
 * qualche decina di secondi e poi svanisce; solo aspetto (ogni client le crea dagli stessi eventi).
 */
export interface Decal {
  readonly x: number;
  readonly y: number;
  readonly kind: 'scorch' | 'remains';
  readonly color: string;
  readonly radius: number;
  /** Seme della forma, stabile per tutta la vita della traccia. */
  readonly seed: number;
  remaining: number;
  readonly total: number;
}

/** Durata delle tracce e quante ne restano al massimo (le piu' vecchie lasciano il posto). Provvisori. */
export const DECALS = { life: 26, max: 60 } as const;

const SLASH_LIFE = 0.18;
const TEXT_LIFE = 0.9;
const DAMAGE_TEXT_LIFE = 0.75;
const FLASH_LIFE = 0.65;
const SPARK_LIFE = 0.14;

/**
 * Effetti visivi: particelle, onde, testi, scie, lampi e scosse. Nascono dagli eventi della simulazione e dallo stato
 * dei suoi oggetti, ma non influiscono mai sulle regole. Usa una sorgente casuale propria (estetica, non riproducibile).
 */
export class Effects {
  readonly spriteVfx = new SpriteEffects();
  readonly combatVfx: CombatVfx;
  particles: Particle[] = [];
  waves: Wave[] = [];
  texts: FloatingText[] = [];
  flashes: ZoneFlash[] = [];
  slashes: Slash[] = [];
  sparks: Spark[] = [];
  /** Intensita' della scossa dello schermo, in unita' di vista: decade da sola. */
  shake = 0;
  /** Secondi di lampo bianco rimasti sul boss (colpito). */
  bossFlash = 0;
  /** Secondi di sobbalzo rimasti sul boss (colpito). */
  bossJolt = 0;
  /** Lampi dei servitori colpiti, per id. */
  readonly minionFlashes = new Map<number, number>();
  /** Lampi dei ripari colpiti (fase 5), per indice del riparo. */
  readonly coverFlashes = new Map<number, number>();
  /** Vignetta rossa (colpo subito dal giocatore di questo client). */
  hurtFlash = 0;
  /** Lampo rosso del passaggio in furia. */
  rageFlash = 0;
  /** Secondi rimasti della trasformazione del boss in furia. */
  bossTransform = 0;
  /** Lampo bianco del colpo finale. */
  screenFlash = 0;
  /** Sequenza della morte del boss, se in corso. */
  bossDeath: BossDeath | null = null;
  /** Segnali a terra dei servitori (comparse, cariche, uscite, teletrasporti, raffiche). */
  telegraphs: Telegraph[] = [];
  /** Rallentatore della stanza appena liberata (secondi rimasti): solo aspetto. */
  roomClearFlash = 0;
  /** Tracce dello scontro sul pavimento, dalla piu' vecchia alla piu' recente. */
  decals: Decal[] = [];

  private readonly trails = new Map<number, { emit: number; points: Vec2[]; emitted: number }>();
  /** Particelle d'ambiente del boss "in debito" (frazioni accumulate fra un passo e l'altro). */
  private ambientDebt = 0;

  constructor(private readonly rng: Rng = cosmeticRng) { this.combatVfx = new CombatVfx(rng); }

  clear(): void {
    this.spriteVfx.clear();
    this.combatVfx.clear();
    this.particles = [];
    this.waves = [];
    this.texts = [];
    this.flashes = [];
    this.slashes = [];
    this.sparks = [];
    this.shake = 0;
    this.bossFlash = 0;
    this.bossJolt = 0;
    this.minionFlashes.clear();
    this.coverFlashes.clear();
    this.hurtFlash = 0;
    this.rageFlash = 0;
    this.bossTransform = 0;
    this.screenFlash = 0;
    this.bossDeath = null;
    this.telegraphs = [];
    this.roomClearFlash = 0;
    this.decals = [];
    this.ambientDebt = 0;
    this.trails.clear();
  }

  /** Punti della scia di un proiettile, dal piu' vecchio al piu' recente. */
  trailOf(projectile: Projectile): readonly Vec2[] {
    return this.trails.get(projectile.id)?.points ?? [];
  }

  /**
   * Risponde a un evento della simulazione. In cooperativa `localPlayerId` e' il giocatore di questo client: solo i
   * suoi colpi subiti accendono la vignetta rossa e scuotono lo schermo.
   */
  handle(event: GameEvent, localPlayerId?: string): void {
    this.spriteVfx.handle(event);
    // Gli atlanti sostituiscono la vecchia sagoma, mai sangue, frammenti e particelle aggiuntive.
    this.combatVfx.handle(event);
    if (replacesLegacy(event)) return;
    switch (event.type) {
      case 'status_applied':
        this.wave(event.position, 22, '#d7c3a1', 0.3);
        break;
      case 'channel_started':
        this.wave(event.position, 36, '#d5aff3', event.seconds);
        break;
      case 'guard_blocked':
        this.wave(event.position, 45, '#ffe2a5', 0.35);
        this.burst(event.position, '#ffe2a5', 20);
        break;
      case 'skill_cast':
        this.onSkillCast(event);
        break;
      case 'damage_dealt':
        this.onDamage(event, localPlayerId);
        break;
      case 'projectile_hit':
        this.onProjectileHit(event);
        break;
      case 'cover_hit':
        // Il riparo trema e schiarisce; qualche scheggia.
        this.coverFlashes.set(event.cover, FEEDBACK.hitFlash);
        this.burst(event.position, '#bba98f', 4);
        break;
      case 'cover_broken':
        this.coverFlashes.delete(event.cover);
        this.burst(event.position, '#bba98f', 34);
        this.burst(event.position, '#6b5d52', 18);
        this.wave(event.position, 70, '#d8c8b0', 0.35);
        this.decal(event.position, 'remains', '#4a3f38', 34);
        this.shake = Math.max(this.shake, 3);
        break;
      case 'projectile_faded':
        // Colpo mancato: uno sbuffo grigio e spento, l'opposto della scintilla di un colpo a segno.
        for (let i = 0; i < 5; i++) {
          const a = this.rng.next() * TAU;
          this.particle(event.position.x, event.position.y, Math.cos(a) * 18, Math.sin(a) * 18 - 12, '#8d8794', 0.35, 2);
        }
        break;
      case 'zone_detonated': {
        const look = zoneLook(event.team, event.visual);
        this.onZoneDetonated(event.position, event.radius, look);
        this.decal(event.position, 'scorch', look.ring, event.radius * 0.8);
        break;
      }
      case 'boss_teleported':
        for (const point of [event.from, event.to]) {
          this.burst(point, '#d9c6ff', 22);
          this.wave(point, 46, '#e8dcff', 0.4);
        }
        break;
      case 'boss_phase_changed':
        this.text(event.position.x, event.position.y - 48, event.text, '#ff785d', 16, 0, TEXT_LIFE, event.position);
        this.burst(event.position, '#ff735b', 60);
        for (const [radius, life] of [[120, 0.5], [180, 0.7], [240, 0.9]] as const) this.wave(event.position, radius, '#ff6a4a', life);
        this.shake = 10;
        this.rageFlash = FEEDBACK.rageFlash;
        this.bossTransform = FEEDBACK.bossTransform;
        break;
      case 'boss_attack':
        this.text(event.position.x, event.position.y + event.labelOffsetY, event.name, event.color, 13, 0, TEXT_LIFE, event.position);
        break;
      case 'boss_charge_finished':
        this.burst(event.position, '#ffb06b', 24);
        this.shake = 5;
        break;
      case 'boss_defeated':
        this.bossDeath = { position: event.position, remaining: FEEDBACK.bossDeath, total: FEEDBACK.bossDeath };
        this.burst(event.position, '#ffd17f', 40);
        this.wave(event.position, 90, '#fff1ce', 0.5);
        this.shake = 8;
        break;
      case 'minion_spawned': {
        const art = minionArt(event.visual);
        this.burst(event.position, art.color, 14);
        this.wave(event.position, 26, art.color, 0.4);
        break;
      }
      case 'minion_defeated': {
        const art = minionArt(event.visual);
        // Le morti in massa restano leggere: poche particelle per servitore, un'onda piccola.
        this.burst(event.position, art.color, event.exploded ? 26 : event.revives ? 6 : 10);
        this.wave(event.position, event.exploded ? 44 : 22, art.color, 0.3);
        // Chi si rialza non lascia resti: le sue ossa si vedono gia' a terra.
        if (!event.revives) this.decal(event.position, event.exploded ? 'scorch' : 'remains', art.color, event.exploded ? 30 : 12);
        this.minionFlashes.delete(event.minionId);
        this.telegraphs = this.telegraphs.filter((telegraph) => telegraph.minionId !== event.minionId);
        if (event.exploded) this.shake = Math.max(this.shake, 4);
        break;
      }
      case 'minion_incoming':
        this.telegraphs.push({
          kind: 'incoming',
          position: event.position,
          visual: event.visual,
          ...(event.elite ? { elite: event.elite } : {}),
          remaining: event.delay,
          total: event.delay,
        });
        break;
      case 'minion_telegraph':
        this.telegraphs.push({
          kind: event.action,
          position: event.position,
          ...(event.to ? { to: event.to } : {}),
          minionId: event.minionId,
          remaining: event.seconds,
          total: event.seconds,
        });
        break;
      case 'minion_aura':
        this.telegraphs.push({ kind: 'aura', position: event.position, radius: event.radius, minionId: event.minionId, ...(event.aura ? { aura: event.aura } : {}), remaining: 0.6, total: 0.6 });
        break;
      case 'minion_woke':
      case 'minion_revived': {
        const color = event.type === 'minion_woke' ? '#b9b2a8' : minionArt(event.visual).color;
        this.burst(event.position, color, 14);
        this.wave(event.position, 30, color, 0.35);
        break;
      }
      case 'minion_blinked':
        for (const point of [event.from, event.position]) {
          this.burst(point, '#d9f2ff', 12);
          this.wave(point, 28, '#e8f8ff', 0.3);
        }
        break;
      case 'room_cleared':
        this.roomClearFlash = 0.6;
        for (const [radius, life] of [[120, 0.5], [220, 0.8]] as const) this.wave(event.position, radius, '#ffe3a6', life);
        break;
      case 'reward_taken':
        if (event.reward === 'xp'||event.reward==='gold') {
          const mine = event.playerId === undefined || event.playerId === (localPlayerId ?? 'local');
          if (mine && event.amount !== undefined && event.amount > 0) {
            if (this.texts.filter(text => text.pixel).length >= XP_FEEDBACK.maxTexts) {
              const oldest = this.texts.findIndex(text => text.pixel);
              this.texts.splice(oldest, 1);
            }
            const owner = event.playerId ?? localPlayerId ?? 'local';
            const nearby = this.texts.filter(text => text.attachment?.owner === owner);
            let offsetY:number=XP_FEEDBACK.offsetY,bestGap=-1;
            // L'oro arriva dopo gli XP: scegliere la riga libera evita di sovrapporlo al testo già salito.
            for(let lane=0;lane<4;lane++){
              const offset=XP_FEEDBACK.offsetY+lane*XP_FEEDBACK.stackGap;
              const gap=Math.min(...nearby.map(text=>Math.abs(event.position.y-offset-text.y)));
              if(gap>bestGap){offsetY=offset;bestGap=gap;}
              if(gap>=XP_FEEDBACK.stackGap)break;
            }
            this.texts.push({ x: event.position.x, y: event.position.y - offsetY,
              text: `+${event.amount} ${event.reward==='gold'?'oro':'XP'}`, color: event.reward==='gold'?GOLD_FEEDBACK.color:XP_FEEDBACK.color, remaining: XP_FEEDBACK.life, total: XP_FEEDBACK.life,
              size: XP_FEEDBACK.size, vx: 0, outline: true, pixel: true, attachment: { owner, offsetY } });
          }
          break;
        }
        this.burst(event.position, '#ffd889', 30);
        this.wave(event.position, 60, '#fff1ce', 0.5);
        break;
      case 'last_enemy':
        this.wave(event.position, 40, '#fff1ce', 0.6);
        break;
      case 'temper_chosen':
      case 'wave_started':
      case 'room_exited':
      case 'boss_pose':
      case 'match_ended':
        break;
    }
  }

  /** Avanza gli effetti di `dt` secondi e genera quelli che dipendono dallo stato (scie, carica, aure del boss). */
  update(dt: number, match: Match, camera: Camera): void {
    this.spriteVfx.update(dt);
    this.combatVfx.update(dt, match, camera);
    this.updateTrails(dt, match.projectiles, camera);
    const { boss } = match;
    if (boss !== null) {
      const charge = boss.charge;
      if (charge !== null && charge.elapsed >= charge.windup && boss.health.current > 0) {
        this.burst(boss.position, '#d89865', 2);
      }
      if (boss.health.current > 0 && camera.isVisible(boss.position, 120)) this.emitBossParticles(dt, boss);
    }
    for (const telegraph of this.telegraphs) telegraph.remaining -= dt;
    this.telegraphs = this.telegraphs.filter((telegraph) => telegraph.remaining > 0);
    for (const decal of this.decals) decal.remaining -= dt;
    if (this.decals.some((decal) => decal.remaining <= 0)) this.decals = this.decals.filter((decal) => decal.remaining > 0);
    this.updateDeath(dt);

    for (const f of this.particles) {
      f.remaining -= dt;
      f.vy += f.gravity * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vx *= Math.exp(-dt * 1.8);
    }
    this.particles = this.particles.filter((f) => f.remaining > 0);
    for (const w of this.waves) w.remaining -= dt;
    this.waves = this.waves.filter((w) => w.remaining > 0);
    for (const t of this.texts) {
      t.remaining -= dt;
      if (t.attachment) {
        const player = match.players.get(t.attachment.owner);
        if (!player) { t.remaining = 0; continue; }
        t.x = player.position.x;
        t.y = player.position.y - t.attachment.offsetY - (t.total - t.remaining) * 25;
        t.anchorX = player.position.x;
        t.anchorY = player.position.y;
      } else { t.y -= 25 * dt; t.x += t.vx * dt; }
    }
    this.texts = this.texts.filter((t) => t.remaining > 0);
    for (const flash of this.flashes) flash.remaining -= dt;
    this.flashes = this.flashes.filter((flash) => flash.remaining > 0);
    for (const slash of this.slashes) slash.remaining -= dt;
    this.slashes = this.slashes.filter((slash) => slash.remaining > 0);
    for (const spark of this.sparks) spark.remaining -= dt;
    this.sparks = this.sparks.filter((spark) => spark.remaining > 0);
    for (const [id, left] of this.minionFlashes) {
      if (left - dt <= 0) this.minionFlashes.delete(id);
      else this.minionFlashes.set(id, left - dt);
    }
    for (const [index, left] of this.coverFlashes) {
      if (left - dt <= 0) this.coverFlashes.delete(index);
      else this.coverFlashes.set(index, left - dt);
    }
    this.shake = Math.max(0, this.shake - dt * 25);
    this.bossFlash = Math.max(0, this.bossFlash - dt);
    this.bossJolt = Math.max(0, this.bossJolt - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    this.rageFlash = Math.max(0, this.rageFlash - dt);
    this.bossTransform = Math.max(0, this.bossTransform - dt);
    this.screenFlash = Math.max(0, this.screenFlash - dt);
    this.roomClearFlash = Math.max(0, this.roomClearFlash - dt);
  }

  /** Scostamento di camera per la scossa corrente (zero a riposo). */
  shakeOffset(): Vec2 {
    if (this.shake <= 0) return Vec2.ZERO;
    return new Vec2((this.rng.next() - 0.5) * this.shake, (this.rng.next() - 0.5) * this.shake);
  }

  /** Spostamento dello sprite del boss per il sobbalzo e per il tremito della morte (zero a riposo). */
  bossOffset(): Vec2 {
    const death = this.bossDeath;
    const amount = death !== null ? 2 + (1 - death.remaining / death.total) * 5 : this.bossJolt > 0 ? 3 : 0;
    if (amount === 0) return Vec2.ZERO;
    return new Vec2((this.rng.next() - 0.5) * amount, (this.rng.next() - 0.5) * amount);
  }

  private onDamage(event: Extract<GameEvent, { type: 'damage_dealt' }>, localPlayerId: string | undefined): void {
    const { position, amount } = event;
    if (event.target === 'boss') {
      this.damageText(position.x + (this.rng.next() - 0.5) * 34, position.y - 34, amount, 1, position);
      this.bossFlash = FEEDBACK.hitFlash;
      this.bossJolt = FEEDBACK.jolt;
      this.burst(position, '#d8a5fa', 6);
    } else if (event.target === 'minion') {
      this.damageText(position.x + (this.rng.next() - 0.5) * 16, position.y - 20, amount, 0.8, position);
      if (event.minionId !== undefined) this.minionFlashes.set(event.minionId, FEEDBACK.hitFlash);
      this.burst(position, '#f0d8c0', 3);
    } else {
      const mine = localPlayerId === undefined || event.playerId === undefined || event.playerId === localPlayerId;
      this.text(position.x, position.y - 22, `−${amount}`, '#ff6f61', mine ? 17 : 12, 0, DAMAGE_TEXT_LIFE, position);
      if (mine) {
        this.shake = Math.max(this.shake, 6);
        this.hurtFlash = FEEDBACK.hurtFlash;
        this.burst(position, '#ff5a4a', 10);
      }
    }
  }

  private onProjectileHit(event: Extract<GameEvent, { type: 'projectile_hit' }>): void {
    const color = projectileLook(event.visual).color;
    const big = event.radius > 6;
    if (event.struck === 'obstacle') {
      // Contro un pilastro: polvere e schegge spente, nessuna scintilla.
      for (let i = 0; i < 8; i++) {
        const a = this.rng.next() * TAU;
        const v = 25 + this.rng.next() * 60;
        this.particle(event.position.x, event.position.y, Math.cos(a) * v, Math.sin(a) * v, i % 2 ? '#9a8f87' : '#6d6470', 0.4, 2, 60);
      }
      this.wave(event.position, 10, '#8d8794', 0.2);
      return;
    }
    if (event.struck === 'boss' || event.struck === 'minion') {
      // Colpo a segno: scintilla bianca, scoppio pieno e anello.
      this.sparks.push({ x: event.position.x, y: event.position.y, size: big ? 16 : 11, color: '#fff6dc', angle: this.rng.next() * Math.PI, remaining: SPARK_LIFE, total: SPARK_LIFE });
    }
    this.burst(event.position, color, big ? 24 : 10);
    this.wave(event.position, big ? 35 : 19, color, 0.28);
    if (event.visual === 'frost_orb') {
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5;
        this.particle(event.position.x, event.position.y, Math.cos(a) * 150, Math.sin(a) * 150, '#d5fbff', 0.45, 4, 30);
      }
    }
  }

  /** Particelle d'ambiente del boss e, in furia, aura fitta del suo colore. */
  private emitBossParticles(dt: number, boss: Boss): void {
    const fx = bossFx(boss.definition.art);
    const rate = fx.ambient.rate + (boss.isEnraged ? fx.rage.rate : 0);
    this.ambientDebt += rate * dt;
    while (this.ambientDebt >= 1) {
      this.ambientDebt -= 1;
      const enraged = boss.isEnraged && this.rng.next() < fx.rage.rate / rate;
      const colors = enraged ? fx.rage.colors : fx.ambient.colors;
      const color = colors[Math.floor(this.rng.next() * colors.length)] ?? colors[0]!;
      const spread = fx.ambient.spread * (enraged ? 1.2 : 1);
      this.particle(
        boss.position.x + (this.rng.next() - 0.5) * spread * 2,
        boss.position.y + (this.rng.next() - 0.5) * spread,
        (this.rng.next() - 0.5) * 14,
        fx.ambient.rise * (0.6 + this.rng.next() * 0.8) * (enraged ? 1.6 : 1),
        color,
        0.7 + this.rng.next() * 0.7,
        enraged ? 2 + this.rng.next() * 2 : 1 + this.rng.next() * 2,
      );
    }
  }

  /** Durante la morte il boss perde frammenti; alla fine si frantuma con un lampo. */
  private updateDeath(dt: number): void {
    const death = this.bossDeath;
    if (death === null) return;
    const before = death.remaining;
    death.remaining -= dt;
    if (Math.floor(before * 12) !== Math.floor(death.remaining * 12)) this.burst(death.position, '#ffe2a8', 6);
    if (death.remaining > 0) return;
    this.burst(death.position, '#ffd17f', 120);
    this.burst(death.position, '#fff6dc', 40);
    for (const [radius, life] of [[80, 0.45], [150, 0.7], [230, 0.95]] as const) this.wave(death.position, radius, '#ffe3a6', life);
    this.screenFlash = FEEDBACK.screenFlash;
    this.shake = 12;
    this.bossDeath = null;
  }

  private onSkillCast(event: Extract<GameEvent, { type: 'skill_cast' }>): void {
    const { origin, destination } = event;
    const basic=isBasicAttackCast(event);
    switch (event.kind) {
      case 'buff':
        this.wave(origin, 45, event.visual.startsWith('warrior') ? '#eecb8d' : '#a9dfb8', 0.5);
        this.burst(origin, '#e5d7af', 15);
        break;
      case 'summon':
        this.wave(origin, 55, '#c0d6b1', 0.6);
        this.burst(origin, '#c0d6b1', 25);
        break;
      case 'projectile': {
        const color = CAST_COLORS[event.visual] ?? projectileLook(event.visual).color;
        if(!basic)this.burst(origin.add(Vec2.fromAngle(event.angle, 14)), color, 8);
        this.wave(origin, 16, color, 0.18);
        break;
      }
      case 'ground_blast':
        // Il segnale e lo scoppio sono della zona; attorno al lanciatore si vede solo un anello.
        if (origin.equals(destination)) this.wave(origin, 30, CAST_COLORS[event.visual] ?? '#cba5ff', 0.3);
        break;
      case 'dash': {
        const color=CAST_COLORS[event.visual]??'#b8a4ef';
        this.burst(origin, color);
        this.wave(origin, 24, color);
        for (let j = 0; j < 30; j++) {
          const u = j / 30;
          const point = origin.lerp(destination, u);
          this.particle(
            point.x,
            point.y,
            (this.rng.next() - 0.5) * 25,
            (this.rng.next() - 0.5) * 25,
            CAST_COLORS[event.visual]??'#c6acff',
            0.25 + u * 0.3,
            2 + this.rng.next() * 3,
          );
        }
        this.wave(destination, 28, CAST_COLORS[event.visual]??'#dfccff');
        this.burst(destination, color);
        break;
      }
      case 'melee_arc': {
        const color = CAST_COLORS[event.visual] ?? '#ffd9a0';
        const range = event.range ?? 80;
        this.slashes.push({
          position: origin,
          angle: event.angle,
          range,
          arc: event.arc ?? 1.6,
          color,
          remaining: SLASH_LIFE,
          total: SLASH_LIFE,
        });
        if(!basic)this.burst(origin.add(Vec2.fromAngle(event.angle, range * 0.8)), color, 6);
        break;
      }
    }
  }

  private onZoneDetonated(position: Vec2, radius: number, look: ZoneLook): void {
    this.wave(position, radius, look.burst, 0.55);
    this.wave(position, radius * 0.8, '#fff1ce', 0.3);
    for (let i = 0; i < 65; i++) {
      const a = this.rng.next() * TAU;
      const v = 40 + this.rng.next() * radius * 2;
      this.particle(
        position.x,
        position.y,
        Math.cos(a) * v,
        Math.sin(a) * v - 30,
        i % 3 === 0 ? '#fff1d7' : look.burst,
        0.35 + this.rng.next() * 0.6,
        2 + this.rng.next() * 5,
        115,
      );
    }
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8;
      this.particle(
        position.x + Math.cos(a) * radius * 0.65,
        position.y + Math.sin(a) * radius * 0.65,
        Math.cos(a) * 35,
        Math.sin(a) * 35,
        look.burst,
        0.7,
        3,
      );
    }
    this.flashes.push({ position, radius, look, remaining: FLASH_LIFE, total: FLASH_LIFE });
    this.shake = Math.max(this.shake, 3);
  }

  private updateTrails(dt: number, projectiles: readonly Projectile[], camera: Camera): void {
    const alive = new Set<number>();
    // Con molti proiettili a schermo le particelle di scia si dimezzano: sono decorazione, non informazione.
    const dense = projectiles.length > DENSE_PROJECTILES;
    for (const projectile of projectiles) {
      alive.add(projectile.id);
      let trail = this.trails.get(projectile.id);
      if (trail === undefined) {
        trail = { emit: 0, points: [], emitted: 0 };
        this.trails.set(projectile.id, trail);
      }
      trail.emit += dt;
      while (trail.emit >= TRAIL_INTERVAL) {
        trail.emit -= TRAIL_INTERVAL;
        trail.points.push(projectile.position);
        if (trail.points.length > TRAIL_LENGTH) trail.points.shift();
        if (projectile.team==='player'&&isBasicAttackVisual(projectile.spec.visual)) continue;
        if (dense && trail.emitted++ % 2 === 1) continue;
        if (camera.isVisible(projectile.position, 50)) {
          const r = projectile.radius;
          this.particle(
            projectile.position.x + (this.rng.next() - 0.5) * r,
            projectile.position.y + (this.rng.next() - 0.5) * r,
            -projectile.velocity.x * 0.07 + (this.rng.next() - 0.5) * 22,
            -projectile.velocity.y * 0.07 + (this.rng.next() - 0.5) * 22,
            projectileLook(projectile.spec.visual).color,
            0.18 + this.rng.next() * 0.16,
            projectile.team === 'enemy' ? 2 : 3,
          );
        }
      }
    }
    for (const id of this.trails.keys()) if (!alive.has(id)) this.trails.delete(id);
  }

  private decal(position: Vec2, kind: Decal['kind'], color: string, radius: number): void {
    this.decals.push({ x: position.x, y: position.y, kind, color, radius, seed: this.rng.next(), remaining: DECALS.life, total: DECALS.life });
    if (this.decals.length > DECALS.max) this.decals.shift();
  }

  private particle(x: number, y: number, vx: number, vy: number, color: string, life = 0.45, size = 3, gravity = 0): void {
    if (this.particles.length >= MAX_PARTICLES) return;
    this.particles.push({ x, y, vx, vy, remaining: life, total: life, color, size, gravity, ax: x, ay: y });
  }

  private burst(position: Vec2, color: string, count = 16): void {
    for (let i = 0; i < count; i++) {
      const a = this.rng.next() * TAU;
      const v = 35 + this.rng.next() * 150;
      this.particle(position.x, position.y, Math.cos(a) * v, Math.sin(a) * v, color, 0.25 + this.rng.next() * 0.45, 2 + this.rng.next() * 3, 70);
    }
  }

  private wave(position: Vec2, radius: number, color: string, life = 0.4): void {
    this.waves.push({ x: position.x, y: position.y, radius, color, remaining: life, total: life });
    if (this.waves.length > MAX_WAVES) this.waves.shift();
  }

  /** Numero del danno: dimensione e colore dal livello, piccola deriva laterale casuale. `scale` rimpicciolisce (servitori). */
  private damageText(x: number, y: number, amount: number, scale: number, anchor?: Vec2): void {
    const tier = damageTier(amount);
    this.text(x, y, String(amount), tier.color, Math.round(tier.size * scale), (this.rng.next() - 0.5) * 30, DAMAGE_TEXT_LIFE, anchor);
  }

  private text(x: number, y: number, text: string, color: string, size = 13, vx = 0, life = TEXT_LIFE, anchor?: Vec2): void {
    this.texts.push({ x, y, text, color, remaining: life, total: life, size, vx, outline: true, ...(anchor === undefined ? {} : { anchorX: anchor.x, anchorY: anchor.y }) });
  }
}
