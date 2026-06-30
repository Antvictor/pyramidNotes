#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";
import gifenc from "gifenc";

const { GIFEncoder, quantize, applyPalette } = gifenc;

const manifestPath = process.argv[2];

if (!manifestPath) {
  console.error("ERROR: Missing manifest path");
  process.exit(1);
}

const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
const outputPath = manifest.output;
const frames = manifest.frames;

if (!outputPath) {
  console.error("ERROR: Missing output path in manifest");
  process.exit(1);
}

if (!Array.isArray(frames) || frames.length === 0) {
  console.error("ERROR: No frames in manifest");
  process.exit(1);
}

function containScale(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  return Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
}

function compositeContainedFrame(decoded, targetWidth, targetHeight) {
  const scale = containScale(decoded.width, decoded.height, targetWidth, targetHeight);
  const scaledWidth = Math.max(1, Math.round(decoded.width * scale));
  const scaledHeight = Math.max(1, Math.round(decoded.height * scale));
  const offsetX = Math.floor((targetWidth - scaledWidth) / 2);
  const offsetY = Math.floor((targetHeight - scaledHeight) / 2);
  const output = new Uint8Array(targetWidth * targetHeight * 4);

  for (let index = 0; index < output.length; index += 4) {
    output[index] = 255;
    output[index + 1] = 255;
    output[index + 2] = 255;
    output[index + 3] = 255;
  }

  for (let y = 0; y < scaledHeight; y += 1) {
    const sourceY = Math.min(decoded.height - 1, Math.floor(y / scale));
    for (let x = 0; x < scaledWidth; x += 1) {
      const sourceX = Math.min(decoded.width - 1, Math.floor(x / scale));
      const sourceIndex = (sourceY * decoded.width + sourceX) * 4;
      const targetIndex = ((offsetY + y) * targetWidth + (offsetX + x)) * 4;
      output[targetIndex] = decoded.data[sourceIndex];
      output[targetIndex + 1] = decoded.data[sourceIndex + 1];
      output[targetIndex + 2] = decoded.data[sourceIndex + 2];
      output[targetIndex + 3] = decoded.data[sourceIndex + 3];
    }
  }

  return output;
}

const decodedFrames = [];
let targetWidth = 0;
let targetHeight = 0;

for (const frame of frames) {
  const pngBuffer = await fs.readFile(frame.path);
  const decoded = PNG.sync.read(pngBuffer);
  decodedFrames.push({ ...frame, decoded });
  targetWidth = Math.max(targetWidth, decoded.width);
  targetHeight = Math.max(targetHeight, decoded.height);
}

const encoder = GIFEncoder();

for (const frame of decodedFrames) {
  const rgba = compositeContainedFrame(frame.decoded, targetWidth, targetHeight);
  const palette = quantize(rgba, 128);
  const index = applyPalette(rgba, palette);

  encoder.writeFrame(index, targetWidth, targetHeight, {
    palette,
    delay: frame.delayMs,
  });
}

encoder.finish();
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, Buffer.from(encoder.bytes()));
console.log(outputPath);
