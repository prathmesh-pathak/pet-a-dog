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
const mysql = require('mysql');

var mysqlConnect = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'petADog',
    multipleStatements: true
});

const users = [];
const dog = [];
const booking = [];
const dogCare = [];
const housing = [];
var loginFlag = false;
var userEmail = '';
var sitterEmail = '';
var dogBreed = '';
var userName = '';
var sitterName = '';

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

//login get route
router.get('/login', checkNotAuthenticated, (req, res) => {
    res.render('login.ejs');
})

//Login Post route
router.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}))

//Register Get Route
router.get('/register', checkNotAuthenticated, (req, res) => {
    res.render('register.ejs');

})

//Register Post Route
router.post('/register', checkNotAuthenticated, async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        let user = req.body;
        var sql = "SET @first_name = ?;SET @last_name = ?;SET @zipcode = ?; SET @email = ?;SET @password = ?; \
        CALL AddUser(@first_name,@last_name,@zipcode,@email,@password);";
        mysqlConnect.query(sql, [user.firstName, user.lastName, user.zip, user.email, hashedPassword], (err, rows, fields) => {
            if (err) {
                console.log(err);
            } else {
                console.log('inserted successfully...');
            }
        });
        // users.push({
        //     id: Date.now().toString(),
        //     firstName: req.body.firstName,
        //     lastName: req.body.lastName,
        //     zipcode: req.body.zip,
        //     email: req.body.email,
        //     password: hashedPassword
        // })
        loginFlag = true;
        res.redirect('/login');
    }
    catch {
        res.redirect('/register');
    }
})

router.get('/services', (req, res) => {
    res.render('service.ejs', {
        isLogin: loginFlag
    });
});

//Logout Route
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
    fs.readFile('sitter_list.json', (err, data) => {
        if (err) console.log(err);
        let sitter = JSON.parse(data);
        for (var i = 0; i < sitter.length; i++) {
            if (sitter[i].name === req.params.name) {
                res.render('contact-sitter.ejs', {
                    sitterData: sitter[i],
                    feedback: sitter[i].feedback,
                    services: sitter[i].services,
                    dogData: dog
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
        pets: dog,
        message: req.body.message
    });
    userName = req.body.firstName;
    userEmail = req.body.userEmail;
    sitterName = req.params.name;
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
    console.log(loginFlag);
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
    dogBreed = req.body.dogBreed;
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
            }
        }
    });
    console.log(dogBreed);
    console.log(dogCare);
    res.redirect('/profile');
});

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