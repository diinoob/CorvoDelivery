# Contributing to CorvoDelivery

Thank you for your interest in contributing to CorvoDelivery! This document provides guidelines for contributing to the project.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Commit Guidelines](#commit-guidelines)
6. [Pull Request Process](#pull-request-process)
7. [Testing](#testing)
8. [Documentation](#documentation)

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Positive behavior includes:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behavior includes:**
- Harassment, trolling, or derogatory comments
- Publishing others' private information
- Other conduct which could be considered inappropriate

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 5.0
- Git
- Code editor (VS Code recommended)

### Fork and Clone

1. **Fork the repository** on GitHub

2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/CorvoDelivery.git
   cd CorvoDelivery
   ```

3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/diinoob/CorvoDelivery.git
   ```

4. **Install dependencies:**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

## Development Workflow

### 1. Create a Branch

Always create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

**Branch naming conventions:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or fixes
- `chore/` - Maintenance tasks

### 2. Make Changes

- Write clean, readable code
- Follow existing code style
- Add comments for complex logic
- Update documentation as needed

### 3. Test Your Changes

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Run the app locally
npm run dev
```

### 4. Commit Your Changes

See [Commit Guidelines](#commit-guidelines) below.

### 5. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 6. Create Pull Request

- Go to the original repository on GitHub
- Click "New Pull Request"
- Select your fork and branch
- Fill out the PR template
- Submit the pull request

## Coding Standards

### JavaScript/Node.js

**Style Guide:**
- Use ES6+ features
- 2 spaces for indentation
- Single quotes for strings
- Semicolons required
- Use async/await over callbacks
- Use arrow functions where appropriate

**Example:**
```javascript
// Good
const getUserById = async (id) => {
  try {
    const user = await User.findById(id);
    return user;
  } catch (error) {
    throw new Error('User not found');
  }
};

// Avoid
function getUserById(id, callback) {
  User.findById(id, function(err, user) {
    if (err) return callback(err);
    callback(null, user);
  });
}
```

**Naming Conventions:**
- camelCase for variables and functions
- PascalCase for classes and components
- UPPER_SNAKE_CASE for constants
- Descriptive names (avoid single letters except in loops)

```javascript
// Good
const userController = require('./controllers/userController');
const MAX_RETRY_ATTEMPTS = 3;
class DeliveryService { }

// Avoid
const uc = require('./controllers/userController');
const max = 3;
class deliveryservice { }
```

### React Native

**Component Style:**
- Use functional components with hooks
- Keep components small and focused
- Use PropTypes or TypeScript for type checking
- Extract reusable logic into custom hooks

**Example:**
```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const DeliveryCard = ({ delivery, onPress }) => {
  const [status, setStatus] = useState(delivery.status);

  useEffect(() => {
    setStatus(delivery.status);
  }, [delivery.status]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{delivery.trackingNumber}</Text>
      <Text style={styles.status}>{status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 15,
    backgroundColor: '#fff'
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  status: {
    fontSize: 14,
    color: '#666'
  }
});

export default DeliveryCard;
```

### API Design

**RESTful Conventions:**
- Use appropriate HTTP methods (GET, POST, PUT, DELETE)
- Use plural nouns for endpoints (`/deliveries` not `/delivery`)
- Use nested resources for relationships (`/deliveries/:id/proof`)
- Return appropriate status codes
- Include meaningful error messages

**Example:**
```javascript
// Good
router.get('/api/deliveries', getAllDeliveries);
router.post('/api/deliveries', createDelivery);
router.put('/api/deliveries/:id', updateDelivery);
router.delete('/api/deliveries/:id', deleteDelivery);

// Avoid
router.get('/api/getDeliveries', getAllDeliveries);
router.post('/api/createNewDelivery', createDelivery);
```

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, no logic change)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

**Examples:**
```bash
feat(auth): add JWT token refresh mechanism

Implement automatic token refresh to improve user experience.
Tokens now refresh 5 minutes before expiration.

Closes #123
```

```bash
fix(delivery): resolve status update race condition

Fixed issue where concurrent status updates could cause data inconsistency.
Added optimistic locking to prevent race conditions.

Fixes #456
```

```bash
docs(readme): update installation instructions

- Add MongoDB setup steps
- Update environment variables section
- Add troubleshooting guide
```

### Best Practices

- Keep commits atomic (one logical change per commit)
- Write clear, descriptive messages
- Reference issue numbers when applicable
- Don't commit generated files or dependencies
- Run tests before committing

## Pull Request Process

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] All tests pass
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] Commit messages follow guidelines
- [ ] Branch is up to date with main

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #(issue number)

## How Has This Been Tested?
Describe testing approach

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added and passing
- [ ] Dependent changes merged
```

### Review Process

1. **Automated Checks:**
   - CI/CD pipeline runs tests
   - Linting checks pass
   - Build succeeds

2. **Code Review:**
   - At least one maintainer approval required
   - Address all review comments
   - Resolve all conversations

3. **Merge:**
   - Squash and merge for features
   - Regular merge for releases
   - Delete branch after merge

## Testing

### Backend Testing

**Unit Tests:**
```javascript
// tests/auth.test.js
const request = require('supertest');
const app = require('../src/server');

describe('Authentication', () => {
  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.token).toBeDefined();
  });
});
```

**Integration Tests:**
```javascript
describe('Delivery Flow', () => {
  it('should create, assign, and complete a delivery', async () => {
    // Create delivery
    const delivery = await createDelivery();
    
    // Assign driver
    await assignDriver(delivery.id, driver.id);
    
    // Update status
    await updateStatus(delivery.id, 'delivered');
    
    // Verify
    const result = await getDelivery(delivery.id);
    expect(result.status).toBe('delivered');
  });
});
```

### Frontend Testing

```javascript
import { render, fireEvent } from '@testing-library/react-native';
import LoginScreen from '../screens/LoginScreen';

describe('LoginScreen', () => {
  it('should render login form', () => {
    const { getByPlaceholder } = render(<LoginScreen />);
    
    expect(getByPlaceholder('Email')).toBeTruthy();
    expect(getByPlaceholder('Password')).toBeTruthy();
  });

  it('should handle login button press', () => {
    const onLogin = jest.fn();
    const { getByText } = render(<LoginScreen onLogin={onLogin} />);
    
    fireEvent.press(getByText('Login'));
    
    expect(onLogin).toHaveBeenCalled();
  });
});
```

## Documentation

### Code Comments

```javascript
/**
 * Calculate optimal route for multiple deliveries
 * @param {Object} origin - Starting location {lat, lng}
 * @param {Array} destinations - Array of destination locations
 * @param {String} mode - Travel mode (driving, walking, etc.)
 * @returns {Promise<Object>} Optimized route with distance and duration
 */
const optimizeRoute = async (origin, destinations, mode = 'driving') => {
  // Implementation
};
```

### README Updates

Update relevant README files when:
- Adding new features
- Changing configuration
- Updating dependencies
- Modifying setup process

### API Documentation

Update API.md when:
- Adding new endpoints
- Changing request/response formats
- Modifying authentication
- Adding query parameters

## Questions?

- **General questions:** Open a discussion on GitHub
- **Bug reports:** Create an issue with the bug template
- **Feature requests:** Create an issue with the feature template
- **Security issues:** Email security@corvodelivery.com

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project website (when available)

Thank you for contributing to CorvoDelivery! 🚚
