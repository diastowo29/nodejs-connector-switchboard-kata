var express = require('express');
var router = express.Router();
var SunshineConversationsClient = require('sunshine-conversations-client');
var defaultClient = SunshineConversationsClient.ApiClient.instance;
const axios = require('axios');
// const { chatlog_model } = require('../sequelize')

var basicAuth = defaultClient.authentications['basicAuth'];

var SMOOCH_KEY_ID = process.env.SMOOCH_KEY_ID || "xxx";
var SMOOCH_KEY_SECRET = process.env.SMOOCH_KEY_SECRET || "xxx";
var BYPASS_ZD = process.env.BYPASS_ZD || "false";
var CHANNEL_ACTIVE_ACCOUNT = process.env.WA_ACTIVE_ACCOUNT || "62d7a492294f2700f0e3b08c";
var BOT_ALIAS = process.env.BOT_ALIAS || "Bita";
var LOG_TOKEN = '';

basicAuth.username = SMOOCH_KEY_ID;
basicAuth.password = SMOOCH_KEY_SECRET;

var P_SEND_TO_SMOOCH = 'sendToSmooch'
var P_HANDOVER = 'handover'

var BOT_TOKEN = process.env.BOT_TOKEN || "xxx";
let BOT_URL = 'https://r2.app.yellow.ai/integrations/sendMessage/' + BOT_TOKEN;

var gotoSmooch = false;

var winston = require('winston');
var { Loggly } = require('winston-loggly-bulk');

winston.add(new Loggly({
  token: "25cbd41e-e0a1-4289-babf-762a2e6967b6",
  subdomain: "diastowo",
  tags: ["sw-dev"],
  json: true
}));

router.get('/testing', function (req, res, next) {
  res.status(200).send(generateBotPayload('userid123', {content: {text: 'halo123'}}, 'image'))
})

router.get('/webhook', function (req, res, next) {
  res.status(200).send({});
})

router.post('/webhook', function (req, res, next) {
  var appId = req.body.app.id;
  console.log(JSON.stringify(req.body))
  // console.log('BOT ALIAS: ' + BOT_ALIAS + ' | BYPASS ZD: ' + BYPASS_ZD)
  req.body.events.forEach(event => {
    if (event.type != 'conversation:read') {
      var convChannel = event.payload.message.source.type;
      var convIntegrationId = event.payload.message.source.integrationId;
      var convId = event.payload.conversation.id;
      
      console.log(JSON.stringify(generateBotPayload('useridtesting', event.payload.message)))

      if ('activeSwitchboardIntegration' in event.payload.conversation) {
        var convSwitchboardName = event.payload.conversation.activeSwitchboardIntegration.name;
        console.log('inbound: ' + event.payload.message.author.displayName + ' switchboard: ' + event.payload.conversation.activeSwitchboardIntegration.name)
        if (CHANNEL_ACTIVE_ACCOUNT.includes(convIntegrationId)) {
          var displayName = event.payload.message.author.displayName;
          if (convSwitchboardName == 'bot') {
            if (BYPASS_ZD == 'true') {
              console.log('=== Inbound Chat from:  ' + displayName + ', Pass Control to Zendesk ===')
              switchboardPassControl(appId, convId);
            } else {
              if (event.payload.message.author.type == "user") {
                var messagePayload = event.payload.message;
                var userIdForBot = messagePayload.author.userId + '_' + appId + '_' + convId;
                // console.log((req.headers))
                console.log('=== Inbound Chat from:  ' + displayName + ', Pass to Bot ===')
                sendToBot(generateBotPayload(userIdForBot, messagePayload))
                // if (messagePayload.content.type == 'text') {
                //   sendToBot(displayName, userIdForBot, messagePayload.content.text);
                // } else if (messagePayload.content.type == 'location') {
                //   sendLocationToBot(userIdForBot, messagePayload.content)
                // } else if (messagePayload.content.type == 'file') {
                //   sendFileToBot(userIdForBot, messagePayload.content);
                // } else if (messagePayload.content.type == 'image') {
                //   sendImageToBot(userIdForBot, messagePayload.content)
                // }
              }
            }
          }
        } else if ((convChannel != 'api:conversations') && (convChannel != 'zd:agentWorkspace')) {
          if (convSwitchboardName == 'bot') {
            if (convChannel != 'officehours') { // 'officehours' means automated messages
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

router.post('/conv-created', function(req, res, next) {
  console.log(JSON.stringify(req.body))
  res.status(200).send({});
})

router.post('/conversation/reply', async function (req, res, next) {
  // console.log('HOOK-FROM-KATA userId: ' + req.body.userId);
  let userId = req.body.userId.split('_')[0];
  let appId = req.body.userId.split('_')[1];
  var convId = req.body.userId.split('_')[2];
  var response;

  goLogging('info', P_SEND_TO_SMOOCH, req.body.userId, req.body)

  let i = 0;
  for (const message of req.body.messages) {
    // if (i == 0) {
      if (message.type == 'text') {
        // console.log('sending id: ' + message.id)
        await sendToSmooch(userId, appId, convId, message.content);
        // if (appId == '5ea6f52b536ecb000f732a35') {
        //   if (message.content.includes('Maaf yah belum bisa bantu lebih banyak') || message.content.includes('aku arahin langsung ke Real Agent yah')) {
        //     switchboardPassControl(appId, convId);
        //   }
        // }
        // dumpChat(req.body.userId, message.type, message.content)
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
        } else if (message.payload.template_type == 'text') {
          await sendQuickReplySmooch(userId, appId, convId, message.payload);
        } else if (message.payload.template_type == 'list_reply') {
          await sendQuickReplySmooch(userId, appId, convId, message.payload);
        } else {
          await sendFiletoSmooch(userId, appId, convId, message.payload);
        }
        // dumpChat(req.body.userId, message.type, JSON.stringify(message.payload))
      }
    // } else {
    //   if (message.type == 'text') {
    //     // dumpChat(req.body.userId, message.type, message.content)
    //   } else {
    //     // dumpChat(req.body.userId, message.type, JSON.stringify(message.payload))
    //   }
    // }
    i++;
  }
  res.status(200).send({});
});

router.post('/conversation/handover', function (req, res, next) {
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

// async function dumpChat(userId, type, chatContent) {
//   try {
//     const chatlog = await chatlog_model.create({
//       user_id: userId,
//       chat_type: type,
//       chat_content: chatContent
//     });
//     return chatlog;
//   } catch (err) {
//     console.log(err)
//   }
// }

// function sendLocationToBot(userId, chatContent) {
//   console.log('-- send location to Bot --')
//   axios({
//     method: 'POST',
//     url: BOT_URL,
//     data: {
//       userId: userId,
//       messages: [{
//         type: "data",
//         payload: {
//           type: 'location',
//           latitude: chatContent.coordinates.lat,
//           langitude: chatContent.coordinates.long
//         }
//       }]
//     }
//   }).then(function (response) {
//     console.log('Sent to BOT: %s', response.status);
//   });
// }

// function sendFileToBot(userId, chatContent) {
//   console.log('-- send file to Bot --')
//   axios({
//     method: 'POST',
//     url: BOT_URL,
//     data: {
//       userId: userId,
//       messages: [{
//         type: "data",
//         payload: {
//           type: chatContent.mediaType,
//           url: chatContent.mediaUrl
//         }
//       }]
//     }
//   }).then(function (response) {
//     console.log('Sent to BOT: %s', response.status);
//   });
// }

// function sendImageToBot(userId, chatContent) {
//   console.log('-- send image to Bot --')
//   axios({
//     method: 'POST',
//     url: BOT_URL,
//     data: {
//       userId: userId,
//       messages: [{
//         type: "data",
//         payload: {
//           type: 'image',
//           url: chatContent.mediaUrl
//         }
//       }]
//     }
//   }).then(function (response) {
//     console.log('Sent to BOT: %s', response.status);
//   });
// }

function sendToBot(botPayloadJson) {
  console.log('-- send message to Bot --')
  console.log(botPayloadJson)
  // axios({
  //   method: 'POST',
  //   url: BOT_URL,
  //   data: botPayloadJson
  // }).then(function (response) {
  //   console.log('Sent to BOT: %s', response.status);
  // });
}

async function sendQuickReplySmooch (userId, appId, convId, messagePayload) {
  // console.log('sendquick to smooch')
  var messagePost = new SunshineConversationsClient.MessagePost();
  messagePost.author = {
    type: 'business',
    displayName: BOT_ALIAS
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

function sendImagetoSmooch(userId, appId, convId, messagePayload) {
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

function sendLocationtoSmooch(userId, appId, convId, messagePayload) {
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


function sendFiletoSmooch(userId, appId, convId, messagePayload) {
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

function finalSendtoSmooch(userId, appId, convId, messagePost) {

  if (gotoSmooch) {
    // goLogging('info', P_SEND_TO_SMOOCH, userId + '_' + appId + '_' + convId, messagePost)
    var apiInstance = new SunshineConversationsClient.MessagesApi();

    return apiInstance.postMessage(appId, convId, messagePost).then(function (data) {
      console.log('API POST Message called successfully. Returned data: ' + data);
    }, function (error) {
      console.error('error sending to smooch: ' + error);
      goLogging('error', P_SEND_TO_SMOOCH, userId + '_' + appId + '_' + convId, error.body)
    });
  } else {
    // winston.log('info', messagePost);
    console.log(messagePost)
  }
}

function switchboardPassControl(appId, convId) {
  var apiInstance = new SunshineConversationsClient.SwitchboardActionsApi();
  var passControlBody = new SunshineConversationsClient.PassControlBody();
  passControlBody.switchboardIntegration = 'next';

  console.log('passing control chat')
  apiInstance.passControl(appId, convId, passControlBody).then(function (data) {
    console.log('API Pass Control called successfully. Returned data: ' + data);
  }, function (error) {
    console.log(error)
  });
}

function goLogging(status, process, to, message) {
  winston.log(status, {
    process: process,
    status: status,
    to: to,
    message: message
  });
}

function generateBotPayload (generatedUserId, messagePayload) {
  var additionalPayload = {
    user_id: generatedUserId,
    message_id: messagePayload.id,
    channel: messagePayload.source.type,
    extra_details: {}
  }
  var key = messagePayload.content.type;
  var content;

  if (messagePayload.content.type == 'text') {
    content = messagePayload.content.text
  } else if (messagePayload.content.type == 'image') {
    // content = messagePayload.content.mediaUrl
    content = 'image sample'
  } else if (messagePayload.content.type == 'file') {
    // content = messagePayload.content.mediaUrl
    content = 'file sample'
  } else {
    // content = messagePayload.content.mediaUrl
    content = 'other sample'
  }

  return {
    sender: generatedUserId,
    to: BOT_TOKEN,
    [key]: content,
    type: messagePayload.content.type,
    payload: additionalPayload
  }
}

function generateSmoochPayload (messageContent) {
  var messagePost = new SunshineConversationsClient.MessagePost();
  messagePost.author = {
    type: 'business',
    displayName: BOT_ALIAS
  }

  if (messageContent.type == 'text') {
    messagePost.content = {
      type: messageContent.type,
      text: messageContent
    }
  } else {
    messagePost.content = {
      type: messageContent.type,
      [messageContent.type]: messageContent.items.originalContentUrl
    }
  }

  return messagePost;
}

module.exports = router;