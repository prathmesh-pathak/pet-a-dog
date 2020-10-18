const mysql = require('mysql');

const mySqlConnection = mysql.createConnection({
    host: 'petadog.c7vwszycan78.us-east-1.rds.amazonaws.com',
    user: 'admin_786',
    password: 'cSPROJECT#1',
    database: 'petadog',
    port: 3306
});

mySqlConnection.connect((error) => {
    if (error) {
        console.log(error);
    }
    console.log("Connected to the database...");
});

module.exports = mySqlConnection;