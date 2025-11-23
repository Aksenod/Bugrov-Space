import request from 'supertest';
import { describe, it, expect, beforeEach } from '@jest/globals';
import app from '../../app';
import { prisma } from '../../__tests__/setup';
import { createTestUser, getAuthToken, createTestProject, createTestAgent } from '../../__tests__/helpers';

describe('Projects API', () => {
  let user1Id: string;
  let user1Token: string;
  let user2Id: string;
  let user2Token: string;

  beforeEach(async () => {
    // Создаем двух пользователей для тестов изоляции
    const user1 = await createTestUser('user1', 'pass123');
    const user2 = await createTestUser('user2', 'pass123');
    user1Id = user1.id;
    user2Id = user2.id;
    user1Token = getAuthToken(user1Id);
    user2Token = getAuthToken(user2Id);
  });

  describe('GET /api/projects', () => {
    it('should return all projects for authenticated user', async () => {
      await createTestProject(user1Id, 'Project 1');
      await createTestProject(user1Id, 'Project 2');

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.projects).toHaveLength(2);
      expect(response.body.projects[0]).toHaveProperty('id');
      expect(response.body.projects[0]).toHaveProperty('name');
      expect(response.body.projects[0]).toHaveProperty('agentCount');
    });

    it('should isolate projects between users', async () => {
      await createTestProject(user1Id, 'User1 Project');
      await createTestProject(user2Id, 'User2 Project');

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.projects).toHaveLength(1);
      expect(response.body.projects[0].name).toBe('User1 Project');
    });

    it('should return projects sorted by createdAt desc', async () => {
      const project1 = await createTestProject(user1Id, 'First Project');
      await new Promise(resolve => setTimeout(resolve, 10)); // Небольшая задержка
      const project2 = await createTestProject(user1Id, 'Second Project');

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.projects).toHaveLength(2);
      expect(response.body.projects[0].id).toBe(project2.id);
      expect(response.body.projects[1].id).toBe(project1.id);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/projects')
        .expect(401);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return existing project', async () => {
      const project = await createTestProject(user1Id, 'My Project', 'Description');

      const response = await request(app)
        .get(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.project.id).toBe(project.id);
      expect(response.body.project.name).toBe('My Project');
      expect(response.body.project.description).toBe('Description');
      expect(response.body.project.agentCount).toBe(0);
    });

    it('should return 404 for non-existent project', async () => {
      await request(app)
        .get('/api/projects/nonexistent')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(404);
    });

    it('should return 404 for other user project', async () => {
      const project = await createTestProject(user2Id, 'Other User Project');

      await request(app)
        .get(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(404);
    });

    it('should include agent count', async () => {
      const project = await createTestProject(user1Id, 'Project with agents');
      await createTestAgent(user1Id, project.id, 'Agent 1');
      await createTestAgent(user1Id, project.id, 'Agent 2');

      const response = await request(app)
        .get(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.project.agentCount).toBe(2);
    });
  });

  describe('POST /api/projects', () => {
    it('should create project with valid data', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'New Project',
          description: 'Project description',
        })
        .expect(201);

      expect(response.body.project).toHaveProperty('id');
      expect(response.body.project.name).toBe('New Project');
      expect(response.body.project.description).toBe('Project description');
      expect(response.body.project.agentCount).toBe(0);
    });

    it('should create project without description', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Project Without Description',
        })
        .expect(201);

      expect(response.body.project.name).toBe('Project Without Description');
      expect(response.body.project.description).toBeNull();
    });

    it('should validate empty name', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: '',
        })
        .expect(400);

      expect(response.body.error).toContain('Validation error');
    });

    it('should validate name too long', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'a'.repeat(51),
        })
        .expect(400);

      expect(response.body.error).toContain('Validation error');
    });

    it('should validate description too long', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Valid Name',
          description: 'a'.repeat(501),
        })
        .expect(400);

      expect(response.body.error).toContain('Validation error');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/projects')
        .send({ name: 'Test' })
        .expect(401);
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update project name', async () => {
      const project = await createTestProject(user1Id, 'Original Name');

      const response = await request(app)
        .put(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Updated Name',
        })
        .expect(200);

      expect(response.body.project.name).toBe('Updated Name');
    });

    it('should update project description', async () => {
      const project = await createTestProject(user1Id, 'Project', 'Original Description');

      const response = await request(app)
        .put(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          description: 'Updated Description',
        })
        .expect(200);

      expect(response.body.project.description).toBe('Updated Description');
    });

    it('should clear description when set to null', async () => {
      const project = await createTestProject(user1Id, 'Project', 'Some Description');

      const response = await request(app)
        .put(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          description: null,
        })
        .expect(200);

      expect(response.body.project.description).toBeNull();
    });

    it('should return 404 for non-existent project', async () => {
      await request(app)
        .put('/api/projects/nonexistent')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: 'Updated' })
        .expect(404);
    });

    it('should return 404 for other user project', async () => {
      const project = await createTestProject(user2Id, 'Other User Project');

      await request(app)
        .put(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: 'Hacked' })
        .expect(404);
    });

    it('should validate name too long', async () => {
      const project = await createTestProject(user1Id, 'Project');

      await request(app)
        .put(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'a'.repeat(51),
        })
        .expect(400);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete project without agents', async () => {
      const project = await createTestProject(user1Id, 'To Delete');

      await request(app)
        .delete(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(204);

      // Проверяем, что проект удален
      const deleted = await prisma.project.findUnique({
        where: { id: project.id },
      });
      expect(deleted).toBeNull();
    });

    it('should cascade delete agents when deleting project', async () => {
      const project = await createTestProject(user1Id, 'Project with agents');
      const agent1 = await createTestAgent(user1Id, project.id, 'Agent 1');
      const agent2 = await createTestAgent(user1Id, project.id, 'Agent 2');

      await request(app)
        .delete(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(204);

      // Проверяем, что проект и агенты удалены
      const deletedProject = await prisma.project.findUnique({
        where: { id: project.id },
      });
      const deletedAgent1 = await prisma.agent.findUnique({
        where: { id: agent1.id },
      });
      const deletedAgent2 = await prisma.agent.findUnique({
        where: { id: agent2.id },
      });

      expect(deletedProject).toBeNull();
      expect(deletedAgent1).toBeNull();
      expect(deletedAgent2).toBeNull();
    });

    it('should return 404 for non-existent project', async () => {
      await request(app)
        .delete('/api/projects/nonexistent')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(404);
    });

    it('should return 404 for other user project', async () => {
      const project = await createTestProject(user2Id, 'Other User Project');

      await request(app)
        .delete(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      const project = await createTestProject(user1Id, 'Test');
      await request(app)
        .delete(`/api/projects/${project.id}`)
        .expect(401);
    });
  });
});

