'use strict';

const exec = require('child_process').exec;
const express = require('express');
const fs = require('fs');
const redis = require('redis');
const request = require('request');
const slack = require('./lib/slack');
const txn = require('./lib/txn');

if (process.argv.length <= 2) {
  console.log('Usage: ' + __filename + ' <txnId>');
  process.exit(0);
}

var logsDir = __dirname + '/logs';
var slackWebhookUrl = process.argv[2];
var slackMemberId = process.argv[3];
var currency = process.argv[4];
var txnId = process.argv[5];
var rClient = redis.createClient();
var app = express();

app.use(express.json());
app.use(express.urlencoded());


function requireBodyParams(req, res, params) {
  var paramsMissing = [];
  for (let i = 0; i < params.length; ++i) {
    if (!req.body.hasOwnProperty(params[i])) {
      paramsMissing.push(params[i]);
    }
  }
  if (paramsMissing.length > 0) {
    res.status(400).send({ error: "Missing required param" +
        (paramsMissing.length === 1 ? '' : 's') +
        ": '" + paramsMissing.join(', ')  + "'." });
    return false;
  }
  return true;
}

app.post('/api/v1/reward', (req, res) => {
  if (!requireBodyParams(req, res, ['slack-webook-url', 'slack-member-id', 'currency', 'txn-id']) {
    return;
  }
  
  txn.getRewardInfo(req.body['currency'], req.body['txn-id']).then((rewardInfo) => {
    var message = '<@' + req.body['slack-member-id'] + '> received a staking reward of ' + rewardInfo.amount + ' PURE.\n' + rewardInfo.txnDetailsUrl;
    slack.sendMessage( req.body['slack-webhook-url'], message);
  });  
});


function logError(context, message) {
  if (!message) {
    message = context;
    context = 'script';
  }

  var timestamp = new Date().toISOString()
    .replace(/T/, ' ')
    .replace(/\..+/, '');
  fs.appendFile(logsDir + '/' + context + '.error.log', timestamp + ' - ' + message + "\n", 'utf8');
}

function sendSlackMessage(message) {
  request({
    url: slackWebhookUrl,
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
      }
    }
  });
}

