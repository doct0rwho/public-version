const knex = require("knex");
const dotenv = require("dotenv");
dotenv.config();
const con = knex({
  client: "mysql2",
  connection: {    
    host: "test",
    user: "test",
    database: "test",
    password: "test"
  },
  debug: true,
});
module.exports = con; 
