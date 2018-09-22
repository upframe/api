const { createLogger, transports, format } = require('winston')
const { combine, timestamp, printf, colorize } = format

let printFormat = printf(info => {
  return `${info.timestamp} [${info.level}]: ${info.message}`
})

let logger = createLogger({
  transports: [
    new transports.Console({
      silent: process.env.NODE_ENV !== 'dev',
      level: 'debug',
      handleExceptions: true,
      json: false,
      format: combine(colorize(), timestamp(), printFormat)
    }),
    new transports.File({
      level: 'info',
      filename: 'app.log',
      handleExceptions: true,
      json: true,
      maxsize: 20971520,
      maxFiles: 5,
      colorize: false,
      format: combine(timestamp(), printFormat)
    })
  ],
  exitOnError: false
})

module.exports = logger