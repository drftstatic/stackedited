const fetch = require('node-fetch');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { OAuth2Client } = require('google-auth-library');
const conf = require('./conf');

const s3Client = new S3Client({});
const googleClient = new OAuth2Client(conf.values.googleClientId);

const streamToString = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });

exports.getUser = async (id) => {
  try {
    const command = new GetObjectCommand({
      Bucket: conf.values.userBucketName,
      Key: id,
    });
    const response = await s3Client.send(command);
    const body = await streamToString(response.Body);
    return JSON.parse(body);
  } catch (err) {
    if (err.name === 'NoSuchKey') {
      return undefined;
    }
    throw err;
  }
};

exports.putUser = async (id, user) => {
  const command = new PutObjectCommand({
    Bucket: conf.values.userBucketName,
    Key: id,
    Body: JSON.stringify(user),
  });
  return s3Client.send(command);
};

exports.getUserFromToken = async (idToken) => {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: conf.values.googleClientId,
  });
  const payload = ticket.getPayload();
  return exports.getUser(payload.sub);
};

exports.userInfo = async (req, res) => {
  try {
    const user = await exports.getUserFromToken(req.query.idToken);
    res.send(Object.assign({
      sponsorUntil: 0,
    }, user));
  } catch (err) {
    res.status(400).send(err ? err.message || err.toString() : 'invalid_token');
  }
};

exports.paypalIpn = async (req, res, next) => {
  try {
    const userId = req.body.custom;
    const paypalEmail = req.body.payer_email;
    const gross = parseFloat(req.body.mc_gross);
    let sponsorUntil;
    if (gross === 5) {
      sponsorUntil = Date.now() + (3 * 31 * 24 * 60 * 60 * 1000); // 3 months
    } else if (gross === 15) {
      sponsorUntil = Date.now() + (366 * 24 * 60 * 60 * 1000); // 1 year
    } else if (gross === 25) {
      sponsorUntil = Date.now() + (2 * 366 * 24 * 60 * 60 * 1000); // 2 years
    } else if (gross === 50) {
      sponsorUntil = Date.now() + (5 * 366 * 24 * 60 * 60 * 1000); // 5 years
    }
    if (
      req.body.receiver_email !== conf.values.paypalReceiverEmail ||
      req.body.payment_status !== 'Completed' ||
      req.body.mc_currency !== 'USD' ||
      (req.body.txn_type !== 'web_accept' && req.body.txn_type !== 'subscr_payment') ||
      !userId || !sponsorUntil
    ) {
      // Ignoring PayPal IPN
      return res.end();
    }

    // Processing PayPal IPN - verify with PayPal
    const params = new URLSearchParams(req.body);
    params.set('cmd', '_notify-validate');

    const response = await fetch(conf.values.paypalUri, {
      method: 'POST',
      body: params,
    });
    const body = await response.text();

    if (body !== 'VERIFIED') {
      throw new Error('PayPal IPN unverified');
    }

    await exports.putUser(userId, {
      paypalEmail,
      sponsorUntil,
    });

    return res.end();
  } catch (err) {
    next(err);
  }
};

exports.checkSponsor = async (idToken) => {
  if (!conf.publicValues.allowSponsorship) {
    return true;
  }
  if (!idToken) {
    return false;
  }
  try {
    const userInfo = await exports.getUserFromToken(idToken);
    return userInfo && userInfo.sponsorUntil > Date.now();
  } catch {
    return false;
  }
};
