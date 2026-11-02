import {familyById} from '../src/features/items/item-families';
import {isRarity} from '../src/features/items/rarity';
import {readFileSync} from 'node:fs';
import {mkdir,writeFile,rename} from 'node:fs/promises';
import {dirname} from 'node:path';
import type {TradeDelta} from '../src/features/network/hub-protocol';
interface RecordEntry {identity:string;delta:TradeDelta}
function record(value:unknown):value is Record<string,unknown>{return typeof value==='object'&&value!==null&&!Array.isArray(value);}
function validEntry(value:unknown):value is RecordEntry {
 if(!record(value)||typeof value.identity!=='string'||!record(value.delta))return false;
 const d=value.delta;if(typeof d.id!=='string'||!Array.isArray(d.remove)||d.remove.some((uid:unknown)=>typeof uid!=='string')||!Array.isArray(d.receive))return false;
 return (d.receive as unknown[]).every(item=>record(item)&&typeof item.uid==='string'&&typeof item.familyId==='string'&&Boolean(familyById(item.familyId))&&isRarity(item.rarity)&&(item.upgrade===undefined||(typeof item.upgrade==='number'&&Number.isInteger(item.upgrade)&&item.upgrade>=0&&item.upgrade<=5))&&(item.level===undefined||(typeof item.level==='number'&&Number.isInteger(item.level)&&item.level>=1&&item.level<=20)));
}
/** Registro durevole dei trasferimenti ancora da ricevere, separato dai salvataggi personali. */
export class TradeLedger {
 private entries:RecordEntry[]=[];
 private queue:Promise<void>=Promise.resolve();
 constructor(private readonly file:string){try{const raw:unknown=JSON.parse(readFileSync(file,'utf8'));if(!Array.isArray(raw))throw new Error('Registro scambi non valido.');if(!(raw as unknown[]).every(validEntry))throw new Error('Registro scambi non valido.');this.entries=raw as RecordEntry[];}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}}
 pending(identity:string):readonly TradeDelta[]{return this.entries.filter(e=>e.identity===identity).map(e=>e.delta);}
 has(id:string):boolean{return this.entries.some(e=>e.delta.id===id);}
 private update(change:(entries:RecordEntry[])=>RecordEntry[]):Promise<void>{const operation=this.queue.then(async()=>{const next=change(this.entries);await mkdir(dirname(this.file),{recursive:true});await writeFile(this.file+'.tmp',JSON.stringify(next),'utf8');await rename(this.file+'.tmp',this.file);this.entries=next;});this.queue=operation.catch(()=>{});return operation;}
 commit(entries:readonly RecordEntry[]):Promise<void>{return this.update(current=>[...current,...entries]);}
 ack(identity:string,id:string):Promise<void>{return this.update(current=>current.filter(e=>e.identity!==identity||e.delta.id!==id));}
}
