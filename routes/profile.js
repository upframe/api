const express = require('express')
const router = express.Router()
const AWS = require('aws-sdk')

function setRouters(app) {
  let services = app.get('services')

  router.get('/me', services.auth.verifyToken, (req, res) => {
    services.user.get(req, res)
  })
  
  router.patch('/me', services.auth.verifyToken, (req, res) => {
    services.user.update(req,res)
  })
  
  router.post('/image', services.auth.verifyToken, (req, res) => {
    let email = req.jwt.email
    req.pipe(req.busboy);
    req.busboy.on('file', (fieldname, file, filename) => {
      console.log(`Upload of '${filename}' started`);

      uploadToS3UsingStream(
        res,
        email + filename.slice(-4),
        file,
        req
      )
    })
  })

  return router
}

/*
Uploads a file to our S3 Storage Bucket for profile pictures
We are using a stream so that this function can be future proof
Our next step is to replace the code at the router
so that instead of saving it to a file it redirects
the file stream directly to this function...
I believe we need to change bodyParser to another middleware
that supports streams... TODO
*/
function uploadToS3UsingStream(res, filename, stream, req) {
  let s3 = new AWS.S3({
    accessKeyId: process.env.IAM_USER_KEY,
    secretAccessKey: process.env.IAM_USER_SECRET,
    Bucket: process.env.BUCKET_NAME,
  });
  let params = {
    Bucket: process.env.BUCKET_NAME,
    Key: filename,
    Body: stream,
    ACL: 'public-read'
  }
  s3.upload(params, (err, data) => {
    if (err) {
      res.status(404).send(err)
    } else {
      //res.status(200).send('Feito Link Publico: ' + data.Location)
      services.user.image(data.Location, req.jwt.email, res, data.Location)
      // fs.unlink('./uploads/' + filename, (err) => {
      //   console.log(err)
      // })
    }
  })
}

module.exports.init = (app) => {
  try {
    let router = setRouters(app)
    app.get('logger').verbose('Profile router loaded')
    return router
  } catch (err) {
    app.get('logger').error('Could not load profile router')
  }
}