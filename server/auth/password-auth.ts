export interface PasswordSession { accessToken: string; refreshToken: string; expiresIn: number }
export type SignupResult = { confirmationRequired: true } | { confirmationRequired: false; session: PasswordSession };

function credentials(raw: unknown): { email: string; password: string } {
  if (!raw || typeof raw !== 'object') throw new Error('Inserisci email e password.');
  const data = raw as Record<string, unknown>;
  if (typeof data.email !== 'string' || data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())
    || typeof data.password !== 'string' || !data.password || data.password.length > 4096) throw new Error('Inserisci email e password valide.');
  return { email: data.email.trim(), password: data.password };
}

function passwordSession(raw: unknown): PasswordSession {
  if (!raw || typeof raw !== 'object') throw new Error('Risposta di accesso non valida.');
  const data = raw as Record<string, unknown>;
  if (typeof data.access_token !== 'string' || !data.access_token || typeof data.refresh_token !== 'string' || !data.refresh_token
    || typeof data.expires_in !== 'number' || !Number.isFinite(data.expires_in) || data.expires_in < 1) throw new Error('Risposta di accesso non valida.');
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in };
}

/** Proxy del provider: password e refresh token non vengono salvati nei profili o nei log. */
export class SupabasePasswordAuth {
  private readonly base: string;
  private readonly key: string;
  private readonly emailRedirect: string;
  constructor(env: NodeJS.ProcessEnv = process.env, private readonly request: typeof fetch = fetch) {
    if (!env.SUPABASE_URL || !(env.SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY)) throw new Error('Configurare Supabase Auth sul server.');
    const url = new URL(env.SUPABASE_URL);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname))) throw new Error('Supabase Auth richiede HTTPS.');
    this.base = url.origin; this.key = (env.SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY)!;
    this.emailRedirect = env.AUTH_EMAIL_REDIRECT_URL ?? '';
    if (this.emailRedirect) {
      const redirect = new URL(this.emailRedirect);
      if (redirect.protocol !== 'https:' && !(redirect.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(redirect.hostname))) throw new Error('Il ritorno dalla conferma email richiede HTTPS.');
    }
  }
  async login(raw: unknown): Promise<PasswordSession> {
    return this.exchange('password', credentials(raw));
  }
  async signup(raw: unknown): Promise<SignupResult> {
    const data = credentials(raw);
    if (data.password.length < 6) throw new Error('La password deve contenere almeno 6 caratteri.');
    const endpoint = new URL(`${this.base}/auth/v1/signup`);
    if (this.emailRedirect) endpoint.searchParams.set('redirect_to', this.emailRedirect);
    let response: Response;
    try {
      response = await this.request(endpoint.href, { method: 'POST', headers: { apikey: this.key, 'Content-Type': 'application/json' },
        body: JSON.stringify(data), redirect: 'error', signal: AbortSignal.timeout(10_000) });
    } catch { throw new Error('Servizio di registrazione non raggiungibile. Riprova fra poco.'); }
    let body: unknown;
    try { body = await response.json(); } catch { throw new Error('Risposta di registrazione non valida.'); }
    const result = body && typeof body === 'object' ? body as Record<string, unknown> : null;
    if (response.status === 429) throw new Error('Troppi tentativi o email inviate. Attendi e riprova.');
    if (!response.ok) {
      if (result?.code === 'weak_password') throw new Error('La password non soddisfa i requisiti di sicurezza. Scegline una più robusta.');
      if (result?.code === 'signup_disabled') throw new Error('La registrazione è temporaneamente disabilitata.');
      throw new Error('Registrazione non riuscita. Verifica email e password; se hai già un account, usa Accedi.');
    }
    if (!result) throw new Error('Risposta di registrazione non valida.');
    if ('access_token' in result) return { confirmationRequired: false, session: passwordSession(result) };
    // Con conferma attiva Supabase può restituire lo stesso esito anche per un account esistente.
    if (typeof result.id !== 'string' || !result.id) throw new Error('Risposta di registrazione non valida.');
    return { confirmationRequired: true };
  }
  async refresh(raw: unknown): Promise<PasswordSession> {
    if (!raw || typeof raw !== 'object' || !('refreshToken' in raw) || typeof raw.refreshToken !== 'string' || !raw.refreshToken || raw.refreshToken.length > 8192) throw new Error('Accedi di nuovo al tuo account.');
    return this.exchange('refresh_token',{refresh_token:raw.refreshToken});
  }
  async logout(raw:unknown):Promise<void>{
    if(!raw||typeof raw!=='object'||!('accessToken'in raw)||typeof raw.accessToken!=='string'||!raw.accessToken||raw.accessToken.length>16000)throw new Error('Sessione non valida.');
    const response=await this.request(`${this.base}/auth/v1/logout?scope=local`,{method:'POST',headers:{apikey:this.key,Authorization:`Bearer ${raw.accessToken}`},redirect:'error',signal:AbortSignal.timeout(10_000)});
    if(!response.ok&&response.status!==401&&response.status!==403)throw new Error('Uscita dal servizio non riuscita.');
  }
  private async exchange(grant: string, body: Record<string,string>): Promise<PasswordSession> {
    let response: Response;
    try {
      response = await this.request(`${this.base}/auth/v1/token?grant_type=${grant}`,{method:'POST',headers:{apikey:this.key,'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(10_000)});
    } catch { throw new Error('Servizio di accesso non raggiungibile. Riprova fra poco.'); }
    if (response.status === 429) throw new Error('Troppi tentativi di accesso. Attendi e riprova.');
    if (!response.ok) throw new Error(grant === 'password' ? 'Email o password non corrette, oppure email da confermare.' : 'Sessione scaduta. Accedi di nuovo.');
    let raw:unknown;try{raw=await response.json();}catch{throw new Error('Risposta di accesso non valida.');}
    return passwordSession(raw);
  }
}
