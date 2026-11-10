import type { PersistentProfile } from './storage/profiles';
import type { BattleSnapshot } from '../src/features/network/protocol';
import { PROGRESSION } from '../src/features/character/progression';

export interface ProgressCursor { xp: number; gold: number; embers: number; items: number; kills: Record<string, number>; victories: number; final: boolean }
export function emptyProgress(): ProgressCursor { return { xp: 0, gold: 0, embers: 0, items: 0, kills: {}, victories: 0, final: false }; }
/** Applica soltanto i progressi realmente emessi dalla simulazione autorevole. */
export function applyRunProgress(profile: PersistentProfile, playerId: string, snapshot: BattleSnapshot, previous: ProgressCursor): ProgressCursor {
  if (previous.final) return previous;
  const c = profile.character, run = snapshot.run;
  if (!run) {
    if (snapshot.status === 'playing' || previous.final) return previous;
    if (snapshot.status === 'won') {
      c.addRolls(snapshot.rewards[playerId] ?? []);
      c.totalXp += PROGRESSION.rewards[snapshot.dungeonId as keyof typeof PROGRESSION.rewards] ?? 100;
      c.recordVictory(snapshot.dungeonId, snapshot.time);
    }
    return { ...previous, final: true };
  }
  const state = run.players[playerId]; if (!state) return previous;
  const rewards = run.rewards[playerId] ?? [];
  c.totalXp += Math.max(0, state.xp - previous.xp); profile.gold += Math.max(0, (state.gold ?? 0) - previous.gold);
  c.embers += Math.max(0, state.embers - previous.embers);
  c.addKills(Object.fromEntries(Object.entries(state.kills).map(([kind, count]) => [kind, Math.max(0, count - (previous.kills[kind] ?? 0))])));
  c.addRolls(rewards.slice(previous.items));
  // I record dei boss sono assegnati una volta, anche uscendo prima della fine del Pellegrinaggio.
  for (const victory of run.victories.slice(previous.victories)) {
    c.recordVictory(victory.dungeonId, Number.NaN);
    if (run.mode === 'pilgrimage') c.recordDescent(victory.dungeonId, { won: true, seconds: victory.seconds, grade: run.grade, stage: run.stages });
  }
  const final = run.status !== 'playing';
  if (final && !previous.final) {
    if (run.mode === 'descent') c.recordDescent(run.dungeonId, { won: run.status === 'won', seconds: run.seconds, grade: run.grade, stage: run.stage + 1 });
    else if (run.status === 'won') c.pilgrimage = { clears: c.pilgrimage.clears + 1,
      bestTimeSeconds: c.pilgrimage.bestTimeSeconds === null ? run.seconds : Math.min(c.pilgrimage.bestTimeSeconds, run.seconds) };
  }
  return { xp: Math.max(previous.xp, state.xp), gold: Math.max(previous.gold, state.gold ?? 0), embers: Math.max(previous.embers, state.embers),
    items: Math.max(previous.items, rewards.length), kills: Object.fromEntries([...new Set([...Object.keys(previous.kills), ...Object.keys(state.kills)])].map(kind=>[kind,Math.max(previous.kills[kind]??0,state.kills[kind]??0)])),
    victories: Math.max(previous.victories, run.victories.length), final };
}
