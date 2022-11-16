var express = require('express');
var router = express.Router();
var SunshineConversationsClient = require('sunshine-conversations-client');
var defaultClient = SunshineConversationsClient.ApiClient.instance;
const axios = require('axios');
const payGen = require("./config/payload.js")
const axiosRetry = require('axios-retry');

// const { chatlog_model } = require('../sequelize')

var basicAuth = defaultClient.authentications['basicAuth'];

var SMOOCH_KEY_ID = process.env.SMOOCH_KEY_ID || "xxx";
var SMOOCH_KEY_SECRET = process.env.SMOOCH_KEY_SECRET || "xxx";
var BYPASS_ZD = process.env.BYPASS_ZD || "false";
var CHANNEL_ACTIVE_ACCOUNT = process.env.WA_ACTIVE_ACCOUNT || "62d7a492294f2700f0e3b08c";
var BOT_ALIAS = process.env.BOT_ALIAS || "Bita";
var BOT_AUTH = process.env.BOT_AUTH || 'xxx';
var BOT_PROD_AUTH = process.env.BOT_PROD_AUTH || 'xxx';
var BOT_TOKEN = process.env.BOT_TOKEN || "xxx";

var BOT_CLIENT = 'JAGO'

var LOG_TOKEN = '';

basicAuth.username = SMOOCH_KEY_ID;
basicAuth.password = SMOOCH_KEY_SECRET;

var P_SEND_TO_SMOOCH = 'sendToSmooch'
var P_TESTING = 'TESTING_PHASE'
var P_HANDOVER = 'handover'

let BOT_URL = 'https://r2.app.yellow.ai/integrations/sendMessage/' + BOT_TOKEN;

var gotoSmooch = true;

var winston = require('winston');
var { Loggly } = require('winston-loggly-bulk');

winston.add(new Loggly({
  token: "25cbd41e-e0a1-4289-babf-762a2e6967b6",
  subdomain: "diastowo",
  tags: ["sw-dev"],
  json: true
}));

axiosRetry(axios, {
  retries: 3,
  retryCondition: (e) => {
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(e) ||
      e.response.status != 200
    );
  }
})

router.get('/testing', function (req, res, next) {
  // res.status(200).send(payGen.doGenerateBotPayload('userid123', payGen.doGenerateSampleMsgPayload('halo')));
  res.status(200).send({});
})

router.get('/checkenv', function (req, res, next) {
  // res.status(200).send({
  //   smooch_id: SMOOCH_KEY_ID,
  //   smooch_secret: SMOOCH_KEY_SECRET,
  //   bot_id: BOT_TOKEN,
  //   bot_auth: BOT_AUTH
  // })
})

router.get('/webhook', function (req, res, next) {
  goLogging('info', P_SEND_TO_SMOOCH, 'test-logging', 'test-logging', BOT_CLIENT)
  res.status(200).send({});
})

router.post('/webhook', function (req, res, next) {
  var appId = req.body.app.id;
  // console.log(JSON.stringify(req.body))
  // console.log('BOT ALIAS: ' + BOT_ALIAS + ' | BYPASS ZD: ' + BYPASS_ZD)
  req.body.events.forEach(event => {
    if (event.type != 'conversation:read') {
      var convChannel = event.payload.message.source.type;
      var convIntegrationId = event.payload.message.source.integrationId;
      var convId = event.payload.conversation.id;
      
      // console.log(JSON.stringify(generateBotPayload('useridtesting', event.payload.message)))
      // taro custom payload untuk tambah tipe user (premium bot a, non bot b)
      if ('activeSwitchboardIntegration' in event.payload.conversation) {
        var convSwitchboardName = event.payload.conversation.activeSwitchboardIntegration.name;
        console.log('inbound: ' + event.payload.message.author.displayName + ' switchboard: ' + event.payload.conversation.activeSwitchboardIntegration.name)
        if (CHANNEL_ACTIVE_ACCOUNT.includes(convIntegrationId)) {
          var displayName = event.payload.message.author.displayName;
          if (convSwitchboardName == 'bot') {
            if (BYPASS_ZD == 'true' ) {
              console.log('=== Inbound Chat from:  ' + displayName + ', Pass Control to Zendesk ===')
              switchboardPassControl(appId, convId, false, null, event.payload.message.author.userId);
            } else {
              if (event.payload.message.author.type == "user") {
                var messagePayload = event.payload.message;
                var userIdForBot = messagePayload.author.userId + '_' + appId + '_' + convId;
                // console.log((req.headers))
                console.log('=== Inbound Chat from:  ' + displayName + ', Pass to Bot ===')
                console.log(messagePayload)
                sendToBot(payGen.doGenerateBotPayload(userIdForBot, messagePayload))
              }
            }
          }
        } else if ((convChannel != 'api:conversations') && (convChannel != 'zd:agentWorkspace')) {
          if (convSwitchboardName == 'bot') {
            if (convChannel != 'officehours') { // 'officehours' means automated messages
              console.log('-- unregistered account, pass to zd imidiately -- ')
              switchboardPassControl(appId, convId, false, null);
            }
          }
        }
      }
    }
  });
  res.status(200).send({});
})

router.post('/conversation/test', function(req, res, next) {
  var chatContent = req.body.text;
  var userId = '5613c341a4da96f98cb3f3a2_6225cb52ebe30d00ef9a2e9a_9be4eb9330540f041f42e755'
  var botResponse;
  var jsonPayload = payGen.doGenerateBotPayload(userId, payGen.doGenerateSampleMsgPayload(chatContent));

  axios(payGen.doGenerateAxiosRequest('POST', BOT_URL, BOT_AUTH, jsonPayload)).then(function (response) {
    console.log('Sent to BOT: %s', response.status);
    // console.log(response)
    botResponse = response.data;
    res.status(200).send({ response: botResponse, payload: jsonPayload });
  }).catch(function(err){
    console.log(err)
    res.status(400).send({error: err, payload: jsonPayload})
  });
})

router.post('/conversation/reply/', async function (req, res, next) {
  // console.log('HOOK-FROM-KATA userId: ' + req.body.userId);
  // console.log(req.headers)
  console.log(JSON.stringify(req.body));
  let userId = req.body.userId.split('_')[0];
  let appId = req.body.userId.split('_')[1];
  var convId = req.body.userId.split('_')[2];
  var response;


  goLogging('info', P_SEND_TO_SMOOCH, req.body.userId, req.body, BOT_CLIENT)
  console.log('info', P_SEND_TO_SMOOCH, req.body.userId, req.body, BOT_CLIENT)
  if (userId == undefined || appId == undefined || convId == undefined) {
    res.status(422).send({
      error: 'invalid userId format'
    });
  } else {
    let i = 0;
    for (const message of req.body.messages) {
        if (message.type == 'text') {
          var smoochResponse = await sendToSmooch(userId, appId, convId, message.content);
          response = smoochResponse;
        } else {
          if (message.payload.template_type == 'carousel') {
            await sendCarouseltoSmooch(userId, appId, convId, message.payload);
          } else if (message.payload.template_type == 'image') {
            await sendImagetoSmooch(userId, appId, convId, message.payload);
          } else if (message.payload.template_type == 'location') {
            await sendLocationtoSmooch(userId, appId, convId, message.payload);
          } else if (message.payload.template_type == 'button') {
            console.log('not suppported on Smooch')
          } else if (message.payload.template_type == 'text') {
            await sendQuickReplySmooch(userId, appId, convId, message.payload);
          } else if (message.payload.template_type == 'list_reply') {
            await sendQuickReplySmooch(userId, appId, convId, message.payload);
          } else {
            await sendFiletoSmooch(userId, appId, convId, message.payload);
          }
        }
      i++;
    }
    var statusCode;
    if ('error' in response) {
      statusCode = 422
      response = response.error
    } else {
      statusCode = 200
    }
    res.status(statusCode).send({response});
  }

});

router.post('/conversation/handover', function (req, res, next) {
  var solvedByBot = false;
  var ticket_fields = req.body.ticket_fields;
  if (req.body.userId.split('_').length < 3) {

    // goLogging('error', P_HANDOVER, req.body.userId, req.body, BOT_CLIENT)

    res.status(400).send({
      error: 'userId: not registered/wrong pattern'
    })
  } else {
    solvedByBot = req.body.solved_by_bot;
    goLogging('info', P_HANDOVER, req.body.userId, req.body, BOT_CLIENT)
    console.log('info', P_HANDOVER, req.body.userId, req.body, BOT_CLIENT)
    let userId = req.body.userId.split('_')[0];
    let appId = req.body.userId.split('_')[1];
    var convId = req.body.userId.split('_')[2];
    switchboardPassControl(appId, convId, solvedByBot, req.body.first_message_id, userId, ticket_fields);
    res.status(200).send({  
      status: 'ok'
    })
  }
})

function sendToBot(botPayloadJson) {
  console.log('-- send message to Bot --')

  axios(payGen.doGenerateAxiosRequest('POST', BOT_URL, BOT_AUTH, botPayloadJson)).then(function (response) {
    console.log('Sent to BOT: %s', response.status);
  }).catch(function(err){
    switchboardPassControl(botPayloadJson.sender.split('_')[1], botPayloadJson.sender.split('_')[2], convId, false, null)
    goLogging('error', P_SEND_TO_BOT, botPayloadJson.sender, err.response, BOT_CLIENT)
  });
}

async function sendQuickReplySmooch (userId, appId, convId, messagePayload) {
  // console.log('sendquick to smooch')
  var messagePost = new SunshineConversationsClient.MessagePost();
  messagePost.author = {
    type: 'business'
    // displayName: BOT_ALIAS
  }
  messagePost.content = {
    type: 'text',
    text: 'quickreply'
  }

  var actionObject = {};
  var interactiveType = '';
  var bodyText = '';
  if (messagePayload.template_type == 'text') {
    var listofButtons = []
    interactiveType = 'button';
    messagePayload.items.quickreply.forEach(quickreply => {
      listofButtons.push({
        type: 'reply',
        reply : {
          id: quickreply.label,
          title: quickreply.text
        }
      })
    });
    
    bodyText = messagePayload.items.text
    actionObject = {
      buttons: listofButtons
    }

  } else if (messagePayload.template_type == 'list_reply') {
    var listofSections = [];
    var sectionRows = [];
    messagePayload.items.action.sections.forEach(section => {
      section.rows.forEach(row => {
        sectionRows.push({
          id: row.id,
          title: row.title,
          description: row.description
        })
      });
      listofSections.push({
        title: section.title,
        rows: sectionRows
      })
    });
    bodyText = messagePayload.items.body.text

    interactiveType = 'list';
    actionObject = {
      button: messagePayload.items.action.button,
      sections: listofSections 
    }
  }

  var interactiveObject = {
    type: interactiveType,
    body: {
        text: bodyText
    },
    action: actionObject
  }

  messagePost.override = {
    whatsapp: {
      payload: {
        type: "interactive",
        interactive: interactiveObject
      }
    }
  }

  console.log(JSON.stringify(messagePost))
  return await finalSendtoSmooch(userId, appId, convId, messagePost);
}

async function sendToSmooch(userId, appId, convId, messageContent) {
  var messagePost = new SunshineConversationsClient.MessagePost();
  messagePost.author = {
    type: 'business'
    // displayName: BOT_ALIAS
  }
  messagePost.content = {
    type: 'text',
    text: messageContent
  }
  return await finalSendtoSmooch(userId, appId, convId, messagePost);
}

async function sendImagetoSmooch(userId, appId, convId, messagePayload) {
  var messagePost = new SunshineConversationsClient.MessagePost();
  messagePost.author = {
    type: 'business'
    // displayName: BOT_ALIAS
  }
  messagePost.content = {
    type: 'image',
    mediaUrl: messagePayload.items.originalContentUrl
  }
  return await finalSendtoSmooch(userId, appId, convId, messagePost);
}

function sendLocationtoSmooch(userId, appId, convId, messagePayload) {
  var messagePost = new SunshineConversationsClient.MessagePost();
  messagePost.author = {
    type: 'business'
    // displayName: BOT_ALIAS
  }
  messagePost.content = {
    type: 'location',
    coordinates: {
      lat: messagePayload.items.latitude,
      long: messagePayload.items.longitude
    },
    location: {
      address: messagePayload.items.address,
      name: messagePayload.items.title
    }
  }
  finalSendtoSmooch(userId, appId, convId, messagePost);
  return messagePost;
}


function sendFiletoSmooch(userId, appId, convId, messagePayload) {
  var messagePost = new SunshineConversationsClient.MessagePost();
  messagePost.author = {
    type: 'business'
    // displayName: BOT_ALIAS
  }
  messagePost.content = {
    type: 'file',
    mediaUrl: messagePayload.items.originalContentUrl
  }
  finalSendtoSmooch(userId, appId, convId, messagePost);
  return messagePost;
}

function hcSendCarouseltoSmooch(userId, appId, convId, messagePayload) {
  var messagePost = new SunshineConversationsClient.MessagePost();
  var carouselItems = [
    {
      title: "tacos",
      description: "Get your tacos today",
      mediaUrl: "https://www.eatingonadime.com/wp-content/uploads/2020/10/carne-asada-1-square.jpg",
      altText: "giant taco",
      size: "compact",
      actions: [{
        text: "Select",
        type: "postback",
        payload: "TACOS"
      },{
        text: "More info",
        type: "link",
        uri: "https://google.com"
      }]
    }
  ];

  var carouselPayload = {
    type: 'carousel',
    items: carouselItems
  };

  messagePost.author = {
    type: 'business'
    // displayName: BOT_ALIAS
  }
  messagePost.content = carouselPayload;

  finalSendtoSmooch(userId, appId, convId, messagePost);
  return messagePost;
}

function sendCarouseltoSmooch(userId, appId, convId, messagePayload) {
  // var apiInstance = new SunshineConversationsClient.MessagesApi();
  var messagePost = new SunshineConversationsClient.MessagePost();
  var carouselItems = [];
  messagePayload.items.forEach(carouselItem => {
    var newCarouselActions = [];
    carouselItem.actions.forEach(carouselAction => {
      if (carouselAction.type == 'url') {
        newCarouselActions.push({
          text: carouselAction.label,
          type: 'link',
          uri: carouselAction.url
        })
      } else {
        var payloadKey = Object.keys(carouselAction.payload)
        newCarouselActions.push({
          text: carouselAction.label,
          type: 'postback',
          payload: carouselAction.payload[payloadKey[0]] //always get the first payload
        })
      }
    });
    carouselItems.push({
      title: carouselItem.title,
      description: carouselItem.text,
      mediaUrl: carouselItem.thumbnailImageUrl,
      actions: newCarouselActions
    })
  });
  var carouselPayload = {
    type: 'carousel',
    items: carouselItems
  };

  messagePost.author = {
    type: 'business'
    // displayName: BOT_ALIAS
  }
  messagePost.content = carouselPayload;

  finalSendtoSmooch(userId, appId, convId, messagePost);
  return messagePost;
}

function finalSendtoSmooch(userId, appId, convId, messagePost) {

  if (gotoSmooch) {
    goLogging('info', P_SEND_TO_SMOOCH, userId + '_' + appId + '_' + convId, messagePost, BOT_CLIENT)
    var apiInstance = new SunshineConversationsClient.MessagesApi();

    try {
      return apiInstance.postMessage(appId, convId, messagePost).then(function (data) {
        return data
      }, function (error) {
        goLogging('error', P_SEND_TO_SMOOCH, userId + '_' + appId + '_' + convId, error.body, BOT_CLIENT)
        return {error: error.body};
    });
    } catch (err) {
      return {error: err};
    }
  } else {
    // winston.log('info', messagePost);
    goLogging('info', P_SEND_TO_SMOOCH, userId + '_' + appId + '_' + convId, messagePost, BOT_CLIENT)
    console.log(JSON.stringify(messagePost))
  }
}

function switchboardPassControl(appId, convId, solved, firstMsgId, userId = null, ticket_fields = {}) {
  var solvedTag = (solved) ? 'solved_by_bot' : 'unsolved';

  var apiInstance = new SunshineConversationsClient.SwitchboardActionsApi();
  var passControlBody = new SunshineConversationsClient.PassControlBody();
  passControlBody.switchboardIntegration = 'next';
  passControlBody.metadata = {
    ['dataCapture.systemField.tags']: solvedTag,
    ['dataCapture.ticketField.10051072301335']: convId,
    ['dataCapture.ticketField.10209017032855']: userId,
    ['first_message_id']: firstMsgId,
  }

  Object.entries(ticket_fields).map(f => {
    passControlBody.metadata[[`dataCapture.ticketField.${f[0]}`]] = f[1]
  })

  console.log('passing control chat', passControlBody)
  
  apiInstance.passControl(appId, convId, passControlBody).then(function (data) {
    console.log('API Pass Control called successfully. Returned data: ' + data);
  }, function (error) {
    console.log(error)
  });
}

function goLogging(status, process, to, message, client) {
  winston.log(status, {
    process: process,
    status: status,
    to: to,
    message: message,
    client: client
  });
}

module.exports = router;