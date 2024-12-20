# SPDX-FileCopyrightText: 2014-2022 Fredrik Ahlberg, Angus Gratton,
# Espressif Systems (Shanghai) CO LTD, other contributors as noted.
#
# SPDX-License-Identifier: GPL-2.0-or-later

import struct
from typing import Dict

from .esp32c3 import ESP32C3ROM
from ..util import FatalError, NotImplementedInROMError

from typing import List


class ESP32H2BETA1ROM(ESP32C3ROM):
    CHIP_NAME = "ESP32-H2(beta1)"
    IMAGE_CHIP_ID = 10

    IROM_MAP_START = 0x42000000
    IROM_MAP_END = 0x42800000
    DROM_MAP_START = 0x3C000000
    DROM_MAP_END = 0x3C800000

    SPI_REG_BASE = 0x60002000
    SPI_USR_OFFS = 0x18
    SPI_USR1_OFFS = 0x1C
    SPI_USR2_OFFS = 0x20
    SPI_MOSI_DLEN_OFFS = 0x24
    SPI_MISO_DLEN_OFFS = 0x28
    SPI_W0_OFFS = 0x58

    BOOTLOADER_FLASH_OFFSET = 0x0

    UART_DATE_REG_ADDR = 0x60000000 + 0x7C

    EFUSE_BASE = 0x6001A000
    EFUSE_BLOCK1_ADDR = EFUSE_BASE + 0x044
    MAC_EFUSE_REG = EFUSE_BASE + 0x044

    EFUSE_RD_REG_BASE = EFUSE_BASE + 0x030  # BLOCK0 read base address

    EFUSE_PURPOSE_KEY0_REG = EFUSE_BASE + 0x34
    EFUSE_PURPOSE_KEY0_SHIFT = 24
    EFUSE_PURPOSE_KEY1_REG = EFUSE_BASE + 0x34
    EFUSE_PURPOSE_KEY1_SHIFT = 28
    EFUSE_PURPOSE_KEY2_REG = EFUSE_BASE + 0x38
    EFUSE_PURPOSE_KEY2_SHIFT = 0
    EFUSE_PURPOSE_KEY3_REG = EFUSE_BASE + 0x38
    EFUSE_PURPOSE_KEY3_SHIFT = 4
    EFUSE_PURPOSE_KEY4_REG = EFUSE_BASE + 0x38
    EFUSE_PURPOSE_KEY4_SHIFT = 8
    EFUSE_PURPOSE_KEY5_REG = EFUSE_BASE + 0x38
    EFUSE_PURPOSE_KEY5_SHIFT = 12

    EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT_REG = EFUSE_RD_REG_BASE
    EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT = 1 << 20

    EFUSE_SPI_BOOT_CRYPT_CNT_REG = EFUSE_BASE + 0x034
    EFUSE_SPI_BOOT_CRYPT_CNT_MASK = 0x7 << 18

    EFUSE_SECURE_BOOT_EN_REG = EFUSE_BASE + 0x038
    EFUSE_SECURE_BOOT_EN_MASK = 1 << 20

    PURPOSE_VAL_XTS_AES128_KEY = 4

    SUPPORTS_ENCRYPTED_FLASH = True

    FLASH_ENCRYPTED_WRITE_ALIGN = 16

    MEMORY_MAP: List = []

    FLASH_FREQUENCY = {
        "48m": 0xF,
        "24m": 0x0,
        "16m": 0x1,
        "12m": 0x2,
    }

    EFUSE_MAX_KEY = 5
    KEY_PURPOSES: Dict[int, str] = {
        0: "USER/EMPTY",
        1: "ECDSA_KEY",
        2: "RESERVED",
        4: "XTS_AES_128_KEY",
        5: "HMAC_DOWN_ALL",
        6: "HMAC_DOWN_JTAG",
        7: "HMAC_DOWN_DIGITAL_SIGNATURE",
        8: "HMAC_UP",
        9: "SECURE_BOOT_DIGEST0",
        10: "SECURE_BOOT_DIGEST1",
        11: "SECURE_BOOT_DIGEST2",
    }

    def get_pkg_version(self):
        num_word = 4
        return (self.read_reg(self.EFUSE_BLOCK1_ADDR + (4 * num_word)) >> 0) & 0x07

    def get_minor_chip_version(self):
        num_word = 3
        return (self.read_reg(self.EFUSE_BLOCK1_ADDR + (4 * num_word)) >> 18) & 0x07

    def get_major_chip_version(self):
        num_word = 3
        return (self.read_reg(self.EFUSE_BLOCK1_ADDR + (4 * num_word)) >> 21) & 0x03

    def get_chip_description(self):
        chip_name = {
            0: "ESP32-H2",
        }.get(self.get_pkg_version(), "unknown ESP32-H2")
        major_rev = self.get_major_chip_version()
        minor_rev = self.get_minor_chip_version()
        return f"{chip_name} (revision v{major_rev}.{minor_rev})"

    def get_chip_features(self):
        return ["BLE", "IEEE802.15.4"]

    def get_crystal_freq(self):
        return 32

    def override_vddsdio(self, new_voltage):
        raise NotImplementedInROMError(
            "VDD_SDIO overrides are not supported for ESP32-H2"
        )

    def read_mac(self, mac_type="BASE_MAC"):
        """Read MAC from EFUSE region"""
        if mac_type != "BASE_MAC":
            return None
        mac0 = self.read_reg(self.MAC_EFUSE_REG)
        mac1 = self.read_reg(self.MAC_EFUSE_REG + 4)  # only bottom 16 bits are MAC
        bitstring = struct.pack(">II", mac1, mac0)[2:]
        return tuple(bitstring)

    def get_flash_crypt_config(self):
        return None  # doesn't exist on ESP32-H2

    def get_key_block_purpose(self, key_block):
        if key_block < 0 or key_block > self.EFUSE_MAX_KEY:
            raise FatalError(
                f"Valid key block numbers must be in range 0-{self.EFUSE_MAX_KEY}"
            )

        reg, shift = [
            (self.EFUSE_PURPOSE_KEY0_REG, self.EFUSE_PURPOSE_KEY0_SHIFT),
            (self.EFUSE_PURPOSE_KEY1_REG, self.EFUSE_PURPOSE_KEY1_SHIFT),
            (self.EFUSE_PURPOSE_KEY2_REG, self.EFUSE_PURPOSE_KEY2_SHIFT),
            (self.EFUSE_PURPOSE_KEY3_REG, self.EFUSE_PURPOSE_KEY3_SHIFT),
            (self.EFUSE_PURPOSE_KEY4_REG, self.EFUSE_PURPOSE_KEY4_SHIFT),
            (self.EFUSE_PURPOSE_KEY5_REG, self.EFUSE_PURPOSE_KEY5_SHIFT),
        ][key_block]
        return (self.read_reg(reg) >> shift) & 0xF

    def is_flash_encryption_key_valid(self):
        # Need to see an AES-128 key
        purposes = [
            self.get_key_block_purpose(b) for b in range(self.EFUSE_MAX_KEY + 1)
        ]

        return any(p == self.PURPOSE_VAL_XTS_AES128_KEY for p in purposes)

    def _post_connect(self):
        pass


class ESP32H2BETA1StubLoader(ESP32H2BETA1ROM):
    """Access class for ESP32H2BETA1 stub loader, runs on top of ROM.

    (Basically the same as ESP32StubLoader, but different base class.
    Can possibly be made into a mixin.)
    """

    FLASH_WRITE_SIZE = 0x4000  # matches MAX_WRITE_BLOCK in stub_loader.c
    STATUS_BYTES_LENGTH = 2  # same as ESP8266, different to ESP32 ROM
    IS_STUB = True

    def __init__(self, rom_loader):
        self.secure_download_mode = rom_loader.secure_download_mode
        self._port = rom_loader._port
        self._trace_enabled = rom_loader._trace_enabled
        self.cache = rom_loader.cache
        self.flush_input()  # resets _slip_reader


ESP32H2BETA1ROM.STUB_CLASS = ESP32H2BETA1StubLoader
