import * as AWS from 'aws-sdk'
import * as express from 'express'

import { Services } from '../service'
import { APIrequest } from '../types'

const router: express.Router = express.Router()

function setRouters(app: express.Application): void {
  const services: Services = app.get('services')

  router.get('/me', services.auth.verifyToken, (req: APIrequest , res: express.Response) => {
    services.user.get(req, res)
  })

  router.patch('/me', services.auth.verifyToken, (req: APIrequest, res: express.Response) => {
    services.user.update(req, res)
  })

  router.post('/image', services.auth.verifyToken, (req: APIrequest, res: express.Response) => {
    let email: string
    if (req.jwt && req.jwt.email) email = req.jwt.email

    req.pipe(req.busboy)
    req.busboy.on('file', (fieldname, file, filename) => {
      // console.log(`Upload of '${filename}' started`)

      uploadToS3UsingStream(
        services,
        email + filename.slice(-4),
        file,
        req,
        res,
      )
    })
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
function uploadToS3UsingStream(services: any, filename: any, stream: any, req: APIrequest, res: express.Response) {
  try {
    if (!process.env.IAM_USER_KEY || !process.env.IAM_USER_SECRET || !process.env.BUCKET_NAME) throw 500

    const s3 = new AWS.S3({
      accessKeyId: process.env.IAM_USER_KEY,
      secretAccessKey: process.env.IAM_USER_SECRET,
      // Bucket: process.env.BUCKET_NAME,
    })
    const params = {
      ACL: 'public-read',
      Body: stream,
      Bucket: process.env.BUCKET_NAME,
      Key: filename,
    }
    s3.upload(params, (err, data) => {
      if (err) {
        res.status(404).send(err)
      } else {
        // res.status(200).send('Feito Link Publico: ' + data.Location)
        if (!req.jwt || !req.jwt.email) throw 403
        services.user.image(data.Location, req.jwt.email, res, data.Location)
        // fs.unlink('./uploads/' + filename, (err) => {
        //   console.log(err)
        // })
      }
    })
    return 0
  } catch (err) {
    return 1
  }
}

export function init(app: express.Application): express.Router {
  try {
    setRouters(app)
    app.get('logger').verbose('Profile router loaded')
  } catch (err) {
    app.get('logger').error('Could not load profile router')
  }

  return router
}
