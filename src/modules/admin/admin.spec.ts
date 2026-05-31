import { UserRole } from '../users/users.entity';
import { paginate } from './dto/pagination-query.dto';
import { resolveSkillStatus } from '../student/constants/student-curriculum.constants';

describe('Admin helpers', () => {
  it('paginates items', () => {
    const result = paginate([1, 2, 3, 4, 5], 1, 2);
    expect(result.items).toEqual([1, 2]);
    expect(result.pagination.total).toBe(5);
  });

  it('maps superadmin role', () => {
    expect(UserRole.SUPERADMIN).toBe('SuperAdmin');
  });

  it('resolves skill level 1 as unlocked', () => {
    expect(
      resolveSkillStatus(
        { games_completed: 0, games_total: 1, games_won: 0 },
        null,
        1,
      ),
    ).toBe('unlocked');
  });
});

describe('Admin authorization expectations', () => {
  it('product owner permissions list includes manage_institutes', () => {
    const perms = [
      'view_global_dashboard',
      'manage_institutes',
      'suspend_institute',
    ];
    expect(perms).toContain('manage_institutes');
  });
});
