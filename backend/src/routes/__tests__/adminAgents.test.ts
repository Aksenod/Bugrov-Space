import request from 'supertest';
import { describe, it, expect, beforeEach } from '@jest/globals';
import app from '../../app';
import { prisma } from '../../__tests__/setup';
import { createTestUser, getAuthToken, createTestProjectTypeAgent } from '../../__tests__/helpers';

describe('Admin Agents Project Type Attachments', () => {
  let adminToken: string;

  beforeEach(async () => {
    const admin = await createTestUser('admin-user');
    adminToken = getAuthToken(admin.id);
  });

  describe('POST /api/admin/agents/:id/project-types', () => {
    it('preserves existing order when project type list does not change', async () => {
      const projectType = await prisma.projectType.create({
        data: { name: 'Landing' },
      });

      await createTestProjectTypeAgent(projectType.id, 'Первый агент', 0);
      const agentToUpdate = await createTestProjectTypeAgent(projectType.id, 'Второй агент', 1);

      const before = await (prisma as any).projectTypeAgentProjectType.findFirst({
        where: {
          projectTypeAgentId: agentToUpdate.id,
          projectTypeId: projectType.id,
        },
      });
      expect(before?.order).toBe(1);

      await request(app)
        .post(`/api/admin/agents/${agentToUpdate.id}/project-types`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ projectTypeIds: [projectType.id] })
        .expect(200);

      const after = await (prisma as any).projectTypeAgentProjectType.findFirst({
        where: {
          projectTypeAgentId: agentToUpdate.id,
          projectTypeId: projectType.id,
        },
      });

      expect(after?.order).toBe(1);
    });

    it('appends new project type connection to the end of its list', async () => {
      const projectTypeA = await prisma.projectType.create({
        data: { name: 'Маркетинг' },
      });

      const projectTypeB = await prisma.projectType.create({
        data: { name: 'Продажи' },
      });

      // Существующий агент в projectTypeB с order = 3
      await createTestProjectTypeAgent(projectTypeB.id, 'Старший агент', 3);

      const editableAgent = await createTestProjectTypeAgent(projectTypeA.id, 'Новый агент', 1);

      await request(app)
        .post(`/api/admin/agents/${editableAgent.id}/project-types`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ projectTypeIds: [projectTypeA.id, projectTypeB.id] })
        .expect(200);

      const newConnection = await (prisma as any).projectTypeAgentProjectType.findFirst({
        where: {
          projectTypeAgentId: editableAgent.id,
          projectTypeId: projectTypeB.id,
        },
      });

      expect(newConnection?.order).toBe(4);
    });
  });
});

