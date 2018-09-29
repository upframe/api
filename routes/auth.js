const router = require('express').Router()
const db = require('../services/database.js')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs'); //If we have any problem we can change to 'bcrypt'
//I dunno why but one of the modules is having trouble... Both work for me though

let app,
  logger,
  services;

router.post('/login', (req, res) => {
  if (!req.body.password || !req.body.email) {
    res.status(401).send('The request doesn\'t have the necessary fields')
  } else {
    let sql = `SELECT * FROM users WHERE email = '${req.body.email}'`
    db.query(sql, (err, result) => {
      if (!err) {
        if (!result[0].password) {
          //Não ha email
          res.status(401).send('No such email exists')
        } else if (bcrypt.compareSync(req.body.password, result[0].password)) {
          //Está tudo correto
          var token = jwt.sign({ email: result[0].email }, process.env.JWTSECRET, {
            expiresIn: 86400 // expires in 24 hours
          });
          res.status(200).send({ auth: true, token: token})
        } else {
          console.log(req.body.password)
          console.log(result[0].password)
          //Password é errada
          res.status(401).send('Wrong password. GTFO')
        }
      } else {
        //Erro na query
        res.status(500).send('An internal error ocurred')
      }

    })
  }  
})

router.post('/register', (req, res) => {
  services.user.create(req, res)
})

module.exports = router;
module.exports.init = (appRef) => {
  app = appRef
  services = app.get('services')
  logger = app.get('logger')

  logger.verbose('Authentication router loaded')
};