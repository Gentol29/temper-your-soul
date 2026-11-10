import {createServer} from 'node:http';
import {once} from 'node:events';
import {afterEach,expect,it,vi} from 'vitest';
import {AUTH_HTTP_LIMITS,PasswordAuthHttp} from './password-http';

const cleanup:(()=>Promise<void>)[]=[];
afterEach(async()=>{for(const close of cleanup.splice(0))await close();});
async function runtime(){
 const session={accessToken:'access',refreshToken:'refresh',expiresIn:3600};
 const gateway={login:vi.fn().mockResolvedValue(session),signup:vi.fn().mockResolvedValue({confirmationRequired:true}),refresh:vi.fn().mockResolvedValue(session),logout:vi.fn().mockResolvedValue(undefined)};
 const endpoint=new PasswordAuthHttp(gateway,['http://game.example']);
 const server=createServer((req,res)=>{void endpoint.handle(req,res).then(handled=>{if(!handled){res.writeHead(404);res.end();}});});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 cleanup.push(()=>new Promise<void>(done=>{server.closeAllConnections();server.close(()=>done());}));
 const address=server.address();if(!address||typeof address==='string')throw new Error('address');
 const url=`http://127.0.0.1:${address.port}`;
 const post=(path:string,body:unknown,origin='http://game.example')=>fetch(url+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)});
 return{url,post,gateway,session};
}
it('login, rinnovo e uscita passano dal gateway e vietano la cache delle sessioni',async()=>{
 const {post,gateway,session}=await runtime();
 const login=await post('/auth/login',{email:'a@example.com',password:'test'});
 expect(await login.json()).toEqual(session);expect(login.headers.get('cache-control')).toBe('no-store');
 expect(gateway.login).toHaveBeenCalledWith({email:'a@example.com',password:'test'});
 await post('/auth/refresh',{refreshToken:'previous'});expect(gateway.refresh).toHaveBeenCalledWith({refreshToken:'previous'});
 expect(await(await post('/auth/logout',{accessToken:'access'})).json()).toEqual({ok:true});
});
it('origini esterne, metodi e tipi non ammessi non raggiungono il provider',async()=>{
 const {url,post,gateway}=await runtime();
 expect((await post('/auth/login',{},'https://untrusted.example')).status).toBe(403);
 expect((await fetch(url+'/auth/login')).status).toBe(405);
 expect((await fetch(url+'/auth/login',{method:'POST',body:'plain'})).status).toBe(415);
 expect(gateway.login).not.toHaveBeenCalled();
});
it('JSON malformato non raggiunge il provider',async()=>{
 const {url,gateway}=await runtime();
 const response=await fetch(url+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{broken'});
 expect(response.status).toBe(400);expect(gateway.login).not.toHaveBeenCalled();
});
it('limita i tentativi ripetuti prima di interrogare il provider',async()=>{
 const {post,gateway}=await runtime();
 for(let i=0;i<AUTH_HTTP_LIMITS.requests;i++)expect((await post('/auth/login',{})).status).toBe(200);
 expect((await post('/auth/login',{})).status).toBe(429);
 expect(gateway.login).toHaveBeenCalledTimes(AUTH_HTTP_LIMITS.requests);
});
it('la registrazione ha gli stessi controlli di origine e non autentica chi deve confermare l’email',async()=>{
 const {post,gateway}=await runtime();
 expect((await post('/auth/signup',{},'https://untrusted.example')).status).toBe(403);
 expect(gateway.signup).not.toHaveBeenCalled();
 const response=await post('/auth/signup',{email:'a@example.com',password:'secure-test'});
 expect(response.headers.get('cache-control')).toBe('no-store');
 expect(await response.json()).toEqual({confirmationRequired:true});
 expect(gateway.signup).toHaveBeenCalledWith({email:'a@example.com',password:'secure-test'});
 expect(gateway.login).not.toHaveBeenCalled();
});
