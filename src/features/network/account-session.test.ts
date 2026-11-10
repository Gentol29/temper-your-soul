import {afterEach,expect,it,vi} from 'vitest';
import {accountToken,initializeAccountSession,setAccountToken,loginWithPassword,signupWithPassword,logoutAccount} from './account-session';
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it('riceve la sessione del provider in memoria, rimuove il token dall’URL e notifica i rinnovi',()=>{
 const events=new EventTarget(),replaceState=vi.fn(),changed=vi.fn();
 vi.stubGlobal('window',events);vi.stubGlobal('location',{hash:'#access_token=verified-token',pathname:'/',search:'?view=game'});vi.stubGlobal('history',{replaceState});
 events.addEventListener('temper-your-soul:session-changed',changed);initializeAccountSession();
 expect(accountToken()).toBe('verified-token');expect(replaceState).toHaveBeenCalledWith(null,'','/?view=game');
 setAccountToken('renewed-token');expect(accountToken()).toBe('renewed-token');expect(changed).toHaveBeenCalledOnce();
});
it('rinnova in memoria la sessione senza riconnettere il dungeon e revoca il token aggiornato all’uscita',async()=>{
 vi.useFakeTimers();const events=new EventTarget(),changed=vi.fn();
 Object.assign(events,{setTimeout,clearTimeout});vi.stubGlobal('window',events);
 events.addEventListener('temper-your-soul:session-changed',changed);
 const request=vi.fn<typeof fetch>()
  .mockResolvedValueOnce(new Response(JSON.stringify({accessToken:'first',refreshToken:'refresh-1',expiresIn:120})))
  .mockResolvedValueOnce(new Response(JSON.stringify({accessToken:'renewed',refreshToken:'refresh-2',expiresIn:120})))
  .mockResolvedValueOnce(new Response('{}'));
 vi.stubGlobal('fetch',request);
 await loginWithPassword('player@example.com','password');expect(accountToken()).toBe('first');expect(changed).toHaveBeenCalledTimes(1);
 await vi.advanceTimersByTimeAsync(60_000);expect(accountToken()).toBe('renewed');expect(changed).toHaveBeenCalledTimes(1);
 expect(request.mock.calls[1]![0]).toBe('/auth/refresh');
 expect(JSON.parse(request.mock.calls[1]![1]!.body as string)).toEqual({refreshToken:'refresh-1'});
 logoutAccount();expect(accountToken()).toBe('');expect(changed).toHaveBeenCalledTimes(2);
 expect(JSON.parse(request.mock.calls[2]![1]!.body as string)).toEqual({accessToken:'renewed'});
 await vi.advanceTimersByTimeAsync(120_000);expect(request).toHaveBeenCalledTimes(3);
});
it('un accesso rifiutato non sostituisce una sessione esistente',async()=>{
 vi.stubGlobal('window',new EventTarget());setAccountToken('previous');
 vi.stubGlobal('fetch',vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({message:'Credenziali non valide.'}),{status:400})));
 await expect(loginWithPassword('player@example.com','bad')).rejects.toThrow('Credenziali non valide');
 expect(accountToken()).toBe('previous');setAccountToken('');
});
it('attende la conferma email senza notificare un login né impostare token',async()=>{
 const events=new EventTarget(),changed=vi.fn();vi.stubGlobal('window',events);setAccountToken('');
 events.addEventListener('temper-your-soul:session-changed',changed);
 const request=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({confirmationRequired:true})));
 vi.stubGlobal('fetch',request);
 expect(await signupWithPassword('a@example.com','secure-test')).toEqual({confirmationRequired:true});
 expect(accountToken()).toBe('');expect(changed).not.toHaveBeenCalled();
 expect(request.mock.calls[0]![0]).toBe('/auth/signup');
});
it('la registrazione con sessione completa notifica l’accesso come un login normale',async()=>{
 vi.useFakeTimers();const events=new EventTarget(),changed=vi.fn();Object.assign(events,{setTimeout,clearTimeout});vi.stubGlobal('window',events);
 events.addEventListener('temper-your-soul:session-changed',changed);
 const request=vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify({confirmationRequired:false,session:{accessToken:'registered',refreshToken:'refresh',expiresIn:3600}}))).mockResolvedValue(new Response('{}'));
 vi.stubGlobal('fetch',request);
 expect(await signupWithPassword('a@example.com','secure-test')).toEqual({confirmationRequired:false});
 expect(accountToken()).toBe('registered');expect(changed).toHaveBeenCalledOnce();logoutAccount();
});
it('il ritorno dalla conferma email conserva il rinnovo in memoria e ripulisce l’URL',async()=>{
 vi.useFakeTimers();const events=new EventTarget(),replaceState=vi.fn();Object.assign(events,{setTimeout,clearTimeout});vi.stubGlobal('window',events);
 vi.stubGlobal('location',{hash:'#access_token=confirmed&refresh_token=refresh&expires_in=120&type=signup',pathname:'/',search:''});vi.stubGlobal('history',{replaceState});
 const request=vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify({accessToken:'renewed',refreshToken:'rotated',expiresIn:120}))).mockResolvedValue(new Response('{}'));vi.stubGlobal('fetch',request);
 initializeAccountSession();expect(accountToken()).toBe('confirmed');expect(replaceState).toHaveBeenCalledWith(null,'','/');
 await vi.advanceTimersByTimeAsync(60_000);expect(accountToken()).toBe('renewed');logoutAccount();
});
