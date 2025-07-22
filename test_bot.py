#!/usr/bin/env python3
import os
import sys
from dotenv import load_dotenv
from pymongo import MongoClient
import requests

def test_environment():
    """Test environment configuration"""
    print("🧪 Testing Environment Configuration...")
    
    # Load environment variables
    load_dotenv('.env_telegram')
    
    required_vars = [
        'BOT_TOKEN',
        'NOWPAYMENTS_API_KEY', 
        'IPN_SECRET_KEY',
        'MONGODB_URI'
    ]
    
    missing_vars = []
    for var in required_vars:
        value = os.getenv(var)
        if not value:
            missing_vars.append(var)
        else:
            # Mask sensitive data for display
            if 'TOKEN' in var or 'KEY' in var:
                display_value = value[:8] + '...' + value[-4:]
            else:
                display_value = value
            print(f"✅ {var}: {display_value}")
    
    if missing_vars:
        print(f"❌ Missing variables: {', '.join(missing_vars)}")
        return False
    
    return True

def test_mongodb():
    """Test MongoDB connection"""
    print("\n🗄️  Testing MongoDB Connection...")
    
    try:
        mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        
        # Test connection
        client.server_info()
        print("✅ MongoDB connection successful")
        
        # Test database access
        db = client.hack_academy_bot
        collections = db.list_collection_names()
        print(f"✅ Database access successful. Collections: {collections}")
        
        return True
        
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        return False

def test_telegram_bot():
    """Test Telegram bot token"""
    print("\n🤖 Testing Telegram Bot Token...")
    
    try:
        bot_token = os.getenv('BOT_TOKEN')
        url = f"https://api.telegram.org/bot{bot_token}/getMe"
        
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            bot_info = response.json()
            if bot_info.get('ok'):
                bot_name = bot_info['result']['username']
                print(f"✅ Bot token valid. Bot username: @{bot_name}")
                return True
            else:
                print(f"❌ Bot API error: {bot_info}")
                return False
        else:
            print(f"❌ HTTP error: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Telegram bot test failed: {e}")
        return False

def test_nowpayments():
    """Test NOWPayments API"""
    print("\n💳 Testing NOWPayments API...")
    
    try:
        api_key = os.getenv('NOWPAYMENTS_API_KEY')
        url = "https://api.nowpayments.io/v1/status"
        headers = {"x-api-key": api_key}
        
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            status_data = response.json()
            print(f"✅ NOWPayments API accessible. Status: {status_data.get('message', 'OK')}")
            return True
        else:
            print(f"❌ NOWPayments API error: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ NOWPayments test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Hack Academy Bot Test Suite")
    print("=" * 40)
    
    tests = [
        test_environment,
        test_mongodb,
        test_telegram_bot,
        test_nowpayments
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
    
    print("\n" + "=" * 40)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Bot is ready to run.")
        print("\nTo start the bot:")
        print("python3 start_bot.py")
        return True
    else:
        print("❌ Some tests failed. Please check your configuration.")
        print("\nCommon issues:")
        print("- Check .env_telegram file exists and has correct values")
        print("- Ensure MongoDB is running")
        print("- Verify bot token is valid")
        print("- Check NOWPayments API key")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
