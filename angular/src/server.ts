import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

type Department = 'CSE' | 'IT' | 'ECE';

interface Student {
  id: string;
  name: string;
  email: string;
  course: string;
  department: Department;
  marks: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

let students: Student[] = [];
let users: User[] = [];

app.use(express.json());

app.use('/api', (req, res, next) => {
  const origin = req.headers.origin || 'http://localhost:4200';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    res.status(400).json({ message: 'Name, email and password are required.' });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existingUser = users.find((user) => user.email === normalizedEmail);

  if (existingUser) {
    res.status(409).json({ message: 'User already exists with this email.' });
    return;
  }

  const newUser: User = {
    id: Date.now().toString(),
    name: String(name).trim(),
    email: normalizedEmail,
    password: String(password)
  };

  users.push(newUser);
  res.status(201).json({ message: 'User Registered Successfully' });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();

  const user = users.find((entry) => entry.email === normalizedEmail && entry.password === String(password || ''));
  if (!user) {
    res.status(401).json({ message: 'Invalid email or password.' });
    return;
  }

  res.status(200).json({ message: 'Login Successful' });
});

app.get('/api/auth/logout', (_req, res) => {
  res.status(200).json({ message: 'Logout successful.' });
});

app.get('/api/students', (_req, res) => {
  res.status(200).json({ students });
});

app.post('/api/students', (req, res) => {
  const { name, email, course, department, marks } = req.body || {};

  if (!name || !email || !course || !department || typeof marks !== 'number') {
    res.status(400).json({ message: 'Invalid student payload.' });
    return;
  }

  const newStudent: Student = {
    id: Date.now().toString(),
    name: String(name).trim(),
    email: String(email).trim(),
    course: String(course).trim(),
    department,
    marks
  };

  students.push(newStudent);
  res.status(201).json({ student: newStudent, message: 'Student created.' });
});

app.put('/api/students/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, course, department, marks } = req.body || {};

  const index = students.findIndex((student) => student.id === id);
  if (index === -1) {
    res.status(404).json({ message: 'Student not found.' });
    return;
  }

  if (!name || !email || !course || !department || typeof marks !== 'number') {
    res.status(400).json({ message: 'Invalid student payload.' });
    return;
  }

  const updatedStudent: Student = {
    id,
    name: String(name).trim(),
    email: String(email).trim(),
    course: String(course).trim(),
    department,
    marks
  };

  students[index] = updatedStudent;
  res.status(200).json({ student: updatedStudent, message: 'Student updated.' });
});

app.delete('/api/students/:id', (req, res) => {
  const { id } = req.params;
  const beforeCount = students.length;
  students = students.filter((student) => student.id !== id);

  if (students.length === beforeCount) {
    res.status(404).json({ message: 'Student not found.' });
    return;
  }

  res.status(200).json({ message: 'Student deleted.' });
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 5000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
