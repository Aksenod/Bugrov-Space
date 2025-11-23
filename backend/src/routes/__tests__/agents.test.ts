import request from 'supertest';
import { describe, it, expect, beforeEach } from '@jest/globals';
import app from '../../app';
import { prisma } from '../../__tests__/setup';
import { createTestUser, getAuthToken, createTestProject, createTestAgent } from '../../__tests__/helpers';

describe('Agents API with Projects', () => {
  let user1Id: string;
  let user1Token: string;
  let user2Id: string;
  let user2Token: string;
  let project1Id: string;
  let project2Id: string;
  let otherUserProjectId: string;

  beforeEach(async () => {
    // Создаем двух пользователей
    const user1 = await createTestUser('user1', 'pass123');
    const user2 = await createTestUser('user2', 'pass123');
    user1Id = user1.id;
    user2Id = user2.id;
    user1Token = getAuthToken(user1Id);
    user2Token = getAuthToken(user2Id);

    // Создаем проекты
    const project1 = await createTestProject(user1Id, 'Project 1');
    const project2 = await createTestProject(user1Id, 'Project 2');
    const otherProject = await createTestProject(user2Id, 'Other User Project');
    project1Id = project1.id;
    project2Id = project2.id;
    otherUserProjectId = otherProject.id;
  });

  describe('GET /api/agents', () => {
    it('should return agents for specified project', async () => {
      await createTestAgent(user1Id, project1Id, 'Agent 1');
      await createTestAgent(user1Id, project1Id, 'Agent 2');
      await createTestAgent(user1Id, project2Id, 'Agent 3');

      const response = await request(app)
        .get(`/api/agents?projectId=${project1Id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.agents).toHaveLength(2);
      expect(response.body.agents[0].name).toBe('Agent 1');
      expect(response.body.agents[1].name).toBe('Agent 2');
    });

    it('should return error when projectId is missing', async () => {
      const response = await request(app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(400);

      expect(response.body.error).toBe('projectId обязателен');
    });

    it('should return 404 for non-existent project', async () => {
      await request(app)
        .get('/api/agents?projectId=nonexistent')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(404);
    });

    it('should return 404 for other user project', async () => {
      await request(app)
        .get(`/api/agents?projectId=${otherUserProjectId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(404);
    });

    it('should isolate agents between projects', async () => {
      await createTestAgent(user1Id, project1Id, 'Project 1 Agent');
      await createTestAgent(user1Id, project2Id, 'Project 2 Agent');

      const response1 = await request(app)
        .get(`/api/agents?projectId=${project1Id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const response2 = await request(app)
        .get(`/api/agents?projectId=${project2Id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response1.body.agents).toHaveLength(1);
      expect(response1.body.agents[0].name).toBe('Project 1 Agent');
      expect(response2.body.agents).toHaveLength(1);
      expect(response2.body.agents[0].name).toBe('Project 2 Agent');
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/agents?projectId=${project1Id}`)
        .expect(401);
    });
  });

  describe('POST /api/agents', () => {
    it('should create agent with projectId', async () => {
      const response = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'New Agent',
          description: 'Agent description',
          systemInstruction: 'You are helpful',
          summaryInstruction: 'Summarize',
          model: 'gpt-5.1',
          role: 'assistant',
          projectId: project1Id,
        })
        .expect(201);

      expect(response.body.agent).toHaveProperty('id');
      expect(response.body.agent.name).toBe('New Agent');
      // projectId должен быть в ответе (если он включен в модель Prisma)
    });

    it('should return error when projectId is missing', async () => {
      const response = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'New Agent',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 404 when project does not exist', async () => {
      const response = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'New Agent',
          projectId: 'nonexistent',
        })
        .expect(404);

      expect(response.body.error).toBe('Проект не найден');
    });

    it('should return 404 when project belongs to other user', async () => {
      const response = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'New Agent',
          projectId: otherUserProjectId,
        })
        .expect(404);

      expect(response.body.error).toBe('Проект не найден');
    });

    it('should assign correct order to new agent', async () => {
      const agent1 = await createTestAgent(user1Id, project1Id, 'Agent 1');
      
      const response = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Agent 2',
          projectId: project1Id,
        })
        .expect(201);

      expect(response.body.agent.order).toBe(agent1.order + 1);
    });
  });

  describe('PUT /api/agents/:agentId', () => {
    it('should update agent without changing projectId', async () => {
      const agent = await createTestAgent(user1Id, project1Id, 'Original Name');

      const response = await request(app)
        .put(`/api/agents/${agent.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Updated Name',
        })
        .expect(200);

      expect(response.body.agent.name).toBe('Updated Name');
    });

    it('should allow moving agent to another project of same user', async () => {
      const agent = await createTestAgent(user1Id, project1Id, 'Agent');

      const response = await request(app)
        .put(`/api/agents/${agent.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          projectId: project2Id,
        })
        .expect(200);

      // Проверяем, что агент был перемещен (если projectId возвращается в ответе)
      // В реальном API projectId может не возвращаться, но агент должен быть обновлен в БД
      const updatedAgent = await prisma.agent.findUnique({ where: { id: agent.id } });
      expect(updatedAgent?.projectId).toBe(project2Id);
    });

    it('should return 404 when moving to non-existent project', async () => {
      const agent = await createTestAgent(user1Id, project1Id, 'Agent');

      const response = await request(app)
        .put(`/api/agents/${agent.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          projectId: 'nonexistent',
        })
        .expect(404);

      expect(response.body.error).toBe('Проект не найден');
    });

    it('should return 404 when moving to other user project', async () => {
      const agent = await createTestAgent(user1Id, project1Id, 'Agent');

      const response = await request(app)
        .put(`/api/agents/${agent.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          projectId: otherUserProjectId,
        })
        .expect(404);

      expect(response.body.error).toBe('Проект не найден');
    });
  });
});

