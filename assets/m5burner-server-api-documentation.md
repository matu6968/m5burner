# M5Burner (Electron based app) API documentation
### Note: The base of the API documentation was done with a help by an AI, so some notes could be inaccurate and certain reponses will be missing.
The endpoints in the app have activities such as user authentication, firmware listing and publishing, comment management, firmware sharing, device binding, and media token retrieval. These endpoints are in different URL's depending on the action (typical for social apps, for example firmware CDN is under http://m5burner-api-fc-hk-cdn.m5stack.com, but account server is under https://uiflow2.m5stack.com)

You can use these endpoints from another client (for example, a web client or a standalone script) by sending HTTP requests with the appropriate method, headers, and payload based off the schema below.

---

## 1. Authentication & Account Endpoints

### Login

- **URL:**  
  `POST https://uiflow2.m5stack.com/api/v1/account/login`

- **Payload Example (JSON):**
  ```json
  {
    "email": "your.email@example.com",
    "password": "your_password"
  }
  ```

-  **Response if server successfully authenticates the user credentials (JSON):**
   ```json
   {
     "code": 200,
     "data": {
       "username": "mateusz6768",
       "avatar": "/assets/uploads/profile/uid-228999/228999-profileavatar-1738866651678.png"
     }
   }
   ```
 
- **Notes:**  
  - On successful login, the server returns a status code of 200 and sets a cookie (named `m5_auth_token`) in the response headers (like this: `Set-Cookie: m5_auth_token=********************************; expires=Tue, 06 May 2025 18:10:22 GMT; path=/`. In subsequent requests, include this cookie for authenticated operations.  
  - If the user decides to set a profile picture (under the avatar JSON object response, which makes the field not a empty value), to obtain the set image you will need another GET request under the endpoint (https://community.m5stack.com) like this: https://community.m5stack.com/assets/uploads/profile/uid-228999/228999-profileavatar-1738866651678.png

-  **Response if server fails to authenticate the user credentials (JSON):**
   ```json
   {
     "code": 401,
     "data": {}
   }
   ```
 
- **Notes:**  
  - Even on failed user login, the server will still set a cookie though an invalid one (named `m5_auth_token`) in the response headers (like this: `Set-Cookie: m5_auth_token=********************************; expires=Tue, 06 May 2025 18:10:22 GMT; path=/`).
  - Due to caching of the requests, sometimes a 401 status code will be present when the login credentials are correct, but don't panic as it gets resolved within another few requests (if you are doing the login flow make it retry a few times if the first time fails, the M5Burner stock client does 4 repeat requests if the first request fails and then times out after the last attempt.)

- **URL:**  
  `GET https://uiflow2.m5stack.com/api/v1/device/list`

- **Headers:**
  ```
  Cookie: m5_auth_token=<your_token_here>
  ```
-  **Response if server successfully verifies the login token (JSON):**
   ```json
   {
     "code": 200,
     "data": []
   }
   ```
-  **Response if server fails to verify the login token (JSON):**
   ```json
   {
	"code": 400,
	"data": {
	  "message": "UnAuthorization"
	}
   }
   ```

- **Notes:**  
  This endpoint is used to verify that the login is still valid and to retrieve information about the user’s devices.

---

## 2. Firmware Endpoints

### Get Firmware List

- **URL:**  
  `GET http://m5burner-api-fc-hk-cdn.m5stack.com/api/firmware`

-  **Response: (example for one entry response, JSON, 200 status code):**
   ```json
   [
	{
		"_id": "64f06eac252d5fad136699d2",
		"fid": "39d70217ff0b53c368b0efbfbf2a11af",
		"name": "UIFlow2.0 StickC Plus2",
		"description": "For stickc plus2",
		"cover": "8eed02eeeb45f7739b530d59748533f0.png",
		"category": "stickc",
		"tags": [],
		"author": "M5Stack",
		"github": "",
		"download": 24247,
		"versions": [
			{
				"version": "Alpha-29",
				"published_at": "2024-01-05",
				"file": "53171c00bfb62d80631632142e386be6.bin",
				"published": true,
				"change_log": ""
			},
			{
				"version": "v2.0.3",
				"published_at": "2024-03-21",
				"file": "c471996ea41283fd683dc728c711e484.bin",
				"published": true,
				"change_log": ""
			},
			{
				"version": "v2.0.4",
				"published_at": "2024-04-18",
				"file": "98a2947fa5677f8c466f4e7c2c55b8049dbda92451b11bf6ec88a3f30f22c835file",
				"published": true,
				"change_log": ""
			},
			{
				"version": "v2.0.5",
				"published_at": "2024-05-11",
				"file": "52aff2c6a63b122924070090007360b5.bin",
				"published": true,
				"change_log": ""
			},
			{
				"version": "v2.0.6",
				"published_at": "2024-05-24",
				"file": "bb5f0f979ca973f7ac1c8c9c9cde2dd7.bin",
				"published": true,
				"change_log": ""
			},
			{
				"version": "v2.0.7",
				"published_at": "2024-06-06",
				"file": "a80cabde2141293e029cd21aa1289de2.bin",
				"published": true,
				"change_log": ""
			},
			{
				"version": "v2.0.8",
				"published_at": "2024-06-21",
				"file": "4873f076a5190e7fb121b470d65e84fd.bin",
				"published": true,
				"change_log": ""
			},
			{
				"version": "v2.0.9",
				"published_at": "2024-07-04",
				"file": "b76f961c48ee991b195ca3c0814b7532.bin",
				"published": true,
				"change_log": ""
			},
			{
				"version": "v2.1.0",
				"published_at": "2024-07-18",
				"file": "e1f30a44e9c3b7cf771f543d437a9e04.bin",
				"published": true,
				"change_log": ""
			},
			{
				"version": "v2.1.1",
				"published_at": "2024-08-01",
				"file": "3d6d92b7981b00dac0e26fd50e4ef14f.bin",
				"published": true,
				"change_log": ""
			},
			{
				"version": "v2.1.2",
				"published_at": "2024-08-16",
				"file": "45b185a12e18ce2b8fc18135b370c157.bin",
				"published": true,
				"change_log": ""
			},
			{
				"version": "v2.1.3",
				"published_at": "2024-08-29",
				"file": "badb2858eadba71eb340041078e6f244.bin",
				"published": true,
				"change_log": ""
			},
			{
				"version": "v2.1.4",
				"published_at": "2024-09-13",
				"file": "576b41c608bf1b6f99477a46c2075e11.bin",
				"published": true,
				"change_log": ""
			},
			{
				"version": "v2.1.5",
				"published_at": "2024-09-30",
				"file": "5cd48bd7a01f7ebfbdbe2d49fd518165.bin",
				"published": true,
				"change_log": ""
			},
			{
				"version": "v2.1.6",
				"published_at": "2024-10-18",
				"file": "79c0ba63584a176efb6c782b60075ebc.bin",
				"published": true,
				"change_log": ""
			},
			{
				"version": "v2.1.6-hotfix",
				"published_at": "2024-10-25",
				"file": "5ceaabde1d8bbc81d6e532df21c61026.bin",
				"published": true,
				"change_log": ""
			},
			{
				"version": "v2.1.7",
				"published_at": "2024-11-01",
				"file": "471bc3385420288d64c72ce97dac4026.bin",
				"published": true,
				"change_log": ""
			},
			{
				"version": "v2.1.8",
				"published_at": "2024-11-21",
				"file": "a063bd3ed8759c72fe2189a9a3a373fa.bin",
				"published": true,
				"change_log": ""
			},
			{
				"version": "v2.1.8-hotfix",
				"published_at": "2024-11-29",
				"file": "3fc38887e3560fe35720d0da0fdf152d.bin",
				"published": true,
				"change_log": ""
			},
			{
				"version": "v2.1.9",
				"published_at": "2024-12-11",
				"file": "cdad9f0932be28062f7e1b95fffbe13f.bin",
				"published": true,
				"change_log": ""
			},
			{
				"version": "v2.2.0",
				"published_at": "2024-12-20",
				"file": "0b6f851bf2f94c9fd8d90552bae6ed51.bin",
				"published": true,
				"change_log": ""
			},
			{
				"version": "v2.2.1-rc1",
				"published_at": "2025-01-17",
				"file": "46d4467878b3aba2a0122beb283521b6.bin",
				"published": true,
				"change_log": ""
			},
			{
				"version": "v2.2.1",
				"published_at": "2025-01-18",
				"file": "827ab5ee1a59dc2ae710f6a5fd73d53f.bin",
				"published": true,
				"change_log": ""
			}
		],
		"network": "required",
		"odevice": true
	}
   ]
   ```

- **Notes:**  
  This endpoint returns a list of available firmware packages in JSON format.

### Cover image Endpoints

### Get Cover images based off the `cover` JSON object:

- **URL:**  
  `GET http://m5burner.m5stack.com/cover/<cover_json_field>`

- **Notes:**  
  If a cover image is not found it will not return JSON, but a XML-RPC response with a NoSuchKey error and a 404 status code error

### Admin (Publishing & Managing Firmwares)

The base URL for admin-related firmware operations is set using a variable in the client (often referenced as `wn_apiBaseUrl` in the code). Although its value is not hard-coded in the snippet, the path segments follow these patterns (you can replace `wn_apiBaseurl with http://m5burner-api.m5stack.com for communicating with the given endpoints below):

- **Publish New Firmware (Create):**  
  **URL:**  
  `POST {wn_apiBaseUrl}/api/admin/firmware`

  - **Headers:**
    ```
    m5_auth_token: <your_token_here>
    ```
  - **Payload Example:**
  ```
  Multi-part body:
  name: My new firmware
  description: Description for my new firmware
  cover: <attach_file_image_binary>
  category: core
  author: Your Name # typically the username defined in the account, unsure if you can put any string there
  version: 1.0.0
  github: https://github.com/matu6968/m5burner
  firmware: <attach_file_firmware_binary>
  ```
-  **Response if server successfully uploads the desired firmware (JSON, 200 response):**
   ```json
   {
     "uid": 123456,
     "fid": "********************************",
     "name": "My new firmware",
     "description": "Description for my new firmware",
     "author": "Your name",
     "category": "core",
     "github": "https://github.com/matu6968/m5burner",
     "cover": "9e6dd0877c32ac7c8fdae3439ac71d90.png",
     "versions": [
       {
         "version": "1.0.0",
         "published_at": "2025-02-07",
         "file": "ab5809076be8ea68d58c55868695b966.bin",
         "published": false,
         "change_log": ""
       }
     ]
   }
   ```
- **Notes:**  
  - The category field can be any of one of those entries: `core`, `core2 & tough`, `cores3`, `stickc`, `stickv & unity`, `t-lite`, `atom`, `atoms3`, `timercam`, `paper`, `coreink`, `stamp`, `stamps3`, `capsule`, `dial`, `airq`, `cardputer`, `dinmeter`, `nanoc6`, `station`

- **Update Existing Firmware:**  
  **URL:**  
  `PUT {wn_apiBaseUrl}/api/admin/firmware/{firmwareId}/version/{version}`

  - **Headers:**
    ```
    m5_auth_token: <your_token_here>
    ```
  - **Payload Example:**
  ```
  Multi-part body:
  name: My updated firmware
  description: Description for my updated firmware
  cover: <attach_file_image_binary>
  category: core
  author: Your Name # typically the username defined in the account, unsure if you can put any string there
  version: 1.0.1
  github: https://github.com/matu6968/m5burner
  firmware: <attach_file_firmware_binary>
  ```

-  **Response if the server successfully applies the update (JSON):**
   ```json
   {
     "status": 1,
     "message": "success"
   }
   ```
- **Get Own Firmware (by Username):**  
  **URL:**  
  `GET {wn_apiBaseUrl}/api/admin/firmware`

  - **Headers:**
    ```
    m5_auth_token: <your_token_here>
    ```
-  **Response if server successfully gets the desired uploaded firmware images (JSON):**
   ```json
   {
     "_id": "************************",
     "uid": 123456,
     "fid": "********************************",
     "name": "My new firmware",
     "description": "Description for my new firmware",
     "author": "Your name",
     "category": "core",
     "github": "https://github.com/matu6968/m5burner",
     "cover": "9e6dd0877c32ac7c8fdae3439ac71d90.png",
     "versions": [
       {
         "version": "1.0.0",
         "published_at": "2025-02-07",
         "file": "ab5809076be8ea68d58c55868695b966.bin",
         "published": false,
         "change_log": ""
       }
     ]
   }
   ```

- **Remove Firmware:**  
  **URL:**  
  `POST {wn_apiBaseUrl}/api/admin/firmware/remove/{firmwareId}`

    - **Headers:**
    ```
    m5_auth_token: <your_token_here>
    ```

  **Payload Example:**
  ```json
  {
    "version": "the_version_to_remove"
  }
  ```

- **Publish/Unpublish Firmware:**  
  **Publish:**  
  `PUT {wn_apiBaseUrl}/api/admin/firmware/{firmwareId}/publish/{version}/1`  
  **Unpublish:**  
  `PUT {wn_apiBaseUrl}/api/admin/firmware/{firmwareId}/publish/{version}/0`

  - **Headers:**
    ```
    m5_auth_token: <your_token_here>
    ```
-  **Response if the server successfully publishes/unpublishes the firmware (JSON):**
   ```json
   {
     "status": 1,
     "message": "success"
   }
   ```

-  **If unpublishing fails (400 status code):**
  ```json
  {
    "error": "Error",
    "errMsg": "Unpublish firmware failed."
  }
  ```

-  **If publishing fails (400 status code):**
  ```json
  {
    "error": "Error",
    "errMsg": "Publish firmware failed."
  }
  ```
- **Get Share Code for a Firmware:**  
  **URL:**  
  `POST {wn_apiBaseUrl}/api/admin/firmware/share/{firmwareId}/{firmwareFile}`

  - **Headers:**
    ```
    m5_auth_token: <your_token_here>
    ```
-  **Response if server successfully obtains a share code (JSON):**
   ```json
   {
     "status": 1,
     "data": {
       "code": "***************"
     }
   }
   ```
-  **Response if invalid fid field is requested (JSON, 400 status code):**
   ```
   Cannot POST /api/admin/firmware/share/{firmwareId}
   ```
- **Revoke a Share Code:**  
  **URL:**  
  `PUT {wn_apiBaseUrl}/api/admin/firmware/share/{shareId}`

  - **Headers:**
    ```
    m5_auth_token: <your_token_here>
    ```
-  **Response if server successfully obtains revokes the old share code and gives a new share code (JSON):**
   ```json
   {
     "status": 1,
     "data": {
       "code": "***************"
     }
   }
   ```

-  **Response if you put no share code and the server successfully responds (JSON):**
   ```json
   {
     "status": 1,
     "message": "success"
   }
   ```
-  **General admin response with 401 status code if no token/invalid token was provided during those requests (JSON):**
   ```json
   {
     "error": "Unauthorized",
     "errMsg": "Please log in"
   }
   ```
---

## 3. Comment Endpoints

### Get Comments (All Firmwares)

- **URL:**  
  `GET {wn_apiBaseUrl}/api/firmware/comments`

- **Response: (shortened example)**
  ```json
  [
    {
       "count": 1,
       "fid": "97d813e872846404858ef7ab4de97663"
    },
    {
       "count": 1,
       "fid": "f4d539999ec4200ae81c11154c89b81e"
    }
  ]

### Get Comments for a Specific Firmware

- **URL:**  
  `GET {wn_apiBaseUrl}/api/firmware/comment/{firmwareId}`

- **Response:**
  ```json
  {
    "total": 1,
    "data": [
      {
        "content": "M5 software is garbage  - nothing works properly\nAWS S3 doesn't work\nUploading to m5 cloud doesnt work! \nTerrible service ",
        "datetime": 1695248479994,
        "user": "M5User-54513"
      }
    ]
  }
  ```
### Post a Comment

- **URL:**  
  `POST {wn_apiBaseUrl}/api/firmware/comment/{firmwareId}`

  - **Headers:**
    ```
    m5_auth_token: <your_token_here>
    ```

- **Payload Example:**
  ```json
  {
    "content": "Your comment text",
    "user": "your_username"
  }
  ```

- **Response if successfully posted a comment:**
  ```json
  {
    "status": 0,
    "data": {}
  }
  ```

- **Response if failed m5_auth_token (auth token) is invalid with a 401 status code:**
   ```json
   {
     "error": "Unauthorized",
     "errMsg": "Please log in"
   }
   ```
---

## 4. Firmware Share Endpoints

### Retrieve Firmware File Information via Share Code

- **URL:**  
  `GET http://m5burner-api.m5stack.com/api/firmware/share/{shareCode}`

- **Notes:**  
  - This endpoint looks up the firmware file associated with a given share code. If the share code is valid, you will receive a response like this:
  ```json
  {
    "status": 1,
    "data": {
      "file": "ab5809076be8ea68d58c55868695b966.bin"
    }
  }
  ```
  - If the share code is invalid, you will receive this response:
  ```json
  {
    "error": "Not found",
    "errMsg": "Invalid share code."
  }
  ```
### Download Firmware File

- **URL Format:**  
  `GET https://m5burner.oss-cn-shenzhen.aliyuncs.com/firmware/{filename}?v={timestamp}`

- **Notes:**  
  The client app downloads the firmware file (if not already present locally) using this URL. The query parameter (`v`) can be used for cache busting.

---

## 5. Device Management Endpoints

All device-related endpoints (except the old device registry) use the same host defined in the authentication section.

### Check Device Binding (New Format)

- **URL:**  
  `GET https://uiflow2.m5stack.com/api/v1/device/{mac}/binding`

- **Notes:**  
  Replace `{mac}` with the device’s MAC address.

### Check Old Device Binding

- **URL:**  
  `GET https://uiflow2.m5stack.com/m5stack/api/v2/device/getDeviceType?mac={mac}`

- **Headers:**  
  ```
  Cookie: token=<ssoToken>
  ```

### Register an Old Device

- **URL:**  
  `POST https://m5stack-factory-tool.m5stack.com/record/old`

- **Headers:**
  ```
  Authorization: Basic bTVzdGFjay5tNWJ1cm5lcjpyZWdpc3RyeQ==
  Content-Type: application/x-www-form-urlencoded
  ```

- **Payload Example (URL Encoded):**
  ```
  mac=<mac_address>&type=<device_type>
  ```

### Bind a Device

- **URL:**  
  `POST https://uiflow2.m5stack.com/api/v1/device/register`

- **Headers:**
  ```
  Cookie: m5_auth_token=<your_token_here>
  ```

- **Payload Example (JSON):**
  ```json
  {
    "name": "Device Name",
    "mac": "DEVICE_MAC_ADDRESS",
    "public": true
  }
  ```

### Unbind a Device

- **URL:**  
  `POST https://uiflow2.m5stack.com/api/v1/device/unregister`

- **Headers:**
  ```
  Cookie: m5_auth_token=<your_token_here>
  ```

- **Payload Example:**
  ```json
  {
    "mac": "DEVICE_MAC_ADDRESS"
  }
  ```

### Update a Device

- **URL:**  
  `POST https://uiflow2.m5stack.com/api/v1/device/update`

- **Headers:**
  ```
  Cookie: m5_auth_token=<your_token_here>
  ```

- **Payload Example:**
  ```json
  {
    "name": "New Device Name",
    "mac": "DEVICE_MAC_ADDRESS",
    "public": false
  }
  ```

---

## 6. Media Token Endpoint

### Request a Media Token

- **URL:**  
  `POST http://flow.m5stack.com:5003/token`

- **Payload Example (JSON):**
  ```json
  {
    "mac": "DEVICE_MAC_ADDRESS"
  }
  ```

- **Notes:**  
  This endpoint is used within the media token functionality of the app. It sends a device MAC to retrieve an associated token.

---

## Example Usage with curl

### Logging In
```bash
curl -X POST "https://uiflow2.m5stack.com/api/v1/account/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your.email@example.com",
    "password": "your_password"
  }' -c cookies.txt
```
*This command saves the cookie to “cookies.txt” for future requests.*

### Fetching the Firmware List
```bash
curl -X GET "http://m5burner-api-fc-hk-cdn.m5stack.com/api/firmware"
```

### Posting a Comment
```bash
curl -X POST "http://{wn_apiBaseUrl}/api/firmware/comment/12345" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Great firmware update!",
    "user": "your_username"
  }'
```

### Checking Device Binding
```bash
curl -X GET "https://uiflow2.m5stack.com/api/v1/device/AA11BB22CC33/binding"
```

### Requesting a Media Token
```bash
curl -X POST "http://flow.m5stack.com:5003/token" \
  -H "Content-Type: application/json" \
  -d '{
    "mac": "AA11BB22CC33"
  }'
```

---

## Tips when using these endpoints in another client

When integrating these API calls into another client (for example, in a Node.js application using Axios or in a web client using `fetch`), follow these guidelines:

1. **Authentication:**  
   – Send the login request and capture the returned authentication token (usually via cookies).  
   – For subsequent requests (like device binding or publishing firmware), include the cookie header (`m5_auth_token`) or any token provided.

2. **Headers and Content-Type:**  
   – Use `Content-Type: application/json` for JSON payloads.  
   – For form-encoded requests (like registering an old device), set `Content-Type: application/x-www-form-urlencoded`.

3. **Base URLs:**  
   – Note that some endpoints use a fixed URL (for example, the firmware list or share endpoints), whereas admin-related firmware endpoints use a base URL variable (denoted as `{wn_apiBaseUrl}`). Ensure this value is set correctly in your client application.

4. **Error Handling:**  
   – Check for status codes (e.g., 200 for success).  
   – Parse error messages from the response if the status is not as expected.

5. **Caching and Versioning:**  
   – Notice the use of timestamp query parameters in file download URLs (e.g., `...?v=timestamp`) to bypass caches during downloads.

---