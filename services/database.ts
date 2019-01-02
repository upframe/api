import * as express from 'express'
import * as mysql from 'mysql2/promise'

import { date } from '../types'

export class Database {
  private pool: any

  constructor(app: express.Application) {
    try {
      const pool: mysql.Pool = mysql.createPool({
        host : process.env.DB_HOST,
        user : process.env.DB_USER,
        password : process.env.DB_PASSWORD,
        database : process.env.DB_NAME,
      })
      if (pool) app.get('logger').verbose('Database OK')

      this.pool = pool
    } catch (err) {
      app.get('logger').error('Database NOT OK')
    }
  }

  /**
   * @description Executes SQL query and filters the important and not-so-important data
   * @param {string} sqlQuery - SQL query string
   * @param {string} parameters - String with the only parameter or an array
   */
  public async query(sqlQuery: string, parameters?: string | string[] | date[]): Promise<any> {
    try {
      const result: any[] = await this.pool.query(sqlQuery, parameters)

      if (result[0].length) {
        if (result[0].length > 1) return result[0]
        else if (result[0].length === 1) return result[0][0]
        else if (result[0][0].length > 1) return result[0][0]
        else return result[0]
      } else return result[0]
    } catch (err) {
      return 1
    }
  }
}
