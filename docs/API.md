# CorvoDelivery API Documentation

Complete API reference for the CorvoDelivery backend service.

## Base URL

```
http://localhost:5000/api
```

For production, replace with your deployed API URL.

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Obtain a token by logging in or registering:
- `POST /api/auth/login`
- `POST /api/auth/register`

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## Endpoints

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
```

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "role": "client", // client, driver, manager, admin
  
  // Required only for drivers
  "vehicleType": "car", // bike, motorcycle, car, van, truck
  "vehiclePlate": "ABC-1234"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "64abc123...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "client",
    ...
  }
}
```

#### Login
```http
POST /api/auth/login
```

**Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}
```

#### Get Current User
```http
GET /api/auth/me
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "user": { ... }
}
```

#### Update User Details
```http
PUT /api/auth/updatedetails
```

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "name": "John Updated",
  "email": "john.new@example.com",
  "phone": "+9876543210"
}
```

#### Update Password
```http
PUT /api/auth/updatepassword
```

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

#### Update FCM Token
```http
PUT /api/auth/fcm-token
```

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "fcmToken": "firebase-cloud-messaging-token"
}
```

### Delivery Endpoints

#### Create Delivery
```http
POST /api/deliveries
```

**Headers:** `Authorization: Bearer <token>`

**Roles:** client, manager, admin

**Body:**
```json
{
  "pickupAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA",
    "coordinates": [-73.935242, 40.730610]
  },
  "pickupContact": {
    "name": "Sender Name",
    "phone": "+1234567890"
  },
  "deliveryAddress": {
    "street": "456 Park Ave",
    "city": "New York",
    "state": "NY",
    "zipCode": "10022",
    "country": "USA",
    "coordinates": [-73.974420, 40.761932]
  },
  "deliveryContact": {
    "name": "Recipient Name",
    "phone": "+0987654321",
    "email": "recipient@example.com"
  },
  "packageDetails": {
    "description": "Electronics",
    "weight": 2.5,
    "dimensions": {
      "length": 30,
      "width": 20,
      "height": 15
    },
    "value": 500,
    "fragile": true
  },
  "priority": "normal", // low, normal, high, urgent
  "specialInstructions": "Handle with care"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Delivery created successfully",
  "delivery": {
    "_id": "64abc123...",
    "trackingNumber": "CD1A2B3C4D",
    "status": "pending",
    ...
  }
}
```

#### Get All Deliveries
```http
GET /api/deliveries?status=pending&page=1&limit=10
```

**Headers:** `Authorization: Bearer <token>`

**Roles:** manager, admin

**Query Parameters:**
- `status` - Filter by status (pending, assigned, in_transit, etc.)
- `priority` - Filter by priority
- `driver` - Filter by driver ID
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 10)

#### Get Delivery by ID
```http
GET /api/deliveries/:id
```

**Headers:** `Authorization: Bearer <token>`

#### Track Delivery (Public)
```http
GET /api/deliveries/track/:trackingNumber
```

**No authentication required**

**Example:**
```http
GET /api/deliveries/track/CD1A2B3C4D
```

#### Get Driver's Deliveries
```http
GET /api/deliveries/driver/my-deliveries?status=in_transit
```

**Headers:** `Authorization: Bearer <token>`

**Roles:** driver

#### Get Client's Deliveries
```http
GET /api/deliveries/client/my-deliveries
```

**Headers:** `Authorization: Bearer <token>`

**Roles:** client

#### Assign Driver to Delivery
```http
PUT /api/deliveries/:id/assign
```

**Headers:** `Authorization: Bearer <token>`

**Roles:** manager, admin

**Body:**
```json
{
  "driverId": "64def456..."
}
```

#### Update Delivery Status
```http
PUT /api/deliveries/:id/status
```

**Headers:** `Authorization: Bearer <token>`

**Roles:** driver, manager, admin

**Body:**
```json
{
  "status": "in_transit",
  "notes": "Package picked up and en route",
  "location": [-73.935242, 40.730610]
}
```

**Status values:**
- `pending` - Awaiting assignment
- `assigned` - Assigned to driver
- `picked_up` - Package collected
- `in_transit` - On the way
- `out_for_delivery` - Out for delivery
- `delivered` - Successfully delivered
- `failed` - Delivery failed
- `cancelled` - Cancelled

#### Upload Delivery Proof
```http
PUT /api/deliveries/:id/proof
```

**Headers:** `Authorization: Bearer <token>`

**Roles:** driver

**Body:**
```json
{
  "signature": "https://s3.../signature.jpg",
  "photo": "https://s3.../delivery-photo.jpg",
  "recipientName": "John Smith",
  "notes": "Delivered to reception"
}
```

#### Rate Delivery
```http
PUT /api/deliveries/:id/rate
```

**Headers:** `Authorization: Bearer <token>`

**Roles:** client

**Body:**
```json
{
  "score": 5,
  "comment": "Excellent service!"
}
```

### User Endpoints

#### Get All Users
```http
GET /api/users?role=driver&isAvailable=true
```

**Headers:** `Authorization: Bearer <token>`

**Roles:** manager, admin

**Query Parameters:**
- `role` - Filter by role
- `isAvailable` - Filter by availability (true/false)

#### Get User by ID
```http
GET /api/users/:id
```

**Headers:** `Authorization: Bearer <token>`

**Roles:** manager, admin

#### Get Available Drivers
```http
GET /api/users/drivers/available
```

**Headers:** `Authorization: Bearer <token>`

**Roles:** manager, admin

#### Update Driver Location
```http
PUT /api/users/location
```

**Headers:** `Authorization: Bearer <token>`

**Roles:** driver

**Body:**
```json
{
  "longitude": -73.935242,
  "latitude": 40.730610
}
```

#### Update Driver Availability
```http
PUT /api/users/availability
```

**Headers:** `Authorization: Bearer <token>`

**Roles:** driver

**Body:**
```json
{
  "isAvailable": true
}
```

#### Delete User
```http
DELETE /api/users/:id
```

**Headers:** `Authorization: Bearer <token>`

**Roles:** admin

### Route Endpoints

#### Optimize Route
```http
POST /api/routes/optimize
```

**Headers:** `Authorization: Bearer <token>`

**Roles:** driver, manager, admin

**Body:**
```json
{
  "origin": {
    "lat": 40.730610,
    "lng": -73.935242
  },
  "destinations": [
    {
      "lat": 40.748817,
      "lng": -73.985428
    },
    {
      "lat": 40.761932,
      "lng": -73.974420
    }
  ],
  "mode": "driving" // driving, walking, bicycling, transit
}
```

**Response:**
```json
{
  "success": true,
  "route": {
    "distance": {
      "text": "5.2 km",
      "value": 5200
    },
    "duration": {
      "text": "15 mins",
      "value": 900
    },
    "polyline": "encoded-polyline-string",
    "steps": [ ... ],
    "waypointOrder": [0, 1]
  }
}
```

#### Calculate Distance and Time
```http
POST /api/routes/calculate
```

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "origin": {
    "lat": 40.730610,
    "lng": -73.935242
  },
  "destination": {
    "lat": 40.748817,
    "lng": -73.985428
  },
  "mode": "driving"
}
```

#### Geocode Address
```http
POST /api/routes/geocode
```

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "address": "1600 Amphitheatre Parkway, Mountain View, CA"
}
```

**Response:**
```json
{
  "success": true,
  "location": {
    "lat": 37.422,
    "lng": -122.084,
    "formattedAddress": "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA"
  }
}
```

### Notification Endpoints

#### Send Push Notification
```http
POST /api/notifications/push
```

**Headers:** `Authorization: Bearer <token>`

**Roles:** manager, admin

**Body:**
```json
{
  "userId": "64abc123...",
  "title": "New Delivery",
  "body": "You have been assigned a new delivery",
  "data": {
    "deliveryId": "64def456...",
    "type": "new_assignment"
  }
}
```

#### Send Email
```http
POST /api/notifications/email
```

**Headers:** `Authorization: Bearer <token>`

**Roles:** manager, admin

**Body:**
```json
{
  "to": "user@example.com",
  "subject": "Delivery Update",
  "html": "<h1>Your package is on the way!</h1>"
}
```

#### Send Delivery Status Notification
```http
POST /api/notifications/delivery-status
```

**Headers:** `Authorization: Bearer <token>`

**Roles:** driver, manager, admin

**Body:**
```json
{
  "deliveryId": "64abc123...",
  "status": "out_for_delivery"
}
```

## Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

(Recommended for production)
- 100 requests per 15 minutes per IP
- Authenticated users: 1000 requests per 15 minutes

## Webhooks

(Future feature)
Configure webhooks to receive real-time updates:
- Delivery status changes
- Driver assignments
- Delivery completions

## SDKs and Libraries

### JavaScript/TypeScript
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Python
```python
import requests

headers = {
    'Authorization': f'Bearer {token}'
}

response = requests.get(
    'http://localhost:5000/api/deliveries',
    headers=headers
)
```

## Support

For API support, contact: api-support@corvodelivery.com
