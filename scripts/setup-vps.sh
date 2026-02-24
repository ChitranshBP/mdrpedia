#!/bin/bash
# =============================================================================
# MDRPedia — Hostinger VPS One-Time Setup Script
# Run as root or with sudo on a fresh Ubuntu 22.04 VPS
# Usage: bash scripts/setup-vps.sh
# =============================================================================

set -e

REPO_URL="https://github.com/YOUR_USERNAME/mdrpedia.git"  # <-- Update this
APP_DIR="/var/www/mdrpedia"
NODE_VERSION="20"

echo "=========================================="
echo "  MDRPedia VPS Setup"
echo "=========================================="

# --- 1. System Update ---
echo "[1/9] Updating system packages..."
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git ufw nginx

# --- 2. Install Node.js ---
echo "[2/9] Installing Node.js $NODE_VERSION..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt-get install -y nodejs
node -v && npm -v

# --- 3. Install PM2 ---
echo "[3/9] Installing PM2..."
npm install -g pm2
pm2 startup systemd -u root --hp /root
systemctl enable pm2-root

# --- 4. Configure Firewall ---
echo "[4/9] Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status

# --- 5. Clone Repository ---
echo "[5/9] Cloning repository to $APP_DIR..."
mkdir -p /var/www
if [ -d "$APP_DIR" ]; then
    echo "Directory exists, pulling latest..."
    cd "$APP_DIR" && git pull
else
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# --- 6. Environment Setup ---
echo "[6/9] Setting up environment..."
cd "$APP_DIR"
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo ""
    echo "  *** ACTION REQUIRED ***"
    echo "  Edit the .env file with your real credentials:"
    echo "  nano $APP_DIR/.env"
    echo ""
    read -p "  Press ENTER after you've filled in .env to continue..."
fi

# --- 7. Install Dependencies & Build ---
echo "[7/9] Installing dependencies and building..."
cd "$APP_DIR"
npm ci
npx prisma generate
npm run build

# --- 8. Start App with PM2 ---
echo "[8/9] Starting app with PM2..."
cd "$APP_DIR"
pm2 start ecosystem.config.cjs
pm2 save

# --- 9. Configure Nginx ---
echo "[9/9] Configuring Nginx..."
cp "$APP_DIR/nginx.conf" /etc/nginx/sites-available/mdrpedia
ln -sf /etc/nginx/sites-available/mdrpedia /etc/nginx/sites-enabled/mdrpedia
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo ""
echo "=========================================="
echo "  Setup complete!"
echo ""
echo "  Next steps:"
echo "  1. Point your domain DNS to this server's IP"
echo "  2. Install SSL certificate:"
echo "     apt-get install certbot python3-certbot-nginx -y"
echo "     certbot --nginx -d mdrpedia.com -d www.mdrpedia.com"
echo ""
echo "  App running at: http://$(curl -s ifconfig.me)"
echo "  PM2 status:     pm2 list"
echo "  App logs:       pm2 logs mdrpedia"
echo "=========================================="
