/* Client-side encrypted vault primitives. This module performs no storage or network I/O. */
(function (g) {
  'use strict';
  const HA = (g.HA = g.HA || {});
  const FORMAT_VERSION = 1, STATE_SCHEMA_VERSION = 4;
  const KDF_NAME = 'PBKDF2', KDF_HASH = 'SHA-256', KDF_ITERATIONS = 600000;
  const CIPHER_NAME = 'AES-256-GCM', NONCE_BYTES = 12, SALT_BYTES = 16, KEY_BYTES = 32, TAG_BYTES = 16;
  const enc = new TextEncoder(), dec = new TextDecoder('utf-8', { fatal: true });
  const subtle = g.crypto && g.crypto.subtle;

  function requireCrypto() {
    if (!subtle || !g.crypto.getRandomValues) throw new Error('Web Crypto is unavailable.');
  }
  function randomBytes(length) {
    requireCrypto();
    return g.crypto.getRandomValues(new Uint8Array(length));
  }
  function toBase64Url(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return g.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
  function fromBase64Url(value, expectedLength, label) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error(`${label} encoding is invalid.`);
    let binary;
    try {
      const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
      binary = g.atob(base64);
    } catch (e) { throw new Error(`${label} encoding is invalid.`); }
    const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
    if (expectedLength !== undefined && bytes.length !== expectedLength) throw new Error(`${label} has an invalid length.`);
    if (toBase64Url(bytes) !== value) throw new Error(`${label} encoding is not canonical.`);
    return bytes;
  }
  function accountIdValue(value) {
    if (typeof value !== 'string' || !value || value.length > 128 || /[\u0000-\u001f\u007f]/.test(value)) throw new Error('Account metadata is invalid.');
    return value;
  }
  function positiveInteger(value, label) {
    if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${label} is invalid.`);
    return value;
  }
  function snapshotMetadata(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Snapshot metadata is invalid.');
    const formatVersion = value.formatVersion === undefined ? FORMAT_VERSION : value.formatVersion;
    if (formatVersion !== FORMAT_VERSION) throw new Error('Snapshot format is unsupported.');
    const schemaVersion = value.schemaVersion;
    if (schemaVersion !== STATE_SCHEMA_VERSION) throw new Error('Only the current v4 state schema can be encrypted.');
    return {
      accountId: accountIdValue(value.accountId),
      revision: positiveInteger(value.revision, 'Snapshot revision'),
      formatVersion,
      schemaVersion,
      keyVersion: positiveInteger(value.keyVersion, 'Vault key version')
    };
  }
  function snapshotAad(meta) {
    return enc.encode(JSON.stringify(['HunterArsenal', 'encrypted-vault-snapshot', meta.formatVersion, meta.accountId, meta.revision, meta.schemaVersion, meta.keyVersion]));
  }
  function envelopeAad(meta) {
    return enc.encode(JSON.stringify(['HunterArsenal', 'vault-key-envelope', meta.envelopeVersion, meta.accountId, meta.keyVersion, meta.kdf.name, meta.kdf.hash, meta.kdf.iterations, meta.kdf.salt, meta.wrap.name]));
  }
  function validateStateText(serialized) {
    if (typeof serialized !== 'string') throw new Error('Serialized state must be a string.');
    let state;
    try { state = JSON.parse(serialized); } catch (e) { throw new Error('Serialized state is not valid JSON.'); }
    if (!state || typeof state !== 'object' || Array.isArray(state) || state.v !== STATE_SCHEMA_VERSION) throw new Error('Serialized state is not a current v4 record.');
    if (!HA.Store || typeof HA.Store.validateInput !== 'function') throw new Error('HunterArsenal state validation is unavailable.');
    HA.Store.validateInput(state, { requireCurrent: true });
  }
  async function deriveWrappingKey(recoveryBytes, salt, iterations, usage) {
    const material = await subtle.importKey('raw', recoveryBytes, KDF_NAME, false, ['deriveKey']);
    return subtle.deriveKey({ name: KDF_NAME, hash: KDF_HASH, salt, iterations }, material,
      { name: 'AES-GCM', length: 256 }, false, [usage]);
  }
  function validateEnvelope(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.app !== 'HunterArsenal' || value.format !== 'vault-key-envelope' || value.envelopeVersion !== FORMAT_VERSION) throw new Error('Key envelope is invalid or unsupported.');
    const accountId = accountIdValue(value.accountId), keyVersion = positiveInteger(value.keyVersion, 'Vault key version');
    const kdf = value.kdf, wrap = value.wrap;
    if (!kdf || kdf.name !== KDF_NAME || kdf.hash !== KDF_HASH || !Number.isInteger(kdf.iterations) || kdf.iterations < KDF_ITERATIONS || kdf.iterations > 5000000) throw new Error('Key envelope KDF settings are invalid.');
    if (!wrap || wrap.name !== CIPHER_NAME) throw new Error('Key envelope cipher is unsupported.');
    fromBase64Url(kdf.salt, SALT_BYTES, 'Key envelope salt');
    fromBase64Url(wrap.nonce, NONCE_BYTES, 'Key envelope nonce');
    fromBase64Url(wrap.ciphertext, KEY_BYTES + TAG_BYTES, 'Wrapped vault key');
    return {
      accountId, keyVersion,
      kdf: { name: kdf.name, hash: kdf.hash, iterations: kdf.iterations, salt: kdf.salt },
      wrap: { name: wrap.name, nonce: wrap.nonce, ciphertext: wrap.ciphertext }
    };
  }
  function validateSnapshot(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.app !== 'HunterArsenal' || value.format !== 'encrypted-vault-snapshot') throw new Error('Encrypted snapshot is invalid.');
    const meta = snapshotMetadata(value);
    if (!value.cipher || value.cipher.name !== CIPHER_NAME) throw new Error('Snapshot cipher is unsupported.');
    fromBase64Url(value.cipher.nonce, NONCE_BYTES, 'Snapshot nonce');
    const ciphertext = fromBase64Url(value.ciphertext, undefined, 'Snapshot ciphertext');
    if (ciphertext.length < TAG_BYTES) throw new Error('Snapshot ciphertext is incomplete.');
    return { meta, nonce: value.cipher.nonce, ciphertext: value.ciphertext };
  }

  async function createKeyEnvelope(accountId, keyVersion = 1) {
    requireCrypto();
    accountId = accountIdValue(accountId);
    keyVersion = positiveInteger(keyVersion, 'Vault key version');
    const recoveryBytes = randomBytes(KEY_BYTES), dataKeyBytes = randomBytes(KEY_BYTES), salt = randomBytes(SALT_BYTES), nonce = randomBytes(NONCE_BYTES);
    const recoveryKey = toBase64Url(recoveryBytes);
    const metadata = {
      envelopeVersion: FORMAT_VERSION, accountId, keyVersion,
      kdf: { name: KDF_NAME, hash: KDF_HASH, iterations: KDF_ITERATIONS, salt: toBase64Url(salt) },
      wrap: { name: CIPHER_NAME }
    };
    try {
      const wrappingKey = await deriveWrappingKey(recoveryBytes, salt, KDF_ITERATIONS, 'encrypt');
      const wrapped = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv: nonce, additionalData: envelopeAad(metadata) }, wrappingKey, dataKeyBytes));
      const key = await subtle.importKey('raw', dataKeyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
      return {
        key,
        recoveryKey,
        envelope: {
          app: 'HunterArsenal', format: 'vault-key-envelope', envelopeVersion: FORMAT_VERSION, accountId, keyVersion,
          kdf: metadata.kdf,
          wrap: { name: CIPHER_NAME, nonce: toBase64Url(nonce), ciphertext: toBase64Url(wrapped) }
        }
      };
    } finally {
      recoveryBytes.fill(0); dataKeyBytes.fill(0); salt.fill(0); nonce.fill(0);
    }
  }

  async function unwrapKeyEnvelope(recoveryKey, value, expectedAccountId) {
    requireCrypto();
    const envelope = validateEnvelope(value);
    if (expectedAccountId !== undefined && envelope.accountId !== accountIdValue(expectedAccountId)) throw new Error('Key envelope belongs to a different account.');
    const recoveryBytes = fromBase64Url(recoveryKey, KEY_BYTES, 'Recovery key');
    const salt = fromBase64Url(envelope.kdf.salt, SALT_BYTES, 'Key envelope salt');
    const nonce = fromBase64Url(envelope.wrap.nonce, NONCE_BYTES, 'Key envelope nonce');
    const wrapped = fromBase64Url(envelope.wrap.ciphertext, KEY_BYTES + TAG_BYTES, 'Wrapped vault key');
    const metadata = { envelopeVersion: FORMAT_VERSION, accountId: envelope.accountId, keyVersion: envelope.keyVersion, kdf: envelope.kdf, wrap: envelope.wrap };
    try {
      const wrappingKey = await deriveWrappingKey(recoveryBytes, salt, envelope.kdf.iterations, 'decrypt');
      const rawKey = new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: nonce, additionalData: envelopeAad(metadata) }, wrappingKey, wrapped));
      try { return await subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt', 'decrypt']); }
      finally { rawKey.fill(0); }
    } finally { recoveryBytes.fill(0); salt.fill(0); nonce.fill(0); wrapped.fill(0); }
  }

  async function encryptSnapshot(serializedState, key, metadata) {
    requireCrypto();
    validateStateText(serializedState);
    const meta = snapshotMetadata(metadata), nonce = randomBytes(NONCE_BYTES);
    const plaintext = enc.encode(serializedState);
    let ciphertext;
    try {
      ciphertext = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv: nonce, additionalData: snapshotAad(meta) }, key, plaintext));
      return {
        app: 'HunterArsenal', format: 'encrypted-vault-snapshot',
        accountId: meta.accountId, revision: meta.revision, formatVersion: meta.formatVersion,
        schemaVersion: meta.schemaVersion, keyVersion: meta.keyVersion,
        cipher: { name: CIPHER_NAME, nonce: toBase64Url(nonce) }, ciphertext: toBase64Url(ciphertext)
      };
    } finally {
      plaintext.fill(0); nonce.fill(0);
      if (ciphertext) ciphertext.fill(0);
    }
  }

  async function decryptSnapshot(value, key, expectedMetadata) {
    requireCrypto();
    if (typeof value === 'string') {
      try { value = JSON.parse(value); } catch (e) { throw new Error('Encrypted snapshot is not valid JSON.'); }
    }
    const parsed = validateSnapshot(value);
    if (expectedMetadata !== undefined) {
      const expected = snapshotMetadata(expectedMetadata);
      if (JSON.stringify(expected) !== JSON.stringify(parsed.meta)) throw new Error('Snapshot metadata does not match the expected account or revision.');
    }
    const nonce = fromBase64Url(parsed.nonce, NONCE_BYTES, 'Snapshot nonce');
    const ciphertext = fromBase64Url(parsed.ciphertext, undefined, 'Snapshot ciphertext');
    let plaintext;
    try {
      plaintext = new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: nonce, additionalData: snapshotAad(parsed.meta) }, key, ciphertext));
      const serialized = dec.decode(plaintext);
      validateStateText(serialized);
      return serialized;
    } finally {
      if (plaintext) plaintext.fill(0);
      nonce.fill(0); ciphertext.fill(0);
    }
  }

  HA.CloudCrypto = Object.freeze({
    FORMAT_VERSION, STATE_SCHEMA_VERSION, KDF_ITERATIONS,
    createKeyEnvelope, unwrapKeyEnvelope, encryptSnapshot, decryptSnapshot
  });
})(typeof self !== 'undefined' ? self : window);
