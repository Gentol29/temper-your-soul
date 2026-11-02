import { describe, expect, it } from 'vitest';
import { Vec2 } from '../../core/vec2';
import { isOutsideProjectileBounds } from '../arena/arena';
import { CRYPT, CRYPT_ARENA } from '../dungeons/crypt';
import type { DungeonDefinition } from '../dungeons/dungeon-definition';
import type { SkillDefinition } from '../skills/skill-definition';
import { GUARDIAN_STATS } from '../boss/guardian';
import { DangerZone } from '../combat/danger-zone';
import { Projectile, type ProjectileSpec } from '../combat/projectile';
import {
  createMatch,
  createQuietMatch,
  eventsOfType,
  holding,
  intent,
  recordEvents,
  run,
  STEP,
} from '../../testing';

const ENEMY_SHOT: ProjectileSpec = { team: 'enemy', speed: 0, damage: 12, radius: 5, lifetime: 5, visual: 'ember_nova' };

describe('stato iniziale', () => {
  it('giocatore e boss partono dove previsto, con tutta la vita, a partita in corso', () => {
    const match = createMatch();
    expect(match.status).toBe('playing');
    expect(match.time).toBe(0);
    expect(match.player.position).toEqual(CRYPT_ARENA.playerSpawn);
    expect(match.boss!.position).toEqual(CRYPT_ARENA.bossSpawn);
    expect(match.player.health.current).toBe(100);
    expect(match.boss!.health.current).toBe(5400);
    expect(match.projectiles).toHaveLength(0);
    expect(match.zones).toHaveLength(0);
  });

  it('il tempo di partita avanza con i passi', () => {
    const match = createQuietMatch();
    run(match, 2);
    expect(match.time).toBeCloseTo(2, 6);
  });
});

describe('movimento e skill nella partita', () => {
  it('il movimento dell\'intenzione sposta il giocatore', () => {
    const match = createQuietMatch();
    match.step(STEP, intent(match, { move: new Vec2(1, 0) }));
    expect(match.player.position.x).toBeCloseTo(CRYPT_ARENA.playerSpawn.x + 177 * STEP, 6);
  });

  it('la mira segue il mouse mentre ci si muove: e\' sempre la posizione DOPO il movimento piu\' l\'offset', () => {
    const match = createQuietMatch();
    const aimOffset = new Vec2(120, -40);
    const before = match.player.position;
    match.step(STEP, { move: new Vec2(1, 0), aimOffset, skills: [false, false, false, false] });
    expect(match.player.position.x).toBeGreaterThan(before.x);
    expect(match.player.aim).toEqual(match.player.position.add(aimOffset));
  });

  it('dopo lo scatto il mirino si riallinea subito al mouse (nessun salto di un fotogramma)', () => {
    const match = createQuietMatch();
    const start = match.player.position;
    const aimOffset = new Vec2(200, 0);
    match.step(STEP, { move: Vec2.ZERO, aimOffset, skills: [false, false, false, true] });
    expect(match.player.position.distanceTo(start)).toBeCloseTo(125, 6);
    expect(match.player.aim).toEqual(match.player.position.add(aimOffset));
  });

  it('le skill nello stesso passo usano la mira dalla posizione corrente (dopo il movimento)', () => {
    const match = createQuietMatch();
    const events = recordEvents(match);
    // Mouse sotto il giocatore: il dardo parte verso il basso anche mentre il giocatore si muove di lato.
    match.step(STEP, { move: new Vec2(1, 0), aimOffset: new Vec2(0, 300), skills: [true, false, false, false] });
    expect(eventsOfType(events, 'skill_cast')[0]!.angle).toBeCloseTo(Math.PI / 2, 10);
  });

  it('tenere premuta la skill 1 spara a cadenza di 0,2 s', () => {
    const match = createQuietMatch();
    const events = recordEvents(match);
    run(match, 1, (m) => holding(m, [0]));
    // Un colpo al primo passo e poi uno ogni 0,2 s (12 o 13 passi): in 1 s tra 5 e 6 colpi.
    const casts = eventsOfType(events, 'skill_cast').length;
    expect(casts).toBeGreaterThanOrEqual(5);
    expect(casts).toBeLessThanOrEqual(6);
  });

  it('una pressione brevissima (latch) lancia comunque la skill nel passo successivo', () => {
    const match = createQuietMatch();
    const events = recordEvents(match);
    match.step(STEP, holding(match, [3]));
    expect(eventsOfType(events, 'skill_cast')).toHaveLength(1);
  });

  it('le skill non partono dopo la fine della partita', () => {
    const match = createQuietMatch();
    match.boss!.health.current = 1;
    match.projectiles.push(new Projectile(99, { ...ENEMY_SHOT, team: 'player', damage: 5 }, match.boss!.position, 0));
    match.step(STEP, intent(match));
    expect(match.status).toBe('won');
    const events = recordEvents(match);
    match.step(STEP, holding(match, [0, 1, 2, 3]));
    expect(events).toHaveLength(0);
  });
});

describe('proiettili del giocatore', () => {
  it('il dardo colpisce il boss e toglie 19; il proiettile scompare', () => {
    const match = createQuietMatch();
    match.boss!.position = match.player.position.add(new Vec2(150, 0));
    const events = recordEvents(match);
    const aim = match.boss!.position;
    for (let i = 0; i < 120 && eventsOfType(events, 'damage_dealt').length === 0; i++) {
      match.step(STEP, i === 0 ? holding(match, [0], { aim }) : intent(match, { aim }));
    }
    const hits = eventsOfType(events, 'damage_dealt');
    expect(hits[0]).toMatchObject({ target: 'boss', amount: 19 });
    expect(match.boss!.health.current).toBe(5400 - 19);
    expect(match.projectiles).toHaveLength(0);
    expect(eventsOfType(events, 'projectile_hit')).toHaveLength(1);
  });

  it('il globo di gelo toglie 100 e rallenta il boss per 2 s (che poi finiscono)', () => {
    const match = createQuietMatch();
    match.boss!.position = match.player.position.add(new Vec2(150, 0));
    const aim = match.boss!.position;
    for (let i = 0; i < 120 && match.boss!.health.current === 5400; i++) {
      match.step(STEP, i === 0 ? holding(match, [1], { aim }) : intent(match, { aim }));
    }
    expect(match.boss!.health.current).toBe(5300);
    expect(match.boss!.isSlowed).toBe(true);
    expect(match.boss!.slowFor).toBeGreaterThan(1.9);
    run(match, 2.1, (m) => intent(m, { aim }));
    expect(match.boss!.isSlowed).toBe(false);
  });

  it('il proiettile del giocatore ignora il giocatore e quello nemico ignora il boss', () => {
    const match = createQuietMatch();
    match.player.position = new Vec2(800, 800);
    match.boss!.position = new Vec2(1500, 1500);
    match.projectiles.push(new Projectile(1, { ...ENEMY_SHOT, team: 'player' }, new Vec2(800, 800), 0));
    match.projectiles.push(new Projectile(2, ENEMY_SHOT, new Vec2(1500, 1500), 0));
    match.step(STEP, intent(match));
    expect(match.player.health.current).toBe(100);
    expect(match.boss!.health.current).toBe(5400);
    expect(match.projectiles).toHaveLength(2);
  });

  it('un proiettile esce di scena oltre il bordo dell\'arena', () => {
    const match = createQuietMatch();
    match.projectiles.push(new Projectile(1, { ...ENEMY_SHOT, team: 'player', speed: 1000 }, new Vec2(40, 1000), Math.PI));
    run(match, 0.1);
    expect(match.projectiles.find((p) => p.id === 1)).toBeUndefined();
  });

  it('un proiettile scade dopo la sua durata', () => {
    const match = createQuietMatch();
    match.player.position = new Vec2(300, 300);
    match.projectiles.push(new Projectile(1, { ...ENEMY_SHOT, team: 'player', lifetime: 0.5 }, new Vec2(2000, 2000), 0));
    run(match, 0.6);
    expect(match.projectiles).toHaveLength(0);
  });

  it('il danno al boss riportato coincide con la perdita effettiva senza overkill', () => {
    const match = createQuietMatch();
    match.boss!.health.current = 10;
    const events = recordEvents(match);
    match.projectiles.push(new Projectile(1, { ...ENEMY_SHOT, team: 'player', damage: 19 }, match.boss!.position, 0));
    match.step(STEP, intent(match));
    expect(eventsOfType(events, 'damage_dealt')[0]).toMatchObject({ target: 'boss', amount: 10 });
    expect(match.boss!.health.current).toBe(0);
  });
});

describe('danni al giocatore', () => {
  it('due proiettili nello stesso passo applicano entrambi il danno',()=>{
    const match=createQuietMatch(),events=recordEvents(match);
    match.projectiles.push(new Projectile(100,ENEMY_SHOT,match.player.position,0),new Projectile(101,ENEMY_SHOT,match.player.position,0));
    match.step(STEP,intent(match));expect(match.player.health.current).toBe(76);
    expect(eventsOfType(events,'damage_dealt')).toHaveLength(2);expect(match.projectiles).toHaveLength(0);
  });

  it('un proiettile nemico toglie vita e scompare, senza protezione successiva', () => {
    const match = createQuietMatch();
    match.projectiles.push(new Projectile(1, ENEMY_SHOT, match.player.position, 0));
    const events = recordEvents(match);
    match.step(STEP, intent(match));
    expect(match.player.health.current).toBe(88);
    expect(match.player.isInvulnerable).toBe(false);
    expect(match.projectiles).toHaveLength(0);
    expect(eventsOfType(events, 'damage_dealt')).toEqual([
      expect.objectContaining({ target: 'player', amount: 12 }),
    ]);
  });

  it('da invulnerabile il proiettile viene comunque consumato ma non fa danno ne\' evento di danno', () => {
    const match = createQuietMatch();
    match.player.invulnerableFor = 1;
    match.projectiles.push(new Projectile(1, ENEMY_SHOT, match.player.position, 0));
    const events = recordEvents(match);
    match.step(STEP, intent(match));
    expect(match.player.health.current).toBe(100);
    expect(match.projectiles).toHaveLength(0);
    expect(eventsOfType(events, 'projectile_hit')).toHaveLength(1);
    expect(eventsOfType(events, 'damage_dealt')).toHaveLength(0);
  });

  it('il raggio di colpo del proiettile e\' raggio + 9 (limite escluso)', () => {
    const near = createQuietMatch();
    near.projectiles.push(new Projectile(1, ENEMY_SHOT, near.player.position.add(new Vec2(13.9, 0)), 0));
    near.step(STEP, intent(near));
    expect(near.player.health.current).toBe(88);

    const far = createQuietMatch();
    far.projectiles.push(new Projectile(1, ENEMY_SHOT, far.player.position.add(new Vec2(14.1, 0)), 0));
    far.step(STEP, intent(far));
    expect(far.player.health.current).toBe(100);
  });

  it('il contatto con il boss attende il recupero fra due colpi', () => {
    const match = createQuietMatch();
    match.boss!.position = match.player.position.add(new Vec2(20,0));
    match.step(STEP,intent(match));expect(match.player.health.current).toBe(100-GUARDIAN_STATS.contactDamage);
    match.step(STEP,intent(match));expect(match.player.health.current).toBe(100-GUARDIAN_STATS.contactDamage);
    expect(match.player.isInvulnerable).toBe(false);
  });});

describe('confini delle collisioni con il boss', () => {
  /** Giocatore sotto il boss a 100: il boss gli gira attorno in orizzontale e la distanza verticale non cambia. */
  const arranged = () => {
    const match = createQuietMatch();
    match.boss!.position = new Vec2(1600, 1100);
    match.player.position = new Vec2(1600, 1200);
    return match;
  };

  it('il contatto ferisce sotto 29 di distanza e non a 29,1', () => {
    for (const [distance, hurt] of [[28.9, true], [29.1, false]] as const) {
      const match = createQuietMatch();
      match.boss!.position = match.player.position.add(new Vec2(distance, 0));
      match.step(STEP, intent(match));
      expect(match.player.health.current, `distanza ${distance}`).toBe(hurt ? 82 : 100);
    }
  });

  it('un proiettile del giocatore colpisce il boss entro raggio + 26 (5 + 26 = 31), non oltre', () => {
    for (const [distance, hit] of [[30.8, true], [31.2, false]] as const) {
      const match = arranged();
      match.projectiles.push(new Projectile(1, { ...ENEMY_SHOT, team: 'player', damage: 19 }, match.boss!.position.add(new Vec2(0, -distance)), 0));
      match.step(STEP, intent(match));
      expect(match.boss!.health.current, `distanza ${distance}`).toBe(hit ? 5381 : 5400);
    }
  });

  it('la meteora del giocatore colpisce il boss entro raggio + 25 (66 + 25 = 91), non oltre', () => {
    for (const [distance, hit] of [[90.5, true], [91.5, false]] as const) {
      const match = arranged();
      match.zones.push(new DangerZone(1, { team: 'player', radius: 66, delay: 0.05, damage: 210 }, match.boss!.position.add(new Vec2(0, -distance))));
      run(match, 0.2);
      expect(match.boss!.health.current, `distanza ${distance}`).toBe(hit ? 5190 : 5400);
    }
  });

  it('colpire di nuovo con il gelo rinnova il rallentamento a 2 s, non lo somma', () => {
    const match = arranged();
    const frost: ProjectileSpec = { ...ENEMY_SHOT, team: 'player', damage: 100, radius: 8, slowSeconds: 2, visual: 'frost_orb' };
    match.projectiles.push(new Projectile(1, frost, match.boss!.position, 0));
    match.step(STEP, intent(match));
    expect(match.boss!.slowFor).toBe(2);
    run(match, 1);
    expect(match.boss!.slowFor).toBeCloseTo(1, 1);
    match.projectiles.push(new Projectile(2, frost, match.boss!.position, 0));
    match.step(STEP, intent(match));
    expect(match.boss!.slowFor).toBe(2);
    expect(match.boss!.health.current).toBe(5200);
  });
});

describe('zone di pericolo', () => {
  it('una zona nemica esplode dopo il ritardo e ferisce chi e\' dentro raggio + 8', () => {
    const match = createQuietMatch();
    match.zones.push(new DangerZone(1, { team: 'enemy', radius: 42, delay: 0.1, damage: 24 }, match.player.position.add(new Vec2(49, 0))));
    const events = recordEvents(match);
    run(match, 0.05);
    expect(match.zones).toHaveLength(1);
    expect(match.player.health.current).toBe(100);
    run(match, 0.1);
    expect(match.zones).toHaveLength(0);
    expect(match.player.health.current).toBe(76);
    expect(eventsOfType(events, 'zone_detonated')).toEqual([
      expect.objectContaining({ radius: 42, team: 'enemy' }),
    ]);
  });

  it('chi e\' fuori da raggio + 8 non viene ferito', () => {
    const match = createQuietMatch();
    match.zones.push(new DangerZone(1, { team: 'enemy', radius: 42, delay: 0.05, damage: 24 }, match.player.position.add(new Vec2(50.5, 0))));
    run(match, 0.2);
    expect(match.zones).toHaveLength(0);
    expect(match.player.health.current).toBe(100);
  });

  it('la meteora del giocatore colpisce il boss per 210 entro raggio + 25 e non ferisce il giocatore', () => {
    const match = createQuietMatch();
    match.boss!.position = new Vec2(1400, 1000);
    match.player.position = new Vec2(1460, 1000);
    // Mira sul boss: la meteora esplode sul punto mirato dopo 0,65 s (il boss gli gira attorno e si sposta di poco).
    const aim = match.boss!.position;
    match.step(STEP, holding(match, [2], { aim }));
    expect(match.zones).toHaveLength(1);
    run(match, 0.7, (m) => intent(m, { aim }));
    expect(match.zones).toHaveLength(0);
    expect(match.boss!.health.current).toBe(5400 - 210);
    expect(match.player.health.current).toBe(100);
  });

  it('una zona del giocatore non ferisce il giocatore e una nemica non ferisce il boss', () => {
    const match = createQuietMatch();
    match.boss!.position = new Vec2(300, 300);
    match.player.position = new Vec2(1500, 1500);
    match.zones.push(new DangerZone(1, { team: 'player', radius: 66, delay: 0.05, damage: 210 }, new Vec2(1500, 1500)));
    match.zones.push(new DangerZone(2, { team: 'enemy', radius: 66, delay: 0.05, damage: 24 }, new Vec2(300, 300)));
    run(match, 0.2);
    expect(match.zones).toHaveLength(0);
    expect(match.player.health.current).toBe(100);
    expect(match.boss!.health.current).toBe(5400);
  });
});

describe('fine della partita', () => {
  it('quando il boss muore la partita e\' vinta, con un solo evento di sconfitta del boss e uno di fine', () => {
    const match = createQuietMatch();
    match.boss!.health.current = 10;
    const events = recordEvents(match);
    match.projectiles.push(new Projectile(1, { ...ENEMY_SHOT, team: 'player', damage: 19 }, match.boss!.position, 0));
    match.projectiles.push(new Projectile(2, { ...ENEMY_SHOT, team: 'player', damage: 19 }, match.boss!.position, 0));
    match.step(STEP, intent(match));
    expect(match.status).toBe('won');
    expect(eventsOfType(events, 'boss_defeated')).toHaveLength(1);
    expect(eventsOfType(events, 'match_ended')).toEqual([{ type: 'match_ended', won: true }]);
    expect(eventsOfType(events, 'damage_dealt').filter((event) => event.target === 'boss')).toHaveLength(1);
  });

  it('quando il giocatore muore la partita e\' persa', () => {
    const match = createQuietMatch();
    match.player.health.current = 10;
    match.boss!.position = match.player.position;
    const events = recordEvents(match);
    match.step(STEP, intent(match));
    expect(match.status).toBe('lost');
    expect(match.player.health.current).toBe(0);
    expect(eventsOfType(events, 'match_ended')).toEqual([{ type: 'match_ended', won: false }]);
  });

  it('dopo la fine il tempo e lo stato sono congelati e nessun evento viene emesso', () => {
    const match = createQuietMatch();
    match.player.health.current = 1;
    match.boss!.position = match.player.position;
    match.step(STEP, intent(match));
    expect(match.status).toBe('lost');
    const time = match.time;
    const position = match.player.position;
    const events = recordEvents(match);
    run(match, 2, (m) => holding(m, [0, 1, 2, 3], { move: new Vec2(1, 0) }));
    expect(match.time).toBe(time);
    expect(match.player.position).toEqual(position);
    expect(events).toHaveLength(0);
    expect(match.status).toBe('lost');
  });

  it('se giocatore e boss muoiono nello stesso passo vince la sconfitta: il contatto e\' valutato prima dei proiettili', () => {
    const match = createQuietMatch();
    match.player.health.current = 1;
    match.boss!.health.current = 1;
    match.boss!.position = match.player.position;
    match.projectiles.push(new Projectile(1, { ...ENEMY_SHOT, team: 'player', damage: 19 }, match.boss!.position, 0));
    const events = recordEvents(match);
    match.step(STEP, intent(match));
    expect(match.status).toBe('lost');
    expect(match.boss!.health.current).toBe(1);
    expect(eventsOfType(events, 'match_ended')).toEqual([{ type: 'match_ended', won: false }]);
    expect(eventsOfType(events, 'boss_defeated')).toHaveLength(0);
    run(match, 1);
    expect(match.status).toBe('lost');
  });
});

describe('riproducibilita\'', () => {
  const script = (match: ReturnType<typeof createMatch>) => {
    const t = match.time;
    return intent(match, {
      move: new Vec2(Math.cos(t * 0.7), Math.sin(t * 0.9)),
      aim: match.boss!.position,
      skills: [true, Math.floor(t) % 3 === 0, Math.floor(t) % 5 === 0, Math.floor(t) % 4 === 0],
    });
  };

  it('stesso seme e stessi comandi danno lo stesso risultato', () => {
    const a = createMatch(7);
    const b = createMatch(7);
    run(a, 25, script);
    run(b, 25, script);
    expect(b.status).toBe(a.status);
    expect(b.player.position).toEqual(a.player.position);
    expect(b.boss!.position).toEqual(a.boss!.position);
    expect(b.boss!.health.current).toBe(a.boss!.health.current);
    expect(b.player.health.current).toBe(a.player.health.current);
    expect(b.projectiles.length).toBe(a.projectiles.length);
    expect(b.zones.map((z) => z.position)).toEqual(a.zones.map((z) => z.position));
  });

  it('semi diversi cambiano le posizioni casuali delle fratture', () => {
    const positions = (seed: number) => {
      const match = createMatch(seed);
      match.boss!.attackCount = 2;
      match.boss!.attackTimer = 0;
      match.step(STEP, intent(match));
      return match.zones.map((zone) => zone.position);
    };
    expect(positions(1)).not.toEqual(positions(2));
    expect(positions(1)).toEqual(positions(1));
  });
});

describe('simulazione lunga (controllo di sanita\')', () => {
  it('con comandi vari per 3 minuti di gioco, in furia, gli stati restano validi', () => {
    for (const seed of [1, 2, 3]) {
      const match = createMatch(seed);
      // Il giocatore e il boss non muoiono: l'obiettivo e' far girare tutti gli schemi a lungo e controllare gli invarianti.
      match.boss!.health.current = 850;
      let invalid = 0;
      for (let i = 0; i < 60 * 180 && match.status === 'playing'; i++) {
        const t = match.time;
        match.player.health.current = 100;
        match.boss!.health.current = Math.max(match.boss!.health.current, 600);
        match.step(
          STEP,
          intent(match, {
            move: new Vec2(Math.cos(t * 0.5 + seed), Math.sin(t * 0.8)),
            aim: new Vec2(match.boss!.position.x + Math.sin(t) * 50, match.boss!.position.y),
            skills: [true, true, Math.floor(t * 2) % 3 === 0, Math.floor(t * 2) % 5 === 0],
          }),
        );
        if (!Number.isFinite(match.player.position.x + match.player.position.y)) invalid++;
        if (!Number.isFinite(match.boss!.position.x + match.boss!.position.y)) invalid++;
        for (const projectile of match.projectiles) {
          if (!Number.isFinite(projectile.position.x + projectile.position.y)) invalid++;
          if (isOutsideProjectileBounds(CRYPT_ARENA, projectile.position)) invalid++;
        }
      }
      expect(invalid).toBe(0);
      expect(match.status).toBe('playing');
      expect(match.boss!.phase).toBe(2);
      expect(match.boss!.attackCount).toBeGreaterThan(30);
      expect(match.player.position.x).toBeGreaterThanOrEqual(CRYPT_ARENA.playerMargin);
      expect(match.player.position.x).toBeLessThanOrEqual(CRYPT_ARENA.width - CRYPT_ARENA.playerMargin);
    }
  });
});

describe('mappe con ostacoli e boss diversi', () => {
  const withPillar = (position: Vec2, radius = 40): DungeonDefinition => ({
    ...CRYPT,
    arena: { ...CRYPT_ARENA, pillars: [{ position, radius }] },
  });

  it('un pilastro ferma un proiettile nemico prima che raggiunga il giocatore, con l\'evento d\'impatto', () => {
    const match = createQuietMatch(1, { dungeon: withPillar(new Vec2(1500, 1350)) });
    match.player.position = new Vec2(1600, 1350);
    // Proiettile nemico lanciato dal pilastro verso il giocatore: nasce dentro il pilastro e viene fermato subito.
    match.projectiles.push(new Projectile(1, { ...ENEMY_SHOT, speed: 300 }, new Vec2(1450, 1350), 0));
    const events = recordEvents(match);
    run(match, 1);
    expect(match.player.health.current).toBe(100);
    expect(match.projectiles).toHaveLength(0);
    expect(eventsOfType(events, 'projectile_hit').length).toBeGreaterThan(0);
  });

  it('un pilastro ferma anche i proiettili del giocatore: il boss dietro non viene colpito', () => {
    const match = createQuietMatch(1, { dungeon: withPillar(new Vec2(1300, 1350)) });
    match.player.position = new Vec2(1100, 1350);
    match.boss!.position = new Vec2(1500, 1350);
    match.boss!.attackTimer = Infinity;
    const aim = match.boss!.position;
    for (let i = 0; i < 90; i++) match.step(STEP, i === 0 ? holding(match, [0], { aim }) : intent(match, { aim }));
    expect(match.boss!.health.current).toBe(5400);
  });

  it('senza pilastro lo stesso tiro colpisce (controllo del test precedente)', () => {
    const match = createQuietMatch(1);
    match.player.position = new Vec2(1100, 1350);
    match.boss!.position = new Vec2(1500, 1350);
    const aim = match.boss!.position;
    for (let i = 0; i < 90 && match.boss!.health.current === 5400; i++) {
      match.step(STEP, i === 0 ? holding(match, [0], { aim }) : intent(match, { aim }));
    }
    expect(match.boss!.health.current).toBeLessThan(5400);
  });

  it('il boss ignora i pilastri e il giocatore non puo\' attraversarli', () => {
    const pillar = new Vec2(1600, 1250);
    const match = createQuietMatch(1, { dungeon: withPillar(pillar, 60) });
    match.boss!.position = new Vec2(1600, 1100);
    match.player.position = new Vec2(1600, 1350);
    for (let i = 0; i < 180; i++) match.step(STEP, intent(match, { move: new Vec2(0, -1) }));
    expect(match.player.position.distanceTo(pillar)).toBeGreaterThanOrEqual(70 - 1e-6);
  });

  it('il raggio di colpo del boss viene dai suoi dati: un boss grande si colpisce da piu\' lontano', () => {
    const big: DungeonDefinition = {
      ...CRYPT,
      boss: { ...CRYPT.boss, stats: { ...CRYPT.boss.stats, hitRadius: 60, contactDistance: 10 } },
    };
    for (const [dungeon, hit] of [[big, true], [CRYPT, false]] as const) {
      const match = createQuietMatch(1, { dungeon });
      match.boss!.position = new Vec2(1600, 1100);
      match.player.position = new Vec2(1600, 1200);
      match.projectiles.push(new Projectile(1, { ...ENEMY_SHOT, team: 'player', damage: 19 }, match.boss!.position.add(new Vec2(0, -50)), 0));
      match.step(STEP, intent(match));
      expect(match.boss!.health.current, dungeon.id).toBe(hit ? 5381 : 5400);
    }
  });

  it('il colpo ravvicinato ferisce il boss solo se e\' nel raggio e nell\'arco', () => {
    const slash: SkillDefinition = {
      id: 'test_slash',
      name: 'Fendente',
      description: 'prova',
      cooldown: 0.1,
      visual: 'test_slash',
      effect: { kind: 'melee_arc', range: 60, arc: Math.PI / 2, damage: 40 },
    };
    const cases: Array<[string, Vec2, boolean]> = [
      ['davanti, nel raggio', new Vec2(70, 0), true],
      ['davanti, oltre il raggio', new Vec2(100, 0), false],
      ['di lato, fuori dall\'arco', new Vec2(0, 70), false],
      ['dietro', new Vec2(-70, 0), false],
      ['nell\'arco, al bordo (45 gradi)', new Vec2(49, 49), true],
      ['sovrapposto al giocatore', new Vec2(0, 0), true],
    ];
    for (const [label, offset, hit] of cases) {
      const match = createQuietMatch(1, { loadout: [slash, null, null, null] });
      match.player.position = new Vec2(1600, 1350);
      match.boss!.position = match.player.position.add(offset);
      const events = recordEvents(match);
      // La mira e' a destra del giocatore: il boss non si muove nel passo perche' il suo spostamento e' minimo.
      match.step(STEP, { move: Vec2.ZERO, aimOffset: new Vec2(100, 0), skills: [true, false, false, false] });
      const damaged = eventsOfType(events, 'damage_dealt').some((event) => event.target === 'boss');
      expect(damaged, label).toBe(hit);
    }
  });

  it('un pilastro tra il giocatore e il boss ferma il colpo ravvicinato; un boss che sporge dal pilastro si colpisce', () => {
    const slash: SkillDefinition = {
      id: 'test_slash',
      name: 'Fendente',
      description: 'prova',
      cooldown: 0.1,
      visual: 'test_slash',
      effect: { kind: 'melee_arc', range: 60, arc: Math.PI / 2, damage: 40 },
    };
    const player = new Vec2(1600, 1350);
    const boss = player.add(new Vec2(70, 0));
    const cases: Array<[string, Vec2, number, boolean]> = [
      ['pilastro in mezzo', new Vec2(1625, 1350), 8, false],
      ['pilastro di lato, fuori dalla linea', new Vec2(1625, 1380), 8, true],
      ['piccolo pilastro sotto il boss', boss, 15, true],
    ];
    for (const [label, pillar, radius, hit] of cases) {
      const match = createQuietMatch(1, { dungeon: withPillar(pillar, radius), loadout: [slash, null, null, null] });
      match.player.position = player;
      match.boss!.position = boss;
      const events = recordEvents(match);
      match.step(STEP, { move: Vec2.ZERO, aimOffset: new Vec2(100, 0), skills: [true, false, false, false] });
      const damaged = eventsOfType(events, 'damage_dealt').some((event) => event.target === 'boss');
      expect(damaged, label).toBe(hit);
    }
  });

  it('una zona del giocatore con rallentamento rallenta il boss colpito', () => {
    const nova: SkillDefinition = {
      id: 'test_nova',
      name: 'Nova',
      description: 'prova',
      cooldown: 4,
      visual: 'test_nova',
      effect: { kind: 'ground_blast', center: 'caster', zone: { team: 'player', radius: 110, delay: 0.2, damage: 120, slowSeconds: 3 } },
    };
    const match = createQuietMatch(1, { loadout: [null, null, nova, null] });
    match.boss!.position = match.player.position.add(new Vec2(0, -90));
    match.step(STEP, holding(match, [2]));
    run(match, 0.3);
    expect(match.boss!.health.current).toBe(5400 - 120);
    expect(match.boss!.slowFor).toBeGreaterThan(2.5);
  });

  it('con gli slot vuoti la partita funziona e il giocatore non lancia nulla', () => {
    const match = createQuietMatch(1, { loadout: [null, null, null, null] });
    const events = recordEvents(match);
    run(match, 1, (m) => holding(m, [0, 1, 2, 3]));
    expect(eventsOfType(events, 'skill_cast')).toHaveLength(0);
    expect(match.status).toBe('playing');
  });
});
