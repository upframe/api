require('dotenv').config(); //Podemos usar .env para as variables

const port = process.env.PORT || 80;
const express = require('express')
const app = express()

/* ROUTER ZONE 
   Pelo que tenho visto de REST e pelo que eu tenho sempre feito
   a melhor prática é dividires a API em /users/ para tudo users
   related, /admin/ para tudo admin related, etc e particionar
   essas rotas diferentes em routers de javascript diferentes.
   Isto permite que as coisas fiquem mais bem organizadas e que
   dês handle dos routing separados*/

const usersRouter = require('./routes/users');
app.use('/users', usersRouter)

/* ROUTER ZONE */

app.listen(port, () => { console.log('API listening on port ' + port)})