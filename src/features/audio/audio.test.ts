import { describe, expect, it, vi } from 'vitest';
import { Vec2 } from '../../core/vec2';
import { MemoryStore } from '../character/save-store';
import type { GameEvent } from '../combat/events';
import { DUNGEONS } from '../dungeons/dungeons';
import { ITEM_FAMILIES } from '../items/item-families';
import { resolveItemSkill } from '../items/item';
import { MAGE_SKILLS } from '../skills/mage-skills';
import { createMatch, eventsOfType, holding, recordEvents, run } from '../../testing';
import {
  AMBIENCE,
  MUSIC,
  SKILL_SOUNDS,
  SOUNDS,
  ZONE_SOUNDS,
  type AudioFile,
  type LoopDefinition,
  type MusicId,
  type SoundDefinition,
} from './audio-catalog';
import { AUDIO_CREDITS, AUDIO_LICENSES } from './audio-credits';
import {
  ambienceFor,
  cuesForEvent,
  FAR_GAIN,
  MAX_PAN,
  musicFor,
  PAUSE_DUCK,
  spatialize,
  VoiceLimiter,
  zoneMaterialSound,
  zoneSound,
  type AudioScene,
} from './audio-director';
import { AudioPlayer } from './audio-player';
import {
  AUDIO_SETTINGS_KEY,
  channelGain,
  DEFAULT_AUDIO_SETTINGS,
  deserializeAudioSettings,
  serializeAudioSettings,
  withEnabled,
  withVolume,
} from './audio-settings';

const HERE = new Vec2(100, 200);

/** Il minimo di `node:fs` che serve ai test (il progetto non include i tipi di Node e non li aggiunge per questo). */
interface FileSystem {
  existsSync(path: URL): boolean;
  statSync(path: URL): { readonly size: number };
}

const NODE_FS = 'node:fs';

/** Nei test gli URL del catalogo sono `file://`: si controlla che i file esistano davvero. */
async function fileSystem(): Promise<FileSystem> {
  return (await import(/* @vite-ignore */ NODE_FS)) as FileSystem;
}

/** Tutte le skill che il giocatore puo' avere: quelle di ogni famiglia a ogni rarita' danno lo stesso `visual`. */
function playerSkills() {
  return [...MAGE_SKILLS, ...ITEM_FAMILIES.map((family) => resolveItemSkill(family, 'common'))];
}

/** Tutti i file audio del catalogo (effetti, musiche, ambienti). */
function catalogFiles(): AudioFile[] {
  const loops: LoopDefinition[] = [...Object.values(MUSIC), ...Object.values(AMBIENCE)];
  return [
    ...(Object.values(SOUNDS) as SoundDefinition[]).flatMap((definition) => definition.files),
    ...loops.flatMap((loop) => (loop.file === null ? [] : [loop.file])),
  ];
}

describe('regia: eventi della simulazione -> suoni', () => {
  it('ogni tipo di evento ha il suo suono, con la posizione giusta', () => {
    const cases: Array<[GameEvent, string, Vec2 | undefined]> = [
      [{ type: 'damage_dealt', target: 'player', amount: 10, position: HERE }, 'player_hurt', HERE],
      [{ type: 'damage_dealt', target: 'boss', amount: 10, position: HERE }, 'boss_hit', HERE],
      [{ type: 'projectile_hit', position: HERE, radius: 4, visual: 'arcane_bolt', team: 'player' }, 'impact', HERE],
      [{ type: 'boss_attack', patternId: 'nova', position: HERE, name: 'NOVA', color: '#fff', labelOffsetY: 0 }, 'boss_attack', HERE],
      [{ type: 'boss_phase_changed', position: HERE, phase: 2, text: 'FURIA' }, 'boss_rage', HERE],
      [{ type: 'boss_charge_finished', position: HERE }, 'boss_slam', HERE],
      [{ type: 'boss_teleported', from: Vec2.ZERO, to: HERE }, 'boss_teleport', HERE],
      [{ type: 'boss_defeated', position: HERE }, 'boss_defeated', HERE],
      [{ type: 'match_ended', won: true }, 'victory', undefined],
      [{ type: 'match_ended', won: false }, 'defeat', undefined],
    ];
    for (const [event, sound, position] of cases) {
      expect(cuesForEvent(event), `${event.type} -> ${sound}`).toEqual([position === undefined ? { sound } : { sound, position }]);
    }
    expect(cuesForEvent({ type: 'boss_pose', seconds: 0.5 })).toEqual([]);
  });

  it('in cooperativa il colpo subito suona solo per il giocatore di questo client; gli alleati colpiti fanno un impatto', () => {
    const hurt = (playerId?: string): GameEvent => ({ type: 'damage_dealt', target: 'player', amount: 10, position: HERE, ...(playerId ? { playerId } : {}) });
    expect(cuesForEvent(hurt('p1'), 'p1')).toEqual([{ sound: 'player_hurt', position: HERE }]);
    expect(cuesForEvent(hurt('p2'), 'p1')).toEqual([{ sound: 'impact', position: HERE }]);
    // Partita singola (o evento senza giocatore): sempre il proprio colpo subito.
    expect(cuesForEvent(hurt('local'))).toEqual([{ sound: 'player_hurt', position: HERE }]);
    expect(cuesForEvent(hurt(), 'p1')).toEqual([{ sound: 'player_hurt', position: HERE }]);
    const bossHit: GameEvent = { type: 'damage_dealt', target: 'boss', amount: 5, position: HERE, playerId: 'p2' };
    expect(cuesForEvent(bossHit, 'p1')).toEqual([{ sound: 'boss_hit', position: HERE }]);
  });

  it('il lancio di una skill suona per materiale; senza voce nel catalogo, per tipo di effetto', () => {
    const cast = (visual: string, kind: 'projectile' | 'ground_blast' | 'dash' | 'melee_arc'): GameEvent => ({
      type: 'skill_cast',
      skillId: visual,
      visual,
      kind,
      origin: HERE,
      destination: HERE,
      angle: 0,
    });
    expect(cuesForEvent(cast('frost_orb', 'projectile'))).toEqual([{ sound: 'cast_frost', position: HERE }]);
    expect(cuesForEvent(cast('hunter_arrow', 'projectile'))).toEqual([{ sound: 'cast_bow', position: HERE }]);
    expect(cuesForEvent(cast('guardian_sweep', 'melee_arc'))).toEqual([{ sound: 'cast_blade', position: HERE }]);
    expect(cuesForEvent(cast('sconosciuta', 'dash'))).toEqual([{ sound: 'cast_dash', position: HERE }]);
    expect(cuesForEvent(cast('sconosciuta', 'melee_arc'))).toEqual([{ sound: 'cast_blade', position: HERE }]);
  });

  it('ogni skill degli oggetti ha scelto esplicitamente un materiale in SKILL_SOUNDS', () => {
    const missing = playerSkills().filter((skill) => !Object.hasOwn(SKILL_SOUNDS, skill.visual)).map((skill) => skill.visual);
    expect(missing).toEqual([]);
    for (const sound of Object.values(SKILL_SOUNDS)) expect(Object.hasOwn(SOUNDS, sound), sound).toBe(true);
  });

  it('lo scoppio di una zona suona per aspetto, poi per prefisso del tema, poi per squadra', () => {
    expect(zoneSound('player', 'veil_blast')).toBe('blast_frost');
    expect(zoneSound('enemy', 'glacier_spike')).toBe('blast_frost');
    expect(zoneSound('enemy', 'swamp_bog')).toBe('blast_nature');
    expect(zoneSound('enemy', 'forge_lava')).toBe('blast_fire');
    expect(zoneSound('enemy', 'void_spiral')).toBe('blast_arcane');
    expect(zoneSound('player', undefined)).toBe('blast_fire');
    expect(zoneSound('enemy', 'mai_visto')).toBe('blast_fire');
    for (const sound of Object.values(ZONE_SOUNDS)) expect(Object.hasOwn(SOUNDS, sound), sound).toBe(true);
  });

  it('le zone dei boss di ogni dungeon trovano un materiale dal loro aspetto (non il ripiego di squadra)', () => {
    let seen = 0;
    for (const dungeon of DUNGEONS) {
      const match = createMatch(7, { dungeon });
      const events = recordEvents(match);
      // Il giocatore resta fermo e invulnerabile: interessa vedere scoppiare piu' schemi possibili.
      run(match, 60, (m) => {
        m.player.invulnerableFor = 1;
        return holding(m, []);
      });
      const visuals = new Set(
        eventsOfType(events, 'zone_detonated')
          .filter((event) => event.team === 'enemy' && event.visual !== undefined)
          .map((event) => event.visual!),
      );
      for (const visual of visuals) expect(zoneMaterialSound(visual), `${dungeon.id}: ${visual}`).toBeDefined();
      seen += visuals.size;
    }
    // La prova ha senso solo se le zone dei boss sono davvero scoppiate.
    expect(seen).toBeGreaterThan(3);
  });
});

describe('regia: musica e ambiente', () => {
  const scene = (screen: AudioScene['screen'], enraged = false): AudioScene => ({ screen, theme: 'swamp', enraged });

  it('menu fuori dalla partita, brano del dungeon in partita, piu\' basso in pausa, silenzio alla fine', () => {
    for (const screen of ['menu', 'dungeons', 'inventory'] as const) expect(musicFor(scene(screen))).toEqual({ id: 'menu', gain: 1 });
    expect(musicFor(scene('playing'))).toEqual({ id: 'swamp', gain: 1 });
    expect(musicFor(scene('paused'))).toEqual({ id: 'swamp', gain: PAUSE_DUCK });
    expect(musicFor(scene('ended'))).toEqual({ id: null, gain: 0 });
  });

  it('in furia passa al brano della furia solo se esiste una registrazione', () => {
    const withoutRage: Record<MusicId, LoopDefinition> = { ...MUSIC, rage: { channel: 'music', file: null, volume: 1 } };
    expect(musicFor(scene('playing', true), withoutRage)).toEqual({ id: 'swamp', gain: 1 });
    const withRage: Record<MusicId, LoopDefinition> = { ...MUSIC, rage: { channel: 'music', file: { url: 'furia.mp3', credits: ['x'] }, volume: 1 } };
    expect(musicFor(scene('playing', true), withRage)).toEqual({ id: 'rage', gain: 1 });
    expect(musicFor(scene('paused', true), withRage)).toEqual({ id: 'rage', gain: PAUSE_DUCK });
    expect(musicFor(scene('playing', false), withRage)).toEqual({ id: 'swamp', gain: 1 });
  });

  it('l\'ambiente del dungeon parte all’ingresso e resta più basso in pausa', () => {
    for (const screen of ['menu', 'dungeons', 'inventory'] as const) expect(ambienceFor(scene(screen))).toEqual({ id: null, gain: 0 });
    expect(ambienceFor(scene('playing'))).toEqual({ id: 'swamp', gain: 1 });
    expect(ambienceFor(scene('paused'))).toEqual({ id: 'swamp', gain: PAUSE_DUCK });
  });

  it('ogni tema dei dungeon registrati ha musica e ambiente nel catalogo', () => {
    for (const dungeon of DUNGEONS) {
      expect(Object.hasOwn(MUSIC, dungeon.arena.theme), dungeon.id).toBe(true);
      expect(Object.hasOwn(AMBIENCE, dungeon.arena.theme), dungeon.id).toBe(true);
    }
  });
});

describe('stereo e distanza', () => {
  it('al centro pieno e senza spostamento; ai lati spostato fino a MAX_PAN; lontano mai sotto FAR_GAIN', () => {
    const listener = new Vec2(1000, 1000);
    expect(spatialize(undefined, listener, 300)).toEqual({ pan: 0, gain: 1 });
    expect(spatialize(listener, listener, 300)).toEqual({ pan: 0, gain: 1 });
    expect(spatialize(new Vec2(1300, 1000), listener, 300)).toEqual({ pan: MAX_PAN, gain: 1 });
    expect(spatialize(new Vec2(850, 1000), listener, 300).pan).toBeCloseTo(-MAX_PAN / 2, 10);
    // Oltre la vista cala: a 3 volte la meta' larghezza arriva a FAR_GAIN e non scende oltre.
    expect(spatialize(new Vec2(1000, 1600), listener, 300).gain).toBeCloseTo((1 + FAR_GAIN) / 2, 10);
    expect(spatialize(new Vec2(1000, 1900), listener, 300).gain).toBeCloseTo(FAR_GAIN, 10);
    expect(spatialize(new Vec2(9000, 9000), listener, 300)).toEqual({ pan: MAX_PAN, gain: FAR_GAIN });
    expect(spatialize(new Vec2(9000, 9000), listener, 0)).toEqual({ pan: 0, gain: 1 });
  });
});

describe('limite delle voci', () => {
  const limits = { maxVoices: 2, minInterval: 0.05 };

  it('rispetta l\'intervallo minimo e il numero massimo di voci, che si liberano quando finiscono', () => {
    const limiter = new VoiceLimiter();
    expect(limiter.tryStart('a', 0, limits, 1)).toBe(true);
    expect(limiter.tryStart('a', 0.01, limits, 1)).toBe(false); // troppo presto
    expect(limiter.tryStart('a', 0.1, limits, 1)).toBe(true);
    expect(limiter.tryStart('a', 0.2, limits, 1)).toBe(false); // due voci gia' in corso
    expect(limiter.tryStart('b', 0.2, limits, 1)).toBe(true); // un altro suono ha le sue voci
    expect(limiter.tryStart('a', 1.05, limits, 1)).toBe(true); // la prima e' finita a 1,0
  });
});

describe('impostazioni audio', () => {
  it('senza dati, con dati illeggibili o non validi si usano i valori iniziali; i volumi restano tra 0 e 1', () => {
    for (const text of [null, '', 'rotto', '[]', '42', 'null']) expect(deserializeAudioSettings(text), String(text)).toEqual(DEFAULT_AUDIO_SETTINGS);
    const odd = deserializeAudioSettings(JSON.stringify({ enabled: 'si', volumes: { master: 3, music: -1, effects: 'x', ambience: 0.25 } }));
    expect(odd.enabled).toBe(DEFAULT_AUDIO_SETTINGS.enabled);
    expect(odd.volumes).toEqual({ ...DEFAULT_AUDIO_SETTINGS.volumes, master: 1, music: 0, ambience: 0.25 });
  });

  it('l\'audio e\' attivo di base, anche per chi aveva salvato "spento" con la versione precedente', () => {
    expect(DEFAULT_AUDIO_SETTINGS.enabled).toBe(true);
    const old = deserializeAudioSettings(JSON.stringify({ version: 1, enabled: false, volumes: { music: 0.2 } }));
    expect(old.enabled).toBe(true);
    expect(old.volumes.music).toBe(0.2);
    // Con la versione attuale la scelta "spento" resta.
    expect(deserializeAudioSettings(serializeAudioSettings(withEnabled(DEFAULT_AUDIO_SETTINGS, false))).enabled).toBe(false);
  });

  it('salva e rilegge le stesse impostazioni; ad audio spento ogni canale e\' muto', () => {
    const settings = withVolume(withEnabled(DEFAULT_AUDIO_SETTINGS, true), 'music', 0.3);
    expect(deserializeAudioSettings(serializeAudioSettings(settings))).toEqual(settings);
    expect(channelGain(settings, 'music')).toBeCloseTo(settings.volumes.master * 0.3, 10);
    expect(channelGain(withEnabled(settings, false), 'effects')).toBe(0);
    expect(withVolume(settings, 'effects', 7).volumes.effects).toBe(1);
    expect(withVolume(settings, 'effects', Number.NaN).volumes.effects).toBe(settings.volumes.effects);
  });

  it('il motore legge e salva le impostazioni sotto la propria chiave, senza toccare il salvataggio del personaggio', () => {
    const memory = new MemoryStore();
    memory.setItem(AUDIO_SETTINGS_KEY, serializeAudioSettings(withVolume(DEFAULT_AUDIO_SETTINGS, 'effects', 0.2)));
    const player = new AudioPlayer(memory);
    expect(player.currentSettings.volumes.effects).toBe(0.2);
    player.setVolume('music', 0.45);
    expect(deserializeAudioSettings(memory.getItem(AUDIO_SETTINGS_KEY)).volumes.music).toBe(0.45);
    expect(memory.getItem('temper-your-soul:save')).toBeNull();
    // Senza archivio funziona comunque, in memoria.
    expect(() => new AudioPlayer(null).setVolume('master', 0.1)).not.toThrow();
  });
});

describe('catalogo e crediti', () => {
  it('volumi e limiti dei suoni sono validi', () => {
    for (const [id, definition] of Object.entries(SOUNDS) as Array<[string, SoundDefinition]>) {
      expect(definition.volume, id).toBeGreaterThan(0);
      expect(definition.volume, id).toBeLessThanOrEqual(1);
      expect(definition.maxVoices, id).toBeGreaterThanOrEqual(1);
      expect(definition.minInterval, id).toBeGreaterThanOrEqual(0);
      expect(definition.rateJitter, id).toBeGreaterThanOrEqual(0);
      expect(definition.rateJitter, id).toBeLessThan(0.5);
    }
    for (const loop of [...Object.values(MUSIC), ...Object.values(AMBIENCE)]) {
      expect(loop.volume).toBeGreaterThan(0);
      expect(loop.volume).toBeLessThanOrEqual(1);
    }
  });

  it('ogni file del catalogo esiste, e\' leggero e il totale resta contenuto', async () => {
    const fs = await fileSystem();
    let total = 0;
    for (const file of catalogFiles()) {
      const url = new URL(file.url);
      expect(url.protocol, file.url).toBe('file:');
      expect(fs.existsSync(url), file.url).toBe(true);
      const size = fs.statSync(url).size;
      expect(size, file.url).toBeLessThan(4 * 1024 * 1024);
      total += size;
    }
    // Il gioco si pubblica come sito statico: l'audio non deve diventare il grosso del download.
    expect(total).toBeLessThan(15 * 1024 * 1024);
  });

  it('solo i suoni dichiarati in attesa del secondo lotto sono senza registrazione', () => {
    const pending = (Object.entries(SOUNDS) as Array<[string, SoundDefinition]>)
      .filter(([, definition]) => definition.files.length === 0)
      .map(([id]) => id)
      .sort();
    expect(pending).toEqual(['boss_attack', 'cast_dash']);
    for (const loop of [...Object.values(MUSIC), ...Object.values(AMBIENCE)]) expect(loop.file).not.toBeNull();
  });

  it('ogni file ha un credito con licenza ammessa, e ogni credito e\' usato da almeno un file', () => {
    const files = catalogFiles();
    for (const file of files) {
      expect(file.credits.length, file.url).toBeGreaterThan(0);
      for (const credit of file.credits) expect(Object.hasOwn(AUDIO_CREDITS, credit), `${file.url}: credito ${credit}`).toBe(true);
    }
    const used = new Set(files.flatMap((file) => file.credits));
    for (const [id, credit] of Object.entries(AUDIO_CREDITS)) {
      expect(used.has(id), `credito ${id} non usato`).toBe(true);
      expect(Object.hasOwn(AUDIO_LICENSES, credit.license), id).toBe(true);
      expect(credit.title.trim().length, id).toBeGreaterThan(0);
      expect(credit.author.trim().length, id).toBeGreaterThan(0);
      expect(credit.source, id).toMatch(/^https:\/\//);
      expect(credit.retrieved, id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(credit.description.trim().length, id).toBeGreaterThan(0);
    }
  });

  it('le licenze ammesse non includono clausole NC o ND', () => {
    for (const license of Object.values(AUDIO_LICENSES)) expect(license.url).not.toMatch(/-nc|-nd/);
  });
});


it('le anteprime delle card non richiedono audio dei dungeon; musica e ambiente partono all’ingresso', () => {
  const requested: string[] = [];
  vi.stubGlobal('Audio', class {
    constructor(url: string) { requested.push(url); }
  });
  try {
    const player = new AudioPlayer(null);
    for (let pass = 0; pass < 3; pass++) {
      for (const dungeon of DUNGEONS) {
        player.setScene({ screen: 'dungeons', theme: dungeon.arena.theme, enraged: false });
      }
    }
    expect(requested).toEqual([MUSIC.menu.file!.url]);
    const theme = DUNGEONS[0]!.arena.theme;
    player.setScene({ screen: 'playing', theme, enraged: false });
    expect(requested).toEqual([MUSIC.menu.file!.url, MUSIC[theme].file!.url, AMBIENCE[theme].file!.url]);
  } finally {
    vi.unstubAllGlobals();
  }
});
