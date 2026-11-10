export interface AccountIdentity { id: string }
export interface AccountAuth { verify(token: unknown): Promise<AccountIdentity> }

/** Il provider verifica il token; non ci fidiamo di un accountId o di un JWT solo decodificato. */
export class ProviderAuth implements AccountAuth {
  private readonly endpoint: URL;
  constructor(private readonly env: NodeJS.ProcessEnv = process.env, private readonly request: typeof fetch = fetch) {
    const endpoint = env.AUTH_USERINFO_URL ?? (env.SUPABASE_URL ? `${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user` : '');
    if (!endpoint) throw new Error('Configurare AUTH_USERINFO_URL oppure SUPABASE_URL.');
    this.endpoint = new URL(endpoint);
    if (this.endpoint.protocol !== 'https:' && !(this.endpoint.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(this.endpoint.hostname))) {
      throw new Error('Il provider deve usare HTTPS.');
    }
  }
  async verify(token: unknown): Promise<AccountIdentity> {
    if (typeof token !== 'string' || !token || token.length > 16_000 || /[\r\n]/.test(token)) throw new Error('Accedi con il tuo account.');
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    const key = this.env.SUPABASE_PUBLISHABLE_KEY ?? this.env.SUPABASE_ANON_KEY;
    if (key) headers.apikey = key;
    const response = await this.request(this.endpoint, { headers, redirect: 'error', signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('Sessione scaduta o non valida. Accedi di nuovo.');
    const user: unknown = await response.json();
    if (!user || typeof user !== 'object') throw new Error('Identità account non valida.');
    const data = user as Record<string, unknown>, id = data.sub ?? data.id;
    if (typeof id !== 'string' || !/^[a-zA-Z0-9_|:@.\-]{1,160}$/.test(id)) throw new Error('Identità account non valida.');
    return { id };
  }
}
