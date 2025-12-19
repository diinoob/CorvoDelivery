# CorvoDelivery Backend API

Professional delivery management system backend built with Node.js, Express, and MongoDB.

## Features

- 🔐 **JWT Authentication** - Secure user authentication and authorization
- 👥 **Multi-Role Support** - Client, Driver, Manager, and Admin roles
- 📦 **Delivery Management** - Complete delivery lifecycle management
- 🗺️ **Route Optimization** - Google Maps API integration for optimal routes
- 📍 **Real-time GPS Tracking** - Live location updates for deliveries
- 🔔 **Push Notifications** - Firebase Cloud Messaging integration
- 📧 **Email Notifications** - Automated email updates for delivery status
- 📸 **Proof of Delivery** - Image and signature upload support
- ⭐ **Rating System** - Client feedback and driver ratings
- 📊 **Analytics & Reports** - Delivery statistics and performance metrics

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens)
- **File Upload:** Multer
- **Push Notifications:** Firebase Admin SDK
- **Email:** Nodemailer
- **Maps & Routing:** Google Maps API
- **Security:** Helmet, bcryptjs
- **Real-time:** Socket.io

## Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 5.0
- npm >= 9.0.0
- Google Maps API Key
- Firebase Project (for push notifications)
- SMTP Server (for emails)

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` file with your configuration:**
   - Database connection string
   - JWT secret key
   - Google Maps API key
   - Firebase credentials
   - SMTP settings
   - AWS S3 credentials (optional)

4. **Start MongoDB:**
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   
   # Or use your existing MongoDB instance
   ```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/updatedetails` - Update user details
- `PUT /api/auth/updatepassword` - Update password
- `PUT /api/auth/fcm-token` - Update FCM token

### Users
- `GET /api/users` - Get all users (Manager/Admin)
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/drivers/available` - Get available drivers
- `PUT /api/users/location` - Update driver location
- `PUT /api/users/availability` - Update driver availability
- `DELETE /api/users/:id` - Delete user (Admin)

### Deliveries
- `POST /api/deliveries` - Create new delivery
- `GET /api/deliveries` - Get all deliveries (Manager/Admin)
- `GET /api/deliveries/:id` - Get delivery by ID
- `GET /api/deliveries/track/:trackingNumber` - Track delivery (Public)
- `GET /api/deliveries/driver/my-deliveries` - Get driver's deliveries
- `GET /api/deliveries/client/my-deliveries` - Get client's deliveries
- `PUT /api/deliveries/:id/assign` - Assign driver to delivery
- `PUT /api/deliveries/:id/status` - Update delivery status
- `PUT /api/deliveries/:id/proof` - Upload delivery proof
- `PUT /api/deliveries/:id/rate` - Rate delivery

### Routes
- `POST /api/routes/optimize` - Calculate optimal route
- `POST /api/routes/calculate` - Calculate distance and time
- `POST /api/routes/geocode` - Geocode address

### Notifications
- `POST /api/notifications/push` - Send push notification
- `POST /api/notifications/email` - Send email
- `POST /api/notifications/delivery-status` - Send delivery status notification

## User Roles

### Client
- Create deliveries
- Track deliveries
- Rate completed deliveries
- View own deliveries

### Driver
- View assigned deliveries
- Update delivery status
- Upload proof of delivery
- Update location and availability

### Manager
- View all deliveries
- Assign drivers to deliveries
- View statistics and reports
- Manage users

### Admin
- All manager permissions
- Full user management
- System configuration

## Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

To obtain a token, login via `/api/auth/login` or register via `/api/auth/register`.

## Database Schema

### User Schema
- Personal information (name, email, phone)
- Role-based access control
- Location tracking (for drivers)
- Rating system
- FCM token for push notifications

### Delivery Schema
- Tracking number (auto-generated)
- Pickup and delivery addresses with coordinates
- Package details
- Status tracking with timeline
- Proof of delivery
- Rating and feedback
- Price and priority

## Error Handling

The API uses standard HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

Error responses follow this format:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Role-based authorization
- Helmet.js for HTTP headers security
- CORS configuration
- Input validation
- Rate limiting (recommended for production)

## Environment Variables

See `.env.example` for all required and optional environment variables.

## Development

### Project Structure
```
backend/
├── src/
│   ├── controllers/    # Route controllers
│   ├── middlewares/    # Custom middleware
│   ├── models/        # Database models
│   ├── routes/        # API routes
│   ├── services/      # Business logic
│   ├── utils/         # Helper functions
│   ├── config/        # Configuration files
│   └── server.js      # Entry point
├── .env.example       # Environment template
├── package.json       # Dependencies
└── README.md          # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please open an issue on GitHub or contact the development team.

---

**CorvoDelivery** - Professional Delivery Management System
