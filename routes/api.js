var express = require('express');
var router = express.Router();

var SMOOCH_KEY_ID = process.env.SMOOCH_KEY_ID;
var SMOOCH_KEY_SECRET = process.env.SMOOCH_KEY_SECRET;
var KATABOT_TOKEN = process.env.BOT_TOKEN;

router.get('/config', function(req, res, next) {
    res.status(200).send({
        SMOOCH_KEY_ID: SMOOCH_KEY_ID,
        SMOOCH_KEY_SECRET: SMOOCH_KEY_SECRET,
        KATABOT_TOKEN: KATABOT_TOKEN
      })
})

router.get('/promo', function(req, res, next) {
    res.status(200).send({
        promos: [{
            title: 'Free Ongkir',
            description: 'Free ongkir untuk 20 Orang pertama ! Buruan jangan sampe kehabisan',
            image: 'https://pojoksosmed.com/wp-content/uploads/2020/06/Gambar-1-Syarat-dan-ketentuan-bebas-ongkir-Tokopedia.jpg',
            link: 'https://www.tokopedia.com/discovery/bebas-ongkir',
            link_label: 'See more'
        },
        {
            title: 'Cashback 100 Ribu',
            description: 'Cashback hinggal 100 ribu di jam 09.00 - 12.00 ! Cek sekarang !',
            image: 'https://image.freepik.com/free-vector/money-cashback-with-gold-dollar-coins_118124-26.jpg',
            link: 'https://kamus.tokopedia.com/c/cashback/',
            link_label: 'See more'
        }]
      })
})

router.get('/shipping', function(req, res, next) {
    var status = '';
    if (req.query.id == '123ABC') {
        status = 'Shipment receive at JNE Counter Cengkareng, Jakarta';
    } else {
        status = 'Received On Destination'
    }
    res.status(200).send({
        status: status
    })
})

module.exports = router;