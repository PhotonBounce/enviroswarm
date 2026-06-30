#!/usr/bin/env bash
set -euo pipefail

# ENViroSwarm One-Command Setup
# Usage: curl -s https://raw.githubusercontent.com/PhotonBounce/enviroswarm/main/scripts/setup.sh | bash
# OR: ./scripts/setup.sh

REPO_URL="https://github.com/PhotonBounce/enviroswarm.git"
INSTALL_DIR="/opt/enviroswarm"
MIN_PYTHON="3.11"
MIN_NODE="20"

echo "🌍 ENViroSwarm Setup Script"
echo "============================"

# Check OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
else
    echo "⚠️  This script is designed for Linux/macOS. For Windows, use WSL or manual setup."
    exit 1
fi

# Check Python
if ! command -v python3 &>/dev/null; then
    echo "❌ Python 3 is required. Please install Python $MIN_PYTHON or higher."
    exit 1
fi
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "✅ Python $PYTHON_VERSION found"

# Check Node.js
if ! command -v node &>/dev/null; then
    echo "❌ Node.js is required. Please install Node $MIN_NODE or higher."
    exit 1
fi
NODE_VERSION=$(node --version 2>&1 | tr -d 'v')
echo "✅ Node.js $NODE_VERSION found"

# Check Docker
if ! command -v docker &>/dev/null; then
    echo "⚠️  Docker not found. You can still develop without it, but production deployment requires Docker."
else
    echo "✅ Docker found"
fi

# Check Git
if ! command -v git &>/dev/null; then
    echo "❌ Git is required."
    exit 1
fi
echo "✅ Git found"

# Clone or update repo
if [ -d "$INSTALL_DIR" ]; then
    echo "📁 $INSTALL_DIR exists. Pulling latest changes..."
    cd "$INSTALL_DIR"
    git pull origin main
else
    echo "📦 Cloning repository to $INSTALL_DIR..."
    sudo mkdir -p "$(dirname $INSTALL_DIR)"
    sudo git clone "$REPO_URL" "$INSTALL_DIR"
    sudo chown -R "$(whoami):$(whoami)" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# Install backend dependencies
echo "🐍 Installing Python dependencies..."
cd "$INSTALL_DIR/backend"
pip install -r requirements.txt

# Install web dashboard dependencies
echo "⚛️  Installing web dashboard dependencies..."
cd "$INSTALL_DIR/web-dashboard"
npm install

# Install Android app dependencies
echo "📱 Installing Android app dependencies..."
cd "$INSTALL_DIR/android-app"
npm install

# Install data pipeline dependencies
echo "🌱 Installing data pipeline dependencies..."
cd "$INSTALL_DIR/data-pipeline"
pip install -r requirements.txt

# Make scripts executable
echo "🔧 Setting up scripts..."
chmod +x "$INSTALL_DIR/scripts/"*.sh

# Create .env files if they don't exist
if [ ! -f "$INSTALL_DIR/backend/.env" ]; then
    echo "📝 Creating backend .env file..."
    cp "$INSTALL_DIR/backend/.env.example" "$INSTALL_DIR/backend/.env"
    echo "⚠️  Please edit $INSTALL_DIR/backend/.env with your secrets before running!"
fi

if [ ! -f "$INSTALL_DIR/web-dashboard/.env" ]; then
    echo "📝 Creating web dashboard .env file..."
    cp "$INSTALL_DIR/web-dashboard/.env.example" "$INSTALL_DIR/web-dashboard/.env"
fi

if [ ! -f "$INSTALL_DIR/android-app/.env" ]; then
    echo "📝 Creating Android app .env file..."
    cp "$INSTALL_DIR/android-app/.env.example" "$INSTALL_DIR/android-app/.env"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit backend/.env with your database and secret keys"
echo "  2. Start development: cd $INSTALL_DIR && make dev"
echo "  3. Or start services individually: make backend, make web, make android"
echo "  4. Seed demo data: make data"
echo "  5. Run tests: make test"
echo ""
echo "For production deployment, see: docs/DEPLOYMENT.md"