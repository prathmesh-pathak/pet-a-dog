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

paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': 'ATpbDkcduvpVPwZwk_gLA9va0lOz6uTRouMBfXnCgYaLWJyqYvamtyBWFK-PEcSOilnYWa_x2pfnyid8',
    'client_secret': 'EGowq0c1FaTxjgIgszXymdwW3uaJ7JVZoJJwh71gNZ1mb5mcFbJ9O-tvfTFUttmc1JfCMd3csqI0yz2A'
});

const initializePassport = require('../passport-config');
initializePassport(
    passport,
    email => users.find(user => user.email === email),
    id => users.find(user => user.id === id)
);

router.get('/', checkAuthenticated, (req, res) => {
    res.render('index.ejs', { name: req.user.firstName });
})

router.get('/home', checkNotAuthenticated, (req, res) => {
    res.render('home.ejs');
});

router.get('/login', checkNotAuthenticated, (req, res) => {
    res.render('login.ejs');
})

router.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}))

router.get('/register', checkNotAuthenticated, (req, res) => {
    res.render('register.ejs', {
        message: ''
    });
})

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

router.post('/register', checkNotAuthenticated, async (req, res) => {
    const { firstName, lastName, email, userPassword } = req.body;
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
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
                "('" + Date.now().toString() + "', '" + firstName + "', '" + lastName + "', '" + email + "', '" + hashedPassword + "')";
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
    req.logOut();
    res.redirect('/login');
});

router.get('/search-sitter', checkAuthenticated, (req, res) => {
    fs.readFile('sitter_list.json', (err, data) => {
        if (err) console.log(err);
        let sitter = JSON.parse(data);
        res.render('sitter.ejs', {
            userData: req.user,
            sitterData: sitter
        });
    });
});

router.get('/search-sitter/:name', checkAuthenticated, (req, res) => {
    fs.readFile('sitter_list.json', (err, data) => {
        if (err) console.log(err);
        let sitter = JSON.parse(data);
        for (var i = 0; i < sitter.length; i++) {
            if (sitter[i].name === req.params.name) {
                sitterEmail = sitter[i].sitterEmail;
                res.render('sitter-detail.ejs', {
                    sitterData: sitter[i],
                    feedback: sitter[i].feedback,
                    services: sitter[i].services
                });
            }
        }
    });
});

router.get('/:name/contact', checkAuthenticated, (req, res) => {
    if (booking.length >= 1) {
        booking.pop();
    }
    fs.readFile('sitter_list.json', (err, data) => {
        if (err) console.log(err);
        let sitter = JSON.parse(data);
        for (var i = 0; i < sitter.length; i++) {
            if (sitter[i].name === req.params.name) {
                res.render('contact-sitter.ejs', {
                    sitterData: sitter[i],
                    feedback: sitter[i].feedback,
                    services: sitter[i].services,
                    dogData: dog,
                    cardDetailsErrorFlag: false,
                    cardDetailsErrorMessage: ""
                });
            }
        }
    });
});

router.post('/:name/contact', checkAuthenticated, (req, res) => {
    const today = new Date();
    booking.push({
        id: Date.now().toString(),
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

    res.redirect('/payment');
});

router.get('/payment', checkAuthenticated, (req, res) => {
    if (cardInfo.length >= 1) {
        cardInfo.pop();
    }

    res.render('payment.ejs', {
        bookingDetails: booking[0],
        cardDetailsErrorFlag: false,
        cardDetailsErrorMessage: ""
    });
});

router.post('/credit-card', checkAuthenticated, (req, res) => {
    userName = booking[0].userFirstName;
    sitterName = booking[0].sitterName;
    userEmail = booking[0].userEmail;

    cardInfo.push({
        paymentMethod: req.body.paymentMethod,
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
            sendEmail(req, res);
        }
        if (flag == 0) {
            sendError(req, res);
        }
    });
});

router.get('/pay', (req, res) => {
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
                    "price": "50.00",
                    "currency": "USD",
                    "quantity": 1,
                }]
            },
            "amount": {
                "currency": "USD",
                "total": "50.00"
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
});

router.get('/success', (req, res) => {
    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;

    const execute_payment_json = {
        "payer_id": payerId,
        "transactions": [{
            "amount": {
                "currency": "USD",
                "total": "50.00"
            }
        }]
    };

    paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
        if (error) {
            console.log(error.response);
            throw error;
        } else {
            console.log(JSON.stringify(payment));
            sendEmail(req, res);
        }
    });
});

router.get('/cancel', (req, res) => res.send('Cancelled'));

router.post('/charge', (req, res) => {
    amount = 4500;
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
            sendEmail(req, res);
        });
});

router.get('/:name/booking-details', checkAuthenticated, (req, res) => {
    res.render('booking-confirmed.ejs', {
        bookingDetails: booking
    });
});

router.get('/dog-care', (req, res) => {
    res.render('dog-care.ejs', {
        isLogin: loginFlag,
        userData: req.user,
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

router.get('/profile', checkAuthenticated, (req, res) => {
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
});

router.get('/profile/add', checkAuthenticated, (req, res) => {
    res.render('user-dog.ejs', {
        dogData: dog,
        isLogin: loginFlag,
        tipData: dogCare,
        housingCondition: housing
    });
});

router.post('/profile/add', checkAuthenticated, (req, res) => {
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


sendEmail = (req, res) => {
    userEmail = booking[0].userEmail;
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