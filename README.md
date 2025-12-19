# CorvoDelivery 🚚

**Professional Delivery Management System** - A complete full-stack application for managing deliveries with real-time tracking, route optimization, and multi-user support.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![React Native](https://img.shields.io/badge/react--native-0.72-blue.svg)

## 🎯 Overview

CorvoDelivery is a professional-grade delivery management platform designed for modern logistics operations. It provides a complete ecosystem for managing deliveries from creation to completion, with real-time tracking, route optimization, and comprehensive analytics.

### Key Features

- 🔐 **Secure Authentication** - JWT-based authentication with role-based access control
- 👥 **Multi-User Support** - Separate interfaces for Clients, Drivers, Managers, and Admins
- 📍 **Real-time GPS Tracking** - Live location tracking for all active deliveries
- 🗺️ **Route Optimization** - Intelligent route planning using Google Maps API
- 📱 **Mobile App** - Native mobile experience for drivers and clients
- 🔔 **Push Notifications** - Real-time updates via Firebase Cloud Messaging
- 📧 **Email Notifications** - Automated email updates for delivery status changes
- 📸 **Proof of Delivery** - Photo and signature capture for delivery confirmation
- ⭐ **Rating System** - Client feedback and driver performance ratings
- 📊 **Analytics Dashboard** - Comprehensive statistics and performance metrics

## 🏗️ Architecture

CorvoDelivery follows a modern microservices architecture:

```
┌─────────────────────────────────────────────────────────┐
│                    Mobile App (React Native)            │
│              iOS, Android, Web Interfaces               │
└────────────────────┬───────────────────────────────────┘
                     │ REST API
┌────────────────────▼───────────────────────────────────┐
│                Backend API (Node.js/Express)           │
│    Authentication │ Deliveries │ Routes │ Users        │
└────────────────────┬───────────────────────────────────┘
                     │
     ┌───────────────┼───────────────┐
     │               │               │
┌────▼─────┐  ┌─────▼──────┐  ┌────▼──────┐
│ MongoDB  │  │  Firebase  │  │  Google   │
│ Database │  │    FCM     │  │  Maps API │
└──────────┘  └────────────┘  └───────────┘
```

## 📁 Project Structure

```
CorvoDelivery/
├── backend/                 # Node.js/Express Backend
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   ├── middlewares/   # Custom middleware
│   │   ├── services/      # Business logic
│   │   └── server.js      # Entry point
│   ├── package.json
│   └── README.md
│
├── frontend/               # React Native Mobile App
│   ├── src/
│   │   ├── screens/       # Screen components
│   │   ├── components/    # Reusable components
│   │   ├── navigation/    # Navigation setup
│   │   ├── services/      # API services
│   │   └── contexts/      # React contexts
│   ├── app.json
│   ├── package.json
│   └── README.md
│
├── docs/                   # Documentation
│   ├── API.md             # API documentation
│   ├── DEPLOYMENT.md      # Deployment guide
│   └── CONTRIBUTING.md    # Contribution guidelines
│
├── app.py                 # Legacy Streamlit app (deprecated)
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **MongoDB** >= 5.0
- **npm** >= 9.0.0
- **Google Maps API Key**
- **Firebase Project** (for push notifications)
- **Expo CLI** (for mobile app development)

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB:**
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

5. **Run the server:**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

The API will be available at `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure app.json:**
   Update `extra` section with your backend URL and Google Maps API key

4. **Start Expo:**
   ```bash
   npm start
   ```

5. **Run on device/emulator:**
   ```bash
   # iOS
   npm run ios
   
   # Android
   npm run android
   
   # Web
   npm run web
   ```

## 📱 User Roles

### 🚗 Driver
- View assigned deliveries
- Update delivery status in real-time
- Navigate using optimized routes
- Upload delivery proof (photos/signatures)
- Track personal statistics

### 👤 Client
- Create new delivery requests
- Track deliveries in real-time
- View delivery history
- Rate completed deliveries
- Receive status notifications

### 👨‍💼 Manager
- Overview of all deliveries
- Assign drivers to deliveries
- Monitor driver performance
- Access analytics and reports
- Manage system users

### 🔧 Admin
- Full system access
- User management
- System configuration
- Advanced analytics

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/updatedetails` - Update user details
- `PUT /api/auth/updatepassword` - Update password

### Deliveries
- `POST /api/deliveries` - Create delivery
- `GET /api/deliveries` - Get all deliveries
- `GET /api/deliveries/:id` - Get delivery by ID
- `GET /api/deliveries/track/:trackingNumber` - Track delivery (public)
- `PUT /api/deliveries/:id/status` - Update status
- `PUT /api/deliveries/:id/proof` - Upload proof

### Routes
- `POST /api/routes/optimize` - Optimize route
- `POST /api/routes/calculate` - Calculate distance/time
- `POST /api/routes/geocode` - Geocode address

See [API Documentation](docs/API.md) for complete API reference.

## 🔒 Security

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt with salt rounds
- **Role-Based Access Control** - Granular permissions system
- **Input Validation** - Express-validator for request validation
- **Helmet.js** - Security headers
- **CORS** - Configurable cross-origin resource sharing
- **Rate Limiting** - Protection against abuse (recommended in production)

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📦 Deployment

### Backend Deployment

**Using Docker:**
```bash
cd backend
docker build -t corvodelivery-backend .
docker run -p 5000:5000 --env-file .env corvodelivery-backend
```

**Using PM2:**
```bash
npm install -g pm2
cd backend
pm2 start src/server.js --name corvodelivery-api
```

### Mobile App Deployment

**Using EAS Build:**
```bash
cd frontend
npm install -g eas-cli
eas build --platform all
```

See [Deployment Guide](docs/DEPLOYMENT.md) for detailed instructions.

## 🌐 Environment Variables

### Backend (.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/corvodelivery
JWT_SECRET=your-secret-key
GOOGLE_MAPS_API_KEY=your-maps-key
FIREBASE_PROJECT_ID=your-project-id
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
```

### Frontend (app.json)
```json
"extra": {
  "apiUrl": "http://localhost:5000/api",
  "googleMapsApiKey": "your-maps-key"
}
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](docs/CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

**CorvoDelivery Development Team**

## 📞 Support

- 📧 Email: support@corvodelivery.com
- 🐛 Issues: [GitHub Issues](https://github.com/diinoob/CorvoDelivery/issues)
- 📖 Documentation: [Wiki](https://github.com/diinoob/CorvoDelivery/wiki)

## 🙏 Acknowledgments

- Google Maps Platform
- Firebase Cloud Messaging
- React Native Community
- Express.js Team
- MongoDB Team

---

**Made with ❤️ by the CorvoDelivery Team**