// require('dotenv').config() // Podemos usar .env para as variables
import './env'

import cors from 'cors'
import express from 'express'
import bodyParser from 'body-parser'
import busboy from 'connect-busboy'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import { logger } from './utils'

import * as routers from './routes'
import * as services from './services'

const app: express.Application = express()

/* Middleware configuration */
const corsOptions = {
  credentials: true,
  origin: process.env.NODE_ENV === 'dev' ? 'http://localhost:3000' : 'https://connect.upframe.io',
}

app.use(cors(corsOptions))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cookieParser())
app.use(busboy({
  highWaterMark: 2 * 1024 * 1024, // Set 2MiB buffer
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
