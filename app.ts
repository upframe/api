import './env'

import express from 'express'

import bodyParser from 'body-parser'
import busboy from 'connect-busboy'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import morgan from 'morgan'

import * as routers from './routes'
import * as services from './services'
import { logger } from './utils'

const app: express.Application = express()

/* Middleware configuration */
const corsOptions = {
  credentials: true,
  origin: process.env.NODE_ENV === 'development' ?
  'http://localhost:3000' :
  ['https://connect.upframe.io', 'https://upfra.me', 'https://beta.upframe.io'],
}

app.use(cors(corsOptions))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cookieParser())
app.use(busboy({
  highWaterMark: 2 * 1024 * 1024, // Set 2MiB buffer
  limits: {
    fileSize: 5 * 1024 * 1024, // Max size of 10MB
  },
}))

/* Avoid empty POST requests */
app.use((req: express.Request, res: express.Response, next: any) => {
  if (Object.keys(req.body).length === 0 && req.method === 'POST' && req.path !== '/profile/image') {
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
app.use(morgan('dev'))
app.set('logger', logger)

/* Services */
services.init(app)

/* Routing */
routers.init(app)

const port = process.env.PORT || 80
app.listen(port, () => {
  logger.info('API started!')
  logger.info('API listening on port ' + port)
})
