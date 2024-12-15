const { ipcMain } = require('electron')
const axios = require('axios')
const IPC_EVENT = require('./ipcEvent')
const { getMac } = require('./serialport/tool')

const HOST = 'https://uiflow2.m5stack.com'
const REGISTRY_URL = 'https://m5stack-factory-tool.m5stack.com/record/old'

const checkDevice = ({port}) => {
  return new Promise(resolve => {
    getMac(port).then(result => {
      if(result.status === 'ok') {
        axios.default({
          url: `${HOST}/api/v1/device/${result.data}/binding`,
          method: 'GET'
        })
          .then(r => {
            if(r.status === 200) {
              resolve({status: 'ok', data: {...r.data.data, mac: result.data}})
              return
            }
            resolve({status: 'fail', message: 'Request errors'})
          })
          .catch(e =>{
            if(e.response && e.response.data) {
              resolve({status: 'fail', message: e.response.data.data.message})
              return
            }
            resolve({status: 'fail', message: 'Unknown errors'})
          })
      } else {
        resolve({status: 'fail', message: 'Get mac failed'})
      }
    })
  })
}

const checkOldDevice = ({port, ssoToken}) => {
  return new Promise(resolve => {
    getMac(port).then(result => {
      if(result.status === 'ok') {
        axios.default({
          url: `${HOST}/m5stack/api/v2/device/getDeviceType?mac=${result.data}`,
          method: 'GET',
          headers: {
            'Cookie': `token=${ssoToken}`
          }
        })
          .then(r => {
            if(r.status === 200) {
              console.log(r.data)
              if(r.data.code === 200) {
                if(r.data.data !== null) {
                  resolve({status: 'ok', data: 'exist', mac: result.data})
                } else {
                  resolve({status: 'ok', data: 'not exist', mac: result.data})
                }
              }
            }
            resolve({status: 'fail', message: 'Request errors'})
          })
          .catch(e => {
            resolve({status: 'fail', message: e.message})
          })
      } else {
        resolve({status: 'fail', message: 'Get mac failed'})
      }
    })
  })
}

const registryOldDevice = ({mac, type}) => {
  return new Promise(resolve => {
    axios.default({
      url: `${REGISTRY_URL}`,
      method: 'POST',
      headers: {
        'Authorization': 'Basic bTVzdGFjay5tNWJ1cm5lcjpyZWdpc3RyeQ==',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: `mac=${mac}&type=${type}`
    })
      .then(r => {
        if(r.status === 200) {
          resolve({status: 'ok', data: ''})
        }
      })
      .catch(r => {
        if(r.response.status === 400) {
          resolve({status: 'fail', data: 'The device already exists.'})
        } else {
          resolve({status: 'fail', data: 'Request errors'})
        }
      })
  })
}

const bindDevice = ({ssoToken, name, mac, public}) => {
  return new Promise(resolve => {
    axios.default({
      url: `${HOST}/api/v1/device/register`,
      method: 'POST',
      headers: {
        'Cookie': `m5_auth_token=${ssoToken}`
      },
      data: {
        name,
        mac,
        public
      }
    })
      .then(r => {
        if(r.status === 200) {
          resolve({status: 'ok'})
          return
        }
        resolve({status: 'fail', message: r.data.message})
      })
      .catch(e => {
        console.log(e.message)
        resolve({status: 'fail', message: e.message})
      })
  })
}

const unbindDevice = ({ssoToken, mac}) => {
  return new Promise(resolve => {
   axios.default({
     url: `${HOST}/api/v1/device/unregister`,
     method: 'POST',
     headers: {
       'Cookie': `m5_auth_token=${ssoToken}`
     },
     data: {
       mac
     }
   })
     .then(r => {
       if(r.status === 200) {
         resolve({status: 'ok'})
         return
       }
       resolve({status: 'fail', message: ''})
     })
     .catch(e => {
       console.log(e.message)
       resolve({statue: 'fail', message: e.message})
     })
  })
}

const updateDevice = ({ssoToken, mac, name, public}) => {
  return new Promise(resolve => {
    axios.default({
      url: `${HOST}/api/v1/device/update`,
      method: 'POST',
      headers: {
        'Cookie': `m5_auth_token=${ssoToken}`
      },
      data: {
        name,
        mac,
        public
      }
    })
      .then(r => {
        if(r.status === 200) {
          resolve({status: 'ok'})
          return
        }
        resolve({status: 'fail', message: ''})
      })
      .catch(e => {
        console.log(e.message)
        resolve({status: 'fail'})
      })
  })
}

function bindDeviceEvents() {
  ipcMain.on(IPC_EVENT.IPC_OLD_DEVICE_CHECK_BINDING, (event, args) => {
    checkOldDevice(args).then(r => event.sender.send(IPC_EVENT.IPC_OLD_DEVICE_CHECK_BINDING, r))
  })

  ipcMain.on(IPC_EVENT.IPC_REGISTRY_OLD_DEVICE, (event, args) => {
    registryOldDevice(args).then(r => event.sender.send(IPC_EVENT.IPC_REGISTRY_OLD_DEVICE, r))
  })

  ipcMain.on(IPC_EVENT.IPC_DEVICE_CHECK_BINDING, (event, args) => {
    checkDevice(args).then(r => event.sender.send(IPC_EVENT.IPC_DEVICE_CHECK_BINDING, r))
  })

  ipcMain.on(IPC_EVENT.IPC_DEVICE_BINDING, (event, args) => {
    bindDevice(args).then(r => event.sender.send(IPC_EVENT.IPC_DEVICE_BINDING, r))
  })

  ipcMain.on(IPC_EVENT.IPC_DEVICE_UNBINDING, (event, args) => {
    unbindDevice(args).then(r => event.sender.send(IPC_EVENT.IPC_DEVICE_UNBINDING, r))
  })

  ipcMain.on(IPC_EVENT.IPC_DEVICE_UPDATE, (event, args) => {
    updateDevice(args).then(r => event.sender.send(IPC_EVENT.IPC_DEVICE_UPDATE, r))
  })
}

module.exports = {
  bindDeviceEvents
}
