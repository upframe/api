require('dotenv').config(); //Podemos usar .env para as variables

const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const app = express()

const routers = require('./routes')

/* Configs */
app.use(cors({ credentials: true, origin: 'https://connect.upframe.io' }))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

/* Routing */
routers.init(app)

const port = process.env.PORT || 80
app.listen(port, () => { console.log('API listening on port ' + port)})