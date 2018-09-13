require('dotenv').config(); //Podemos usar .env para as variables

const port = process.env.PORT || 80;
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser');
const app = express()

/* Configs */
app.use(cors({ credentials: true, origin: `https://connect.upframe.io` }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

/* Router */
const usersRouter = require('./routes/users');
app.use('/users', usersRouter)

app.listen(port, () => { console.log('API listening on port ' + port)})