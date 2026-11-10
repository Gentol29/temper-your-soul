import type { IncomingMessage, ServerResponse } from 'node:http';
import type { SupabasePasswordAuth } from './password-auth';

// Consente l'accesso contemporaneo alle presenze dell'HUB anche da una rete condivisa.
export const AUTH_HTTP_LIMITS = { requests:64,windowMs:60_000,bodyBytes:8192,addresses:2048 } as const;
export class PasswordAuthHttp {
  private readonly attempts = new Map<string,{at:number;count:number}>();
  constructor(private readonly auth: Pick<SupabasePasswordAuth,'login'|'signup'|'refresh'|'logout'>,private readonly allowedOrigins:readonly string[]=[]) {}
  async handle(req: IncomingMessage,res: ServerResponse): Promise<boolean> {
    if (req.url !== '/auth/login' && req.url !== '/auth/signup' && req.url !== '/auth/refresh' && req.url !== '/auth/logout') return false;
    const reply=(status:number,body:unknown)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
    if (req.method !== 'POST') {reply(405,{message:'Metodo non consentito.'});return true;}
    const origin=req.headers.origin,host=req.headers.host;
    if (origin && !this.allowedOrigins.includes(origin) && origin!==`http://${host}` && origin!==`https://${host}`) {reply(403,{message:'Origine non consentita.'});return true;}
    if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) {reply(415,{message:'Richiesta di accesso non valida.'});return true;}
    const address=req.socket.remoteAddress??'unknown',now=Date.now();
    let budget=this.attempts.get(address);
    if (!budget || now-budget.at>=AUTH_HTTP_LIMITS.windowMs) {budget={at:now,count:0};this.attempts.delete(address);this.attempts.set(address,budget);}
    if (this.attempts.size>AUTH_HTTP_LIMITS.addresses)this.attempts.delete(this.attempts.keys().next().value!);
    if (++budget.count>AUTH_HTTP_LIMITS.requests) {reply(429,{message:'Troppi tentativi. Attendi un minuto.'});return true;}
    try {
      let size=0;const chunks:Buffer[]=[];
      for await (const chunk of req) {const bytes=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);size+=bytes.length;if(size>AUTH_HTTP_LIMITS.bodyBytes)throw new Error('Richiesta troppo grande.');chunks.push(bytes);}
      let data:unknown;try{data=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new Error('Richiesta di accesso non valida.');}
      if(req.url==='/auth/logout'){await this.auth.logout(data);reply(200,{ok:true});return true;}
      if(req.url==='/auth/signup'){reply(200,await this.auth.signup(data));return true;}
      const session=req.url==='/auth/login'?await this.auth.login(data):await this.auth.refresh(data);
      reply(200,session);
    } catch(error) {reply(400,{message:error instanceof Error?error.message:'Accesso non riuscito.'});}
    return true;
  }
}
