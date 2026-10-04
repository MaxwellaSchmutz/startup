import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function precacheList() {
  let outDir = 'dist';
  let files = [];
  return {
    name: 'precache-list',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    generateBundle(_options, bundle) {
      files = Object.keys(bundle)
        .filter((name) => name !== 'index.html' && !name.endsWith('.map'))
        .map((name) => '/' + name);
    },
    closeBundle() {
      const swPath = path.join(outDir, 'sw.js');
      if (!fs.existsSync(swPath)) return;
      const version = crypto.createHash('sha1').update(files.join('\n')).digest('hex').slice(0, 10);
      const source = fs
        .readFileSync(swPath, 'utf8')
        .replace("const buildFiles = [];", `const buildFiles = ${JSON.stringify(files)};`)
        .replace("const version = 'dev';", `const version = '${version}';`);
      fs.writeFileSync(swPath, source);
    },
  };
}

export default defineConfig({
  plugins: [precacheList()],
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
      '/ws': {
        target: 'ws://localhost:4000',
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
    },
  },
});
