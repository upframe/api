class Mentor {

  constructor(app) {
    this.database = app.get('db').getPool()
    this.logger = app.get('logger')

    if(this.logger) this.logger.verbose('Mentor service loaded')
  }

  get(req, res) {
    let sql = 'SELECT name, role, company, location, tags, bio, freeSlots, profilePic, twitter, linkedin, github, facebook, dribbble, favoritePlaces FROM users WHERE keycode = ?',
      response = {
        ok: 1,
        code: 200
      }
    
    this.database.getConnection((err, conn) => {
      conn.query(sql, req.params.keycode, (err, result) => {

        response.mentor = result[0]
        res.status(response.code).send(response)
      })
    })
  }
}

module.exports = Mentor
