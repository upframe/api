import * as express from 'express'

import { OAuth2Client } from 'google-auth-library'
import { Service, StandaloneServices } from '../service'
import { APIerror, APIrequest, APIresponse, User } from '../types'
import { sql } from '../utils'

export class UserService extends Service {

  private oAuth2Client: any

  constructor(app: express.Application, standaloneServices: StandaloneServices) {
    super(app, standaloneServices)

    this.oAuth2Client = new OAuth2Client(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL,
    )

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

      this.oAuth2Client.setCredentials({
        access_token: user.googleAccessToken,
        refresh_token: user.googleRefreshToken,
      })
      const tokens = await this.oAuth2Client.refreshAccessToken()
      user.googleAccessToken = tokens.access_token

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
    let error: APIerror

    const json = Object.assign({}, req.body)

    try {
      let uid: string
      if (!req.jwt || !req.jwt.uid) throw 403
      else uid = req.jwt.uid

      const [sqlQuery, params] = sql.createSQLqueryFromJSON('UPDATE', 'users', json, {uid})
      const result = await this.database.query(sqlQuery, params)
      if (result.changedRows) response.code = 202
      else {
        error = {
          api: true,
          code: 409,
          message: 'User info could not be updated',
          friendlyMessage: 'It was not possible to update the user profile.',
        }

        throw error
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

  public async image(url: string, userEmail: string, res: express.Response) {
    let response: APIresponse = {
        ok: 1,
        code: 200,
      }
    let error: APIerror

    try {
      const sqlQuery = 'UPDATE users SET profilePic = ? WHERE email = ?'
      const result = await this.database.query(sqlQuery, [url, userEmail])
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

}
