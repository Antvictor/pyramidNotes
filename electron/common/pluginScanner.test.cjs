const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { scanPlugins, readPlugin } = require('./pluginScanner.cjs');

function makeRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pyramid-plugins-'));
}

function writePlugin(root, id, overrides = {}, options = {}) {
  const dir = path.join(root, id);
  fs.mkdirSync(dir, { recursive: true });
  const manifest = {
    id,
    name: id,
    description: '',
    version: '1.0.0',
    apiVersion: 1,
    main: 'main.mjs',
    styles: options.styles ? ['styles.css'] : [],
    ...(options.styles ? { permissions: ['editor', 'styles'] } : {}),
    defaultEnabled: true,
    ...overrides,
  };
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest));
  fs.writeFileSync(path.join(dir, 'main.mjs'), options.main ?? `export default function activate() {}`);
  if (options.styles) {
    fs.writeFileSync(path.join(dir, 'styles.css'), options.styles);
  }
  return dir;
}

test('returns empty lists when roots do not exist', () => {
  const root = makeRoot();
  const result = scanPlugins({
    officialRoot: path.join(root, 'official'),
    userRoot: path.join(root, 'user'),
    hostApiVersion: 1,
  });
  assert.deepEqual(result.plugins, []);
  assert.deepEqual(result.warnings, []);
});

test('scans official and user roots with origin and precedence', () => {
  const root = makeRoot();
  const official = path.join(root, 'official');
  const user = path.join(root, 'user');
  writePlugin(official, 'alpha', { name: 'official alpha' });
  writePlugin(user, 'beta', { name: 'user beta' });
  writePlugin(user, 'alpha', { name: 'user alpha duplicate' });

  const result = scanPlugins({ officialRoot: official, userRoot: user, hostApiVersion: 1 });
  assert.deepEqual(
    result.plugins.map((plugin) => [plugin.id, plugin.origin]),
    [
      ['alpha', 'official'],
      ['beta', 'user'],
    ],
  );
  assert.equal(result.plugins[0].manifest.name, 'official alpha');
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /alpha/);
});

test('skips invalid manifests and symlinked directories', () => {
  const root = makeRoot();
  const official = path.join(root, 'official');
  const bad = path.join(official, 'bad');
  fs.mkdirSync(bad, { recursive: true });
  fs.writeFileSync(path.join(bad, 'manifest.json'), 'not json');
  writePlugin(official, 'good');

  const target = writePlugin(root, 'linked-target');
  fs.symlinkSync(target, path.join(official, 'linked'));

  const result = scanPlugins({ officialRoot: official, userRoot: path.join(root, 'user'), hostApiVersion: 1 });
  assert.deepEqual(result.plugins.map((plugin) => plugin.id), ['good']);
  assert.ok(result.warnings.some((warning) => warning.includes('bad')));
});

test('marks plugins with mismatched apiVersion as incompatible', () => {
  const root = makeRoot();
  const official = path.join(root, 'official');
  writePlugin(official, 'future', { apiVersion: 2 });

  const result = scanPlugins({ officialRoot: official, userRoot: path.join(root, 'user'), hostApiVersion: 1 });
  assert.equal(result.plugins[0].status, 'incompatible');
  assert.match(result.plugins[0].reason, /apiVersion/);
});

test('readPlugin returns code, manifest and styles for official plugins', () => {
  const root = makeRoot();
  const official = path.join(root, 'official');
  writePlugin(official, 'tasks', { nameKey: 'settings.plugins.tasks.name' }, {
    styles: '.task { color: red; }',
    main: 'export default function activate() { return 1; }',
  });

  const result = readPlugin({
    id: 'tasks',
    officialRoot: official,
    userRoot: path.join(root, 'user'),
    hostApiVersion: 1,
  });
  assert.equal(result.origin, 'official');
  assert.match(result.code, /activate/);
  assert.deepEqual(result.styles, [{ fileName: 'styles.css', css: '.task { color: red; }' }]);
  assert.equal(result.manifest.nameKey, 'settings.plugins.tasks.name');
});

test('readPlugin prefers the official copy over a user duplicate', () => {
  const root = makeRoot();
  const official = path.join(root, 'official');
  const user = path.join(root, 'user');
  writePlugin(official, 'tasks', { name: 'official' });
  writePlugin(user, 'tasks', { name: 'user' });

  const result = readPlugin({ id: 'tasks', officialRoot: official, userRoot: user, hostApiVersion: 1 });
  assert.equal(result.origin, 'official');
  assert.equal(result.manifest.name, 'official');
});

test('readPlugin rejects invalid ids, missing plugins and incompatible versions', () => {
  const root = makeRoot();
  const official = path.join(root, 'official');
  const user = path.join(root, 'user');
  writePlugin(official, 'future', { apiVersion: 2 });

  assert.ok(readPlugin({ id: '../evil', officialRoot: official, userRoot: user, hostApiVersion: 1 }).error);
  assert.ok(readPlugin({ id: 'missing', officialRoot: official, userRoot: user, hostApiVersion: 1 }).error);
  assert.ok(readPlugin({ id: 'future', officialRoot: official, userRoot: user, hostApiVersion: 1 }).error);
});

test('readPlugin enforces size limits', () => {
  const root = makeRoot();
  const official = path.join(root, 'official');
  writePlugin(official, 'huge', {}, { main: `// ${'x'.repeat(1024 * 1024 + 1)}` });

  const result = readPlugin({ id: 'huge', officialRoot: official, userRoot: path.join(root, 'user'), hostApiVersion: 1 });
  assert.ok(result.error);
  assert.match(result.error, /too large/);
});
