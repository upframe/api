const mysql = require('mysql2');
let db;


class database {
  constructor(app) {
    db = mysql.createPool({
      host : process.env.DB_HOST,
      user : process.env.DB_USER,
      password : process.env.DB_PASSWORD,
      database : process.env.DB_NAME
    });

    db.getConnection(function (err) {
      if (!err) {
        app.get('logger').info('Connected to the database successfully.')
      } else {
        app.get('logger').error('Error connecting to the database.')
        setTimeout(() => {
          process.exit(1)
        }, 2500)
      }
    });
  }
}

module.exports = database 