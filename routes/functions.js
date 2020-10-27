var login_token = '';
var currentUserEmail = '';
var bookingID = '';

module.exports = {
    setUserEmail: function setUserEmail(userEmail) {
        currentUserEmail = userEmail;
    },

    getUserEmail: function getUserEmail() {
        return currentUserEmail;
    },

    setLoginToken: function setLoginToken(token) {
        login_token = token;
    },

    getLoginToken: function getLoginToken() {
        return login_token;
    },

    setCurrentBookingId: function setCurrentBookingId(booking_id) {
        bookingID = booking_id;
    },

    getCurrentBookingId: function getCurrentBookingId() {
        return bookingID;
    }
}