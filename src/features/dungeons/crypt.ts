import { Vec2 } from '../../core/vec2';
import type { ArenaDefinition } from '../arena/arena';
import { GUARDIAN } from '../boss/guardian';
import type { DungeonDefinition } from './dungeon-definition';

/** La cripta del prototipo: arena grande e quasi libera, con sei ostacoli scenografici. */
export const CRYPT_ARENA: ArenaDefinition = {
  id: 'crypt',
  name: 'La cripta',
  theme: 'crypt',
  width: 3200,
  height: 2400,
  wallThickness: 24,
  playerSpawn: new Vec2(1600, 1350),
  bossSpawn: new Vec2(1600, 1100),
  playerMargin: 40,
  bossMargin: 60,
  projectileMargin: 24,
  // Ostacoli scenografici (teschi, fontane, rovine, ossa): variante e aspetto scelti dal tema in base alla posizione.
  pillars: [
    { position: new Vec2(1100, 999), radius: 64 },
    { position: new Vec2(2100, 1003), radius: 64 },
    { position: new Vec2(1100, 1600), radius: 64 },
    { position: new Vec2(2100, 1601), radius: 64 },
    { position: new Vec2(1600, 1800), radius: 64 },
    { position: new Vec2(699, 1299), radius: 64 },
  ],
};

export const CRYPT: DungeonDefinition = {
  id: 'crypt',
  name: 'La cripta',
  tagline: 'Dove tutto comincia.',
  description: "Una grande cripta con pochi ripari: cumuli di teschi, fontane distrutte e rovine. Il guardiano veglia da secoli: schiva le sue raffiche e abbattilo.",
  danger: 1,
  arena: CRYPT_ARENA,
  boss: GUARDIAN,
};
