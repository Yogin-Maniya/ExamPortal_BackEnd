// backend/utils/encryption.js
const CryptoJS = require("crypto-js");
const SECRET_KEY = process.env.SECRET_KEY;

const encryptId = (id) => {
  return CryptoJS.AES.encrypt(id.toString(), SECRET_KEY).toString();
};

const decryptId = (cipher) => {
  const bytes = CryptoJS.AES.decrypt(cipher, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

module.exports = { encryptId, decryptId };
