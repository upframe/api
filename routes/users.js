const express = require('express')
const router = express.Router();

router.get('/', (req, res) => {
  console.log('Received @ /users/')
  res.send('Hi from /users route')
})

module.exports = router;