import {createWorldServer} from './world-server';
import {createDatabase} from './storage/db';
import {createProfileStore} from './storage/profile-store';
import {ProviderAuth} from './auth/account-auth';
import {WorldService} from './world-service';
import {SupabasePasswordAuth} from './auth/password-auth';
import {PasswordAuthHttp} from './auth/password-http';

const pool=createDatabase();
const allowedOrigins=(process.env.ALLOWED_ORIGINS??'').split(',').filter(Boolean);
const runtime=createWorldServer({service:new WorldService(createProfileStore(pool),new ProviderAuth()),
 loginUrl:process.env.AUTH_LOGIN_URL,allowedOrigins,
 passwordAuth:process.env.AUTH_MODE==='supabase-password'?new PasswordAuthHttp(new SupabasePasswordAuth(),allowedOrigins):undefined});
const port=Number(process.env.PORT??4173);
runtime.server.listen(port,'0.0.0.0',()=>console.log(`Temper your soul · mondo HUB su porta ${port}`));
let closing=false;
async function shutdown():Promise<void>{if(closing)return;closing=true;try{await runtime.close();}finally{await pool.end();}}
process.on('SIGTERM',()=>{void shutdown();});process.on('SIGINT',()=>{void shutdown();});
