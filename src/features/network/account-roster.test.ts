import { expect, it } from 'vitest';
import { Character } from '../character/character';
import { CharacterRoster } from '../character/character-roster';
import { serializeCharacter } from '../character/save-format';
import { applyAccountProfile } from './account-roster';

it('gli aggiornamenti del server mantengono gli id e gli altri personaggi della selezione', () => {
  const roster = new CharacterRoster();
  const first = Character.createStarter('mage');first.completeCreation('Prima','female','mage');roster.add(first);
  const second = Character.createStarter('archer');second.completeCreation('Secondo','male','archer');roster.add(second);
  second.totalXp=300;
  expect(applyAccountProfile(roster,{type:'profile',characterId:'c2',character:serializeCharacter(second),gold:70,revision:3})).toBe(true);
  expect(roster.profiles).toHaveLength(2);expect(roster.profiles[0]!.character).toBe(first);expect(roster.activeId).toBe('c2');
  expect(roster.gold).toBe(70);
  const third=Character.createStarter('warrior');third.completeCreation('Terza','female','warrior');
  applyAccountProfile(roster,{type:'profile',characterId:'c3',character:serializeCharacter(third),gold:70,revision:4});
  expect(roster.profiles.map(p=>p.character.name)).toEqual(['Prima','Secondo','Terza']);expect(roster.activeId).toBe('c3');
});
