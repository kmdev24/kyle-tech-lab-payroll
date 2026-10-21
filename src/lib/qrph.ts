/**
 * QR Ph (InstaPay) helpers.
 *
 * QR Ph follows EMVCo merchant-presented QR: a flat list of TLV fields
 * (2-digit tag, 2-digit length, value) ending in tag 63 = CRC16/CCITT-FALSE.
 * Given the static QR string from Mom's own "Receive money" QR (GoTyme, GCash,
 * Maya...), we can set the transaction amount (tag 54), mark it dynamic
 * (tag 01 = "12") and recompute the CRC, so scanning it in the UnionBank app
 * pre-fills both the destination and the exact amount.
 */

type Field = { tag: string; value: string };

export function crc16(input: string) {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function parseTlv(payload: string): Field[] {
  const fields: Field[] = [];
  let i = 0;
  while (i < payload.length) {
    const tag = payload.slice(i, i + 2);
    const len = Number(payload.slice(i + 2, i + 4));
    if (tag.length < 2 || Number.isNaN(len)) throw new Error("Malformed QR Ph payload");
    const value = payload.slice(i + 4, i + 4 + len);
    if (value.length !== len) throw new Error("Malformed QR Ph payload");
    fields.push({ tag, value });
    i += 4 + len;
  }
  return fields;
}

const encode = (f: Field) => `${f.tag}${String(f.value.length).padStart(2, "0")}${f.value}`;

/** Returns null when valid, or an error message. */
export function validateQrPh(payload: string): string | null {
  const p = payload.trim();
  if (!p) return null;
  try {
    const fields = parseTlv(p);
    if (fields[0]?.tag !== "00") return "Payload must start with tag 00";
    const crcField = fields[fields.length - 1];
    if (crcField?.tag !== "63") return "Payload must end with CRC tag 63";
    if (crc16(p.slice(0, -4)) !== crcField.value.toUpperCase()) return "CRC check failed (was the text copied completely?)";
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

export function withAmount(payload: string, amountPhp: number) {
  const fields = parseTlv(payload.trim()).filter((f) => f.tag !== "63" && f.tag !== "54");
  const pi = fields.find((f) => f.tag === "01");
  if (pi) pi.value = "12";
  fields.push({ tag: "54", value: amountPhp.toFixed(2) });
  fields.sort((a, b) => Number(a.tag) - Number(b.tag));
  const body = fields.map(encode).join("") + "6304";
  return body + crc16(body);
}
