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
    doGenerateSampleMsgPayload
}
