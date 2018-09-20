const express = require('express')
const router = express.Router()
const db = require('../services/db.js')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs'); //If we have any problem we can change to 'bcrypt'
//I dunno why but one of the modules is having trouble... Both work for me though

router.post('/login', (req, res) => {
  req.body.email
  req.body.password
  res.status(200).send('Tudo correu bem')
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