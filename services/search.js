class Search {

  constructor(app) {
    this.database = app.get('db').getPool()
    this.logger = app.get('logger')

    if (this.logger) this.logger.verbose('Search service loaded')
  }

  async quick(req, res) {
    //Primeiro expertise
    //Segundo pessoas
    //Terceiro companies
    let sqlExpertise = 'SELECT * FROM expertise WHERE name LIKE ?'
    let sqlPeople = 'SELECT name, profilePic, bio, keycode FROM users WHERE name LIKE ?'
    let sqlCompanies = 'SELECT * FROM companies WHERE name LIKE ?'
    let [expertiseRows] = await this.database.query(sqlExpertise, '%' + req.query.term + '%')
    let [peopleRows] = await this.database.query(sqlPeople, '%' + req.query.term + '%')
    let [companyRows] = await this.database.query(sqlCompanies, '%' + req.query.term + '%')
    let response = {
      expertise: expertiseRows.slice(0,3),
      people: peopleRows.slice(0, 3),
      company: companyRows.slice(0, 3)
    }
    res.status(200).send(response)
  }

  async full(req, res) {
    //Queremos pesquisar usando a informacao e devolver só users
    let sql = 'SELECT * FROM users WHERE name LIKE ?'
    let [rows] = await this.database.query(sql, '%' + req.query.term + '%')
    res.status(200).send(rows)
  }

  async tags(req, res) {
    let tags = ['User Research', 'Event Marketing', 'Communities', 'Business Models', 'Ideation', 'B2B', 'B2C']
    res.status(200).send(tags)
  }

}

module.exports = Search;