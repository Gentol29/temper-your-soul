/*
 * Le sole parti di PixiJS che usa lo strato WebGL. Un modulo a parte, caricato con import dinamico da `webgl-renderer.ts`:
 * importare per nome (non l'intero `pixi.js`) lascia al bundler scartare cio' che non serve (testo, grafica vettoriale,
 * WebGPU...). Per usare un'altra parte di PixiJS, aggiungerla qui.
 */
export { Application, Container, Geometry, Matrix, Mesh, Particle, ParticleContainer, Rectangle, Shader, Sprite, Texture, TextureSource } from 'pixi.js';
