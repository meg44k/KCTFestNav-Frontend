#!/usr/bin/env bash
# 開発用HTTPS証明書を、今つながっているネットワークのLAN IP入りで発行する。
# スマホ実機でコンパス(DeviceOrientation/Geolocation)を試すには HTTPS が必須で、
# 証明書のSANに現在のLAN IPが入っていないと証明書エラーになるため。
# ルートCAは使い回すので、スマホ側の「CAを信頼」は最初の1回だけで済む。
set -euo pipefail

cd "$(dirname "$0")/.."
CERT_DIR="certificates"
mkdir -p "$CERT_DIR"

# 現在のLAN IP (Wi-Fi優先、なければ有線)
IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
if [ -z "$IP" ]; then
  echo "[gen-cert] LAN IPが取得できませんでした。localhostのみで発行します。" >&2
  SAN="DNS:localhost,IP:127.0.0.1,IP:::1"
else
  SAN="DNS:localhost,IP:127.0.0.1,IP:::1,IP:${IP}"
fi

# ルートCA (無ければ作る。既にあれば使い回す)
if [ ! -f "$CERT_DIR/rootCA.pem" ]; then
  echo "[gen-cert] ルートCAを新規作成します"
  openssl req -x509 -newkey rsa:2048 -sha256 -days 3650 -nodes \
    -keyout "$CERT_DIR/rootCA-key.pem" -out "$CERT_DIR/rootCA.pem" \
    -subj "/CN=KCTFestNav Dev CA/O=KCTFestNav Dev" \
    -addext "basicConstraints=critical,CA:TRUE,pathlen:0" \
    -addext "keyUsage=critical,keyCertSign,cRLSign" 2>/dev/null
  chmod 600 "$CERT_DIR/rootCA-key.pem"
fi

# サーバ証明書 (有効期限397日: これを超えるとiOS/Safariが信頼しない)
openssl req -newkey rsa:2048 -nodes \
  -keyout "$CERT_DIR/localhost-key.pem" -out "$CERT_DIR/localhost.csr" \
  -subj "/CN=localhost" 2>/dev/null
openssl x509 -req -in "$CERT_DIR/localhost.csr" -days 397 -sha256 \
  -CA "$CERT_DIR/rootCA.pem" -CAkey "$CERT_DIR/rootCA-key.pem" -CAcreateserial \
  -out "$CERT_DIR/localhost.pem" \
  -extfile <(printf "subjectAltName=%s\nbasicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n" "$SAN") 2>/dev/null
rm -f "$CERT_DIR/localhost.csr"
chmod 600 "$CERT_DIR/localhost-key.pem"

# Next.jsのクロスオリジン開発アクセス許可も今のIPに合わせる
ORIGINS="localhost${IP:+,$IP}"
if [ -f .env.local ] && grep -q '^ALLOWED_DEV_ORIGINS=' .env.local; then
  sed -i '' "s|^ALLOWED_DEV_ORIGINS=.*|ALLOWED_DEV_ORIGINS=${ORIGINS}|" .env.local
else
  printf 'ALLOWED_DEV_ORIGINS=%s\n' "$ORIGINS" >> .env.local
fi

echo "[gen-cert] SAN: $SAN"
echo "[gen-cert] ALLOWED_DEV_ORIGINS: $ORIGINS"
