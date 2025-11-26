import request from 'supertest';
import { describe, it, expect, beforeEach } from '@jest/globals';
import app from '../../app';
import { prisma } from '../../__tests__/setup';
import { createTestUser } from '../../__tests__/helpers';

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('registers a new user, normalizes username and returns token', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: '  NewUser ',
          password: 'secret123',
        })
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user.username).toBe('newuser');
      expect([null, 'user']).toContain(response.body.user.role);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.agents).toEqual([]);

      const userInDb = await prisma.user.findUnique({
        where: { username: 'newuser' },
      });
      expect(userInDb).not.toBeNull();
    });

    it('rejects duplicate usernames', async () => {
      await createTestUser('duplicate', 'pass123');

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'Duplicate ',
          password: 'pass123',
        })
        .expect(409);

      expect(response.body.error).toBe('Username already taken');
    });

    it('validates payload', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: '',
          password: '123',
        })
        .expect(400);

      expect(response.body.error).toContain('Validation error');
    });
  });

  describe('POST /api/auth/login', () => {
    const username = 'loginuser';
    const password = 'Password123';

    beforeEach(async () => {
      await prisma.user.deleteMany();
      await createTestUser(username, password);
    });

    it('logs in with valid credentials (username normalized)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: '  LoginUser ',
          password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user.username).toBe(username);
    });

    it('rejects invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username,
          password: 'WrongPass',
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });

    it('rejects unknown user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'missing',
          password,
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('POST /api/auth/reset', () => {
    const username = 'resetuser';
    const oldPassword = 'OldPass123';
    const newPassword = 'NewPass456';

    beforeEach(async () => {
      await prisma.user.deleteMany();
      await createTestUser(username, oldPassword);
    });

    it('resets password and allows login with the new one', async () => {
      await request(app)
        .post('/api/auth/reset')
        .send({
          username: ' ResetUser ',
          newPassword,
        })
        .expect(200);

      // old password should fail
      await request(app)
        .post('/api/auth/login')
        .send({ username, password: oldPassword })
        .expect(401);

      // new password should succeed
      await request(app)
        .post('/api/auth/login')
        .send({ username, password: newPassword })
        .expect(200);
    });

    it('returns 404 for unknown usernames', async () => {
      await prisma.user.deleteMany();

      const response = await request(app)
        .post('/api/auth/reset')
        .send({
          username: 'unknown',
          newPassword,
        })
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });

    it('validates payload', async () => {
      const response = await request(app)
        .post('/api/auth/reset')
        .send({
          username: '',
          newPassword: '123',
        })
        .expect(400);

      expect(response.body.error).toContain('Validation error');
    });
  });
});

