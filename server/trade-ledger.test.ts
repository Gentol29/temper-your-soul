import {it,expect} from 'vitest';
import {mkdtemp,rm,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {TradeLedger} from './trade-ledger';
it('il registro sopravvive al riavvio e conserva la consegna dell’altro giocatore finché non conferma il salvataggio',async()=>{
 await mkdir(join(process.cwd(),'.tools'),{recursive:true});const dir=await mkdtemp(join(process.cwd(),'.tools','tys-trades-'));try{
  const file=join(dir,'ledger.json'),ledger=new TradeLedger(file),delta={id:'room:1',remove:['i1'],receive:[]};
  await ledger.commit([{identity:'a',delta},{identity:'b',delta}]);expect(new TradeLedger(file).pending('b')).toEqual([delta]);
  await ledger.ack('a',delta.id);const restored=new TradeLedger(file);expect(restored.pending('a')).toEqual([]);expect(restored.pending('b')).toEqual([delta]);await restored.ack('b',delta.id);expect(new TradeLedger(file).has(delta.id)).toBe(false);
 }finally{await rm(dir,{recursive:true,force:true});}
});
it('non ignora in silenzio un registro corrotto',async()=>{await mkdir(join(process.cwd(),'.tools'),{recursive:true});const dir=await mkdtemp(join(process.cwd(),'.tools','tys-trades-'));try{const file=join(dir,'ledger.json');await writeFile(file,'broken','utf8');expect(()=>new TradeLedger(file)).toThrow();}finally{await rm(dir,{recursive:true,force:true});}});
