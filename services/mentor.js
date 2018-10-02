class Mentor {

  constructor(app) {
    this.database = app.get('db').getPool()
    this.logger = app.get('logger')

    if(this.logger) this.logger.verbose('Mentor service loaded')
  }

  get(req, res) {
    if(req.params.keycode === 'random') {
      this.getRandom(req, res)
      return;
    }

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

  getRandom(req, res) {
    let sql = 'SELECT name, role, company, bio, tags, keycode, profilePic FROM users',
      response = {
        ok: 1,
        code: 200
      }
    
    this.database.getConnection((err, conn) => {
      conn.query(sql, (err, result) => {
        response.mentor = shuffle(result)

        res.status(response.code).send(response)
      })
    })
  }
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }

  return a;
}

module.exports = Mentor
