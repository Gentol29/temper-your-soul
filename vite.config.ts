import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

// Il bundle e' uno script classico (IIFE) e non un modulo ES: cosi' `dist/index.html` funziona anche aperto
// con doppio clic (file://), dove i moduli sono bloccati dal browser.
function classicScript(): Plugin {
  return {
    name: 'classic-script',
    enforce: 'post',
    transformIndexHtml(html) {
      return html
        .replace(/<script type="module" crossorigin/g, '<script defer')
        .replace(/<link rel="modulepreload"[^>]*>/g, '');
    },
  };
}

export default defineConfig({
  base: './',
  server: {
    // Profili browser, log e build non sono sorgenti: su Windows i file Cookies possono essere bloccati.
    watch: { ignored: ['**/.tools/**', '**/dist/**'] },
    proxy: { '/party': { target: 'ws://127.0.0.1:4173', ws: true }, '/health': 'http://127.0.0.1:4173', '/online-config': 'http://127.0.0.1:4173', '/auth': 'http://127.0.0.1:4173' },
  },
  build: {
    target: 'es2022',
    // I caratteri dell'interfaccia vanno dentro il CSS: da file:// il browser non carica i caratteri come file a parte.
    assetsInlineLimit: (file: string) => (file.endsWith('.woff2') ? true : undefined),
    rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } },
  },
  plugins: [classicScript()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts','server/**/*.test.ts'],
  },
});
