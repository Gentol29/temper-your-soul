/*
 * Identita' visiva dei boss oltre lo sprite: particelle d'ambiente sempre attive, aura e particelle della furia.
 * Solo aspetto, per id della grafica (`BossDefinition.art`). Valori provvisori.
 */

export interface BossFx {
  /** Particelle sempre attive attorno al boss (braci, spore, scorie, neve). `rise` negativo = salgono. */
  readonly ambient: { readonly colors: readonly string[]; readonly rate: number; readonly rise: number; readonly spread: number };
  /** In furia: particelle piu' fitte e un alone pulsante sotto il boss. */
  readonly rage: { readonly colors: readonly string[]; readonly rate: number; readonly glow: string };
}

export const BOSS_FX: Readonly<Record<string, BossFx>> = {
  guardian: {
    ambient: { colors: ['#ffb36b', '#ff8a4c', '#ffd8a0'], rate: 6, rise: -40, spread: 26 },
    rage: { colors: ['#ff5a3c', '#ffd27a', '#ff7b4a'], rate: 28, glow: '#ff4a2a' },
  },
  spore_mother: {
    ambient: { colors: ['#d9e86a', '#a9c95a', '#eef7b0'], rate: 8, rise: -14, spread: 36 },
    rage: { colors: ['#c08cff', '#e2ff7a', '#9f6bff'], rate: 26, glow: '#9c5cff' },
  },
  forge_colossus: {
    ambient: { colors: ['#ff9a3d', '#ffcf6a', '#6a5850'], rate: 10, rise: -50, spread: 44 },
    rage: { colors: ['#ff6a1a', '#ffd04a', '#ff3d12'], rate: 32, glow: '#ff5a00' },
  },
  frost_warden: {
    ambient: { colors: ['#e6f7ff', '#9fe4ff', '#ffffff'], rate: 7, rise: 12, spread: 30 },
    rage: { colors: ['#8fe6ff', '#c9b3ff', '#f2fbff'], rate: 26, glow: '#6fd8ff' },
  },
  // I luogotenenti: le stesse famiglie di colori dei boss, piu' sobrie.
  // Luogotenenti delle vene B e C: i colori dei servitori della loro vena.
  grand_gravedigger: {
    ambient: { colors: ['#9fe0b0', '#8a7a60', '#d8f0c0'], rate: 4, rise: 18, spread: 24 },
    rage: { colors: ['#ff6a5a', '#9fe0b0', '#e8dfc8'], rate: 16, glow: '#9fe0b0' },
  },
  organ_master: {
    ambient: { colors: ['#c9a6ff', '#f0d0ff', '#c8c8d8'], rate: 5, rise: 26, spread: 24 },
    rage: { colors: ['#ff5a6a', '#c9a6ff', '#f6e6c0'], rate: 18, glow: '#c9a6ff' },
  },
  elder_washer: {
    ambient: { colors: ['#b98cff', '#8a5ad0', '#e8e4f0'], rate: 4, rise: 16, spread: 26 },
    rage: { colors: ['#ff6ab0', '#b98cff', '#d8a0ff'], rate: 16, glow: '#b98cff' },
  },
  colony_queen: {
    ambient: { colors: ['#cddc58', '#e6f56a', '#8a7a50'], rate: 6, rise: 22, spread: 30 },
    rage: { colors: ['#ff6a5a', '#cddc58', '#e6f56a'], rate: 20, glow: '#cddc58' },
  },
  hollow_champion: {
    ambient: { colors: ['#c8a0ff', '#d8d8e8', '#7a7a8a'], rate: 4, rise: 20, spread: 26 },
    rage: { colors: ['#ff5a7a', '#c8a0ff', '#f0e8ff'], rate: 18, glow: '#c8a0ff' },
  },
  iron_foreman: {
    ambient: { colors: ['#fff0b0', '#9a9aa8', '#e8e4f0'], rate: 4, rise: 18, spread: 28 },
    rage: { colors: ['#ff5a3c', '#e8e4f0', '#fff0b0'], rate: 18, glow: '#e8e4f0' },
  },
  mother_bear: {
    ambient: { colors: ['#e8f0f8', '#d6c4ff', '#bfefff'], rate: 4, rise: 18, spread: 30 },
    rage: { colors: ['#ff5a6a', '#d6c4ff', '#e8f0f8'], rate: 18, glow: '#d6c4ff' },
  },
  astronomer: {
    ambient: { colors: ['#eaf8ff', '#bfefff', '#c8a050'], rate: 6, rise: 28, spread: 22 },
    rage: { colors: ['#ff8ad0', '#eaf8ff', '#d6c4ff'], rate: 20, glow: '#bfefff' },
  },
  belfry_gargoyle: {
    ambient: { colors: ['#b8b4c0', '#8a8494', '#ffb36b'], rate: 4, rise: 20, spread: 22 },
    rage: { colors: ['#ff5a3c', '#ffb36b', '#d8d0c0'], rate: 18, glow: '#ff6a4a' },
  },
  toad_king: {
    ambient: { colors: ['#c8e060', '#8ab04a', '#e8c040'], rate: 5, rise: -10, spread: 30 },
    rage: { colors: ['#c070b0', '#e2ff7a', '#9f6bff'], rate: 18, glow: '#a060d0' },
  },
  serpent_queen: {
    ambient: { colors: ['#9fd070', '#5a8a4a', '#c8e0a0'], rate: 5, rise: -10, spread: 40 },
    rage: { colors: ['#d03a4a', '#9fd070', '#e8c0c0'], rate: 20, glow: '#c03048' },
  },
  anvil_master: {
    ambient: { colors: ['#ff9a3d', '#ffd04a', '#6a5850'], rate: 6, rise: -40, spread: 32 },
    rage: { colors: ['#ff6a1a', '#ffd04a', '#ff3d12'], rate: 22, glow: '#ff5a00' },
  },
  first_apprentice: {
    ambient: { colors: ['#e6f7ff', '#aef0ff', '#ffffff'], rate: 5, rise: 10, spread: 20 },
    rage: { colors: ['#c9b3ff', '#8fe6ff', '#f2fbff'], rate: 18, glow: '#9fb0ff' },
  },
};

const FALLBACK_FX = BOSS_FX.guardian!;

export function bossFx(art: string): BossFx {
  return BOSS_FX[art] ?? FALLBACK_FX;
}
