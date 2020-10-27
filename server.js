if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const app = express();
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');
const indexRouter = require('./routes/index');

app.set('view-engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(methodOverride('_method'));
app.use(express.static("public"));

app.use('/', indexRouter);

const port = 8000;
app.listen(port, () => {
    console.log(`Server started on ${port}`);
});