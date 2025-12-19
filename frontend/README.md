# CorvoDelivery Mobile App

Professional delivery management mobile application built with React Native and Expo.

## Features

- 🔐 **Authentication** - Secure login and registration
- 📦 **Delivery Management** - View and manage deliveries
- 🗺️ **Real-time Maps** - Track deliveries with Google Maps integration
- 📍 **GPS Tracking** - Live location updates
- 📸 **Delivery Proof** - Camera integration for delivery confirmation
- 🔔 **Push Notifications** - Real-time delivery updates
- 👥 **Multi-Role Support** - Driver, Client, and Manager interfaces
- ⭐ **Rating System** - Rate completed deliveries

## Tech Stack

- **Framework:** React Native with Expo
- **Navigation:** React Navigation
- **State Management:** React Context API
- **Maps:** React Native Maps with Google Maps
- **API Client:** Axios
- **Storage:** AsyncStorage
- **Notifications:** Expo Notifications
- **Camera:** Expo Camera & Image Picker
- **Location:** Expo Location

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Expo CLI
- iOS Simulator or Android Emulator (for testing)
- Physical device for testing location features

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure app.json:**
   Update the `extra` section in `app.json` with your backend API URL and Google Maps API key:
   ```json
   "extra": {
     "apiUrl": "http://your-backend-url:5000/api",
     "googleMapsApiKey": "YOUR_GOOGLE_MAPS_API_KEY"
   }
   ```

3. **For Android, update Google Maps API key:**
   Edit `app.json` and set your API key in:
   ```json
   "android": {
     "config": {
       "googleMaps": {
         "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
       }
     }
   }
   ```

## Running the Application

### Start Development Server
```bash
npm start
```

### Run on iOS Simulator
```bash
npm run ios
```

### Run on Android Emulator
```bash
npm run android
```

### Run on Web
```bash
npm run web
```

## Project Structure

```
frontend/
├── src/
│   ├── screens/          # Screen components
│   │   ├── LoginScreen.js
│   │   ├── RegisterScreen.js
│   │   ├── DriverDashboardScreen.js
│   │   ├── DeliveryDetailsScreen.js
│   │   ├── DeliveryMapScreen.js
│   │   └── ...
│   ├── components/       # Reusable components
│   │   ├── DeliveryCard.js
│   │   ├── MapView.js
│   │   └── ...
│   ├── navigation/       # Navigation configuration
│   │   └── AppNavigator.js
│   ├── services/        # API services
│   │   ├── api.js
│   │   ├── authService.js
│   │   ├── deliveryService.js
│   │   └── locationService.js
│   ├── contexts/        # React contexts
│   │   └── AuthContext.js
│   ├── utils/           # Helper functions
│   │   └── formatters.js
│   └── constants/       # App constants
│       └── colors.js
├── assets/              # Images, fonts, etc.
├── app.json            # Expo configuration
├── package.json        # Dependencies
└── README.md           # This file
```

## User Roles

### Driver Interface
- View assigned deliveries
- Update delivery status
- Navigate to delivery locations
- Upload delivery proof (photo/signature)
- Track earnings and statistics

### Client Interface
- Create new deliveries
- Track deliveries in real-time
- View delivery history
- Rate completed deliveries
- Receive notifications

### Manager Interface
- View all deliveries
- Assign drivers to deliveries
- Monitor driver performance
- View analytics and reports

## Key Features Implementation

### Authentication
- JWT token-based authentication
- Secure token storage with AsyncStorage
- Automatic token refresh
- Role-based access control

### Real-time Tracking
- Background location updates
- Live driver location on map
- Estimated time of arrival (ETA)
- Route visualization

### Notifications
- Push notifications for status updates
- In-app notifications
- Email notifications (from backend)

### Delivery Proof
- Camera integration for photos
- Image picker for gallery selection
- Digital signature capture
- Automatic upload to backend

## Environment Configuration

The app uses Expo Constants to access configuration:

```javascript
import Constants from 'expo-constants';

const apiUrl = Constants.expoConfig?.extra?.apiUrl;
const mapsKey = Constants.expoConfig?.extra?.googleMapsApiKey;
```

## Testing

```bash
npm test
```

## Building for Production

### iOS
```bash
expo build:ios
```

### Android
```bash
expo build:android
```

### Using EAS Build (Recommended)
```bash
npm install -g eas-cli
eas build --platform ios
eas build --platform android
```

## Permissions

### iOS
The app requires the following permissions (configured in app.json):
- Location (When In Use & Always)
- Camera
- Photo Library

### Android
Permissions are automatically handled by Expo:
- ACCESS_FINE_LOCATION
- ACCESS_COARSE_LOCATION
- CAMERA
- READ_EXTERNAL_STORAGE
- WRITE_EXTERNAL_STORAGE

## Troubleshooting

### Maps not showing
1. Ensure Google Maps API key is configured correctly
2. Enable Maps SDK for Android/iOS in Google Cloud Console
3. Check API key restrictions

### Location not updating
1. Grant location permissions on device
2. For iOS, enable location in Settings > Privacy > Location Services
3. For Android, enable GPS in device settings

### Push notifications not working
1. Configure Firebase project
2. Add google-services.json (Android) / GoogleService-Info.plist (iOS)
3. Test on physical device (push notifications don't work in simulator)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please open an issue on GitHub.

---

**CorvoDelivery** - Professional Delivery Management System
