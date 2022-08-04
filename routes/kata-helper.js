var express = require('express');
var router = express.Router();

/* GET home page. */
router.post('/register-employee', function(req, res, next) {
    var empNameSplit = req.body.username.split(' ')
    var empEmail = '';
    var timestamp = Math.floor(Date.now() / 1000)
    empNameSplit.forEach((empName, index) => {
        empEmail += empName.toLowerCase()
        if (index != (empNameSplit.length-1)) {
            empEmail += '.'
        }
    });
    res.status(200).send({
        id: 'TR' + timestamp,
        email: empEmail + '@treessolutions.com'
    })
});

router.get('/checkin', function(req, res, next) {
    var date = new Date(); 
    var now_utc =  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
    date.getUTCHours()+7, date.getUTCMinutes(), date.getUTCSeconds());

    var dt = new Date(now_utc);
    res.status(200).send({
        time: dt
    })
});

router.get('/checkout', function(req, res, next) {
    var date = new Date(); 
    var now_utc =  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
    date.getUTCHours()+7, date.getUTCMinutes(), date.getUTCSeconds());

    var dt = new Date(now_utc);
    var durationDummy = generateRandomInteger(3, 10);
    res.status(200).send({
        time: dt,
        duration: durationDummy
    })
});

function generateRandomInteger(min, max) {
    return Math.floor(min + Math.random()*(max - min + 1))
  }
  

module.exports = router;
