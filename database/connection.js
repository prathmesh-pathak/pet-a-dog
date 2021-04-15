const mysql = require('mysql');

const mySqlConnection = mysql.createConnection({
    //host: process.env.HOST,
    host: "us-cdbr-east-03.cleardb.com",
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
    port: process.env.DATABASE_PORT
});

mySqlConnection.connect((error) => {
    if (error) {
        console.log(error);
    }
    console.log("Connected to the database...");
});

module.exports = mySqlConnection;