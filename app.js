require('dotenv').config(); //Podemos usar .env para as variables

const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const app = express()

const morgan = require('morgan')
const logger = require('./utils/logs')

const routers = require('./routes')

/* Middleware configuration */
app.use(cors({ credentials: true, origin: 'https://connect.upframe.io' }))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

/* Logs configuration */
app.use(morgan('dev'))

/* Routing */
routers.init(app)

const port = process.env.PORT || 80
app.listen(port, () => {
  logger.info('API started!')
  console.log('API listening on port ' + port)
})