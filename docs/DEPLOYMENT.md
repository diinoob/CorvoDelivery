# Deployment Guide

Complete guide for deploying CorvoDelivery in production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Deployment](#backend-deployment)
3. [Frontend Deployment](#frontend-deployment)
4. [Database Setup](#database-setup)
5. [Third-Party Services](#third-party-services)
6. [Environment Configuration](#environment-configuration)
7. [Monitoring and Logging](#monitoring-and-logging)
8. [Security Checklist](#security-checklist)

## Prerequisites

### Required Services
- **MongoDB Atlas** or self-hosted MongoDB instance
- **Google Cloud Platform** account (for Maps API)
- **Firebase** project (for push notifications)
- **SMTP Server** (Gmail, SendGrid, or similar)
- **Cloud Storage** (AWS S3, Google Cloud Storage, or similar)
- **Domain name** with SSL certificate

### Required Tools
- Docker and Docker Compose
- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

## Backend Deployment

### Option 1: Docker Deployment (Recommended)

1. **Create Dockerfile:**

```dockerfile
# File: backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "src/server.js"]
```

2. **Create docker-compose.yml:**

```yaml
# File: docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
    env_file:
      - ./backend/.env
    depends_on:
      - mongodb
    restart: unless-stopped

  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASSWORD}
    restart: unless-stopped

volumes:
  mongodb_data:
```

3. **Deploy:**

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

### Option 2: PM2 Deployment

1. **Install PM2:**

```bash
npm install -g pm2
```

2. **Create ecosystem file:**

```javascript
// File: backend/ecosystem.config.js
module.exports = {
  apps: [{
    name: 'corvodelivery-api',
    script: './src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

3. **Deploy:**

```bash
cd backend
npm ci --only=production
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Option 3: Cloud Platform Deployment

#### Heroku

```bash
# Install Heroku CLI
heroku login

# Create app
heroku create corvodelivery-api

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your-mongodb-uri
# ... set all other env variables

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

#### AWS Elastic Beanstalk

```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init -p node.js-18 corvodelivery-api

# Create environment
eb create production

# Deploy
eb deploy

# Open app
eb open
```

#### Google Cloud Platform

```bash
# Install gcloud CLI
gcloud init

# Deploy
gcloud app deploy backend/app.yaml
```

### Nginx Configuration

```nginx
# File: /etc/nginx/sites-available/corvodelivery

upstream backend {
    server localhost:5000;
}

server {
    listen 80;
    server_name api.corvodelivery.com;

    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name api.corvodelivery.com;

    ssl_certificate /etc/letsencrypt/live/api.corvodelivery.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.corvodelivery.com/privkey.pem;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Frontend Deployment

### Building the App

#### EAS Build (Expo Application Services)

1. **Install EAS CLI:**

```bash
npm install -g eas-cli
```

2. **Configure EAS:**

```bash
cd frontend
eas login
eas build:configure
```

3. **Build for iOS:**

```bash
eas build --platform ios
```

4. **Build for Android:**

```bash
eas build --platform android
```

5. **Submit to App Stores:**

```bash
# iOS App Store
eas submit --platform ios

# Google Play Store
eas submit --platform android
```

#### Classic Build

```bash
cd frontend

# iOS
expo build:ios

# Android
expo build:android
```

### Web Deployment

```bash
cd frontend

# Build for web
expo build:web

# Deploy to Netlify
npm install -g netlify-cli
netlify deploy --prod --dir web-build

# Or deploy to Vercel
npm install -g vercel
vercel --prod
```

## Database Setup

### MongoDB Atlas (Recommended)

1. **Create Cluster:**
   - Visit [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a free or paid cluster
   - Select your preferred region

2. **Configure Network Access:**
   - Whitelist your server's IP
   - Or allow access from anywhere (0.0.0.0/0) with strong authentication

3. **Create Database User:**
   - Create a user with read/write permissions
   - Save the credentials securely

4. **Get Connection String:**
   ```
   mongodb+srv://username:password@cluster.mongodb.net/corvodelivery?retryWrites=true&w=majority
   ```

5. **Update .env:**
   ```env
   MONGODB_URI=your-connection-string
   ```

### Self-Hosted MongoDB

```bash
# Using Docker
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v /data/mongodb:/data/db \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=securepassword \
  mongo:latest

# Connection string
MONGODB_URI=mongodb://admin:securepassword@localhost:27017/corvodelivery
```

## Third-Party Services

### Google Maps API

1. **Create Project:**
   - Visit [Google Cloud Console](https://console.cloud.google.com)
   - Create new project

2. **Enable APIs:**
   - Maps JavaScript API
   - Directions API
   - Distance Matrix API
   - Geocoding API

3. **Create API Key:**
   - Create credentials
   - Restrict key by IP/domain
   - Save key securely

4. **Update Configuration:**
   ```env
   GOOGLE_MAPS_API_KEY=your-api-key
   ```

### Firebase Cloud Messaging

1. **Create Firebase Project:**
   - Visit [Firebase Console](https://console.firebase.google.com)
   - Create new project

2. **Add Apps:**
   - Add iOS app
   - Add Android app
   - Download config files

3. **Generate Service Account:**
   - Project Settings > Service Accounts
   - Generate new private key
   - Save JSON file securely

4. **Update Configuration:**
   ```env
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY=your-private-key
   FIREBASE_CLIENT_EMAIL=your-client-email
   ```

### Email Service (SMTP)

#### Using Gmail

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

#### Using SendGrid

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

### File Storage (AWS S3)

1. **Create S3 Bucket:**
   ```bash
   aws s3 mb s3://corvodelivery-uploads
   ```

2. **Configure CORS:**
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": []
     }
   ]
   ```

3. **Create IAM User:**
   - Create user with S3 access
   - Save access key and secret

4. **Update Configuration:**
   ```env
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   AWS_S3_BUCKET=corvodelivery-uploads
   AWS_REGION=us-east-1
   ```

## Environment Configuration

### Production Environment Variables

```env
# Server
NODE_ENV=production
PORT=5000

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/corvodelivery

# JWT
JWT_SECRET=use-strong-random-secret-minimum-32-characters
JWT_EXPIRE=7d

# Google Maps
GOOGLE_MAPS_API_KEY=your-production-api-key

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@project.iam.gserviceaccount.com

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=corvodelivery-uploads
AWS_REGION=us-east-1

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notifications@corvodelivery.com
SMTP_PASSWORD=your-app-password

# Frontend URL (for CORS)
FRONTEND_URL=https://app.corvodelivery.com
```

## Monitoring and Logging

### Application Monitoring

#### Using PM2 Plus

```bash
pm2 plus
pm2 link your-secret-key your-public-key
```

#### Using New Relic

```bash
npm install newrelic
```

```javascript
// Add to top of server.js
require('newrelic');
```

### Log Management

#### Using Winston

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

#### Using LogDNA

```bash
npm install @logdna/logger
```

## Security Checklist

### Backend Security

- [ ] Use HTTPS only
- [ ] Set strong JWT secret (minimum 32 characters)
- [ ] Enable rate limiting
- [ ] Implement request validation
- [ ] Use helmet.js for security headers
- [ ] Enable CORS with specific origins
- [ ] Hash passwords with bcrypt
- [ ] Sanitize user inputs
- [ ] Use parameterized queries
- [ ] Keep dependencies updated
- [ ] Set up proper error handling
- [ ] Don't expose sensitive errors to clients
- [ ] Use environment variables for secrets
- [ ] Enable MongoDB authentication
- [ ] Restrict API keys by domain/IP
- [ ] Implement logging and monitoring
- [ ] Regular security audits
- [ ] Set up backup strategy

### Frontend Security

- [ ] Use HTTPS only
- [ ] Store tokens securely
- [ ] Implement token refresh
- [ ] Validate all user inputs
- [ ] Use secure storage for sensitive data
- [ ] Implement certificate pinning
- [ ] Obfuscate code
- [ ] Enable app signing
- [ ] Regular security updates
- [ ] Implement biometric authentication

### Database Security

- [ ] Enable authentication
- [ ] Use strong passwords
- [ ] Restrict network access
- [ ] Enable encryption at rest
- [ ] Enable encryption in transit
- [ ] Regular backups
- [ ] Implement backup encryption
- [ ] Test disaster recovery
- [ ] Monitor access logs
- [ ] Set up alerts

## Backup Strategy

### Database Backup

```bash
# MongoDB backup
mongodump --uri="mongodb+srv://..." --out=/backup/$(date +%Y%m%d)

# Automate with cron
0 2 * * * /path/to/backup-script.sh
```

### Application Backup

```bash
# Backup configuration and code
tar -czf backup-$(date +%Y%m%d).tar.gz /path/to/app
```

## Health Checks

```javascript
// Add to server.js
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});
```

## Scaling

### Horizontal Scaling

```bash
# Using PM2
pm2 start src/server.js -i max

# Using Docker Swarm
docker swarm init
docker service create --replicas 3 --name api corvodelivery-backend
```

### Load Balancing

```nginx
upstream backend {
    least_conn;
    server backend1:5000;
    server backend2:5000;
    server backend3:5000;
}
```

## Troubleshooting

### Common Issues

1. **Connection Refused:**
   - Check firewall settings
   - Verify port bindings
   - Check MongoDB connection

2. **CORS Errors:**
   - Verify FRONTEND_URL in .env
   - Check CORS configuration

3. **Authentication Failures:**
   - Verify JWT_SECRET
   - Check token expiration
   - Validate token format

4. **Push Notifications Not Working:**
   - Verify Firebase configuration
   - Check FCM tokens
   - Test on physical device

## Support

For deployment support:
- Email: devops@corvodelivery.com
- Documentation: https://docs.corvodelivery.com
- GitHub Issues: https://github.com/diinoob/CorvoDelivery/issues
