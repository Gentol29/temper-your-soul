// File generato da prepara_boss_ia.py (script fuori dal repository, vedi README · Strumenti esterni): non modificarlo a mano.

import type { SheetLayout } from './boss-sheet';

/** Foglio di un boss o luogotenente fatto con il generatore locale: geometria, ritmo e posizione nel mondo. */
export interface BossIaSheet {
  readonly layout: SheetLayout;
  readonly walkFps: number;
  readonly feetY: number;
  readonly portraitScale: number;
}

export const BOSS_IA_SHEETS: Readonly<Record<string, BossIaSheet>> = {
  guardian: {
    layout: {
      url: new URL('../../../assets/art/boss-ia/guardian.png', import.meta.url).href,
      cell: { width: 83, height: 94 },
      feet: { x: 46, y: 94 },
      clips: { walk: { row: 0, frames: 8 }, attack: { row: 1, frames: 6 }, rageWalk: { row: 2, frames: 8 }, rageAttack: { row: 3, frames: 6 }, transform: { row: 4, frames: 7 }, death: { row: 5, frames: 9 } },
    },
    walkFps: 6,
    feetY: 25,
    portraitScale: 2,
  },
  spore_mother: {
    layout: {
      url: new URL('../../../assets/art/boss-ia/spore_mother.png', import.meta.url).href,
      cell: { width: 101, height: 91 },
      feet: { x: 52, y: 91 },
      clips: { walk: { row: 0, frames: 8 }, attack: { row: 1, frames: 6 }, rageWalk: { row: 2, frames: 8 }, rageAttack: { row: 3, frames: 6 }, transform: { row: 4, frames: 7 }, death: { row: 5, frames: 9 } },
    },
    walkFps: 7,
    feetY: 28,
    portraitScale: 2,
  },
  forge_colossus: {
    layout: {
      url: new URL('../../../assets/art/boss-ia/forge_colossus.png', import.meta.url).href,
      cell: { width: 123, height: 109 },
      feet: { x: 74, y: 109 },
      clips: { walk: { row: 0, frames: 8 }, attack: { row: 1, frames: 6 }, rageWalk: { row: 2, frames: 8 }, rageAttack: { row: 3, frames: 6 }, transform: { row: 4, frames: 7 }, death: { row: 5, frames: 9 } },
    },
    walkFps: 5,
    feetY: 28,
    portraitScale: 2,
  },
  frost_warden: {
    layout: {
      url: new URL('../../../assets/art/boss-ia/frost_warden.png', import.meta.url).href,
      cell: { width: 111, height: 101 },
      feet: { x: 54, y: 98 },
      clips: { walk: { row: 0, frames: 8 }, attack: { row: 1, frames: 6 }, rageWalk: { row: 2, frames: 8 }, rageAttack: { row: 3, frames: 6 }, transform: { row: 4, frames: 7 }, death: { row: 5, frames: 9 } },
    },
    walkFps: 8,
    feetY: 30,
    portraitScale: 2,
  },
  belfry_gargoyle: {
    layout: {
      url: new URL('../../../assets/art/boss-ia/belfry_gargoyle.png', import.meta.url).href,
      cell: { width: 79, height: 60 },
      feet: { x: 27, y: 58 },
      clips: { walk: { row: 0, frames: 8 }, attack: { row: 1, frames: 6 }, rageWalk: { row: 2, frames: 8 }, rageAttack: { row: 3, frames: 6 }, transform: { row: 4, frames: 7 }, death: { row: 5, frames: 9 } },
    },
    walkFps: 10,
    feetY: 24,
    portraitScale: 4,
  },
  toad_king: {
    layout: {
      url: new URL('../../../assets/art/boss-ia/toad_king.png', import.meta.url).href,
      cell: { width: 80, height: 73 },
      feet: { x: 39, y: 73 },
      clips: { walk: { row: 0, frames: 8 }, attack: { row: 1, frames: 6 }, rageWalk: { row: 2, frames: 8 }, rageAttack: { row: 3, frames: 6 }, transform: { row: 4, frames: 7 }, death: { row: 5, frames: 9 } },
    },
    walkFps: 9,
    feetY: 26,
    portraitScale: 3,
  },
  anvil_master: {
    layout: {
      url: new URL('../../../assets/art/boss-ia/anvil_master.png', import.meta.url).href,
      cell: { width: 84, height: 69 },
      feet: { x: 40, y: 69 },
      clips: { walk: { row: 0, frames: 8 }, attack: { row: 1, frames: 6 }, rageWalk: { row: 2, frames: 8 }, rageAttack: { row: 3, frames: 6 }, transform: { row: 4, frames: 7 }, death: { row: 5, frames: 9 } },
    },
    walkFps: 6,
    feetY: 30,
    portraitScale: 3,
  },
  first_apprentice: {
    layout: {
      url: new URL('../../../assets/art/boss-ia/first_apprentice.png', import.meta.url).href,
      cell: { width: 57, height: 71 },
      feet: { x: 28, y: 69 },
      clips: { walk: { row: 0, frames: 8 }, attack: { row: 1, frames: 6 }, rageWalk: { row: 2, frames: 8 }, rageAttack: { row: 3, frames: 6 }, transform: { row: 4, frames: 7 }, death: { row: 5, frames: 9 } },
    },
    walkFps: 8,
    feetY: 24,
    portraitScale: 3,
  },
  grand_gravedigger: {
    layout: {
      url: new URL('../../../assets/art/boss-ia/grand_gravedigger.png', import.meta.url).href,
      cell: { width: 51, height: 86 },
      feet: { x: 24, y: 78 },
      clips: { walk: { row: 0, frames: 8 }, attack: { row: 1, frames: 6 }, rageWalk: { row: 2, frames: 8 }, rageAttack: { row: 3, frames: 6 }, transform: { row: 4, frames: 7 }, death: { row: 5, frames: 9 } },
    },
    walkFps: 7,
    feetY: 26,
    portraitScale: 3,
  },
  organ_master: {
    layout: {
      url: new URL('../../../assets/art/boss-ia/organ_master.png', import.meta.url).href,
      cell: { width: 60, height: 82 },
      feet: { x: 27, y: 80 },
      clips: { walk: { row: 0, frames: 8 }, attack: { row: 1, frames: 6 }, rageWalk: { row: 2, frames: 8 }, rageAttack: { row: 3, frames: 6 }, transform: { row: 4, frames: 7 }, death: { row: 5, frames: 9 } },
    },
    walkFps: 6,
    feetY: 24,
    portraitScale: 2,
  },
  elder_washer: {
    layout: {
      url: new URL('../../../assets/art/boss-ia/elder_washer.png', import.meta.url).href,
      cell: { width: 68, height: 71 },
      feet: { x: 32, y: 69 },
      clips: { walk: { row: 0, frames: 8 }, attack: { row: 1, frames: 6 }, rageWalk: { row: 2, frames: 8 }, rageAttack: { row: 3, frames: 6 }, transform: { row: 4, frames: 7 }, death: { row: 5, frames: 9 } },
    },
    walkFps: 6,
    feetY: 27,
    portraitScale: 3,
  },
  colony_queen: {
    layout: {
      url: new URL('../../../assets/art/boss-ia/colony_queen.png', import.meta.url).href,
      cell: { width: 77, height: 77 },
      feet: { x: 48, y: 77 },
      clips: { walk: { row: 0, frames: 8 }, attack: { row: 1, frames: 6 }, rageWalk: { row: 2, frames: 8 }, rageAttack: { row: 3, frames: 6 }, transform: { row: 4, frames: 7 }, death: { row: 5, frames: 9 } },
    },
    walkFps: 6,
    feetY: 20,
    portraitScale: 3,
  },
  hollow_champion: {
    layout: {
      url: new URL('../../../assets/art/boss-ia/hollow_champion.png', import.meta.url).href,
      cell: { width: 60, height: 91 },
      feet: { x: 24, y: 91 },
      clips: { walk: { row: 0, frames: 8 }, attack: { row: 1, frames: 6 }, rageWalk: { row: 2, frames: 8 }, rageAttack: { row: 3, frames: 6 }, transform: { row: 4, frames: 7 }, death: { row: 5, frames: 9 } },
    },
    walkFps: 5,
    feetY: 27,
    portraitScale: 2,
  },
  iron_foreman: {
    layout: {
      url: new URL('../../../assets/art/boss-ia/iron_foreman.png', import.meta.url).href,
      cell: { width: 82, height: 84 },
      feet: { x: 55, y: 77 },
      clips: { walk: { row: 0, frames: 8 }, attack: { row: 1, frames: 6 }, rageWalk: { row: 2, frames: 8 }, rageAttack: { row: 3, frames: 6 }, transform: { row: 4, frames: 7 }, death: { row: 5, frames: 9 } },
    },
    walkFps: 5,
    feetY: 25,
    portraitScale: 3,
  },
  mother_bear: {
    layout: {
      url: new URL('../../../assets/art/boss-ia/mother_bear.png', import.meta.url).href,
      cell: { width: 67, height: 71 },
      feet: { x: 27, y: 71 },
      clips: { walk: { row: 0, frames: 8 }, attack: { row: 1, frames: 6 }, rageWalk: { row: 2, frames: 8 }, rageAttack: { row: 3, frames: 6 }, transform: { row: 4, frames: 7 }, death: { row: 5, frames: 9 } },
    },
    walkFps: 7,
    feetY: 21,
    portraitScale: 3,
  },
  astronomer: {
    layout: {
      url: new URL('../../../assets/art/boss-ia/astronomer.png', import.meta.url).href,
      cell: { width: 55, height: 87 },
      feet: { x: 27, y: 85 },
      clips: { walk: { row: 0, frames: 8 }, attack: { row: 1, frames: 6 }, rageWalk: { row: 2, frames: 8 }, rageAttack: { row: 3, frames: 6 }, transform: { row: 4, frames: 7 }, death: { row: 5, frames: 9 } },
    },
    walkFps: 7,
    feetY: 24,
    portraitScale: 2,
  },
};
