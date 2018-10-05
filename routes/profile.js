const express = require('express')
const router = express.Router()
const formidable = require('formidable')
const AWS = require('aws-sdk')
const fs = require('fs')

let app, services, logger;

function setRouters() {
  router.get('/me', services.auth.verifyToken, (req, res) => {
    services.user.get(req, res)
  })
  
  router.patch('/me', services.auth.verifyToken, (req, res) => {
    services.user.update(req,res)
  })
  
  router.post('/image', services.auth.verifyToken, (req, res) => {
    var form = new formidable.IncomingForm();
    email = jwt.decode(req.headers['authorization'].split('Bearer ')[1]).email
  
    form.parse(req);
  
    form.on('fileBegin', function (name, file) {
      file.path = './uploads/' + file.name;
    });
  
    form.on('file', function (name, file) {
      uploadToS3UsingStream(
        res, //Response so we can answer when we are done 
        email, //file name
        fs.createReadStream('./uploads/' + file.name) //stream to upload
      )
    });
  })
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
function uploadToS3UsingStream(res, filename, stream) {
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
      res.status(404).send('Upload Falhou')
    } else {
      res.status(200).send('Feito Link Publico: ' + data.Location)
      fs.unlink('./uploads/' + filename, (err) => {
        console.log(err)
      })
    }
  })
}

module.exports.init = (appRef) => {
  app = appRef
  services = app.get('services')
  logger = app.get('logger')

  logger.verbose('Profile router loaded')

  setRouters()
  return router
}