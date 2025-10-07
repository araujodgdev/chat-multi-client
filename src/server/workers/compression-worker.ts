import { parentPort } from 'node:worker_threads';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { PassThrough } from 'node:stream';
import { randomUUID, createHash } from 'node:crypto';

interface CompressionRequest {
  id?: string;
  fileName: string;
  buffer: ArrayBuffer;
}

interface CompressionResponse {
  id: string;
  fileName: string;
  compressed: Buffer;
  checksum: string;
}

const readableFromBuffer = (buffer: Buffer): PassThrough => {
  const stream = new PassThrough();
  stream.end(buffer);
  return stream;
};

const compressBuffer = async (fileName: string, input: Buffer): Promise<CompressionResponse> => {
  const gzip = createGzip();
  const gather = new PassThrough();
  const chunks: Buffer[] = [];
  gather.on('data', (chunk) => chunks.push(Buffer.from(chunk)));

  await pipeline(readableFromBuffer(input), gzip, gather);

  const compressed = Buffer.concat(chunks);
  const checksum = createHash('sha256').update(compressed).digest('hex');
  return {
    id: randomUUID(),
    fileName: `${fileName}.gz`,
    compressed,
    checksum
  };
};

if (!parentPort) {
  throw new Error('compression-worker must be run as worker thread');
}

parentPort.on('message', async (request: CompressionRequest) => {
  try {
    const response = await compressBuffer(request.fileName, Buffer.from(request.buffer));
    parentPort?.postMessage({ ...response, id: request.id ?? response.id });
  } catch (error) {
    parentPort?.postMessage({ error: (error as Error).message, id: request.id ?? randomUUID() });
  }
});
