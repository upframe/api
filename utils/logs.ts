import { createLogger, format, transports, Logger } from 'winston'

const { combine, timestamp, printf, colorize } = format

let printFormat = printf((info: any) => {
  return `${info.timestamp} [${info.level}]: ${info.message}`
})

export let logger: Logger = createLogger({
  transports: [
    new transports.Console({
      silent: process.env.NODE_ENV !== 'production',
      level: 'info',
      format: combine(colorize(), timestamp(), printFormat)
    }),
    new transports.Console({
      silent: process.env.NODE_ENV !== 'dev',
      level: 'debug',
      handleExceptions: true,
      format: combine(colorize(), timestamp(), printFormat)
    }),
    new transports.File({
      level: 'silly',
      filename: 'app.log',
      handleExceptions: true,
      maxsize: 20971520,
      maxFiles: 5,
      format: combine(timestamp(), printFormat)
    })
  ],
  exitOnError: false
})