const mysql = require('mysql2');
let db;

function connectDatabase() {
  if (!db) {
    db = mysql.createPool({
      host : process.env.DB_HOST,
      user : process.env.DB_USER,
      password : process.env.DB_PASSWORD,
      database : process.env.DB_NAME
    });

    db.getConnection(function (err) {
      if (!err) {
        console.log('Database is connected!');
      } else {
        console.log('Error connecting database!');
      }
    });
  }
  return db;
}

module.exports = connectDatabase(); 