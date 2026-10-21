import { argon2id } from "@noble/hashes/argon2.js";

// Only accept the parameters emitted by the previous CRM, keeping login work bounded.
const LEGACY_HASH = /^\$argon2id\$v=19\$m=19456,t=2,p=1\$([A-Za-z0-9+/]{22})\$([A-Za-z0-9+/]{43})$/;

export function isLegacyPasswordHash(encoded) {
  return LEGACY_HASH.test(String(encoded || ""));
}

export function verifyLegacyPassword(password, encoded) {
  const match = LEGACY_HASH.exec(String(encoded || ""));
  if (!match || typeof password !== "string") return false;
  const decode = (value) => Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  const expected = decode(match[2]);
  const actual = argon2id(password, decode(match[1]), { m: 19456, t: 2, p: 1, dkLen: 32, maxmem: 20 * 1024 * 1024 });
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= actual[index] ^ expected[index];
  actual.fill(0);
  return difference === 0;
}
