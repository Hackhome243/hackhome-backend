import os
from pymongo import MongoClient, ASCENDING
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv('.env_telegram')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def setup_database():
    """Setup MongoDB database and collections"""
    try:
        # Connect to MongoDB
        mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
        client = MongoClient(mongo_uri)
        db = client.hack_academy_bot
        
        # Create collections
        users_collection = db.users
        payments_collection = db.payments
        
        # Create indexes for better performance
        logger.info("Creating database indexes...")
        
        # Users collection indexes
        users_collection.create_index([("user_id", ASCENDING)], unique=True)
        users_collection.create_index([("subscription_end", ASCENDING)])
        users_collection.create_index([("status", ASCENDING)])
        
        # Payments collection indexes
        payments_collection.create_index([("user_id", ASCENDING)])
        payments_collection.create_index([("payment_id", ASCENDING)], unique=True)
        payments_collection.create_index([("status", ASCENDING)])
        payments_collection.create_index([("created_at", ASCENDING)])
        
        logger.info("Database setup completed successfully!")
        
        # Test the connection
        logger.info(f"Connected to MongoDB: {client.server_info()['version']}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error setting up database: {e}")
        return False

if __name__ == "__main__":
    setup_database()
