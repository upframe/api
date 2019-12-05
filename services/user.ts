import * as AWS from 'aws-sdk'
import * as express from 'express'
import { google } from 'googleapis'
import * as path from 'path'

import { logger, database, oauth } from '.'
import { sql, format } from '../utils'

export class UserService {
  constructor() {
    logger.verbose('User service loaded')
  }

  public async get(req: ApiRequest, res: express.Response) {
    let response: ApiResponse = {
      code: 200,
      ok: 1,
    }
    let error: APIerror

    try {
      if (!req.jwt) throw 403

      const [sqlQuery, params] = sql.createSQLqueryFromJSON(
        'SELECT',
        'users',
        req.jwt
      )
      const user: User = await database.query(sqlQuery, params)
      if (!Object.keys(user).length) {
        error = {
          api: true,
          code: 404,
          message: 'User not found',
          friendlyMessage: "There was an error fetching the user's info",
        }

        throw error
      }

      user.pictures = format.pictures(
        await database.query(
          ...sql.createSQLqueryFromJSON('SELECT', 'profilePictures', {
            uid: user.uid,
          })
        )
      )

      // let's refresh google access token if the mentor has synced
      if (user.googleAccessToken || user.googleRefreshToken) {
        // try to refresh google oauth credentials
        try {
          oauth.setCredentials({
            access_token: user.googleAccessToken,
            refresh_token: user.googleRefreshToken,
          })

          const tokens = await oauth.refreshAccessToken()
          if (!tokens.credentials.access_token) {
            error = {
              api: true,
              code: 500,
              message: 'Could not get updated access token',
              friendlyMessage: "There was an error fetching the user's info",
            }
            throw error
          }
          user.googleAccessToken = tokens.credentials.access_token
        } catch {
          // it's not important, as of 15th Sept 2019
          // to notify users or create an error for invalid oauth credentials
        }
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
   * @param {ApiRequest} req
   * @param {express.Response} res
   */
  public async update(req: ApiRequest, res: express.Response) {
    let response: ApiResponse = {
      code: 200,
      ok: 1,
    }

    const json = Object.assign({}, req.body)

    try {
      let uid: string
      if (!req.jwt || !req.jwt.uid) throw 403
      else uid = req.jwt.uid

      const [sqlQuery, params] = sql.createSQLqueryFromJSON(
        'UPDATE',
        'users',
        json,
        { uid }
      )
      await database.query(sqlQuery, params)

      if (req.body.upframeCalendarId) {
        // Adicionar um Webhook caso estejamos a atualizar o calendar id
        response.code = 777
        oauth.setCredentials({
          access_token: req.body.googleAccessToken,
          refresh_token: req.body.googleRefreshToken,
        })
        // create Calendar instance
        const googleCalendar = google.calendar({
          version: 'v3',
        })
        // set google options
        google.options({
          auth: oauth.OAuthClient,
        })

        const today = new Date() // We need to use the UNIX timestamp. Google likes to complicate
        today.setHours(today.getHours() + 3)
        const ttl = Math.round(today.getTime()).toString()

        googleCalendar.events.watch(
          {
            auth: oauth.OAuthClient,
            calendarId: req.body.upframeCalendarId,
            requestBody: {
              kind: 'api#channel',
              id: 'connect-upframe-' + req.jwt.uid + this.randomLetters(10),
              resourceId: req.jwt.uid,
              resourceUri: req.jwt.uid,
              token: 'hello',
              expiration: ttl,
              type: 'web_hook',
              address: 'https://api-staging.upframe.io/webhooks/calendar',
              payload: false,
              params: {
                key: 'yoooo',
              },
            },
          },
          error => {
            if (error) {
              logger.error('Error at Google Calendar events watch')
              logger.error(error)
              throw error
            }
          }
        )
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

  public async image(
    url: string,
    userEmail: string,
    res: express.Response,
    req: ApiRequest
  ) {
    let response: ApiResponse = {
      ok: 1,
      code: 200,
      url,
    }
    let error: APIerror
    try {
      if (!req.jwt) throw 403
      const newExtension = path.parse(url.slice(-7)).ext
      const [sqlQuery, params] = sql.createSQLqueryFromJSON(
        'SELECT',
        'users',
        req.jwt
      )
      const user = await database.query(sqlQuery, params)
      const oldExtension = path.parse(user.profilePic.slice(-7)).ext
      const sqlQuery2 = 'UPDATE users SET profilePic = ? WHERE email = ?'
      const result = await database.query(sqlQuery2, [url, userEmail])
      if (result.changedRows) response.code = 202
      else {
        error = {
          api: true,
          code: 409,
          message: 'User profile picture could not be updated',
          friendlyMessage:
            "It was not possible to update the user's profile picture",
        }
        throw error
      }
      const deleteParams = {
        Bucket: process.env.BUCKET_NAME || 'connect-api-profile-pictures',
        Key: req.jwt.uid + oldExtension,
      }
      if (
        newExtension !== oldExtension &&
        !user.profilePic.includes('default.png')
      ) {
        const s3 = new AWS.S3({
          accessKeyId: process.env.IAM_USER_KEY,
          secretAccessKey: process.env.IAM_USER_SECRET,
        })
        s3.deleteObject(deleteParams, () => {
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

  public randomLetters(length) {
    let text = ''
    const possible =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

    for (let i = 0; i < length; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length))

    return text
  }
}
