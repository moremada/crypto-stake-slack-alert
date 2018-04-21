'use strict';

module.exports = {
  sendMessage: (webhookUrl, message) => {
    return new Promise((resolve, reject) => {
      request({
        url: webhookUrl,
        method: 'POST',
        headers: {
          'Content-type': 'application/json'
        },
        json: true,
        body: {
          text: message
        },
        callback: (err, respObj, resp) => {
          if (err !== null) {
            logError('slack', err);
            return reject();
          }
          return resolve();
        }
      });
    });
  }
};
