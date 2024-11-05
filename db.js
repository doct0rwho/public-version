const knex = require("knex");
const dotenv = require("dotenv");
dotenv.config();
const con = knex({
  client: "mysql2",
  connection: {
    // host: "cgduck.mysql.ukraine.com.ua",
    // user: "cgduck_cms",
    // database: "cgduck_cms",
    // password: "y*8UaGt4^5"
    // host: "cgduck.mysql.ukraine.com.ua",
    // user: "cgduck_prodmeta",
    // database: "cgduck_prodmeta",
    // password: "@Y5F4jrj3+",
    host: "cgduck.mysql.ukraine.com.ua",
    user: "cgduck_dev",
    database: "cgduck_dev",
    password: "g-35v2cX%Y"
  },
  debug: true,
});
module.exports = con; //134.249.152.76  172.17.0.6
