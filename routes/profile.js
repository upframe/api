const express = require('express')
const router = express.Router()
const db = require('../services/database.js')
const verifyToken = require('../services/token.js')

let app;

router.get('/me', verifyToken, (req, res) => {
  let sql = 'SELECT * FROM users WHERE email = ?'
  db.query(sql, req.userEmail, (err, result) => {
    res.status(200).send(result)
  })
})

router.post('/me', verifyToken, (req, res) => {
  let email = req.body.email ? `email='${req.body.email}', ` : '' //TODO Temporary
  let password = req.body.password ? `password='${req.body.password}', ` : '' //TODO Temporary
  let name = req.body.name ? `name='${req.body.name}', ` : ''
  let role = req.body.role ? `role='${req.body.role}', ` : ''
  let company = req.body.company ? `company='${req.body.company}', ` : ''
  let location = req.body.location ? `location='${req.body.location}', ` : ''
  let tags = req.body.tags ? `tags='${req.body.tags}', ` : ''
  let bio = req.body.bio ? `bio='${req.body.bio}', ` : ''
  let freeSlots = req.body.freeSlots ? `freeSlots='${req.body.freeSlots}', ` : ''
  let profilePic = req.body.profilePic ? `profilePic='${req.body.profilePic}', ` : ''
  let twitter = req.body.twitter ? `twitter='${req.body.twitter}', ` : ''
  let linkedin = req.body.linkedin ? `linkedin='${req.body.linkedin}', ` : ''
  let github = req.body.github ? `github='${req.body.github}', ` : ''
  let facebook = req.body.facebook ? `facebook='${req.body.facebook}', ` : ''
  let dribbble = req.body.dribbble ? `dribbble='${req.body.dribbble}', ` : ''
  let favoritePlaces = req.body.favoritePlaces ? `favoritePlaces='${req.body.favoritePlaces}', ` : ''
  let googleAccessToken = req.body.googleAccessToken ? `googleAccessToken='${req.body.googleAccessToken}', ` : ''
  let googleRefreshToken = req.body.googleRefreshToken ? `googleRefreshToken='${req.body.googleRefreshToken}', ` : ''

  let sql = `UPDATE users SET ${email} ${password} ${name} ${role} ${company} ${location} ${tags} ${bio} ${freeSlots} ${profilePic} ${twitter} ${linkedin} ${github} ${facebook} ${dribbble} ${favoritePlaces} ${googleAccessToken} ${googleRefreshToken} WHERE email='${req.userEmail}'`
  
  //TODO FIx this dirty hack! Not cool but I was lazy xD
  var pos = sql.lastIndexOf(',');
  sql = sql.substring(0, pos) + '' + sql.substring(pos + 1)
  // Basically I remove the last occurence of a comma otherwise the SQL query would not work
  console.log(sql)
  db.query(sql, (err, result) => {
    if (err)
      return console.log(err)
    res.status(200).send(result)
  })
})

router.post('/image', verifyToken, (req, res) => {
  res.status(200).send('Tudo correu bem')
})

module.exports = router
module.exports.init = (appRef) => {
  app = appRef
  app.get('logger').verbose('Profile router loaded')
}