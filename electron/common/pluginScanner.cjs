const fs = require('node:fs');
const path = require('node:path');
const {
  PLUGIN_ID_RE,
  validateManifest,
} = require('./pluginManifest.cjs');

const MAX_MANIFEST_BYTES = 256 * 1024;
const MAX_MAIN_BYTES = 1024 * 1024;
const MAX_STYLE_BYTES = 512 * 1024;
const MAX_STYLES_TOTAL_BYTES = 2 * 1024 * 1024;

function fileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return -1;
  }
}

function readManifest(dir) {
  const filePath = path.join(dir, 'manifest.json');
  const size = fileSize(filePath);
  if (size < 0) return { ok: false, reason: 'manifest.json missing' };
  if (size > MAX_MANIFEST_BYTES) return { ok: false, reason: 'manifest.json too large' };
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return { ok: false, reason: 'manifest.json is not valid JSON' };
  }
  return validateManifest(raw, path.basename(dir));
}

function listPluginDirs(root, warnings, origin) {
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const ids = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isSymbolicLink()) {
      warnings.push(`${origin}: symlink "${entry.name}" skipped`);
      continue;
    }
    if (!entry.isDirectory()) continue;
    if (!PLUGIN_ID_RE.test(entry.name)) {
      warnings.push(`${origin}: invalid plugin id "${entry.name}"`);
      continue;
    }
    ids.push(entry.name);
  }
  return ids;
}

function scanPlugins({ officialRoot, userRoot, hostApiVersion }) {
  const warnings = [];
  const plugins = [];
  const seen = new Set();

  for (const [origin, root] of [['official', officialRoot], ['user', userRoot]]) {
    for (const id of listPluginDirs(root, warnings, origin)) {
      if (seen.has(id)) {
        warnings.push(`${origin}: duplicate plugin id "${id}" ignored (official wins)`);
        continue;
      }
      const result = readManifest(path.join(root, id));
      if (!result.ok) {
        warnings.push(`${origin}/${id}: ${result.reason}`);
        continue;
      }
      const incompatible = result.manifest.apiVersion !== hostApiVersion;
      plugins.push({
        id,
        origin,
        manifest: result.manifest,
        status: incompatible ? 'incompatible' : 'ok',
        ...(incompatible
          ? { reason: `unsupported apiVersion ${result.manifest.apiVersion}` }
          : {}),
      });
      seen.add(id);
    }
  }

  return { plugins, warnings };
}

function findPlugin(id, officialRoot, userRoot) {
  if (typeof id !== 'string' || !PLUGIN_ID_RE.test(id)) return null;
  for (const [origin, root] of [['official', officialRoot], ['user', userRoot]]) {
    const dir = path.join(root, id);
    let stat;
    try {
      stat = fs.lstatSync(dir);
    } catch {
      continue;
    }
    if (stat.isSymbolicLink() || !stat.isDirectory()) continue;
    return { origin, dir };
  }
  return null;
}

function isInside(dir, filePath) {
  try {
    const realDir = fs.realpathSync(dir);
    const realFile = fs.realpathSync(filePath);
    return realFile === realDir || realFile.startsWith(realDir + path.sep);
  } catch {
    return false;
  }
}

function readTextFile(filePath, dir, maxBytes) {
  const size = fileSize(filePath);
  if (size < 0) return { ok: false, reason: `${path.basename(filePath)} missing` };
  if (size > maxBytes) return { ok: false, reason: `${path.basename(filePath)} too large` };
  if (!isInside(dir, filePath)) {
    return { ok: false, reason: `${path.basename(filePath)} is outside the plugin directory` };
  }
  return { ok: true, value: fs.readFileSync(filePath, 'utf8') };
}

function readPlugin({ id, officialRoot, userRoot, hostApiVersion }) {
  const found = findPlugin(id, officialRoot, userRoot);
  if (!found) return { error: 'plugin not found' };

  const manifestResult = readManifest(found.dir);
  if (!manifestResult.ok) return { error: manifestResult.reason };
  if (manifestResult.manifest.apiVersion !== hostApiVersion) {
    return { error: `incompatible apiVersion ${manifestResult.manifest.apiVersion}` };
  }

  const main = readTextFile(path.join(found.dir, manifestResult.manifest.main), found.dir, MAX_MAIN_BYTES);
  if (!main.ok) return { error: main.reason };

  const styles = [];
  let totalStyleBytes = 0;
  for (const fileName of manifestResult.manifest.styles) {
    const style = readTextFile(path.join(found.dir, fileName), found.dir, MAX_STYLE_BYTES);
    if (!style.ok) return { error: style.reason };
    totalStyleBytes += Buffer.byteLength(style.value, 'utf8');
    if (totalStyleBytes > MAX_STYLES_TOTAL_BYTES) {
      return { error: 'plugin styles too large' };
    }
    styles.push({ fileName, css: style.value });
  }

  return {
    id: manifestResult.manifest.id,
    origin: found.origin,
    manifest: manifestResult.manifest,
    code: main.value,
    styles,
  };
}

module.exports = {
  MAX_MANIFEST_BYTES,
  MAX_MAIN_BYTES,
  MAX_STYLE_BYTES,
  MAX_STYLES_TOTAL_BYTES,
  scanPlugins,
  readPlugin,
};
