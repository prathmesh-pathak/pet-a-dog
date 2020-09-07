const mysql = require('mysql');

var mysqlConnect = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pet-a-dog'
});

mysqlConnect.connect((err => {
    if (err) {
        console.log(err);
    } else {
        console.log("connected...");
    }
}));