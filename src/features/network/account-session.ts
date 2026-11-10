/** Il provider esistente consegna l'access token via callback o evento. Mai accettare un accountId come login. */
let token = '';
let refreshToken = '';
let refreshTimer: number | undefined;
let expiresAt = 0;
export function accountToken(): string { return token; }
export function setAccountToken(value: string): void {
  token = value;
  window.dispatchEvent(new Event('temper-your-soul:session-changed'));
}
interface PasswordSession { accessToken:string;refreshToken:string;expiresIn:number }
async function requestAccount(path:string,body:unknown):Promise<unknown>{
  const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15_000)});
  const raw:unknown=await response.json();
  if(!response.ok){const message=raw&&typeof raw==='object'&&'message'in raw&&typeof raw.message==='string'?raw.message:'Accesso non riuscito.';throw new Error(message);}
  return raw;
}
function parseSession(raw:unknown):PasswordSession{
  if(!raw||typeof raw!=='object')throw new Error('Sessione non valida.');
  const data=raw as Record<string,unknown>;
  if(typeof data.accessToken!=='string'||!data.accessToken||typeof data.refreshToken!=='string'||!data.refreshToken||typeof data.expiresIn!=='number'||!Number.isFinite(data.expiresIn)||data.expiresIn<=0)throw new Error('Sessione non valida.');
  return{accessToken:data.accessToken,refreshToken:data.refreshToken,expiresIn:data.expiresIn};
}
async function requestSession(path:string,body:unknown):Promise<PasswordSession>{return parseSession(await requestAccount(path,body));}
function acceptSession(session:PasswordSession,notify:boolean):void{
  window.clearTimeout(refreshTimer);refreshToken=session.refreshToken;token=session.accessToken;
  expiresAt=Date.now()+Math.min(session.expiresIn,86400)*1000;
  refreshTimer=window.setTimeout(()=>{void renewSession();},Math.max(1000,(Math.min(session.expiresIn,86400)-60)*1000));
  if(notify)window.dispatchEvent(new Event('temper-your-soul:session-changed'));
}
async function renewSession():Promise<void>{
  const expected=refreshToken;if(!expected)return;
  try{const session=await requestSession('/auth/refresh',{refreshToken:expected});if(refreshToken===expected)acceptSession(session,false);}
  catch{if(refreshToken!==expected)return;if(Date.now()<expiresAt-5000)refreshTimer=window.setTimeout(()=>{void renewSession();},5000);else logoutAccount();}
}
export async function loginWithPassword(email:string,password:string):Promise<void>{
  acceptSession(await requestSession('/auth/login',{email,password}),true);
}
/** La registrazione non autenticata non apre il WebSocket né crea il profilo di gioco. */
export async function signupWithPassword(email:string,password:string):Promise<{confirmationRequired:boolean}>{
  const raw=await requestAccount('/auth/signup',{email,password});
  if(!raw||typeof raw!=='object'||!('confirmationRequired'in raw))throw new Error('Risposta di registrazione non valida.');
  if(raw.confirmationRequired===true)return{confirmationRequired:true};
  if(raw.confirmationRequired!==false||!('session'in raw))throw new Error('Risposta di registrazione non valida.');
  acceptSession(parseSession(raw.session),true);return{confirmationRequired:false};
}
export async function logoutAccount():Promise<void>{
  const accessToken=token;window.clearTimeout(refreshTimer);refreshToken='';setAccountToken('');
  if(accessToken)await fetch('/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken}),signal:AbortSignal.timeout(10_000)}).catch(()=>undefined);
}
export function initializeAccountSession(): void {
  const fragment = new URLSearchParams(location.hash.slice(1)), accessToken = fragment.get('access_token');
  if (accessToken) {
    const refresh=fragment.get('refresh_token'),expires=Number(fragment.get('expires_in'));
    if(refresh&&Number.isFinite(expires)&&expires>0)acceptSession({accessToken,refreshToken:refresh,expiresIn:expires},false);
    else token=accessToken;
    history.replaceState(null, '', location.pathname + location.search);
  }
  window.addEventListener('temper-your-soul:login', event => {
    const detail: unknown = (event as CustomEvent<unknown>).detail;
    if (detail && typeof detail === 'object' && 'accessToken' in detail && typeof detail.accessToken === 'string') setAccountToken(detail.accessToken);
  });
}
export async function beginAccountLogin(): Promise<void> {
  const response = await fetch('/online-config');
  if (!response.ok) throw new Error('Server online non raggiungibile.');
  const config: unknown = await response.json();
  if (!config || typeof config !== 'object' || !('loginUrl' in config) || typeof config.loginUrl !== 'string' || !config.loginUrl) throw new Error('Accesso account non ancora configurato sul server.');
  const url = new URL(config.loginUrl, location.href);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('Indirizzo di accesso non valido.');
  location.assign(url.href);
}
