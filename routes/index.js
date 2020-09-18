if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
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

// const initializePassport = require('../passport-config');
// initializePassport(
//     passport,
//     email => users.find(user => user.email === email),
//     id => users.find(user => user.id === id)
// );

router.get('/', (req, res) => { //checkAuthenticated
    res.render('index.ejs');
})

router.get('/home', (req, res) => { //checkNotAuthenticated
    res.render('home.ejs');
});

//login get route
router.get('/login', checkNotAuthenticated, (req, res) => { //checkNotAuthenticated
    res.render('login.ejs', {
        errorFlag: false,
        errorMessage: ''
    });
})

//Login Post route
// router.post('/login', checkNotAuthenticated, passport.authenticate('local', {
//     successRedirect: '/',
//     failureRedirect: '/login',
//     failureFlash: true
// }))

router.post('/login', checkNotAuthenticated, (req, res) => { //checkNotAuthenticated
    let user = req.body;
    sql = "select * from subcribed_user where email = ?";
    mysqlConnect.query(sql, [user.email], async (error, results) => {
        if (!results || !(await bcrypt.compare(user.password, results[0].password))) {
            res.render('login.ejs', {
                errorFlag: true,
                errorMessage: 'Please provide a valid username and password.'
            });
        }
        else {
            const id = results[0].id;
            const token = jwt.sign({ id: id }, process.env.JWT_SECRET, {
                expiresIn: process.env.JWT_EXPIRES_IN
            });

            const cookieOptions = {
                expires: new Date(
                    Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
                ),
                httpOnly: true
            }
            res.cookie('jwt', token, cookieOptions)
            res.status(200).redirect("/");
        }
    });
});

//Register Get Route
router.get('/register', (req, res) => {
    res.render('register.ejs', {
        errorFlag: false,
        errorMessage: ''
    });
})

//Register Post Route
router.post('/register', checkNotAuthenticated, async (req, res) => { //checkNotAuthenticated
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        let users = req.body;
        mysqlConnect.query("select * from subcribed_user where email = ?", [users.email], (err, rows, fields) => {
            if (err) {
                console.log(err);
            }
            if (rows.length >= 1) {
                res.render('register.ejs', {
                    errorFlag: true,
                    errorMessage: "Email already registered. Please try again with different email address."
                })
            }
            else {
                var sql = "SET @first_name = ?;SET @last_name = ?;SET @zipcode = ?; SET @email = ?;SET @password = ?; \
                CALL AddUser(@first_name,@last_name,@zipcode,@email,@password);";
                mysqlConnect.query(sql, [users.firstName, users.lastName, users.zip, users.email, hashedPassword], (err, rows, fields) => {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('inserted successfully...');
                    }
                });
                loginFlag = true;
                res.redirect('/login');
            }
        });
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

router.get('/search-sitter', checkAuth, (req, res) => { //checkAuthenticated
    fs.readFile('sitter_list.json', (err, data) => {
        if (err) console.log(err);
        let sitter = JSON.parse(data);
        res.render('sitter.ejs', {
            userData: req.user,
            sitterData: sitter
        });
    });
});

router.get('/search-sitter/:name', (req, res) => { //checkAuthenticated
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

router.get('/:name/contact', (req, res) => { //checkAuthenticated
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

router.post('/:name/contact', (req, res) => { //checkAuthenticated
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

router.get('/:name/booking-details', (req, res) => { //checkAuthenticated
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

router.get('/profile', (req, res) => { //checkAuthenticated
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

router.get('/profile/add', (req, res) => { //checkAuthenticated
    res.render('user-dog.ejs', {
        dogData: dog,
        isLogin: loginFlag,
        tipData: dogCare,
        housingCondition: housing
    });
});

router.post('/profile/add', (req, res) => { //checkAuthenticated
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

function checkAuth() {

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
    else {
        next();
    }
}

module.exports = router;