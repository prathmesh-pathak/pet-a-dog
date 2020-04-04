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

const users = [];
const dog = [];
const booking = [];
const dogCare = [];
var loginFlag = false;
var userEmail = '';
var sitterEmail = '';
var dogBreed = '';


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
    res.render('register.ejs');
})

router.post('/register', checkNotAuthenticated, async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        users.push({
            id: Date.now().toString(),
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            zipcode: req.body.zip,
            email: req.body.email,
            password: hashedPassword
        })
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

router.delete('/logout', (req, res) => {
    req.logOut();
    loginFlag = false;
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
    userEmail = req.body.userEmail;
    console.log(sitterEmail);
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'petadogapp@gmail.com',
            pass: 'cSPROJECT#1'
        }
    });
    const data = ejs.renderFile(__dirname + '\\order-details.ejs', { bookingDetails: booking, dogData: booking.pets }, (err, data) => {
        let mailOtions = {
            from: 'petadogapp@gmail.com',
            to: sitterEmail,
            subject: 'Booking confirmation from Pet a Dog',
            html: data,
            cc: userEmail
        }
        transporter.sendMail(mailOtions, (err, data) => {
            if (err) {
                console.log(err);
                res.send(err);
            }
            else {
                console.log("Email Sent");
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
        userData: req.user
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
    dogBreed = req.body.guestDogBreed;
    fs.readFile('tips.json', (err, data) => {
        if (err) console.log(err);
        let tips = JSON.parse(data);
        for (var i = 0; i < tips.length; i++) {
            if (tips[i].breed === dogBreed) {
                dogCare.push({
                    breed: tips[i].breed,
                    info: tips[i].info,
                    dogTips: tips[i].tips
                });
                res.redirect('/info');
            }
        }
    });
});

router.get('/info', (req, res) => {
    console.log(dogCare);
    res.render('guest-dog-info.ejs', {
        dogData: dog,
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
            tipData: dogCare
        });
    }
});

router.get('/profile/add', checkAuthenticated, (req, res) => {
    res.render('user-dog.ejs');
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