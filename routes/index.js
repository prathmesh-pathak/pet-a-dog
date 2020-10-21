if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const passport = require('passport');
const fs = require('fs');
const nodemailer = require('nodemailer');
const ejs = require('ejs');
const paypal = require('paypal-rest-sdk');
const db = require('../database/connection');
const jwt = require('jsonwebtoken');
const e = require('express');
const stripe = require('stripe')('sk_test_51Hb90tLQHcwjWBjSeIFLML1YbQcJbT7rPyzwmwuZyDYnN6S1K31jGVeW9T2b8DeBrmGRlsHVuSRsSSdR2revTXyX00G98x1gL8');

const users = [];
const dog = [];
const booking = [];
const dogCare = [];
const housing = [];
const cardInfo = [];
var loginFlag = false;
var userEmail = '';
var sitterEmail = '';
var dogBreed = '';
var userName = '';
var sitterName = '';
var login_token = '';
var bookingID = '';

paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': 'ATpbDkcduvpVPwZwk_gLA9va0lOz6uTRouMBfXnCgYaLWJyqYvamtyBWFK-PEcSOilnYWa_x2pfnyid8',
    'client_secret': 'EGowq0c1FaTxjgIgszXymdwW3uaJ7JVZoJJwh71gNZ1mb5mcFbJ9O-tvfTFUttmc1JfCMd3csqI0yz2A'
});

// const initializePassport = require('../passport-config');
// initializePassport(
//     passport,
//     email => users.find(user => user.email === email),
//     id => users.find(user => user.id === id)
// );

router.get('/', checkAuthenticated, (req, res) => {
    res.render('index.ejs', { name: req.user.firstName });
});

router.get('/home', (req, res) => {
    res.render('home.ejs');
});

router.get('/login', (req, res) => {
    res.render('login.ejs', {
        loginMessage: ''
    });
})

// router.post('/login', checkNotAuthenticated, passport.authenticate('local', {
//     successRedirect: '/',
//     failureRedirect: '/login',
//     failureFlash: true
// }));

router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;
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
                setUserEmail(email);
                res.cookie('jwt', token, cookieOptions);
                res.render('index.ejs', {
                    name: results[0].first_name
                });
            }
        });
    }
    catch (error) {
        console.log(error);
    }
});

function setUserEmail(userEmail) {
    userEmail = userEmail;
}

function getUserEmail() {
    return userEmail;
}

function setLoginToken(token) {
    login_token = token;
}

function getLoginToken() {
    return login_token;
}

function setCurrentBookingId(booking_id) {
    bookingID = booking_id;
}

function getCurrentBookingId() {
    return bookingID;
}

router.get('/register', (req, res) => {
    res.render('register.ejs', {
        message: ''
    });
});

// router.post('/register', checkNotAuthenticated, async (req, res) => {
//     try {
//         const hashedPassword = await bcrypt.hash(req.body.password, 10);
//         users.push({
//             id: Date.now().toString(),
//             firstName: req.body.firstName,
//             lastName: req.body.lastName,
//             zipcode: req.body.zip,
//             email: req.body.email,
//             password: hashedPassword
//         })
//         loginFlag = true;
//         res.redirect('/login');
//     }
//     catch {
//         res.redirect('/register');
//     }
// });

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
                "('" + Date.now().toString() + "', '" + firstName + "', '" + lastName + "', '" + email + "', '" + req.body.password + "')";
            db.query(insert_user_usery, (err, results) => {
                if (err) {
                    console.log(err);
                }
                else {
                    res.redirect('/login');
                }
            });
        }
    });
});

router.get('/services', (req, res) => {
    res.render('service.ejs', {
        isLogin: loginFlag
    });
});

router.delete('/logout', (req, res) => {
    loginFlag = false;
    login_token = '';
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

router.get('/:name/contact', (req, res) => {
    let token = getLoginToken();
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
                                    res.render('contact-sitter.ejs', {
                                        sitterData: sitter[0],
                                        feedback: feedback,
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
});

router.post('/:name/contact', (req, res) => {
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

            booking.push({
                id: uniqueID,
                userFirstName: req.body.firstName,
                userLastName: req.body.lastName,
                sitterName: req.params.name,
                bookingDate: today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate(),
                serviceSelected: req.body.selectedService,
                dropOffDate: req.body.dropOff,
                dropOffTimeFrom: req.body.selectDropTimeFrom,
                dropOffTimeTo: req.body.selectDropTimeTo,
                pickUpDate: req.body.pickUp,
                pickUpTimeFrom: req.body.selectPickTimeFrom,
                pickUpTimeTo: req.body.selectPickTimeTo,
                userEmail: req.body.userEmail,
                pets: dog
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
                                    sendEmail(req, res, userEmail, sitterEmail);
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
                            paypal_insert_query = "insert into paypal_transaction values ('" + req.query.paymentId + "','" + currentBookingId + "', " +
                                "'" + booking[0].sitter_name + "','" + booking[0].sitter_email + "','" + booking[0].service_name + "','" + booking[0].service_charge + "', " +
                                "'" + booking[0].user_first_name + "', '" + booking[0].user_email + "', 'PayPal')"

                            db.query(paypal_insert_query, (error, data) => {
                                if (error) {
                                    console.log(error);
                                }
                                else {
                                    console.log("Paypal data inserted.");
                                    sendEmail(req, res, booking[0].user_email, booking[0].sitter_email);
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
                                    sendEmail(req, res, booking[0].user_email, booking[0].sitter_email);
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

router.get('/dog-care', (req, res) => {
    res.render('dog-care.ejs', {
        isLogin: loginFlag,
        housingCondition: housing
    });
});

router.post('/dog-care/add', (req, res) => {
    dog.push({
        id: Date.now().toString(),
        name: req.body.guestGogName,
        weight: req.body.guestWeight,
        breed: req.body.guestDogBreed,
        ageYears: req.body.guestAgeYears,
        ageMonths: req.body.guestAgeMonths,
        gender: req.body.guestGender,
        cats: req.body.guestCats,
        isMicrochipped: req.body.guestMicrochipped,
        nature: req.body.guestNature,
        children: req.body.guestChildren,
        isTrained: req.body.guestTrained
    });
    housing.push({
        id: Date.now().toString(),
        address: req.body.guestAddress,
        city: req.body.guestCity,
        state: req.body.guestState,
        aptNumber: req.body.aptNumber,
        zipcode: req.body.zipcode,
        houseCondition: req.body.isHouseGood,
        living: req.body.isLivingQuater,
        heating: req.body.isVentilated,
        fenced: req.body.isFenced
    });
    dogBreed = req.body.guestDogBreed;
    fs.readFile('tips.json', (err, data) => {
        if (err) console.log(err);
        let tips = JSON.parse(data);
        for (var i = 0; i < tips.length; i++) {
            if (tips[i].breed === dogBreed) {
                dogCare.push({
                    breed: tips[i].breed,
                    step1: tips[i].step1,
                    step2: tips[i].step2,
                    step3: tips[i].step3,
                    step4: tips[i].step4,
                    step5: tips[i].step5,
                    step6: tips[i].step6,
                    tip1: tips[i].tip1,
                    tip2: tips[i].tip2,
                    tip3: tips[i].tip3,
                    tip4: tips[i].tip4,
                    tip5: tips[i].tip5,
                    tip6: tips[i].tip6,
                    tip7: tips[i].tip7,
                    tip8: tips[i].tip8,
                });
                res.redirect('/info');
            }
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
    jwt.verify(token, process.env.JWT_SECRET, (error) => {
        if (error) {
            res.redirect('/login');
        }
        else {
            if (typeof dog == "undefined" || dog == null || dog.length == 0) {
                res.render('profile.ejs', {
                    userData: req.user
                });
            }
            else {
                console.log(dogCare);
                res.render('profile-dog.ejs', {
                    userData: req.user,
                    dogData: dog,
                    tipData: dogCare,
                    housingCondition: housing[0]
                });
            }
        }
    });
});

router.get('/profile/add', (req, res) => {
    let token = getLoginToken();
    jwt.verify(token, process.env.JWT_SECRET, (error) => {
        if (error) {
            res.redirect('/login');
        }
        else {
            res.render('user-dog.ejs', {
                dogData: dog,
                isLogin: loginFlag,
                tipData: dogCare,
                housingCondition: housing
            });
        }
    });
});

router.post('/profile/add', (req, res) => {
    dogBreed = req.body.dogBreed;

    // insert_query_dog = "insert into dog (dog_id, dog_name, dog_weight, dog_breed, dog_years, dog_months, user_email, dog_gender, dog_isMicrochipped, dog_isWellWithCtas, dog_goWellWithDogs, dog_goWellWithChildrens, dog_isHousetrained)" +
    //     " values('" + Date.now().toString() + "', '" + req.body.dogName + "', '" + req.body.weight + "', '" + req.body.dogBreed + "', '" + req.body.ageYears + "', '" + req.body.ageMonths + "', 'sample@gmail.com', '" + req.body.gender + "', '" + req.body.microchipped + "', '" + req.body.cats + "', '" + req.body.nature + "', '" + req.body.children + "', '" + req.body.trained + "')";
    // db.query(insert_query_dog, (error, rows, fields) => {
    //     if (error) {
    //         console.log(error);
    //     }
    //     console.log("Dog data insertedd succcessfully...")
    // });

    dog.push({
        id: Date.now().toString(),
        name: req.body.dogName,
        weight: req.body.weight,
        breed: req.body.dogBreed,
        ageYears: req.body.ageYears,
        ageMonths: req.body.ageMonths,
        gender: req.body.gender,
        cats: req.body.cats,
        isMicrochipped: req.body.microchipped,
        nature: req.body.nature,
        children: req.body.children,
        isTrained: req.body.trained
    });

    // insert_query_housing = "insert into housing_condition (house_id, address_line_1, city, state, address_line_2, house_zipcode, house_condition, house_heating, house_fence) " +
    //     "values ('" + Date.now().toString() + "', '" + req.body.guestAddress + "', '" + req.body.guestCity + "', '" + req.body.guestState + "', '" + req.body.aptNumber + "', '" + req.body.zipcode + "', '" + req.body.isHouseGood + "', '" + req.body.isVentilated + "', '" + req.body.isFenced + "')";
    // db.query(insert_query_housing, (error, rows, fields) => {
    //     if (error) {
    //         console.log(error);
    //     }
    //     else {
    //         console.log("Housing data insertedd succcessfully...");
    //     }
    // });

    housing.push({
        id: Date.now().toString(),
        address: req.body.guestAddress,
        city: req.body.guestCity,
        state: req.body.guestState,
        aptNumber: req.body.aptNumber,
        zipcode: req.body.zipcode,
        houseCondition: req.body.isHouseGood,
        living: req.body.isLivingQuater,
        heating: req.body.isVentilated,
        fenced: req.body.isFenced
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


sendEmail = (req, res, userEmail, sitterEmail) => {
    //userEmail = booking[0].userEmail;
    userName = booking[0].userFirstName;
    sitterName = booking[0].sitterName;

    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'petadogapp@gmail.com',
            pass: 'cSPROJECT#1'
        }
    });

    ejs.renderFile(__dirname + '\\order-details.ejs', { bookingDetails: booking, user: userName }, (err, data) => {
        let mailOtions = {
            from: 'petadogapp@gmail.com',
            to: sitterEmail,
            subject: 'Booking confirmation from Pet a Dog',
            html: data
        }
        transporter.sendMail(mailOtions, (err, data) => {
            if (err) {
                console.log(err);
                res.send(err);
            }
            else {
                console.log("Email Sent to sitter");
                res.redirect('/:name/booking-details');
            }
        });
    });

    ejs.renderFile(__dirname + '\\customer-order-details.ejs', { bookingDetails: booking, sitter: sitterName }, (err, data) => {
        let mailOtions = {
            from: 'petadogapp@gmail.com',
            to: userEmail,
            subject: 'Booking confirmation from Pet a Dog',
            html: data
        }
        transporter.sendMail(mailOtions, (err, data) => {
            if (err) {
                console.log(err);
                res.send(err);
            }
            else {
                console.log("Email Sent to user");
                res.redirect('/:name/booking-details');
            }
        });
    });
}

sendError = (req, res) => {
    res.render('payment.ejs', {
        bookingDetails: booking[0],
        cardDetailsErrorFlag: true,
        cardDetailsErrorMessage: "Invalid card details."
    });
}

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    next();
}

module.exports = router;