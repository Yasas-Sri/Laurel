/**
 * UUIDv7 (RFC 9562): 48-bit Unix-millisecond timestamp, then random bits. Sorts by creation time,
 * which keeps primary-key indexes compact.
 *
 * ponytail: no monotonic counter, so IDs made in the same millisecond sort randomly among
 * themselves; add RFC 9562 §6.2 method 1 if a caller ever needs strict in-process ordering.
 */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const view = new DataView(bytes.buffer);
  const ms = Date.now();
  view.setUint16(0, Math.floor(ms / 2 ** 32));
  view.setUint32(2, ms % 2 ** 32);
  view.setUint8(6, (view.getUint8(6) & 0x0f) | 0x70); // version 7
  view.setUint8(8, (view.getUint8(8) & 0x3f) | 0x80); // variant 10
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
