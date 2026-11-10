import {expect,it,vi} from 'vitest';
import {SupabasePasswordAuth} from './password-auth';
const env={SUPABASE_URL:'https://project.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public-key'};
const session={access_token:'access-token',refresh_token:'refresh-token',expires_in:3600};
it('l’accesso password usa solo l’endpoint del progetto e restituisce una sessione controllata',async()=>{
 const request=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(session)));
 const auth=new SupabasePasswordAuth(env,request);
 expect(await auth.login({email:' player@example.com ',password:'password di prova'})).toEqual({accessToken:'access-token',refreshToken:'refresh-token',expiresIn:3600});
 expect(request.mock.calls[0]![0]).toBe('https://project.supabase.co/auth/v1/token?grant_type=password');
 expect(JSON.parse(request.mock.calls[0]![1]!.body as string)).toEqual({email:'player@example.com',password:'password di prova'});
});
it('input invalidi non producono richieste al provider',async()=>{
 const request=vi.fn<typeof fetch>(),auth=new SupabasePasswordAuth(env,request);
 for(const data of [null,{}, {email:'no',password:'abc'}, {email:'x@y.example',password:''}])await expect(auth.login(data)).rejects.toThrow();
 expect(request).not.toHaveBeenCalled();
});
it('errori provider non espongono password, risposte interne o token',async()=>{
 const request=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({message:'internal-sensitive-value'}),{status:400}));
 await expect(new SupabasePasswordAuth(env,request).login({email:'x@y.example',password:'abc'})).rejects.toThrow('Email o password non corrette');
});
it('il refresh usa il grant corretto e la sessione ruotata',async()=>{
 const request=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(session))),auth=new SupabasePasswordAuth(env,request);
 await auth.refresh({refreshToken:'previous'});expect(request.mock.calls[0]![0]).toContain('grant_type=refresh_token');
 expect(JSON.parse(request.mock.calls[0]![1]!.body as string)).toEqual({refresh_token:'previous'});
});
it('l’uscita revoca la sola sessione corrente',async()=>{
 const request=vi.fn<typeof fetch>().mockResolvedValue(new Response(null,{status:204}));
 await new SupabasePasswordAuth(env,request).logout({accessToken:'current'});
 expect(request.mock.calls[0]![0]).toBe('https://project.supabase.co/auth/v1/logout?scope=local');
 expect(request.mock.calls[0]![1]!.headers).toMatchObject({Authorization:'Bearer current'});
});
it('rifiuta sessioni incomplete e configura solo connessioni HTTPS fidate',async()=>{
 expect(()=>new SupabasePasswordAuth({...env,SUPABASE_URL:'http://external.example'})).toThrow('HTTPS');
 const request=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({access_token:'partial'})));
 await expect(new SupabasePasswordAuth(env,request).login({email:'x@y.example',password:'abc'})).rejects.toThrow('Risposta');
});
it('registra sul provider e richiede la conferma senza divulgare dati dell’utente',async()=>{
 const request=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({id:'new-user',email:'player@example.com',identities:[]})));
 expect(await new SupabasePasswordAuth(env,request).signup({email:' player@example.com ',password:'secure-test'})).toEqual({confirmationRequired:true});
 expect(request.mock.calls[0]![0]).toBe('https://project.supabase.co/auth/v1/signup');
 expect(JSON.parse(request.mock.calls[0]![1]!.body as string)).toEqual({email:'player@example.com',password:'secure-test'});
});
it('accetta la sessione immediata solo quando il provider la restituisce completa',async()=>{
 const request=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({...session,user:{id:'new-user'}})));
 expect(await new SupabasePasswordAuth(env,request).signup({email:'a@example.com',password:'secure-test'})).toEqual({confirmationRequired:false,session:{accessToken:'access-token',refreshToken:'refresh-token',expiresIn:3600}});
 request.mockResolvedValueOnce(new Response(JSON.stringify({id:'new-user',access_token:'partial'})));
 await expect(new SupabasePasswordAuth(env,request).signup({email:'a@example.com',password:'secure-test'})).rejects.toThrow('Risposta');
});
it('rifiuta password troppo corte e dati invalidi prima di inviare email',async()=>{
 const request=vi.fn<typeof fetch>(),auth=new SupabasePasswordAuth(env,request);
 for(const data of [null,{}, {email:'a@example.com',password:'short'}, {email:'invalid',password:'secure-test'}])await expect(auth.signup(data)).rejects.toThrow();
 expect(request).not.toHaveBeenCalled();
});
it('gestisce limiti, password deboli e registrazione disabilitata senza esporre errori interni',async()=>{
 const request=vi.fn<typeof fetch>(),auth=new SupabasePasswordAuth(env,request),input={email:'a@example.com',password:'secure-test'};
 request.mockResolvedValueOnce(new Response(JSON.stringify({secret:'internal'}),{status:429}));
 await expect(auth.signup(input)).rejects.toThrow('Troppi tentativi');
 request.mockResolvedValueOnce(new Response(JSON.stringify({code:'weak_password',message:'internal'}),{status:422}));
 await expect(auth.signup(input)).rejects.toThrow('più robusta');
 request.mockResolvedValueOnce(new Response(JSON.stringify({code:'signup_disabled'}),{status:422}));
 await expect(auth.signup(input)).rejects.toThrow('disabilitata');
 request.mockResolvedValueOnce(new Response(JSON.stringify({message:'internal-sensitive-value'}),{status:500}));
 await expect(auth.signup(input)).rejects.toThrow('Registrazione non riuscita');
});
it('il ritorno email viene deciso dalla configurazione server e non dal browser',async()=>{
 const request=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({id:'new-user'})));
 const auth=new SupabasePasswordAuth({...env,AUTH_EMAIL_REDIRECT_URL:'http://localhost:4173/'},request);
 await auth.signup({email:'a@example.com',password:'secure-test',redirectTo:'https://untrusted.example'});
 expect(new URL(String(request.mock.calls[0]![0])).searchParams.get('redirect_to')).toBe('http://localhost:4173/');
 expect(()=>new SupabasePasswordAuth({...env,AUTH_EMAIL_REDIRECT_URL:'javascript:alert(1)'})).toThrow('HTTPS');
});
