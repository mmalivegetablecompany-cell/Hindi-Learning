const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// Simple pure Node.js PNG generator with Diya / Book / Text design
function createPng(width, height) {
  // We'll generate raw RGBA buffer
  const buffer = Buffer.alloc(width * height * 4);

  const cx = width / 2;
  const cy = height / 2;
  const rOuter = width * 0.45;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Gradient background (Deep navy to royal blue)
      const t = (x + y) / (width + height);
      let r = Math.floor(30 * (1 - t) + 15 * t);
      let g = Math.floor(58 * (1 - t) + 23 * t);
      let b = Math.floor(138 * (1 - t) + 42 * t);
      let a = 255;

      const dist = Math.hypot(x - cx, y - cy);

      // Gold border ring
      if (Math.abs(dist - rOuter) < width * 0.03) {
        r = 245; g = 158; b = 11;
      }

      // Golden Diya / Book shape in center
      // Book Base (lower half)
      const bookTop = height * 0.52;
      const bookBottom = height * 0.72;
      const bookLeft = width * 0.22;
      const bookRight = width * 0.78;

      if (y >= bookTop && y <= bookBottom && x >= bookLeft && x <= bookRight) {
        // Book white page
        r = 248; g = 250; b = 252;
        // Spine center
        if (Math.abs(x - cx) < width * 0.015) {
          r = 148; g = 163; b = 184;
        }
      }

      // Diya Bowl (around height 0.48)
      const diyaY = height * 0.46;
      const dx = (x - cx) / (width * 0.22);
      const dy = (y - diyaY) / (height * 0.08);
      if (dy >= 0 && dy <= 1 && (dx * dx + dy * dy <= 1)) {
        r = 217; g = 119; b = 6; // Golden brown diya
      }

      // Flame (above diya)
      const flameBaseY = height * 0.45;
      const flamePeakY = height * 0.22;
      if (y <= flameBaseY && y >= flamePeakY) {
        const fy = (flameBaseY - y) / (flameBaseY - flamePeakY);
        const fw = (1 - fy * 0.7) * Math.sin(fy * Math.PI) * (width * 0.12);
        if (Math.abs(x - cx) <= fw) {
          // Flame gradient yellow/orange/red
          if (fy > 0.7) {
            r = 254; g = 240; b = 138;
          } else if (fy > 0.3) {
            r = 245; g = 158; b = 11;
          } else {
            r = 220; g = 38; b = 38;
          }
        }
      }

      // Rounded app corner clipping
      const cornerRadius = width * 0.2;
      const inCornerX = x < cornerRadius ? cornerRadius - x : (x > width - cornerRadius ? x - (width - cornerRadius) : 0);
      const inCornerY = y < cornerRadius ? cornerRadius - y : (y > height - cornerRadius ? y - (height - cornerRadius) : 0);
      if (inCornerX > 0 && inCornerY > 0) {
        if (inCornerX * inCornerX + inCornerY * inCornerY > cornerRadius * cornerRadius) {
          a = 0;
        }
      }

      buffer[idx] = r;
      buffer[idx + 1] = g;
      buffer[idx + 2] = b;
      buffer[idx + 3] = a;
    }
  }

  // Encode to uncompressed/deflated PNG
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    rawData[y * rowSize] = 0; // Filter type 0 (None)
    buffer.copy(rawData, y * rowSize + 1, y * width * 4, (y + 1) * width * 4);
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', deflated);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(12 + length);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4);
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + length));
  chunk.writeInt32BE(crc, 8 + length);
  return chunk;
}

// CRC32 implementation for PNG
function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return crc ^ (-1);
}

const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

const iconDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

fs.writeFileSync(path.join(iconDir, 'icon-192.png'), createPng(192, 192));
fs.writeFileSync(path.join(iconDir, 'icon-512.png'), createPng(512, 512));
console.log('PNG Icons successfully generated!');
