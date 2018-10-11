require('dotenv').config(); //Podemos usar .env para as variables

const express = require('express')
const cors = require('cors')

const bodyParser = require('body-parser')
const busboy = require('connect-busboy');

const cookieParser = require('cookie-parser')
const app = express()

const morgan = require('morgan')
const logger = require('./utils').logger;

const services = require('./services')
const routers = require('./routes')

/* Middleware configuration */
app.use(cors({ credentials: true, origin: '*' }))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use(busboy({
  highWaterMark: 2 * 1024 * 1024, // Set 2MiB buffer
}));

app.use(cookieParser())

/* Logs configuration */
app.use(morgan('dev'))
app.set('logger', logger)

/* Services */
services.init(app);

/* Routing */
routers.init(app)

const port = process.env.PORT || 80
app.listen(port, () => {
  logger.info('API started!')
  console.log('API listening on port ' + port)
})