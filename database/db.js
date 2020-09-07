const mysql = require('mysql');

var mysqlConnect = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'petADog'
});

mysqlConnect.connect((err => {
    if (err) {
        console.log(err);
    } else {
        console.log("connected...");
    }
}));