import * as express from 'express'
import * as mysql from 'mysql2/promise'
import { Logger } from 'winston'

export class Database {
  private pool: any
  private logger!: Logger

  constructor(app: express.Application) {
    try {
      this.logger = app.get('logger')

      const pool: mysql.Pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      })
      if (pool) this.logger.verbose('Database OK')

      this.pool = pool
    } catch (err) {
      this.logger.error('Database NOT OK')
    }
  }

  /**
   * @description Executes SQL query and filters the important and not-so-important data
   * @param {string} sqlQuery - SQL query string
   * @param {Array<any>} parameters - String with the only parameter or an array
   */
  public async query(
    sqlQuery: string,
    parameters?: string | any[]
  ): Promise<any> {
    try {
      const result: any[] = await this.pool.query(sqlQuery, parameters)

      if (result[0].length) {
        if (result[0].length > 1) return result[0]
        else if (result[0].length === 1) return result[0][0]
        else if (result[0][0].length > 1) return result[0][0]
        else return result[0]
      } else {
        if (Object.keys(result[0]).length) return result[0]
        else return {}
      }
    } catch (err) {
      if (err.errno === 1251) {
        this.logger.error('Database NOT OK')
        this.logger.error(`MySQL error: ${err}`)

        // Connection is bad because of drivers or authentication methods
        return 2
      } else if (err.errno === 1045) {
        this.logger.error('Database NOT OK')
        this.logger.error(`MySQL error: ${err}`)

        // Access Denied to the DB
        return 3
      }

      return 1
    }
  }
}
