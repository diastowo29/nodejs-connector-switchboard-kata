var express = require('express');
var router = express.Router();
var SunshineConversationsClient = require('sunshine-conversations-client');
var defaultClient = SunshineConversationsClient.ApiClient.instance;
const axios = require('axios');
const payGen = require("./config/payload.js")
const axiosRetry = require('axios-retry');
// import qs from 'qs';

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
var inProd = process.env.LOG_DISABLED || "false";

var getTokenEndpoint = process.env.TOKEN_API || "xxx"
var getCustomerEndpoint = process.env.CUSTOMER_API || "xxx"
var clientSecret = process.env.CLIENT_SECRET || "xxx";
var clientId = process.env.CLIENT_ID || "xxx";
var headerToken = process.env.HEADER_TOKEN || "xxx";
const ZD_TOKEN = process.env.ZD_TOKEN || 'xxx';
const ZD_USER = process.env.ZD_USER || 'xxx';

var BOT_CLIENT = 'JAGO-PROD'

var LOG_TOKEN = '';

basicAuth.username = SMOOCH_KEY_ID;
basicAuth.password = SMOOCH_KEY_SECRET;

var P_SEND_TO_SMOOCH = 'sendToSmooch'
var P_SEND_TO_BOT = 'sendToBot'
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
  // var appId = req.body.app.id;
  // req.body.events.forEach(event => {
  //   if (event.type != 'conversation:read') {
  //     var convChannel = event.payload.message.source.type;
  //     var convIntegrationId = event.payload.message.source.integrationId;
  //     var convId = event.payload.conversation.id;
  //     // taro custom payload untuk tambah tipe user (premium bot a, non bot b)
  //     if ('activeSwitchboardIntegration' in event.payload.conversation) {
  //       var convSwitchboardName = event.payload.conversation.activeSwitchboardIntegration.name;
  //       if (!EXCLUDED_INTG_ID.includes(convIntegrationId)) {
  //         console.log(`Inbound SMOOCH User: ${event.payload.message.author.displayName} SW: ${convSwitchboardName} USER_ID: ${event.payload.message.author.userId}_${appId}_${convId}`)
  //         // var displayName = event.payload.message.author.displayName;
  //         if (convSwitchboardName == 'bot') {
  //           if (BYPASS_ZD == 'true' ) {
  //             getClevel(false, {}, event.payload.message.author.userId, appId, convId, event.payload.message.id, false, {tags:''})
  //           } else {
  //             if (event.payload.message.author.type == "user") {
  //               var messagePayload = event.payload.message;
  //               var userIdForBot = messagePayload.author.userId + '_' + appId + '_' + convId;
  //               sendToBot(payGen.doGenerateBotPayload(userIdForBot, messagePayload), event.payload.message.author.displayName)
  //             }
  //           }
  //         }
  //       } else if ((convChannel != 'api:conversations') && (convChannel != 'zd:agentWorkspace')) {
  //         if (convSwitchboardName == 'bot') {
  //           if (convChannel != 'officehours') { // 'officehours' means automated messages
  //             console.log('-- unregistered account, pass to zd imidiately -- ')
  //             getClevel(false, {}, event.payload.message.author.userId, appId, convId, event.payload.message.id, false, {tags:''})
  //           }
  //         }
  //       }
  //     }
  //   }
  // });
  // res.status(200).send({});
  const appId = req.body.app.id;
    req
        .body
        .events
        .forEach(event => {
            if (event.payload.conversation.activeSwitchboardIntegration.integrationType == 'custom') {
                console.log(event.type);
                const convId = event.payload.conversation.id
                if (event.type == 'conversation:message') {
                  var messagePayload = event.payload.message;
                    if (messagePayload.source.type != 'api:conversations') {
                        var convIntegrationId = messagePayload.source.integrationId;
                        if (CHANNEL_ACTIVE_ACCOUNT.includes(convIntegrationId)) {
                          console.log(JSON.stringify(req.body))
                          const userId = messagePayload.author.userId;
                          const userName = messagePayload.author.displayName;
                          const userIdForBot = userId + '_' + appId + '_' + convId;
                          // const messagePayload = messagePayload;
                          sendToBot(payGen.doGenerateBotPayload(userIdForBot, messagePayload), userName)
                        } else if ((convChannel != 'api:conversations') && (convChannel != 'zd:agentWorkspace')) {
                          if (convSwitchboardName == 'bot') {
                            if (convChannel != 'officehours') { // 'officehours' means automated messages
                              console.log('-- unregistered account, pass to zd imidiately -- ')
                              getClevel(false, {}, messagePayload.author.userId, appId, convId, messagePayload.id, false, {tags:''})
                            }
                          }
                        }
                    }
                } else if (event.type == 'switchboard:passControl') {
                    if (event.payload.conversation.activeSwitchboardIntegration.name != 'precustom-bot') {
                        console.log(JSON.stringify(req.body))
                        const metadata = JSON.parse(event.payload.metadata.mymeta);
                        const userId = metadata.userid;
                        const userName = metadata.username;
                        const userIdForBot = userId + '_' + appId + '_' + convId;
                        const message = metadata.message.content;
                        console.log('check 1')
                        sendToBot(payGen.doGenerateBotPayload(userIdForBot, message), userName)
                    }
                }
            }
        });
    res
        .status(200)
        .send({});
})

router.post('/prewebhook', function (req, res, next) {
    var appId = req.body.app.id;
    console.log(JSON.stringify(req.body))
    let metadata;
    req.body.events.forEach(event => {
      if (event.type != 'conversation:read') {
        var messagePayload = event.payload.message;
        var convChannel = messagePayload.source.type;
        var convIntegrationId = messagePayload.source.integrationId;
        var convId = event.payload.conversation.id;
        // taro custom payload untuk tambah tipe user (premium bot a, non bot b)
        if ('activeSwitchboardIntegration' in event.payload.conversation) {
          var convSwitchboardName = event.payload.conversation.activeSwitchboardIntegration.name;
          if (CHANNEL_ACTIVE_ACCOUNT.includes(convIntegrationId)) {
            console.log(`Inbound SMOOCH User: ${messagePayload.author.displayName} SW: ${convSwitchboardName} USER_ID: ${messagePayload.author.userId}_${appId}_${convId}`)
            // var displayName = messagePayload.author.displayName;
            if (convSwitchboardName == 'precustom-bot') {
              if (BYPASS_ZD == 'true' ) {
                getClevel(false, {}, messagePayload.author.userId, appId, convId, messagePayload.id, false, {tags:''})
              } else {
                if (messagePayload.author.type == "user") {
                  // var userIdForBot = messagePayload.author.userId + '_' + appId + '_' + convId;
                  let phoneNumber = messagePayload.source.client.externalId;
                  metadata = {
                    username: messagePayload.author.displayName,
                    userid: messagePayload.author.userId,
                    message: {
                        content: messagePayload
                    }
                  }
                  if (convChannel == 'whatsapp') {
                    getClevelFirst(appId, convId, messagePayload.id, messagePayload.author.userId, {}, phoneNumber, convChannel, metadata);
                  } else {
                    switchboardPassControlFirst(appId, convId, messagePayload.id, messagePayload.author.userId, '', false, metadata);
                  }
                //   sendToBot(payGen.doGenerateBotPayload(userIdForBot, messagePayload), messagePayload.author.displayName)
                }
              }
            }
          } else if ((convChannel != 'api:conversations') && (convChannel != 'zd:agentWorkspace')) {
            if (convSwitchboardName == 'precustom-bot') {
              if (convChannel != 'officehours') { // 'officehours' means automated messages
                console.log('-- unregistered account, pass to zd imidiately -- ')
                switchboardPassControlFirst(appId, convId, messagePayload.id, messagePayload.author.userId, '', true, {});
                    // getClevel(false, {}, messagePayload.author.userId, appId, convId, messagePayload.id, false, {tags:''})
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
  goLogging('info', P_SEND_TO_SMOOCH, req.body.userId, req.body, BOT_CLIENT, "")
  let userId = req.body.userId.split('_')[0];
  let appId = req.body.userId.split('_')[1];
  var convId = req.body.userId.split('_')[2];
  var response;

  console.log(`Inbound BOT USER_ID: ${req.body.userId}`)
  // console.log('info', P_SEND_TO_SMOOCH, req.body.userId, req.body, BOT_CLIENT)
  if (userId == undefined || appId == undefined || convId == undefined || req.body.messages == undefined) {
    res.status(422).send({
      error: 'invalid payload format'
    });
  } else {
    let i = 0;
    // console.log(JSON.stringify(req.body))
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
  if (req.body.userId.split('_').length < 3) {
    // goLogging('error', P_HANDOVER, req.body.userId, req.body, BOT_CLIENT)
    res.status(400).send({
      error: 'userId: not registered/wrong pattern'
    })
  } else {
    var solvedByBot = false;
    var ticket_fields = req.body.ticket_fields;
    var answerByBot = (req.body.answered_by_bot) ? req.body.answered_by_bot : false;
    solvedByBot = req.body.solved_by_bot;
    goLogging('info', P_HANDOVER, req.body.userId, req.body, BOT_CLIENT, "")
    // console.log('info', P_HANDOVER, req.body.userId, req.body, BOT_CLIENT)
    console.log(`Handover USER_ID: ${req.body.userId}`)
    let userId = req.body.userId.split('_')[0];
    let appId = req.body.userId.split('_')[1];
    var convId = req.body.userId.split('_')[2];
    const firstMsgId = req.body.first_message_id
    
    getClevel(solvedByBot, ticket_fields, userId, appId, convId, firstMsgId, answerByBot, req.body)
    res.status(200).send({  
      status: 'ok'
    })
  }
})

function sendToBot(botPayloadJson, username) {
  axios(payGen.doGenerateAxiosRequest('POST', BOT_URL, BOT_AUTH, botPayloadJson)).then(function (response) {
    console.log('Sent to BOT: %s', response.status);
    goLogging('info', P_SEND_TO_BOT, botPayloadJson.sender, botPayloadJson, BOT_CLIENT, username)
  }).catch(function(err){
    console.log(err.response.status);
    console.log(err.response.statusText);
    // console.log(err)
    try {
      goLogging('error', P_SEND_TO_BOT, botPayloadJson.sender, err.response.statusText, BOT_CLIENT, username)
      switchboardPassControl(botPayloadJson.sender.split('_')[1], botPayloadJson.sender.split('_')[2], false, null, botPayloadJson.sender.split('_')[0], {}, '', false, {tags: ''})
    } catch (e) {
      switchboardPassControl(botPayloadJson.sender.split('_')[1], botPayloadJson.sender.split('_')[2], false, null, botPayloadJson.sender.split('_')[0], {}, '', false, {tags: ''})
    }
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

/* function hcSendCarouseltoSmooch(userId, appId, convId, messagePayload) {
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
} */

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
    goLogging('info', P_SEND_TO_SMOOCH, userId + '_' + appId + '_' + convId, messagePost, BOT_CLIENT, "")
    var apiInstance = new SunshineConversationsClient.MessagesApi();

    try {
      return apiInstance.postMessage(appId, convId, messagePost).then(function (data) {
        return data
      }, function (error) {
        goLogging('error', P_SEND_TO_SMOOCH, userId + '_' + appId + '_' + convId, error.body, BOT_CLIENT, "")
        return {error: error.body};
    });
    } catch (err) {
      return {error: err};
    }
  } else {
    // winston.log('info', messagePost);
    goLogging('info', P_SEND_TO_SMOOCH, userId + '_' + appId + '_' + convId, messagePost, BOT_CLIENT, "")
    console.log(JSON.stringify(messagePost))
  }
}

function switchboardPassControlFirst(appId, convId, firstMsgId, userId = null, cLevel, bypass, metadata) {
    // var solvedTag = (solved) ? `solved_by_bot ${cLevel}` : `unsolved ${cLevel}`;
    // solvedTag = (answerByBot) ? `${solvedTag} answer_by_bot` : solvedTag
    // solvedTag = (handoverBody.tags.includes('user-idle')) ? `${solvedTag} user-idle` : solvedTag
  
    var apiInstance = new SunshineConversationsClient.SwitchboardActionsApi();
    var passControlBody = new SunshineConversationsClient.PassControlBody();
    passControlBody.switchboardIntegration = (bypass) ? 'zd-agentWorkspace': 'next';
    if (bypass) {
        passControlBody.metadata = {
          ['dataCapture.systemField.tags']: cLevel,
          ['dataCapture.ticketField.10530778827415']: convId,
          ['dataCapture.ticketField.10530780390807']: userId
        }
        passControlBody.metadata[['first_message_id']] = firstMsgId
    } else {
      passControlBody.metadata = {
        mymeta: JSON.stringify(metadata)
      }
    }
  
    console.log('passing control chat', passControlBody)
    apiInstance.passControl(appId, convId, passControlBody).then(function (data) {
      console.log('API Pass Control called successfully. Returned data: ' + data);
    }, function (error) {
      console.log(error)
    });
  }

function switchboardPassControl(appId, convId, solved, firstMsgId, userId = null, ticket_fields = {}, cLevel, answerByBot, handoverBody) {
  var solvedTag = (solved) ? `solved_by_bot ${cLevel}` : `unsolved ${cLevel}`;
  solvedTag = (answerByBot) ? `${solvedTag} answer_by_bot` : solvedTag
  solvedTag = (handoverBody.tags.includes('user-idle')) ? `${solvedTag} user-idle` : solvedTag

  var apiInstance = new SunshineConversationsClient.SwitchboardActionsApi();
  var passControlBody = new SunshineConversationsClient.PassControlBody();
  passControlBody.switchboardIntegration = 'next';
  passControlBody.metadata = {
    ['dataCapture.systemField.tags']: solvedTag,
    ['dataCapture.ticketField.10530778827415']: convId,
    ['dataCapture.ticketField.10530780390807']: userId
  }

  Object.entries(ticket_fields).map(f => {
    passControlBody.metadata[[`dataCapture.ticketField.${f[0]}`]] = f[1] ?? 0
  })
  passControlBody.metadata[['first_message_id']] = firstMsgId

  console.log('passing control chat', passControlBody)
  apiInstance.passControl(appId, convId, passControlBody).then(function (data) {
    console.log('API Pass Control called successfully. Returned data: ' + data);
  }, function (error) {
    console.log(error)
  });
}

function goLogging(status, process, to, message, client, name) {
  if (inProd == 'false') {
    winston.log(status, {
      process: process,
      status: status,
      to: to,
      username: name,
      message: message,
      client: client
    });
  }
}

function getClevelFirst (appId, convId, msgId, userId, ticket_fields, phoneNumber, sourceType, metadata) {
    var clevel = '';
    var bypass = false;
    let authToken = ZD_TOKEN;
    let buff = new Buffer(authToken);
    axios(payGen.doGenerateJagoToken(getTokenEndpoint, clientId, clientSecret, headerToken)).then(function(jagoToken){
      axios(payGen.doGenerateCustomerInfo(`${getCustomerEndpoint}?phoneNumber=%2B${phoneNumber}`, headerToken, jagoToken.data.access_token)).then(function(jagoCustomer) {
        switch (jagoCustomer.data.data.customerLevel) {
          case 'Jagoan':
            clevel = 'lv1'
            break;
          case 'Silver Jagoan':
            clevel = 'lv2'
            break;
          case 'Gold Jagoan':
            clevel = 'lv3'
            break;
          case 'Platinum Jagoan':
            clevel = 'lv4'
            bypass = true;
            break;
          case 'VVIP':
            clevel = 'lv5';
            bypass = true;
            break;
          default:
            clevel = 'lv1'
            break;
        }
        if (bypass) {
          switchboardPassControlFirst(appId, convId, msgId, userId, clevel, bypass, metadata);
        } else {
          axios(payGen.doGetZdRequester('tanyajago', phoneNumber, `Basic ${buff.toString('base64')}`)).then(function (requester) {
            requester.data.results.forEach(result => {
              if (result.tags.indexOf('vip_customer') > -1) {
                bypass = true;
              }
            });
            switchboardPassControlFirst(appId, convId, msgId, userId, clevel, bypass, metadata);
          }).catch(function(requesterErr) {
            if (requesterErr.response) {
              console.log(requesterErr.response.data);
              console.log(requesterErr.response.status);
            } else {
              console.log(requesterErr.message);
            }
            switchboardPassControlFirst(appId, convId, msgId, userId, clevel, bypass, metadata);
            // switchboardPassControl(appId, convId, false, msgId, userId, ticket_fields, '', false, {});
          })
        }
      //   switchboardPassControl(appId, convId, solvedByBot, firstMsgId, userId, ticket_fields, clevel, false, handoverBody);
      }).catch(function(customerErr) {
        switchboardPassControlFirst(appId, convId, msgId, userId, clevel, bypass, metadata);
      })
    }).catch(function(tokenErr) {
      switchboardPassControlFirst(appId, convId, msgId, userId, clevel, bypass, metadata);
    })
}

function getClevel (solvedByBot, ticket_fields, userId, appId, convId, firstMsgId, answerByBot, handoverBody) {
  
  var apiClientInstance = new SunshineConversationsClient.ClientsApi();
  apiClientInstance.listClients(appId, userId, {}).then(function(userClient) {
    var isWhatsapp = false;
    var phoneNumber = '';
    userClient.clients.forEach(client => {
      if (client.type == 'whatsapp') {
        isWhatsapp = true;
        phoneNumber = client.externalId;
      }
    });
    if (isWhatsapp) {
      var clevel = '';
      axios(payGen.doGenerateJagoToken(getTokenEndpoint, clientId, clientSecret, headerToken)).then(function(jagoToken){
        axios(payGen.doGenerateCustomerInfo(`${getCustomerEndpoint}?phoneNumber=%2B${phoneNumber}`, headerToken, jagoToken.data.access_token)).then(function(jagoCustomer) {
          switch (jagoCustomer.data.data.customerLevel) {
            case 'Jagoan':
              clevel = 'lv1'
              break;
            case 'Silver Jagoan':
              clevel = 'lv2'
              break;
            case 'Gold Jagoan':
              clevel = 'lv3'
              break;
            case 'Platinum Jagoan':
              clevel = 'lv4'
              break;
            case 'VVIP':
              clevel = 'lv5'
              break;
            default:
              clevel = 'lv1'
              break;
          }
          switchboardPassControl(appId, convId, solvedByBot, firstMsgId, userId, ticket_fields, clevel, answerByBot, handoverBody);
        }).catch(function(customerErr) {
        switchboardPassControl(appId, convId, solvedByBot, firstMsgId, userId, ticket_fields, '', answerByBot, handoverBody);
        })
      }).catch(function(tokenErr) {
        switchboardPassControl(appId, convId, solvedByBot, firstMsgId, userId, ticket_fields, '', answerByBot, handoverBody);
      })
    } else {
      switchboardPassControl(appId, convId, solvedByBot, firstMsgId, userId, ticket_fields, '', answerByBot, handoverBody);
    }
  }, function(clientErr) {
    switchboardPassControl(appId, convId, solvedByBot, firstMsgId, userId, ticket_fields, '', answerByBot, handoverBody);
  })
}

module.exports = router;