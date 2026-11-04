import {describe,it,expect} from 'vitest';
import {Character} from './character';
import {CharacterRoster,serializeRoster,deserializeRoster} from './character-roster';
import {deserializeCharacter,serializeCharacter} from './save-format';
import {acquireBasic,upgradeItem,depositItem,withdrawItem} from './hub-services';
import {resolveCombatStats} from '../classes/class-stats';
import {HubState, HUB_MAP, hubApproachPoint, hubBlocked} from './hub-state';
import {Vec2} from '../../core/vec2';
function hero(){const c=Character.createStarter();c.completeCreation('Anima','female','mage');return c;}
describe('oro e servizi del rifugio',()=>{
 it('il portafoglio resta dopo cambio e rimozione di tutti i personaggi e ricaricamento',()=>{
  const roster=new CharacterRoster();roster.gold=137;const a=roster.add(hero()),b=roster.add(hero());roster.select(a.id);roster.remove(a.id);roster.remove(b.id);
  const loaded=deserializeRoster(serializeRoster(roster))!;expect(loaded.gold).toBe(137);expect(loaded.profiles).toEqual([]);
 });
 it('migra un roster v7 conservando XP, oggetti e profili e rifiuta oro invalido',()=>{
  const roster=new CharacterRoster(),c=hero();c.totalXp=143;roster.add(c);const raw=JSON.parse(serializeRoster(roster));raw.version=7;delete raw.gold;raw.characters[0].character.version=7;
  const loaded=deserializeRoster(JSON.stringify(raw))!;expect(loaded.gold).toBe(0);expect(loaded.active!.character.totalXp).toBe(143);expect(loaded.active!.character.inventory).toEqual(c.inventory);
  for(const gold of [-1,1.5,'20',null])expect(deserializeRoster(JSON.stringify({...raw,version:8,gold}))).toBeNull();
 });
 it('acquisti e crafting scalano oro solo quando riescono, senza alterare il set attivo',()=>{
  const roster=new CharacterRoster(),c=hero();roster.gold=29;expect(acquireBasic(roster,c,0)).toBe(false);expect(c.inventory).toHaveLength(4);
  roster.gold=150;const equipment={...c.equipped};expect(acquireBasic(roster,c,0)).toBe(true);expect(roster.gold).toBe(120);
  expect(acquireBasic(roster,c,1,true)).toBe(true);expect(roster.gold).toBe(0);expect(c.inventory.at(-1)!.rarity).toBe('uncommon');expect(c.equipped).toEqual(equipment);expect(acquireBasic(roster,c,90)).toBe(false);
 });
 it('il fabbro migliora statistiche reali, mantiene uid e salva la miglioria, con tetto e costo crescente',()=>{
  const roster=new CharacterRoster(),c=hero();roster.gold=10000;const item=c.equippedItem('primary_hand')!,before=resolveCombatStats('mage',c.loadout());
  expect(upgradeItem(roster,c,item.uid)).toBe(true);expect(roster.gold).toBe(9940);
  const after=resolveCombatStats('mage',c.loadout());expect(after.abilityPower).toBeGreaterThan(before.abilityPower);
  for(let i=1;i<5;i++)expect(upgradeItem(roster,c,item.uid)).toBe(true);
  const balance=roster.gold;expect(upgradeItem(roster,c,item.uid)).toBe(false);expect(roster.gold).toBe(balance);
  const loaded=deserializeCharacter(serializeCharacter(c))!;expect(loaded.itemByUid(item.uid)!.upgrade).toBe(5);expect(loaded.loadout()).toEqual(c.loadout());
 });
 it('deposito personale senza duplicare uid o riporre pezzi indossati; oggetti conservati dopo riavvio',()=>{
  const c=hero(),equipped=c.equippedItem('armor')!;expect(depositItem(c,equipped.uid)).toBe(false);
  const item=c.addRolls([{familyId:equipped.familyId,rarity:'rare'}])[0]!;
  expect(depositItem(c,item.uid)).toBe(true);expect(depositItem(c,item.uid)).toBe(false);expect(c.itemByUid(item.uid)).toBeUndefined();
  const loaded=deserializeCharacter(serializeCharacter(c))!;expect(loaded.storage).toEqual([item]);expect(withdrawItem(loaded,item.uid)).toBe(true);expect(withdrawItem(loaded,item.uid)).toBe(false);expect(loaded.itemByUid(item.uid)).toEqual(item);
 });
 it('livello 2 aumenta HP/MP/difesa/attacco con gli stessi valori letti dal profilo',()=>{
  const c=hero(),a=resolveCombatStats('mage',c.loadout(),99),b=resolveCombatStats('mage',c.loadout(),100);
  expect(b.maxHealth-a.maxHealth).toBe(3);expect(b.maxMana-a.maxMana).toBe(2);expect(b.armor-a.armor).toBe(1);expect(b.abilityPower-a.abilityPower).toBeCloseTo(.01);
 });
 it('le strutture si attivano solo nelle vicinanze e il movimento resta nella mappa',()=>{
  const state=new HubState();expect(state.nearest()).toBeUndefined();state.position=hubApproachPoint('portal');expect(state.nearest()!.id).toBe('portal');state.step(100,new Vec2(1,1));expect(state.position.x).toBeLessThan(HUB_MAP.width);expect(state.position.y).toBeLessThan(HUB_MAP.height);expect(hubBlocked(state.position)).toBe(false);
 });
});
