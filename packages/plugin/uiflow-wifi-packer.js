const fs = require('fs');
const path = require('path');
const { TMP_DIR } = require('../common/filepath');

const createBinBuffer = function(ssid, pwd) {
  let ssidBuf = Buffer.from(ssid);
  let pwdBuf = Buffer.from(pwd);
  let ssidCRC = crc(ssidBuf);
  let pwdCRC = crc(pwdBuf);
  let buf = Buffer.alloc(100, 0xff);

  buf[0] = ssidBuf.length;
  for(let i = 0; i < ssidBuf.length; i++) {
    buf[i + 1] = ssidBuf[i];
  }
  buf[ssidBuf.length + 1] = ssidCRC;
  buf[50] = pwdBuf.length;
  for(let i = 0; i < pwdBuf.length; i++) {
    buf[i + 50 + 1] = pwdBuf[i];
  }
  buf[50 + pwdBuf.length + 1] = pwdCRC;

  return buf;
}

const crc = function(data) {
  let total = 0;
  for(let i = 0; i < data.length; i++) {
    total += data[i];
  }
  return total & 0xff;
}

const useWifiPacker = function(opts) {
  let buffer = createBinBuffer(opts.ssid, opts.password);
  let dest = path.resolve(TMP_DIR, 'wifi.bin');
  fs.writeFileSync(dest, buffer, { flag: 'w' });
  return [
    opts.address,
    dest
  ];
}

module.exports = {
  useWifiPacker
}
