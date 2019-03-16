import * as AWS from 'aws-sdk'
import * as express from 'express'
import { google } from 'googleapis'
import * as path from 'path'

import { Service, StandaloneServices } from '../service'
import { APIerror, APIrequest, APIresponse, User } from '../types'
import { sql } from '../utils'

export class UserService extends Service {

  constructor(app: express.Application, standaloneServices: StandaloneServices) {
    super(app, standaloneServices)

    if (this.logger) this.logger.verbose('User service loaded')
  }

  public async get(req: APIrequest, res: express.Response) {
    let response: APIresponse = {
        code: 200,
        ok: 1,
      }
    let error: APIerror

    try {
      if (!req.jwt) throw 403

      const [sqlQuery, params] = sql.createSQLqueryFromJSON('SELECT', 'users', req.jwt)
      const user: User = await this.database.query(sqlQuery, params)
      if (!Object.keys(user).length) {
        error = {
          api: true,
          code: 404,
          message: 'User not found',
          friendlyMessage: 'There was an error fetching the user\'s info',
        }

        throw error
      }

      // let's refresh google access token if the mentor has synced
      if (user.googleAccessToken || user.googleRefreshToken) {
        this.oauth.setCredentials({
          access_token: user.googleAccessToken,
          refresh_token: user.googleRefreshToken,
        })

        const tokens = await this.oauth.refreshAccessToken()
        if (!tokens.credentials.access_token) {
          error = {
            api: true,
            code: 500,
            message: 'Could not get updated access token',
            friendlyMessage: 'There was an error fetching the user\'s info',
          }
          throw error
        }
        user.googleAccessToken = tokens.credentials.access_token
      }

      response.user = user
    } catch (err) {
      response = {
        ok: 0,
        code: 500,
      }

      if (err.api) {
        response.code = err.code
        response.message = err.message
        response.friendlyMessage = err.friendlyMessage
      }
    }

    res.status(response.code).json(response)
  }

  /**
   * @description Updates user info with the new info
   * @param {APIrequest} req
   * @param {express.Response} res
   */
  public async update(req: APIrequest, res: express.Response) {
    let response: APIresponse = {
        code: 200,
        ok: 1,
      }

    const json = Object.assign({}, req.body)

    try {
      let uid: string
      if (!req.jwt || !req.jwt.uid) throw 403
      else uid = req.jwt.uid

      const [sqlQuery, params] = sql.createSQLqueryFromJSON('UPDATE', 'users', json, {uid})
      const result = await this.database.query(sqlQuery, params)

      if (req.body.upframeCalendarId) { // Adicionar um Webhook caso estejamos a atualizar o calendar id
        response.code = 777
        this.oauth.setCredentials({
          access_token: req.body.googleAccessToken,
          refresh_token: req.body.googleRefreshToken,
        })
        // create Calendar instance
        const googleCalendar = google.calendar({
          version: 'v3',
        })
        // set google options
        google.options({
          auth: this.oauth.OAuthClient,
        })

        googleCalendar.events.watch({
          auth: this.oauth.OAuthClient,
          calendarId: req.body.upframeCalendarId,
          requestBody: {
            id: req.jwt.uid,
            type: 'web_hook',
            address: 'https://api-staging.upframe.io/webhooks/calendar',
            resourceId: req.jwt.uid,
          },
        }, (error) => {
          this.logger.error('Error at Google Calendar events watch')
          if (error) throw error
        })
      }

    } catch (err) {
      response = {
        ok: 0,
        code: 500,
      }

      if (err.api) {
        response.code = err.code
        response.message = err.message
        response.friendlyMessage = err.friendlyMessage
      }
    }

    res.status(response.code).json(response)
  }

  public async image(url: string, userEmail: string, res: express.Response, req: APIrequest) {
    let response: APIresponse = {
        ok: 1,
        code: 200,
        url,
      }
    let error: APIerror
    try {
      if (!req.jwt) throw 403
      const newExtension = path.parse(url.slice(-7)).ext
      const [sqlQuery, params] = sql.createSQLqueryFromJSON('SELECT', 'users', req.jwt)
      const user = await this.database.query(sqlQuery, params)
      const oldExtension = path.parse(user.profilePic.slice(-7)).ext
      const sqlQuery2 = 'UPDATE users SET profilePic = ? WHERE email = ?'
      const result = await this.database.query(sqlQuery2, [url, userEmail])
      if (result.changedRows) response.code = 202
      else {
        error = {
          api: true,
          code: 409,
          message: 'User profile picture could not be updated',
          friendlyMessage: 'It was not possible to update the user\'s profile picture',
        }
        throw error
      }
      const deleteParams = {
        Bucket: process.env.BUCKET_NAME || 'connect-api-profile-pictures',
        Key: req.jwt.uid + oldExtension,
      }
      if (newExtension !== oldExtension && !user.profilePic.includes('default.png')) {
        const s3 = new AWS.S3({
          accessKeyId: process.env.IAM_USER_KEY,
          secretAccessKey: process.env.IAM_USER_SECRET,
        })
        s3.deleteObject(deleteParams, (err, data) => {
          res.status(response.code).json(response)
        })
      } else {
        res.status(response.code).json(response)
      }
    } catch (err) {
      response = {
        ok: 0,
        code: 500,
      }

      if (err.api) {
        response.code = err.code
        response.message = err.message
        response.friendlyMessage = err.friendlyMessage
      }
    }
  }

}
