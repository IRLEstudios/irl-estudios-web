const { parseCookies, isSessionValid, COOKIE_NAME } = require('./_auth');

module.exports = async (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const valid = isSessionValid(cookies[COOKIE_NAME]);
  res.status(200).json({ authenticated: valid });
};
