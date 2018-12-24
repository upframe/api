import * as express from 'express'

import { APIresponse } from '../types'
import { sql } from '../utils'

export class User {
  constructor(app: express.Application) {
    this.database = app.get('db').getPool()
    this.logger = app.get('logger')

    if(this.logger) this.logger.verbose('User service loaded')
  }

  async get(req: express.Request, res: express.Response) {
    let [sqlQuery, params] = sql.createSQLqueryFromJSON('SELECT', 'users', req.jwt),
      response: APIresponse = {
        code: 200,
        ok: 1
      }
    
    try {
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

  async update(req: express.Request, res: express.Response) {
    let uid = req.jwt.uid,
      response: APIresponse = {
        code: 200,
        ok: 1
      },
      json = Object.assign({}, req.body)
    
    let [sqlQuery, params] = sql.createSQLqueryFromJSON('UPDATE', 'users', json, {uid: uid})

    try {
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

  async image(url, userEmail, res) {
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