var express = require('express');
var router = express.Router();
var SunshineConversationsClient = require('sunshine-conversations-client');
var defaultClient = SunshineConversationsClient.ApiClient.instance;
const axios = require('axios');

var basicAuth = defaultClient.authentications['basicAuth'];

var SMOOCH_KEY_ID = process.env.SMOOCH_KEY_ID || "xxx";
var SMOOCH_KEY_SECRET = process.env.SMOOCH_KEY_SECRET || "xxx";
var BYPASS_ZD  = process.env.BYPASS_ZD || "false";
var WA_ACTIVE_ACCOUNT = process.env.WA_ACTIVE_ACCOUNT || "61529a7c86e5ae00d9dc94b3";
var BOT_ALIAS = process.env.BOT_ALIAS || "Bita";

basicAuth.username = SMOOCH_KEY_ID;
basicAuth.password = SMOOCH_KEY_SECRET;

var P_SEND_TO_SMOOCH = 'sendToSmooch'
var P_HANDOVER = 'handover'

var KATABOT_TOKEN = process.env.BOT_TOKEN || "xxx";
let KATABOT_URL = 'https://kanal.kata.ai/receive_message/' + KATABOT_TOKEN;

var gotoSmooch = true;

var winston = require('winston');
var {Loggly} = require('winston-loggly-bulk');

winston.add(new Loggly({
    token: "25cbd41e-e0a1-4289-babf-762a2e6967b6",
    subdomain: "diastowo",
    tags: ["Winston-NodeJS"],
    json: true
}));

router.get('/testing', function(req, res, next) {
  res.status(200).send({
    smooch_id: SMOOCH_KEY_ID
  })
})

router.get('/webhook', function(req, res, next) {
  res.status(200).send({});
})

router.post('/deluvery', function (req, res, next) {
  var appId = req.body.app.id;
  req.body.events.forEach(event => {
    var userId = event.payload.user.id;
    var convId = event.payload.conversation.id;
  });
})

router.post('/webhook', function(req, res, next) {
  var appId = req.body.app.id;
  // console.log('BOT ALIAS: ' + BOT_ALIAS + ' | BYPASS ZD: ' + BYPASS_ZD)
  req.body.events.forEach(event => {
    // console.log(event.type)
    // console.log(JSON.stringify(event))
    if (event.type != 'conversation:read') {
      var convChannel = event.payload.message.source.type;
      var convIntegrationId = event.payload.message.source.integrationId;
      if (convChannel == 'whatsapp') {
        if ('activeSwitchboardIntegration' in event.payload.conversation) {
          // console.log('== inbound message type: ' + convChannel + ' sw name: ' + event.payload.conversation.activeSwitchboardIntegration.name 
          //             + ' integrationId: ' + convIntegrationId + ' active wa account: ' + WA_ACTIVE_ACCOUNT.includes(convIntegrationId) + ' author: ' + event.payload.message.author.displayName)
          var convId = event.payload.conversation.id;
          var convSwitchboardName = event.payload.conversation.activeSwitchboardIntegration.name;
          if (WA_ACTIVE_ACCOUNT.includes(convIntegrationId)) {
            var displayName = event.payload.message.author.displayName;
            // console.log(JSON.stringify(req.body))
            // console.log('WEBHOOK from Smooch');
            // console.log('User: ' + displayName);
            // console.log('Switchboard: ' + convSwitchboardName)
            // console.log('BYPASS: ' + (BYPASS_ZD == true))
            if (convSwitchboardName == 'bot') {
              if (BYPASS_ZD == true) {
                console.log('=== Inbound Chat from:  ' + displayName + ', Pass Control to Zendesk ===')
                switchboardPassControl(appId, convId);
              } else {
                if (event.payload.message.author.type == "user") {
                  var messagePayload = event.payload.message;
                  var userIdForBot = messagePayload.author.userId + '_' + appId + '_' + convId;
                  console.log('=== Inbound Chat from:  ' + displayName + ', Pass to Bot ===')
                  if (messagePayload.content.type == 'text') {
                    sendToBot(displayName, userIdForBot, messagePayload.content.text);
                  } else if (messagePayload.content.type == 'location') {
                    sendLocationToBot(userIdForBot, messagePayload.content)
                  } else if (messagePayload.content.type == 'file') {
                    sendFileToBot(userIdForBot, messagePayload.content);
                  } else if (messagePayload.content.type == 'image') {
                    sendImageToBot(userIdForBot, messagePayload.content)
                  }
                }
              }
            }
          } else {
            if (convSwitchboardName == 'bot') {
              console.log('-- unregistered account, pass to zd imidiately -- ')
              switchboardPassControl(appId, convId);
            }
          }
        }
      }
    } else {
      console.log(event.type)
    }
  });
  res.status(200).send({});
})

router.post('/hook-from-kata', async function(req, res, next) {
  console.log('HOOK-FROM-KATA userId: ' + req.body.userId);
  let userId = req.body.userId.split('_')[0];
  let appId = req.body.userId.split('_')[1];
  var convId = req.body.userId.split('_')[2];
  // var passToZd = false;

  var response;
  // console.log(JSON.stringify(req.body))

  goLogging('info', P_SEND_TO_SMOOCH, req.body.userId, req.body)
  
  for(const message of req.body.messages) {
    if (message.type == 'text') {
      console.log('sending id: ' + message.intent)
      await sendToSmooch(userId, appId, convId, message.content);
    } else {
      if (message.payload.template_type == 'carousel') {
        await sendCarouseltoSmooch(userId, appId, convId, message.payload);
      } else if (message.payload.template_type == 'image') {
        await sendImagetoSmooch(userId, appId, convId, message.payload);
      } else if (message.payload.template_type == 'location') {
        await sendLocationtoSmooch(userId, appId, convId, message.payload);
      } else if (message.payload.template_type == 'button') {
        console.log('not suppported on Smooch')
        // response =  {
        //   error: 'template_type: \'button\' not supported on Smooch'
        // }
      } else {
        await sendFiletoSmooch(userId, appId, convId, message.payload);
      }
    }
  }
  res.status(200).send({});
});

router.post('/handover', function(req, res, next) {
  if (req.body.userId.split('_').length < 3) {
    
    goLogging('error', P_HANDOVER, req.body.userId, req.body)

    res.status(400).send({
      error: 'userId: not registered/wrong pattern'
    })
  } else {
    goLogging('info', P_HANDOVER, req.body.userId, req.body)
    let appId = req.body.userId.split('_')[1];
    var convId = req.body.userId.split('_')[2];
    switchboardPassControl(appId, convId);
    res.status(200).send({
      status: 'ok'
    })
  }
})

function sendLocationToBot (userId, chatContent) {
  console.log('-- send location to Bot --')
  axios({
      method: 'POST',
      url: KATABOT_URL,
      data: {
          userId: userId,
          messages: [{
              type: "data",
              payload : {
                type: 'location',
                latitude: chatContent.coordinates.lat,
                langitude: chatContent.coordinates.long
              }
          }]
      }
  }).then(function (response) {
      console.log('Sent to BOT: %s', response.status);
  });
}

function sendFileToBot (userId, chatContent) {
  console.log('-- send file to Bot --')
  axios({
      method: 'POST',
      url: KATABOT_URL,
      data: {
          userId: userId,
          messages: [{
              type: "data",
              payload : {
                type: chatContent.mediaType,
                url: chatContent.mediaUrl
              }
          }]
      }
  }).then(function (response) {
      console.log('Sent to BOT: %s', response.status);
  });
}

function sendImageToBot (userId, chatContent) {
  console.log('-- send image to Bot --')
  axios({
      method: 'POST',
      url: KATABOT_URL,
      data: {
          userId: userId,
          messages: [{
              type: "data",
              payload : {
                type: 'image',
                url: chatContent.mediaUrl
              }
          }]
      }
  }).then(function (response) {
      console.log('Sent to BOT: %s', response.status);
  });
}

function sendToBot (displayName, userId, chatContent) {
  console.log('-- send text to Bot --')
  axios({
      method: 'POST',
      url: KATABOT_URL,
      data: {
          userId: userId,
          messages: [{
              type: "text",
              content: chatContent,
              payload: {
                username: displayName
              }
          }]
      }
  }).then(function (response) {
      console.log('Sent to BOT: %s', response.status);
  });
}

async function sendToSmooch (userId, appId, convId, messageContent) {
  // var apiInstance = new SunshineConversationsClient.MessagesApi();
  var messagePost = new SunshineConversationsClient.MessagePost();
  messagePost.author = {
    type: 'business',
    displayName: BOT_ALIAS
  }
  messagePost.content = {
    type: 'text',
    text: messageContent
  }

  // await apiInstance.postMessage(appId, convId, messagePost).then(function(data) {
  //   console.log('API POST Message called successfully. Returned data: ' + data);
  // }, function(error) {
  //   console.error(error);
  // });
  
  return await finalSendtoSmooch(userId, appId, convId, messagePost);
}

function sendImagetoSmooch (userId, appId, convId, messagePayload) {
  // var apiInstance = new SunshineConversationsClient.MessagesApi();
  var messagePost = new SunshineConversationsClient.MessagePost();
  messagePost.author = {
    type: 'business',
    displayName: BOT_ALIAS
  }
  messagePost.content = {
    type: 'image',
    mediaUrl: messagePayload.items.originalContentUrl
  }

  // apiInstance.postMessage(appId, convId, messagePost).then(function(data) {
  //   console.log('API POST Message called successfully. Returned data: ' + data);
  // }, function(error) {
  //   console.error(error);
  // });
  finalSendtoSmooch(userId, appId, convId, messagePost);
  return messagePost;
}

function sendLocationtoSmooch (userId, appId, convId, messagePayload) {
  // var apiInstance = new SunshineConversationsClient.MessagesApi();
  var messagePost = new SunshineConversationsClient.MessagePost();
  messagePost.author = {
    type: 'business',
    displayName: BOT_ALIAS
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

  // apiInstance.postMessage(appId, convId, messagePost).then(function(data) {
  //   console.log('API POST Message called successfully. Returned data: ' + data);
  // }, function(error) {
  //   console.error(error);
  // });
  finalSendtoSmooch(userId, appId, convId, messagePost);
  return messagePost;
}


function sendFiletoSmooch (userId, appId, convId, messagePayload) {
  // var apiInstance = new SunshineConversationsClient.MessagesApi();
  var messagePost = new SunshineConversationsClient.MessagePost();
  messagePost.author = {
    type: 'business',
    displayName: BOT_ALIAS
  }
  messagePost.content = {
    type: 'file',
    mediaUrl: messagePayload.items.originalContentUrl
  }

  // apiInstance.postMessage(appId, convId, messagePost).then(function(data) {
  //   console.log('API POST Message called successfully. Returned data: ' + data);
  // }, function(error) {
  //   console.error(error);
  // });
  finalSendtoSmooch(userId, appId, convId, messagePost);
  return messagePost;
}

function sendCarouseltoSmooch (userId, appId, convId, messagePayload) {
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
    type: 'business',
    displayName: BOT_ALIAS
  }
  messagePost.content = carouselPayload;
  
  // apiInstance.postMessage(appId, convId, messagePost).then(function(data) {
  //   console.log('API POST Message called successfully. Returned data: ' + data);
  // }, function(error) {
  //   console.error(error);
  // });
  finalSendtoSmooch(userId, appId, convId, messagePost);
  return messagePost;
}

function finalSendtoSmooch (userId, appId, convId, messagePost) {
  
  if (gotoSmooch) {
    // goLogging('info', P_SEND_TO_SMOOCH, userId + '_' + appId + '_' + convId, messagePost)
    var apiInstance = new SunshineConversationsClient.MessagesApi();
    
    return apiInstance.postMessage(appId, convId, messagePost).then(function(data) {
      console.log('API POST Message called successfully. Returned data: ' + data);
    }, function(error) {
      console.error('error sending to smooch: ' + error);
      goLogging('error', P_SEND_TO_SMOOCH, userId + '_' + appId + '_' + convId, error.body)
    });
  } else {
    // winston.log('info', messagePost);
  }
}

function switchboardPassControl (appId, convId) {
  var apiInstance = new SunshineConversationsClient.SwitchboardActionsApi();
  var passControlBody = new SunshineConversationsClient.PassControlBody();
  passControlBody.switchboardIntegration = 'next';

  console.log('passing control chat')
  apiInstance.passControl(appId, convId, passControlBody).then(function(data) {
    console.log('API Pass Control called successfully. Returned data: ' + data);
  }, function(error) {
    console.log(error)
  });
}

function goLogging (status, process, to, message) {
  winston.log(status, {
    process: process, 
    status: status,
    to: to,
    message: message
  });
}

module.exports = router;