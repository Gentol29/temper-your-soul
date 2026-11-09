import { isVfxReady } from './vfx/assets';
import type { Match } from '../match/match';
import { STATUS_EFFECTS } from '../combat/status-effects/status-catalog';
import { canvasFont } from './fonts';

const STATUS_COLORS: Readonly<Record<string, string>> = {
  burning: '#ff995d', soaked: '#79d9fa', rooted: '#d5b47c', exposed: '#a6e1b3', bleeding: '#f47785',
};
const WOLF = ['..x.....x...', '..xx...xx...', '..xxxxxxx...', '..x.x.x.x...', '...xxxxx....', '....xxx.....', '..xxxxxxxx..', '.xxxxxxxxxx.', '.xx..xx..xx.'];

/** Segnali derivati dallo stato autorevole, inclusi pet e stati ricevuti in cooperativa. */
export function drawClassCombat(ctx: CanvasRenderingContext2D, match: Match, clock: number): void {
  const state = match.classCombat.snapshot();
  ctx.save();
  for (const pet of state.pets) {
    ctx.fillStyle = '#10171c77'; ctx.beginPath(); ctx.ellipse(pet.position.x, pet.position.y + 5, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
    WOLF.forEach((row, y) => [...row].forEach((pixel, x) => {
      if (pixel === 'x') { ctx.fillStyle = y < 4 ? '#d7dfd0' : '#8faaa1'; ctx.fillRect(pet.position.x - 12 + x * 2, pet.position.y - 18 + y * 2, 2, 2); }
    }));
    ctx.fillStyle = '#d2b77e'; ctx.font = canvasFont(8, 'pixel'); ctx.textAlign = 'center'; ctx.fillText('Lupo', pet.position.x, pet.position.y - 24);
  }
  for (const entry of state.players) {
    const player = match.players.get(entry.id);
    if (!player || player.health.isDead) continue;
    const replacement = entry.guard ? 'warrior-guard' : player.characterClass === 'warrior' ? 'warrior-fortify' : player.characterClass === 'archer' ? 'archer-predator' : 'mage-earth-aura';
    if ((entry.guard || entry.buff || entry.channel > 0) && !isVfxReady(replacement)) {
      ctx.strokeStyle = entry.guard ? '#ffe0a0' : entry.channel > 0 ? '#d8a5fa' : '#b4d6a6';
      ctx.lineWidth = entry.guard ? 3 : 1.5;
      ctx.beginPath(); ctx.ellipse(player.position.x, player.position.y - (entry.guard ? 12 : 0), 22, entry.guard ? 29 : 10, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (entry.channel > 0) {
      ctx.fillStyle = '#e6c2ff'; ctx.font = canvasFont(10, 'text'); ctx.textAlign = 'center';
      ctx.fillText(`Canalizza ${entry.channel.toFixed(1)} s`, player.position.x, player.position.y - 48);
    }
  }
  for (const taunt of state.taunts) {
    if (isVfxReady('warrior-cleave')) continue;
    const player = match.players.get(taunt.owner);
    if (!player || player.health.isDead) continue;
    ctx.strokeStyle = '#e3b87544'; ctx.lineWidth = 1; ctx.setLineDash([6, 10]);
    ctx.beginPath(); ctx.arc(player.position.x, player.position.y, taunt.radius, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }
  const byTarget = new Map<string, string[]>();
  for (const effect of state.statuses) {
    const list = byTarget.get(effect.target) ?? []; list.push(effect.status); byTarget.set(effect.target, list);
  }
  for (const [id, statuses] of byTarget) {
    const target = id === 'boss' ? match.boss : match.minions.find(minion => `minion:${minion.id}` === id);
    if (!target || target.health.isDead) continue;
    statuses.forEach((status, index) => {
      const known = STATUS_EFFECTS[status as keyof typeof STATUS_EFFECTS];
      ctx.fillStyle = STATUS_COLORS[status] ?? '#eee3c3'; ctx.font = canvasFont(9, 'text'); ctx.textAlign = 'center';
      ctx.fillText(known?.name ?? status, target.position.x, target.position.y - 55 - index * 12);
    });
  }
  for (const mark of state.marks ?? []) {
    const target = mark.target === 'boss' ? match.boss : match.minions.find(minion => `minion:${minion.id}` === mark.target);
    if (!target || target.health.isDead) continue;
    ctx.strokeStyle = '#e0c586'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(target.position.x - 7, target.position.y - 72);
    ctx.lineTo(target.position.x, target.position.y - 65); ctx.lineTo(target.position.x + 7, target.position.y - 72); ctx.stroke();
  }
  if (state.heavy) {
    const { position, target, remaining } = state.heavy;
    ctx.strokeStyle = '#ff3939'; ctx.lineWidth = 2 + Math.sin(clock * 20);
    ctx.beginPath(); ctx.moveTo(position.x, position.y); ctx.lineTo(target.x, target.y); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const angle = clock * 4 + i * Math.PI / 4, radius = 25 + remaining * 25;
      ctx.fillStyle = '#ff3939'; ctx.fillRect(position.x + Math.cos(angle) * radius - 3, position.y + Math.sin(angle) * radius - 3, 6, 6);
    }
  }
  ctx.restore();
}
