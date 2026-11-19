const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PLUGIN_API_VERSION,
  validateManifest,
  compareVersions,
} = require('./pluginManifest.cjs');

const base = {
  id: 'tasks',
  name: 'Task list',
  description: 'Task checkboxes',
  version: '1.0.0',
  apiVersion: PLUGIN_API_VERSION,
  main: 'main.mjs',
  styles: [],
  defaultEnabled: true,
};

const validate = (overrides = {}, dirName = 'tasks') =>
  validateManifest({ ...base, ...overrides }, dirName);

test('accepts a valid manifest and normalizes fields', () => {
  const result = validate({ nameKey: 'settings.plugins.tasks.name' });
  assert.equal(result.ok, true);
  assert.equal(result.manifest.id, 'tasks');
  assert.equal(result.manifest.main, 'main.mjs');
  assert.deepEqual(result.manifest.styles, []);
  assert.deepEqual(result.manifest.permissions, ['editor']);
  assert.equal(result.manifest.nameKey, 'settings.plugins.tasks.name');
});

test('accepts styles when the styles permission is declared', () => {
  const result = validate({ styles: ['styles.css'], permissions: ['editor', 'styles'] });
  assert.equal(result.ok, true);
  assert.deepEqual(result.manifest.permissions, ['editor', 'styles']);
  assert.deepEqual(result.manifest.styles, ['styles.css']);
});

test('defaults permissions to editor when omitted', () => {
  const result = validate({ permissions: undefined });
  assert.equal(result.ok, true);
  assert.deepEqual(result.manifest.permissions, ['editor']);
});

test('dedupes explicit permissions and keeps order', () => {
  const result = validate({ permissions: ['styles', 'editor', 'editor'] });
  assert.equal(result.ok, true);
  assert.deepEqual(result.manifest.permissions, ['styles', 'editor']);
});

test('allows an empty permissions array', () => {
  const result = validate({ permissions: [] });
  assert.equal(result.ok, true);
  assert.deepEqual(result.manifest.permissions, []);
});

test('rejects unknown or malformed permissions', () => {
  assert.equal(validate({ permissions: ['editor', 'network'] }).ok, false);
  assert.equal(validate({ permissions: 'editor' }).ok, false);
  assert.equal(validate({ permissions: ['editor', 1] }).ok, false);
  assert.equal(validate({ permissions: ['editor', 'styles', 'advanced', 'editor'] }).ok, false);
});

test('rejects advanced without editor', () => {
  assert.equal(validate({ permissions: ['advanced'] }).ok, false);
  assert.equal(validate({ permissions: ['styles', 'advanced'] }).ok, false);
});

test('rejects styles files without the styles permission', () => {
  assert.equal(validate({ styles: ['styles.css'], permissions: ['editor'] }).ok, false);
  assert.equal(validate({ styles: ['styles.css'], permissions: [] }).ok, false);
  assert.equal(validate({ styles: ['styles.css'], permissions: undefined }).ok, false);
});

test('allows missing optional fields and extra keys', () => {
  const result = validate({ description: undefined, styles: undefined, extra: 1 });
  assert.equal(result.ok, true);
  assert.deepEqual(result.manifest.styles, []);
});

test('rejects id that does not match the directory name', () => {
  assert.equal(validate({}, 'other').ok, false);
});

test('rejects invalid ids', () => {
  assert.equal(validate({ id: 'Bad_Id' }, 'Bad_Id').ok, false);
  assert.equal(validate({ id: '../evil' }, '../evil').ok, false);
});

test('rejects invalid apiVersion', () => {
  assert.equal(validate({ apiVersion: 1.5 }).ok, false);
  assert.equal(validate({ apiVersion: '1' }).ok, false);
  assert.equal(validate({ apiVersion: 0 }).ok, false);
});

test('rejects main paths and non-mjs extensions', () => {
  assert.equal(validate({ main: 'sub/main.mjs' }).ok, false);
  assert.equal(validate({ main: '../main.mjs' }).ok, false);
  assert.equal(validate({ main: 'main.js' }).ok, false);
});

test('rejects invalid styles entries', () => {
  assert.equal(validate({ styles: ['styles.txt'] }).ok, false);
  assert.equal(validate({ styles: ['../styles.css'] }).ok, false);
  assert.equal(
    validate({ styles: ['a.css', 'b.css', 'c.css', 'd.css', 'e.css', 'f.css'] }).ok,
    false,
  );
});

test('rejects invalid defaultEnabled and version', () => {
  assert.equal(validate({ defaultEnabled: 'yes' }).ok, false);
  assert.equal(validate({ version: '' }).ok, false);
  assert.equal(validate({ version: 'x'.repeat(33) }).ok, false);
});

test('rejects overlong name and description', () => {
  assert.equal(validate({ name: 'x'.repeat(129) }).ok, false);
  assert.equal(validate({ description: 'x'.repeat(513) }).ok, false);
});

test('compareVersions compares numerically and pads missing segments', () => {
  assert.equal(compareVersions('1.0.0', '1.0.0'), 0);
  assert.equal(compareVersions('1.0', '1.0.0'), 0);
  assert.equal(compareVersions('1.0.1', '1.0.0'), 1);
  assert.equal(compareVersions('1.0.0', '1.0.1'), -1);
  assert.equal(compareVersions('1.10.0', '1.9.0'), 1);
  assert.equal(compareVersions('2', '10'), -1);
});
