const { loginAndExtractToken } = require('../services/tokenService');

exports.getToken = async(req, res)=> {
  try {
    const token = await loginAndExtractToken();
    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}