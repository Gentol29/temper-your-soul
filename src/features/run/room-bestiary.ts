import { BELFRY_BAT, BONE_RELIQUARY, CENSER_ACOLYTE, CINDER_WISP, GARGOYLE, OSSUARY_SKELETON, VESPER_BELL, WAX_CANDLE } from '../minions/catalog/crypt';
import { ANVIL_GOLEM, CRUCIBLE, FORGE_DEVIL, FORGE_SPARK, LIVING_BELLOWS, MOLTEN_SLAG, SLAG_IMP, SLAG_PEBBLE } from '../minions/catalog/forge';
import { BLIZZARD_SPIRIT, ECHO_CRYSTAL, FROST_APPRENTICE, FROST_SENTINEL, ICE_RAM, LIVING_ICE, RAZOR_FLAKE, SNOW_WOLF } from '../minions/catalog/glacier';
import { BOG_GNAT, BOG_TOAD, FAIRY_RING, MOSS_SNAIL, PUFFBALL, ROOT_WORM, SPITTING_FLOWER, SPORELING } from '../minions/catalog/swamp';
import { BONE_COLOSSUS, CHAPEL_MASTER, CHOIR_GHOST, CHOIR_STALL, CRYPT_RAT, FLYING_PSALTER, GRAVE_LANTERN, GRAVEDIGGER, HOPPING_SKULL, LECTERN_EAGLE, MASS_GRAVE, ORGAN_PIPE, VEILED_MOURNER, VESPER_CANTOR } from '../minions/catalog/crypt-veins';
import { ARMORER, BLASTER, DAMNED_MINER, EMPTY_ARMOR, FIREDAMP_CANARY, FLAIL, FLYING_BLADE, IRON_MOLE, MINE_SHAFT, ORE_GIANT, REPEATING_CROSSBOW, RUNAWAY_CART, TIN_PAGE, WEAPON_RACK } from '../minions/catalog/forge-veins';
import { ARCTIC_FOX, CLIFF_LEMMING, COLOSSAL_SNOWMAN, ERMINE, FROST_HOMUNCULUS, FROZEN_ALEMBIC, LIVING_ASTROLABE, SNOW_BEAR, SNOW_DEN, SNOWBALL, SNOWY_OWL, STAR_READER } from '../minions/catalog/glacier-veins';
import { ANTHILL, BLACK_PIKE, BLOATED_DROWNED, BOMBARDIER_BEETLE, CARNIVOROUS_LILY, DROWNED, INFESTED_ANT, INFESTED_STAG, LEECH, NIGHT_WASHER, ROTTEN_CICADA, SPAWN_CLUSTER, SPORE_MOTH, WEAVER_SPIDER } from '../minions/catalog/swamp-veins';
import type { VeinId } from '../minions/minion-catalog';
import type { MinionDefinition } from '../minions/minion-definition';

/**
 * Ruolo di un servitore per il regista:
 * - `swarm`: la folla che cade in uno o due colpi;
 * - `threat`: la minaccia annunciata (tiratori, caricatori, torrette, saltatori);
 * - `heavy`: pesanti, uno per ondata al massimo;
 * - `nest` / `support`: priorita' da abbattere, uno per ondata al massimo.
 */
export type BestiaryRole = 'swarm' | 'threat' | 'heavy' | 'nest' | 'support';

/** Un servitore che il regista puo' comprare: vita nella cripta (le stanze la scalano), costo e prima tappa utile. */
export interface BestiaryEntry {
  readonly minion: MinionDefinition;
  readonly role: BestiaryRole;
  readonly health: number;
  readonly cost: number;
  /** Prima tappa (da 0) in cui puo' comparire. */
  readonly firstStage?: number;
}

const entry = (minion: MinionDefinition, role: BestiaryRole, health: number, cost: number, firstStage = 0): BestiaryEntry => ({
  minion,
  role,
  health,
  cost,
  ...(firstStage > 0 ? { firstStage } : {}),
});

/**
 * L'Ossario sta in tutte e tre le vene della Cripta (Navata, Catacombe, Cantoria): e' una voce sola, condivisa, perche'
 * `bestiaryEntry` deve restituire la stessa voce da qualunque vena.
 */
const OSSUARY_ENTRY = entry(OSSUARY_SKELETON, 'swarm', 22, 1);

/**
 * I servitori delle stanze per dungeon (la vena A, quella di sempre). Valori provvisori: la vita e' quella della
 * cripta, il costo e' in punti.
 */
export const ROOM_BESTIARY: Readonly<Record<string, readonly BestiaryEntry[]>> = {
  crypt: [
    entry(WAX_CANDLE, 'swarm', 22, 1),
    entry(BELFRY_BAT, 'swarm', 14, 1),
    OSSUARY_ENTRY,
    entry(CINDER_WISP, 'swarm', 40, 2),
    entry(CENSER_ACOLYTE, 'threat', 45, 3),
    entry(GARGOYLE, 'threat', 70, 3, 1),
    entry(VESPER_BELL, 'heavy', 150, 6, 2),
    entry(BONE_RELIQUARY, 'nest', 160, 8, 2),
  ],
  swamp: [
    entry(SPORELING, 'swarm', 20, 1),
    entry(BOG_GNAT, 'swarm', 10, 1),
    entry(PUFFBALL, 'swarm', 30, 2),
    entry(BOG_TOAD, 'threat', 60, 3),
    entry(SPITTING_FLOWER, 'threat', 55, 3),
    entry(ROOT_WORM, 'threat', 70, 3, 1),
    entry(MOSS_SNAIL, 'heavy', 160, 6, 1),
    entry(FAIRY_RING, 'nest', 150, 8, 2),
  ],
  forge: [
    entry(SLAG_PEBBLE, 'swarm', 22, 1),
    entry(FORGE_SPARK, 'swarm', 10, 1),
    entry(SLAG_IMP, 'swarm', 35, 2),
    entry(LIVING_BELLOWS, 'threat', 80, 3),
    entry(FORGE_DEVIL, 'threat', 45, 3),
    entry(MOLTEN_SLAG, 'threat', 60, 3, 1),
    entry(ANVIL_GOLEM, 'heavy', 190, 6, 1),
    entry(CRUCIBLE, 'heavy', 170, 6, 2),
  ],
  glacier: [
    entry(RAZOR_FLAKE, 'swarm', 12, 1),
    entry(SNOW_WOLF, 'swarm', 30, 2),
    entry(FROST_SENTINEL, 'threat', 60, 3),
    entry(FROST_APPRENTICE, 'threat', 50, 3),
    entry(BLIZZARD_SPIRIT, 'threat', 40, 3),
    entry(ICE_RAM, 'threat', 80, 3, 1),
    entry(LIVING_ICE, 'heavy', 170, 6, 1),
    entry(ECHO_CRYSTAL, 'support', 70, 8, 2),
  ],
};

/** Nome e tema di una vena (per la porta, il Bestiario e la mappa). */
export interface VeinLabel {
  readonly name: string;
  readonly summary: string;
}

/** Le tre vene di ogni dungeon: la A e' quella di sempre, B e C vengono dalle schede dello studio sulla grafica. */
export const VEIN_LABELS: Readonly<Record<string, Readonly<Record<VeinId, VeinLabel>>>> = {
  crypt: {
    a: { name: 'Navata', summary: 'Ceri, ossari, campane: la chiesa sepolta dell\'Ordine.' },
    b: { name: 'Catacombe', summary: 'Ossa murate, becchini, lumini verdi.' },
    c: { name: 'Cantoria', summary: 'Il coro e l\'organo, dove il suono si fa anello.' },
  },
  swamp: {
    a: { name: 'Torbiera', summary: 'Funghi, radici, fango che respira.' },
    b: { name: 'Sommersi', summary: 'Acqua nera, annegati, lucci, lavandaie della notte.' },
    c: { name: 'Colonia', summary: 'Insetti posseduti dalla spora.' },
  },
  forge: {
    a: { name: 'Officina', summary: 'Scorie, mantici, incudini che battono da sole.' },
    b: { name: 'Armeria', summary: 'Armi e armature forgiate per il Colosso.' },
    c: { name: 'Miniera', summary: 'Le gallerie del minerale del Colosso.' },
  },
  glacier: {
    a: { name: 'Scuola del Custode', summary: 'Sentinelle, allievi, cristalli che cantano.' },
    b: { name: 'Tana del gelo', summary: 'Le bestie nutrite dal Custode.' },
    c: { name: 'Osservatorio', summary: 'La torre dove il Custode studia le stelle fredde.' },
  },
};

/**
 * I servitori delle stanze per dungeon e vena. La vena A e' `ROOM_BESTIARY`; B e C hanno ognuna folla, minacce, un
 * pesante e un nido o un sostegno per l'Assedio. Valori provvisori dalle schede dello studio (vita della cripta).
 */
export const VEIN_BESTIARY: Readonly<Record<string, Readonly<Record<VeinId, readonly BestiaryEntry[]>>>> = {
  crypt: {
    a: ROOM_BESTIARY.crypt!,
    b: [
      entry(HOPPING_SKULL, 'swarm', 14, 1),
      entry(CRYPT_RAT, 'swarm', 10, 1),
      OSSUARY_ENTRY,
      entry(GRAVE_LANTERN, 'threat', 50, 3),
      entry(VEILED_MOURNER, 'threat', 45, 3),
      entry(GRAVEDIGGER, 'threat', 60, 3, 1),
      entry(BONE_COLOSSUS, 'heavy', 190, 6, 1),
      entry(MASS_GRAVE, 'nest', 160, 8, 2),
    ],
    c: [
      entry(CHOIR_GHOST, 'swarm', 14, 1),
      entry(FLYING_PSALTER, 'swarm', 12, 1),
      OSSUARY_ENTRY,
      entry(ORGAN_PIPE, 'threat', 70, 3),
      entry(VESPER_CANTOR, 'threat', 50, 3, 1),
      entry(LECTERN_EAGLE, 'heavy', 170, 6, 1),
      entry(CHAPEL_MASTER, 'support', 70, 8, 2),
      entry(CHOIR_STALL, 'nest', 150, 8, 2),
    ],
  },
  swamp: {
    a: ROOM_BESTIARY.swamp!,
    b: [
      entry(LEECH, 'swarm', 12, 1),
      entry(DROWNED, 'swarm', 24, 1),
      entry(BLACK_PIKE, 'threat', 60, 3),
      entry(CARNIVOROUS_LILY, 'threat', 55, 3),
      entry(NIGHT_WASHER, 'threat', 50, 3, 1),
      entry(BLOATED_DROWNED, 'heavy', 170, 6, 1),
      entry(SPAWN_CLUSTER, 'nest', 140, 8, 2),
    ],
    c: [
      entry(INFESTED_ANT, 'swarm', 12, 1),
      entry(SPORE_MOTH, 'swarm', 10, 1),
      entry(BOMBARDIER_BEETLE, 'threat', 60, 3),
      entry(ROTTEN_CICADA, 'threat', 40, 3),
      entry(WEAVER_SPIDER, 'threat', 50, 3, 1),
      entry(INFESTED_STAG, 'heavy', 190, 6, 1),
      entry(ANTHILL, 'nest', 150, 8, 2),
    ],
  },
  forge: {
    a: ROOM_BESTIARY.forge!,
    b: [
      entry(FLYING_BLADE, 'swarm', 12, 1),
      entry(TIN_PAGE, 'swarm', 24, 1),
      entry(REPEATING_CROSSBOW, 'threat', 70, 3),
      entry(FLAIL, 'threat', 50, 3, 1),
      entry(EMPTY_ARMOR, 'heavy', 200, 6, 1),
      entry(ARMORER, 'support', 80, 8, 2),
      entry(WEAPON_RACK, 'nest', 160, 8, 2),
    ],
    c: [
      entry(FIREDAMP_CANARY, 'swarm', 10, 1),
      entry(DAMNED_MINER, 'swarm', 32, 2),
      entry(BLASTER, 'threat', 50, 3),
      entry(IRON_MOLE, 'threat', 65, 3, 1),
      entry(RUNAWAY_CART, 'threat', 70, 3, 1),
      entry(ORE_GIANT, 'heavy', 210, 6, 1),
      entry(MINE_SHAFT, 'nest', 160, 8, 2),
    ],
  },
  glacier: {
    a: ROOM_BESTIARY.glacier!,
    b: [
      entry(ERMINE, 'swarm', 12, 1),
      entry(CLIFF_LEMMING, 'swarm', 18, 2),
      entry(SNOWY_OWL, 'threat', 45, 3),
      entry(ARCTIC_FOX, 'threat', 50, 3, 1),
      entry(SNOW_BEAR, 'heavy', 200, 6, 1),
      entry(SNOW_DEN, 'nest', 140, 8, 2),
    ],
    c: [
      entry(FROST_HOMUNCULUS, 'swarm', 12, 1),
      entry(SNOWBALL, 'swarm', 8, 1),
      entry(LIVING_ASTROLABE, 'threat', 70, 3),
      entry(STAR_READER, 'threat', 55, 3, 1),
      entry(COLOSSAL_SNOWMAN, 'heavy', 210, 6, 1),
      entry(FROZEN_ALEMBIC, 'nest', 140, 8, 2),
    ],
  },
};

/** La voce di un servitore nel bestiario delle stanze del dungeon (qualunque vena), se c'e'. */
export function bestiaryEntry(dungeonId: string, minionId: string): BestiaryEntry | undefined {
  const veins = VEIN_BESTIARY[dungeonId];
  if (veins === undefined) return ROOM_BESTIARY[dungeonId]?.find((item) => item.minion.id === minionId);
  for (const list of [veins.a, veins.b, veins.c]) {
    const found = list.find((item) => item.minion.id === minionId);
    if (found !== undefined) return found;
  }
  return undefined;
}
