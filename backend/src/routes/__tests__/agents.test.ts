import request from 'supertest';
import { describe, it, expect, beforeEach } from '@jest/globals';
import app from '../../app';
import { prisma } from '../../__tests__/setup';
import { createTestUser, getAuthToken, createTestProject, createTestAgent, createTestProjectTypeAgent } from '../../__tests__/helpers';

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

    it('should synchronize missing project agents from templates before responding', async () => {
      const project = await prisma.project.findUnique({
        where: { id: project1Id },
        select: { projectTypeId: true },
      });

      if (!project?.projectTypeId) {
        throw new Error('Test project lacks projectTypeId');
      }

      await prisma.agent.deleteMany({ where: { projectId: project1Id } });
      const template = await createTestProjectTypeAgent(project.projectTypeId, 'Template Sync Agent', 0);

      const response = await request(app)
        .get(`/api/agents?projectId=${project1Id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.agents).toHaveLength(1);
      expect(response.body.agents[0].name).toBe('Template Sync Agent');

      const dbAgents = await prisma.agent.findMany({ where: { projectId: project1Id } });
      expect(dbAgents).toHaveLength(1);
      expect(dbAgents[0].projectTypeAgentId).toBe(template.id);
    });
  });

  describe('POST /api/agents', () => {
    it('should return 403 because agents are managed by administrator', async () => {
      const response = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'New Agent',
          projectId: project1Id,
        })
        .expect(403);

      expect(response.body.error).toBe('Управление агентами доступно только администратору');
    });
  });

  describe('PUT /api/agents/:agentId', () => {
    it('should return 403 because agents are managed by administrator', async () => {
      const agent = await createTestAgent(user1Id, project1Id, 'Original Name');

      const response = await request(app)
        .put(`/api/agents/${agent.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Updated Name',
        })
        .expect(403);

      expect(response.body.error).toBe('Управление агентами доступно только администратору');
    });
  });
});

