import { createLogger, format, Logger, transports } from 'winston'

const { combine, timestamp, printf, colorize } = format

const printFormat = printf((info: any) => {
  return `${info.timestamp} [${info.level}]: ${info.message}`
})

export let logger: Logger = createLogger({
  exitOnError: false,
  transports: [
    new transports.Console({
      format: combine(colorize(), timestamp(), printFormat),
      level: 'info',
      silent: process.env.NODE_ENV !== 'production',
    }),
    new transports.Console({
      format: combine(colorize(), timestamp(), printFormat),
      handleExceptions: true,
      level: 'debug',
      silent: process.env.NODE_ENV !== 'development',
    }),
    new transports.File({
      filename: 'app.log',
      format: combine(timestamp(), printFormat),
      handleExceptions: true,
      maxsize: 20971520,
      maxFiles: 5,
      level: 'silly',
    }),
  ],
})
