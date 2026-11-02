/** Intervalli provvisori fra due colpi fisici dello stesso nemico sullo stesso bersaglio (secondi). */
export const CONTACT_ATTACKS = { minionInterval: 0.8, bossInterval: 1 } as const;

/** Cadenza dell’attaccante, senza concedere invulnerabilità al bersaglio. Tempo della simulazione, mai del browser. */
export class ContactAttacks {
  private readonly readyAt = new WeakMap<object, WeakMap<object, number>>();

  tryAttack(attacker: object, target: object, time: number, interval: number): boolean {
    let targets = this.readyAt.get(attacker);
    if (!targets) { targets = new WeakMap(); this.readyAt.set(attacker, targets); }
    if (time + 1e-9 < (targets.get(target) ?? 0)) return false;
    // Anche una parata o una schivata consuma il tentativo: il nemico deve recuperare prima di colpire di nuovo.
    targets.set(target, time + interval);
    return true;
  }
}
