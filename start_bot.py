#!/usr/bin/env python3
import os
import sys
import subprocess
import threading
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env_telegram')

def run_telegram_bot():
    """Run the Telegram bot"""
    print("Starting Telegram Bot...")
    subprocess.run([sys.executable, "telegram_bot.py"])

def run_webhook_server():
    """Run the webhook server"""
    print("Starting Webhook Server...")
    subprocess.run([sys.executable, "webhook_server.py"])

def main():
    print("=== Hack Academy Bot Startup ===")
    print("Starting both Telegram bot and webhook server...")
    
    # Check if required environment variables are set
    required_vars = ['BOT_TOKEN', 'NOWPAYMENTS_API_KEY', 'IPN_SECRET_KEY']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"Error: Missing required environment variables: {', '.join(missing_vars)}")
        print("Please check your .env_telegram file")
        sys.exit(1)
    
    # Setup database
    print("Setting up database...")
    try:
        from database_setup import setup_database
        if not setup_database():
            print("Failed to setup database")
            sys.exit(1)
    except Exception as e:
        print(f"Database setup error: {e}")
        sys.exit(1)
    
    print("Database setup completed!")
    
    # Start webhook server in a separate thread
    webhook_thread = threading.Thread(target=run_webhook_server, daemon=True)
    webhook_thread.start()
    
    # Wait a moment for webhook server to start
    time.sleep(2)
    
    # Start Telegram bot (main thread)
    try:
        run_telegram_bot()
    except KeyboardInterrupt:
        print("\nShutting down...")
        sys.exit(0)

if __name__ == "__main__":
    main()
