class Users {

  constructor(name, email, password) {
    this.name = name;
    this.email = email;
    this.password = password;
  }

  set name (name) {
    this.name = name;
  }

  get name () {
    return this.name
  }

}

module.exports = Users;