var SunshineConversationsClient = require('sunshine-conversations-client');
var defaultClient = SunshineConversationsClient.ApiClient.instance;

var basicAuth = defaultClient.authentications['basicAuth'];
basicAuth.username = 'app_5f2cd3cf63af24000cc0c6c6';
basicAuth.password = 'k6Heeb4NkXac1D9Br6OcopZ4IrgSFLPAXFjRXWY8p-wuyq0Y6CLn0lZW4f_aCCb4TWbCBC-4_9WyCIasha75OA';

var apiInstance = new SunshineConversationsClient.MessagesApi();
var messagePost = new SunshineConversationsClient.MessagePost();

messagePost.author = {
  type: 'business',
  displayName: 'bootolan'
}
messagePost.content = {
  type: 'text',
  text: 'hi from test'
}

function sendChat () {
    apiInstance.postMessage('5ea6f52b536ecb000f732a35', 'e65a1163d5d375675af4a422', messagePost).then(function (data) {
        console.log('API POST Message called successfully. Returned data: ' + data);
    }, function (error) {
        console.error('error sending to smooch: ' + error);
        // goLogging('error', P_SEND_TO_SMOOCH, userId + '_' + appId + '_' + convId, error.body)
    });
}

sendChat()