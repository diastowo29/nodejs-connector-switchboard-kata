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

module.exports = router;
