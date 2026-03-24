import {execSync} from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const TEST_DIR_NAME = 'test';

/**
 * Recursively collect all TypeScript source files under `dir`, excluding the
 * test directory and declaration files (.d.ts).
 * Returns paths relative to SRC_DIR (e.g. "index.ts", "utils/helper.ts").
 */
function collectSourceFiles(dir: string, base = SRC_DIR): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry !== TEST_DIR_NAME) {
        results.push(...collectSourceFiles(fullPath, base));
      }
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
      results.push(path.relative(base, fullPath));
    }
  }
  return results;
}

describe('npm package files', () => {
  beforeAll(() => {
    execSync('npm run build', {cwd: ROOT_DIR, stdio: 'pipe'});
  });

  it('should include all compiled dist files when published to npm', () => {
    // Compute expected dist files from every TypeScript source file:
    //   src/index.ts        -> dist/index.js
    //   src/utils/helper.ts -> dist/utils/helper.js
    const expectedDistFiles = collectSourceFiles(SRC_DIR).map(
      (f) => `dist/${f.replace(/\.ts$/, '.js')}`
    );

    // Determine which files would be included in the published npm package
    const output = execSync('npm pack --dry-run --json 2>/dev/null', {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
    });

    const packResult = JSON.parse(output) as Array<{
      files: Array<{path: string}>;
    }>;
    const packedFiles = packResult[0].files.map((f) => f.path);

    // Every compiled dist file must be present in the npm package
    for (const expected of expectedDistFiles) {
      expect(packedFiles).toContain(expected);
    }
  });
});
