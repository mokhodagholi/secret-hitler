import { defineConfig } from '@rslib/core';

// Watch deletes dist then hangs in dts.js, so the client cannot resolve this package.
const watching = process.argv.includes('--watch');

export default defineConfig({
  source: {
    entry: {
      index: './src/index.ts',
    },
  },
  lib: [
    {
      format: 'esm',
      syntax: 'es2022',
      dts: !watching,
    },
    {
      format: 'cjs',
      syntax: 'es2022',
    },
  ],
  output: {
    cleanDistPath: !watching,
  },
});
