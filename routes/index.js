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

var gotoSmooch = false;

router.get('/webhook', function(req, res, next) {
  res.status(200).send({});
})

router.post('/webhook', function(req, res, next) {
  var appId = req.body.app.id;
  // console.log(JSON.stringify(req.body))
  req.body.events.forEach(event => {
    if (event.type != 'conversation:read') {
      var convChannel = event.payload.message.source.type;
      var convIntegrationId = event.payload.message.source.integrationId;
      if (convChannel == 'whatsapp') {
        if ('activeSwitchboardIntegration' in event.payload.conversation) {
          console.log('== inbound message type: ' + convChannel + ' sw name: ' + event.payload.conversation.activeSwitchboardIntegration.name 
                      + ' integrationId: ' + convIntegrationId + ' active wa account: ' + WA_ACTIVE_ACCOUNT.includes(convIntegrationId) + ' author: ' + event.payload.message.author.displayName)
          var convId = event.payload.conversation.id;
          var convSwitchboardName = event.payload.conversation.activeSwitchboardIntegration.name;
          if (WA_ACTIVE_ACCOUNT.includes(convIntegrationId)) {
            console.log(JSON.stringify(req.body))
            console.log('WEBHOOK from Smooch');
            console.log('User: ' + event.payload.message.author.displayName);
            console.log('Switchboard: ' + convSwitchboardName)
            if (convSwitchboardName == 'bot') {
              if (BYPASS_ZD) {
                console.log('=== PASS CONTROL TO ZENDESK ===')
                switchboardPassControl(appId, convId);
              } else {
                  if (event.payload.message.author.type == "user") {
                    var messagePayload = event.payload.message;
                    var userIdForBot = messagePayload.author.userId + ':' + appId + ':' + convId;
                    console.log('message to bot: ' + messagePayload.content.text);
                    // if (messagePayload.content.type = 'text') {
                    //   sendToBot(userIdForBot, messagePayload.content.text);
                    // }
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
  req.body.messages.forEach(message => {
    if (message.type == 'text') {
      sendToSmooch(appId, convId, message.content);
    } else {
      if (message.payload.template_type == 'carousel') {
        sendCarouseltoSmooch(appId, convId, message.payload);
      } else if (message.payload.template_type == 'image') {
        sendImagetoSmooch(appId, convId, message.payload);
      } else if (message.payload.template_type == 'location') {
        sendLocationtoSmooch(appId, convId, message.payload);
      } else if (message.payload.template_type == 'button') {
        console.log('not suppported on Smooch')
      } else {
        sendFiletoSmooch(appId, convId, message.payload);
      }
    }
  });
  res.status(200).send({});
});

router.post('/handover', function(req, res, next) {
  let userId = req.body.userId.split(':')[0];
  let appId = req.body.userId.split(':')[1];
  var convId = req.body.userId.split(':')[2];
  switchboardPassControl(appId, convId);
  res.status(200).send({
    status: 'ok'
  })
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
        newCarouselActions.push({
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
}

function finalSendtoSmooch (appId, convId, messagePost) {
  if (gotoSmooch) {
    var apiInstance = new SunshineConversationsClient.MessagesApi();
    
    apiInstance.postMessage(appId, convId, messagePost).then(function(data) {
      console.log('API POST Message called successfully. Returned data: ' + data);
    }, function(error) {
      console.error('error sending to smooch: ' + error);
    });
  } else {
    console.log(JSON.stringify(messagePost))
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
