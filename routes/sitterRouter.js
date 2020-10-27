if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    const token = getLoginToken();
    jwt.verify(token, process.env.JWT_SECRET, (error, authData) => {
        if (error) {
            res.redirect('/login');
        }
        else {
            sitter_list_query = 'select * from sitter_info';
            db.query(sitter_list_query, (error, results) => {
                if (error) {
                    console.log(error);
                }
                else {
                    res.render('sitter.ejs', {
                        sitterData: results
                    });
                }
            });
        }
    });
});

module.exports = router;