require('dotenv').config(); //Podemos usar .env para as variables

const express = require('express')
const cors = require('cors')

const bodyParser = require('body-parser')
const busboy = require('connect-busboy');
const cookieParser = require('cookie-parser')
const morgan = require('morgan')
const logger = require('./utils').logger;

const services = require('./services')
const routers = require('./routes')

const app = express()

/* Middleware configuration */
let corsOptions = {
  credentials: true,
  origin: process.env.NODE_ENV == 'dev' ? 'http://localhost:3000' : 'https://connect.upframe.io'
}

app.use(cors(corsOptions))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cookieParser())
app.use(busboy({
  highWaterMark: 2 * 1024 * 1024, // Set 2MiB buffer
}));

/* Avoid empty POST requests */ // <- By doing this you are breaking POST /profile/image.
// Its body is considered empty because it is not JSON format but form-data
// Let's add a special rule for it :)
app.use((req, res, next) => {
  console.log(req)
  if(Object.keys(req.body).length === 0 && req.method == 'POST' && req.path != '/profile/image') {
    let response = {
      ok: 0,
      code: 400,
      message: 'Request body cannot be empty'
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
services.init(app);

/* Routing */
routers.init(app)

const port = process.env.PORT || 80
app.listen(port, () => {
  logger.info('API started!')
  console.log('API listening on port ' + port)
})