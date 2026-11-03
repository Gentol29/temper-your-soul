import { HUNTER_ARROW, SPORE_BURST, WIND_DASH } from '../../items/item-skills';
import { DUNGEON_ITEM_SKILLS } from '../../items/dungeon-item-skills';
import type { SkillDefinition } from '../../skills/skill-definition';

export const ARCHER_TUNING = { primaryCooldownMultiplier: 1.15 } as const;
const marked = (skill: SkillDefinition): SkillDefinition => ({
  ...skill, cooldown: skill.cooldown * ARCHER_TUNING.primaryCooldownMultiplier, manaCost: 0, onHit: { mark: true, penetration: 0.35 },
  description: 'Freccia gratuita · Marchia il bersaglio per il pet · Ignora il 35% dello scudo',
});
export const ARCHER_SKILLS: Readonly<Record<string, SkillDefinition>> = {
  hunter_bow: marked(HUNTER_ARROW),
  thorn_bow: marked(DUNGEON_ITEM_SKILLS.thorn_bow),
  spore_fan: { ...SPORE_BURST, name: 'Istinto predatorio', description: 'Per 5 s: +35% frequenza primaria e recupera il 15% del danno inflitto',
    cooldown: 10, manaCost: 18, visual: 'archer_predator', effect: { kind: 'buff', buff: { duration: 5, attackSpeed: 0.35, lifesteal: 0.15 } } },
  reed_mantle: { id: 'reed_mantle', name: 'Evoca il lupo', description: 'Lupo per 20 s · Caccia i nemici vicini, priorità al marchio · 20% di sanguinamento per morso',
    cooldown: 24, manaCost: 25, visual: 'archer_wolf',
    effect: { kind: 'summon', pet: { duration: 20, damage: 22, interval: 0.7, speed: 340, leapRange: 180 } } },
  wind_boots: { ...WIND_DASH, name: 'Passo del cacciatore', description: 'Due cariche di scatto fisico · Una carica recuperata ogni 3 s',
    cooldown: 3, charges: 2, manaCost: 0,
    effect: { kind: 'dash', distance: 170, invulnerability: 0.22, travelSeconds: 0.16 } },
};
