import os
import logging
import hashlib
import hmac
import json
from datetime import datetime, timedelta
from typing import Dict, Any
import requests
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
from pymongo import MongoClient
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.date import DateTrigger

# Load environment variables
load_dotenv('.env_telegram')

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

class HackAcademyBot:
    def __init__(self):
        self.bot_token = os.getenv('BOT_TOKEN')
        self.nowpayments_api_key = os.getenv('NOWPAYMENTS_API_KEY')
        self.ipn_secret = os.getenv('IPN_SECRET_KEY')
        
        # MongoDB setup
        self.mongo_client = MongoClient(os.getenv('MONGODB_URI', 'mongodb://localhost:27017/'))
        self.db = self.mongo_client.hack_academy_bot
        self.users_collection = self.db.users
        self.payments_collection = self.db.payments
        
        # Channel IDs
        self.channels = {
            'beginner': os.getenv('BEGINNER_CHANNEL_ID'),
            'mid': os.getenv('MID_CHANNEL_ID'),
            'complete': os.getenv('COMPLETE_CHANNEL_ID')
        }
        
        # Subscription plans
        self.plans = {
            'beginner': {
                'name': 'Beginner to Mid',
                'price': float(os.getenv('BEGINNER_PRICE', 17.99)),
                'channel': 'beginner'
            },
            'mid': {
                'name': 'Mid to Pro',
                'price': float(os.getenv('MID_PRICE', 24.99)),
                'channel': 'mid'
            },
            'complete': {
                'name': 'Complete Pack',
                'price': float(os.getenv('COMPLETE_PRICE', 19.99)),
                'channel': 'complete'
            }
        }
        
        # Scheduler for handling subscription expiry
        self.scheduler = AsyncIOScheduler()
        
    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /start command"""
        user_id = update.effective_user.id
        username = update.effective_user.username or "Unknown"
        
        # Check if user already has an active subscription
        user_data = self.users_collection.find_one({'user_id': user_id})
        if user_data and user_data.get('subscription_end') and datetime.fromisoformat(user_data['subscription_end']) > datetime.now():
            await update.message.reply_text(
                f"🎉 Welcome back! You already have an active subscription until {user_data['subscription_end'][:10]}"
            )
            return
        
        # Show plan selection
        keyboard = [
            [InlineKeyboardButton("1️⃣ Beginner to Mid - $17.99/month", callback_data="plan_beginner")],
            [InlineKeyboardButton("2️⃣ Mid to Pro - $24.99/month", callback_data="plan_mid")],
            [InlineKeyboardButton("3️⃣ Complete Pack - $19.99/month", callback_data="plan_complete")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        welcome_text = """📚 Welcome to Hack Academy!
Choose your plan:

1️⃣ Beginner to Mid - $17.99/month
2️⃣ Mid to Pro - $24.99/month  
3️⃣ Complete Pack - $19.99/month

⏳ All subscriptions are valid for 30 days
🔄 Auto-renewal available"""
        
        await update.message.reply_text(welcome_text, reply_markup=reply_markup)
        
        # Store user info
        self.users_collection.update_one(
            {'user_id': user_id},
            {
                '$set': {
                    'user_id': user_id,
                    'username': username,
                    'first_seen': datetime.now().isoformat(),
                    'last_interaction': datetime.now().isoformat()
                }
            },
            upsert=True
        )
    
    async def plan_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle plan selection"""
        query = update.callback_query
        await query.answer()
        
        plan_key = query.data.replace('plan_', '')
        if plan_key not in self.plans:
            await query.edit_message_text("❌ Invalid plan selected.")
            return
        
        user_id = update.effective_user.id
        plan = self.plans[plan_key]
        
        # Create payment with NOWPayments
        payment_data = await self.create_nowpayments_payment(user_id, plan_key, plan['price'])
        
        if payment_data:
            # Store payment info
            self.payments_collection.insert_one({
                'user_id': user_id,
                'plan': plan_key,
                'payment_id': payment_data['payment_id'],
                'amount': plan['price'],
                'status': 'waiting',
                'created_at': datetime.now().isoformat(),
                'payment_url': payment_data['invoice_url']
            })
            
            keyboard = [[InlineKeyboardButton("💳 Pay Now", url=payment_data['invoice_url'])]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await query.edit_message_text(
                f"💰 Payment for {plan['name']}\n"
                f"💵 Amount: ${plan['price']}\n"
                f"⏰ Valid for: 30 days\n\n"
                f"Click the button below to complete your payment:",
                reply_markup=reply_markup
            )
        else:
            await query.edit_message_text("❌ Failed to create payment. Please try again later.")
    
    async def create_nowpayments_payment(self, user_id: int, plan: str, amount: float) -> Dict[str, Any]:
        """Create payment with NOWPayments API"""
        try:
            url = "https://api.nowpayments.io/v1/invoice"
            headers = {
                "x-api-key": self.nowpayments_api_key,
                "Content-Type": "application/json"
            }
            
            data = {
                "price_amount": amount,
                "price_currency": "USD",
                "order_id": f"hack_academy_{user_id}_{plan}_{int(datetime.now().timestamp())}",
                "order_description": f"Hack Academy {self.plans[plan]['name']} Subscription",
                "ipn_callback_url": f"{os.getenv('WEBHOOK_URL')}/payment_webhook",
                "success_url": "https://t.me/your_bot_username",
                "cancel_url": "https://t.me/your_bot_username"
            }
            
            response = requests.post(url, headers=headers, json=data)
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"NOWPayments API error: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Error creating payment: {e}")
            return None
    
    async def add_user_to_channel(self, user_id: int, plan: str):
        """Add user to appropriate channel"""
        try:
            channel_id = self.channels[self.plans[plan]['channel']]
            if not channel_id:
                logger.error(f"Channel ID not found for plan: {plan}")
                return False
            
            # Note: You need to make your bot an admin in the channels first
            app = Application.builder().token(self.bot_token).build()
            await app.bot.unban_chat_member(chat_id=channel_id, user_id=user_id)
            
            # Send welcome message to user
            welcome_msg = f"🎉 Welcome to Hack Academy {self.plans[plan]['name']}!\n\n" \
                         f"✅ You now have access to the channel\n" \
                         f"📅 Subscription valid until: {(datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')}\n" \
                         f"🔄 You'll receive a reminder before expiry"
            
            await app.bot.send_message(chat_id=user_id, text=welcome_msg)
            return True
            
        except Exception as e:
            logger.error(f"Error adding user to channel: {e}")
            return False
    
    async def remove_user_from_channel(self, user_id: int, plan: str):
        """Remove user from channel"""
        try:
            channel_id = self.channels[self.plans[plan]['channel']]
            if not channel_id:
                return False
            
            app = Application.builder().token(self.bot_token).build()
            await app.bot.ban_chat_member(chat_id=channel_id, user_id=user_id)
            
            return True
            
        except Exception as e:
            logger.error(f"Error removing user from channel: {e}")
            return False
    
    async def handle_successful_payment(self, user_id: int, plan: str):
        """Handle successful payment verification"""
        try:
            # Add user to channel
            success = await self.add_user_to_channel(user_id, plan)
            
            if success:
                # Update user subscription
                subscription_end = datetime.now() + timedelta(days=30)
                self.users_collection.update_one(
                    {'user_id': user_id},
                    {
                        '$set': {
                            'subscription_plan': plan,
                            'subscription_start': datetime.now().isoformat(),
                            'subscription_end': subscription_end.isoformat(),
                            'status': 'active'
                        }
                    }
                )
                
                # Schedule subscription expiry
                self.scheduler.add_job(
                    self.handle_subscription_expiry,
                    DateTrigger(run_date=subscription_end),
                    args=[user_id, plan],
                    id=f"expiry_{user_id}_{plan}"
                )
                
                logger.info(f"Successfully activated subscription for user {user_id}, plan {plan}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error handling successful payment: {e}")
            return False
    
    async def handle_subscription_expiry(self, user_id: int, plan: str):
        """Handle subscription expiry"""
        try:
            # Remove user from channel
            await self.remove_user_from_channel(user_id, plan)
            
            # Update user status
            self.users_collection.update_one(
                {'user_id': user_id},
                {
                    '$set': {
                        'status': 'expired',
                        'expired_at': datetime.now().isoformat()
                    }
                }
            )
            
            # Send recharge message
            keyboard = [
                [InlineKeyboardButton("1️⃣ Beginner to Mid", callback_data="plan_beginner")],
                [InlineKeyboardButton("2️⃣ Mid to Pro", callback_data="plan_mid")],
                [InlineKeyboardButton("3️⃣ Complete Pack", callback_data="plan_complete")]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            app = Application.builder().token(self.bot_token).build()
            await app.bot.send_message(
                chat_id=user_id,
                text="🚨 Your subscription expired!\n🔄 Recharge your plan below:",
                reply_markup=reply_markup
            )
            
            logger.info(f"Handled subscription expiry for user {user_id}")
            
        except Exception as e:
            logger.error(f"Error handling subscription expiry: {e}")
    
    async def status_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /status command"""
        user_id = update.effective_user.id
        user_data = self.users_collection.find_one({'user_id': user_id})
        
        if not user_data:
            await update.message.reply_text("❌ No subscription found. Use /start to subscribe.")
            return
        
        if user_data.get('status') == 'active':
            end_date = datetime.fromisoformat(user_data['subscription_end'])
            days_left = (end_date - datetime.now()).days
            
            status_text = f"✅ Active Subscription\n" \
                         f"📋 Plan: {self.plans[user_data['subscription_plan']]['name']}\n" \
                         f"📅 Expires: {end_date.strftime('%Y-%m-%d')}\n" \
                         f"⏰ Days left: {days_left}"
        else:
            status_text = "❌ No active subscription\n🔄 Use /start to subscribe"
        
        await update.message.reply_text(status_text)
    
    def run(self):
        """Run the bot"""
        # Start scheduler
        self.scheduler.start()
        
        # Create application
        application = Application.builder().token(self.bot_token).build()
        
        # Add handlers
        application.add_handler(CommandHandler("start", self.start_command))
        application.add_handler(CommandHandler("status", self.status_command))
        application.add_handler(CallbackQueryHandler(self.plan_callback, pattern="^plan_"))
        
        # Start the bot
        logger.info("Starting Hack Academy Bot...")
        application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    bot = HackAcademyBot()
    bot.run()
