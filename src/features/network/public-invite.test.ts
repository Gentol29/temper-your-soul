import {it,expect} from 'vitest';
import {cloudflareOrigin,publicInviteBase} from './public-invite';
it('gli inviti non usano mai indirizzi locali o una porta locale',()=>{
 for(const value of ['http://localhost:4173','https://localhost:4173','https://127.0.0.1:5176','https://192.168.1.2','file:///game','https://pc.local'])expect(publicInviteBase(value)).toBe('');
 expect(cloudflareOrigin('https://my-test.trycloudflare.com/?party=old')).toBe('https://my-test.trycloudflare.com');
 expect(cloudflareOrigin('https://trycloudflare.com.evil.example')).toBe('');
});
