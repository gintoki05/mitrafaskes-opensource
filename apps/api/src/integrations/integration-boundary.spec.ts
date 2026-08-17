import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const coreDirectories = [
  'patients',
  'practitioners',
  'encounters',
  'master-data',
  'rme',
];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (!entry.name.endsWith('.ts') || entry.name.endsWith('.spec.ts'))
      return [];
    return [path];
  });
}

describe('provider removal boundary', () => {
  it('keeps provider-specific imports and symbols outside core domains', () => {
    const sourceRoot = resolve(__dirname, '..');
    const forbidden = [
      /\bfrom\s+['"][^'"]*satusehat[^'"]*['"]/i,
      /\bSatusehat[A-Za-z]*/,
      /\bSATUSEHAT[A-Za-z_]*/,
      /\bsatusehatSyncLog\b/i,
    ];

    for (const directory of coreDirectories) {
      const files = sourceFiles(resolve(sourceRoot, directory));
      for (const file of files) {
        const source = readFileSync(file, 'utf8');
        for (const pattern of forbidden) {
          expect(source).not.toMatch(pattern);
        }
      }
    }
  });
});
