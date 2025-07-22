import os
import hashlib
import hmac
import json
import asyncio
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from pymongo import MongoClient
from telegram import Bot
import logging

# Load environment variables
load_dotenv('.env_telegram')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# MongoDB setup
mongo_client = MongoClient(os.getenv('MONGODB_URI', 'mongodb://localhost:27017/'))
db = mongo_client.hack_academy_bot
users_collection = db.users
payments_collection = db.payments

# Telegram Bot setup
bot_token = os.getenv('BOT_TOKEN')
bot = Bot(token=bot_token)

# Channel IDs
channels = {
    'beginner': os.getenv('BEGINNER_CHANNEL_ID'),
    'mid': os.getenv('MID_CHANNEL_ID'),
    'complete': os.getenv('COMPLETE_CHANNEL_ID')
}

# Subscription plans
plans = {
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

def verify_ipn_signature(data: str, signature: str) -> bool:
    """Verify NOWPayments IPN signature"""
    try:
        secret_key = os.getenv('IPN_SECRET_KEY').encode()
        expected_signature = hmac.new(secret_key, data.encode(), hashlib.sha512).hexdigest()
        return hmac.compare_digest(signature, expected_signature)
    except Exception as e:
        logger.error(f"Error verifying signature: {e}")
        return False

async def add_user_to_channel(user_id: int, plan: str):
    """Add user to appropriate channel"""
    try:
        channel_id = channels[plans[plan]['channel']]
        if not channel_id:
            logger.error(f"Channel ID not found for plan: {plan}")
            return False
        
        # Unban user (in case they were previously banned)
        await bot.unban_chat_member(chat_id=channel_id, user_id=user_id)
        
        # Send welcome message to user
        welcome_msg = f"🎉 Welcome to Hack Academy {plans[plan]['name']}!\n\n" \
                     f"✅ You now have access to the channel\n" \
                     f"📅 Subscription valid until: {(datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')}\n" \
                     f"🔄 You'll receive a reminder before expiry"
        
        await bot.send_message(chat_id=user_id, text=welcome_msg)
        return True
        
    except Exception as e:
        logger.error(f"Error adding user to channel: {e}")
        return False

async def handle_successful_payment(user_id: int, plan: str):
    """Handle successful payment verification"""
    try:
        # Add user to channel
        success = await add_user_to_channel(user_id, plan)
        
        if success:
            # Update user subscription
            subscription_end = datetime.now() + timedelta(days=30)
            users_collection.update_one(
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
            
            logger.info(f"Successfully activated subscription for user {user_id}, plan {plan}")
            return True
        
        return False
        
    except Exception as e:
        logger.error(f"Error handling successful payment: {e}")
        return False

@app.route('/payment_webhook', methods=['POST'])
def payment_webhook():
    """Handle NOWPayments webhook"""
    try:
        # Get signature from headers
        signature = request.headers.get('x-nowpayments-sig')
        if not signature:
            logger.error("No signature found in webhook")
            return jsonify({'error': 'No signature'}), 400
        
        # Get raw data
        raw_data = request.get_data(as_text=True)
        
        # Verify signature
        if not verify_ipn_signature(raw_data, signature):
            logger.error("Invalid signature in webhook")
            return jsonify({'error': 'Invalid signature'}), 400
        
        # Parse webhook data
        webhook_data = request.get_json()
        logger.info(f"Received webhook: {webhook_data}")
        
        payment_status = webhook_data.get('payment_status')
        order_id = webhook_data.get('order_id')
        
        if not order_id:
            logger.error("No order_id in webhook")
            return jsonify({'error': 'No order_id'}), 400
        
        # Parse order_id to get user_id and plan
        try:
            parts = order_id.split('_')
            if len(parts) >= 4 and parts[0] == 'hack' and parts[1] == 'academy':
                user_id = int(parts[2])
                plan = parts[3]
            else:
                logger.error(f"Invalid order_id format: {order_id}")
                return jsonify({'error': 'Invalid order_id format'}), 400
        except (ValueError, IndexError) as e:
            logger.error(f"Error parsing order_id {order_id}: {e}")
            return jsonify({'error': 'Error parsing order_id'}), 400
        
        # Update payment status in database
        payments_collection.update_one(
            {'payment_id': webhook_data.get('payment_id')},
            {
                '$set': {
                    'status': payment_status,
                    'webhook_data': webhook_data,
                    'updated_at': datetime.now().isoformat()
                }
            }
        )
        
        # Handle successful payment
        if payment_status in ['finished', 'confirmed']:
            logger.info(f"Payment confirmed for user {user_id}, plan {plan}")
            
            # Run async function in new event loop
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                success = loop.run_until_complete(
                    handle_successful_payment(user_id, plan)
                )
                if success:
                    logger.info(f"Successfully processed payment for user {user_id}")
                else:
                    logger.error(f"Failed to process payment for user {user_id}")
            finally:
                loop.close()
        
        elif payment_status in ['failed', 'refunded', 'expired']:
            logger.info(f"Payment {payment_status} for user {user_id}, plan {plan}")
            # You might want to notify the user about failed payment
        
        return jsonify({'status': 'success'}), 200
        
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'}), 200

@app.route('/stats', methods=['GET'])
def get_stats():
    """Get bot statistics"""
    try:
        total_users = users_collection.count_documents({})
        active_subs = users_collection.count_documents({'status': 'active'})
        total_payments = payments_collection.count_documents({})
        successful_payments = payments_collection.count_documents({'status': {'$in': ['finished', 'confirmed']}})
        
        stats = {
            'total_users': total_users,
            'active_subscriptions': active_subs,
            'total_payments': total_payments,
            'successful_payments': successful_payments
        }
        
        return jsonify(stats), 200
        
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        return jsonify({'error': 'Error getting stats'}), 500

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
