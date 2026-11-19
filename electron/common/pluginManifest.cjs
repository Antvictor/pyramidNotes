const PLUGIN_API_VERSION = 1;
const PLUGIN_ID_RE = /^[a-z0-9-]+$/;
const PLUGIN_MAIN_RE = /^[\w.-]+\.mjs$/;
const PLUGIN_STYLE_RE = /^[\w.-]+\.css$/;
const PYRAMID_PERMISSIONS = ['editor', 'styles', 'advanced'];
const PYRAMID_PERMISSION_SET = new Set(PYRAMID_PERMISSIONS);
const DEFAULT_PERMISSIONS = ['editor'];

const MAX_NAME = 128;
const MAX_DESCRIPTION = 512;
const MAX_KEY = 128;
const MAX_VERSION = 32;
const MAX_STYLES = 5;

function fail(reason) {
  return { ok: false, reason };
}

function optionalString(value, max, field, allowEmpty = false) {
  if (value === undefined || value === null) return { ok: true, value: undefined };
  if (typeof value !== 'string' || (!allowEmpty && value.length === 0) || value.length > max) {
    return { ok: false, reason: `invalid ${field}` };
  }
  return { ok: true, value };
}

function normalizePermissions(raw, styles) {
  let value;
  if (raw === undefined) {
    value = [...DEFAULT_PERMISSIONS];
  } else {
    if (!Array.isArray(raw) || raw.length > PYRAMID_PERMISSIONS.length) {
      return fail('invalid permissions');
    }
    value = [];
    for (const permission of raw) {
      if (typeof permission !== 'string' || !PYRAMID_PERMISSION_SET.has(permission)) {
        return fail('invalid permission entry');
      }
      if (!value.includes(permission)) value.push(permission);
    }
  }
  if (value.includes('advanced') && !value.includes('editor')) {
    return fail('advanced permission requires editor');
  }
  if (styles.length > 0 && !value.includes('styles')) {
    return fail('styles require the styles permission');
  }
  return { ok: true, value };
}

function validateManifest(raw, dirName) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return fail('manifest must be an object');
  }

  const { id } = raw;
  if (typeof id !== 'string' || !PLUGIN_ID_RE.test(id)) return fail('invalid id');
  if (id !== dirName) return fail('id does not match directory name');

  if (typeof raw.version !== 'string' || raw.version.length === 0 || raw.version.length > MAX_VERSION) {
    return fail('invalid version');
  }
  if (!Number.isInteger(raw.apiVersion) || raw.apiVersion < 1) {
    return fail('invalid apiVersion');
  }
  if (typeof raw.main !== 'string' || !PLUGIN_MAIN_RE.test(raw.main)) {
    return fail('invalid main');
  }

  const styles = raw.styles === undefined ? [] : raw.styles;
  if (!Array.isArray(styles) || styles.length > MAX_STYLES) {
    return fail('invalid styles');
  }
  for (const style of styles) {
    if (typeof style !== 'string' || !PLUGIN_STYLE_RE.test(style)) {
      return fail('invalid styles entry');
    }
  }

  const permissions = normalizePermissions(raw.permissions, styles);
  if (!permissions.ok) return permissions;

  if (typeof raw.defaultEnabled !== 'boolean') return fail('invalid defaultEnabled');

  const name = optionalString(raw.name, MAX_NAME, 'name');
  if (!name.ok) return name;
  const description = optionalString(raw.description, MAX_DESCRIPTION, 'description', true);
  if (!description.ok) return description;
  const nameKey = optionalString(raw.nameKey, MAX_KEY, 'nameKey');
  if (!nameKey.ok) return nameKey;
  const descriptionKey = optionalString(raw.descriptionKey, MAX_KEY, 'descriptionKey');
  if (!descriptionKey.ok) return descriptionKey;

  return {
    ok: true,
    manifest: {
      id,
      name: name.value,
      description: description.value,
      nameKey: nameKey.value,
      descriptionKey: descriptionKey.value,
      version: raw.version,
      apiVersion: raw.apiVersion,
      main: raw.main,
      styles: [...styles],
      defaultEnabled: raw.defaultEnabled,
      permissions: permissions.value,
    },
  };
}

function compareVersions(a, b) {
  const left = String(a).split('.').map((part) => Number.parseInt(part, 10) || 0);
  const right = String(b).split('.').map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const l = left[index] ?? 0;
    const r = right[index] ?? 0;
    if (l > r) return 1;
    if (l < r) return -1;
  }
  return 0;
}

module.exports = {
  PLUGIN_API_VERSION,
  PLUGIN_ID_RE,
  PLUGIN_MAIN_RE,
  PLUGIN_STYLE_RE,
  PYRAMID_PERMISSIONS,
  normalizePermissions,
  validateManifest,
  compareVersions,
};
