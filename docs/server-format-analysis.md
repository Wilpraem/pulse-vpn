# Server Format Analysis

Source: `https://gitverse.ru/api/repos/zieng2/wl/raw/branch/master/list_universal.txt`

The current subscription is a plain text list with 554 non-empty lines. Every line uses the `vless://` URI scheme.

Observed parameters:

- Protocol: `vless`.
- Security: mostly `reality`, some `tls`.
- Transports: `tcp`, `xhttp`, `grpc`, `ws`.
- Reality fields: `pbk`, `sid`, `sni`, `fp`, sometimes `flow=xtls-rprx-vision`.
- Names: URL fragment contains flag, country, provider and number, for example `Germany -- #42` after decoding.

Implementation choice: use sing-box/libbox behind an iOS Packet Tunnel Extension. VLESS Reality and xHTTP are complex and should not be reimplemented in app code.
