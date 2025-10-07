import cluster from 'node:cluster';
import os from 'node:os';
import { getConfig } from '../shared/config.js';
import { logger } from './utils/logger.js';

const config = getConfig();

const computeWorkers = (): number => {
  if (config.cluster.workers === 'auto') {
    return os.cpus().length;
  }
  return config.cluster.workers;
};

if (cluster.isPrimary) {
  const workers = computeWorkers();
  logger.info(`Inicializando cluster com ${workers} workers`);

  for (let i = 0; i < workers; i += 1) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    logger.warn('Worker finalizado', {
      workerId: worker.id,
      code,
      signal
    });
    logger.info('Reiniciando novo worker');
    cluster.fork();
  });
} else {
  await import('./index.js');
}
