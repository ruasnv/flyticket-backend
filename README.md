# FlyTicket — Backend

REST API for the FlyTicket airline booking application.
Built with Node.js, Express, and MongoDB for Dynamic Web Development Course Assignment 2026 Spring Term.

## Technologies Used

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB + Mongoose
- **Authentication**: express-session + bcryptjs
- **Other**: cors, dotenv, uuid

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (running locally)

### Installation

1. Clone the repository:
```bash
   git clone https://github.com/ruasnv/flyticket-backend.git
   cd flyticket-backend
```

2. Install dependencies:
```bash
   npm install
```

3. Create a `.env` file in the root directory:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/flyticket
SESSION_SECRET=flyticket_super_secret_key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

4. Seed the database (cities + admin account):
```bash
   node seed.js
```

5. Start the development server:
```bash
   npm run dev
```

The API will be running at `http://localhost:5000`

## Admin Credentials

| Field    | Value      |
|----------|------------|
| Username | admin      |
| Password | admin123   |

## API Endpoints

### Cities
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cities` | Get all 81 Turkish cities |

### Flights
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/flights` | — | List all flights |
| GET | `/api/flights/search` | — | Search flights by from, to, date |
| GET | `/api/flights/:id` | — | Get single flight |
| GET | `/api/flights/:id/seats` | — | Get taken seats for a flight |
| POST | `/api/flights` | Admin | Create a flight |
| PUT | `/api/flights/:id` | Admin | Update a flight |
| DELETE | `/api/flights/:id` | Admin | Delete a flight |

### Tickets
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tickets` | Book a ticket |
| GET | `/api/tickets/:email` | Get tickets by email |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Admin login |
| POST | `/api/admin/logout` | Admin logout |
| GET | `/api/admin/me` | Check admin session |
| GET | `/api/admin/tickets` | View all bookings |
| DELETE | `/api/admin/tickets/:id` | Cancel any booking |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/register` | Register new user |
| POST | `/api/users/login` | User login |
| POST | `/api/users/logout` | User logout |
| GET | `/api/users/me` | Check user session |
| GET | `/api/users/tickets` | Get logged in user's tickets |
| DELETE | `/api/users/tickets/:id` | Cancel own ticket |

## Flight Scheduling Rules

The following rules are enforced on the backend:

1. No two flights can depart from the same city in the same hour
2. No two flights can arrive at the same city in the same hour
3. Arrival time must be after departure time
4. A flight cannot depart and arrive at the same city
5. Available seats cannot exceed total seats

## Connected Flights

The app uses a graph-based algorithm to find connecting flights.
A valid connection requires:
- Minimum layover: 45 minutes
- Maximum layover: 6 hours
- Same intermediate city between leg 1 and leg 2

## Database Export

A MongoDB dump is included in the `/dump` folder.
To restore it:
```bash
mongorestore --db flyticket ./dump/flyticket
```

## Project Structure
```
backend/
├── models/          # Mongoose models (City, Flight, Ticket, Admin, User)
├── routes/          # Express route handlers
├── middleware/      # Auth guard middleware
├── services/        # Graph service for connected flights
├── seed.js          # Database seeder (cities + admin)
├── server.js        # App entry point
└── .env             # Environment variables (not committed)
```