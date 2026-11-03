/** Valori provvisori centralizzati: richiedono una prova giocata per classe e dimensione del party. */
export const CLASS_COMBAT = {
  channelMoveFactor: 0.35,
  exposedMultiplier: 1.2,
  rushHitMargin: 18,
  petHitMargin: 22,
  /** Acquisizione autonoma; distinta dal salto fra prede, che conserva il suo raggio. */
  petAcquireRadius: 480,
} as const;
export const BOSS_SPECIAL = {
  firstDelay: 10, interval: 12, windup: 1.1,
  projectile: { team: 'enemy', speed: 390, damage: 100, radius: 13, lifetime: 4, visual: 'boss_unstoppable', unblockable: true },
} as const;
