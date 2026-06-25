const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const teamId = 'T7SLR9836V';
const keyId = 'Y393JL7NNM';
const clientId = 'com.bobbyvegasai.picks';
const privateKeyPath = path.resolve(process.env.HOME, 'Downloads/AuthKey_Y393JL7NNM.p8');

const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

const now = Math.floor(Date.now() / 1000);

const token = jwt.sign(
  {
    iss: teamId,
    iat: now,
    exp: now + 86400 * 180,
    aud: 'https://appleid.apple.com',
    sub: clientId,
  },
  privateKey,
  {
    algorithm: 'ES256',
    keyid: keyId,
  }
);

console.log(token);
