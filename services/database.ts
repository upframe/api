import * as express from 'express'
import * as mysql from 'mysql2/promise'

export class Database {
  constructor(app: express.Application) {
    try {
      const pool: mysql.Pool = mysql.createPool({
        host : process.env.DB_HOST,
        user : process.env.DB_USER,
        password : process.env.DB_PASSWORD,
        database : process.env.DB_NAME,
      })
      if (pool) app.get('logger').verbose('Database OK')

      return pool
    } catch (err) {
      app.get('logger').error('Database NOT OK')
    }
  }
}
