var express = require('express');
var router = express.Router();

// import { generateBotPayload } from '/payload/generator.js'
// var generateBotPayload = require('/payload/generator.js');


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
      generator: generateBotPayload,
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

router.get('/customer-info', function(req, res, next) {
  res.status(200).send({
    "data": {
      "users": [
        {
          "name": "Budi Budiman",
          "phone_number": "6289292828282",
          "email_id": "budi.budiman@example.com",
          "details_link": ""
        }
      ],
      "policies": [
        {
          "application_number": "TRX-2201057114",
          "application_status": "Paid",
          "policy_number": "O/FDK01/80000003",
          "insured": [
            {
              "name": "Budi Budiman",
              "phone_number": "6289292828282",
              "email": "budi.budiman@example.com"
            }
          ],
          "product_name": "Xiaomi Redmi Note 10S",
          "created_at": "12-12-2022",
          "policy_start_date": "12-12-2022",
          "details_link": ""
        },
        {
          "application_number": "TRX-2201057123",
          "application_status": "Pending",
          "policy_number": "O/FDK01/80000003",
          "insured": [
            {
              "name": "Budi Budiman",
              "phone_number": "6289292828282",
              "email": "budi.budiman@example.com"
            }
          ],
          "product_name": "Samsul Galaxy Note 9",
          "created_at": "12-12-2022",
          "policy_start_date": "12-12-2022",
          "details_link": ""
        },
        {
          "application_number": "TRX-22010571333",
          "application_status": "Paid",
          "policy_number": "O/FDK01/80000003",
          "insured": [
            {
              "name": "Budi Budiman",
              "phone_number": "6289292828282",
              "email": "budi.budiman@example.com"
            }
          ],
          "product_name": "Realme Freebuds Pro",
          "created_at": "12-12-2022",
          "policy_start_date": "12-12-2022",
          "details_link": ""
        },
        {
          "application_number": "TRX-2201057909",
          "application_status": "Canceled",
          "policy_number": "O/FDK01/80000003",
          "insured": [
            {
              "name": "Budi Budiman",
              "phone_number": "6289292828282",
              "email": "budi.budiman@example.com"
            }
          ],
          "product_name": "Telur Omega 2KG",
          "created_at": "12-12-2022",
          "policy_start_date": "12-12-2022",
          "details_link": ""
        }
      ],
      // "claims": [
      //   {
      //     "claim_number": "KLM-2203000699",
      //     "claim_status": "Rejected",
      //     "insured": [
      //       {
      //         "name": "Budi Budiman",
      //         "phone_number": "6289292828282",
      //         "email": "budi.budiman@example.com"
      //       }
      //     ],
      //     "application_number": "APP-2201057114",
      //     "created_at": "12-12-2022",
      //     "product_name": "Samsung Galaxy Note 3",
      //     "details_link": ""
      //   }
      // ]
    },
    "errors": {
      "error_code": "",
      "error_msg": ""
    }
  })
})

module.exports = router;