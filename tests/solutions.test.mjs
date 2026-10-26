import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase, defaults } from '../server/database.mjs';

const legacy = JSON.parse(
  readFileSync(new URL('../server/legacy-solutions.json', import.meta.url)),
);
test('old service templates upgrade while custom, hidden and deleted cards are preserved', () => {
  const dir = mkdtempSync(join(tmpdir(), 'solutions-upgrade-'));
  try {
    for (const scenario of ['original', 'no-visual', 'edited', 'hidden', 'deleted']) {
      const path = join(dir, scenario + '.sqlite');
      let db = openDatabase(path);
      const solutions = structuredClone(legacy);
      if (scenario === 'no-visual') solutions.forEach((item) => delete item.visual);
      if (scenario === 'edited') solutions[0].description = 'My custom service';
      if (scenario === 'hidden') solutions[0].published = false;
      if (scenario === 'deleted') solutions.length = 0;
      db.prepare('UPDATE site_settings SET data=? WHERE id=1').run(
        JSON.stringify({
          ...defaults.settings,
          instructorName: 'Custom teacher',
          solutions,
        }),
      );
      db.close();
      db = openDatabase(path);
      const stored = JSON.parse(db.prepare('SELECT data FROM site_settings WHERE id=1').get().data);
      assert.equal(stored.instructorName, 'Custom teacher');
      assert.deepEqual(
        stored.solutions,
        ['original', 'no-visual'].includes(scenario) ? defaults.settings.solutions : solutions,
      );
      db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
