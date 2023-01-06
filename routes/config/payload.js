// const querystring = require('node:querystring');
var qs = require('qs');

const doGenerateAxiosRequest = function(method, url, authCode, jsonPayload){
    var request = {
        method: method,
        url: url,
        headers: {
            Authorization: authCode
        },
        data: jsonPayload
    }
    return request
}

const doGenerateJagoToken = function(url, clientId,  clientSecret, headerToken){
  
  const data = {
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret
  };
  // const params = new URLSearchParams();
  // params.append('grant_type', 'client_credentials');
  // params.append('client_id', clientId);
  // params.append('client_secret', clientSecret);

  var request = {
      method: "POST",
      url: url,
      headers: {
          ['x-tyk-auth']: headerToken,
          ['Content-Type']: 'application/x-www-form-urlencoded'
      },
      data: qs.stringify(data)
  }
  return request
}

const doGenerateCustomerInfo = function(url, headerToken, bearerToken){
  var request = {
      method: "GET",
      url: url,
      headers: {
        Authorization: 'Bearer ' + bearerToken,
        ['x-tyk-auth']: headerToken
      }
  }
  return request
}

const doGenerateBotPayload = function  (generatedUserId, messagePayload, botToken) {
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
    } else {
      content = messagePayload.content.mediaUrl
    }
  
    return {
      sender: generatedUserId,
      to: botToken,
      [key]: content,
      type: messagePayload.content.type,
      payload: additionalPayload
    }
  }

  const doGenerateSmoochPayload = function  (messageContent) {
    var messagePost = new SunshineConversationsClient.MessagePost();
    messagePost.author = {
      type: 'business'
      // displayName: BOT_ALIAS
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

  const doGenerateSampleMsgPayload = function (chatContent) {
    return {
      content: {
        text: chatContent, 
        type: 'text'
      }, 
      id: 'test-message-id', 
      source: {
        type: 'whatsapp'
      }
    }
  }

module.exports ={
    doGenerateAxiosRequest, 
    doGenerateBotPayload, 
    doGenerateSmoochPayload,
    doGenerateSampleMsgPayload,
    doGenerateJagoToken,
    doGenerateCustomerInfo
}
