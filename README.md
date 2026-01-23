# Exam Software

A full-stack web application for managing online exams, supporting multiple user roles (Admin, Teacher, Student), exam creation, participation, and results management.

## Features
- **User authentication & authorization (Admin, Teacher, Student)**
- **Exam creation and scheduling**
- **Question bank management (add, edit, delete questions)**
- **Student registration and profile management**
- **Online exam participation for students**
- **Automatic grading and result calculation**
- **Result viewing and analytics for students and teachers**
- **Role-based dashboards with customized views**
- **Secure exam environment (anti-cheating measures, time limits)**
- **Password recovery and account management**
- **Distinct dashboards for Admin, Teacher, and Student roles**
- **Exam submission and result export (JSON/HTML reports)**
- **Teacher-student management (teachers can view/manage their students)**
- **Enhanced profile management for all user roles**
- **Exam approval and moderation workflows**
- **Rate limiting and security middleware for backend APIs**
- **Automated load and performance testing with Artillery scripts**

## Directory Structure
```
Exam Software/
  client/      # React frontend
  server/      # Node.js/Express backend
```

## Getting Started

### Prerequisites
- Node.js (v14+ recommended)
- npm (v6+)

### Setup Instructions

#### 1. Clone the repository
```bash
git clone <repo-url>
cd "Exam Software"
```

#### 2. Install dependencies

##### Client
```bash
cd client
npm install
```

##### Server
```bash
cd ../server
npm install
```

#### 3. Environment Variables
- Configure environment variables as needed for the server (e.g., database URI, JWT secret). See `server/config/` for details.

#### 4. Running the Application

##### Start the server
```bash
cd server
npm start
```

##### Start the client
```bash
cd client
npm start
```

The client will typically run on [http://localhost:3000](http://localhost:3000) and the server on [http://localhost:5000](http://localhost:5000) by default.

## Usage
- Register or log in as Admin, Teacher, or Student.
- Admins can manage users and exams.
- Teachers can create exams, manage questions, and view student results.
- Students can take exams and view their results.

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License
[Specify your license here]
