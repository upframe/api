import * as express from 'express'

import { Service } from '../service'
import { APIerror, APIrequest, APIresponse } from '../types'

export class UrlService extends Service {
  constructor() {
    super('URL shortener')
  }

  public async getRealUrl(req: APIrequest, res: express.Response) {
    let response: APIresponse = {
      ok: 1,
      code: 200,
    }
    let err: APIerror
    try {
      const sqlQuery = 'SELECT * FROM users WHERE keycode = ?'
      const user = await Service.database.query(sqlQuery, req.query.short)
      if (Object.keys(user).length === 0) {
        err = {
          code: 404,
          api: true,
          message: 'No mentors found',
          friendlyMessage: 'There are no mentors with that keycode',
        }
        throw err
      }
    } catch (error) {
      if (error.api) {
        response = {
          ok: 0,
          code: error.code,
          friendlyMessage: error.friendlyMessage,
          message: error.message,
        }
      } else {
        response = {
          ok: 0,
          code: 500,
        }
      }
    }
    res.status(response.code).json(response)
  }
}
