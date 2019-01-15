import '../env'

import * as bcrypt from 'bcryptjs'
import * as crypto from 'crypto'
import * as express from 'express'
import * as jwt from 'jsonwebtoken'

import { Service, StandaloneServices } from '../service'
import { APIerror, APIrequest, APIRequestBody, APIresponse, JWTpayload, User } from '../types'
import { sql } from '../utils'

export class AuthService extends Service {
  constructor(app: express.Application, standaloneServices: StandaloneServices) {
    super(app, standaloneServices)

    if (this.logger) this.logger.verbose('Auth service loaded')
  }

  public verifyToken(req: APIrequest, res: express.Response, next: express.NextFunction) {
    const token = req.cookies.access_token

    try {
      if (!token) throw 403

      let pk: string
      if (process.env.CONNECT_PK) pk = process.env.CONNECT_PK
      else throw 500

      const decoded = jwt.verify(token, pk)
      if (decoded instanceof Object) req.jwt = decoded

      next()
    } catch (err) {
      const response: APIresponse = {
        code: 403,
        ok: 0,
        message: 'The JWT token is not valid',
      }

      if (err.name === 'TokenExpiredError') {
        response.code = 403
        response.message = 'Session expired'
      }

      res.status(response.code).json(response)
    }
  }

  public isMentor(req: APIrequest, res: express.Response, next: express.NextFunction) {
    if (req.jwt && req.jwt.aud === 'mentor') next()
    else {
      const response: APIresponse = {
        code: 403,
        ok: 0,
        message: 'You\'re not a mentor',
      }

      res.status(response.code).json(response)
    }
  }

  public createToken(user: JWTpayload , accountType): string {
    if (process.env.CONNECT_PK) {
      return jwt.sign(user, process.env.CONNECT_PK, {expiresIn: (86400 * 15) , audience: accountType})
    } else return ''
  }

  public async login(req: APIrequest, res: express.Response) {
    let response: APIresponse = {
        ok: 1,
        code: 200,
      }
    let error: APIerror

    try {
      if (!req.body || !req.body.email || !req.body.password) {
        error = {
          api: true,
          code: 400,
          message: 'Unsufficient fields to perform a register request',
          friendlyMessage: 'There is a field missing in the request.',
        }

        throw error
      }

      const sqlQuery = 'SELECT * FROM users WHERE email = ?'
      const user = await this.database.query(sqlQuery, [req.body.email])
      if (Object.keys(user).length) {
        if (bcrypt.compareSync(req.body.password, user.password)) {
          response.token = this.createToken({
            email: user.email,
            uid: user.uid,
          }, user.type)

          res.cookie('access_token', response.token, { expires: new Date(Date.now() + 86400 * 15e3), httpOnly: true })
        } else {
          error = {
            api: true,
            code: 401,
            message: 'Wrong credentials',
            friendlyMessage: 'The password and password didn\'t match',
          }

          throw error
        }
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

  public async register(req: APIrequest, res: express.Response) {
    const json = Object.assign({}, req.body)
    let response: APIresponse = {
      code: 200,
      ok: 1,
    }
    let error: APIerror

    try {
      /* - MVP-ONLY -
       * Disable register
       */
      if (!Number(process.env.REGISTER)) {
        error = {
          api: true,
          code: 501,
          message: 'Register is not allowed',
          friendlyMessage: 'Register is not available at the moment. Please, try again later',
        }

        throw error
      }

      if (!json.email || !json.password || !json.name) {
        error = {
          api: true,
          code: 400,
          message: 'Unsufficient fields to perform a register request',
          friendlyMessage: 'There is a field missing in the request.',
        }

        throw error
      }

      // hash password
      const salt = bcrypt.genSaltSync(10)
      json.password = bcrypt.hashSync(json.password, salt)
      // generate keycode
      json.keycode = json.name.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(new RegExp(' ', 'g'), '.')
        .toLowerCase()
      // generate unique account id
      json.uid = crypto.randomBytes(20).toString('hex')

      const [sqlQuery, params] = sql.createSQLqueryFromJSON('INSERT', 'users', json)
      await this.database.query(sqlQuery, params)
    } catch (err) {
      response = {
        ok: 0,
        code: 500,
      }

      // check if it's a mysql error
      if (err.errno === 1062 && err.sqlState === '23000') {
        response.message = 'There is already an account using that email'
      }

      // check API errors
      if (err.api) {
        response.code = err.code
        response.message = err.message,
        response.friendlyMessage = err.friendlyMessage
      }
    }

    res.status(response.code).json(response)
  }

  public async resetPassword(req: APIrequest, res: express.Response) {
    let response: APIresponse = {
      ok: 1,
      code: 200,
    }
    let error: APIerror

    try {
      if (req.body.token) {
        let sqlQuery: string
        let params: string[]

        // verify if token is valid
        [sqlQuery, params] = sql.createSQLqueryFromJSON('SELECT', 'passwordReset', { token: req.body.token })
        const passwordResetToken = await this.database.query(sqlQuery, params)
        if (!Object.keys(passwordResetToken).length) {
          error = {
            api: true,
            code: 404,
            message: 'Token not found',
            friendlyMessage: 'The given token is invalid or has already been used.',
          }

          throw error
        }

        // create SQL query to set a new password
        [sqlQuery, params] = sql.createSQLqueryFromJSON('UPDATE', 'users',
          {
            password: req.body.password,
          }, {
            email: passwordResetToken.email,
          })

        const result = await this.database.query(sqlQuery, params)
        if (!result.affectedRows) {
          error = {
            api: true,
            code: 500,
            message: 'Could not update user\'s password',
            friendlyMessage: 'Could not update user\'s password',
          }

          throw error
        }
        const result2 = await this.database.query('DELETE FROM passwordReset WHERE token = ?', [req.body.token])
      } else {
        if (!req.body.email) {
          error = {
            api: true,
            code: 404,
            message: 'Email not found',
            friendlyMessage: 'The given email is not valid or unexistent',
          }
        } else {
          // result = 1 means email was sent
          // result = 0 means email was NOT sent
          const result = await this.mail.sendPasswordReset(req.body.email)

          if (result !== 0) {
            error = {
              api: true,
              code: 500,
              message: 'It was not possible to send the password reset email',
              friendlyMessage: 'It was not possible to send the password reset email',
            }

            throw error
          }
        }
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

  /**
   * @description changes account's email
   */
  public async changeEmail(req: APIrequest, res: express.Response) {
    let response: APIresponse = {
      ok: 1,
      code: 200,
    }
    let error: APIerror

    if (req.body.token && req.body.email && process.env.CONNECT_PK) {
      try {
        // verify if token is valid by fetching it from the database
        const emailChangeRequest = await this.database.query('SELECT * FROM emailChange WHERE token = ?',
          [req.body.token])
        if (!emailChangeRequest) {
          error = {
            api: true,
            code: 404,
            message: 'Email change request not found',
            friendlyMessage: 'There is no email change request with this email',
          }

          throw error
        }

        let sqlQuery: string = 'UPDATE users SET email = ? WHERE email = ?'
        let params: string[] = [req.body.email, emailChangeRequest.email]
        await this.database.query(sqlQuery, params)

        // if user is logged in refresh access token
        // clear access token otherwise
        jwt.verify(req.cookies.access_token, process.env.CONNECT_PK, (err, decoded) => {
          if (decoded) {
            response.token = this.createToken({
              email: req.body.email,
              uid: decoded.uid,
            }, decoded.aud)

            res.cookie('access_token', response.token, {maxAge: 86400 * 15, httpOnly: true})
          } else {
            // avoid cookie problems by deleting access_token cookie when it is not valid
            res.clearCookie('access_token')
          }
        })

        sqlQuery = 'DELETE FROM emailChange WHERE token = ?'
        params = [req.body.token]
        await this.database.query(sqlQuery, params)
      } catch (err) {
        response = {
          ok: 0,
          code: 500,
        }

        if (err === 403) {
          response.code = err
          response.message = 'Token is invalid'
        }
      }
    } else {
      try {
        if (req.body.email) {
          // result = 1 means email was sent
          // result = 0 means email was NOT sent
          const result = await this.mail.sendEmailChange(req.body.email)

          if (result !== 0) throw result
        } else {
          throw 1
        }
      } catch (err) {
        response = {
          ok: 0,
          code: 500,
        }
      }
    }

    res.status(response.code).json(response)
  }

  public async getGoogleUrl(req: APIrequest, res: express.Response) {
    let response: APIresponse = {
      ok: 1,
      code: 200,
    }
    let error: APIerror

    try {

      const authorizeUrl = this.oauth.generateAuthUrl({
        access_type: 'offline',
        scope: 'profile email https://www.googleapis.com/auth/calendar',
        prompt: 'consent',
      })

      if (!authorizeUrl) {
        error = {
          api: true,
          code: 500,
          message: 'Error creating google sync URL',
          friendlyMessage: 'There was a problem accesssing the Google OAuth URl',
        }
        throw error
      }

      response.url = authorizeUrl

    } catch (err) {
      response = {
        ok: 0,
        code: 500,
      }
    }

    res.status(response.code).json(response)
  }

  public async receiveOauthCode(req: APIrequest, res: express.Response) {
    let response: APIresponse = {
      ok: 1,
      code: 200,
    }
    let error: APIerror
    try {
      if (!req.query.code) {
        error = {
          api: true,
          code: 500,
          message: 'Needed parameter was missing from the request',
          friendlyMessage: 'The parameter \'code\' was missing in the query',
        }
        throw error
      }
      const googleResponse = this.oauth.getToken(req.query.code)

      if (!googleResponse || !googleResponse.tokens.access_token) {
        error = {
          api: true,
          code: 500,
          message: 'Error parsing synchronization code from Google - access token and refresh token not generated',
          friendlyMessage: 'We could not transform the Google code into an access token and refresh token',
        }
        throw error
      }

      // DONE - Save refresh token
      // DONE - Return access token
      let uid: string
      if (!req.jwt || !req.jwt.uid) throw 403
      else uid = req.jwt.uid

      const json = {
        googleAccessToken: googleResponse.tokens.access_token,
        googleRefreshToken: googleResponse.tokens.refresh_token,
      }

      const [sqlQuery, params] = sql.createSQLqueryFromJSON('UPDATE', 'users', json, { uid })
      const result = await this.database.query(sqlQuery, params)
      if (result.changedRows) response.code = 202

      response.token = googleResponse.tokens.access_token

    } catch (err) {
      response = {
        ok: 0,
        code: 500,
      }
      res.status(response.code).json(response)
    }

    res.status(response.code).json(response)
  }
}
