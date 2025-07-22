#!/bin/bash

echo "🤖 Hack Academy Bot Setup Script"
echo "================================"

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Installing pip..."
    sudo apt update
    sudo apt install python3-pip -y
fi

echo "✅ pip3 found: $(pip3 --version)"

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip3 install -r requirements.txt

# Check if MongoDB is installed
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB not found. Installing MongoDB..."
    sudo apt update
    sudo apt install mongodb -y
    sudo systemctl start mongodb
    sudo systemctl enable mongodb
    echo "✅ MongoDB installed and started"
else
    echo "✅ MongoDB found"
    sudo systemctl start mongodb
fi

# Setup database
echo "🗄️  Setting up database..."
python3 database_setup.py

# Check environment file
if [ ! -f ".env_telegram" ]; then
    echo "❌ Environment file .env_telegram not found!"
    echo "Please create .env_telegram with your bot credentials."
    exit 1
fi

echo "✅ Environment file found"

# Make scripts executable
chmod +x *.py
chmod +x setup_bot.sh

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Edit .env_telegram with your actual credentials"
echo "2. Get your Telegram channel IDs and update the .env file"
echo "3. Run the bot: python3 start_bot.py"
echo ""
echo "For production deployment:"
echo "sudo cp hack-academy-bot.service /etc/systemd/system/"
echo "sudo systemctl enable hack-academy-bot"
echo "sudo systemctl start hack-academy-bot"
echo ""
echo "Check README_TELEGRAM_BOT.md for detailed instructions!"
