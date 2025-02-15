#!/usr/bin/env python3
import json
import os
import struct
import argparse
from pathlib import Path
import subprocess

class ConfigGenerator:
    def __init__(self, tmp_dir="tmp"):
        self.tmp_dir = Path(tmp_dir)
        self.tmp_dir.mkdir(exist_ok=True)

    def _crc8(self, data):
        """Calculate CRC8 for data"""
        if isinstance(data, str):
            data = data.encode()
        total = sum(data) & 0xFF
        return total

    def create_uiflow_config(self, options, output_path=None):
        """Create UIFlow configuration file
        
        This creates a simple WiFi configuration in the UIFlow format.
        The format is:
        - 1 byte for SSID length
        - SSID bytes
        - 1 byte SSID CRC
        - 49 bytes padding
        - 1 byte for password length
        - password bytes
        - 1 byte password CRC
        - remaining bytes filled with 0xFF
        """
        ssid = options['wifi_ssid']
        password = options['wifi_password']
        
        ssid_bytes = ssid.encode()
        pwd_bytes = password.encode()
        
        ssid_crc = self._crc8(ssid_bytes)
        pwd_crc = self._crc8(pwd_bytes)
        
        # Create a 100-byte buffer filled with 0xFF
        buffer = bytearray([0xFF] * 100)
        
        # Write SSID
        buffer[0] = len(ssid_bytes)
        buffer[1:1+len(ssid_bytes)] = ssid_bytes
        buffer[len(ssid_bytes) + 1] = ssid_crc
        
        # Write Password (starting at offset 50)
        buffer[50] = len(pwd_bytes)
        buffer[51:51+len(pwd_bytes)] = pwd_bytes
        buffer[51+len(pwd_bytes)] = pwd_crc
        
        if output_path is None:
            output_path = self.tmp_dir / 'wifi.bin'
            
        with open(output_path, 'wb') as f:
            f.write(buffer)
            
        return output_path

    def create_wifi_config(self, ssid, password, address="0x3ff000", output_path=None):
        """Create WiFi configuration file"""
        ssid_bytes = ssid.encode()
        pwd_bytes = password.encode()
        
        ssid_crc = self._crc8(ssid_bytes)
        pwd_crc = self._crc8(pwd_bytes)
        
        buffer = bytearray([0xFF] * 100)
        
        buffer[0] = len(ssid_bytes)
        buffer[1:1+len(ssid_bytes)] = ssid_bytes
        buffer[len(ssid_bytes) + 1] = ssid_crc
        
        buffer[50] = len(pwd_bytes)
        buffer[51:51+len(pwd_bytes)] = pwd_bytes
        buffer[51+len(pwd_bytes)] = pwd_crc
        
        if output_path is None:
            output_path = self.tmp_dir / 'wifi.bin'
            
        with open(output_path, 'wb') as f:
            f.write(buffer)
            
        return address, str(output_path)

    def create_uiflow2_nvs_config(self, config, output_path=None):
        """Create UIFlow2 NVS configuration file"""
        # Handle optional WiFi networks
        wifi_networks = config.get('wifi_networks', [])
        if len(wifi_networks) > 3:
            raise ValueError("Maximum of 3 WiFi networks supported")

        # Ensure we have 3 networks (empty if not provided)
        while len(wifi_networks) < 3:
            wifi_networks.append({"ssid": "", "password": ""})

        csv_content = f"""key,type,encoding,value
uiflow,namespace,,
server,data,string,{config['server']}
ssid0,data,string,{wifi_networks[0]['ssid']}
pswd0,data,string,{wifi_networks[0]['password']}
ssid1,data,string,{wifi_networks[1]['ssid']}
pswd1,data,string,{wifi_networks[1]['password']}
ssid2,data,string,{wifi_networks[2]['ssid']}
pswd2,data,string,{wifi_networks[2]['password']}
sntp0,data,string,{config['sntp0']}
sntp1,data,string,{config['sntp1']}
sntp2,data,string,{config['sntp2']}
tz,data,string,{config['timezone']}
boot_option,data,u8,{config['bootOpt']}"""

        csv_path = self.tmp_dir / 'uiflow2.csv'
        with open(csv_path, 'w') as f:
            f.write(csv_content)

        if output_path is None:
            output_path = self.tmp_dir / 'uiflow2-cfg.bin'

        subprocess.run(['python', 'nvs_partition_gen.py', 'generate', 
                       str(csv_path), str(output_path), '0x6000'])
            
        return "0x9000", str(output_path)

    def create_timercam_config(self, options, output_path=None):
        """Create TimerCam configuration file
        
        Supported configurations and their required fields:
        
        Basic TimerCam and Aliyun:
        - Resolution range (0-13):
          0: 96x96      1: 160x120    2: 176x144    3: 240x176
          4: 240x240    5: 320x240    6: 400x296    7: 480x320
          8: 640x480    9: 800x600    10: 1024x768  11: 1280x720
          12: 1280x1024 13: 1600x1200
        
        SMB and S3:
        - Limited resolution options:
          8: 640x480    11: 1280x720  14: 1920x1080
        
        Basic TimerCam:
        - ssid: WiFi SSID
        - pwd: WiFi password
        - wake_time: Wake interval in seconds
        - image_size: Resolution index (0-13)
        
        SMB:
        - wifi_ssid: WiFi SSID
        - wifi_pwd: WiFi password
        - smb_host: SMB server hostname/IP
        - smb_user: SMB username
        - smb_pwd: SMB password
        - smb_path: SMB share path
        - pic_name: Image file prefix
        - size: Resolution index (8, 11, or 14)
        - interval: Capture interval in seconds
        
        S3:
        - wifi_ssid: WiFi SSID
        - wifi_pwd: WiFi password
        - amazon_s3_host: S3 bucket URL
        - access_key: AWS access key ID
        - secret_access_key: AWS secret access key
        - pic_path: S3 path prefix
        - pic_name: Image file prefix
        - size: Resolution index (8, 11, or 14)
        - interval: Capture interval in seconds
        
        RTSP:
        - wifi_ssid: WiFi SSID
        - wifi_pwd: WiFi password
        
        Aliyun:
        - ssid: WiFi SSID
        - pwd: WiFi password
        - wake_time: Wake interval in seconds
        - image_size: Resolution index (0-13)
        - access_key: Aliyun access key
        - access_key_secret: Aliyun access key secret
        - server_url: Aliyun OSS server URL
        - bucket_name: Aliyun bucket name
        """
        # Validate required fields based on mode
        if 'mode' not in options:
            raise ValueError("Configuration mode must be specified")
        
        mode = options['mode']
        required_fields = {
            'basic': ['ssid', 'pwd', 'wake_time', 'image_size'],  # Basic uses ssid/pwd
            'smb': ['wifi_ssid', 'wifi_pwd', 'smb_host', 'smb_user', 'smb_pwd', 
                    'smb_path', 'pic_name', 'size', 'interval'],
            's3': ['wifi_ssid', 'wifi_pwd', 'amazon_s3_host', 'access_key', 
                   'secret_access_key', 'pic_path', 'pic_name', 'size', 'interval'],
            'rtsp': ['wifi_ssid', 'wifi_pwd'],
            'aliyun': ['ssid', 'pwd', 'wake_time', 'image_size', 'access_key',  # Aliyun also uses ssid/pwd
                       'access_key_secret', 'server_url', 'bucket_name']
        }

        if mode not in required_fields:
            raise ValueError(f"Invalid mode: {mode}. Must be one of: {', '.join(required_fields.keys())}")

        # Validate resolutions
        if mode in ['basic', 'aliyun']:
            if ('image_size' in options and 
                (options['image_size'] < 0 or options['image_size'] > 13)):
                raise ValueError(
                    f"{mode.upper()} mode only supports resolutions 0-13:\n"
                    "0: 96x96      1: 160x120    2: 176x144    3: 240x176\n"
                    "4: 240x240    5: 320x240    6: 400x296    7: 480x320\n"
                    "8: 640x480    9: 800x600    10: 1024x768  11: 1280x720\n"
                    "12: 1280x1024 13: 1600x1200"
                )
        elif mode in ['smb', 's3']:
            valid_sizes = {8, 11, 14}  # 640x480, 1280x720, 1920x1080
            if 'size' in options and options['size'] not in valid_sizes:
                raise ValueError(
                    f"{mode.upper()} mode only supports these resolutions:\n"
                    "8: 640x480\n11: 1280x720\n14: 1920x1080"
                )

        missing = [f for f in required_fields[mode] if f not in options]
        if missing:
            raise ValueError(f"Missing required fields for {mode} mode: {', '.join(missing)}")

        # Create configuration JSON with only the required fields
        config = {k: options[k] for k in required_fields[mode]}
        
        # Convert to JSON and create binary format
        json_str = json.dumps(config)
        json_bytes = json_str.encode()
        
        msg_len = len(json_bytes)
        header = struct.pack('>H', msg_len)  # 2 bytes for length
        crc = self._crc8(header + json_bytes)
        
        # Create final buffer with CRC and padding
        other_buffer = bytearray([crc]) + bytearray([0xFF] * (0x1000 - len(header) - len(json_bytes) - 1))
        final_buffer = header + json_bytes + other_buffer
        
        if output_path is None:
            output_path = self.tmp_dir / f'timercam-{mode}.cfg'
        
        with open(output_path, 'wb') as f:
            f.write(final_buffer)
        
        return "0x3ff000", str(output_path)

    def read_uiflow_config(self, input_path):
        """Read UIFlow configuration file and return WiFi settings
        
        Args:
            input_path: Path to the UIFlow configuration binary file
            
        Returns:
            dict: Decoded WiFi configuration with ssid and password
            
        Raises:
            ValueError: If the file is invalid or CRC check fails
        """
        with open(input_path, 'rb') as f:
            data = f.read()
        
        if len(data) < 100:
            raise ValueError("Invalid file size - UIFlow config must be 100 bytes")
        
        # Read SSID length and data
        ssid_len = data[0]
        ssid = data[1:1+ssid_len].decode()
        ssid_crc = data[1+ssid_len]
        
        # Verify SSID CRC
        calc_ssid_crc = self._crc8(ssid.encode())
        if calc_ssid_crc != ssid_crc:
            raise ValueError("SSID CRC check failed - configuration may be corrupted")
        
        # Read password length and data (starting at offset 50)
        pwd_len = data[50]
        password = data[51:51+pwd_len].decode()
        pwd_crc = data[51+pwd_len]
        
        # Verify password CRC
        calc_pwd_crc = self._crc8(password.encode())
        if calc_pwd_crc != pwd_crc:
            raise ValueError("Password CRC check failed - configuration may be corrupted")
        
        return {
            "wifi_ssid": ssid,
            "wifi_password": password
        }

def main():
    parser = argparse.ArgumentParser(description='M5Stack Configuration Generator')
    parser.add_argument('--config-type', required=True, 
                       choices=['uiflow', 'uiflow_read', 'wifi', 'uiflow2_nvs', 
                               'timercam', 'timercam_smb', 'timercam_s3', 
                               'timercam_rtsp', 'timercam_aliyun'],
                       help='Type of configuration operation')
    parser.add_argument('--input', required=True, 
                       help='Input file (JSON for config generation, binary for reading)')
    parser.add_argument('--output', required=True, 
                       help='Output file (binary for config generation, JSON for reading)')
    
    args = parser.parse_args()
    config_gen = ConfigGenerator()
    
    try:
        # Map command line arguments to internal mode names
        mode_mapping = {
            'timercam': 'basic',
            'timercam_smb': 'smb',
            'timercam_s3': 's3',
            'timercam_rtsp': 'rtsp',
            'timercam_aliyun': 'aliyun'
        }

        if args.config_type == 'uiflow_read':
            # Read and decode UIFlow config
            config = config_gen.read_uiflow_config(args.input)
            
            # Write decoded config to JSON file
            with open(args.output, 'w') as f:
                json.dump(config, f, indent=2)
            print(f"UIFlow config decoded and saved to: {args.output}")
            return

        # Read input configuration for generation
        with open(args.input, 'r') as f:
            config = json.load(f)

        # Handle different config types
        if args.config_type == 'uiflow':
            required_fields = ['wifi_ssid', 'wifi_password']
            missing = [f for f in required_fields if f not in config]
            if missing:
                raise ValueError(f"Missing required fields for UIFlow config: {', '.join(missing)}")
            
            output_path = config_gen.create_uiflow_config(config, args.output)
            print(f"UIFlow config created at: {output_path}")
            return

        elif args.config_type == 'wifi':
            if 'ssid' not in config or 'password' not in config:
                raise ValueError("WiFi config requires 'ssid' and 'password' fields")
            addr, path = config_gen.create_wifi_config(
                config['ssid'], 
                config['password'],
                config.get('address', "0x3ff000"),
                args.output
            )
            print(f"WiFi config created at: {path} (address: {addr})")
            return

        # Handle TimerCam configurations
        if args.config_type.startswith('timercam'):
            # Set the internal mode based on the command line argument
            config['mode'] = mode_mapping[args.config_type]
            addr, path = config_gen.create_timercam_config(config, args.output)
            print(f"TimerCam config created at: {path} (address: {addr})")
            return

        # Handle other config types...

    except Exception as e:
        print(f"Error: {str(e)}")
        exit(1)

if __name__ == "__main__":
    main()
