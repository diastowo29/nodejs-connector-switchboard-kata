var express = require('express');
var router = express.Router();
var SunshineConversationsClient = require('sunshine-conversations-client');
var defaultClient = SunshineConversationsClient.ApiClient.instance;
const axios = require('axios');

var basicAuth = defaultClient.authentications['basicAuth'];

var SMOOCH_KEY_ID = process.env.SMOOCH_KEY_ID;
var SMOOCH_KEY_SECRET = process.env.SMOOCH_KEY_SECRET;
var BYPASS_ZD  = process.env.BYPASS_ZD;
var WA_ACTIVE_ACCOUNT = process.env.WA_ACTIVE_ACCOUNT;
var BOT_ALIAS = process.env.BOT_ALIAS;

basicAuth.username = SMOOCH_KEY_ID;
basicAuth.password = SMOOCH_KEY_SECRET;

var KATABOT_TOKEN = process.env.BOT_TOKEN;
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


router.get('/webhook', function(req, res, next) {
  res.status(200).send({});
})

router.post('/webhook', function(req, res, next) {
  var appId = req.body.app.id;
  // console.log('BOT ALIAS: ' + BOT_ALIAS + ' | BYPASS ZD: ' + BYPASS_ZD)
  req.body.events.forEach(event => {
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
            console.log(JSON.stringify(req.body))
            console.log('WEBHOOK from Smooch');
            console.log('User: ' + event.payload.message.author.displayName);
            console.log('Switchboard: ' + convSwitchboardName)
            console.log('BYPASS: ' + (BYPASS_ZD == true))
            if (convSwitchboardName == 'bot') {
              if (BYPASS_ZD == true) {
                console.log('=== Inbound Chat from:  ' + event.payload.message.author.displayName + ', Pass Control to Zendesk ===')
                switchboardPassControl(appId, convId);
              } else {
                  if (event.payload.message.author.type == "user") {
                    var messagePayload = event.payload.message;
                    var userIdForBot = messagePayload.author.userId + ':' + appId + ':' + convId;
                    console.log('=== Inbound Chat from:  ' + event.payload.message.author.displayName + ', Pass to Bot ===')
                    if (messagePayload.content.type = 'text') {
                      sendToBot(userIdForBot, messagePayload.content.text);
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
    }
  });
  res.status(200).send({});
})

router.post('/hook-from-kata', function(req, res, next) {
  console.log('HOOK-FROM-KATA');
  let userId = req.body.userId.split(':')[0];
  let appId = req.body.userId.split(':')[1];
  var convId = req.body.userId.split(':')[2];
  // var passToZd = false;

  var response;
  req.body.messages.forEach(message => {
    if (message.type == 'text') {
      response = sendToSmooch(appId, convId, message.content);
    } else {
      if (message.payload.template_type == 'carousel') {
        response = sendCarouseltoSmooch(appId, convId, message.payload);
      } else if (message.payload.template_type == 'image') {
        response = sendImagetoSmooch(appId, convId, message.payload);
      } else if (message.payload.template_type == 'location') {
        response = sendLocationtoSmooch(appId, convId, message.payload);
      } else if (message.payload.template_type == 'button') {
        console.log('not suppported on Smooch')
        response = {
          error: 'template_type: \'button\' not supported on Smooch'
        }
      } else {
        response = sendFiletoSmooch(appId, convId, message.payload);
      }
    }
  });
  res.status(200).send(response);
});

router.post('/handover', function(req, res, next) {
  if (req.body.userId.split(':').length < 3) {
    res.status(400).send({
      error: 'userId: not registered/wrong pattern'
    })
  } else {
    let appId = req.body.userId.split(':')[1];
    var convId = req.body.userId.split(':')[2];
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

function sendToBot (userId, chatContent) {
  console.log('-- send text to Bot --')
  axios({
      method: 'POST',
      url: KATABOT_URL,
      data: {
          userId: userId,
          messages: [{
              type: "text",
              content: chatContent
          }]
      }
  }).then(function (response) {
      console.log('Sent to BOT: %s', response.status);
  });
}

function sendToSmooch (appId, convId, messageContent) {
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

  // apiInstance.postMessage(appId, convId, messagePost).then(function(data) {
  //   console.log('API POST Message called successfully. Returned data: ' + data);
  // }, function(error) {
  //   console.error(error);
  // });
  finalSendtoSmooch(appId, convId, messagePost);
  return messagePost;
}

function sendImagetoSmooch (appId, convId, messagePayload) {
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
  finalSendtoSmooch(appId, convId, messagePost);
  return messagePost;
}

function sendLocationtoSmooch (appId, convId, messagePayload) {
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
  finalSendtoSmooch(appId, convId, messagePost);
  return messagePost;
}


function sendFiletoSmooch (appId, convId, messagePayload) {
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
  finalSendtoSmooch(appId, convId, messagePost);
  return messagePost;
}

function sendCarouseltoSmooch (appId, convId, messagePayload) {
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
  finalSendtoSmooch(appId, convId, messagePost);
  return messagePost;
}

function finalSendtoSmooch (appId, convId, messagePost) {
  
  if (gotoSmooch) {
    winston.log('info', messagePost);
    var apiInstance = new SunshineConversationsClient.MessagesApi();
    
    apiInstance.postMessage(appId, convId, messagePost).then(function(data) {
      console.log('API POST Message called successfully. Returned data: ' + data);
    }, function(error) {
      console.error('error sending to smooch: ' + error);
    });
  } else {
    winston.log('info', messagePost);
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

module.exports = router;