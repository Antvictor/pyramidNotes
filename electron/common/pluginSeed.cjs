const fs = require('node:fs');
const path = require('node:path');
const {
  PLUGIN_ID_RE,
  compareVersions,
  validateManifest,
} = require('./pluginManifest.cjs');

function resolveSeedRoot({ isPackaged, resourcesPath, appPath }) {
  return path.join(isPackaged ? resourcesPath : appPath, 'plugins-seed');
}

function readManifest(dir) {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
    const result = validateManifest(raw, path.basename(dir));
    return result.ok ? result.manifest : null;
  } catch {
    return null;
  }
}

function copyPlugin(sourceDir, targetDir) {
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  fs.cpSync(sourceDir, targetDir, { recursive: true });
}

function ensureOfficialPlugins({ seedRoot, officialRoot }) {
  const result = { copied: [], updated: [], skipped: [], errors: [] };

  let entries;
  try {
    entries = fs.readdirSync(seedRoot, { withFileTypes: true });
  } catch {
    return result;
  }

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isSymbolicLink() || !entry.isDirectory()) continue;
    const id = entry.name;
    if (!PLUGIN_ID_RE.test(id)) {
      result.errors.push(`${id}: invalid plugin id`);
      continue;
    }

    try {
      const seedDir = path.join(seedRoot, id);
      const targetDir = path.join(officialRoot, id);
      const seedManifest = readManifest(seedDir);
      if (!seedManifest) {
        result.errors.push(`${id}: invalid seed manifest`);
        continue;
      }

      if (!fs.existsSync(targetDir)) {
        copyPlugin(seedDir, targetDir);
        result.copied.push(id);
        continue;
      }

      const targetManifest = readManifest(targetDir);
      if (
        !targetManifest
        || compareVersions(seedManifest.version, targetManifest.version) > 0
      ) {
        copyPlugin(seedDir, targetDir);
        result.updated.push(id);
      } else {
        result.skipped.push(id);
      }
    } catch (error) {
      result.errors.push(`${id}: ${error.message}`);
    }
  }

  return result;
}

module.exports = {
  resolveSeedRoot,
  ensureOfficialPlugins,
};
