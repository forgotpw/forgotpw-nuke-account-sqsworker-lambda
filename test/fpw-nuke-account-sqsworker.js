'use strict';

const AWS = require('aws-sdk')
const mochaPlugin = require('serverless-mocha-plugin');
const expect = mochaPlugin.chai.expect;
let wrapped = mochaPlugin.getWrapper('fpw-nuke-account-sqsworker', '/index.js', 'handler');
const fs = require('fs')
const path = require('path');

function readJsonSync(filePath) {
  let data = fs.readFileSync(path.resolve(filePath), "utf8")
  return JSON.parse(data)
}

describe('fpw-nuke-account-sqsworker', () => {
  before((done) => {
    done();
  });

  it('rejects attempts to nuke accounts with non-numeric phones', async () => {
    const ssm = new AWS.SSM();
    let ssmResp = await ssm.getParameter({ Name: '/fpw/TWILIO_TEST_TO_NUMBER'}).promise()
    let testPhone = ssmResp.Parameter.Value

    let validNukeAccountEventData = readJsonSync('./events/ValidNukeAccountSQSRequest.json')
    validNukeAccountEventData.Records[0].body = 
      validNukeAccountEventData.Records[0].body
        .replace('609-555-1212', testPhone)
    validNukeAccountEventData.Records[0].body =
      validNukeAccountEventData.Records[0].body
        .replace('6095551212', testPhone)

    expect(wrapped.run(validNukeAccountEventData)).to.throw(Error)
  });

});

