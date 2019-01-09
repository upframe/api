import * as express from 'express'

import { Service, StandaloneServices } from '../service'
import { APIerror, APIrequest, APIresponse, User } from '../types'
import { sql } from '../utils'

export class UrlService extends Service {
  constructor(app: express.Application, standaloneServices: StandaloneServices) {
    super(app, standaloneServices)

    if (this.logger) this.logger.verbose('URL shortener service loaded')
  }

  public async getRealUrl(req: APIrequest, res: express.Response) {
    let response: APIresponse = {
      ok: 1,
      code: 200,
    }
    let error: APIerror
    try {
      const sqlQuery = 'SELECT * FROM users WHERE keycode = ?'
      const user = await this.database.query(sqlQuery, req.query.short)
      if (Object.keys(user).length === 0) {
        error = {
          api: false,
          code: 500,
          message: 'No mentors',
          friendlyMessage: 'There are no mentors with that keycode',
        }
        throw error
      }
    } catch (error) {
      if (error.api) {
        response.code = error.code
        response.message = error.message
        response.friendlyMessage = error.friendlyMessage
      }
    }
    res.status(response.code).json(response)
  }

}
