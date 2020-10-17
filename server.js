if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const app = express();
const flash = require('express-flash');
const session = require('express-session');
const methodOverride = require('method-override');
const indexRouter = require('./routes/index');
const passport = require('passport');

app.set('view-engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(flash());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));
app.use(express.static("public"));

app.use('/', indexRouter);

const port = 8000;
app.listen(port, () => {
    console.log(`Server started on ${port}`);
});