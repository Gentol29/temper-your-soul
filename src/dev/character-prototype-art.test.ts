import { describe, expect, it } from 'vitest';
import { CHARACTER_PROTOTYPES, PROTOTYPE_GRID, prototypeCharacter } from './character-prototype-art';
import { PROTOTYPE_ANIMATION } from './character-prototype-motion';
describe('tre prototipi separati dal gioco', () => {
  it('sei sagome reali distinte per ogni classe, con palette scura e margine per le armi', () => {
    for (const kind of ['warrior','archer','mage'] as const) {
      const unique = new Set<string>();
      for (const prototype of CHARACTER_PROTOTYPES) for (const body of ['male','female'] as const) {
        const art=prototypeCharacter(prototype.id,body,kind);unique.add(JSON.stringify(art.pixels));
        expect(art.width).toBe(PROTOTYPE_GRID);expect(art.height).toBe(PROTOTYPE_GRID);
        const opaque=art.pixels.flat().filter(Boolean);
        expect(opaque.length).toBeGreaterThan(350);
        const bright=opaque.filter(color=>Math.max(...[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)))>180);
        expect(bright.length/opaque.length).toBeLessThan(.08);
        expect(art.pixels[0]!.every(color=>color==='')).toBe(true);
      }
      expect(unique.size).toBe(6);
    }
  });
  it('la falcata apre e richiude le gambe senza ridursi a una traslazione rigida', () => {
    const spread=(frame:number):number=>{
      const art=prototypeCharacter('iron','male','archer',frame,'walk');
      const boots=art.pixels.flatMap((row,y)=>row.flatMap((color,x)=>color==='#3d3035'&&y>40?[x]:[]));
      expect(boots.length).toBeGreaterThan(0);return Math.max(...boots)-Math.min(...boots);
    };
    expect(spread(3)-spread(9)).toBeGreaterThanOrEqual(12);
  });
  it('il fendente ruota la lama dal caricamento al colpo, per entrambi i corpi', () => {
    const blade=(frame:number,body:'male'|'female')=>{
      const art=prototypeCharacter('iron',body,'warrior',frame,'attack');
      const pixels=art.pixels.flatMap((row,y)=>row.flatMap((color,x)=>color==='#9b8c87'?[{x,y}]:[]));
      expect(pixels.length).toBeGreaterThan(0);
      const x=pixels.reduce((sum,p)=>sum+p.x,0)/pixels.length,y=pixels.reduce((sum,p)=>sum+p.y,0)/pixels.length;
      const xx=pixels.reduce((sum,p)=>sum+(p.x-x)**2,0),yy=pixels.reduce((sum,p)=>sum+(p.y-y)**2,0);
      const xy=pixels.reduce((sum,p)=>sum+(p.x-x)*(p.y-y),0);
      return {x,y,angle:.5*Math.atan2(2*xy,xx-yy)};
    };
    for(const body of ['male','female'] as const){
      const windup=blade(3,body),hit=blade(5,body);
      expect(Math.hypot(hit.x-windup.x,hit.y-windup.y)).toBeGreaterThan(15);
      // L'asse della lama cambia: spostare soltanto la stessa sagoma non basta.
      expect(Math.cos(2*(hit.angle-windup.angle))).toBeLessThan(.2);
    }
  });
  it('nessuna arma o mantello viene tagliato sui bordi nei dodici fotogrammi', () => {
    for(const prototype of CHARACTER_PROTOTYPES)for(const body of ['male','female']as const)for(const kind of ['warrior','archer','mage']as const)for(const pose of ['walk','attack']as const)for(let f=0;f<PROTOTYPE_ANIMATION.frames;f++){
      const art=prototypeCharacter(prototype.id,body,kind,f,pose),label=`${prototype.id}/${body}/${kind}/${pose}/${f}`;
      expect(art.pixels[0]!.every(color=>color===''),label).toBe(true);
      expect(art.pixels[art.height-1]!.every(color=>color===''),label).toBe(true);
      expect(art.pixels.every(row=>row[0]===''&&row[art.width-1]===''),label).toBe(true);
    }
  });
  it('cammino e attacco cambiano pose per entrambe le versioni', () => {
    for(const prototype of CHARACTER_PROTOTYPES)for(const body of ['male','female'] as const){
      const idle=prototypeCharacter(prototype.id,body,'archer',0,'idle');
      expect(prototypeCharacter(prototype.id,body,'archer',2,'walk').pixels).not.toEqual(idle.pixels);
      expect(prototypeCharacter(prototype.id,body,'archer',3,'attack').pixels).not.toEqual(idle.pixels);
    }
  });
});
