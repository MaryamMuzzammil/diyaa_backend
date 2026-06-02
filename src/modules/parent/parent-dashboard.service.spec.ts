import { ForbiddenException } from '@nestjs/common';
import { ParentDashboardService } from './parent-dashboard.service';

const parent = {
  id: 1,
  name: 'Parent Name',
  email: 'parent@diyaa.local',
  phone: '03000000000',
  institute: { id: 10 },
  user: { avatar_id: 'avatar_parent' },
} as any;

const linkedStudent = {
  id: 5,
  name: 'Ali Khan',
  email: 'ali@student.local',
  grade: 'Class 2',
  avatar_id: 'avatar_1',
  institute_id: 10,
  last_login_at: null,
} as any;

function repo(overrides: Record<string, unknown> = {}) {
  return {
    findOne: jest.fn(async () => null),
    find: jest.fn(async () => []),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 1, ...value })),
    ...overrides,
  } as any;
}

function makeService(linked = [linkedStudent]) {
  const linkRepo = repo({
    find: jest.fn(async () =>
      linked.map((student) => ({
        parent,
        student,
      })),
    ),
  });

  return new ParentDashboardService(
    repo(),
    linkRepo,
    repo(),
    repo(),
    repo(),
    repo(),
    repo(),
    repo(),
    repo(),
  );
}

describe('ParentDashboardService', () => {
  it('returns only linked children for the parent institute', async () => {
    const service = makeService([
      linkedStudent,
      { ...linkedStudent, id: 6, institute_id: 99 },
    ]);

    await expect(service.children(parent)).resolves.toEqual({
      children: [
        {
          id: 'stu_5',
          name: 'Ali Khan',
          avatar: 'avatar_1',
          grade: 'Class 2',
          class_name: 'Class 2',
        },
      ],
    });
  });

  it('blocks access to an unlinked child', async () => {
    const service = makeService();

    await expect(service.overview(parent, 99)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
