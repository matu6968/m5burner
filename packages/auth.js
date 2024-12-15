const { ipcMain } = require('electron')
const axios = require('axios')
const IPC_EVENT = require('./ipcEvent')

const HOST = 'https://uiflow2.m5stack.com'

const getToken = (cookieStr) => {
  let arr = cookieStr.split('; ')
  return arr.filter(text => text.includes('m5_auth_token='))[0].replace('m5_auth_token=', '')
}

const login = (email, password) => {
  return new Promise((resolve, reject) => {
    axios.default({
      url: `${HOST}/api/v1/account/login`,
      method: 'POST',
      data: {
        email: email,
        password: password
      }
    })
      .then(res => {
        if(res.status === 200 && res.headers['set-cookie']) {
          let m5tokenRaw = res.headers['set-cookie'].filter(cookie => cookie.includes('m5_auth_token='))
          if(m5tokenRaw.length > 0) {
            let token = getToken(m5tokenRaw[0])
            resolve({
              token,
              username: res.data.data.username
            })
            return
          }
          resolve(false)
          return
        }
        resolve(false)
      })
      .catch(err => {
        console.log(err.message)
        resolve(false)
      })
  })
}

const validateLoginState = (ssoToken) => {
  return new Promise((resolve, reject) => {
    axios.default({
      url: `${HOST}/api/v1/device/list`,
      method: 'GET',
      headers: {
        'Cookie': `m5_auth_token=${ssoToken}`
      }
    })
      .then(res => {
        if(res.status === 200) {
          resolve(res.data.data)
        } else {
          resolve(false)
        }
      })
      .catch(err => {
        resolve(false)
      })
  })
}

const logout = () => {

}

function bindUserAuthEvents() {
  ipcMain.on(IPC_EVENT.IPC_LOGIN, async (event, args) => {
    let retry = 0
    let data = await login(args.email, args.password)

    while(data === false && retry < 3) {
      data = await login(args.email, args.password)
      retry++
      console.log('[INFO] Login retry:' + retry)
    }

    if(data !== false) {
      event.sender.send(IPC_EVENT.IPC_LOGIN, {
        status: 0,
        data: {
          token: data.token,
          username: data.username,
          email: args.email,
          password: args.password
        }
      })
    } else {
      event.sender.send(IPC_EVENT.IPC_LOGIN, {
        status: -1,
        error: 'Login failed',
        data: {}
      })
    }
  })

  ipcMain.on(IPC_EVENT.IPC_GET_LOGIN_STATUS, async (event, args) => {
    let data = await validateLoginState(args.token)
    if(data !== false) {
      event.sender.send(IPC_EVENT.IPC_GET_LOGIN_STATUS, {
        status: 0,
        data: data
      })
    } else {
      event.sender.send(IPC_EVENT.IPC_GET_LOGIN_STATUS, {
        status: -1,
        error: 'Unauthorized',
        data: {}
      })
    }
  })
}

module.exports = {
  login,
  logout,
  validateLoginState,
  bindUserAuthEvents
}
