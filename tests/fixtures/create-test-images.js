#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create simple PNG files for testing
// This creates minimal valid PNG files that can be used for upload testing

function createSimplePNG(width, height, r, g, b, filename) {
  // PNG file signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);     // Width
  ihdrData.writeUInt32BE(height, 4);    // Height
  ihdrData.writeUInt8(8, 8);            // Bit depth
  ihdrData.writeUInt8(2, 9);            // Color type (RGB)
  ihdrData.writeUInt8(0, 10);           // Compression method
  ihdrData.writeUInt8(0, 11);           // Filter method
  ihdrData.writeUInt8(0, 12);           // Interlace method
  
  const ihdrChunk = createChunk('IHDR', ihdrData);
  
  // IDAT chunk (minimal image data - solid color)
  const rowSize = width * 3 + 1; // 3 bytes per pixel + 1 filter byte
  const imageSize = height * rowSize;
  const imageData = Buffer.alloc(imageSize);
  
  // Fill with solid color
  for (let y = 0; y < height; y++) {
    const rowStart = y * rowSize;
    imageData[rowStart] = 0; // Filter type (None)
    
    for (let x = 0; x < width; x++) {
      const pixelStart = rowStart + 1 + x * 3;
      imageData[pixelStart] = r;     // Red
      imageData[pixelStart + 1] = g; // Green
      imageData[pixelStart + 2] = b; // Blue
    }
  }
  
  // Compress the image data (minimal zlib compression)
  const zlib = require('zlib');
  const compressedData = zlib.deflateSync(imageData);
  const idatChunk = createChunk('IDAT', compressedData);
  
  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));
  
  // Combine all chunks
  const pngData = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  
  fs.writeFileSync(filename, pngData);
  console.log(`Created ${filename} (${width}x${height}, ${pngData.length} bytes)`);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type, 'ascii');
  
  const crc = require('zlib').crc32(Buffer.concat([typeBuffer, data]));
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);
  
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// Create test images
const fixturesDir = __dirname;

// Start image - blue solid color (100x100)
createSimplePNG(100, 100, 0, 100, 255, path.join(fixturesDir, 'start-image.png'));

// End image - red solid color (100x100)  
createSimplePNG(100, 100, 255, 100, 0, path.join(fixturesDir, 'end-image.png'));

console.log('Test images created successfully!');