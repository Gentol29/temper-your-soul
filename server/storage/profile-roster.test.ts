import { expect, it } from 'vitest';
import { Character } from '../../src/features/character/character';
import { serializeCharacter } from '../../src/features/character/save-format';
import { copyProfile } from './profiles';
import { profileRoster, readProfileRoster, serializeProfileRoster } from './profile-roster';

function hero(name: string) {
  const c = Character.createStarter('archer'); c.completeCreation(name, 'male', 'archer'); return c;
}
it('adotta il vecchio personaggio con inventario e progressi, senza ricrearlo', () => {
  const c = hero('Primo'); c.totalXp = 470; c.recordVictory('crypt', 50);
  const roster = readProfileRoster(serializeCharacter(c), 125);
  expect(roster.activeId).toBe('c1'); expect(serializeCharacter(roster.active!.character)).toBe(serializeCharacter(c));
  expect(roster.gold).toBe(125);
});
it('la copia e il salvataggio conservano anche i personaggi inattivi e un solo saldo autorevole', () => {
  const profile = { accountId: 'a', character: hero('Primo'), gold: 85, revision: 4 };
  const roster = profileRoster(profile), second = hero('Secondo');
  roster.add(second); profile.character = second;
  const copy = copyProfile(profile); copy.character.totalXp = 200; copy.gold = 30;
  const saved = readProfileRoster(serializeProfileRoster(copy), 30);
  expect(saved.profiles.map(p => [p.character.name,p.character.totalXp])).toEqual([['Primo',0],['Secondo',200]]);
  expect(roster.active!.character.totalXp).toBe(0); expect(saved.gold).toBe(30);
  // La colonna oro prevale su un vecchio valore eventualmente rimasto nel JSON.
  expect(readProfileRoster(serializeProfileRoster(copy), 77).gold).toBe(77);
});
it('un personaggio corrotto o una selezione sconosciuta bloccano tutta la raccolta senza scartarla', () => {
  const p = { accountId: 'a', character: hero('Primo'), gold: 0, revision: 0 };
  const raw = JSON.parse(serializeProfileRoster(p));
  raw.characters.push({ id: 'c2', character: {version:999} });
  expect(() => readProfileRoster(raw,0)).toThrow('dati conservati');
  raw.characters.pop();raw.activeId='c99';
  expect(() => readProfileRoster(raw,0)).toThrow('dati conservati');
});
