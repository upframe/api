import * as express from 'express'
import * as mysql from 'mysql2/promise'
import { DatabaseService } from '../service'

export class Analytics {

  private pool: any

  constructor(app: express.Application) {
    try {

      const pool: mysql.Pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_ANALYTICS,
      })
      if (pool) app.get('logger').verbose('Analytics OK')
      this.pool = pool
    
    } catch (err) {
      app.get('logger').error('Analytics NOT OK')
    }
  }

  /* Triggered when a new meetup is requested */
  /* mentee, data */
  public async addMeetup(mentee: string, data: string) { 
    try {
      const result = await this.pool.query('INSERT INTO meetups VALUES(?,?)', [mentee, data])
      console.log(result)
    } catch (err) {
      throw err
    }
  }

  /* Triggered when free slots are added */
  /* mentor, data */
  public async addFreeSlot(mentor: string, data: string) {
    try {
      const result = await this.pool.query('INSERT INTO meetups VALUES(?,?)', [mentor, data])
      console.log(result)
    } catch (err) {
      throw err
    }
  }

}