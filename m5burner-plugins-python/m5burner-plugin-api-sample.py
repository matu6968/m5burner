#!/usr/bin/env python3

from main import ConfigGenerator
import json

def main():
    # Initialize the generator
    config_gen = ConfigGenerator(tmp_dir="output")

    # Example 1: Basic TimerCam Configuration
    basic_config = {
        'mode': 'basic',
        'ssid': 'MyWiFi',
        'pwd': 'MyPassword',
        'wake_time': 30,
        'image_size': 5  # 320x240
    }
    addr, path = config_gen.create_timercam_config(basic_config, "output/timercam-basic.cfg")
    print(f"Basic TimerCam config created at: {path} (address: {addr})")

    # Example 2: SMB TimerCam Configuration
    smb_config = {
        'mode': 'smb',
        'wifi_ssid': 'MyWiFi',
        'wifi_pwd': 'MyPassword',
        'smb_host': '192.168.1.100',
        'smb_user': 'username',
        'smb_pwd': 'password',
        'smb_path': 'camera/images',
        'pic_name': 'img',
        'size': 14,  # 1920x1080
        'interval': 5
    }
    addr, path = config_gen.create_timercam_config(smb_config, "output/timercam-smb.cfg")
    print(f"SMB TimerCam config created at: {path} (address: {addr})")

    # Example 3: S3 TimerCam Configuration
    s3_config = {
        'mode': 's3',
        'wifi_ssid': 'MyWiFi',
        'wifi_pwd': 'MyPassword',
        'amazon_s3_host': 'https://my-bucket.s3.amazonaws.com',
        'access_key': 'MY_ACCESS_KEY',
        'secret_access_key': 'MY_SECRET_KEY',
        'pic_path': 'camera/',
        'pic_name': 'image',
        'size': 11,  # 1280x720
        'interval': 60
    }
    addr, path = config_gen.create_timercam_config(s3_config, "output/timercam-s3.cfg")
    print(f"S3 TimerCam config created at: {path} (address: {addr})")

    # Example 4: RTSP TimerCam Configuration
    rtsp_config = {
        'mode': 'rtsp',
        'wifi_ssid': 'MyWiFi',
        'wifi_pwd': 'MyPassword'
    }
    addr, path = config_gen.create_timercam_config(rtsp_config, "output/timercam-rtsp.cfg")
    print(f"RTSP TimerCam config created at: {path} (address: {addr})")

    # Example 5: Aliyun TimerCam Configuration
    aliyun_config = {
        'mode': 'aliyun',
        'ssid': 'MyWiFi',
        'pwd': 'MyPassword',
        'wake_time': 30,
        'image_size': 13,  # 1600x1200
        'access_key': 'ALIYUN_ACCESS_KEY',
        'access_key_secret': 'ALIYUN_SECRET_KEY',
        'server_url': 'oss-cn.example.com',
        'bucket_name': 'my-bucket'
    }
    addr, path = config_gen.create_timercam_config(aliyun_config, "output/timercam-aliyun.cfg")
    print(f"Aliyun TimerCam config created at: {path} (address: {addr})")

    # Example 6: UIFlow WiFi Configuration
    uiflow_config = {
        'wifi_ssid': 'MyWiFi',
        'wifi_password': 'MyPassword'
    }
    path = config_gen.create_uiflow_config(uiflow_config, "output/uiflow.cfg")
    print(f"UIFlow config created at: {path}")

    # Example 7: UIFlow2 NVS Configuration with multiple networks
    uiflow2_config = {
        'server': 'http://uiflow2.m5stack.com',
        'wifi_networks': [
            {'ssid': 'PrimaryWiFi', 'password': 'PrimaryPass'},
            {'ssid': 'BackupWiFi', 'password': 'BackupPass'}
        ],
        'sntp0': 'pool.ntp.org',
        'sntp1': 'time.google.com',
        'sntp2': 'time.windows.com',
        'timezone': 'UTC-8',
        'bootOpt': 1
    }
    addr, path = config_gen.create_uiflow2_nvs_config(uiflow2_config, "output/uiflow2.bin")
    print(f"UIFlow2 NVS config created at: {path} (address: {addr})")

    # Example 8: UIFlow2 NVS Configuration with multiple networks and combined base firmware image
    # Note: This requires the firmware image to be present under output/uiflow2-base.bin before running this example
    uiflow2_config = {
        'server': 'http://uiflow2.m5stack.com',
        'wifi_networks': [
            {'ssid': 'PrimaryWiFi', 'password': 'PrimaryPass'},
            {'ssid': 'BackupWiFi', 'password': 'BackupPass'}
        ],
        'sntp0': 'pool.ntp.org',
        'sntp1': 'time.google.com',
        'sntp2': 'time.windows.com',
        'timezone': 'UTC-8',
        'bootOpt': 1
    }
    addr, path = config_gen.create_uiflow2_nvs_config(
        uiflow2_config, 
        firmware_path="output/uiflow2-base.bin", 
        output_path="output/uiflow2-combined.bin"
    )
    print(f"UIFlow2 combined image created at: {path} (address: {addr})")

    # Example 9: Read UIFlow Configuration
    try:
        config = config_gen.read_uiflow_config("output/uiflow.cfg")
        print("Read UIFlow config:", json.dumps(config, indent=2))
    except Exception as e:
        print(f"Error reading UIFlow config: {e}")

    # Example 10: Create OpenAI NVS Configuration
    openai_config = {
        'wifi_ssid': 'MyWiFi',
        'wifi_password': 'MyPassword',
        'openai_key': 'sk-your-openai-api-key-here'
    }
    addr, path = config_gen.create_openai_nvs_config(openai_config, "output/openai.bin")
    print(f"OpenAI NVS config created at: {path} (address: {addr})")

    # Example 11: Create OpenAI Vision NVS Configuration
    openai_vision_config = {
        'wifi_ssid': 'MyWiFi',
        'wifi_password': 'MyPassword',
        'openai_key': 'sk-your-openai-api-key-here',
        'language': 'en'
    }
    addr, path = config_gen.create_openai_vision_nvs_config(openai_vision_config, "output/openai-vision.bin")
    print(f"OpenAI Vision NVS config created at: {path} (address: {addr})")

    # Example 12: Create StamPLC NVS Configuration
    stamplc_config = {
        'wifi_ssid': 'MyWiFi',
        'wifi_password': 'MyPassword',
        'ufusr': 'MyUsername',
        'ufpswd': 'MyPassword'
    }
    addr, path = config_gen.create_stamplc_nvs_config(stamplc_config, "output/stamplc.bin")
    print(f"Stamplc NVS config created at: {path} (address: {addr})")
if __name__ == "__main__":
    main()
