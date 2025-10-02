// utils/encryption.js
const crypto = require("crypto");

const SECRET_KEY = process.env.SECRET_KEY ; // Store in .env in production
const ALGORITHM = "aes-256-cbc";

const encryptId = (id) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY, "utf8"), iv);
  let encrypted = cipher.update(id.toString(), "utf8", "base64");
  encrypted += cipher.final("base64");
  return iv.toString("base64") + ":" + encrypted;
};

const decryptId = (cipherText) => {
  const [ivStr, encryptedData] = cipherText.split(":");
  const iv = Buffer.from(ivStr, "base64");
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY, "utf8"), iv);
  let decrypted = decipher.update(encryptedData, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

module.exports = { encryptId, decryptId };
