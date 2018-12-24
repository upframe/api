import * as express from 'express'
import * as mysql from 'mysql2'

export class database {
  constructor(app: express.Application) {
    let pool: mysql.Pool = mysql.createPool({
      host : process.env.DB_HOST,
      user : process.env.DB_USER,
      password : process.env.DB_PASSWORD,
      database : process.env.DB_NAME
    })

    pool.getConnection((err: any) => {
      if (!err) {
        app.get('logger').info('Connected to the database successfully.')
      } else {
        app.get('logger').error('Error connecting to the database.')
        setTimeout(() => {
          process.exit(1)
        }, 2500)
      }
    });
    
    this.pool: any = pool.promise()
  }

  /**
   * @returns {connectionPool}
   */
  getPool() {
    return this.pool;
  }
}