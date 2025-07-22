import os
import sys
import asyncio
from datetime import datetime, timedelta
from pymongo import MongoClient
from dotenv import load_dotenv
import argparse
import logging

# Load environment variables
load_dotenv('.env_telegram')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BotManager:
    def __init__(self):
        self.mongo_client = MongoClient(os.getenv('MONGODB_URI', 'mongodb://localhost:27017/'))
        self.db = self.mongo_client.hack_academy_bot
        self.users_collection = self.db.users
        self.payments_collection = self.db.payments
    
    def get_stats(self):
        """Get bot statistics"""
        total_users = self.users_collection.count_documents({})
        active_subs = self.users_collection.count_documents({'status': 'active'})
        expired_subs = self.users_collection.count_documents({'status': 'expired'})
        total_payments = self.payments_collection.count_documents({})
        successful_payments = self.payments_collection.count_documents({'status': {'$in': ['finished', 'confirmed']}})
        
        # Revenue calculation
        successful_payment_docs = self.payments_collection.find({'status': {'$in': ['finished', 'confirmed']}})
        total_revenue = sum(doc.get('amount', 0) for doc in successful_payment_docs)
        
        print("\n=== Hack Academy Bot Statistics ===")
        print(f"Total Users: {total_users}")
        print(f"Active Subscriptions: {active_subs}")
        print(f"Expired Subscriptions: {expired_subs}")
        print(f"Total Payments: {total_payments}")
        print(f"Successful Payments: {successful_payments}")
        print(f"Total Revenue: ${total_revenue:.2f}")
        print("=" * 35)
    
    def list_users(self, status=None):
        """List users with optional status filter"""
        query = {}
        if status:
            query['status'] = status
        
        users = self.users_collection.find(query).sort('last_interaction', -1)
        
        print(f"\n=== Users {f'({status})' if status else ''} ===")
        for user in users:
            user_id = user.get('user_id')
            username = user.get('username', 'Unknown')
            status = user.get('status', 'unknown')
            plan = user.get('subscription_plan', 'None')
            end_date = user.get('subscription_end', 'N/A')
            
            if end_date != 'N/A':
                end_date = end_date[:10]  # Show only date part
            
            print(f"ID: {user_id} | @{username} | Status: {status} | Plan: {plan} | Expires: {end_date}")
    
    def extend_subscription(self, user_id, days):
        """Extend user subscription by specified days"""
        user = self.users_collection.find_one({'user_id': user_id})
        if not user:
            print(f"User {user_id} not found")
            return
        
        current_end = user.get('subscription_end')
        if current_end:
            current_end_date = datetime.fromisoformat(current_end)
            new_end_date = current_end_date + timedelta(days=days)
        else:
            new_end_date = datetime.now() + timedelta(days=days)
        
        self.users_collection.update_one(
            {'user_id': user_id},
            {
                '$set': {
                    'subscription_end': new_end_date.isoformat(),
                    'status': 'active'
                }
            }
        )
        
        print(f"Extended subscription for user {user_id} by {days} days. New end date: {new_end_date.strftime('%Y-%m-%d')}")
    
    def revoke_access(self, user_id):
        """Revoke user access immediately"""
        result = self.users_collection.update_one(
            {'user_id': user_id},
            {
                '$set': {
                    'status': 'revoked',
                    'revoked_at': datetime.now().isoformat()
                }
            }
        )
        
        if result.modified_count > 0:
            print(f"Access revoked for user {user_id}")
        else:
            print(f"User {user_id} not found")
    
    def cleanup_expired(self):
        """Clean up expired subscriptions"""
        now = datetime.now().isoformat()
        result = self.users_collection.update_many(
            {
                'subscription_end': {'$lt': now},
                'status': 'active'
            },
            {
                '$set': {
                    'status': 'expired',
                    'expired_at': datetime.now().isoformat()
                }
            }
        )
        
        print(f"Cleaned up {result.modified_count} expired subscriptions")
    
    def backup_data(self, filename=None):
        """Create a backup of user and payment data"""
        if not filename:
            filename = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        import json
        
        users = list(self.users_collection.find({}, {'_id': 0}))
        payments = list(self.payments_collection.find({}, {'_id': 0}))
        
        backup_data = {
            'users': users,
            'payments': payments,
            'backup_date': datetime.now().isoformat()
        }
        
        with open(filename, 'w') as f:
            json.dump(backup_data, f, indent=2, default=str)
        
        print(f"Backup created: {filename}")

def main():
    parser = argparse.ArgumentParser(description='Hack Academy Bot Manager')
    parser.add_argument('command', choices=['stats', 'users', 'extend', 'revoke', 'cleanup', 'backup'])
    parser.add_argument('--user-id', type=int, help='User ID for extend/revoke commands')
    parser.add_argument('--days', type=int, help='Days to extend subscription')
    parser.add_argument('--status', choices=['active', 'expired', 'revoked'], help='Filter users by status')
    parser.add_argument('--filename', help='Backup filename')
    
    args = parser.parse_args()
    
    manager = BotManager()
    
    if args.command == 'stats':
        manager.get_stats()
    
    elif args.command == 'users':
        manager.list_users(args.status)
    
    elif args.command == 'extend':
        if not args.user_id or not args.days:
            print("Error: --user-id and --days are required for extend command")
            sys.exit(1)
        manager.extend_subscription(args.user_id, args.days)
    
    elif args.command == 'revoke':
        if not args.user_id:
            print("Error: --user-id is required for revoke command")
            sys.exit(1)
        manager.revoke_access(args.user_id)
    
    elif args.command == 'cleanup':
        manager.cleanup_expired()
    
    elif args.command == 'backup':
        manager.backup_data(args.filename)

if __name__ == "__main__":
    main()
