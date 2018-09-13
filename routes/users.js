const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

router.post('/register', (req, res) => {

  let newUser = new User(
    req.body.name, 
    req.body.email, 
    req.body.password
  ) //temos que importar Users class

  newUser.save().then(
    res.status(200).send('Tudo correu bem')
  ).catch(
    res.status(200).send('Deu asneira')
  )
  
})

router.get('/', (req, res) => {
  console.log('Received @ /users/')
  res.send('Hi from /users route')
})

module.exports = router;