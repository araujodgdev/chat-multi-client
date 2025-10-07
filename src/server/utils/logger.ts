import { createLogger, format, transports } from 'winston';
import { getConfig } from '../../shared/index.js';

const { combine, timestamp, printf, colorize } = format;

const configuration = getConfig();

const formatter = printf(({ level, message, timestamp: ts, ...meta }) => {
  const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${ts}] ${level}: ${message}${metaString}`;
});

export const logger = createLogger({
  level: configuration.server.logLevel,
  format: combine(timestamp(), formatter),
  transports: [
    new transports.File({
      filename: configuration.server.logFile,
      maxsize: configuration.server.logMaxSize,
      maxFiles: 5
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new transports.Console({
      level: configuration.server.logLevel,
      format: combine(colorize(), timestamp(), formatter)
    })
  );
}
