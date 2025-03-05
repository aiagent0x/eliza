const CryptoJS = require('crypto-js');

const secretKey = "your-secret-key";


export async function encryptAES(text) {
    return CryptoJS.AES.encrypt(text, secretKey).toString();
}

export async function decryptAES(encryptedText) {
    const bytes = CryptoJS.AES.decrypt(encryptedText, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
}

const message = "Hello, AES!";
const encrypted = encryptAES(message);
console.log("Encrypted:", encrypted);

const decrypted = decryptAES(encrypted);
console.log("Decrypted:", decrypted);