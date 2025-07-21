#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n🚀 HackHome Academy Backend Setup');
console.log('=====================================\n');

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));

if (majorVersion < 16) {
    console.error('❌ Node.js version 16 or higher is required');
    console.error(`   Current version: ${nodeVersion}`);
    process.exit(1);
}

console.log(`✅ Node.js version check passed (${nodeVersion})`);

// Check if .env exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    console.log('\n📝 Creating .env file...');
    
    const envTemplate = `# HackHome Academy Backend Environment Variables
# ================================================

# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration (Required)
# Get your MongoDB connection string from MongoDB Atlas
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/hackhome?retryWrites=true&w=majority

# JWT Secret (Required - Change this to a secure random string)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# NowPayments API Configuration (Required for payments)
# Get these from https://nowpayments.io/
NOWPAYMENTS_API_KEY=your_nowpayments_api_key
NOWPAYMENTS_IPN_SECRET=your_ipn_secret_key

# URLs
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# ================================================
# Setup Instructions:
# 
# 1. MongoDB Atlas:
#    - Sign up at https://www.mongodb.com/atlas
#    - Create a cluster and get your connection string
#    - Replace MONGO_URI with your connection string
#
# 2. NowPayments:
#    - Sign up at https://nowpayments.io/
#    - Get your API key and IPN secret
#    - Replace NOWPAYMENTS_API_KEY and NOWPAYMENTS_IPN_SECRET
#
# 3. Security:
#    - Generate a strong JWT_SECRET for production
#    - Consider using environment-specific .env files
# ================================================
`;
    
    fs.writeFileSync(envPath, envTemplate);
    console.log('✅ .env file created with template');
} else {
    console.log('✅ .env file already exists');
}

// Check dependencies
console.log('\n📦 Checking dependencies...');
try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    console.log('✅ package.json found');
    
    if (fs.existsSync(path.join(__dirname, 'node_modules'))) {
        console.log('✅ node_modules found');
    } else {
        console.log('📦 Installing dependencies...');
        execSync('npm install', { stdio: 'inherit' });
        console.log('✅ Dependencies installed');
    }
} catch (error) {
    console.error('❌ Error checking dependencies:', error.message);
    process.exit(1);
}

// Check MongoDB connection
console.log('\n🗄️  Testing MongoDB connection...');
require('dotenv').config();

if (!process.env.MONGO_URI || process.env.MONGO_URI.includes('username:password')) {
    console.log('⚠️  MongoDB URI not configured properly');
    console.log('   Please update MONGO_URI in your .env file');
} else {
    console.log('✅ MongoDB URI configured');
}

// Check NowPayments configuration
console.log('\n💳 Checking NowPayments configuration...');
if (!process.env.NOWPAYMENTS_API_KEY || process.env.NOWPAYMENTS_API_KEY.includes('your_')) {
    console.log('⚠️  NowPayments API key not configured');
    console.log('   Please update NOWPAYMENTS_API_KEY in your .env file');
} else {
    console.log('✅ NowPayments API key configured');
}

// Create startup scripts
console.log('\n📜 Setup complete! Next steps:');
console.log('\n1. Configure your environment variables in .env file:');
console.log('   - MongoDB connection string (MONGO_URI)');
console.log('   - NowPayments API credentials');
console.log('   - Strong JWT secret for production');

console.log('\n2. Start the development server:');
console.log('   npm run dev');

console.log('\n3. Or run the test server (no database required):');
console.log('   node test-server.js');

console.log('\n4. Test the API:');
console.log('   curl http://localhost:5000/health');
console.log('   curl http://localhost:5000/api/subscription/plans');

console.log('\n📚 API Documentation available at: http://localhost:5000');

console.log('\n🔐 Default Admin Account (created on first run):');
console.log('   Email: admin@hackhome.com');
console.log('   Password: Admin123!');
console.log('   ⚠️  Change this password immediately!');

console.log('\n💡 Need help? Check the README.md file');
console.log('🎯 Happy coding!\n');

// Offer to start the test server
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Would you like to start the test server now? (y/N): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        console.log('\n🚀 Starting test server...\n');
        try {
            execSync('node test-server.js', { stdio: 'inherit' });
        } catch (error) {
            console.log('\n✅ Server stopped');
        }
    } else {
        console.log('\n👍 Setup complete! Run "npm run dev" when ready.');
    }
    rl.close();
});