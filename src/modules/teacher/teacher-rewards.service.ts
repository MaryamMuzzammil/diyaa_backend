import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { StudentReward } from '../student/entities/student-reward.entity';
import { AwardRewardDto } from './dto/award-reward.dto';
import { Teacher } from './teacher.entity';
import { TeacherScopeService } from './teacher-scope.service';

@Injectable()
export class TeacherRewardsService {
  constructor(
    @InjectRepository(StudentReward)
    private rewardRepo: Repository<StudentReward>,
    private scope: TeacherScopeService,
  ) {}

  async listRewardsForTeacher(teacher: Teacher, studentIds: number[]) {
    if (studentIds.length === 0) return [];

    const rows = await this.rewardRepo.find({
      where: { student: { id: In(studentIds) } },
      relations: ['student'],
      order: { earned_at: 'DESC' },
      take: 50,
    });

    return rows.map((r) => ({
      reward_id: r.id,
      type: r.type,
      title: r.title,
      student_id: r.student?.id,
      awarded_by: r.awarded_by_user_id,
      awarded_at: r.earned_at,
      points: r.points,
    }));
  }

  async awardReward(teacher: Teacher, dto: AwardRewardDto) {
    const student = await this.scope.assertStudentInScope(
      teacher,
      dto.student_id,
    );

    const rewardKey =
      dto.reward_key?.trim() ||
      `${dto.type}_${Date.now()}_${student.id}`.slice(0, 64);

    const reward = await this.rewardRepo.save(
      this.rewardRepo.create({
        student,
        reward_key: rewardKey,
        title: dto.title.trim(),
        type: dto.type,
        points: dto.points ?? 0,
        awarded_by_user_id: teacher.user?.user_id ?? null,
        claimed: false,
      }),
    );

    return {
      reward_id: reward.id,
      type: reward.type,
      title: reward.title,
      student_id: student.id,
      awarded_by: reward.awarded_by_user_id,
      awarded_at: reward.earned_at,
      points: reward.points,
    };
  }
}
