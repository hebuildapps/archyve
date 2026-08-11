import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    background: 'src/background/serviceWorker.ts',
    content: 'src/content/detector.ts',
    options: 'src/options.ts',
    welcome: 'src/welcome.ts',
  },
  outDir: 'dist',
  format: ['iife'],
  outExtension() {
    return {
      js: '.js',
    };
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  dts: false,
});
