require('string.prototype.matchall').shim()
require('array.prototype.flatmap').shim()

import './env'

import express from 'express'

import bodyParser from 'body-parser'
import busboy from 'connect-busboy'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import morgan from 'morgan'

import * as routers from './routes'
import { logger } from './services'
import { calendar } from './utils'

const app: express.Application = express()

/* Middleware configuration */
const corsOptions = {
  credentials: true,
  origin:
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : [
          'https://upframe.io',
          'https://connect.upframe.io',
          'https://upfra.me',
          'https://beta.upframe.io',
          'https://dashboard.upframe.io',
        ],
}

app.use(cors(corsOptions))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cookieParser())
app.use(
  busboy({
    highWaterMark: 2 * 1024 * 1024, // Set 2MiB buffer
    limits: {
      fileSize: 5 * 1024 * 1024, // Max size of 5MB
    },
  })
)

/* Avoid empty POST requests */
app.use((req: express.Request, res: express.Response, next: any) => {
  if (
    Object.keys(req.body).length === 0 &&
    req.method === 'POST' &&
    req.path !== '/profile/image'
  ) {
    const response = {
      code: 400,
      ok: 0,
      message: 'Request body cannot be empty',
    }

    res.status(response.code).json(response)
    return
  }

  next()
})

/* Logs configuration */
app.use(
  morgan(
    ':remote-addr [:date[web]] :method :url :status :response-time ms - :res[content-length]'
  )
)
app.set('logger', logger)

/* Routing */
routers.init(app)

calendar.init()

const port = process.env.PORT || 80
app.listen(port, () => {
  logger.info('API started!')
  logger.info('API listening on port ' + port)
})
