const express = require('express');
const session = require('express-session');
const request = require('supertest');
const bcrypt = require('bcrypt');

const authRoutes = require('../src/routes/auth');
const { executeQuery } = require('../src/config/database');

function createTestApp() {
  const app = express();
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(
    session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false
    })
  );
  app.use((req, res, next) => {
    req.csrfToken = () => 'test-token';
    res.locals = res.locals || {};
    res.locals.csrfToken = 'test-token';
    next();
  });
  app.use('/auth', authRoutes);
  return app;
}

describe('Auth routes', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  test('registers a new user with unique email and pseudo', async () => {
    executeQuery
      .mockResolvedValueOnce([]) // email lookup
      .mockResolvedValueOnce([]) // pseudo lookup
      .mockResolvedValueOnce({ insertId: 1 }); // insert user

    const response = await request(app)
      .post('/auth/register')
      .type('form')
      .send({
        email: 'new.user@example.com',
        password: 'Stronger!Pass1',
        confirmPassword: 'Stronger!Pass1',
        pseudo: 'NewUser'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/auth/login');
    expect(executeQuery).toHaveBeenNthCalledWith(
      3,
      'INSERT INTO users (email, password, pseudo, role, status) VALUES (?, ?, ?, ?, ?)',
      expect.any(Array)
    );

    const insertArgs = executeQuery.mock.calls[2][1];
    expect(insertArgs[0]).toBe('new.user@example.com');
    expect(typeof insertArgs[1]).toBe('string');
    expect(insertArgs[2]).toBe('NewUser');
    expect(insertArgs[3]).toBe('user');
    expect(insertArgs[4]).toBe('active');
  });

  test('locks the account after repeated invalid passwords', async () => {
    const hashed = await bcrypt.hash('Valid!Pass123', 10);

    executeQuery
      .mockResolvedValueOnce([
        {
          id: 7,
          email: 'locked@example.com',
          password: hashed,
          pseudo: 'LockedUser',
          role: 'user',
          status: 'active',
          failed_attempts: 4,
          locked_until: null
        }
      ])
      .mockResolvedValueOnce({ affectedRows: 1 });

    const response = await request(app)
      .post('/auth/login')
      .type('form')
      .send({
        email: 'locked@example.com',
        password: 'Wrong!Pass123'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/auth/login');
    expect(executeQuery).toHaveBeenNthCalledWith(
      2,
      'UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?',
      expect.any(Array)
    );

    const updateArgs = executeQuery.mock.calls[1][1];
    expect(updateArgs[0]).toBe(0);
    expect(updateArgs[1]).toBeInstanceOf(Date);
    expect(updateArgs[2]).toBe(7);
  });
});
