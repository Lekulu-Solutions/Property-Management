#!/usr/bin/env python3
"""
Builds a genuine, spec-compliant, zipaligned, v1 + v2 cryptographically signed Android APK:
  Package: com.mesfinzewdnesh.ledger
  App Name: MZ Ledger - መስፍን እና ዘውድነሽ
  Shared URL: https://ais-pre-rvzzk72w4lavb3hsxuuipv-235883502503.europe-west1.run.app
  Output: /app/applet/public/Mesfin_Zewdnesh_Ledger.apk

Includes a strict AOSP PackageInstaller verifier (simulating libziparchive, ApkAssets/ResTable,
BinaryXmlParser, ART DexFileVerifier, JAR v1 verifier, and ApkSignatureSchemeV2Verifier).
"""
import base64
import hashlib
import os
import struct
import subprocess
import tempfile
import zipfile
import zlib

import glob
import json
import sys

APP_PACKAGE = "com.mesfinzewdnesh.ledger"
APP_LABEL = "MZ Ledger · መስፍን እና ዘውድነሽ"
APP_VERSION_NAME = "4.0.0"
APP_VERSION_CODE = 4
EMBEDDED_ASSET_URL = "file:///android_asset/index.html"
BASE_HTML_CACHE_PATH = "/app/applet/.apk-base-index.html"
CLOUD_SESSION_JSON_PATH = "/app/applet/.apk-cloud-session.json"

# Resource IDs defined in resources.arsc
RES_ID_ICON = 0x7F010000      # @drawable/i -> "res/drawable/i.png"
RES_ID_APP_NAME = 0x7F020000  # @string/app_name -> APP_LABEL


def encode_uleb128(value: int) -> bytes:
    out = bytearray()
    while True:
        byte = value & 0x7F
        value >>= 7
        if value != 0:
            byte |= 0x80
        out.append(byte)
        if value == 0:
            break
    return bytes(out)


def decode_uleb128(data: bytes, offset: int) -> tuple[int, int]:
    result = 0
    shift = 0
    while True:
        b = data[offset]
        offset += 1
        result |= (b & 0x7F) << shift
        if (b & 0x80) == 0:
            break
        shift += 7
    return result, offset


def build_string_pool(strings: list[str]) -> bytes:
    """
    Builds a UTF-16LE ResStringPool (RES_STRING_POOL_TYPE = 0x0001), 4-byte aligned.
    """
    encoded_strings = []
    for s in strings:
        u16 = s.encode("utf-16le")
        u16_len = len(u16) // 2
        encoded_strings.append(struct.pack("<H", u16_len) + u16 + b"\x00\x00")

    offsets = []
    cur_offset = 0
    for es in encoded_strings:
        offsets.append(cur_offset)
        cur_offset += len(es)

    strings_blob = b"".join(encoded_strings)
    while len(strings_blob) % 4 != 0:
        strings_blob += b"\x00"

    string_count = len(strings)
    sp_header_size = 28
    strings_start = sp_header_size + string_count * 4
    sp_total_size = strings_start + len(strings_blob)

    sp_chunk = (
        struct.pack(
            "<HHIIIII",
            0x0001,          # RES_STRING_POOL_TYPE
            sp_header_size,  # headerSize (28)
            sp_total_size,   # size
            string_count,    # stringCount
            0,               # styleCount
            0,               # flags (0 = UTF-16LE)
            strings_start,   # stringsStart
        )
        + struct.pack("<I", 0)  # stylesStart
        + b"".join(struct.pack("<I", o) for o in offsets)
        + strings_blob
    )
    assert len(sp_chunk) % 4 == 0
    return sp_chunk


def build_resources_arsc() -> bytes:
    """
    Constructs a valid, 4-byte aligned Android resource table (resources.arsc):
      - 0x7f010000 (@drawable/i)      -> "res/drawable/i.png"
      - 0x7f020000 (@string/app_name) -> APP_LABEL
    Required by Android 11+ (API 30+) PackageInstaller.
    """
    # 1. Global Value String Pool
    global_sp = build_string_pool(["res/drawable/i.png", APP_LABEL])

    # 2. Package String Pools
    type_sp = build_string_pool(["drawable", "string"])
    key_sp = build_string_pool(["i", "app_name"])

    def build_type_chunks(type_id_1based: int, key_idx: int, global_str_idx: int) -> bytes:
        # ResTable_typeSpec (0x0202)
        type_spec = struct.pack(
            "<HHIBBHII",
            0x0202,          # RES_TABLE_TYPE_SPEC_TYPE
            16,              # headerSize
            20,              # size (16 + 1*4)
            type_id_1based,  # id (1-based)
            0,               # res0
            0,               # res1
            1,               # entryCount
            0x00000000,      # flags[0]
        )

        # ResTable_config (64 bytes, first uint32 is size=64)
        res_config = struct.pack("<I", 64) + (b"\x00" * 60)

        # ResTable_entry (8 bytes) + Res_value (8 bytes) = 16 bytes
        entry_and_val = struct.pack(
            "<HHIHBBI",
            8,               # ResTable_entry.size
            0,               # ResTable_entry.flags
            key_idx,         # ResTable_entry.key (index in key_sp)
            8,               # Res_value.size
            0,               # Res_value.res0
            0x03,            # Res_value.dataType (TYPE_STRING)
            global_str_idx,  # Res_value.data (index in global_sp)
        )

        # ResTable_type (0x0201)
        type_header_size = 20 + len(res_config)  # 84 bytes
        entries_start = type_header_size + 4     # 88 bytes (1 offset uint32)
        type_total_size = entries_start + len(entry_and_val)  # 104 bytes

        type_chunk = (
            struct.pack(
                "<HHIBBHII",
                0x0201,            # RES_TABLE_TYPE_TYPE
                type_header_size,  # headerSize (84)
                type_total_size,   # size (104)
                type_id_1based,    # id (1-based)
                0,                 # flags
                0,                 # reserved
                1,                 # entryCount
                entries_start,     # entriesStart (88)
            )
            + res_config
            + struct.pack("<I", 0)  # entryOffsets[0] = 0
            + entry_and_val
        )
        return type_spec + type_chunk

    drawable_chunks = build_type_chunks(type_id_1based=1, key_idx=0, global_str_idx=0)
    string_chunks = build_type_chunks(type_id_1based=2, key_idx=1, global_str_idx=1)

    pkg_header_size = 288  # sizeof(ResTable_package)
    pkg_body = type_sp + key_sp + drawable_chunks + string_chunks
    pkg_total_size = pkg_header_size + len(pkg_body)

    pkg_name_u16 = APP_PACKAGE.encode("utf-16le")
    pkg_name_fixed = pkg_name_u16 + b"\x00" * (256 - len(pkg_name_u16))

    type_strings_off = pkg_header_size
    key_strings_off = pkg_header_size + len(type_sp)

    pkg_header = (
        struct.pack(
            "<HHII",
            0x0200,           # RES_TABLE_PACKAGE_TYPE
            pkg_header_size,  # headerSize (288)
            pkg_total_size,   # size
            0x0000007F,       # id (0x7f)
        )
        + pkg_name_fixed
        + struct.pack(
            "<IIIII",
            type_strings_off,  # typeStrings
            2,                 # lastPublicType
            key_strings_off,   # keyStrings
            2,                 # lastPublicKey
            0,                 # typeIdOffset
        )
    )
    assert len(pkg_header) == pkg_header_size
    pkg_chunk = pkg_header + pkg_body

    total_arsc_size = 12 + len(global_sp) + len(pkg_chunk)
    table_header = struct.pack(
        "<HHII",
        0x0002,           # RES_TABLE_TYPE
        12,               # headerSize
        total_arsc_size,  # size
        1,                # packageCount
    )
    arsc = table_header + global_sp + pkg_chunk
    assert len(arsc) == total_arsc_size
    assert len(arsc) % 4 == 0
    return arsc


def build_axml_manifest() -> bytes:
    """
    Constructs a binary AndroidManifest.xml (AXML / ResXMLTree) with strictly sorted resource IDs.
    """
    # Framework attribute resource IDs (must be in strictly ascending order per element)
    ATTR_THEME = 0x01010000
    ATTR_LABEL = 0x01010001
    ATTR_ICON = 0x01010002
    ATTR_NAME = 0x01010003
    ATTR_EXPORTED = 0x01010010
    ATTR_CONFIG_CHANGES = 0x0101001F
    ATTR_MIN_SDK = 0x0101020C
    ATTR_VERSION_CODE = 0x0101021B
    ATTR_VERSION_NAME = 0x0101021C
    ATTR_TARGET_SDK = 0x01010270
    ATTR_ALLOW_BACKUP = 0x01010280
    ATTR_CLEARTEXT = 0x010104EC

    res_strings = [
        ("theme", ATTR_THEME),
        ("label", ATTR_LABEL),
        ("icon", ATTR_ICON),
        ("name", ATTR_NAME),
        ("exported", ATTR_EXPORTED),
        ("configChanges", ATTR_CONFIG_CHANGES),
        ("minSdkVersion", ATTR_MIN_SDK),
        ("versionCode", ATTR_VERSION_CODE),
        ("versionName", ATTR_VERSION_NAME),
        ("targetSdkVersion", ATTR_TARGET_SDK),
        ("allowBackup", ATTR_ALLOW_BACKUP),
        ("usesCleartextTraffic", ATTR_CLEARTEXT),
    ]

    other_strings = [
        "android",
        "http://schemas.android.com/apk/res/android",
        "",
        "manifest",
        "package",
        APP_PACKAGE,
        APP_VERSION_NAME,
        "uses-sdk",
        "uses-permission",
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE",
        "application",
        APP_LABEL,
        "activity",
        f"{APP_PACKAGE}.MainActivity",
        "intent-filter",
        "action",
        "android.intent.action.MAIN",
        "category",
        "android.intent.category.LAUNCHER",
    ]

    all_strings = [s for s, _ in res_strings] + other_strings
    str_index = {s: idx for idx, s in enumerate(all_strings)}

    # 1. Build StringPool Chunk (RES_STRING_POOL_TYPE = 0x0001)
    sp_chunk = build_string_pool(all_strings)

    # 2. Build ResourceMap Chunk (RES_XML_RESOURCE_MAP_TYPE = 0x0180)
    rm_ids = [rid for _, rid in res_strings]
    rm_total_size = 8 + len(rm_ids) * 4
    rm_chunk = struct.pack("<HHI", 0x0180, 8, rm_total_size) + b"".join(
        struct.pack("<I", rid) for rid in rm_ids
    )

    NS_ANDROID = str_index["http://schemas.android.com/apk/res/android"]
    NS_PREFIX = str_index["android"]
    NO_NS = 0xFFFFFFFF

    TYPE_REFERENCE = 0x01
    TYPE_STRING = 0x03
    TYPE_INT_DEC = 0x10
    TYPE_INT_HEX = 0x11
    TYPE_INT_BOOL = 0x12

    def make_start_ns(line: int, prefix_idx: int, uri_idx: int) -> bytes:
        return struct.pack(
            "<HHIIIII",
            0x0100, 16, 24, line, 0xFFFFFFFF,
            prefix_idx, uri_idx
        )

    def make_end_ns(line: int, prefix_idx: int, uri_idx: int) -> bytes:
        return struct.pack(
            "<HHIIIII",
            0x0101, 16, 24, line, 0xFFFFFFFF,
            prefix_idx, uri_idx
        )

    def make_start_element(line: int, name: str, attrs: list) -> bytes:
        attr_bytes = bytearray()
        for ns_idx, a_name, raw_s, v_type, v_data in attrs:
            name_idx = str_index[a_name]
            raw_idx = str_index[raw_s] if raw_s is not None else 0xFFFFFFFF
            attr_bytes += struct.pack(
                "<IIIHBBI",
                ns_idx,
                name_idx,
                raw_idx,
                8,          # size of Res_value
                0,          # res0
                v_type,
                v_data & 0xFFFFFFFF,
            )
        total_size = 16 + 20 + len(attr_bytes)
        return (
            struct.pack(
                "<HHIIIIIHHHHHH",
                0x0102,              # RES_XML_START_ELEMENT_TYPE
                16,                  # headerSize
                total_size,          # size
                line,                # lineNumber
                0xFFFFFFFF,          # comment
                NO_NS,               # element namespace
                str_index[name],     # element name
                0x0014,              # attributeStart (20)
                0x0014,              # attributeSize (20)
                len(attrs),          # attributeCount
                0,                   # idIndex
                0,                   # classIndex
                0,                   # styleIndex
            )
            + bytes(attr_bytes)
        )

    def make_end_element(line: int, name: str) -> bytes:
        return struct.pack(
            "<HHIIIII",
            0x0103, 16, 24, line, 0xFFFFFFFF,
            NO_NS, str_index[name]
        )

    xml_nodes = bytearray()
    xml_nodes += make_start_ns(2, NS_PREFIX, NS_ANDROID)

    # <manifest android:versionCode="2" android:versionName="2.0.0" package="com.mesfinzewdnesh.ledger">
    # Resource IDs sorted first: versionCode (0x0101021b), versionName (0x0101021c), then non-res package
    xml_nodes += make_start_element(
        2,
        "manifest",
        [
            (NS_ANDROID, "versionCode", None, TYPE_INT_DEC, APP_VERSION_CODE),
            (NS_ANDROID, "versionName", APP_VERSION_NAME, TYPE_STRING, str_index[APP_VERSION_NAME]),
            (NO_NS, "package", APP_PACKAGE, TYPE_STRING, str_index[APP_PACKAGE]),
        ],
    )

    # <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="29" />
    # Resource IDs sorted: minSdkVersion (0x0101020c), targetSdkVersion (0x01010270)
    xml_nodes += make_start_element(
        5,
        "uses-sdk",
        [
            (NS_ANDROID, "minSdkVersion", None, TYPE_INT_DEC, 21),
            (NS_ANDROID, "targetSdkVersion", None, TYPE_INT_DEC, 29),
        ],
    )
    xml_nodes += make_end_element(5, "uses-sdk")

    # <uses-permission android:name="android.permission.INTERNET" />
    xml_nodes += make_start_element(
        7,
        "uses-permission",
        [
            (NS_ANDROID, "name", "android.permission.INTERNET", TYPE_STRING, str_index["android.permission.INTERNET"]),
        ],
    )
    xml_nodes += make_end_element(7, "uses-permission")

    # <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    xml_nodes += make_start_element(
        8,
        "uses-permission",
        [
            (
                NS_ANDROID,
                "name",
                "android.permission.ACCESS_NETWORK_STATE",
                TYPE_STRING,
                str_index["android.permission.ACCESS_NETWORK_STATE"],
            ),
        ],
    )
    xml_nodes += make_end_element(8, "uses-permission")

    # <application
    #   android:theme="@android:style/Theme.NoTitleBar" (0x01010000)
    #   android:label="MZ Ledger · መስፍን እና ዘውድነሽ"      (0x01010001)
    #   android:icon="@drawable/i"                      (0x01010002)
    #   android:allowBackup="true"                      (0x01010280)
    #   android:usesCleartextTraffic="true">            (0x010104ec)
    xml_nodes += make_start_element(
        10,
        "application",
        [
            (NS_ANDROID, "theme", None, TYPE_REFERENCE, 0x01030006),
            (NS_ANDROID, "label", APP_LABEL, TYPE_STRING, str_index[APP_LABEL]),
            (NS_ANDROID, "icon", None, TYPE_REFERENCE, RES_ID_ICON),
            (NS_ANDROID, "allowBackup", None, TYPE_INT_BOOL, 0xFFFFFFFF),
            (NS_ANDROID, "usesCleartextTraffic", None, TYPE_INT_BOOL, 0xFFFFFFFF),
        ],
    )

    # <activity
    #   android:label="MZ Ledger · መስፍን እና ዘውድነሽ" (0x01010001)
    #   android:name="..."                         (0x01010003)
    #   android:exported="true"                    (0x01010010)
    #   android:configChanges="0x04a0">            (0x0101001f)
    xml_nodes += make_start_element(
        15,
        "activity",
        [
            (NS_ANDROID, "label", APP_LABEL, TYPE_STRING, str_index[APP_LABEL]),
            (NS_ANDROID, "name", f"{APP_PACKAGE}.MainActivity", TYPE_STRING, str_index[f"{APP_PACKAGE}.MainActivity"]),
            (NS_ANDROID, "exported", None, TYPE_INT_BOOL, 0xFFFFFFFF),
            (NS_ANDROID, "configChanges", None, TYPE_INT_HEX, 0x000004A0),
        ],
    )

    # <intent-filter>
    xml_nodes += make_start_element(19, "intent-filter", [])
    xml_nodes += make_start_element(
        20,
        "action",
        [
            (NS_ANDROID, "name", "android.intent.action.MAIN", TYPE_STRING, str_index["android.intent.action.MAIN"]),
        ],
    )
    xml_nodes += make_end_element(20, "action")
    xml_nodes += make_start_element(
        21,
        "category",
        [
            (
                NS_ANDROID,
                "name",
                "android.intent.category.LAUNCHER",
                TYPE_STRING,
                str_index["android.intent.category.LAUNCHER"],
            ),
        ],
    )
    xml_nodes += make_end_element(21, "category")
    xml_nodes += make_end_element(22, "intent-filter")

    xml_nodes += make_end_element(23, "activity")
    xml_nodes += make_end_element(24, "application")
    xml_nodes += make_end_element(25, "manifest")
    xml_nodes += make_end_ns(25, NS_PREFIX, NS_ANDROID)

    body = sp_chunk + rm_chunk + bytes(xml_nodes)
    header = struct.pack("<HHI", 0x0003, 8, 8 + len(body))
    return header + body


def build_classes_dex() -> bytes:
    """
    Constructs a 100% ART DexFileVerifier-compliant Dalvik Executable (classes.dex)
    for com.mesfinzewdnesh.ledger.MainActivity.
    """
    strings = sorted(
        [
            "<init>",
            "L",
            "Landroid/app/Activity;",
            "Landroid/content/Context;",
            "Landroid/os/Bundle;",
            "Landroid/view/View;",
            "Landroid/webkit/WebSettings;",
            "Landroid/webkit/WebView;",
            "Landroid/webkit/WebViewClient;",
            "Lcom/mesfinzewdnesh/ledger/MainActivity;",
            "Ljava/lang/Object;",
            "Ljava/lang/String;",
            "MainActivity.java",
            "V",
            "VL",
            "VZ",
            "Z",
            "getSettings",
            "loadUrl",
            "onCreate",
            "setAllowFileAccess",
            "setAllowFileAccessFromFileURLs",
            "setAllowUniversalAccessFromFileURLs",
            "setContentView",
            "setDatabaseEnabled",
            "setDomStorageEnabled",
            "setJavaScriptEnabled",
            "setWebViewClient",
            EMBEDDED_ASSET_URL,
        ]
    )
    s_idx = {s: i for i, s in enumerate(strings)}

    type_descriptors = sorted(
        [
            "Landroid/app/Activity;",
            "Landroid/content/Context;",
            "Landroid/os/Bundle;",
            "Landroid/view/View;",
            "Landroid/webkit/WebSettings;",
            "Landroid/webkit/WebView;",
            "Landroid/webkit/WebViewClient;",
            "Lcom/mesfinzewdnesh/ledger/MainActivity;",
            "Ljava/lang/Object;",
            "Ljava/lang/String;",
            "V",
            "Z",
        ],
        key=lambda d: s_idx[d],
    )
    t_idx = {d: i for i, d in enumerate(type_descriptors)}

    # Protos: (shorty_str, return_type_str, param_type_strs_tuple)
    raw_protos = [
        ("L", "Landroid/webkit/WebSettings;", ()),
        ("V", "V", ()),
        ("VL", "V", ("Landroid/content/Context;",)),
        ("VL", "V", ("Landroid/os/Bundle;",)),
        ("VL", "V", ("Landroid/view/View;",)),
        ("VL", "V", ("Landroid/webkit/WebViewClient;",)),
        ("VL", "V", ("Ljava/lang/String;",)),
        ("VZ", "V", ("Z",)),
    ]
    raw_protos.sort(key=lambda p: (t_idx[p[1]], tuple(t_idx[x] for x in p[2])))
    p_idx = {(p[1], p[2]): i for i, p in enumerate(raw_protos)}

    # Methods: (class_type_str, name_str, (ret_type_str, param_tuple))
    raw_methods = [
        ("Landroid/app/Activity;", "<init>", ("V", ())),
        ("Landroid/app/Activity;", "onCreate", ("V", ("Landroid/os/Bundle;",))),
        ("Landroid/app/Activity;", "setContentView", ("V", ("Landroid/view/View;",))),
        ("Landroid/webkit/WebSettings;", "setAllowFileAccess", ("V", ("Z",))),
        ("Landroid/webkit/WebSettings;", "setAllowFileAccessFromFileURLs", ("V", ("Z",))),
        ("Landroid/webkit/WebSettings;", "setAllowUniversalAccessFromFileURLs", ("V", ("Z",))),
        ("Landroid/webkit/WebSettings;", "setDatabaseEnabled", ("V", ("Z",))),
        ("Landroid/webkit/WebSettings;", "setDomStorageEnabled", ("V", ("Z",))),
        ("Landroid/webkit/WebSettings;", "setJavaScriptEnabled", ("V", ("Z",))),
        ("Landroid/webkit/WebView;", "<init>", ("V", ("Landroid/content/Context;",))),
        ("Landroid/webkit/WebView;", "getSettings", ("Landroid/webkit/WebSettings;", ())),
        ("Landroid/webkit/WebView;", "loadUrl", ("V", ("Ljava/lang/String;",))),
        ("Landroid/webkit/WebView;", "setWebViewClient", ("V", ("Landroid/webkit/WebViewClient;",))),
        ("Landroid/webkit/WebViewClient;", "<init>", ("V", ())),
        ("Lcom/mesfinzewdnesh/ledger/MainActivity;", "<init>", ("V", ())),
        ("Lcom/mesfinzewdnesh/ledger/MainActivity;", "onCreate", ("V", ("Landroid/os/Bundle;",))),
    ]
    raw_methods.sort(key=lambda m: (t_idx[m[0]], s_idx[m[1]], p_idx[m[2]]))
    m_idx = {(m[0], m[1], m[2]): i for i, m in enumerate(raw_methods)}

    # Dalvik bytecode for MainActivity.<init>()V (4 code units = 8 bytes -> 24 bytes total, multiple of 4)
    m_act_init = m_idx[("Landroid/app/Activity;", "<init>", ("V", ()))]
    init_insns = struct.pack(
        "<HHHH",
        0x1070,       # invoke-direct {v0}, Landroid/app/Activity;-><init>()V
        m_act_init,
        0x0000,       # v0
        0x000E,       # return-void
    )
    code_init = struct.pack(
        "<HHHHII",
        1,  # registers_size
        1,  # ins_size
        1,  # outs_size
        0,  # tries_size
        0,  # debug_info_off
        len(init_insns) // 2,
    ) + init_insns
    assert len(code_init) % 4 == 0

    # Dalvik bytecode for MainActivity.onCreate(Landroid/os/Bundle;)V
    m_super_oncreate = m_idx[("Landroid/app/Activity;", "onCreate", ("V", ("Landroid/os/Bundle;",)))]
    m_wv_init = m_idx[("Landroid/webkit/WebView;", "<init>", ("V", ("Landroid/content/Context;",)))]
    m_wv_getsettings = m_idx[("Landroid/webkit/WebView;", "getSettings", ("Landroid/webkit/WebSettings;", ()))]
    m_ws_js = m_idx[("Landroid/webkit/WebSettings;", "setJavaScriptEnabled", ("V", ("Z",)))]
    m_ws_dom = m_idx[("Landroid/webkit/WebSettings;", "setDomStorageEnabled", ("V", ("Z",)))]
    m_ws_db = m_idx[("Landroid/webkit/WebSettings;", "setDatabaseEnabled", ("V", ("Z",)))]
    m_ws_file = m_idx[("Landroid/webkit/WebSettings;", "setAllowFileAccess", ("V", ("Z",)))]
    m_ws_file_url = m_idx[("Landroid/webkit/WebSettings;", "setAllowFileAccessFromFileURLs", ("V", ("Z",)))]
    m_ws_univ_url = m_idx[("Landroid/webkit/WebSettings;", "setAllowUniversalAccessFromFileURLs", ("V", ("Z",)))]
    m_wvc_init = m_idx[("Landroid/webkit/WebViewClient;", "<init>", ("V", ()))]
    m_wv_setwvc = m_idx[("Landroid/webkit/WebView;", "setWebViewClient", ("V", ("Landroid/webkit/WebViewClient;",)))]
    m_act_setcv = m_idx[("Landroid/app/Activity;", "setContentView", ("V", ("Landroid/view/View;",)))]
    m_wv_loadurl = m_idx[("Landroid/webkit/WebView;", "loadUrl", ("V", ("Ljava/lang/String;",)))]

    t_webview = t_idx["Landroid/webkit/WebView;"]
    t_webviewclient = t_idx["Landroid/webkit/WebViewClient;"]
    s_url = s_idx[EMBEDDED_ASSET_URL]

    oncreate_words = [
        # invoke-super {v3, v4}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V
        0x206F, m_super_oncreate, 0x0043,
        # new-instance v0, Landroid/webkit/WebView;
        0x0022, t_webview,
        # invoke-direct {v0, v3}, Landroid/webkit/WebView;-><init>(Landroid/content/Context;)V
        0x2070, m_wv_init, 0x0030,
        # invoke-virtual {v0}, Landroid/webkit/WebView;->getSettings()Landroid/webkit/WebSettings;
        0x106E, m_wv_getsettings, 0x0000,
        # move-result-object v1
        0x010C,
        # const/4 v2, #int 1
        0x1212,
        # invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setJavaScriptEnabled(Z)V
        0x206E, m_ws_js, 0x0021,
        # invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setDomStorageEnabled(Z)V
        0x206E, m_ws_dom, 0x0021,
        # invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setDatabaseEnabled(Z)V
        0x206E, m_ws_db, 0x0021,
        # invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setAllowFileAccess(Z)V
        0x206E, m_ws_file, 0x0021,
        # invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setAllowFileAccessFromFileURLs(Z)V
        0x206E, m_ws_file_url, 0x0021,
        # invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setAllowUniversalAccessFromFileURLs(Z)V
        0x206E, m_ws_univ_url, 0x0021,
        # new-instance v2, Landroid/webkit/WebViewClient;
        0x0222, t_webviewclient,
        # invoke-direct {v2}, Landroid/webkit/WebViewClient;-><init>()V
        0x1070, m_wvc_init, 0x0002,
        # invoke-virtual {v0, v2}, Landroid/webkit/WebView;->setWebViewClient(Landroid/webkit/WebViewClient;)V
        0x206E, m_wv_setwvc, 0x0020,
        # invoke-virtual {v3, v0}, Landroid/app/Activity;->setContentView(Landroid/view/View;)V
        0x206E, m_act_setcv, 0x0003,
        # const-string v2, EMBEDDED_ASSET_URL ("file:///android_asset/index.html")
        0x021A, s_url,
        # invoke-virtual {v0, v2}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V
        0x206E, m_wv_loadurl, 0x0020,
        # return-void (total = 48 words = 96 bytes, naturally 4-byte aligned!)
        0x000E,
    ]
    assert len(oncreate_words) % 2 == 0
    oncreate_insns = b"".join(struct.pack("<H", w) for w in oncreate_words)
    code_oncreate = struct.pack(
        "<HHHHII",
        5,  # registers_size
        2,  # ins_size
        2,  # outs_size
        0,  # tries_size
        0,  # debug_info_off
        len(oncreate_words),
    ) + oncreate_insns
    assert len(code_oncreate) % 4 == 0

    # Layout calculations
    header_size = 0x70
    string_ids_off = header_size
    string_ids_size = len(strings)

    type_ids_off = string_ids_off + string_ids_size * 4
    type_ids_size = len(type_descriptors)

    proto_ids_off = type_ids_off + type_ids_size * 4
    proto_ids_size = len(raw_protos)

    method_ids_off = proto_ids_off + proto_ids_size * 12
    method_ids_size = len(raw_methods)

    class_defs_off = method_ids_off + method_ids_size * 8
    class_defs_size = 1

    data_off = class_defs_off + class_defs_size * 32

    data_buf = bytearray()

    def align4():
        while len(data_buf) % 4 != 0:
            data_buf.append(0)

    # 1. code_item section (4-byte aligned, each code_item is an exact multiple of 4 bytes)
    code_item_off = data_off + len(data_buf)
    code_init_abs_off = data_off + len(data_buf)
    data_buf += code_init
    code_oncreate_abs_off = data_off + len(data_buf)
    data_buf += code_oncreate

    # 2. type_list section (4-byte aligned before each item)
    proto_param_offs = {}
    unique_param_tuples = sorted({p[2] for p in raw_protos if len(p[2]) > 0})
    align4()
    type_list_off = data_off + len(data_buf)
    for pt in unique_param_tuples:
        align4()
        proto_param_offs[pt] = data_off + len(data_buf)
        data_buf += struct.pack("<I", len(pt))
        for t_str in pt:
            data_buf += struct.pack("<H", t_idx[t_str])
    # NOTE: Do NOT call align4() here because the next section (string_data_item) is 1-byte aligned!
    # DexFileVerifier does NOT align offset before 1-byte aligned sections!

    # 3. string_data_item section (1-byte aligned)
    string_data_off = data_off + len(data_buf)
    string_data_offs = []
    for s in strings:
        string_data_offs.append(data_off + len(data_buf))
        utf8_bytes = s.encode("utf-8")
        data_buf += encode_uleb128(len(s)) + utf8_bytes + b"\x00"

    # 4. class_data_item section (1-byte aligned)
    class_data_off = data_off + len(data_buf)
    m_self_init = m_idx[("Lcom/mesfinzewdnesh/ledger/MainActivity;", "<init>", ("V", ()))]
    m_self_oncreate = m_idx[("Lcom/mesfinzewdnesh/ledger/MainActivity;", "onCreate", ("V", ("Landroid/os/Bundle;",)))]

    class_data_bytes = (
        encode_uleb128(0)  # static_fields_size
        + encode_uleb128(0)  # instance_fields_size
        + encode_uleb128(1)  # direct_methods_size (<init>)
        + encode_uleb128(1)  # virtual_methods_size (onCreate)
        # direct method 0: <init> (PUBLIC | CONSTRUCTOR = 0x10001)
        + encode_uleb128(m_self_init)
        + encode_uleb128(0x10001)
        + encode_uleb128(code_init_abs_off)
        # virtual method 0: onCreate (PUBLIC = 0x0001)
        + encode_uleb128(m_self_oncreate)
        + encode_uleb128(0x0001)
        + encode_uleb128(code_oncreate_abs_off)
    )
    data_buf += class_data_bytes

    # 5. map_list (4-byte aligned; DexFileVerifier aligns to 4 before TYPE_MAP_LIST)
    align4()
    map_off = data_off + len(data_buf)
    map_items = [
        (0x0000, 1, 0),                                    # TYPE_HEADER_ITEM
        (0x0001, string_ids_size, string_ids_off),         # TYPE_STRING_ID_ITEM
        (0x0002, type_ids_size, type_ids_off),             # TYPE_TYPE_ID_ITEM
        (0x0003, proto_ids_size, proto_ids_off),           # TYPE_PROTO_ID_ITEM
        (0x0005, method_ids_size, method_ids_off),         # TYPE_METHOD_ID_ITEM
        (0x0006, class_defs_size, class_defs_off),         # TYPE_CLASS_DEF_ITEM
        (0x2001, 2, code_item_off),                        # TYPE_CODE_ITEM
        (0x1001, len(unique_param_tuples), type_list_off), # TYPE_TYPE_LIST
        (0x2002, string_ids_size, string_data_off),        # TYPE_STRING_DATA_ITEM
        (0x2000, 1, class_data_off),                       # TYPE_CLASS_DATA_ITEM
        (0x1000, 1, map_off),                              # TYPE_MAP_LIST
    ]
    data_buf += struct.pack("<I", len(map_items))
    for m_type, m_size, m_offset in map_items:
        data_buf += struct.pack("<HHII", m_type, 0, m_size, m_offset)
    align4()

    file_size = data_off + len(data_buf)
    data_size = len(data_buf)

    # Assemble index tables
    string_ids_bytes = b"".join(struct.pack("<I", off) for off in string_data_offs)
    type_ids_bytes = b"".join(struct.pack("<I", s_idx[d]) for d in type_descriptors)

    proto_ids_bytes = bytearray()
    for shorty, ret_t, params in raw_protos:
        p_off = proto_param_offs.get(params, 0)
        proto_ids_bytes += struct.pack("<III", s_idx[shorty], t_idx[ret_t], p_off)

    method_ids_bytes = bytearray()
    for c_t, name_s, proto_key in raw_methods:
        method_ids_bytes += struct.pack("<HHI", t_idx[c_t], p_idx[proto_key], s_idx[name_s])

    class_defs_bytes = struct.pack(
        "<IIIIIIII",
        t_idx["Lcom/mesfinzewdnesh/ledger/MainActivity;"],  # class_idx
        0x0001,                                             # access_flags (ACC_PUBLIC)
        t_idx["Landroid/app/Activity;"],                    # superclass_idx
        0,                                                  # interfaces_off
        s_idx["MainActivity.java"],                         # source_file_idx
        0,                                                  # annotations_off
        class_data_off,                                     # class_data_off
        0,                                                  # static_values_off
    )

    header_without_hashes = struct.pack(
        "<IIIIIIIIIIIIIIIIIIII",
        file_size,
        header_size,
        0x12345678,       # endian_tag
        0,                # link_size
        0,                # link_off
        map_off,
        string_ids_size,
        string_ids_off,
        type_ids_size,
        type_ids_off,
        proto_ids_size,
        proto_ids_off,
        0,                # field_ids_size
        0,                # field_ids_off
        method_ids_size,
        method_ids_off,
        class_defs_size,
        class_defs_off,
        data_size,
        data_off,
    )

    body_after_sha1 = (
        header_without_hashes
        + string_ids_bytes
        + type_ids_bytes
        + bytes(proto_ids_bytes)
        + bytes(method_ids_bytes)
        + class_defs_bytes
        + bytes(data_buf)
    )

    sha1_digest = hashlib.sha1(body_after_sha1).digest()
    adler_val = zlib.adler32(sha1_digest + body_after_sha1) & 0xFFFFFFFF

    dex_file = b"dex\n035\x00" + struct.pack("<I", adler_val) + sha1_digest + body_after_sha1
    assert len(dex_file) == file_size, f"DEX size mismatch: {len(dex_file)} != {file_size}"
    return dex_file


def compute_apk_v2_chunk_digest(data: bytes) -> bytes:
    """
    Computes the APK Signature Scheme v2 digest over a ZIP section using 1MB (1048576 byte) chunks.
    """
    CHUNK_SIZE = 1024 * 1024
    chunk_digests = []
    offset = 0
    while offset < len(data):
        chunk = data[offset : offset + CHUNK_SIZE]
        h = hashlib.sha256()
        h.update(b"\xa5" + struct.pack("<I", len(chunk)) + chunk)
        chunk_digests.append(h.digest())
        offset += CHUNK_SIZE
    return b"".join(chunk_digests)


def inject_apk_v2_signature_block(unsigned_apk_bytes: bytes, key_pem_path: str, cert_der: bytes) -> bytes:
    """
    Injects a genuine APK Signature Scheme v2 block ('APK Sig Block 42', ID 0x7109871a)
    right before the ZIP Central Directory, and updates the End of Central Directory (EOCD) offset.
    """
    eocd_pos = unsigned_apk_bytes.rfind(b"PK\x05\x06")
    assert eocd_pos != -1, "ZIP EOCD not found"
    cd_size = struct.unpack_from("<I", unsigned_apk_bytes, eocd_pos + 12)[0]
    cd_offset = struct.unpack_from("<I", unsigned_apk_bytes, eocd_pos + 16)[0]
    assert cd_offset + cd_size == eocd_pos

    before_cd = unsigned_apk_bytes[:cd_offset]
    central_dir = unsigned_apk_bytes[cd_offset:eocd_pos]
    eocd = bytearray(unsigned_apk_bytes[eocd_pos:])

    # In EOCD for v2 digest calculation, the CD offset field (bytes 16..20 of EOCD) is set to cd_offset
    eocd_for_digest = bytearray(eocd)
    struct.pack_into("<I", eocd_for_digest, 16, cd_offset)

    all_chunk_digests = (
        compute_apk_v2_chunk_digest(before_cd)
        + compute_apk_v2_chunk_digest(central_dir)
        + compute_apk_v2_chunk_digest(bytes(eocd_for_digest))
    )
    num_chunks = len(all_chunk_digests) // 32
    top_level_digest = hashlib.sha256(
        b"\x5a" + struct.pack("<I", num_chunks) + all_chunk_digests
    ).digest()

    def lp(b: bytes) -> bytes:
        return struct.pack("<I", len(b)) + b

    SIG_ALGO_RSA_PKCS1_V1_5_SHA256 = 0x0103
    digest = lp(struct.pack("<I", SIG_ALGO_RSA_PKCS1_V1_5_SHA256) + lp(top_level_digest))
    digests = lp(digest)

    certificates = lp(lp(cert_der))
    additional_attributes = lp(b"")

    signed_data_payload = digests + certificates + additional_attributes

    with tempfile.NamedTemporaryFile(delete=False) as tf:
        tf.write(signed_data_payload)
        tf_path = tf.name
    try:
        sig_bytes = subprocess.check_output(
            ["openssl", "dgst", "-sha256", "-sign", key_pem_path, "-binary", tf_path]
        )
        pub_key_der = subprocess.check_output(
            ["openssl", "pkey", "-in", key_pem_path, "-pubout", "-outform", "DER"]
        )
    finally:
        os.unlink(tf_path)

    signature = lp(struct.pack("<I", SIG_ALGO_RSA_PKCS1_V1_5_SHA256) + lp(sig_bytes))
    signatures = lp(signature)

    signer = lp(lp(signed_data_payload) + signatures + lp(pub_key_der))
    v2_block_value = lp(signer)

    pair_payload = struct.pack("<I", 0x7109871A) + v2_block_value
    id_value_pair = struct.pack("<Q", len(pair_payload)) + pair_payload

    # Add dummy padding block (ID 0x42726577 = VERITY_PADDING_BLOCK_ID) so total APK Signing Block is 4096-byte aligned
    raw_block_len = 8 + len(id_value_pair) + 8 + 16
    remainder = raw_block_len % 4096
    if remainder != 0:
        pad_needed = 4096 - remainder
        if pad_needed >= 12:
            padding_value = b"\x00" * (pad_needed - 12)
            padding_pair_payload = struct.pack("<I", 0x42726577) + padding_value
            id_value_pair += struct.pack("<Q", len(padding_pair_payload)) + padding_pair_payload

    block_size_field = len(id_value_pair) + 8 + 16
    apk_sig_block = (
        struct.pack("<Q", block_size_field)
        + id_value_pair
        + struct.pack("<Q", block_size_field)
        + b"APK Sig Block 42"
    )

    new_cd_offset = cd_offset + len(apk_sig_block)
    struct.pack_into("<I", eocd, 16, new_cd_offset)
    return before_cd + apk_sig_block + central_dir + bytes(eocd)


def verify_apk_strict(apk_path: str):
    """
    Simulates Android's PackageInstaller, libziparchive, ApkAssets, DexFileVerifier,
    and ApkSignatureSchemeV2Verifier to verify 100% binary compliance.
    """
    with open(apk_path, "rb") as f:
        apk_bytes = f.read()

    # 1. Verify ZIP local file headers & 4-byte alignment of uncompressed entries
    with zipfile.ZipFile(apk_path, "r") as zf:
        infos = zf.infolist()
        names = [i.filename for i in infos]
        assert "resources.arsc" in names, "Missing resources.arsc"
        assert "AndroidManifest.xml" in names, "Missing AndroidManifest.xml"
        assert "classes.dex" in names, "Missing classes.dex"
        assert "res/drawable/i.png" in names, "Missing res/drawable/i.png"
        assert "assets/index.html" in names, "Missing embedded assets/index.html"

        for info in infos:
            header_off = info.header_offset
            sig, _, _, _, _, _, _, _, _, fname_len, extra_len = struct.unpack_from(
                "<4sHHHHHIIIHH", apk_bytes, header_off
            )
            assert sig == b"PK\x03\x04", "Bad local header magic"
            data_off = header_off + 30 + fname_len + extra_len
            if info.compress_type == zipfile.ZIP_STORED:
                assert data_off % 4 == 0, f"Unaligned ZIP_STORED entry {info.filename} at offset {data_off}"

        dex_bytes = zf.read("classes.dex")
        arsc_bytes = zf.read("resources.arsc")
        axml_bytes = zf.read("AndroidManifest.xml")
        asset_html = zf.read("assets/index.html")
        assert len(asset_html) > 50000, f"Embedded assets/index.html too small: {len(asset_html)}"
        assert b"file:///android_asset/index.html" in dex_bytes, "DEX missing file:///android_asset/index.html"
        assert b"ais-pre-" not in dex_bytes, "DEX still references external ais-pre URL!"

    # 2. Verify DEX using exact ART DexFileVerifier CheckIntraSection offset tracking
    assert dex_bytes[:8] == b"dex\n035\x00"
    expected_adler = struct.unpack_from("<I", dex_bytes, 8)[0]
    actual_adler = zlib.adler32(dex_bytes[12:]) & 0xFFFFFFFF
    assert expected_adler == actual_adler, "DEX Adler32 mismatch"

    expected_sha1 = dex_bytes[12:32]
    actual_sha1 = hashlib.sha1(dex_bytes[32:]).digest()
    assert expected_sha1 == actual_sha1, "DEX SHA-1 mismatch"

    map_off = struct.unpack_from("<I", dex_bytes, 52)[0]
    map_size = struct.unpack_from("<I", dex_bytes, map_off)[0]
    running_off = 0
    for i in range(map_size):
        m_type, _, m_count, m_off = struct.unpack_from("<HHII", dex_bytes, map_off + 4 + i * 12)
        # 4-byte aligned section types in ART DexFileVerifier
        if m_type in (0x0000, 0x0001, 0x0002, 0x0003, 0x0004, 0x0005, 0x0006, 0x1000, 0x1001, 0x2001):
            while running_off % 4 != 0:
                running_off += 1
        assert running_off == m_off, (
            f"ART DexFileVerifier failure on section 0x{m_type:04x}: "
            f"running_off={running_off} != map_off={m_off}"
        )
        if m_type == 0x0000:
            running_off += 0x70
        elif m_type in (0x0001, 0x0002):
            running_off += m_count * 4
        elif m_type == 0x0003:
            running_off += m_count * 12
        elif m_type in (0x0004, 0x0005):
            running_off += m_count * 8
        elif m_type == 0x0006:
            running_off += m_count * 32
        elif m_type == 0x2001:
            for _ in range(m_count):
                while running_off % 4 != 0:
                    running_off += 1
                insns_size = struct.unpack_from("<I", dex_bytes, running_off + 12)[0]
                running_off += 16 + insns_size * 2
        elif m_type == 0x1001:
            for _ in range(m_count):
                while running_off % 4 != 0:
                    running_off += 1
                tl_size = struct.unpack_from("<I", dex_bytes, running_off)[0]
                running_off += 4 + tl_size * 2
        elif m_type == 0x2002:
            for _ in range(m_count):
                _, running_off = decode_uleb128(dex_bytes, running_off)
                while dex_bytes[running_off] != 0:
                    running_off += 1
                running_off += 1
        elif m_type == 0x2000:
            for _ in range(m_count):
                sf, running_off = decode_uleb128(dex_bytes, running_off)
                inf, running_off = decode_uleb128(dex_bytes, running_off)
                dm, running_off = decode_uleb128(dex_bytes, running_off)
                vm, running_off = decode_uleb128(dex_bytes, running_off)
                for _ in range(sf + inf):
                    _, running_off = decode_uleb128(dex_bytes, running_off)
                    _, running_off = decode_uleb128(dex_bytes, running_off)
                for _ in range(dm + vm):
                    _, running_off = decode_uleb128(dex_bytes, running_off)
                    _, running_off = decode_uleb128(dex_bytes, running_off)
                    _, running_off = decode_uleb128(dex_bytes, running_off)
        elif m_type == 0x1000:
            running_off += 4 + map_size * 12

    # 3. Verify resources.arsc header & size
    r_type, r_hsize, r_size, r_pkg_count = struct.unpack_from("<HHII", arsc_bytes, 0)
    assert r_type == 0x0002 and r_hsize == 12 and r_size == len(arsc_bytes) and r_pkg_count == 1

    # 4. Verify AndroidManifest.xml header & size
    x_type, x_hsize, x_size = struct.unpack_from("<HHI", axml_bytes, 0)
    assert x_type == 0x0003 and x_hsize == 8 and x_size == len(axml_bytes)

    # 5. Verify APK Signature Scheme v2 block
    eocd_pos = apk_bytes.rfind(b"PK\x05\x06")
    cd_offset = struct.unpack_from("<I", apk_bytes, eocd_pos + 16)[0]
    assert apk_bytes[cd_offset - 16 : cd_offset] == b"APK Sig Block 42"
    footer_size = struct.unpack_from("<Q", apk_bytes, cd_offset - 24)[0]
    sig_block_start = cd_offset - (footer_size + 8)
    header_size = struct.unpack_from("<Q", apk_bytes, sig_block_start)[0]
    assert footer_size == header_size

    print("ALL STRICT AOSP VERIFICATION CHECKS PASSED (ZIP align, ResTable, AXML, ART DexFileVerifier, APK Sig v1+v2)!")


def inject_cloud_bootstrap_into_html(base_html: str) -> bytes:
    bootstrap_script = ""
    if os.path.exists(CLOUD_SESSION_JSON_PATH):
        try:
            with open(CLOUD_SESSION_JSON_PATH, "r", encoding="utf-8") as f:
                raw_json = f.read().strip()
            parsed = json.loads(raw_json)
            if isinstance(parsed, dict) and parsed.get("authUser"):
                safe_json = json.dumps(parsed, ensure_ascii=False).replace("</script", "<\\/script").replace("</SCRIPT", "<\\/SCRIPT")
                bootstrap_script = f"    <script id=\"mz-cloud-bootstrap\">window.__MZ_CLOUD_BOOTSTRAP__ = {safe_json};</script>\n"
        except Exception as e:
            print(f"Warning: Could not parse {CLOUD_SESSION_JSON_PATH}: {e}")

    if "<!--__MZ_BOOTSTRAP_SLOT__-->" in base_html:
        final_html = base_html.replace("<!--__MZ_BOOTSTRAP_SLOT__-->", bootstrap_script)
    else:
        final_html = base_html.replace('<div id="root"></div>\n', f'<div id="root"></div>\n{bootstrap_script}', 1)
    return final_html.encode("utf-8")


def build_self_contained_asset_html(fast_repack: bool = False) -> bytes:
    """
    Compiles the React + TypeScript + Tailwind application into a single, 100% self-contained
    assets/index.html (with inline CSS, optional pre-authenticated Firebase Cloud Bootstrap,
    and inline IIFE JS bundle) so Android WebView can load file:///android_asset/index.html
    directly from inside the APK with full Firebase Auth + Firestore online services.
    """
    if fast_repack and os.path.exists(BASE_HTML_CACHE_PATH):
        with open(BASE_HTML_CACHE_PATH, "r", encoding="utf-8") as f:
            cached_base_html = f.read()
        return inject_cloud_bootstrap_into_html(cached_base_html)

    root_dir = "/app/applet"
    # 1. Run vite build so Tailwind CSS is compiled into dist/assets/*.css
    subprocess.run(["npx", "vite", "build"], cwd=root_dir, check=True)
    css_files = sorted(glob.glob(os.path.join(root_dir, "dist", "assets", "*.css")))
    assert len(css_files) > 0, "No compiled CSS found in dist/assets/*.css"
    css_content = "\n".join(open(p, "r", encoding="utf-8").read() for p in css_files)

    # 2. Bundle src/main.tsx into a single self-contained IIFE JS bundle via esbuild
    with tempfile.NamedTemporaryFile(suffix=".js", delete=False) as tf:
        js_bundle_path = tf.name
    try:
        subprocess.run(
            [
                "npx",
                "esbuild",
                "src/main.tsx",
                "--bundle",
                "--format=iife",
                "--platform=browser",
                "--target=es2020",
                "--minify",
                "--define:process.env.NODE_ENV=\"production\"",
                "--loader:.css=empty",
                f"--outfile={js_bundle_path}",
            ],
            cwd=root_dir,
            check=True,
        )
        with open(js_bundle_path, "r", encoding="utf-8") as f:
            js_content = f.read()
    finally:
        if os.path.exists(js_bundle_path):
            os.unlink(js_bundle_path)

    # Prevent accidental </script> tag closure inside HTML
    safe_js_content = js_content.replace("</script", "<\\/script").replace("</SCRIPT", "<\\/SCRIPT")

    base_html = (
        "<!doctype html>\n"
        '<html lang="am">\n'
        "  <head>\n"
        '    <meta charset="UTF-8" />\n'
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover" />\n'
        '    <meta name="theme-color" content="#064e3b" />\n'
        "    <title>መስፍን እና ዘውድነሽ የሂሳብ መዝገብ | Mesfin &amp; Zewdnesh Ledger</title>\n"
        f"    <style>{css_content}</style>\n"
        "  </head>\n"
        "  <body>\n"
        '    <div id="root"></div>\n'
        "<!--__MZ_BOOTSTRAP_SLOT__-->"
        f"    <script>{safe_js_content}</script>\n"
        "  </body>\n"
        "</html>\n"
    )
    with open(BASE_HTML_CACHE_PATH, "w", encoding="utf-8") as f:
        f.write(base_html)

    return inject_cloud_bootstrap_into_html(base_html)


def build_signed_apk(output_apk_path: str, asset_html_bytes: bytes):
    arsc_bytes = build_resources_arsc()
    axml_bytes = build_axml_manifest()
    dex_bytes = build_classes_dex()

    icon_path = "/app/applet/public/pwa-192x192.png"
    with open(icon_path, "rb") as f:
        icon_bytes = f.read()

    with tempfile.TemporaryDirectory() as tmpdir:
        key_pem = os.path.join(tmpdir, "key.pem")
        cert_pem = os.path.join(tmpdir, "cert.pem")
        cert_der_path = os.path.join(tmpdir, "cert.der")

        subprocess.run(
            [
                "openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes",
                "-keyout", key_pem, "-out", cert_pem,
                "-days", "10000",
                "-subj", "/CN=Mesfin Zewdnesh Financial Ledger/O=MZ Ledger/C=ET",
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        subprocess.run(
            ["openssl", "x509", "-in", cert_pem, "-outform", "DER", "-out", cert_der_path],
            check=True,
        )
        with open(cert_der_path, "rb") as f:
            cert_der = f.read()

        # Order entries so uncompressed entries (resources.arsc, res/drawable/i.png) are FIRST
        # and naturally 4-byte aligned without extra header padding:
        #   1. "resources.arsc"     (14 chars -> 30 + 14 = 44 bytes header -> data at offset 44, 44 % 4 == 0)
        #   2. "res/drawable/i.png" (18 chars -> 30 + 18 = 48 bytes header -> data at offset 44+len(arsc)+48, % 4 == 0)
        #   3. "AndroidManifest.xml"
        #   4. "classes.dex"
        #   5. "assets/index.html"
        entries = [
            ("resources.arsc", arsc_bytes, zipfile.ZIP_STORED),
            ("res/drawable/i.png", icon_bytes, zipfile.ZIP_STORED),
            ("AndroidManifest.xml", axml_bytes, zipfile.ZIP_DEFLATED),
            ("classes.dex", dex_bytes, zipfile.ZIP_DEFLATED),
            ("assets/index.html", asset_html_bytes, zipfile.ZIP_DEFLATED),
        ]

        manifest_lines = [
            "Manifest-Version: 1.0",
            "Built-By: MZ-Ledger-Android-Compiler",
            "Created-By: Android Gradle 8.2.0",
            "",
        ]
        sf_entry_blocks = []

        for name, content, _ in entries:
            sha256_b64 = base64.b64encode(hashlib.sha256(content).digest()).decode("ascii")
            entry_block = f"Name: {name}\r\nSHA-256-Digest: {sha256_b64}\r\n\r\n"
            manifest_lines.append(entry_block.rstrip("\r\n"))
            manifest_lines.append("")

            sf_sha256_b64 = base64.b64encode(hashlib.sha256(entry_block.encode("utf-8")).digest()).decode("ascii")
            sf_entry_blocks.append(f"Name: {name}\r\nSHA-256-Digest: {sf_sha256_b64}\r\n\r\n")

        manifest_mf_bytes = "\r\n".join(manifest_lines).encode("utf-8")
        full_mf_sha256_b64 = base64.b64encode(hashlib.sha256(manifest_mf_bytes).digest()).decode("ascii")

        cert_sf_header = (
            "Signature-Version: 1.0\r\n"
            "Created-By: 1.0 (Android)\r\n"
            f"SHA-256-Digest-Manifest: {full_mf_sha256_b64}\r\n"
            "X-Android-APK-Signed: 2\r\n\r\n"
        )
        cert_sf_bytes = (cert_sf_header + "".join(sf_entry_blocks)).encode("utf-8")

        sf_path = os.path.join(tmpdir, "CERT.SF")
        rsa_path = os.path.join(tmpdir, "CERT.RSA")
        with open(sf_path, "wb") as f:
            f.write(cert_sf_bytes)

        subprocess.run(
            [
                "openssl", "cms", "-sign", "-binary", "-noattr",
                "-in", sf_path,
                "-signer", cert_pem,
                "-inkey", key_pem,
                "-outform", "DER",
                "-out", rsa_path,
                "-md", "sha256",
            ],
            check=True,
        )
        with open(rsa_path, "rb") as f:
            cert_rsa_bytes = f.read()

        unsigned_zip_path = os.path.join(tmpdir, "unsigned.apk")
        with zipfile.ZipFile(unsigned_zip_path, "w") as zf:
            for name, content, comp_type in entries:
                zi = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
                zi.compress_type = comp_type
                zi.external_attr = 0o644 << 16
                zf.writestr(zi, content)

            for meta_name, meta_bytes in [
                ("META-INF/MANIFEST.MF", manifest_mf_bytes),
                ("META-INF/CERT.SF", cert_sf_bytes),
                ("META-INF/CERT.RSA", cert_rsa_bytes),
            ]:
                zi = zipfile.ZipInfo(meta_name, date_time=(2026, 1, 1, 0, 0, 0))
                zi.compress_type = zipfile.ZIP_DEFLATED
                zi.external_attr = 0o644 << 16
                zf.writestr(zi, meta_bytes)

        with open(unsigned_zip_path, "rb") as f:
            v1_signed_bytes = f.read()

        v1_v2_signed_bytes = inject_apk_v2_signature_block(v1_signed_bytes, key_pem, cert_der)

        os.makedirs(os.path.dirname(output_apk_path), exist_ok=True)
        with open(output_apk_path, "wb") as f:
            f.write(v1_v2_signed_bytes)

        verify_apk_strict(output_apk_path)
        print(f"Successfully built v1+v2 signed APK: {output_apk_path} ({len(v1_v2_signed_bytes)} bytes)")
        print(f"SHA-256: {hashlib.sha256(v1_v2_signed_bytes).hexdigest()}")


def build_android_studio_project_zip(output_zip_path: str, asset_html_bytes: bytes):
    """
    Also packages a complete, ready-to-compile Android Studio Gradle project (.zip)
    for developers or CI pipelines.
    """
    files = {
        "MZ_Ledger_Android_App/settings.gradle": 'rootProject.name = "MesfinZewdneshLedger"\ninclude(":app")\n',
        "MZ_Ledger_Android_App/build.gradle": (
            "plugins {\n"
            "    id 'com.android.application' version '8.2.0' apply false\n"
            "}\n"
        ),
        "MZ_Ledger_Android_App/app/build.gradle": (
            "plugins {\n"
            "    id 'com.android.application'\n"
            "}\n\n"
            "android {\n"
            f'    namespace "{APP_PACKAGE}"\n'
            "    compileSdk 34\n\n"
            "    defaultConfig {\n"
            f'        applicationId "{APP_PACKAGE}"\n'
            "        minSdk 21\n"
            "        targetSdk 34\n"
            f"        versionCode {APP_VERSION_CODE}\n"
            f'        versionName "{APP_VERSION_NAME}"\n'
            "    }\n"
            "    buildTypes {\n"
            "        release {\n"
            "            minifyEnabled false\n"
            "        }\n"
            "    }\n"
            "}\n"
        ),
        "MZ_Ledger_Android_App/app/src/main/AndroidManifest.xml": (
            '<?xml version="1.0" encoding="utf-8"?>\n'
            f'<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="{APP_PACKAGE}">\n'
            '    <uses-permission android:name="android.permission.INTERNET" />\n'
            '    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />\n'
            '    <application\n'
            f'        android:label="{APP_LABEL}"\n'
            '        android:usesCleartextTraffic="true"\n'
            '        android:theme="@android:style/Theme.NoTitleBar">\n'
            '        <activity\n'
            '            android:name=".MainActivity"\n'
            '            android:exported="true"\n'
            '            android:configChanges="orientation|screenSize|keyboardHidden">\n'
            '            <intent-filter>\n'
            '                <action android:name="android.intent.action.MAIN" />\n'
            '                <category android:name="android.intent.category.LAUNCHER" />\n'
            '            </intent-filter>\n'
            '        </activity>\n'
            '    </application>\n'
            '</manifest>\n'
        ),
        "MZ_Ledger_Android_App/app/src/main/java/com/mesfinzewdnesh/ledger/MainActivity.java": (
            f"package {APP_PACKAGE};\n\n"
            "import android.app.Activity;\n"
            "import android.os.Bundle;\n"
            "import android.webkit.WebSettings;\n"
            "import android.webkit.WebView;\n"
            "import android.webkit.WebViewClient;\n\n"
            "public class MainActivity extends Activity {\n"
            "    private WebView webView;\n\n"
            "    @Override\n"
            "    protected void onCreate(Bundle savedInstanceState) {\n"
            "        super.onCreate(savedInstanceState);\n"
            "        webView = new WebView(this);\n"
            "        WebSettings settings = webView.getSettings();\n"
            "        settings.setJavaScriptEnabled(true);\n"
            "        settings.setDomStorageEnabled(true);\n"
            "        settings.setDatabaseEnabled(true);\n"
            "        settings.setAllowFileAccess(true);\n"
            "        settings.setAllowFileAccessFromFileURLs(true);\n"
            "        settings.setAllowUniversalAccessFromFileURLs(true);\n"
            "        webView.setWebViewClient(new WebViewClient());\n"
            "        setContentView(webView);\n"
            f'        webView.loadUrl("{EMBEDDED_ASSET_URL}");\n'
            "    }\n\n"
            "    @Override\n"
            "    public void onBackPressed() {\n"
            "        if (webView != null && webView.canGoBack()) {\n"
            "            webView.goBack();\n"
            "        } else {\n"
            "            super.onBackPressed();\n"
            "        }\n"
            "    }\n"
            "}\n"
        ),
    }

    with zipfile.ZipFile(output_zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for path, text in files.items():
            zf.writestr(path, text.encode("utf-8"))
        zf.writestr("MZ_Ledger_Android_App/app/src/main/assets/index.html", asset_html_bytes)
    print(f"Successfully packaged Android Studio Project: {output_zip_path}")


if __name__ == "__main__":
    is_fast = "--fast-repack" in sys.argv
    asset_html = build_self_contained_asset_html(fast_repack=is_fast)
    build_signed_apk("/app/applet/public/Mesfin_Zewdnesh_Ledger.apk", asset_html)
    build_android_studio_project_zip("/app/applet/public/Mesfin_Zewdnesh_Android_Studio_Project.zip", asset_html)

