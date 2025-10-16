import { Buffer } from "node:buffer";
import { writeFile } from "node:fs/promises";

export type WaveFileOptions = {
  channels: number;
  sampleRate: number;
  sampleWidth: number;
};

const toBuffer = (data: Uint8Array | ArrayBuffer | Buffer): Buffer => {
  if (Buffer.isBuffer(data)) {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }

  return Buffer.from(data);
};

const buildWaveHeader = (
  pcmLength: number,
  options: WaveFileOptions,
): Buffer => {
  const { channels, sampleRate, sampleWidth } = options;
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * sampleWidth;
  const blockAlign = channels * sampleWidth;
  const bitsPerSample = sampleWidth * 8;

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmLength, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmLength, 40);

  return header;
};

export const writeWaveFile = async (
  filePath: string,
  data: Uint8Array | ArrayBuffer | Buffer,
  options: WaveFileOptions,
): Promise<void> => {
  const pcmBuffer = toBuffer(data);
  const header = buildWaveHeader(pcmBuffer.length, options);
  await writeFile(filePath, Buffer.concat([header, pcmBuffer]));
};

