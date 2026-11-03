/** Prima taratura, per livello di pericolo T1–T4. */
export const MOB_REWARDS = { chance: 0.7, emergeSeconds: 0.5, flightSeconds: 0.4,
  tiers: { crypt: {xp: 4, gold: 3}, swamp: {xp: 7, gold: 6}, forge: {xp: 10, gold: 9}, glacier: {xp: 14, gold: 12} }
} as const;
export function mobReward(dungeon: string): {xp: number; gold: number} {
  return MOB_REWARDS.tiers[dungeon as keyof typeof MOB_REWARDS.tiers] ?? MOB_REWARDS.tiers.crypt;
}
