# Learning Middleware iREL - Learner Authentication Service

This service provides basic authentication functionality for learners with PostgreSQL database integration.

## Features

- Learner registration (signup)
- Learner authentication (login)
- JWT token-based authentication
- Password hashing with bcrypt
- PostgreSQL database integration

## API Endpoints

### Authentication
- `POST /api/v1/auth/signup` - Register a new learner
- `POST /api/v1/auth/login` - Login with form data (OAuth2 compatible)
- `POST /api/v1/auth/login-json` - Login with JSON payload
- `GET /api/v1/auth/me` - Get current authenticated learner info

## Setup Instructions

### Prerequisites
- Python 3.8+
- PostgreSQL database

### 1. Database Setup

Start the PostgreSQL database using Docker:
```bash
docker-compose up postgres -d
```

### 2. Install Dependencies

```bash
cd learner
pip install -r requirements.txt
```

### 3. Environment Configuration

Update the `.env` file with your database credentials:
```
DATABASE_URL=postgresql://lmw_user:lmw_password@localhost:5432/lmw_database
SECRET_KEY=your-very-secret-key-change-this-in-production
```

### 4. Run the Application

```bash
python main.py
```

The API will be available at `http://localhost:8000`
API Documentation: `http://localhost:8000/docs`

## Example Usage

### 1. Register a new learner
```bash
curl -X POST "http://localhost:8000/api/v1/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "securepassword123",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

### 2. Login
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login-json" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "securepassword123"
  }'
```

### 3. Get current user info
```bash
curl -X GET "http://localhost:8000/api/v1/auth/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Database Schema

The service uses the PostgreSQL `learner` table:
- LearnerID (Primary Key)
- email (Unique)
- password_hash
- first_name
- last_name
- created_at
- updated_at