/* Standard sync transport and review logic. It never reads/writes localStorage or app state. */
(function (g) {
  'use strict';
  const HA = (g.HA = g.HA || {});
  const FORMAT = 'standard-cloud-snapshot', FORMAT_VERSION = 1, SCHEMA_VERSION = 4;
  const INITIAL_CONFIRMATION = 'UPLOAD INITIAL CLOUD SNAPSHOT';
  const replacementConfirmation = revision => `REPLACE CLOUD REVISION ${revision} AFTER EXPORTING A COPY`;
  const RESTORE_CONFIRMATION = 'RESTORE CLOUD SNAPSHOT TO THIS DEVICE';
  let reviewSequence = 0, restoreSequence = 0, pendingReview = null, pendingRestore = null;

  function jsonSafe(value, seen = new Set()) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
    if (typeof value === 'number' && Number.isFinite(value)) return;
    if (typeof value !== 'object' || seen.has(value)) throw new Error('Snapshot contains a value that cannot be preserved as JSON.');
    if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new Error('Snapshot contains an unsupported object.');
    seen.add(value);
    if (Array.isArray(value)) {
      for (const item of value) jsonSafe(item, seen);
    } else {
      for (const key of Object.keys(value)) jsonSafe(value[key], seen);
    }
    seen.delete(value);
  }
  function clone(value) {
    jsonSafe(value);
    const text = JSON.stringify(value);
    if (typeof text !== 'string') throw new Error('Snapshot could not be serialized.');
    return JSON.parse(text);
  }
  function validateState(value) {
    if (typeof value === 'string') {
      try { value = JSON.parse(value); } catch (_) { throw new Error('Local snapshot is not valid JSON.'); }
    }
    if (!HA.Store || typeof HA.Store.validateInput !== 'function') throw new Error('HunterArsenal state validation is unavailable.');
    jsonSafe(value);
    HA.Store.validateInput(value, { requireCurrent: true });
    if (value.v !== SCHEMA_VERSION) throw new Error('Only the current HunterArsenal state schema can be synchronized.');
    return clone(value);
  }
  function makeSnapshot(state) {
    return { app: 'HunterArsenal', format: FORMAT, formatVersion: FORMAT_VERSION, schemaVersion: SCHEMA_VERSION, state: validateState(state) };
  }
  function validateSnapshot(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.app !== 'HunterArsenal' || value.format !== FORMAT || value.formatVersion !== FORMAT_VERSION || value.schemaVersion !== SCHEMA_VERSION) throw new Error('Standard cloud snapshot format is unsupported or malformed.');
    const keys = Object.keys(value).sort().join(',');
    if (keys !== 'app,format,formatVersion,schemaVersion,state') throw new Error('Standard cloud snapshot contains unsupported fields.');
    return makeSnapshot(value.state);
  }
  function canonical(value) {
    if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
    if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
    return JSON.stringify(value);
  }
  function revisionOf(value) {
    const revision = typeof value === 'string' && /^[0-9]+$/.test(value) ? Number(value) : value;
    if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('Cloud snapshot revision is invalid.');
    return revision;
  }
  function validateRow(row) {
    if (row === null) return null;
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('Cloud snapshot record is malformed.');
    return { revision: revisionOf(row.revision), snapshot: validateSnapshot(row.snapshot), updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null };
  }
  async function readCloud() {
    if (!HA.CloudAuth || typeof HA.CloudAuth.readStandardSnapshot !== 'function') throw new Error('Authenticated cloud access is unavailable.');
    return validateRow(await HA.CloudAuth.readStandardSnapshot());
  }
  function stateMatches(a, b) { return canonical(a) === canonical(b); }

  async function review(localState) {
    const local = localState === null ? null : makeSnapshot(localState);
    const cloud = await readCloud();
    const status = !local && !cloud ? 'empty'
      : !local ? 'cloud-only'
        : !cloud ? 'local-only'
          : stateMatches(local.state, cloud.snapshot.state) ? 'same' : 'different';
    const handle = Object.freeze({ id: ++reviewSequence });
    pendingReview = { handle, local, cloud, cloudRevision: cloud ? cloud.revision : 0, status };
    return Object.freeze({
      handle, status,
      localSchemaVersion: local ? local.schemaVersion : null,
      localSnapshot: local ? clone(local) : null,
      cloudSchemaVersion: cloud ? cloud.snapshot.schemaVersion : null,
      cloudRevision: cloud ? cloud.revision : 0,
      cloudUpdatedAt: cloud ? cloud.updatedAt : null,
      cloudSnapshot: cloud ? clone(cloud.snapshot) : null,
      confirmation: status === 'local-only' ? INITIAL_CONFIRMATION : status === 'different' ? replacementConfirmation(cloud.revision) : null
    });
  }
  async function confirmUpload(reviewHandle, confirmation) {
    const staged = pendingReview;
    if (!staged || staged.handle !== reviewHandle) throw new Error('Upload review is missing or expired; compare the copies again.');
    if (staged.status !== 'local-only' && staged.status !== 'different') throw new Error('This comparison does not allow an upload.');
    const required = staged.status === 'local-only' ? INITIAL_CONFIRMATION : replacementConfirmation(staged.cloudRevision);
    if (confirmation !== required) throw new Error(`Explicit confirmation is required: ${required}`);
    pendingReview = null;

    const current = await readCloud();
    const currentRevision = current ? current.revision : 0;
    if (currentRevision !== staged.cloudRevision) return { status: 'conflict', currentRevision };
    if (current && stateMatches(current.snapshot.state, staged.local.state)) return { status: 'same', revision: current.revision };
    if (!HA.CloudAuth || typeof HA.CloudAuth.writeStandardSnapshot !== 'function') throw new Error('Authenticated cloud writing is unavailable.');
    const written = await HA.CloudAuth.writeStandardSnapshot(staged.cloudRevision, staged.local, required);
    if (!written) {
      const latest = await readCloud();
      return { status: 'conflict', currentRevision: latest ? latest.revision : 0 };
    }
    return { status: 'uploaded', revision: staged.cloudRevision + 1 };
  }
  async function downloadSnapshot() {
    const cloud = await readCloud();
    return cloud ? { revision: cloud.revision, updatedAt: cloud.updatedAt, snapshot: clone(cloud.snapshot), state: clone(cloud.snapshot.state) } : null;
  }
  async function prepareRestore(localState) {
    const comparison = await review(localState);
    const reviewed = pendingReview;
    pendingReview = null;
    const cloud = reviewed && reviewed.cloud;
    if (!cloud) return null;
    const handle = Object.freeze({ id: ++restoreSequence });
    pendingRestore = { handle, snapshot: cloud.snapshot, revision: cloud.revision };
    return Object.freeze({ handle, comparisonStatus: comparison.status, revision: cloud.revision, schemaVersion: cloud.snapshot.schemaVersion, confirmation: RESTORE_CONFIRMATION });
  }
  async function confirmRestoreCandidate(restoreHandle, confirmation) {
    const staged = pendingRestore;
    if (!staged || staged.handle !== restoreHandle) throw new Error('Restore review is missing or expired; download and validate the snapshot again.');
    if (confirmation !== RESTORE_CONFIRMATION) throw new Error(`Explicit confirmation is required: ${RESTORE_CONFIRMATION}`);
    const current = await readCloud();
    if (!current || current.revision !== staged.revision) {
      pendingRestore = null;
      return { status: 'conflict', currentRevision: current ? current.revision : 0 };
    }
    pendingRestore = null;
    return { status: 'ready', revision: staged.revision, state: validateState(staged.snapshot.state) };
  }

  HA.StandardSync = Object.freeze({
    FORMAT, FORMAT_VERSION, SCHEMA_VERSION,
    createSnapshot: makeSnapshot,
    validateSnapshot,
    review,
    confirmUpload,
    downloadSnapshot,
    prepareRestore,
    confirmRestoreCandidate
  });
})(globalThis);
