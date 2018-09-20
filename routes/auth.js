const express = require('express')
const router = express.Router()
const db = require('../services/db.js')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs'); //If we have any problem we can change to 'bcrypt'
//I dunno why but one of the modules is having trouble... Both work for me though

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
  if (process.env.SUPERSECRETDEVPASSWORD == req.body.adminSecret) {
    console.log('This worked')
    let hashedPassword = bcrypt.hashSync(req.body.password, 8); //TODO esta complexidade nos dias de hoje acho q ja n e suficiente
    let usersString = 'INSERT INTO users (id, email, password, name, role, company, location, tags, bio, freeSlots, profilePic, twitter, linkedIn, github, facebook, dribbble, favoritePlaces, googleAccessToken, googleRefreshToken) '
    let variableString = `VALUES ('${req.body.id}', '${req.body.email}' , '${hashedPassword}', '${req.body.name}' , '${req.body.role}' , '${req.body.company}' , '${req.body.location}' , '${req.body.tags}' , '${req.body.bio}' , '${req.body.freeSlots}' , '${req.body.profilePic}' , '${req.body.twitter}' , '${req.body.linkedin}' , '${req.body.github}' , '${req.body.facebook}' , '${req.body.dribbble}' , '${req.body.favoritePlaces}' , '${req.body.googleAccessToken}' , '${req.body.googleRefreshToken}')`
    let sql = "INSERT INTO users (id, email, password) VALUES ('0', 'uli@c', '123')"
    db.query(usersString + variableString, (err, result) => {
      if (!err) {
        res.status(200).send('Registo feito')
      } else {
        res.status(500).send('An internal error ocurred')
      }
    })
  } else {
    res.status(401).send('Secret failed')
  }
})

module.exports = router;