# Vhutec Med

Vhutec Med is a web-based medical appointment and patient queue management system developed for Vhuthelu Resources (Pty) Ltd.

The system provides functionality for managing patients, doctors, departments, appointments, queues and consultations.

## Project Structure

```text
vhutec-med/
├── client/
│   ├── src/
│   │   ├── features/
│   │   │   ├── patient/
│   │   │   ├── receptionist/
│   │   │   └── doctor/
│   │   ├── components/
│   │   ├── context/
│   │   ├── api/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   └── package.json
│
├── server/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── sockets/
│   │   ├── prisma.js
│   │   └── app.js
│   ├── prisma.config.ts
│   ├── package.json
│   └── .env
│
├── .gitignore
└── README.md
```

## Technology Stack

### Frontend

* React
* Vite
* React Router
* Axios
* Socket.IO Client

### Backend

* Node.js
* Express.js
* Socket.IO
* Prisma ORM
* PostgreSQL
* JWT
* bcryptjs
* Zod
* Helmet
* CORS

## Database

The backend uses PostgreSQL with Prisma ORM.

### Database Name

```text
vhutec_med
```

### Database Tables

The approved database structure contains the following tables:

* users
* patients
* doctors
* receptionists
* departments
* doctor_department
* appointments
* queue
* consultation

### Main Relationships

* Users have one-to-one relationships with patients, doctors and receptionists.
* Doctors can belong to multiple departments.
* Departments can have multiple doctors.
* Patients can have multiple appointments.
* Doctors can have multiple appointments.
* Departments can have multiple appointments.
* Each appointment can have one queue record.
* Each appointment can have one consultation record.

## Requirements

Make sure the following are installed:

* Node.js
* npm
* PostgreSQL
* Git

## Installation

Clone the repository and install the dependencies.

### Backend

```bash
cd server
npm install
```

### Frontend

```bash
cd client
npm install
```

## Environment Configuration

Create the following file:

```text
server/.env
```

Example configuration:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/vhutec_med"
PORT=5000
JWT_SECRET="your-random-secret"
```

Replace `YOUR_PASSWORD` with the PostgreSQL password for the local development database.

Do not commit `.env` files, database passwords or other secrets to GitHub.

## Database Setup

After PostgreSQL is running and the database has been created, run the following commands from the `server` directory.

### Generate Prisma Client

```bash
npm run db:generate
```

### Apply Database Migrations

For an existing project checkout with committed migrations:

```bash
npx prisma migrate deploy
```

For local development when creating or changing migrations:

```bash
npm run db:migrate
```

### Seed Test Data

```bash
npm run seed
```

The seed creates basic test data including:

* Patient
* Doctor
* Receptionist
* Departments
* Doctor-department assignment
* Appointment
* Queue
* Consultation

### Prisma Studio

To view and manage the database through Prisma Studio:

```bash
npm run db:studio
```

## Running the Application

### Start the Backend

From the `server` directory:

```bash
npm start
```

The backend runs on:

```text
http://localhost:5000
```

### Development Mode

```bash
npm run dev
```

### Start the Frontend

From the `client` directory:

```bash
npm run dev
```

The frontend normally runs on:

```text
http://localhost:5173
```

## Backend Health Checks

The backend provides health endpoints for testing.

### API Health

```text
GET /api/health
```

Expected response:

```json
{
  "success": true,
  "message": "Vhutec Med API is running"
}
```

### Database Health

```text
GET /api/health/db
```

This endpoint verifies that the backend can successfully connect to PostgreSQL through Prisma.

Expected response:

```json
{
  "success": true,
  "message": "Vhutec Med database connection is working"
}
```

## Backend API Routes

The current backend provides CRUD endpoints for:

```text
/api/users
/api/patients
/api/doctors
/api/departments
/api/doctor-departments
/api/appointments
/api/queue
/api/consultations
```

### Example CRUD Operations

Most resources support:

```text
GET     /api/resource
GET     /api/resource/:id
POST    /api/resource
PUT     /api/resource/:id
DELETE  /api/resource/:id
```

The doctor-department endpoint additionally supports assigning and removing doctors from departments.

## Database Implementation

The backend database implementation includes:

* Prisma schema
* PostgreSQL database
* Primary keys
* Foreign keys
* Unique constraints
* Composite primary key for the doctor-department relationship
* One-to-one appointment relationships for queue and consultation
* Database migrations
* Test/seed data
* Prisma database connection
* CRUD controllers
* REST API routes
* Database health check

## Available Backend Scripts

From the `server` directory:

```bash
npm start
```

Starts the backend server.

```bash
npm run dev
```

Starts the backend in Node.js watch mode.

```bash
npm run seed
```

Creates the development/test database records.

```bash
npm run db:migrate
```

Creates/applies Prisma development migrations.

```bash
npm run db:generate
```

Generates the Prisma Client.

```bash
npm run db:studio
```

Opens Prisma Studio.

## Git Workflow

* `main` is the primary branch.
* Create a feature branch from `main` before making changes.
* Use descriptive branch names, for example:

```text
feature/patient-registration
feature/appointment-booking
feature/queue-management
feature/consultation-management
```

* Submit changes through a Pull Request where applicable.
* Pull Requests should be reviewed before being merged into `main`.
* Do not commit `.env` files or real secrets to the repository.

## Development Notes

This project is currently under active development.

Database changes should be made through Prisma migrations rather than manually modifying production database tables.

Before pushing changes, developers should verify:

```bash
npm run db:generate
npm run seed
npm start
```

and confirm:

```text
GET /api/health
GET /api/health/db
```

are working correctly.
