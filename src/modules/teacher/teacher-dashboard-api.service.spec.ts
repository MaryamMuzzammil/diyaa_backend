import { ForbiddenException } from '@nestjs/common';
import { TeacherDashboardApiService } from './teacher-dashboard-api.service';

const teacher = {
  id: 7,
  name: 'Teacher Name',
  email: 'teacher@diyaa.com',
  branch: 'Main Campus',
  subjects: ['Mathematics'],
} as any;

const section = {
  id: 1,
  grade: 'Class 2',
  section: 'A',
  branch: 'Main Campus',
} as any;

function repo(overrides: Record<string, unknown> = {}) {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 11, ...value })),
    ...overrides,
  } as any;
}

function makeService(overrides: { assignmentRepo?: any; contentRepo?: any; scope?: any } = {}) {
  const assignmentRepo =
    overrides.assignmentRepo ??
    repo({
      findOne: jest.fn(async () => ({
        class_section: section,
        subjects: ['Mathematics'],
      })),
    });
  const contentRepo = overrides.contentRepo ?? repo();
  const scope =
    overrides.scope ??
    ({
      assertClassAssigned: jest.fn(async () => section),
      getScopedStudents: jest.fn(async () => []),
    } as any);

  return {
    service: new TeacherDashboardApiService(
      assignmentRepo,
      contentRepo,
      repo(),
      repo(),
      repo(),
      repo(),
      repo(),
      repo(),
      repo(),
      repo(),
      repo(),
      repo(),
      scope,
    ),
    contentRepo,
  };
}

describe('TeacherDashboardApiService', () => {
  it('creates content only for assigned class and subject', async () => {
    const { service, contentRepo } = makeService();

    const result = await service.createContent(teacher, {
      classId: 'class_1',
      sectionId: 'sec_a',
      subjectId: 'sub_mathematics',
      type: 'Lesson',
      title: 'Fractions Intro',
      description: 'Teacher instructions',
    });

    expect(contentRepo.save).toHaveBeenCalled();
    expect(result.content_id).toBe(11);
    expect(result.subject).toBe('Mathematics');
  });

  it('rejects content creation for an unassigned subject', async () => {
    const { service } = makeService();

    await expect(
      service.createContent(teacher, {
        classId: 'class_1',
        sectionId: 'sec_a',
        subjectId: 'sub_science',
        type: 'Lesson',
        title: 'Plants',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
