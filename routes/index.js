const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const passport = require('passport');
const fs = require('fs');

const initializePassport = require('../passport-config');
initializePassport(
    passport,
    email => users.find(user => user.email === email),
    id => users.find(user => user.id === id)
);

const users = [];
const dog = [];

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
        res.redirect('/login');
    }
    catch {
        res.redirect('/register');
    }
})

router.delete('/logout', (req, res) => {
    req.logOut();
    res.redirect('/login');
});

router.get('/search-sitter', checkAuthenticated, (req, res) => {
    fs.readFile('sitter_list.json', (err, data) => {
        if (err) console.log(err);
        let sitter = JSON.parse(data);
        console.log(sitter);
        res.render('sitter.ejs', {
            sitterData: sitter
        });
    });
});

router.get('/tips-tricks', (req, res) => {
    res.render('dog-care.ejs');
});

router.get('/profile', (req, res) => {
    if (typeof dog == "undefined" || dog == null || dog.length == 0) {
        res.render('profile.ejs', {
            userData: req.user
        });
    }
    else {
        res.render('profile-dog.ejs', {
            userData: req.user,
            dogData: dog
        });
        console.log(req.user);
        console.log(dog);
    }
});

router.get('/profile/add', (req, res) => {
    res.render('user-dog.ejs');
});

router.post('/profile/add', checkAuthenticated, (req, res) => {
    dog.push({
        id: Date.now().toString(),
        name: req.body.dogName,
        weight: req.body.weight,
        ageYears: req.body.ageYears,
        ageMonths: req.body.ageMonths,
        gender: req.body.gender,
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