import * as express from 'express'

import { Service, StandaloneServices } from '../service'
import { APIerror, APIresponse } from '../types'
import { format } from '../utils'

export class SearchService extends Service {
  constructor(
    app: express.Application,
    standaloneServices: StandaloneServices
  ) {
    super(app, standaloneServices)

    if (this.logger) this.logger.verbose('Search service loaded')
  }

  /**
   * @description Performes a quick search for expertise, people and companies
   * @param {express.Request} req
   * @param {express.Response} res
   */
  public async quick(req: express.Request, res: express.Response) {
    let response: APIresponse = {
      ok: 1,
      code: 200,
    }
    let error: APIerror

    try {
      let sqlQuery: string = ''
      response.search = {}

      // expertise search
      sqlQuery = 'SELECT * FROM expertise WHERE name LIKE ?'
      const expertiseResult = await this.database.query(sqlQuery, [
        `%${req.query.term}%`,
      ])
      if (Object.keys(expertiseResult).length)
        response.search.expertise = expertiseResult

      // people search
      sqlQuery =
        'SELECT name, profilePic, bio, keycode FROM users WHERE name LIKE ?'
      const peopleResult = await this.database.query(sqlQuery, [
        `%${req.query.term}%`,
      ])
      if (Object.keys(peopleResult).length)
        response.search.people = peopleResult

      // company search
      sqlQuery = 'SELECT * FROM companies WHERE name LIKE ?'
      const companyResult = await this.database.query(sqlQuery, [
        `%${req.query.term}%`,
      ])
      if (Object.keys(companyResult).length)
        response.search.companies = companyResult

      if (
        !response.search.expertise ||
        !response.search.people ||
        !response.search.companies
      ) {
        error = {
          api: true,
          code: 404,
          message: 'No matches were found.',
          friendlyMessage:
            'There is no expertise, person or company with the given name.',
        }

        throw error
      }
    } catch (err) {
      response = {
        ok: 0,
        code: 500,
      }

      if (err.api) {
        response.code = err.code
        response.message = err.message
      }
    }

    res.status(response.code).json(response)
  }

  /**
   * @description Performes a full search for people whose name is similar to the one given
   * @param {express.Request} req
   * @param {express.Response} res
   */
  public async full(req: express.Request, res: express.Response) {
    let response: APIresponse = {
      ok: 1,
      code: 200,
    }
    let error: APIerror

    const search = req.query.term

    try {
      if (['business', 'design', 'technology'].includes(search.toLowerCase())) {
        const sqlQuery = `SELECT name, profilePic, bio, keycode, tags, role, company, profilePictures.* 
          FROM users 
          LEFT JOIN profilePictures ON users.uid = profilePictures.uid 
          WHERE category LIKE ? AND type = 'mentor' AND newsfeed = 'Y'`
        let user = await this.database.query(sqlQuery, [
          `%${search.toLowerCase()}%`,
        ])
        if (!Object.keys(user).length) {
          error = {
            api: true,
            code: 404,
            message: 'User not found',
            friendlyMessage: 'There is no account that matches the term.',
          }

          throw error
        } else {
          if (!Array.isArray(user)) {
            user = [user]
          }
          response.search = user.map(format.mentor)
        }
      } else {
        const sqlQuery =
          "SELECT name, profilePic, bio, keycode, tags, role, company FROM users WHERE (name LIKE ? OR category LIKE ?) AND type = 'mentor' AND newsfeed = 'Y'"
        let user = await this.database.query(sqlQuery, [
          `${search}%`,
          `%${search.toLowerCase()}%`,
        ])
        if (!Object.keys(user).length) {
          error = {
            api: true,
            code: 404,
            message: 'User not found',
            friendlyMessage: 'There is no account that matches the term.',
          }

          throw error
        } else {
          if (!Array.isArray(user)) {
            user = [user]
          }
          response.search = user
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
      }
    }

    res.status(response.code).json(response)
  }

  /**
   * @description Add search query to the database
   * @param {express.Request} req
   * @param {express.Response} res
   */
  public async query(req: express.Request, res: express.Response) {
    let response: APIresponse = {
      ok: 1,
      code: 200,
    }
    const rawQuery = req.body.search
    const query = rawQuery.replace(/\s/g, '').toLowerCase() // removing whitespaces and lowercase the query

    try {
      response.search = {}
      const checkQuery = `SELECT query FROM searchQuery WHERE query LIKE ?`
      let checkExistingQuery = await this.database.query(checkQuery, [query])

      if (Object.keys(checkExistingQuery).length) {
        const updateAmount = `UPDATE searchQuery SET amount = amount + 1 WHERE query LIKE ?`
        await this.database.query(updateAmount, [query])
      } else {
        const insertQuery = `INSERT INTO searchQuery(query,amount) VALUES(?,'1')`
        await this.database.query(insertQuery, [query])
      }
    } catch (err) {
      response = {
        ok: 0,
        code: 500,
      }

      if (err.api) {
        response.code = err.code
        response.message = err.message
      }
    }

    res.status(response.code).json(response)
  }

  public async tags(req: express.Request, res: express.Response) {
    const tags = [
      'User Research',
      'Event Marketing',
      'Communities',
      'Business Models',
      'Ideation',
      'B2B',
      'B2C',
    ]
    res.status(200).send(tags)
  }
}
