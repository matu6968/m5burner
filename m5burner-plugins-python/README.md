# M5Burner plugins reimplemented in Python

This is a Python based reimplementation of the plugins used in M5Burner which it's use are in making UIFlow/UIFlow2 and TimerCam firmware configurations.

Here are the file specs of each configuration files and how to make them using this reimplementation:

# 1. UIFlow network configuration files:
- 1 byte for SSID length
- SSID bytes
- 1 byte SSID CRC
- 49 bytes padding
- 1 byte for password length
- password bytes
- 1 byte password CRC
- remaining bytes filled with 0xFF

To make a configuration in the Python based reimplementation of the algorithm:

- 1. Make a JSON file as config.json (or any file name) with the content:
```json
{
   "wifi_ssid": "MyNetwork",
   "wifi_password": "MyPassword"
}
```
- Note: Replace the example credentials for WiFi SSID and password with the actual credentials of your WiFi network.

- 2. Execute the config generator script with the following arguments:
```bash
python3 main.py --config-type uiflow --input config.json --output uiflow.cfg # replace config.json with different name if your filename is different
```

You can do also the opposite by coverting UIFlow configuration files back into readable JSON:

- To decode the encoded binary UIFlow configuration, execute the config generator script with the following arguments:
```bash
python3 main.py --config-type uiflow_read --input uiflow.cfg --output config-decoded.json # replace uiflow.cfg with different name if your filename is different
```
# 2. UIFlow2 configuration files:
- CSV file structure that starts with `key,type,encoding,value` and `uiflow,namespace,,` which then has these fields (with the headers):
```csv
key,type,encoding,value
uiflow,namespace,,
server,data,string,<server_url>
ssid0,data,string,<wifi_ssid>
pswd0,data,string,<wifi_password>
ssid1,data,string,
pswd1,data,string,
ssid2,data,string,
pswd2,data,string,
sntp0,data,string,<ntp_server_1>>
sntp1,data,string,<ntp_server_2>
sntp2,data,string,<ntp_server_3>
tz,data,string,<timezone>
boot_option,data,u8,<from_0_to_2>
```
After the official client makes the CSV file, it gets compiled into a NVS binary with the NVS partition size being 24576 (aka around 24 KB).

To make a configuration in the Python based reimplementation of the algorithm:

- 1. Make a JSON file as config.json (or any file name) with the content:
```json
{
    "server": "http://uiflow2.m5stack.com",
    "wifi_networks": [
        {"ssid": "Primary", "password": "pass1"}, 
        {"ssid": "Backup", "password": "pass2"},
        {"ssid": "Emergency", "password": "pass3"}
    ],
    "sntp0": "pool.ntp.org",
    "sntp1": "time.google.com",
    "sntp2": "time.windows.com",
    "timezone": "UTC-8",
    "bootOpt": 1
}
```
- Note: Replace the example credentials for WiFi SSID and password (along with the server and NTP server URL fields if needed and remove any other SSID fields if not needed) with the actual credentials of your WiFi network along with your timezone if it is different.

Also change the bootOpt value to a different number if needed based on this syntax:
- 0 - Run main.py directly, 
- 1 - Show startup menu and network setup, 
- 2 - Only show network setup

- 2. Execute the config generator script with the following arguments:
```bash
python3 main.py --config-type uiflow2_nv --input config.json --output uiflow.cfg # replace config.json with different name if your filename is different
```
- Note: you will need to put the script in the root of nvs_partition_gen utiltites to use it (or modify the script to use a compiled version of nvs_partition_gen compiled using PyInstaller)
- If you decide to use the compiled version of nvs_partition_gen that has the file name as `nvs_partition_gen`, put the compiled version in the root of the script and replace the line in definition `create_uiflow2_nvs_config` from:
```python
subprocess.run(['python', 'nvs_partition_gen.py', 'generate', 
                       str(csv_path), str(output_path), '0x6000'])
```
to:
```python
subprocess.run(['nvs_partition_gen', 'generate', 
                       str(csv_path), str(output_path), '0x6000'])
```

# 3. TimerCam configuration files (all variants):
- serialized JSON,
- a 2‑byte header (which is created to store the length of the JSON string by splitting the length into two bytes).
- CRC checksum (CRC checksum is used over the header and the data buffer to verify integrity of the config)
- fixed-size buffer (0x1000 bytes) by constructing a concatenating the 2‑byte header, the data (JSON string) itself, and additional padding filled with 0xFF bytes with the first byte of that section overwritten by the CRC.

There are a few variants of the TimerCam configuration files which have the same algorithm but different fields so here is a list of the variants that you can make:

- 1. TimerCam basic config:
```json
{
    "mode": "basic",
    "ssid": "MyNetwork",
    "pwd": "MyPassword",
    "wake_time": 30,
    "image_size": 5
}
```
- Note: For this config, replace the example credentials for WiFi SSID and password with the actual credentials of your WiFi network along with setting the `wake_time` and `image_size` accordingly to your needs. Wake time can be from 30 seconds to 15240 seconds, while the resolutions supported for field `image_size` are in a table: 

```
- Resolution range (0-13):
   0: 96x96      1: 160x120    2: 176x144    3: 240x176
   4: 240x240    5: 320x240    6: 400x296    7: 480x320
   8: 640x480    9: 800x600    10: 1024x768  11: 1280x720
   12: 1280x1024 13: 1600x1200
```


- 2. TimerCam SMB config:
```json
{
    "mode": "smb",
    "wifi_ssid": "MyNetwork",
    "wifi_pwd": "MyPassword",
    "smb_host": "192.168.1.100",
    "smb_user": "username",
    "smb_pwd": "password",
    "smb_path": "camera/images",
    "pic_name": "img",
    "size": 14,
    "interval": 5
}
```
- Note: For this config, replace the example credentials for WiFi SSID and password/SMB server with the actual credentials of your WiFi network/SMB server along with setting the `interval`, `image_size`, `folder_path` and `img` accordingly to your needs. Interval is in seconds and does not have a time limit, supported resolutions in field `size` are in a table:

```
- Limited resolution range (8, 11 and 14):
   8: 640x480 11: 1280x720 14: 1920x1080
```

- 3. TimerCam S3 bucket config:
```json
{
    "mode": "s3",
    "wifi_ssid": "MyNetwork",
    "wifi_pwd": "MyPassword",
    "amazon_s3_host": "s3.amazonaws.com",
    "access_key": "aceess-key",
    "secret_access_key": "secret-key",
    "pic_path": "pictures/timercam",
    "pic_name": "img",
    "size": 14,
    "interval": 30
}
```
- Note: For this config, replace the example credentials for WiFi SSID and password/S3 bucket with the actual credentials of your WiFi network/S3 bucket along with setting the `interval`, `size`, `pic_path` and `pic_name` accordingly to your needs. Interval is in seconds and does not have a time limit, while the resolutions supported for field `size` are in a table: 

```
- Limited resolution range (8, 11 and 14):
   8: 640x480 11: 1280x720 14: 1920x1080
```

- 4. TimerCam RTSP stream config:
```json
{
    "mode": "rtsp",
    "wifi_ssid": "MyNetwork",
    "wifi_pwd": "MyPassword",
}
```
- Note: For this config, replace the example credentials for WiFi SSID and password with the actual credentials of your WiFi network.

- 5. TimerCam Aliyun OSS (Object Storage Service) config:
```json
{
    "mode": "aliyun",
    "ssid": "MyNetwork",
    "pwd": "MyPassword",
    "wake_time": 30,
    "image_size": 13,
    "access_key": "access-key",
    "access_key_secret": "secret-key",
    "server_url": "oss-cn-shenzhen.aliyuncs.com",
    "bucket_name": "m5stack-timer-cam"
}
```
- Note: For this config, replace the example credentials for WiFi SSID and password/Aliyun OSS bucket credentials with the actual credentials of your WiFi network/Aliyun OSS bucket credentials along with setting the `wake_time` and `image_size` accordingly to your needs. Wake time can be from 30 seconds to 15240 seconds, while the resolutions supported for field `image_size` are in a table: 

```
- Resolution range (0-13):
   0: 96x96      1: 160x120    2: 176x144    3: 240x176
   4: 240x240    5: 320x240    6: 400x296    7: 480x320
   8: 640x480    9: 800x600    10: 1024x768  11: 1280x720
   12: 1280x1024 13: 1600x1200
```
To make a configuration in the Python based reimplementation of the algorithm:

- 1. Pick a variant of the config from the ones above or from the example files in this folder.
- Note: Replace the example credentials for WiFi SSID and password with the actual credentials of your WiFi network.

- 2. Execute the config generator script with the following arguments for the following variants:
```bash
# for TimerCam basic configuration
python3 main.py --config-type timercam --input config.json --output timercam-basic.cfg # replace config.json with different name if your filename is different
```
```bash
# for TimerCam RTSP configuration
python3 main.py --config-type timercam_rtsp --input config.json --output timercam-rtsp.cfg # replace config.json with different name if your filename is different
```
```bash
# for TimerCam S3 bucket configuration
python3 main.py --config-type timercam_s3 --input config.json --output timercam-s3.cfg # replace config.json with different name if your filename is different
```
```bash
# for TimerCam SMB configuration
python3 main.py --config-type timercam_smb --input config.json --output timercam-smb.cfg # replace config.json with different name if your filename is different
```
```bash
# for TimerCam Aliyun OSS (Object Storage Service) configuration
python3 main.py --config-type timercam_aliyun --input config.json --output timercam-aliyun.cfg # replace config.json with different name if your filename is different
```

# Programatic usage
You can use the API's provided within this program to integrate it directly in your Python program, a sample usage of the API functions is provided as m5burner-plugin-api-sample.py. 
