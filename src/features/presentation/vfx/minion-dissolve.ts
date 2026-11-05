import type * as PixiTypes from 'pixi.js';
import { compositePixi, pixiLayer, type Pixi } from '../webgl-renderer';
import type { DeathPose } from './combat-vfx';
import { DISSOLVE, DISSOLVE_FRAGMENT, DISSOLVE_VERTEX, dissolveNoise, dissolveThreshold } from './dissolve';

/*
 * Morte dei servitori in WebGL: la sagoma cade come prima (`deathPose`) e si sfalda con lo shader a rumore di
 * `dissolve.ts`. Un quadrato per servitore abbattuto, riusato; trame create una volta per sagoma. Solo aspetto.
 */

interface DissolveUniforms {
  uThreshold: number;
  uSize: Float32Array;
  uEdgeColor: Float32Array;
}

interface DissolveMesh {
  readonly mesh: PixiTypes.Mesh<PixiTypes.Geometry, PixiTypes.Shader>;
  readonly uniforms: DissolveUniforms;
  raster: HTMLCanvasElement | null;
}

let root: PixiTypes.Container | null = null;
let noise: PixiTypes.Texture | null = null;
const pool: DissolveMesh[] = [];
const textures = new WeakMap<HTMLCanvasElement, PixiTypes.Texture>();
const geometries = new Map<string, PixiTypes.Geometry>();

const rgba = (hex: string): Float32Array =>
  new Float32Array([parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255, 1]);

/** La trama di rumore: si ripete sullo sprite, un pixel di rumore per pixel d'arte. */
function noiseTexture(pixi: Pixi): PixiTypes.Texture {
  if (noise !== null) return noise;
  const size = DISSOLVE.noiseSize, values = dissolveNoise(size);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d')!;
  const image = context.createImageData(size, size);
  values.forEach((value, i) => { image.data.set([value, value, value, 255], i * 4); });
  context.putImageData(image, 0, 0);
  noise = pixi.Texture.from(canvas);
  noise.source.addressMode = 'repeat';
  noise.source.scaleMode = 'nearest';
  return noise;
}

function textureOf(pixi: Pixi, raster: HTMLCanvasElement): PixiTypes.Texture {
  let texture = textures.get(raster);
  if (texture === undefined) {
    texture = pixi.Texture.from(raster);
    texture.source.scaleMode = 'nearest';
    textures.set(raster, texture);
  }
  return texture;
}

/** Il quadrato di uno sprite largo `w` e alto `h`, centrato come il disegno 2D. */
function quad(pixi: Pixi, w: number, h: number): PixiTypes.Geometry {
  const key = `${w}x${h}`;
  let geometry = geometries.get(key);
  if (geometry === undefined) {
    geometry = new pixi.Geometry({
      attributes: { aPosition: [-w / 2, -h / 2, w / 2, -h / 2, w / 2, h / 2, -w / 2, h / 2], aUV: [0, 0, 1, 0, 1, 1, 0, 1] },
      indexBuffer: [0, 1, 2, 0, 2, 3],
    });
    geometries.set(key, geometry);
  }
  return geometry;
}

function createMesh(pixi: Pixi, raster: HTMLCanvasElement): DissolveMesh {
  const texture = textureOf(pixi, raster);
  const shader = pixi.Shader.from({
    gl: { vertex: DISSOLVE_VERTEX, fragment: DISSOLVE_FRAGMENT, name: 'minion-dissolve' },
    resources: {
      uTexture: texture.source,
      uNoise: noiseTexture(pixi).source,
      dissolveUniforms: {
        uThreshold: { value: -1, type: 'f32' },
        uEdge: { value: DISSOLVE.edge, type: 'f32' },
        uHeightWeight: { value: DISSOLVE.heightWeight, type: 'f32' },
        uNoiseSize: { value: DISSOLVE.noiseSize, type: 'f32' },
        uSize: { value: new Float32Array([raster.width, raster.height]), type: 'vec2<f32>' },
        uEdgeColor: { value: rgba(DISSOLVE.edgeColors.blood), type: 'vec4<f32>' },
      },
    },
  });
  const mesh = new pixi.Mesh({ geometry: quad(pixi, raster.width, raster.height), shader, texture });
  const uniforms = (shader.resources.dissolveUniforms as PixiTypes.UniformGroup).uniforms as unknown as DissolveUniforms;
  return { mesh, uniforms, raster };
}

/** Aggiorna un quadrato del pool con la posa corrente. */
function place(pixi: Pixi, entry: DissolveMesh, pose: DeathPose): void {
  const { mesh, uniforms } = entry;
  if (entry.raster !== pose.raster) {
    const texture = textureOf(pixi, pose.raster);
    mesh.shader!.resources.uTexture = texture.source;
    mesh.texture = texture;
    mesh.geometry = quad(pixi, pose.raster.width, pose.raster.height);
    uniforms.uSize[0] = pose.raster.width;
    uniforms.uSize[1] = pose.raster.height;
    entry.raster = pose.raster;
  }
  const u = pose.progress;
  mesh.visible = true;
  mesh.position.set(pose.x, pose.y);
  mesh.rotation = pose.rotation;
  mesh.scale.set(pose.flip * (1 + u * 0.1), 1 - u * DISSOLVE.squash);
  uniforms.uThreshold = dissolveThreshold(u);
  uniforms.uEdgeColor.set(rgba(DISSOLVE.edgeColors[pose.matter]));
}

/** Disegna le morti con lo shader e le compone nella scena. Falso se WebGL non e' (ancora) disponibile. */
export function drawDissolvingDeaths(ctx: CanvasRenderingContext2D, poses: readonly DeathPose[]): boolean {
  const layer = pixiLayer();
  if (layer === null) return false;
  const { pixi } = layer;
  root ??= new pixi.Container();
  const container = root;
  return compositePixi(ctx, layer, container, () => {
    while (pool.length < poses.length) {
      const entry = createMesh(pixi, poses[pool.length]!.raster);
      pool.push(entry);
      container.addChild(entry.mesh);
    }
    poses.forEach((pose, i) => place(pixi, pool[i]!, pose));
    for (let i = poses.length; i < pool.length; i++) pool[i]!.mesh.visible = false;
  });
}
