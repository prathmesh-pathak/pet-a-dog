if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const fs = require('fs');
const paypal = require('paypal-rest-sdk');
const db = require('../database/connection');
const jwt = require('jsonwebtoken');
const { setUserEmail, getUserEmail, setLoginToken, getLoginToken, setCurrentBookingId, getCurrentBookingId, sendEmail, sendError } = require('./functions');
const stripe = require('stripe')('sk_test_51Hb90tLQHcwjWBjSeIFLML1YbQcJbT7rPyzwmwuZyDYnN6S1K31jGVeW9T2b8DeBrmGRlsHVuSRsSSdR2revTXyX00G98x1gL8');
const $ = require('jquery');

const dog = [];
const booking = [];
const dogCare = [];
const housing = [];
const cardInfo = [];
var loginFlag = false;
var sitterEmail = '';
var dogBreed = '';

paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': 'ATpbDkcduvpVPwZwk_gLA9va0lOz6uTRouMBfXnCgYaLWJyqYvamtyBWFK-PEcSOilnYWa_x2pfnyid8',
    'client_secret': 'EGowq0c1FaTxjgIgszXymdwW3uaJ7JVZoJJwh71gNZ1mb5mcFbJ9O-tvfTFUttmc1JfCMd3csqI0yz2A'
});

router.get('/', (req, res) => {
    const token = getLoginToken();
    const currentUserEmail = getUserEmail();
    jwt.verify(token, process.env.JWT_SECRET, (error) => {
        if (error) {
            res.redirect('/login');
        }
        else {
            user_query = `select * from users where email like '%` + currentUserEmail + `%'`;
            db.query(user_query, (error, user) => {
                if (error) {
                    console.log(error);
                }
                else {
                    res.render('index.ejs', { name: user[0].first_name });
                }
            });
        }
    });
});

router.get('/home', (req, res) => {
    res.render('home.ejs');
});

router.get('/login', (req, res) => {
    res.render('login.ejs', {
        loginMessage: ''
    });
})

router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;
        setUserEmail(req.body.email);
        login_query = `select * from users where email like '%` + email + `%'`;
        db.query(login_query, async (error, results) => {
            if (results.length == 0 || password !== results[0].user_password) {
                res.render('login.ejs', {
                    loginMessage: 'Invalid username or password. Please try again.'
                });
            }

            if (email === results[0].email && password === results[0].user_password) {
                const id = results[0].user_id;
                const token = jwt.sign({ id }, process.env.JWT_SECRET, {
                    expiresIn: process.env.JWT_EXPIRES_IN
                });

                const cookieOptions = {
                    expires: new Date(
                        Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
                    ),
                    httpOnly: true
                }
                setLoginToken(token);
                res.cookie('jwt', token, cookieOptions);
                res.render('index.ejs', {
                    name: results[0].first_name
                });
            }
        });
        truncate_guest_dog = "truncate table guest_dog";
        truncate_guest_house = "truncate table guest_housing";
        db.query(truncate_guest_dog, (error, results) => {
            if (error) {
                console.log(error);
            }
            else {
                console.log("Guest dog data truncated.");
            }
        });

        db.query(truncate_guest_house, (error, results) => {
            if (error) {
                console.log(error);
            }
            else {
                console.log("Guest house data truncated.");
            }
        });
    }
    catch (error) {
        console.log(error);
    }
});


router.get('/register', (req, res) => {
    res.render('register.ejs', {
        message: '',
        registerMessage: ''
    });
});

router.post('/register', async (req, res) => {
    const { firstName, lastName, email, userPassword } = req.body;
    const hashedPassword = await bcrypt.hash(req.body.password, 9);
    check_user_exist_query = `select email from users where email like '%` + email + `%'`;
    db.query(check_user_exist_query, (error, results) => {
        if (error) {
            console.log(error);
        }
        else if (results.length > 0) {
            return res.render('register.ejs', {
                message: 'Email already exists. Please use different email.'
            });
        }
        else {
            insert_user_usery = "insert into users (user_id, first_name, last_name, email, user_password) values" +
                "('" + Math.floor(100000000 + Math.random() * 900000000) + "', '" + firstName + "', '" + lastName + "', '" + email + "', '" + req.body.password + "')";
            db.query(insert_user_usery, (err, results) => {
                if (err) {
                    console.log(err);
                }
                else {
                    console.log("User Data inserted.");
                    res.redirect('/login');
                }
            });
        }
    });
});

router.get('/services', (req, res) => {
    const token = getLoginToken();
    jwt.verify(token, process.env.JWT_SECRET, (error) => {
        if (error) {
            res.redirect('/login');
        }
        else {
            service_query = "select * from services";
            db.query(service_query, (error, services) => {
                if (error) {
                    console.log(error);
                }
                else {
                    res.render('service.ejs', {
                        isLogin: loginFlag,
                        service_data: services,
                        selected_service: ''
                    });
                }
            });
        }
    });
});

router.post('/filter-service', (req, res) => {
    const token = getLoginToken();
    jwt.verify(token, process.env.JWT_SECRET, (error) => {
        if (error) {
            res.redirect('/login');
        }
        else {
            selected_service = req.body.selectedService;
            filter_query = `select * from services where service_name like '%` + selected_service + `%'`;
            db.query(filter_query, (error, services) => {
                if (error) {
                    console.log(error);
                }
                else {
                    console.log(services);
                    res.render('service.ejs', {
                        isLogin: loginFlag,
                        service_data: services,
                        selected_service: selected_service
                    });
                }
            });
        }
    });
});

router.post('/:sitterName/:serviceSelected/review', (req, res) => {
    let token = getLoginToken();
    let user_email = getUserEmail();
    uniqueID = Math.floor(100000000 + Math.random() * 900000000);
    jwt.verify(token, process.env.JWT_SECRET, (error) => {
        if (error) {
            res.redirect('/login');
        }
        else {
            const today = new Date();
            user_query = `select * from users where email like '%` + user_email + `%'`;
            db.query(user_query, (error, users) => {
                if (error) {
                    console.log(error);
                }
                else {
                    review_query = "insert into ratings values ('" + uniqueID + "','" + req.body.sitterName + "','" + req.body.serviceSelected + "', " +
                        "'" + req.body.serviceCharge + "','" + users[0].first_name + " " + users[0].last_name + "','" + users[0].email + "', " +
                        "'" + today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + "', '" + req.body.comment + "', '" + req.body.sitterRating + "')";
                    db.query(review_query, (error, rating) => {
                        if (error) {
                            console.log(error);
                        }
                        else {
                            console.log("Rating inserted successfully.");
                            res.redirect('/profile');
                        }
                    });
                }
            });
        }
    });
});

router.get('/:sitterName/:sitterService/contact', (req, res) => {
    let token = getLoginToken();
    let user_email = getUserEmail();
    jwt.verify(token, process.env.JWT_SECRET, (error) => {
        if (error) {
            res.redirect('/login');
        }
        else {
            sitter_name = req.params.sitterName;
            sitter_service = req.params.sitterService;
            user_dog_query = `select * from dog where user_email like '%` + user_email + `%'`;
            db.query(user_dog_query, (error, dog) => {
                if (error) {
                    console.log(error);
                }
                else {
                    res.render('sitter-service-contact.ejs', {
                        sitterData: sitter_name,
                        selectedService: sitter_service,
                        dogData: dog
                    });
                }
            });
        }
    });
});

router.post('/:sitterName/:sitterService/contact', (req, res) => {
    let token = getLoginToken();
    uniqueID = Math.floor(100000000 + Math.random() * 900000000);
    setCurrentBookingId(uniqueID);
    jwt.verify(token, process.env.JWT_SECRET, (error) => {
        if (error) {
            res.redirect('/login');
        }
        else {
            const today = new Date();
            sitter_query = `select sitter.sitter_name as name, sitter.sitter_img as img, sitter.sitter_address as address, sitter.sitter_email as email,
                                sitter.sitter_profession as about, sitter.sitter_description as aboutSitter
                            from sitter_info as sitter
                            where sitter.sitter_name like '%` + req.params.sitterName + `%'`;

            db.query(sitter_query, (error, sitter) => {
                if (error) {
                    console.log(error);
                }
                else {
                    sitter_service_query = `select ss.service_name as serviceName, ss.service_charge as serviceCharge, ss.sitter_preference_1 as preferences, 
                                                ss.sitter_preference_2 as preferences1 from services as ss
                                            where ss.sitter_name like '%` + req.params.sitterName + `%' and ss.service_name like '%` + req.params.sitterService + `%'`;

                    db.query(sitter_service_query, (error, service) => {
                        if (error) {
                            console.log(error);
                        }
                        else {
                            booking_insert_query = "insert into bookings values ('" + uniqueID + "', '" + req.params.sitterName + "', '" + sitter[0].email + "', " +
                                "'" + req.params.sitterService + "','" + service[0].serviceCharge + "','" + req.body.firstName + "', " +
                                "'" + req.body.lastName + "','" + req.body.userEmail + "', '" + req.body.dropOff + "','" + req.body.selectDropTimeFrom + "', " +
                                "'" + req.body.selectDropTimeTo + "','" + req.body.pickUp + "','" + req.body.selectPickTimeFrom + "','" + req.body.selectPickTimeTo + "', " +
                                "'" + today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + "')";
                            db.query(booking_insert_query, (error, rows, fields) => {
                                if (error) {
                                    console.log(error);
                                }
                                else {
                                    console.log("Booking Data inserted succesfully...");
                                }
                            });
                        }
                    });
                }
            });
            setTimeout(redirectFunction, 3000);
            function redirectFunction() {
                res.redirect('/payment');
            }
        }

    });
});

router.delete('/logout', (req, res) => {
    loginFlag = false;
    setLoginToken('');
    req.logOut();
    res.redirect('/login');
});

router.get('/search-sitter', (req, res) => {
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

router.get('/search-sitter/:name', (req, res) => {
    let token = getLoginToken();
    jwt.verify(token, process.env.JWT_SECRET, (error) => {
        if (error) {
            res.redirect('/login');
        }
        else {
            sitter_query = `select sitter.sitter_name as name, sitter.sitter_img as img, sitter.sitter_address as address, 
                                sitter.sitter_profession as about, sitter.sitter_description as aboutSitter
                            from sitter_info as sitter
                            where sitter.sitter_name like '%` + req.params.name + `%'`;

            sitter_service_query = `select ss.service_name as serviceName, ss.service_charge as serviceCharge, 
                                        ss.sitter_preference_1 as preferences, ss.sitter_preference_2 as preferences1
                                    from services as ss
                                    where ss.sitter_name like '%` + req.params.name + `%'`;

            sitter_review_query = `select customer_name as userName, review_date as date, review_comment as comment
                                    from reviews
                                    where sitter_name like '%` + req.params.name + `%'`;

            db.query(sitter_query, (error, results) => {
                if (error) {
                    console.log(error);
                }
                else {
                    const sitter = results;
                    db.query(sitter_service_query, (error, results) => {
                        if (error) {
                            console.log(error);
                        }
                        else {
                            const services = results;
                            db.query(sitter_review_query, (error, results) => {
                                if (error) {
                                    console.log(error);
                                }
                                else {
                                    const feedback = results;
                                    res.render('sitter-detail.ejs', {
                                        sitterData: sitter[0],
                                        feedback: feedback,
                                        services: services
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
    });
});

router.get('/:name/review', (req, res) => {
    let token = getLoginToken();
    jwt.verify(token, process.env.JWT_SECRET, (error) => {
        if (error) {
            res.redirect('/login');
        }
        else {
            sitter_query = `select sitter.sitter_name as name, sitter.sitter_img as img, sitter.sitter_address as address, 
                                sitter.sitter_profession as about, sitter.sitter_description as aboutSitter
                            from sitter_info as sitter
                            where sitter.sitter_name like '%` + req.params.name + `%'`;

            sitter_service_query = `select ss.service_name as serviceName, ss.service_charge as serviceCharge, 
                                        ss.sitter_preference_1 as preferences, ss.sitter_preference_2 as preferences1
                                    from services as ss
                                    where ss.sitter_name like '%` + req.params.name + `%'`;

            sitter_review_query = `select customer_name as userName, review_date as date, review_comment as comment
                                    from reviews
                                    where sitter_name like '%` + req.params.name + `%'`;

            sitter_rating_query = `select * from ratings where sitter_name like '%` + req.params.name + `%'`;

            db.query(sitter_query, (error, results) => {
                if (error) {
                    console.log(error);
                }
                else {
                    const sitter = results;
                    db.query(sitter_service_query, (error, results) => {
                        if (error) {
                            console.log(error);
                        }
                        else {
                            const services = results;
                            db.query(sitter_review_query, (error, results) => {
                                if (error) {
                                    console.log(error);
                                }
                                else {
                                    const feedback = results;
                                    db.query(sitter_rating_query, (error, ratings) => {
                                        if (error) {
                                            console.log(error);
                                        }
                                        else {
                                            if (ratings.length == 0) {
                                                res.render('sitter-detail-review.ejs', {
                                                    sitterData: sitter[0],
                                                    feedback: feedback,
                                                    services: services,
                                                    ratings: ratings,
                                                    stars: 2.0
                                                });
                                            }
                                            else {
                                                res.render('sitter-detail-review.ejs', {
                                                    sitterData: sitter[0],
                                                    feedback: feedback,
                                                    services: services,
                                                    ratings: ratings,
                                                    stars: ratings[0].rating
                                                });
                                            }
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
    });
});

router.get('/:name/contact', (req, res) => {
    let token = getLoginToken();
    let currentUserEmail = getUserEmail();
    console.log(req.body.selectedService);
    jwt.verify(token, process.env.JWT_SECRET, (error) => {
        if (error) {
            res.redirect('/login');
        }
        else {
            if (booking.length >= 1) {
                booking.pop();
            }
            sitter_query = `select sitter.sitter_name as name, sitter.sitter_img as img, sitter.sitter_address as address, 
                                sitter.sitter_profession as about, sitter.sitter_description as aboutSitter
                            from sitter_info as sitter
                            where sitter.sitter_name like '%` + req.params.name + `%'`;

            sitter_service_query = `select ss.service_name as serviceName, ss.service_charge as serviceCharge, 
                                        ss.sitter_preference_1 as preferences, ss.sitter_preference_2 as preferences1
                                    from services as ss
                                    where ss.sitter_name like '%` + req.params.name + `%'`;

            sitter_review_query = `select customer_name as userName, review_date as date, review_comment as comment
                                    from reviews
                                    where sitter_name like '%` + req.params.name + `%'`;

            db.query(sitter_query, (error, results) => {
                if (error) {
                    console.log(error);
                }
                else {
                    const sitter = results;
                    db.query(sitter_service_query, (error, results) => {
                        if (error) {
                            console.log(error);
                        }
                        else {
                            const services = results;
                            db.query(sitter_review_query, (error, results) => {
                                if (error) {
                                    console.log(error);
                                }
                                else {
                                    const feedback = results;
                                    user_dog_query = `select * from dog where user_email like '%` + currentUserEmail + `%'`;
                                    db.query(user_dog_query, (error, dog) => {
                                        if (error) {
                                            console.log(error);
                                        }
                                        else {
                                            res.render('contact-sitter.ejs', {
                                                sitterData: sitter[0],
                                                services: services,
                                                dogData: dog
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
    });
});

router.post('/:name/contact', (req, res) => {
    let token = getLoginToken();
    console.log(req.body.selectedService);
    uniqueID = Math.floor(100000000 + Math.random() * 900000000);
    setCurrentBookingId(uniqueID);
    jwt.verify(token, process.env.JWT_SECRET, (error) => {
        if (error) {
            res.redirect('/login');
        }
        else {
            const today = new Date();
            sitter_query = `select sitter.sitter_name as name, sitter.sitter_img as img, sitter.sitter_address as address, sitter.sitter_email as email,
                                sitter.sitter_profession as about, sitter.sitter_description as aboutSitter
                            from sitter_info as sitter
                            where sitter.sitter_name like '%` + req.params.name + `%'`;

            db.query(sitter_query, (error, sitter) => {
                if (error) {
                    console.log(error);
                }
                else {
                    sitter_service_query = `select ss.service_name as serviceName, ss.service_charge as serviceCharge, ss.sitter_preference_1 as preferences, 
                                                ss.sitter_preference_2 as preferences1 from services as ss
                                            where ss.sitter_name like '%` + req.params.name + `%' and ss.service_name like '%` + req.body.selectedService + `%'`;

                    db.query(sitter_service_query, (error, service) => {
                        if (error) {
                            console.log(error);
                        }
                        else {
                            booking_insert_query = "insert into bookings values ('" + uniqueID + "', '" + req.params.name + "', '" + sitter[0].email + "', " +
                                "'" + req.body.selectedService + "','" + service[0].serviceCharge + "','" + req.body.firstName + "', " +
                                "'" + req.body.lastName + "','" + req.body.userEmail + "', '" + req.body.dropOff + "','" + req.body.selectDropTimeFrom + "', " +
                                "'" + req.body.selectDropTimeTo + "','" + req.body.pickUp + "','" + req.body.selectPickTimeFrom + "','" + req.body.selectPickTimeTo + "', " +
                                "'" + today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + "')";
                            db.query(booking_insert_query, (error, rows, fields) => {
                                if (error) {
                                    console.log(error);
                                }
                                else {
                                    console.log("Booking Data inserted succesfully...");
                                }
                            });
                        }
                    });
                }
            });
            setTimeout(redirectFunction, 3000);
            function redirectFunction() {
                res.redirect('/payment');
            }
        }

    });
});

router.get('/payment', (req, res) => {
    let token = getLoginToken();
    let currentBookingId = getCurrentBookingId();
    console.log(currentBookingId);
    jwt.verify(token, process.env.JWT_SECRET, (error) => {
        if (error) {
            res.redirect('/login');
        }
        else {
            if (cardInfo.length >= 1) {
                cardInfo.pop();
            }

            booking_summary_query = `select * from bookings where booking_id =` + currentBookingId;
            db.query(booking_summary_query, (error, results) => {
                if (error) {
                    console.log(error);
                }
                else {
                    res.render('payment.ejs', {
                        bookingDetails: results[0],
                        cardDetailsErrorFlag: false,
                        cardDetailsErrorMessage: ""
                    });
                }
            });
        }
    });
});

router.post('/credit-card', (req, res) => {
    let token = getLoginToken();
    let currentBookingId = getCurrentBookingId();
    jwt.verify(token, process.env.JWT_SECRET, (error) => {
        if (error) {
            res.redirect('/login');
        }
        else {
            booking_summary_query = `select * from bookings where booking_id =` + currentBookingId;
            db.query(booking_summary_query, (error, booking) => {
                if (error) {
                    console.log(error);
                }
                else {
                    userName = booking[0].user_first_name;
                    sitterName = booking[0].sitter_name;
                    userEmail = booking[0].user_email;
                    sitterEmail = booking[0].sitter_email;
                    cardInfo.push({
                        paymentMethod: req.body.creditCardMethod,
                        userName: req.body.username,
                        cardNumber: req.body.cardNumber,
                        expiration_month: req.body.exp_month,
                        expiration_year: req.body.exp_year,
                        cvv: req.body.cvv
                    });
                    fs.readFile('cardInfo.json', (err, data) => {
                        if (err) {
                            console.log(err);
                        }
                        let cardDetails = JSON.parse(data);
                        let flag = -1;
                        for (let i = 0; i < cardDetails.length; i++) {
                            for (let j = 0; j < cardInfo.length; j++) {
                                if (cardDetails[i].name_on_card == cardInfo[j].userName &&
                                    cardDetails[i].card_number == cardInfo[j].cardNumber &&
                                    cardDetails[i].expiration_month == cardInfo[j].expiration_month &&
                                    cardDetails[i].expiration_year == cardInfo[j].expiration_year &&
                                    cardDetails[i].cvv == cardInfo[j].cvv &&
                                    cardDetails[i].amount > 30) {
                                    flag = 1;
                                }
                                else {
                                    flag = 0;
                                }
                            }
                        }
                        if (flag == 1) {
                            credit_insert_query = "insert into credit_card_transaction (booking_id, sitter_name, sitter_email, service_name, service_charge, user_name, " +
                                "user_email, payment_method, card_number, expiration_month, expiration_year, cvv) values ('" + booking[0].booking_id + "', " +
                                "'" + booking[0].sitter_name + "','" + booking[0].sitter_email + "','" + booking[0].service_name + "','" + booking[0].service_charge + "', " +
                                "'" + req.body.username + "', '" + booking[0].user_email + "', '" + req.body.creditCardMethod + "', '" + req.body.cardNumber + "', " +
                                "'" + req.body.exp_month + "', '" + req.body.exp_year + "', '" + req.body.cvv + "')";
                            db.query(credit_insert_query, (error, data) => {
                                if (error) {
                                    console.log(error);
                                }
                                else {
                                    console.log("Credit Card data inserted successfully.");
                                    sendEmail(req, res, userEmail, booking[0].user_first_name, sitterEmail, booking[0].sitter_name);
                                }
                            });
                        }
                        if (flag == 0) {
                            sendError(req, res);
                        }
                    });

                }
            });
        }
    });
});

router.get('/pay', (req, res) => {
    let token = getLoginToken();
    let currentBookingId = getCurrentBookingId();
    jwt.verify(token, process.env.JWT_SECRET, (error) => {
        if (error) {
            res.redirect('/login');
        }
        else {
            booking_summary_query = `select * from bookings where booking_id =` + currentBookingId;
            db.query(booking_summary_query, (error, booking) => {
                if (error) {
                    console.log(error);
                }
                else {
                    const create_payment_json = {
                        "intent": "sale",
                        "payer": {
                            "payment_method": "paypal"
                        },
                        "redirect_urls": {
                            "return_url": "http://localhost:8000/success",
                            "cancel_url": "http://localhost:8000/cancel"
                        },
                        "transactions": [{
                            "item_list": {
                                "items": [{
                                    "name": "Prathmesh Pathak",
                                    "sku": "6541654684613132113132131",
                                    "price": booking[0].service_charge,
                                    "currency": "USD",
                                    "quantity": 1,
                                }]
                            },
                            "amount": {
                                "currency": "USD",
                                "total": booking[0].service_charge
                            },
                            "description": "Hat for the best team ever"
                        }]
                    };

                    paypal.payment.create(create_payment_json, function (error, payment) {
                        if (error) {
                            throw error;
                        } else {
                            for (let i = 0; i < payment.links.length; i++) {
                                if (payment.links[i].rel === 'approval_url') {
                                    res.redirect(payment.links[i].href);
                                }
                            }
                        }
                    });
                }
            });
        }
    });
});

router.get('/success', (req, res) => {
    let token = getLoginToken();
    let currentBookingId = getCurrentBookingId();
    jwt.verify(token, process.env.JWT_SECRET, (error) => {
        if (error) {
            res.redirect('/login');
        }
        else {
            const payerId = req.query.PayerID;
            const paymentId = req.query.paymentId;
            booking_summary_query = `select * from bookings where booking_id =` + currentBookingId;
            db.query(booking_summary_query, (error, booking) => {
                if (error) {
                    console.log(error);
                } else {
                    const execute_payment_json = {
                        "payer_id": payerId,
                        "transactions": [{
                            "amount": {
                                "currency": "USD",
                                "total": booking[0].service_charge
                            }
                        }]
                    };

                    paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
                        if (error) {
                            console.log(error.response);
                            throw error;
                        } else {
                            console.log(JSON.stringify(payment));
                            paypal_insert_query = "insert into paypal_transaction values ('" + Math.floor(100000000 + Math.random() * 900000000) + "','" + currentBookingId + "', " +
                                "'" + booking[0].sitter_name + "','" + booking[0].sitter_email + "','" + booking[0].service_name + "','" + booking[0].service_charge + "', " +
                                "'" + booking[0].user_first_name + "', '" + booking[0].user_email + "', 'PayPal')"

                            db.query(paypal_insert_query, (error, data) => {
                                if (error) {
                                    console.log(error);
                                }
                                else {
                                    console.log("Paypal data inserted.");
                                    sendEmail(req, res, booking[0].user_email, booking[0].user_first_name, booking[0].sitter_email, booking[0].sitter_name);
                                }
                            });
                        }
                    });
                }
            });

        }
    });
});

router.get('/cancel', (req, res) => res.send('Cancelled'));

router.post('/charge', (req, res) => {
    let token = getLoginToken();
    let currentBookingId = getCurrentBookingId();
    jwt.verify(token, process.env.JWT_SECRET, (error) => {
        if (error) {
            res.redirect('/login');
        }
        else {
            booking_summary_query = `select * from bookings where booking_id =` + currentBookingId;
            db.query(booking_summary_query, (error, booking) => {
                if (error) {
                    console.log(error);
                }
                else {
                    amount = booking[0].service_charge * 100;
                    stripe.customers.create({
                        email: req.body.stripeEmail,
                        source: req.body.stripeToken
                    })
                        .then(customer => stripe.charges.create({
                            amount,
                            description: booking[0].serviceSelected,
                            currency: 'usd',
                            customer: customer.id
                        }))
                        .then(charge => {
                            net_bank_insert_query = "insert into net_banking_transaction values ('" + Math.floor(100000000 + Math.random() * 900000000) + "','" + currentBookingId + "', " +
                                "'" + booking[0].sitter_name + "','" + booking[0].sitter_email + "','" + booking[0].service_name + "','" + booking[0].service_charge + "', " +
                                "'" + booking[0].user_first_name + "', '" + booking[0].user_email + "', 'Net Banking', '" + req.body.selectedBank + "')"

                            db.query(net_bank_insert_query, (error, data) => {
                                if (error) {
                                    console.log(error);
                                }
                                else {
                                    console.log("Net banking data inserted.");
                                    sendEmail(req, res, booking[0].user_email, booking[0].user_first_name, booking[0].sitter_email, booking[0].sitter_name);
                                }
                            });
                        });
                }
            });
        }
    });
});

router.get('/:name/booking-details', (req, res) => {
    let token = getLoginToken();
    let currentBookingId = getCurrentBookingId();
    jwt.verify(token, process.env.JWT_SECRET, (error) => {
        if (error) {
            res.redirect('/login');
        }
        else {
            booking_summary_query = `select * from bookings where booking_id =` + currentBookingId;
            db.query(booking_summary_query, (error, booking) => {
                if (error) {
                    console.log(error);
                }
                else {
                    res.render('booking-confirmed.ejs', {
                        bookingDetails: booking
                    });
                }
            });
        }
    });
});

router.post('/:sitterName/comment', (req, res) => {
    let token = getLoginToken();
    let user_email = getUserEmail();
    jwt.verify(token, process.env.JWT_SECRET, (error) => {
        if (error) {
            res.redirect('/login');
        }
        else {
            const today = new Date();
            user_query = `select * from users where email like '%` + user_email + `%'`;
            db.query(user_query, (error, user) => {
                if (error) {
                    console.log(error);
                }
                else {
                    comment_insert_query = "insert into reviews values ('" + Math.floor(100000000 + Math.random() * 900000000) + "', '" + req.params.sitterName + "', " +
                        "'" + user[0].first_name + " " + user[0].last_name + "', '" + today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + "', " +
                        "'" + req.body.comment + "')";
                    db.query(comment_insert_query, (error, results) => {
                        if (error) {
                            console.log(error);
                        }
                        else {
                            console.log("Comment inserted successfully.");
                            setTimeout(redirectFunction, 2000);
                            function redirectFunction() {
                                res.redirect('/search-sitter/' + req.params.sitterName);
                            }
                        }
                    });
                }
            });
        }
    });
});

router.get('/dog-care', (req, res) => {
    res.render('dog-care.ejs', {
        isLogin: loginFlag,
        housingCondition: housing
    });
});

router.post('/dog-care/add', (req, res) => {

    guest_dog_insert_query = "insert into guest_dog values ('" + Math.floor(100000000 + Math.random() * 900000000) + "','" + req.body.guestGogName + "','" + req.body.guestWeight + "', " +
        "'" + req.body.guestDogBreed + "', '" + req.body.guestAgeYears + "', '" + req.body.guestAgeMonths + "', '" + req.body.guestGender + "', '" + req.body.guestCats + "', " +
        "'" + req.body.guestMicrochipped + "', '" + req.body.guestNature + "', '" + req.body.guestChildren + "', '" + req.body.guestTrained + "')";

    db.query(guest_dog_insert_query, (error, results) => {
        if (error) {
            console.log(error);
        }
        else {
            console.log("Guest Dog data inserted.");
        }
    });

    guest_house_insert_query = "insert into guest_housing values ('" + Math.floor(100000000 + Math.random() * 900000000) + "','" + req.body.guestAddress + "'," +
        "'" + req.body.guestCity + "', '" + req.body.guestState + "', '" + req.body.aptNumber + "', '" + req.body.zipcode + "', '" + req.body.isHouseGood + "', " +
        "'" + req.body.isVentilated + "', '" + req.body.isFenced + "')";

    db.query(guest_house_insert_query, (error, results) => {
        if (error) {
            console.log(error);
        }
        else {
            console.log("Guest housing condition data inserted.");
        }
    });
    dogBreed = req.body.guestDogBreed;
    select_tips_query = `select * from tips where breed like '%` + dogBreed + `%'`;
    db.query(select_tips_query, (error, rows, fields) => {
        if (error) {
            console.log(error);
        }
        else {
            dogCare.push(rows[0]);
            res.redirect('/info');
        }
    });
});

router.get('/info', (req, res) => {
    res.render('guest-dog-info.ejs', {
        dogData: dog,
        isLogin: loginFlag,
        tipData: dogCare
    });
});

router.get('/profile', (req, res) => {
    let token = getLoginToken();
    let user_email = getUserEmail();
    jwt.verify(token, process.env.JWT_SECRET, (error) => {
        if (error) {
            res.redirect('/login');
        }
        else {
            user_query = `select * from users where email like '%` + user_email + `%'`;
            db.query(user_query, (error, user) => {
                if (error) {
                    console.log(error);
                }
                else {
                    user_dog_query = `select * from dog where user_email like '%` + user_email + `%'`;
                    db.query(user_dog_query, (error, dog) => {
                        if (error) {
                            console.log(error);
                        }
                        else {
                            if (dog.length == 0) {
                                res.render('profile.ejs', {
                                    userData: user[0]
                                });
                            }
                            else {
                                user_house_query = `select * from housing_condition where user_email like '%` + user_email + `%'`;
                                db.query(user_house_query, (error, house) => {
                                    if (error) {
                                        console.log(error);
                                    }
                                    else {
                                        booking_query = `select * from bookings where user_email like '%` + user_email + `%'`;
                                        db.query(booking_query, (error, bookings) => {
                                            if (error) {
                                                console.log(error);
                                            }
                                            else {
                                                rating_query = `select * from ratings where user_email like '%` + user_email + `%'`;
                                                db.query(rating_query, (error, ratings) => {
                                                    if (error) {
                                                        console.log(error);
                                                    }
                                                    else {
                                                        if (ratings.length == 0) {
                                                            res.render('profile-dog.ejs', {
                                                                userData: user[0],
                                                                dogData: dog,
                                                                tipData: dogCare,
                                                                housingCondition: house[0],
                                                                bookingData: bookings,
                                                                stars: 2.0
                                                            });
                                                        }
                                                        else {
                                                            res.render('profile-dog.ejs', {
                                                                userData: user[0],
                                                                dogData: dog,
                                                                tipData: dogCare,
                                                                housingCondition: house[0],
                                                                bookingData: bookings,
                                                                stars: ratings[0].rating
                                                            });
                                                        }
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        }
                    });
                }
            });
        }
    });
});

router.get('/profile/add', (req, res) => {
    let token = getLoginToken();
    let currentUserEmail = getUserEmail();
    jwt.verify(token, process.env.JWT_SECRET, (error) => {
        if (error) {
            res.redirect('/login');
        }
        else {
            user_house_query = `select * from housing_condition where user_email like '%` + currentUserEmail + `%'`;
            db.query(user_house_query, (error, house) => {
                if (error) {
                    console.log(error);
                }
                else {
                    res.render('user-dog.ejs', {
                        isLogin: loginFlag,
                        housingCondition: house
                    });
                }
            });
        }
    });
});

router.post('/profile/add', (req, res) => {
    dogBreed = req.body.dogBreed;
    let user_email = getUserEmail();

    insert_query_dog = "insert into dog () values('" + Math.floor(100000000 + Math.random() * 900000000) + "', '" + req.body.dogName + "', '" + req.body.weight + "', '" + req.body.dogBreed + "', " +
        "'" + req.body.ageYears + "', '" + req.body.ageMonths + "', '" + user_email + "', '" + req.body.gender + "', '" + req.body.microchipped + "', '" + req.body.cats + "', " +
        "'" + req.body.nature + "', '" + req.body.children + "', '" + req.body.trained + "')";

    db.query(insert_query_dog, (error, rows, fields) => {
        if (error) {
            console.log(error);
        }
        else {
            dog.push(rows[0]);
            console.log("Dog data insertedd succcessfully...")
        }
    });

    insert_query_housing = "insert into housing_condition () values ('" + Math.floor(100000000 + Math.random() * 900000000) + "', '" + user_email + "', '" + req.body.guestAddress + "', " +
        "'" + req.body.guestCity + "', '" + req.body.guestState + "', '" + req.body.aptNumber + "', '" + req.body.zipcode + "', '" + req.body.isHouseGood + "', " +
        "'" + req.body.isVentilated + "', '" + req.body.isFenced + "')";

    db.query(insert_query_housing, (error, rows, fields) => {
        if (error) {
            console.log(error);
        }
        else {
            housing.push(rows[0]);
            console.log("Housing data insertedd succcessfully...");
        }
    });

    select_tips_query = `select * from tips where breed like '%` + dogBreed + `%'`;
    db.query(select_tips_query, (error, rows, fields) => {
        if (error) {
            console.log(error);
        }
        else {
            dogCare.push(rows[0]);
        }
    });
    res.redirect('/profile');
});

module.exports = router;