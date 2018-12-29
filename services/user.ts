import * as express from 'express'

import { service } from '../service'
import { APIrequest, APIresponse } from '../types'
import { sql } from '../utils'

export class UserService extends service {
  constructor(app: express.Application) {
    super(app)

    if(this.logger) this.logger.verbose('User service loaded')
  }

  async get(req: APIrequest, res: express.Response) {
    let response: APIresponse = {
        code: 200,
        ok: 1
      }
    
    try {
      if(!req.jwt) throw 403

      let [sqlQuery, params] = sql.createSQLqueryFromJSON('SELECT', 'users', req.jwt)
      let [rows] = await this.database.query(sqlQuery, params)
      response.user = rows[0]
      if(!rows.length) throw 404
    } catch (err) {
      response.ok = 0
      response.code = 400

      if(err === 404) {
        response.code = err
        response.message = 'User not found'
      }
    }

    res.status(response.code).json(response)
  }

  async update(req: APIrequest, res: express.Response) {
    let uid: string,
      response: APIresponse = {
        code: 200,
        ok: 1
      },
      json = Object.assign({}, req.body)

    try {
      if(!req.jwt || !req.jwt.uid) throw 403
      else uid = req.jwt.uid
      
      let [sqlQuery, params] = sql.createSQLqueryFromJSON('UPDATE', 'users', json, {uid: uid})

      let [rows] = await this.database.query(sqlQuery, params)
      if(rows.changedRows) response.code = 202
      else throw 409
    } catch (err) {
      response.ok = 0
      response.code = 400

      if(err === 404) {
        response.code = err
        response.message = 'User not found'
      } else if(err === 409) response.code = err
    }
    
    res.status(response.code).json(response)
  }

  async image(url: string, userEmail: string, res: express.Response) {
    let sqlQuery = 'UPDATE users SET profilePic = ? WHERE email = ?',
      response: APIresponse = {
        ok: 1,
        code: 200
      }
    
    try {
      let [rows] = await this.database.query(sqlQuery, [url, userEmail])
      if(rows.changedRows) {
        response.code = 202
        
      } else throw 409
    } catch (err) {
      response.ok = 0
      response.code = 500
    }
    
    res.status(response.code).json(response)
  }

}