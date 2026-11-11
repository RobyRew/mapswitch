// Astro's type check (what `astro check` runs), driven from @astrojs/language-server. The root `typescript`
// is 6.x: TypeScript 7 ships without the JS API that this checker and typescript-eslint (peer <6.1.0) load.
// TypeScript 7 runs separately as `typescript-7` (`tsc --noEmit` in the check script).
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { AstroCheck } from '@astrojs/language-server';

const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const checker = new AstroCheck(root, require.resolve('typescript'), undefined);
const result = await checker.lint({ logErrors: { level: 'hint' } });
console.info(
  `Result (${result.fileChecked} files, TypeScript ${checker.ts.version}): ${result.errors} errors, ${result.warnings} warnings, ${result.hints} hints`,
);
process.exitCode = result.errors > 0 ? 1 : 0;
