# 🚀 HackHome Academy Backend

A complete Node.js backend API for a crypto-based video streaming subscription platform with three subscription tiers and NowPayments integration.

## 📚 Tech Stack

- **Backend Framework**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM  
- **Authentication**: JWT (JSON Web Tokens)
- **Password Security**: bcrypt.js with salt rounds = 10
- **Payment Processing**: NowPayments API for crypto payments
- **Input Validation**: express-validator
- **Environment Management**: dotenv

## 🔐 Subscription Plans

| Plan | Price | Access Level | Features |
|------|-------|--------------|----------|
| **Beginner** | $17.99/month | 0-50 content | Basic learning materials |
| **Advanced** | $24.99/month | 50-100 content | Advanced topics |
| **Complete** | $19.99/month | 0-100 content | **Popular!** Full access |

## 🚀 Quick Start

### Prerequisites
- Node.js (>=16.0.0)
- MongoDB Atlas account or local MongoDB
- NowPayments API account

### Installation

1. **Clone and install dependencies**
```bash
git clone <repository-url>
cd hackhome-backend
npm install
```

2. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your configurations
```

3. **Start the development server**
```bash
# Development with auto-reload
npm run dev

# Production
npm start
```

### Environment Variables

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key
NOWPAYMENTS_API_KEY=your_nowpayments_api_key
NOWPAYMENTS_IPN_SECRET=your_ipn_secret_key
NODE_ENV=development
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000
```

## 📡 API Endpoints

### Base URL: `http://localhost:5000`

### 🔐 Authentication Routes (`/api/auth`)

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com", 
  "password": "MyPassword123"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter  
- At least 1 number

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "MyPassword123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <jwt_token>
```

### 💳 Subscription Routes (`/api/subscription`)

#### Get Available Plans
```http
GET /api/subscription/plans
```

#### Start Subscription Payment
```http
POST /api/subscription/start
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "plan": "complete"
}
```

#### Get Payment Status
```http
GET /api/subscription/payment/{paymentId}
Authorization: Bearer <jwt_token>
```

#### Get Payment History
```http
GET /api/subscription/payments
Authorization: Bearer <jwt_token>
```

#### IPN Callback (NowPayments)
```http
POST /api/subscription/ipn
X-Nowpayments-Sig: <signature>
Content-Type: application/json

{
  "payment_id": "payment_id",
  "payment_status": "finished",
  "pay_amount": 0.001,
  "actually_paid": 0.001
}
```

### 📺 Video Routes (`/api/videos`)

#### Get User's Videos
```http
GET /api/videos
Authorization: Bearer <jwt_token>
```

#### Get Single Video
```http
GET /api/videos/{videoId}
Authorization: Bearer <jwt_token>
```

#### Get Videos by Plan
```http
GET /api/videos/plan/{plan}
Authorization: Bearer <jwt_token>
```

#### Search Videos
```http
GET /api/videos/search?q=tutorial&plan=beginner
Authorization: Bearer <jwt_token>
```

### 👑 Admin Routes (`/api/admin`)

*All admin routes require authentication + admin privileges*

#### Add Video
```http
POST /api/admin/video
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "title": "Advanced React Tutorial",
  "description": "Learn advanced React concepts",
  "url": "https://example.com/video.mp4",
  "planRequired": "advanced",
  "duration": 3600,
  "thumbnail": "https://example.com/thumb.jpg"
}
```

#### Update Video
```http
PUT /api/admin/video/{videoId}
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "title": "Updated Title",
  "isActive": true
}
```

#### Delete Video
```http
DELETE /api/admin/video/{videoId}
Authorization: Bearer <admin_jwt_token>
```

#### Get All Videos (Admin View)
```http
GET /api/admin/videos?page=1&limit=10&plan=beginner&search=tutorial
Authorization: Bearer <admin_jwt_token>
```

#### Get All Users
```http
GET /api/admin/users?page=1&limit=10&subscription=complete
Authorization: Bearer <admin_jwt_token>
```

#### Update User Subscription
```http
PUT /api/admin/user/{userId}/subscription
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "subscription": "complete",
  "subscriptionExpiry": "2024-12-31T23:59:59.000Z"
}
```

#### Get Dashboard Statistics
```http
GET /api/admin/stats
Authorization: Bearer <admin_jwt_token>
```

#### Get All Payments
```http
GET /api/admin/payments?page=1&limit=10&status=finished&plan=complete
Authorization: Bearer <admin_jwt_token>
```

## 🔒 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

Tokens expire after 30 days and are automatically generated upon login/registration.

## 📊 Response Format

All API responses follow this consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful", 
  "data": { /* response data */ },
  "count": 10, // for list endpoints
  "page": 1,   // for paginated endpoints
  "pages": 5   // for paginated endpoints
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ /* validation errors if any */ ]
}
```

## 🛡️ Security Features

- **Password Hashing**: bcrypt with salt rounds = 10
- **JWT Authentication**: Secure token-based auth
- **Input Validation**: express-validator for all inputs
- **CORS Protection**: Configurable cross-origin requests
- **Admin Authorization**: Role-based access control
- **IPN Signature Verification**: Secure payment callbacks

## 💰 Payment Flow

1. User selects a subscription plan
2. Backend creates payment with NowPayments API
3. User redirected to crypto payment page
4. Upon payment completion, NowPayments sends IPN callback
5. Backend verifies signature and updates user subscription
6. User gains access to plan-specific content

## 🗂️ Database Models

### User Model
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  subscription: Enum ['none', 'beginner', 'advanced', 'complete'],
  subscriptionExpiry: Date,
  isAdmin: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Video Model
```javascript
{
  title: String,
  description: String,
  url: String,
  planRequired: Enum ['beginner', 'advanced', 'complete'],
  duration: Number,
  thumbnail: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Payment Model
```javascript
{
  userId: ObjectId,
  paymentId: String,
  plan: String,
  amount: Number,
  currency: String,
  status: String,
  paymentUrl: String,
  actuallyPaid: Number,
  createdAt: Date,
  confirmedAt: Date
}
```

## 🚀 Default Admin Account

Upon first startup, a default admin account is created:

- **Email**: `admin@hackhome.com`
- **Password**: `Admin123!`

⚠️ **Important**: Change this password immediately after first login!

## 📝 Development

### Project Structure
```
hackhome-backend/
├── controllers/         # Business logic
├── middleware/         # Auth & admin middleware
├── models/            # MongoDB schemas
├── routes/           # API route definitions
├── utils/           # Utility functions (NowPayments)
├── server.js        # Main application file
├── package.json     # Dependencies & scripts
└── .env            # Environment variables
```

### Available Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm install` - Install dependencies

## 🔧 API Testing

Use tools like Postman, Insomnia, or curl to test the API endpoints. A health check endpoint is available at:

```http
GET /health
```

## 📈 Monitoring & Logs

- Request logging middleware logs all API calls
- Error handling middleware provides detailed error responses
- Graceful shutdown handling for production deployments

## 🌐 Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use strong JWT secrets
3. Configure proper CORS origins
4. Set up process managers (PM2)
5. Enable HTTPS
6. Configure rate limiting
7. Set up monitoring and logging

## 📞 Support

For issues and questions:
- Check the API documentation at `http://localhost:5000/`
- Review error responses for detailed information
- Ensure proper authentication headers are included

---

**HackHome Academy Backend** - Powering the future of crypto-based education! 🎓⚡#   h a c k h o m e - b a c k e n d  
 #   h a c k h o m e - b a c k e n d  
 