import { expect, it, vi } from 'vitest';
import { ProviderAuth } from './account-auth';
it('verifica il bearer sul provider fidato e usa soltanto la sua identità', async () => {
  const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ sub: 'account-1' })));
  const auth = new ProviderAuth({ AUTH_USERINFO_URL: 'https://identity.example/userinfo' }, request);
  expect(await auth.verify('signed-token')).toEqual({ id: 'account-1' });
  expect(request.mock.calls[0]![1]?.headers).toEqual({ Authorization: 'Bearer signed-token' });
});
it('rifiuta credenziali assenti, provider senza HTTPS e risposte non autenticate', async () => {
  expect(() => new ProviderAuth({})).toThrow('Configurare');
  expect(() => new ProviderAuth({ AUTH_USERINFO_URL: 'http://identity.example/userinfo' })).toThrow('HTTPS');
  const request = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 401 }));
  const auth = new ProviderAuth({ AUTH_USERINFO_URL: 'https://identity.example/userinfo' }, request);
  await expect(auth.verify('')).rejects.toThrow(); expect(request).not.toHaveBeenCalled(); await expect(auth.verify('invalid')).rejects.toThrow('Sessione');
});
it('supporta la verifica Supabase senza includere chiavi nel browser', async () => {
  const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ id: 'account-1' })));
  const auth = new ProviderAuth({ SUPABASE_URL: 'https://project.supabase.co', SUPABASE_ANON_KEY: 'public-key' }, request);
  await auth.verify('token'); expect(String(request.mock.calls[0]![0])).toBe('https://project.supabase.co/auth/v1/user');
  expect(request.mock.calls[0]![1]?.headers).toEqual({ Authorization: 'Bearer token', apikey: 'public-key' });
});
it('preferisce la chiave pubblicabile moderna mantenendo la compatibilità anon',async()=>{
 const request=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({id:'account-1'})));
 await new ProviderAuth({SUPABASE_URL:'https://project.supabase.co',SUPABASE_PUBLISHABLE_KEY:'publishable-key',SUPABASE_ANON_KEY:'legacy-key'},request).verify('token');
 expect(request.mock.calls[0]![1]?.headers).toEqual({Authorization:'Bearer token',apikey:'publishable-key'});
});
