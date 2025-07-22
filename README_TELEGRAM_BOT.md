# 🤖 Hack Academy Telegram Bot

A fully automated Telegram subscription bot with NOWPayments integration for managing premium channel access.

## 🚀 Features

- **Automated Subscription Management**: 30-day subscriptions with auto-expiry
- **Payment Processing**: NOWPayments integration with webhook verification
- **Channel Access Control**: Automatic user addition/removal from channels
- **Multiple Plans**: Beginner to Mid, Mid to Pro, Complete Pack
- **Admin Dashboard**: Statistics and user management
- **Database Backup**: Data protection and recovery

## 📋 Prerequisites

- Python 3.8+
- MongoDB (local or cloud)
- Telegram Bot Token
- NOWPayments API credentials
- Telegram channels (with bot as admin)

## 🛠️ Installation

1. **Clone and Setup**
```bash
# Install Python dependencies
pip install -r requirements.txt

# Copy and configure environment file
cp .env_telegram .env_telegram_production
```

2. **Configure Environment Variables**
Edit `.env_telegram_production`:
```env
# Telegram Bot Configuration
BOT_TOKEN=7921832682:AAHyLFNQgmx8xUTybcKrFNmXtpjFS6diGxk

# NOWPayments Configuration
NOWPAYMENTS_API_KEY=2WDFYSA-H2149PC-PKB0DSW-JMHE2G2
IPN_SECRET_KEY=iuCB1YPQYSy24o04P7q1tdLK6odWGJ+b

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/hack_academy_bot

# Flask Configuration
FLASK_PORT=5000
WEBHOOK_URL=https://your-domain.com/webhook

# Channel IDs (get these from Telegram)
BEGINNER_CHANNEL_ID=-1001234567890
MID_CHANNEL_ID=-1001234567891
COMPLETE_CHANNEL_ID=-1001234567892

# Subscription Plans
BEGINNER_PRICE=17.99
MID_PRICE=24.99
COMPLETE_PRICE=19.99
```

3. **Setup MongoDB**
```bash
# Install MongoDB (Ubuntu/Debian)
sudo apt update
sudo apt install mongodb

# Start MongoDB service
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in .env file
```

4. **Get Channel IDs**
```bash
# Add your bot to each channel as admin
# Forward a message from each channel to @userinfobot
# Copy the channel IDs (they start with -100)
```

## 🚀 Running the Bot

### Development Mode
```bash
# Start the bot
python start_bot.py
```

### Production Mode
```bash
# Using systemd (recommended)
sudo cp hack-academy-bot.service /etc/systemd/system/
sudo systemctl enable hack-academy-bot
sudo systemctl start hack-academy-bot

# Check status
sudo systemctl status hack-academy-bot
```

### Using PM2 (Alternative)
```bash
# Install PM2
npm install -g pm2

# Start bot
pm2 start start_bot.py --name "hack-academy-bot" --interpreter python3

# Check status
pm2 status
pm2 logs hack-academy-bot
```

## 🔧 Bot Management

### View Statistics
```bash
python bot_manager.py stats
```

### List Users
```bash
# All users
python bot_manager.py users

# Active subscriptions only
python bot_manager.py users --status active

# Expired subscriptions
python bot_manager.py users --status expired
```

### Extend Subscription
```bash
# Extend user subscription by 30 days
python bot_manager.py extend --user-id 123456789 --days 30
```

### Revoke Access
```bash
# Immediately revoke user access
python bot_manager.py revoke --user-id 123456789
```

### Cleanup Expired Subscriptions
```bash
# Mark expired subscriptions as expired
python bot_manager.py cleanup
```

### Backup Data
```bash
# Create backup
python bot_manager.py backup

# Custom filename
python bot_manager.py backup --filename my_backup.json
```

## 🌐 Webhook Setup

### Local Development (ngrok)
```bash
# Install ngrok
# Download from https://ngrok.com/

# Expose local port
ngrok http 5000

# Update WEBHOOK_URL in .env with ngrok URL
WEBHOOK_URL=https://abc123.ngrok.io
```

### Production Deployment

#### Option 1: VPS with Nginx
```bash
# Install Nginx
sudo apt install nginx

# Configure Nginx (create /etc/nginx/sites-available/hack-academy)
server {
    listen 80;
    server_name your-domain.com;
    
    location /webhook {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/hack-academy /etc/nginx/sites-enabled/
sudo systemctl reload nginx
```

#### Option 2: Heroku
```bash
# Create Procfile
echo "web: python start_bot.py" > Procfile

# Deploy to Heroku
heroku create your-app-name
heroku config:set BOT_TOKEN=your_token
heroku config:set NOWPAYMENTS_API_KEY=your_key
# ... set all environment variables
git push heroku main
```

#### Option 3: Railway/Render
- Upload your code to GitHub
- Connect to Railway/Render
- Set environment variables
- Deploy

## 🔐 Security Setup

### NOWPayments Configuration
1. Login to NOWPayments dashboard
2. Go to Settings → API Keys
3. Create new API key
4. Set IPN URL: `https://your-domain.com/payment_webhook`
5. Copy IPN Secret Key

### Telegram Bot Setup
1. Message @BotFather on Telegram
2. Create new bot: `/newbot`
3. Get bot token
4. Set webhook: `/setwebhook`
5. Add bot to channels as admin

## 📊 Monitoring

### Health Check
```bash
curl https://your-domain.com/health
```

### Statistics API
```bash
curl https://your-domain.com/stats
```

### Logs
```bash
# Systemd logs
sudo journalctl -u hack-academy-bot -f

# PM2 logs
pm2 logs hack-academy-bot

# File logs
tail -f bot.log
```

## 🛠️ Troubleshooting

### Common Issues

1. **Bot not responding**
   - Check bot token
   - Verify webhook URL
   - Check internet connection

2. **Payments not processing**
   - Verify NOWPayments API key
   - Check IPN secret key
   - Ensure webhook URL is accessible

3. **Users not added to channels**
   - Make bot admin in channels
   - Check channel IDs
   - Verify bot permissions

4. **Database connection issues**
   - Check MongoDB service status
   - Verify connection string
   - Check firewall settings

### Debug Mode
```bash
# Enable debug logging
export PYTHONPATH=.
export DEBUG=1
python telegram_bot.py
```

## 📝 File Structure

```
hack-academy-bot/
├── telegram_bot.py          # Main bot logic
├── webhook_server.py        # Flask webhook server
├── database_setup.py        # Database initialization
├── bot_manager.py          # Admin management tools
├── start_bot.py            # Startup script
├── requirements.txt        # Python dependencies
├── .env_telegram          # Environment configuration
├── README_TELEGRAM_BOT.md # This file
└── logs/                  # Log files
```

## 🔄 Bot Commands

### User Commands
- `/start` - Show subscription plans
- `/status` - Check subscription status

### Admin Commands (add to bot_manager.py)
- `stats` - View bot statistics
- `users` - List all users
- `extend` - Extend user subscription
- `revoke` - Revoke user access
- `cleanup` - Clean expired subscriptions
- `backup` - Create data backup

## 💰 Subscription Plans

1. **Beginner to Mid** - $17.99/month
2. **Mid to Pro** - $24.99/month
3. **Complete Pack** - $19.99/month

All subscriptions are valid for 30 days with automatic expiry.

## 🤝 Support

For issues and support:
1. Check logs for error messages
2. Verify all configuration settings
3. Test webhook connectivity
4. Check NOWPayments dashboard

## 📄 License

This project is for educational purposes. Ensure compliance with Telegram's Terms of Service and local regulations.
