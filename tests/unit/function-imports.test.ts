import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

// Vercel compiles api/ to native ESM, where extensionless relative imports crash the function at load time.
test.each(['api/lead.ts', 'src/lib/lead.ts', 'src/lib/validate.ts'])('%s uses .js extensions in relative imports', (file) => {
  const src = readFileSync(file, 'utf8');
  const relative = [...src.matchAll(/from\s+'(\.{1,2}\/[^']+)'/g)].map((m) => m[1]);
  expect(relative.length).toBeGreaterThan(0);
  for (const spec of relative) expect(spec, `${file}: ${spec}`).toMatch(/\.js$/);
});
