import { describe, expect, it } from 'vitest';
import { Vec2 } from '../../core/vec2';
import { MOB_REWARDS } from '../run/mob-rewards';
import { goldCoinFrame } from './gold-flight';
describe('oro dal corpo al giocatore', () => {
  it('inizia invisibile, esce dal corpo senza seguire il destinatario prima di mezzo secondo', () => {
    const origin = new Vec2(100,100), target = new Vec2(800,500);
    expect(goldCoinFrame(origin,target,0,0).alpha).toBe(0);
    const a=goldCoinFrame(origin,target,.25,0), b=goldCoinFrame(origin,new Vec2(10,900),.25,0);
    expect(a.alpha).toBeGreaterThan(0);expect(a.y).toBeLessThan(origin.y);expect(a).toEqual(b);
    expect(Math.abs(a.x-origin.x)).toBeLessThan(24);
  });
  it('dopo la pausa il volo converge al giocatore mobile e sparisce all’assorbimento', () => {
    const origin=new Vec2(100,100),target=new Vec2(600,400),end=MOB_REWARDS.emergeSeconds+MOB_REWARDS.flightSeconds;
    const first=goldCoinFrame(origin,target,.5,2),last=goldCoinFrame(origin,target,end,2);
    expect(first.x).toBeLessThan(130);expect(last.x).toBe(target.x);expect(last.y).toBe(target.y-16);expect(last.alpha).toBe(0);
    const moving=goldCoinFrame(origin,new Vec2(750,500),end,2);expect(moving.x).toBe(750);expect(moving.y).toBe(484);
  });
});
