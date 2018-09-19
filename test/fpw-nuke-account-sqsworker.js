'use strict';

const AWS = require('aws-sdk')
const mochaPlugin = require('serverless-mocha-plugin');
const expect = mochaPlugin.chai.expect;
let wrapped = mochaPlugin.getWrapper('fpw-nuke-account-sqsworker', '/index.js', 'handler');
const fs = require('fs')
const path = require('path');
const axios = require('axios');
const sleep = require('sleep');

function readJsonSync(filePath) {
  let data = fs.readFileSync(path.resolve(filePath), "utf8")
  return JSON.parse(data)
}

// let testPhone = ''

describe('fpw-nuke-account-sqsworker', () => {
  before(async () => {
    // const ssm = new AWS.SSM();
    // let ssmResp = await ssm.getParameter({ Name: '/fpw/TWILIO_TEST_TO_NUMBER'}).promise()
    // testPhone = ssmResp.Parameter.Value
  });

  it('succeeds to delete objects for a valid request', async () => {
    let phone = '609-555-1414'
    // create some test data, sending a confirmation code creates a transcription on s3
    let resp = await axios({
      method: 'post',
      url: 'https://api-dev.forgotpw.com/v1/codes',
      data: {
        application: "myapp",
        phone: phone
      }
    })
    if (resp.status != 200) {
      console.error('Error generating test code for test s3 content:', resp.data)
    }
    // s3 is eventual consistency, give it a second
    sleep.sleep(1)

    let validNukeAccountEventData = readJsonSync('./events/ValidNukeAccountSQSRequest.json')
    validNukeAccountEventData.Records[0].body = replaceAll(
      validNukeAccountEventData.Records[0].body,
      '609-555-1212', phone)
    validNukeAccountEventData.Records[0].body = replaceAll(
      validNukeAccountEventData.Records[0].body,
      '6095551212', replaceAll(phone, '-',''))

    return wrapped.run(validNukeAccountEventData).then( (response) => {
      expect(response).to.equal(undefined)
    })

  }).timeout(10000)

  // it('rejects attempts to nuke accounts with non-numeric phones', async () => {
  //   let phone = '800-INVALID'
  //   let validNukeAccountEventData = readJsonSync('./events/ValidNukeAccountSQSRequest.json')
  //   validNukeAccountEventData.Records[0].body = replaceAll(
  //     validNukeAccountEventData.Records[0].body,
  //     '609-555-1212', phone)
  //   validNukeAccountEventData.Records[0].body = replaceAll(
  //     validNukeAccountEventData.Records[0].body,
  //     '6095551212', replaceAll(phone, '-',''))

  //   try {
  //     let resp = await wrapped.run(validNukeAccountEventData)
  //   }
  //   catch (err) {
  //     expect(err).to.be.an.instanceof(Error)
  //   }
  // });

  // it('throws exception when trying to nuke account with no data on s3', async () => {
  //   let phone = '609-555-9999'
  //   let validNukeAccountEventData = readJsonSync('./events/ValidNukeAccountSQSRequest.json')
  //   validNukeAccountEventData.Records[0].body = replaceAll(
  //     validNukeAccountEventData.Records[0].body,
  //     '609-555-1212', phone)
  //   validNukeAccountEventData.Records[0].body = replaceAll(
  //     validNukeAccountEventData.Records[0].body,
  //     '6095551212', replaceAll(phone, '-',''))

  //   // while this works when an excption is actually thrown, when one
  //   // is not, it also seems to indicate success instead of failure
  //   // try {
  //   //   let resp = await wrapped.run(validNukeAccountEventData)
  //   // }
  //   // catch (err) {
  //   //   expect(err).to.be.an.instanceof(Error)
  //   // }
  //   return wrapped.run(validNukeAccountEventData)
  //     .to.eventually.be.rejected()
  // });

});

function replaceAll(str, search, replace) {
  return str.split(search).join(replace)
}