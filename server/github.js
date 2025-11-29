const qs = require('qs'); // eslint-disable-line import/no-extraneous-dependencies
const fetch = require('node-fetch');
const conf = require('./conf');

async function githubToken(clientId, code) {
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: conf.values.githubClientSecret,
    code,
  });

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`GitHub OAuth failed: ${response.status}`);
  }

  const body = await response.text();
  const token = qs.parse(body).access_token;

  if (token) {
    return token;
  }
  throw new Error('No access token in response');
}

exports.githubToken = (req, res) => {
  githubToken(req.query.clientId, req.query.code)
    .then(
      token => res.send(token),
      err => res
        .status(400)
        .send(err ? err.message || err.toString() : 'bad_code'),
    );
};
