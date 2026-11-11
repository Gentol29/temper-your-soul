import {expect,it,vi} from 'vitest';
import type {Pool} from 'pg';
import {LegacyProfiles} from './legacy-profiles';
import {createProfileStore} from './profile-store';
import {Character} from '../../src/features/character/character';
import {serializeCharacter} from '../../src/features/character/save-format';

const seed={name:'Eroe',characterClass:'mage' as const,body:'male' as const};
function profile(){const character=Character.createStarter();character.completeCreation(seed.name,seed.body,seed.characterClass);return{accountId:'account',character,gold:0,revision:1794258000123456};}
it('legge lo schema Supabase reale e mantiene la revisione in microsecondi',async()=>{
 const p=profile(),data=JSON.parse(serializeCharacter(p.character)) as Record<string,unknown>;data.version=9;
 const query=vi.fn().mockResolvedValueOnce({}).mockResolvedValueOnce({rows:[{character:data,name:'Eroe',class:'mage',xp:0,gold:75,revision:String(p.revision)}]});
 const loaded=await new LegacyProfiles({query} as unknown as Pool,{}).load('a',seed);
 expect(loaded.gold).toBe(75);expect(loaded.revision).toBe(p.revision);expect(loaded.character.gearScore).toBe(80);
 expect(query.mock.calls[0]![0]).toContain('"account_id",name,class,level,xp,"gold",save_version,"inventory","updated_at"');
 expect(query.mock.calls[0]![1].slice(0,7)).toEqual(['a','Eroe','mage',1,0,0,10]);
 expect(query.mock.calls[1]![0]).toContain('EXTRACT(EPOCH');
});
it('cercare un account senza riga non inserisce nulla; con la riga carica il personaggio senza seme',async()=>{
 const p=profile(),query=vi.fn().mockResolvedValueOnce({rows:[]}).mockResolvedValueOnce({rows:[{character:JSON.parse(serializeCharacter(p.character)),name:'Eroe',class:'mage',xp:0,gold:5,revision:'9'}]});
 const repo=new LegacyProfiles({query} as unknown as Pool,{});
 expect(await repo.find('nuovo')).toBeNull();expect(query).toHaveBeenCalledTimes(1);expect(query.mock.calls[0]![0]).not.toContain('INSERT');
 const found=await repo.find('a');expect(found!.character.name).toBe('Eroe');expect(found!.gold).toBe(5);expect(found!.revision).toBe(9);
});
it('scrive JSON completo e metadati coerenti senza creare colonne o perdere i record',async()=>{
 const p=profile();p.character.totalXp=350;p.character.recordVictory('crypt',60);p.gold=125;
 const query=vi.fn().mockResolvedValue({rowCount:1,rows:[{revision:String(p.revision+17)}]}),release=vi.fn();
 await new LegacyProfiles({connect:async()=>({query,release})} as unknown as Pool,{}).save([p]);
 const args=query.mock.calls[1]![1];expect(args.slice(0,7)).toEqual(['account','Eroe','mage',3,350,125,10]);
 expect(JSON.parse(args[7]).characters[0].character.records.crypt.clears).toBe(1);expect(query.mock.calls[1]![0]).toContain('WHERE COALESCE');
 expect(p.revision).toBe(1794258000123473);expect(query.mock.calls.at(-1)![0]).toBe('COMMIT');expect(release).toHaveBeenCalled();
});
it('un conflitto annulla entrambi i salvataggi e conserva le revisioni originali',async()=>{
 const a=profile(),b={...profile(),accountId:'b'},before=a.revision;
 const query=vi.fn().mockResolvedValueOnce({}).mockResolvedValueOnce({rowCount:1,rows:[{revision:String(before+1)}]}).mockResolvedValueOnce({rowCount:0,rows:[]}).mockResolvedValue({});
 await expect(new LegacyProfiles({connect:async()=>({query,release:()=>{}})} as unknown as Pool,{}).save([a,b])).rejects.toThrow('altra sessione');
 expect(query.mock.calls.at(-1)![0]).toBe('ROLLBACK');expect(a.revision).toBe(before);expect(b.revision).toBe(before);
});
it('un inventario legacy non riconoscibile viene rifiutato senza sovrascriverlo',async()=>{
 const query=vi.fn().mockResolvedValueOnce({}).mockResolvedValueOnce({rows:[{character:[],name:'Eroe',class:'mage',xp:50,gold:0,revision:'1'}]});
 await expect(new LegacyProfiles({query} as unknown as Pool,{}).load('a',seed)).rejects.toThrow('dati conservati');expect(query).toHaveBeenCalledTimes(2);
});
it('metadati discordanti non sovrascrivono il salvataggio JSON',async()=>{
 const p=profile(),query=vi.fn().mockResolvedValueOnce({}).mockResolvedValueOnce({rows:[{character:JSON.parse(serializeCharacter(p.character)),name:'Diverso',class:'mage',xp:0,gold:0,revision:'1'}]});
 await expect(new LegacyProfiles({query} as unknown as Pool,{}).load('a',seed)).rejects.toThrow('non coerente');
});
it('seleziona esplicitamente lo schema legacy e rifiuta layout sconosciuti',()=>{
 expect(createProfileStore({} as Pool,{PROFILES_LAYOUT:'legacy-v9'})).toBeInstanceOf(LegacyProfiles);
 expect(()=>createProfileStore({} as Pool,{PROFILES_LAYOUT:'auto-guess'})).toThrow('PROFILES_LAYOUT');
});
