var express = require('express');
var router = express.Router();
var SunshineConversationsClient = require('sunshine-conversations-client');
var defaultClient = SunshineConversationsClient.ApiClient.instance;
const axios = require('axios');

var basicAuth = defaultClient.authentications['basicAuth'];

var SMOOCH_KEY_ID = process.env.SMOOCH_KEY_ID;
var SMOOCH_KEY_SECRET = process.env.SMOOCH_KEY_SECRET;
var BYPASS_ZD  = process.env.BYPASS_ZD;
var WA_ACTIVE_ACCOUNT;

basicAuth.username = SMOOCH_KEY_ID;
basicAuth.password = SMOOCH_KEY_SECRET;

var KATABOT_TOKEN = process.env.BOT_TOKEN;
let KATABOT_URL = 'https://kanal.kata.ai/receive_message/' + KATABOT_TOKEN;

router.get('/webhook', function(req, res, next) {
  res.status(200).send({});
})

router.post('/webhook', function(req, res, next) {
  var appId = req.body.app.id;
  console.log(JSON.stringify(req.body))
  req.body.events.forEach(event => {
    if (event.type != 'conversation:read') {
      console.log('WEBHOOK from Smooch');
      console.log('User: ' + event.payload.message.author.displayName);
      var convId = event.payload.conversation.id;
      var convSwitchboardName = event.payload.conversation.activeSwitchboardIntegration.name;
      console.log('Switchboard: ' + convSwitchboardName)
      var convChannel = event.payload.message.source.type;
      if (convSwitchboardName == 'bot') {
        if (BYPASS_ZD) {
          console.log('=== PASS CONTROL TO ZENDESK ===')
          switchboardPassControl(appId, convId);
        } else {
            if (event.payload.message.author.type == "user") {
              var messagePayload = event.payload.message;
              var userIdForBot = messagePayload.author.userId + ':' + appId + ':' + convId;
              if (messagePayload.content.type = 'text') {
                sendToBot(userIdForBot, messagePayload.content.text);
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
  var passToZd = false;
  req.body.messages.forEach(message => {
    if (message.action != 'action-promocarousel') {
      if (message.action == 'action-escalate') {
          passToZd = true;
      }
      sendToSmooch(appId, convId, message.content);
      if (passToZd) {
        console.log('=== PASS CONTROL TO ZENDESK ===')
        switchboardPassControl(appId, convId);
      }
    } else {
      sendCarouseltoSmooch(appId, convId, message.payload)
    }
  });
  res.status(200).send({});
})

function sendToBot (userId, chatContent) {
  console.log('Chat form %s will be sent to BOT', userId);
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
  var apiInstance = new SunshineConversationsClient.MessagesApi();
  var messagePost = new SunshineConversationsClient.MessagePost();
  messagePost.author = {
    type: 'business',
    displayName: 'BOT'
  }
  messagePost.content = {
    type: 'text',
    text: messageContent
  }

  apiInstance.postMessage(appId, convId, messagePost).then(function(data) {
    console.log('API POST Message called successfully. Returned data: ' + data);
  }, function(error) {
    console.error(error);
  });
}

function sendCarouseltoSmooch (appId, convId, messagePayload) {
  var apiInstance = new SunshineConversationsClient.MessagesApi();
  var messagePost = new SunshineConversationsClient.MessagePost();
  var carouselItems = [];
  messagePayload.items.forEach(carouselItem => {
    var carouselActions = [];
    carouselItem.actions.forEach(carouselAction => {
      if (carouselAction.type == 'url') {
        carouselActions.push({
          text: carouselAction.label,
          type: 'link',
          uri: carouselAction.url
        })
      } else {
        carouselActions.push({
          text: carouselAction.label,
          type: 'postback',
          payload: 'TACOS'
        })
      }
    });
    carouselItems.push({
      title: carouselItem.title,
      description: carouselItem.text,
      mediaUrl: carouselItem.thumbnailImageUrl,
      actions: carouselActions
    })
  });
  var carouselPayload = {
    type: 'carousel',
    items: carouselItems
  };

  messagePost.author = {
    type: 'business',
    displayName: 'BOT'
  }
  messagePost.content = carouselPayload;
  
  apiInstance.postMessage(appId, convId, messagePost).then(function(data) {
    console.log('API POST Message called successfully. Returned data: ' + data);
  }, function(error) {
    console.error(error);
  });
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
