import * as express from 'express'

import { Service, StandaloneServices } from '../service'

export class SearchService extends Service {
  constructor(app: express.Application, standaloneServices: StandaloneServices) {
    super(app, standaloneServices)

    if (this.logger) this.logger.verbose('Search service loaded')
  }

  public async quick(req: express.Request, res: express.Response) {
    // Primeiro expertise
    // Segundo pessoas
    // Terceiro companies
    const sqlExpertise = 'SELECT * FROM expertise WHERE name LIKE ?'
    const sqlPeople = 'SELECT name, profilePic, bio, keycode FROM users WHERE name LIKE ?'
    const sqlCompanies = 'SELECT * FROM companies WHERE name LIKE ?'
    const [expertiseRows] = await this.database.query(sqlExpertise, '%' + req.query.term + '%')
    const [peopleRows] = await this.database.query(sqlPeople, '%' + req.query.term + '%')
    const [companyRows] = await this.database.query(sqlCompanies, '%' + req.query.term + '%')
    const response = {
      company: companyRows.slice(0, 3),
      expertise: expertiseRows.slice(0, 3),
      people: peopleRows.slice(0, 3),
    }
    res.status(200).send(response)
  }

  public async full(req: express.Request, res: express.Response) {
    // Queremos pesquisar usando a informacao e devolver só users
    const sql = 'SELECT name, profilePic, bio, keycode, tags, role, company FROM users WHERE name LIKE ?'
    const [rows] = await this.database.query(sql, '%' + req.query.term + '%')
    res.status(200).send(rows)
  }

  public async tags(req: express.Request, res: express.Response) {
    const tags = ['User Research', 'Event Marketing', 'Communities', 'Business Models', 'Ideation', 'B2B', 'B2C']
    res.status(200).send(tags)
  }

}
