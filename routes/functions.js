const db = require('../database/connection');
const nodemailer = require('nodemailer');
const ejs = require('ejs');

module.exports = {
    setUserEmail: setUserEmail = (userEmail) => {
        this.currentUserEmail = userEmail;
    },

    getUserEmail: getUserEmail = () => {
        return this.currentUserEmail;
    },

    setLoginToken: setLoginToken = (token) => {
        console.log(token);
        this.login_token = token;
    },

    getLoginToken: getLoginToken = () => {
        return this.login_token;
    },

    setCurrentBookingId: setCurrentBookingId = (booking_id) => {
        this.bookingID = booking_id;
    },

    getCurrentBookingId: getCurrentBookingId = () => {
        return this.bookingID;
    },

    sendEmail: sendEmail = (req, res, userEmail, userName, sitterEmail, sitterName) => {
        userName = userName;
        sitterName = sitterName;
        let currentUserEmail = getUserEmail();
        let currentBookingId = getCurrentBookingId();
        email_query = `select * from bookings where booking_id =` + currentBookingId;
        db.query(email_query, (error, booking) => {
            if (error) {
                console.log(error);
            }
            else {
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
        });
    },


    sendError: sendError = (req, res) => {
        let currentBookingId = getCurrentBookingId();
        email_query = `select * from bookings where booking_id =` + currentBookingId;
        db.query(email_query, (error, booking) => {
            if (error) {
                console.log(error);
            }
            else {
                res.render('payment.ejs', {
                    bookingDetails: booking[0],
                    cardDetailsErrorFlag: true,
                    cardDetailsErrorMessage: "Invalid card details."
                });
            }
        });
    }
}