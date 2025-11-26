import request from 'supertest';
import { describe, it, expect, beforeEach } from '@jest/globals';
import app from '../../app';
import { prisma } from '../../__tests__/setup';
import { createTestUser, getAuthToken, createTestProject, createTestAgent, createTestProjectTypeAgent } from '../../__tests__/helpers';

const getDefaultProjectTypeId = async () => {
  const existing = await prisma.projectType.findFirst();
  if (existing) {
    return existing.id;
  }
  const created = await prisma.projectType.create({
    data: { name: 'По умолчанию' },
  });
  return created.id;
};

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
      const projectTypeId = await getDefaultProjectTypeId();
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'New Project',
          description: 'Project description',
          projectTypeId,
        })
        .expect(201);

      expect(response.body.project).toHaveProperty('id');
      expect(response.body.project.name).toBe('New Project');
      expect(response.body.project.description).toBe('Project description');
      expect(response.body.project.agentCount).toBe(0);
    });

    it('should create project without description', async () => {
      const projectTypeId = await getDefaultProjectTypeId();
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Project Without Description',
          projectTypeId,
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

    it('should clone template agents and knowledge base for the selected project type', async () => {
      const projectTypeId = await getDefaultProjectTypeId();
      const templateA = await createTestProjectTypeAgent(projectTypeId, 'Template Agent A', 0);
      const templateB = await createTestProjectTypeAgent(projectTypeId, 'Template Agent B', 1);

      // Добавляем базу знаний к первому шаблону
      await prisma.file.create({
        data: {
          projectTypeAgentId: templateA.id,
          name: 'KB - Template Agent A',
          mimeType: 'text/plain',
          content: Buffer.from('Knowledge base content').toString('base64'),
          isKnowledgeBase: true,
        },
      });

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Project With Templates',
          projectTypeId,
        })
        .expect(201);

      const projectId = response.body.project.id;
      expect(response.body.project.agentCount).toBe(2);

      const clonedAgents = await prisma.agent.findMany({
        where: { projectId },
        orderBy: { order: 'asc' },
      });

      expect(clonedAgents).toHaveLength(2);
      expect(clonedAgents[0].name).toBe('Template Agent A');
      expect(clonedAgents[0].projectTypeAgentId).toBe(templateA.id);
      expect(clonedAgents[1].name).toBe('Template Agent B');
      expect(clonedAgents[1].projectTypeAgentId).toBe(templateB.id);

      const clonedKnowledgeBase = await prisma.file.findMany({
        where: { agentId: clonedAgents[0].id, isKnowledgeBase: true },
      });

      expect(clonedKnowledgeBase).toHaveLength(1);
      expect(clonedKnowledgeBase[0].name).toBe('KB - Template Agent A');
      expect(clonedKnowledgeBase[0].projectTypeAgentId).toBeNull();
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

  describe('DELETE /api/projects/:projectId/files/:fileId', () => {
    it('should delete project file that belongs to the requesting user', async () => {
      const project = await createTestProject(user1Id, 'Docs Project');
      const agent = await createTestAgent(user1Id, project.id, 'Docs Agent');
      const file = await prisma.file.create({
        data: {
          agentId: agent.id,
          name: 'Summary - agent - now',
          mimeType: 'text/markdown',
          content: Buffer.from('# Summary').toString('base64'),
          isKnowledgeBase: false,
        },
      });

      await request(app)
        .delete(`/api/projects/${project.id}/files/${file.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(204);

      const deletedFile = await prisma.file.findUnique({ where: { id: file.id } });
      expect(deletedFile).toBeNull();
    });

    it('should not allow deleting files belonging to a different project', async () => {
      const projectA = await createTestProject(user1Id, 'Project A');
      const projectB = await createTestProject(user1Id, 'Project B');
      const agent = await createTestAgent(user1Id, projectA.id, 'Docs Agent');
      const file = await prisma.file.create({
        data: {
          agentId: agent.id,
          name: 'Summary - agent - now',
          mimeType: 'text/markdown',
          content: Buffer.from('# Summary').toString('base64'),
          isKnowledgeBase: false,
        },
      });

      await request(app)
        .delete(`/api/projects/${projectB.id}/files/${file.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(403);

      const existingFile = await prisma.file.findUnique({ where: { id: file.id } });
      expect(existingFile).not.toBeNull();
    });

    it('should delete template-based files linked to the project type', async () => {
      const project = await createTestProject(user1Id, 'Template Docs');
      const projectTypeId = project.projectTypeId;

      const template = await prisma.projectTypeAgent.create({
        data: {
          name: 'Template Agent',
          description: '',
          systemInstruction: '',
          summaryInstruction: '',
          model: 'gpt-5.1',
          role: '',
        },
      });

      await prisma.projectTypeAgentProjectType.create({
        data: {
          projectTypeAgentId: template.id,
          projectTypeId: projectTypeId,
          order: 0,
        },
      });

      const templateFile = await prisma.file.create({
        data: {
          projectTypeAgentId: template.id,
          agentId: null,
          name: 'Template Summary',
          mimeType: 'text/markdown',
          content: Buffer.from('# Template Summary').toString('base64'),
          isKnowledgeBase: false,
        },
      });

      await request(app)
        .delete(`/api/projects/${project.id}/files/${templateFile.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(204);

      const deletedFile = await prisma.file.findUnique({ where: { id: templateFile.id } });
      expect(deletedFile).toBeNull();
    });
  });

  describe('Admin agent synchronization', () => {
    let adminToken: string;
    let adminId: string;
    let regularUserId: string;
    let regularToken: string;
    let projectTypeId: string;

    beforeEach(async () => {
      const adminUser = await createTestUser('admin-sync', 'pass123');
      adminId = adminUser.id;
      await prisma.user.update({
        where: { id: adminId },
        data: { role: 'admin' },
      });
      adminToken = getAuthToken(adminId);

      const regularUser = await createTestUser('regular-user', 'pass123');
      regularUserId = regularUser.id;
      regularToken = getAuthToken(regularUserId);

      const projectType = await prisma.projectType.create({
        data: { name: `Type-${Date.now()}` },
      });
      projectTypeId = projectType.id;
    });

    it('should update project agents when admin updates template', async () => {
      const templateResponse = await request(app)
        .post('/api/admin/agents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Sync Template',
          description: 'Original description',
          systemInstruction: 'Original system',
          summaryInstruction: 'Original summary',
          model: 'gpt-5.1',
          role: '',
        })
        .expect(201);

      const templateId = templateResponse.body.agent.id;

      await request(app)
        .post(`/api/admin/agents/${templateId}/project-types`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ projectTypeIds: [projectTypeId] })
        .expect(200);

      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          name: 'Synced Project',
          projectTypeId,
        })
        .expect(201);

      const projectId = projectResponse.body.project.id;

      await request(app)
        .put(`/api/admin/agents/${templateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Template',
          systemInstruction: 'Updated system instruction',
        })
        .expect(200);

      const clonedAgents = await prisma.agent.findMany({
        where: { projectId },
      });

      expect(clonedAgents).toHaveLength(1);
      expect(clonedAgents[0].name).toBe('Updated Template');
      expect(clonedAgents[0].systemInstruction).toBe('Updated system instruction');
    });

    it('should add new agents to existing projects when admin attaches template to project type', async () => {
      const initialTemplate = await request(app)
        .post('/api/admin/agents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Initial Template',
          model: 'gpt-5.1',
        })
        .expect(201);

      const initialTemplateId = initialTemplate.body.agent.id;

      await request(app)
        .post(`/api/admin/agents/${initialTemplateId}/project-types`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ projectTypeIds: [projectTypeId] })
        .expect(200);

      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          name: 'Project With Single Agent',
          projectTypeId,
        })
        .expect(201);

      const projectId = projectResponse.body.project.id;

      const newTemplateResponse = await request(app)
        .post('/api/admin/agents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Template',
          model: 'gpt-5.1',
        })
        .expect(201);

      const newTemplateId = newTemplateResponse.body.agent.id;

      await request(app)
        .post(`/api/admin/agents/${newTemplateId}/project-types`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ projectTypeIds: [projectTypeId] })
        .expect(200);

      const clonedAgents = await prisma.agent.findMany({
        where: { projectId },
        orderBy: { name: 'asc' },
      });

      expect(clonedAgents).toHaveLength(2);
      const agentNames = clonedAgents.map((agent) => agent.name).sort();
      expect(agentNames).toEqual(['Initial Template', 'New Template']);
    });
  });
});

