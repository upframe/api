require('dotenv').config(); //Podemos usar .env para as variables

const port = process.env.PORT || 80;
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser');
const app = express()

/* Configs */
app.use(cors({ credentials: true, origin: 'https://connect.upframe.io' }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

/* Router */
const authRouter = require('./routes/auth');
const mentorRouter = require('./routes/mentor');
const profileRouter = require('./routes/profile');
const searchRouter = require('./routes/search');
app.use('/auth', authRouter)
app.use('/mentor', mentorRouter)
app.use('/profile', profileRouter)
app.use('/search', searchRouter)

app.listen(port, () => { console.log('API listening on port ' + port)})