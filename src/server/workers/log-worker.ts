import { parentPort } from 'node:worker_threads';
import { appendFile, mkdir, rename, stat } from 'node:fs/promises';
import { dirname } from 'node:path';

interface LogRequest {
  type: 'WRITE';
  filePath: string;
  message: string;
  maxSize: number;
}

const ensureDirectory = async (filePath: string) => {
  await mkdir(dirname(filePath), { recursive: true });
};

const rotateIfNeeded = async (filePath: string, maxSize: number) => {
  try {
    const stats = await stat(filePath);
    if (stats.size < maxSize) return;
    const rotated = `${filePath}.${Date.now()}`;
    await rename(filePath, rotated);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw error;
  }
};

const writeLog = async (request: LogRequest) => {
  await ensureDirectory(request.filePath);
  await rotateIfNeeded(request.filePath, request.maxSize);
  await appendFile(request.filePath, `${request.message}\n`, 'utf8');
};

if (!parentPort) {
  throw new Error('log-worker must be spawned as worker thread');
}

parentPort.on('message', async (request: LogRequest) => {
  if (request.type !== 'WRITE') return;
  try {
    await writeLog(request);
  } catch (error) {
    parentPort?.postMessage({ error: (error as Error).message });
  }
});
