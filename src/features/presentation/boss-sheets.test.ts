import { describe, expect, it } from 'vitest';
import { Camera } from '../../core/camera';
import { Vec2 } from '../../core/vec2';
import { createQuietMatch, STEP } from '../../testing';
import { DUNGEONS } from '../dungeons/dungeons';
import { ART_CREDITS, ART_LICENSES, VFX_CREDIT_IDS } from './art-credits';
import { BOSS_SHEETS, DEATH_ANIMATION_SHARE, sheetFrame, type BossSheet, type SheetState } from './boss-art';
import { Effects, FEEDBACK } from './effects';
import { ActorPoses } from './poses';
import { LIEUTENANTS } from '../run/lieutenants';
import { VEIN_LIEUTENANTS } from '../run/vein-lieutenants';
import { TILE_CREDITS } from './themes/tiles';

/** Il minimo di `node:fs` che serve ai test (il progetto non include i tipi di Node e non li aggiunge per questo). */
interface FileSystem {
  existsSync(path: URL): boolean;
  readFileSync(path: URL): Uint8Array;
}

const NODE_FS = 'node:fs';

async function fileSystem(): Promise<FileSystem> {
  return (await import(/* @vite-ignore */ NODE_FS)) as FileSystem;
}

/** Larghezza e altezza di un PNG, lette dall'intestazione (blocco IHDR, byte 16–23). */
function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const word = (at: number) => ((bytes[at]! << 24) | (bytes[at + 1]! << 16) | (bytes[at + 2]! << 8) | bytes[at + 3]!) >>> 0;
  expect([...bytes.slice(1, 4)].map((code) => String.fromCharCode(code)).join('')).toBe('PNG');
  return { width: word(16), height: word(20) };
}

const clipsOf = (sheet: BossSheet) => Object.values(sheet.layout.clips).filter((clip) => clip !== undefined);

const STILL: SheetState = { enraged: false, slowed: false, time: 0, cast: null, transform: null, death: null };
const GUARDIAN = BOSS_SHEETS.guardian!;
// Un foglio senza la riga della trasformazione (tutti quelli in uso ce l'hanno): il guardiano senza quella riga.
const { transform: _transform, ...WARDEN_CLIPS } = GUARDIAN.layout.clips;
const WARDEN: BossSheet = { ...GUARDIAN, layout: { ...GUARDIAN.layout, clips: WARDEN_CLIPS } };

describe('fogli di sprite dei boss', () => {
  it('ogni boss dei dungeon ha un foglio', () => {
    for (const dungeon of DUNGEONS) expect(BOSS_SHEETS[dungeon.boss.art], `${dungeon.id}: ${dungeon.boss.art}`).toBeDefined();
  });

  it('anche ogni luogotenente ha un foglio, con tutte le animazioni e i piedi sulla sua ombra', () => {
    const lieutenants = [...Object.values(LIEUTENANTS), ...Object.values(VEIN_LIEUTENANTS).flatMap((veins) => Object.values(veins))];
    expect(lieutenants.length).toBe(12);
    for (const figure of [...lieutenants, ...DUNGEONS.map((dungeon) => dungeon.boss)]) {
      const sheet = BOSS_SHEETS[figure.art];
      expect(sheet, figure.art).toBeDefined();
      expect(sheet!.scale, figure.art).toBe(1);
      expect(sheet!.layout.clips.transform, figure.art).toBeDefined();
      expect(sheet!.layout.clips.death.frames, figure.art).toBeGreaterThan(1);
      // La figura copre il cerchio di colpo: non piu' stretta del raggio, non piu' larga di 3 volte il diametro.
      expect(sheet!.layout.cell.width, figure.art).toBeGreaterThanOrEqual(figure.stats.hitRadius * 1.3);
      expect(sheet!.layout.cell.width, figure.art).toBeLessThanOrEqual(figure.stats.hitRadius * 6);
      expect(sheet!.feetY, figure.art).toBeGreaterThan(0);
    }
  });

  it('i PNG esistono, sono leggeri e misurano esattamente celle per righe e colonne', async () => {
    const fs = await fileSystem();
    let total = 0;
    const tutti = Object.entries(BOSS_SHEETS);
    for (const [id, sheet] of tutti) {
      const url = new URL(sheet.layout.url);
      expect(url.protocol, id).toBe('file:');
      expect(fs.existsSync(url), id).toBe(true);
      const bytes = fs.readFileSync(url);
      total += bytes.length;
      const clips = clipsOf(sheet);
      const columns = Math.max(...clips.map((clip) => clip.frames));
      expect(pngSize(bytes), id).toEqual({
        width: columns * sheet.layout.cell.width,
        height: clips.length * sheet.layout.cell.height,
      });
    }
    expect(total).toBeLessThan(1500 * 1024);
  });

  it('righe distinte, fotogrammi validi, piedi dentro la cella e ingrandimento intero', () => {
    for (const [id, sheet] of Object.entries(BOSS_SHEETS)) {
      const clips = clipsOf(sheet);
      expect(new Set(clips.map((clip) => clip.row)).size, id).toBe(clips.length);
      for (const clip of clips) {
        expect(clip.row, id).toBeLessThan(clips.length);
        expect(clip.frames, id).toBeGreaterThan(0);
      }
      const { cell, feet } = sheet.layout;
      expect(feet.x, id).toBeGreaterThanOrEqual(0);
      expect(feet.x, id).toBeLessThanOrEqual(cell.width);
      expect(feet.y, id).toBeGreaterThan(cell.height / 2);
      expect(feet.y, id).toBeLessThanOrEqual(cell.height);
      expect(Number.isInteger(sheet.scale) && sheet.scale >= 1, id).toBe(true);
      expect(Number.isInteger(sheet.portraitScale) && sheet.portraitScale >= 1, id).toBe(true);
      expect(sheet.walkFps, id).toBeGreaterThan(0);
    }
  });

  it('ogni foglio ha i crediti, con una licenza ammessa; nessun credito resta senza uso', () => {
    const used = new Set([...VFX_CREDIT_IDS, ...Object.values(BOSS_SHEETS).flatMap((sheet) => sheet.credits), ...Object.values(TILE_CREDITS).flat()]);
    for (const [id, sheet] of Object.entries(BOSS_SHEETS)) {
      expect(sheet.credits.length, id).toBeGreaterThan(0);
      for (const credit of sheet.credits) expect(ART_CREDITS[credit], `${id}: ${credit}`).toBeDefined();
    }
    for (const [id, credit] of Object.entries(ART_CREDITS)) {
      expect(used.has(id), id).toBe(true);
      expect(ART_LICENSES[credit.license], id).toBeDefined();
      expect(credit.source, id).toMatch(/^https:\/\//);
      expect(credit.changes.length, id).toBeGreaterThan(0);
    }
  });
});

describe('scelta del fotogramma', () => {
  it('la camminata scorre in anello con il tempo, a meta\' velocita\' da rallentato, e in furia usa la riga ricolorata', () => {
    const { walk, rageWalk } = GUARDIAN.layout.clips;
    const step = 1 / GUARDIAN.walkFps;
    expect(sheetFrame(GUARDIAN, STILL)).toEqual({ row: walk.row, column: 0 });
    expect(sheetFrame(GUARDIAN, { ...STILL, time: step * 1.5 }).column).toBe(1);
    expect(sheetFrame(GUARDIAN, { ...STILL, time: step * walk.frames }).column).toBe(0);
    expect(sheetFrame(GUARDIAN, { ...STILL, time: step * 1.5, slowed: true }).column).toBe(0);
    expect(sheetFrame(GUARDIAN, { ...STILL, enraged: true }).row).toBe(rageWalk.row);
  });

  it("l'attacco segue l'avanzamento della posa, dal primo all'ultimo fotogramma", () => {
    const { attack, rageAttack } = GUARDIAN.layout.clips;
    expect(sheetFrame(GUARDIAN, { ...STILL, cast: 0 })).toEqual({ row: attack.row, column: 0 });
    expect(sheetFrame(GUARDIAN, { ...STILL, cast: 0.999 })).toEqual({ row: attack.row, column: attack.frames - 1 });
    expect(sheetFrame(GUARDIAN, { ...STILL, cast: 1 }).column).toBe(attack.frames - 1);
    expect(sheetFrame(GUARDIAN, { ...STILL, cast: 0.5, enraged: true }).row).toBe(rageAttack.row);
  });

  it("la morte vince su tutto, finisce entro la sua quota e resta sull'ultimo fotogramma", () => {
    const { death } = GUARDIAN.layout.clips;
    const dying = { ...STILL, enraged: true, cast: 0.5, transform: 0.5 };
    expect(sheetFrame(GUARDIAN, { ...dying, death: 0 })).toEqual({ row: death.row, column: 0 });
    expect(sheetFrame(GUARDIAN, { ...dying, death: DEATH_ANIMATION_SHARE }).column).toBe(death.frames - 1);
    expect(sheetFrame(GUARDIAN, { ...dying, death: 1 }).column).toBe(death.frames - 1);
  });

  it('la trasformazione vince sull\'attacco; senza animazione di trasformazione si attacca o si cammina', () => {
    const transform = GUARDIAN.layout.clips.transform!;
    expect(sheetFrame(GUARDIAN, { ...STILL, enraged: true, cast: 0.5, transform: 0 })).toEqual({ row: transform.row, column: 0 });
    expect(WARDEN.layout.clips.transform).toBeUndefined();
    expect(sheetFrame(WARDEN, { ...STILL, enraged: true, transform: 0.5 }).row).toBe(WARDEN.layout.clips.rageWalk.row);
    expect(sheetFrame(WARDEN, { ...STILL, enraged: true, transform: 0.5, cast: 0 }).row).toBe(WARDEN.layout.clips.rageAttack.row);
  });
});

describe('pose e trasformazione', () => {
  it("l'avanzamento della posa del boss va da 0 a 1 e sparisce a posa finita", () => {
    const poses = new ActorPoses();
    expect(poses.bossCastProgress).toBeNull();
    poses.handle({ type: 'boss_pose', seconds: 0.5 });
    expect(poses.bossCastProgress).toBe(0);
    poses.update(0.25, false);
    expect(poses.bossCastProgress).toBeCloseTo(0.5);
    poses.update(0.3, false);
    expect(poses.bossCastProgress).toBeNull();
  });

  it('il passaggio in furia avvia la trasformazione, che si esaurisce e si azzera con gli effetti', () => {
    const effects = new Effects();
    const match = createQuietMatch();
    const camera = new Camera();
    effects.handle({ type: 'boss_phase_changed', position: new Vec2(0, 0), phase: 2, text: 'FURIA' });
    expect(effects.bossTransform).toBe(FEEDBACK.bossTransform);
    effects.update(0.5, match, camera);
    expect(effects.bossTransform).toBeCloseTo(FEEDBACK.bossTransform - 0.5);
    for (let i = 0; i < 60 * 2; i++) effects.update(STEP, match, camera);
    expect(effects.bossTransform).toBe(0);
    effects.handle({ type: 'boss_phase_changed', position: new Vec2(0, 0), phase: 2, text: 'FURIA' });
    effects.clear();
    expect(effects.bossTransform).toBe(0);
  });
});
