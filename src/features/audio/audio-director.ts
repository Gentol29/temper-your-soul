import { clamp, type Vec2 } from '../../core/vec2';
import type { ArenaThemeId } from '../arena/arena';
import type { GameEvent } from '../combat/events';
import {
  KIND_SOUNDS,
  MUSIC,
  SKILL_SOUNDS,
  TEAM_BLAST_SOUNDS,
  ZONE_PREFIX_SOUNDS,
  ZONE_SOUNDS,
  type LoopDefinition,
  type MusicId,
  type SoundId,
} from './audio-catalog';

/*
 * Regia del suono: decide COSA suonare e quando, senza toccare il browser. Funzioni pure, provate nei test; il motore
 * (`audio-player.ts`) si limita a eseguire.
 */

/** Un suono da far partire, con la posizione nel mondo (per stereo e distanza) se ce l'ha. */
export interface Cue {
  readonly sound: SoundId;
  readonly position?: Vec2;
}

/**
 * I suoni che accompagnano un evento della simulazione. In cooperativa `localPlayerId` e' il giocatore di questo
 * client: il colpo subito suona solo per lui, quelli degli alleati sono semplici impatti.
 */
export function cuesForEvent(event: GameEvent, localPlayerId?: string): Cue[] {
  switch (event.type) {
    case 'status_applied': return [];
    case 'channel_started': return [{ sound: 'cast_arcane', position: event.position }];
    case 'guard_blocked': return [{ sound: 'impact', position: event.position }];
    case 'skill_cast':
      return [{ sound: SKILL_SOUNDS[event.visual] ?? KIND_SOUNDS[event.kind], position: event.origin }];
    case 'damage_dealt': {
      if (event.target !== 'player') return [{ sound: 'boss_hit', position: event.position }];
      const ally = localPlayerId !== undefined && event.playerId !== undefined && event.playerId !== localPlayerId;
      return [{ sound: ally ? 'impact' : 'player_hurt', position: event.position }];
    }
    case 'projectile_hit':
      return [{ sound: 'impact', position: event.position }];
    case 'minion_defeated':
      return [{ sound: zoneSound('enemy', event.visual), position: event.position }];
    // Il colpo mancato si vede (sbuffo grigio) ma non si sente; la comparsa dei servitori e' coperta dal gong della furia.
    case 'projectile_faded':
    case 'minion_spawned':
      return [];
    case 'zone_detonated':
      return [{ sound: zoneSound(event.team, event.visual), position: event.position }];
    case 'boss_attack':
      return [{ sound: 'boss_attack', position: event.position }];
    case 'boss_phase_changed':
      return [{ sound: 'boss_rage', position: event.position }];
    case 'boss_charge_finished':
      return [{ sound: 'boss_slam', position: event.position }];
    case 'boss_teleported':
      return [{ sound: 'boss_teleport', position: event.to }];
    case 'boss_defeated':
      return [{ sound: 'boss_defeated', position: event.position }];
    case 'match_ended':
      return [{ sound: event.won ? 'victory' : 'defeat' }];
    // Discesa: le porte che si chiudono sulla prima ondata, l'ultimo nemico, la stanza libera, i premi.
    case 'wave_started':
      return event.wave === 1 ? [{ sound: 'boss_slam' }] : [];
    case 'last_enemy':
      return [{ sound: 'ui_toggle', position: event.position }];
    case 'room_cleared':
      return [{ sound: 'level_up' }];
    case 'reward_taken':
      return event.reward === 'xp'||event.reward==='gold' ? [] : [{ sound: 'loot' }];
    case 'temper_chosen':
      return [{ sound: 'loot' }];
    case 'room_exited':
      return [{ sound: 'ui_click' }];
    case 'minion_blinked':
      return [{ sound: 'boss_teleport', position: event.position }];
    case 'minion_woke':
      return [{ sound: 'impact', position: event.position }];
    // Ripari (fase 5): il colpo che li raggiunge suona gia' come impatto; quando si rompono, un tonfo.
    case 'cover_hit':
      return [];
    case 'cover_broken':
      return [{ sound: 'boss_slam', position: event.position }];
    // Segnali che si vedono: annunci, scudi, rinascite (troppo frequenti per avere un suono).
    case 'minion_incoming':
    case 'minion_revived':
    case 'minion_aura':
    case 'minion_telegraph':
    case 'boss_pose':
      return [];
  }
}

/** Il suono dello scoppio di una zona: per aspetto, poi per prefisso del tema, infine per squadra. */
export function zoneSound(team: 'player' | 'enemy', visual: string | undefined): SoundId {
  return (visual === undefined ? undefined : zoneMaterialSound(visual)) ?? TEAM_BLAST_SOUNDS[team];
}

/** Il materiale dichiarato per l'aspetto di una zona (voce propria o prefisso del tema), se c'e'. */
export function zoneMaterialSound(visual: string): SoundId | undefined {
  if (Object.hasOwn(ZONE_SOUNDS, visual)) return ZONE_SOUNDS[visual];
  return ZONE_PREFIX_SOUNDS.find(([prefix]) => visual.startsWith(prefix))?.[1];
}

/** Le schermate dell'applicazione, come in `Game`. */
export type AudioScreen = 'menu' | 'dungeons' | 'inventory' | 'playing' | 'paused' | 'ended';

/** Cio' che la regia deve sapere della situazione per scegliere musica e ambiente. */
export interface AudioScene {
  readonly screen: AudioScreen;
  /** Tema del dungeon in corso o mostrato sullo sfondo dei menu. */
  readonly theme: ArenaThemeId;
  /** Il boss e' in furia (seconda fase). */
  readonly enraged: boolean;
}

/** Un anello da suonare (o il silenzio, con `id` null) e quanto forte rispetto al suo volume normale. */
export interface LoopChoice<Id extends string> {
  readonly id: Id | null;
  readonly gain: number;
}

/** Quanto si abbassa la musica in pausa. Provvisorio. */
export const PAUSE_DUCK = 0.4;

const MENU_SCREENS: readonly AudioScreen[] = ['menu', 'dungeons', 'inventory'];

/**
 * Musica: quella del menu fuori dalla partita; in partita quella del dungeon, o della furia se esiste una registrazione;
 * in pausa la stessa piu' bassa; a fine partita silenzio (suonano gli stacchetti di vittoria o sconfitta).
 */
export function musicFor(scene: AudioScene, music: Readonly<Record<MusicId, LoopDefinition>> = MUSIC): LoopChoice<MusicId> {
  if (MENU_SCREENS.includes(scene.screen)) return { id: 'menu', gain: 1 };
  if (scene.screen === 'ended') return { id: null, gain: 0 };
  const id: MusicId = scene.enraged && music.rage.file !== null ? 'rage' : scene.theme;
  return { id, gain: scene.screen === 'paused' ? PAUSE_DUCK : 1 };
}

/** Ambiente del dungeon solo dopo l'ingresso; in pausa resta più basso. */
export function ambienceFor(scene: AudioScene): LoopChoice<ArenaThemeId> {
  if (MENU_SCREENS.includes(scene.screen)) return { id: null, gain: 0 };
  return { id: scene.theme, gain: scene.screen === 'paused' ? PAUSE_DUCK : 1 };
}

/** Spostamento stereo massimo: i suoni non finiscono mai del tutto in un solo orecchio. */
export const MAX_PAN = 0.7;
/** Volume minimo dei suoni lontani: gli attacchi del boss fuori schermo si sentono ancora. */
export const FAR_GAIN = 0.3;

/**
 * Stereo e distanza di un suono rispetto all'ascoltatore (il giocatore). `halfWidth` e' meta' della larghezza della
 * vista in unita' del mondo: entro quella distanza il volume e' pieno, poi cala fino a `FAR_GAIN` a tre volte tanto.
 */
export function spatialize(source: Vec2 | undefined, listener: Vec2, halfWidth: number): { pan: number; gain: number } {
  if (source === undefined || halfWidth <= 0) return { pan: 0, gain: 1 };
  const pan = clamp((source.x - listener.x) / halfWidth, -1, 1) * MAX_PAN;
  const distance = source.distanceTo(listener);
  const beyond = Math.max(0, distance - halfWidth) / (2 * halfWidth);
  return { pan, gain: clamp(1 - beyond * (1 - FAR_GAIN), FAR_GAIN, 1) };
}

/**
 * Limita le voci di ogni suono: al massimo `maxVoices` insieme e non piu' spesso di `minInterval` secondi. Le voci si
 * considerano finite dopo `duration` secondi (o alla chiamata di `ended`, se il motore lo sa prima).
 */
export class VoiceLimiter {
  private readonly lastStart = new Map<string, number>();
  private readonly active = new Map<string, number[]>();

  /** Prova a far partire una voce di `id` all'istante `now`: vero se e' permesso (e la registra). */
  tryStart(id: string, now: number, limits: { readonly maxVoices: number; readonly minInterval: number }, duration: number): boolean {
    const last = this.lastStart.get(id);
    if (last !== undefined && now - last < limits.minInterval) return false;
    const endings = (this.active.get(id) ?? []).filter((end) => end > now);
    if (endings.length >= limits.maxVoices) {
      this.active.set(id, endings);
      return false;
    }
    endings.push(now + duration);
    this.active.set(id, endings);
    this.lastStart.set(id, now);
    return true;
  }
}
