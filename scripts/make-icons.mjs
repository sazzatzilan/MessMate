import fs from "fs";
import path from "path";
import zlib from "zlib";

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const color = pixels(x, y, size);
      const offset = row + 1 + x * 4;
      raw[offset] = color[0];
      raw[offset + 1] = color[1];
      raw[offset + 2] = color[2];
      raw[offset + 3] = color[3];
    }
  }
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function plate(x, y, size, pad) {
  const nx = (x + 0.5) / size;
  const ny = (y + 0.5) / size;
  const inset = pad;
  const left = inset;
  const right = 1 - inset;
  const radius = 0.22;
  const inside =
    nx >= left &&
    nx <= right &&
    ny >= left &&
    ny <= right &&
    rounded(nx, ny, left, right, radius);
  if (!inside) return [0, 0, 0, 0];
  const cx = 0.5;
  const cy = 0.52;
  const dx = nx - cx;
  const dy = ny - cy;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance < 0.16) return [243, 239, 230, 255];
  if (distance < 0.2) return [255, 253, 248, 255];
  return [15, 110, 86, 255];
}

function rounded(nx, ny, left, right, radius) {
  const cx = Math.min(Math.max(nx, left + radius), right - radius);
  const cy = Math.min(Math.max(ny, left + radius), right - radius);
  const dx = nx - cx;
  const dy = ny - cy;
  return dx * dx + dy * dy <= radius * radius || (nx > left + radius && nx < right - radius) || (ny > left + radius && ny < right - radius);
}

const dir = path.join(process.cwd(), "public", "icons");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "icon-192.png"), png(192, (x, y, size) => plate(x, y, size, 0)));
fs.writeFileSync(path.join(dir, "icon-512.png"), png(512, (x, y, size) => plate(x, y, size, 0)));
fs.writeFileSync(path.join(dir, "icon-maskable-512.png"), png(512, (x, y, size) => plate(x, y, size, 0.12)));
console.log("Wrote app icons.");
