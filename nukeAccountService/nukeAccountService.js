const AWS = require('aws-sdk')
const config = require('../config')
const logger = require('../logger')
const TwilioSmsPlus = require('twilio-sms-plus')

class NukeAccountService {
  constructor() {}

  async nukeAccount(normalizedPhone) {
    logger.info(`Received request to nuke account: ${normalizedPhone}`)

    if (!normalizedPhone || normalizedPhone.length < 10) {
      let msg = `Tried to nuke account with invalid phone: ${normalizedPhone}`
      logger.error(msg)
      throw new Error(msg)
    }
    if( !(/^(0|[1-9][0-9]*)$/.test(normalizedPhone)) ) {
      let msg = `Tried to nuke account with non numeric phone: ${normalizedPhone}`
      logger.error(msg)
      throw new Error(msg)
    }

    
    let keys = []
    keys.push(...await listKeysFromPrefix(
      config.USERDATA_S3_BUCKET,
      `users/${normalizedPhone}/data/`))
    keys.push(...await listKeysFromPrefix(
      config.USERDATA_S3_BUCKET,
      `users/${normalizedPhone}/transcript/`))

    if (!keys) {
      logger.warn(`Request to nuke account received but no data found in s3 in ${config.USERDATA_S3_BUCKET} for ${normalizedPhone}`)
    }
    logger.info(`Found ${keys.length} keys in ${config.USERDATA_S3_BUCKET} for ${normalizedPhone}`)
    
    // delete recursively all items in bucket
    logger.info(`Deleting keys for ${normalizedPhone}`)
    await deleteKeys(
      config.USERDATA_S3_BUCKET,
      keys
    )

    // send user a confirmation / goodbye text message
    let textMessage = "We've completely deleted all of your data, as per your request. Sorry to see you go."
    const twilioPlus = new TwilioSmsPlus({
      twilioAccountSide: process.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN
    })
    const result = await twilioPlus.sendTextMessage({
      textMessage: textMessage,
      toPhoneNumber: normalizedPhone,
      fromPhoneNumber: config.TWILIO_FROM_NUMBER,
      logS3bucket: config.USERDATA_S3_BUCKET,
      logS3keyPrefix: `users/${normalizedPhone}/transcript`
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

  for (let key of keys) {
    const s3 = new AWS.S3();

    var params = { 
      Bucket: bucket,
      Key: key
    }
  
    try {
      logger.trace(`Deleting item s3://${bucket}/${key}`)
      await s3.DeleteObject(params).promise()
      logger.info(`Deleted item s3://${bucket}/${key}`)
    }
    catch (err) {
      let msg = `Error deleting object from s3://${bucket}/${key}`
      logger.error(msg, err)
      throw new Error(msg)
    }
  
  }

}

module.exports = NukeAccountService
