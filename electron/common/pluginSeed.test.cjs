const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ensureOfficialPlugins, resolveSeedRoot } = require('./pluginSeed.cjs');

function makeRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pyramid-seed-'));
}

function writePlugin(root, id, version = '1.0.0', main = 'seed-main') {
  const dir = path.join(root, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({
    id,
    name: id,
    version,
    apiVersion: 1,
    main: 'main.mjs',
    defaultEnabled: true,
  }));
  fs.writeFileSync(path.join(dir, 'main.mjs'), main);
  return dir;
}

test('resolveSeedRoot picks resourcesPath when packaged, appPath otherwise', () => {
  assert.equal(
    resolveSeedRoot({ isPackaged: true, resourcesPath: '/res', appPath: '/app' }),
    path.join('/res', 'plugins-seed'),
  );
  assert.equal(
    resolveSeedRoot({ isPackaged: false, resourcesPath: '/res', appPath: '/app' }),
    path.join('/app', 'plugins-seed'),
  );
});

test('copies missing plugins into the official root', () => {
  const root = makeRoot();
  const seedRoot = path.join(root, 'seed');
  const officialRoot = path.join(root, 'official');
  writePlugin(seedRoot, 'tasks', '1.0.0', 'seed-main');

  const result = ensureOfficialPlugins({ seedRoot, officialRoot });
  assert.deepEqual(result.copied, ['tasks']);
  assert.equal(
    fs.readFileSync(path.join(officialRoot, 'tasks', 'main.mjs'), 'utf8'),
    'seed-main',
  );
});

test('does not overwrite an installed plugin at the same version', () => {
  const root = makeRoot();
  const seedRoot = path.join(root, 'seed');
  const officialRoot = path.join(root, 'official');
  writePlugin(seedRoot, 'tasks', '1.0.0', 'seed-main');
  writePlugin(officialRoot, 'tasks', '1.0.0', 'user-modified');

  const result = ensureOfficialPlugins({ seedRoot, officialRoot });
  assert.deepEqual(result.skipped, ['tasks']);
  assert.equal(
    fs.readFileSync(path.join(officialRoot, 'tasks', 'main.mjs'), 'utf8'),
    'user-modified',
  );
});

test('overwrites an installed plugin when the seed version is higher', () => {
  const root = makeRoot();
  const seedRoot = path.join(root, 'seed');
  const officialRoot = path.join(root, 'official');
  writePlugin(seedRoot, 'tasks', '1.1.0', 'seed-main');
  writePlugin(officialRoot, 'tasks', '1.0.0', 'old-main');

  const result = ensureOfficialPlugins({ seedRoot, officialRoot });
  assert.deepEqual(result.updated, ['tasks']);
  assert.equal(
    fs.readFileSync(path.join(officialRoot, 'tasks', 'main.mjs'), 'utf8'),
    'seed-main',
  );
});

test('repairs an installed plugin with a corrupt manifest', () => {
  const root = makeRoot();
  const seedRoot = path.join(root, 'seed');
  const officialRoot = path.join(root, 'official');
  writePlugin(seedRoot, 'tasks', '1.0.0', 'seed-main');
  const target = path.join(officialRoot, 'tasks');
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, 'manifest.json'), 'not json');

  const result = ensureOfficialPlugins({ seedRoot, officialRoot });
  assert.deepEqual(result.updated, ['tasks']);
  assert.equal(
    fs.readFileSync(path.join(target, 'main.mjs'), 'utf8'),
    'seed-main',
  );
});

test('isolates invalid seed plugins and keeps processing others', () => {
  const root = makeRoot();
  const seedRoot = path.join(root, 'seed');
  const officialRoot = path.join(root, 'official');
  writePlugin(seedRoot, 'good');
  const bad = path.join(seedRoot, 'bad');
  fs.mkdirSync(bad, { recursive: true });
  fs.writeFileSync(path.join(bad, 'manifest.json'), '{"id":"bad"}');

  const result = ensureOfficialPlugins({ seedRoot, officialRoot });
  assert.deepEqual(result.copied, ['good']);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /bad/);
});

test('returns an empty result when the seed root is missing', () => {
  const root = makeRoot();
  const result = ensureOfficialPlugins({
    seedRoot: path.join(root, 'missing'),
    officialRoot: path.join(root, 'official'),
  });
  assert.deepEqual(result, { copied: [], updated: [], skipped: [], errors: [] });
});
