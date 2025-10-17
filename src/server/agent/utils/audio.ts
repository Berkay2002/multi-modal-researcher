import { Buffer } from "node:buffer";
import { writeFile } from "node:fs/promises";

export type WaveFileOptions = {
  channels: number;
  sampleRate: number; // Hz
  sampleWidth: number; // bytes per sample (e.g., 2 for 16-bit PCM)
};

/**
 * WAV (RIFF) header constants and offsets (PCM)
 * Spec: https://web.archive.org/web/20171215045605/http://soundfile.sapp.org/doc/WaveFormat/
 */
const WAV = {
  // Strings
  CHUNK_ID: "RIFF",
  FORMAT: "WAVE",
  SUBCHUNK1_ID: "fmt ",
  SUBCHUNK2_ID: "data",

  // Sizes
  HEADER_SIZE: 44, // RIFF (12) + fmt (24) + data header (8)
  SUBCHUNK1_SIZE: 16, // PCM
  RIFF_HEADER_DATA_BYTES: 36, // 4 ("WAVE") + (8 + Subchunk1Size) + 8 (data header)
} as const;

const OFFSETS = {
  CHUNK_ID: 0,
  CHUNK_SIZE: 4,
  FORMAT: 8,
  SUBCHUNK1_ID: 12,
  SUBCHUNK1_SIZE: 16,
  AUDIO_FORMAT: 20,
  NUM_CHANNELS: 22,
  SAMPLE_RATE: 24,
  BYTE_RATE: 28,
  BLOCK_ALIGN: 32,
  BITS_PER_SAMPLE: 34,
  SUBCHUNK2_ID: 36,
  SUBCHUNK2_SIZE: 40,
} as const;

const AUDIO_FORMAT = {
  PCM: 1, // Linear PCM
} as const;

const UNIT = {
  BITS_PER_BYTE: 8,
} as const;

const toBuffer = (data: Uint8Array | ArrayBuffer | Buffer): Buffer => {
  if (Buffer.isBuffer(data)) {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }
  // Uint8Array (or compatible)
  return Buffer.from(data);
};

const buildWaveHeader = (
  pcmLength: number,
  options: WaveFileOptions
): Buffer => {
  const { channels, sampleRate, sampleWidth } = options;

  const header = Buffer.alloc(WAV.HEADER_SIZE);

  const byteRate = sampleRate * channels * sampleWidth;
  const blockAlign = channels * sampleWidth;
  const bitsPerSample = sampleWidth * UNIT.BITS_PER_BYTE;

  // "RIFF"
  header.write(WAV.CHUNK_ID, OFFSETS.CHUNK_ID);
  // ChunkSize = 36 + Subchunk2Size
  header.writeUInt32LE(
    WAV.RIFF_HEADER_DATA_BYTES + pcmLength,
    OFFSETS.CHUNK_SIZE
  );
  // "WAVE"
  header.write(WAV.FORMAT, OFFSETS.FORMAT);
  // "fmt "
  header.write(WAV.SUBCHUNK1_ID, OFFSETS.SUBCHUNK1_ID);
  // Subchunk1Size (PCM)
  header.writeUInt32LE(WAV.SUBCHUNK1_SIZE, OFFSETS.SUBCHUNK1_SIZE);
  // AudioFormat = PCM
  header.writeUInt16LE(AUDIO_FORMAT.PCM, OFFSETS.AUDIO_FORMAT);
  // NumChannels
  header.writeUInt16LE(channels, OFFSETS.NUM_CHANNELS);
  // SampleRate
  header.writeUInt32LE(sampleRate, OFFSETS.SAMPLE_RATE);
  // ByteRate = SampleRate * NumChannels * BytesPerSample
  header.writeUInt32LE(byteRate, OFFSETS.BYTE_RATE);
  // BlockAlign = NumChannels * BytesPerSample
  header.writeUInt16LE(blockAlign, OFFSETS.BLOCK_ALIGN);
  // BitsPerSample
  header.writeUInt16LE(bitsPerSample, OFFSETS.BITS_PER_SAMPLE);
  // "data"
  header.write(WAV.SUBCHUNK2_ID, OFFSETS.SUBCHUNK2_ID);
  // Subchunk2Size
  header.writeUInt32LE(pcmLength, OFFSETS.SUBCHUNK2_SIZE);

  return header;
};

export const writeWaveFile = async (
  filePath: string,
  data: Uint8Array | ArrayBuffer | Buffer,
  options: WaveFileOptions
): Promise<void> => {
  const pcmBuffer = toBuffer(data);
  const header = buildWaveHeader(pcmBuffer.length, options);
  await writeFile(filePath, Buffer.concat([header, pcmBuffer]));
};
