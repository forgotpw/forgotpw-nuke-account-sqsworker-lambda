const AWS = require('aws-sdk')
const config = require('../config')
const logger = require('../logger')
const TwilioSmsPlus = require('twilio-sms-plus')
const PhoneTokenService = require('phone-token-service')

class NukeAccountService {
  constructor() {}

  async nukeAccount(userToken) {
    logger.info(`Received request to nuke account: ${userToken}`)

    if (!userToken || userToken.length < 20 || !userToken.startsWith('UT')) {
      let msg = `Tried to nuke account with invalid token: ${userToken}`
      logger.error(msg)
      throw new Error(msg)
    }
    
    let keys = []
    keys.push(...await listKeysFromPrefix(
      config.USERDATA_S3_BUCKET,
      `users/${userToken}/data/`))
    keys.push(...await listKeysFromPrefix(
      config.USERDATA_S3_BUCKET,
      `users/${userToken}/transcript/`))

    if (!keys) {
      logger.warn(`Request to nuke account received but no data found in s3 in ${config.USERDATA_S3_BUCKET} for ${userToken}`)
    }
    logger.info(`Found ${keys.length} keys in ${config.USERDATA_S3_BUCKET} for ${userToken}`)
    
    // delete recursively all items in bucket
    logger.info(`Deleting keys for ${userToken}`)
    let numDeleted = await deleteKeys(
      config.USERDATA_S3_BUCKET,
      keys
    )

    if (numDeleted == 0) {
      let msg = `Request to nuke account ${userToken} resulted in deleting zero items`
      logger.error(msg)
      throw new Error(msg)
    }

    // send user a confirmation / goodbye text message
    let textMessage = "We've completely deleted all of your data, as per your request. Sorry to see you go."

    const phoneTokenConfig = {
      tokenHashHmac: config.USERTOKEN_HASH_HMAC,
      s3bucket: config.USERTOKENS_S3_BUCKET,
      defaultCountryCode: 'US'
    }
    const phoneTokenService = new PhoneTokenService(phoneTokenConfig)
    const e164phone = await phoneTokenService.getPhoneFromToken(userToken)
  
    const twilioPlus = new TwilioSmsPlus({
      twilioAccountSide: process.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN
    })
    const result = await twilioPlus.sendTextMessage({
      textMessage: textMessage,
      toPhoneNumber: e164phone,
      fromPhoneNumber: config.TWILIO_FROM_NUMBER
      // NOTE: leave s3 properties out so that a transcript
      // isn't left for this request
    })
    if (!result.success) {
      logger.error('Error sending text message regarding nuked account')
    }
  
  }
}

async function listKeysFromPrefix(bucket, prefix, marker) {
  const s3 = new AWS.S3();

  var params = { 
    Bucket: bucket,
    Delimiter: '/',
    Prefix: prefix,
    MaxKeys: 100
  }
  if (marker) {
    params.Marker = marker
  }

  let s3resp = null
  try {
    s3resp = await s3.listObjects(params).promise()
  }
  catch (err) {
    let msg = `Error listing objects from s3://${bucket}/${prefix}`
    logger.error(msg, err)
    throw new Error(msg)
  }
  //logger.debug('s3resp:', s3resp)

  let keys = []
  for (let content of s3resp.Contents) {
    const key = content.Key
    logger.debug(`Found key; ${key}`)
    keys.push(key)
  }

  if (s3resp.IsTruncated) {
    keys.push(...await listKeysFromPrefix(bucket, prefix, s3resp.NextMarker))
  }

  return keys
}

async function deleteKeys(bucket, keys) {
  // not the fastest or most efficient way to delete but it works
  // and this shouldn't be called super often, and is a SQS item anyway
  let numDeleted = 0

  for (let key of keys) {
    const s3 = new AWS.S3();

    var params = { 
      Bucket: bucket,
      Key: key
    }
  
    try {
      logger.trace(`Deleting item s3://${bucket}/${key}`)
      await s3.deleteObject(params).promise()
      numDeleted++
      logger.info(`Deleted item s3://${bucket}/${key}`)
    }
    catch (err) {
      let msg = `Error deleting object from s3://${bucket}/${key}`
      logger.error(msg, err)
      throw new Error(msg)
    }
  
  }
  return numDeleted
}

module.exports = NukeAccountService
