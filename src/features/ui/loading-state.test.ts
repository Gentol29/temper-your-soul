import {expect,it,vi} from 'vitest';
import {LoadingState} from './loading-state';

it('gestisce completamenti fuori ordine senza nascondere operazioni ancora attive',()=>{
 const changed=vi.fn(),state=new LoadingState(changed),first=state.begin('Accesso'),second=state.begin('Profilo');
 expect(state.label).toBe('Profilo');first();expect(state.active).toBe(true);expect(state.label).toBe('Profilo');
 second();expect(state.active).toBe(false);expect(state.label).toBe('');first();second();expect(changed).toHaveBeenCalledTimes(4);
});
it('dopo un completamento torna all’operazione precedente ancora in attesa',()=>{
 const state=new LoadingState(),first=state.begin('Accesso'),second=state.begin('Profilo');second();expect(state.label).toBe('Accesso');first();expect(state.active).toBe(false);
});
it('run chiude il caricamento sia dopo un risultato sia dopo un errore',async()=>{
 const state=new LoadingState();let complete!:(value:number)=>void;
 const result=state.run('Salvataggio',()=>new Promise<number>(resolve=>{complete=resolve;}));
 expect(state.active).toBe(true);complete(42);expect(await result).toBe(42);expect(state.active).toBe(false);
 await expect(state.run('Accesso',async()=>{throw new Error('Provider non raggiungibile');})).rejects.toThrow('Provider');expect(state.active).toBe(false);
});
