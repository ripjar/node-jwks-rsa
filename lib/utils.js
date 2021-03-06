'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.certToPEM = certToPEM;
exports.rsaPublicKeyToPEM = rsaPublicKeyToPEM;
function certToPEM(cert) {
  cert = cert.match(/.{1,64}/g).join('\n');
  cert = '-----BEGIN CERTIFICATE-----\n' + cert + '\n-----END CERTIFICATE-----\n';
  return cert;
}

function prepadSigned(hexStr) {
  var msb = hexStr[0];
  if (msb < '0' || msb > '7') {
    return '00' + hexStr;
  }
  return hexStr;
}

function toHex(number) {
  var nstr = number.toString(16);
  if (nstr.length % 2) {
    return '0' + nstr;
  }
  return nstr;
}

function encodeLengthHex(n) {
  if (n <= 127) {
    return toHex(n);
  }
  var nHex = toHex(n);
  var lengthOfLengthByte = 128 + nHex.length / 2;
  return toHex(lengthOfLengthByte) + nHex;
}

/*
 * Source: http://stackoverflow.com/questions/18835132/xml-to-pem-in-node-js
 */
function rsaPublicKeyToPEM(modulusB64, exponentB64) {
  var modulus = Buffer.from(modulusB64, 'base64');
  var exponent = Buffer.from(exponentB64, 'base64');
  var modulusHex = prepadSigned(modulus.toString('hex'));
  var exponentHex = prepadSigned(exponent.toString('hex'));
  var modlen = modulusHex.length / 2;
  var explen = exponentHex.length / 2;

  var encodedModlen = encodeLengthHex(modlen);
  var encodedExplen = encodeLengthHex(explen);
  var encodedPubkey = '30' + encodeLengthHex(modlen + explen + encodedModlen.length / 2 + encodedExplen.length / 2 + 2) + '02' + encodedModlen + modulusHex + '02' + encodedExplen + exponentHex;

  var der = Buffer.from(encodedPubkey, 'hex').toString('base64');

  var pem = '-----BEGIN RSA PUBLIC KEY-----\n';
  pem += '' + der.match(/.{1,64}/g).join('\n');
  pem += '\n-----END RSA PUBLIC KEY-----\n';
  return pem;
}