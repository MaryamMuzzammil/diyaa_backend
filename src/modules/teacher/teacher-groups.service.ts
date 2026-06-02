import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassSection } from '../institute/entities/class-section.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { TeacherGroupMember } from './entities/teacher-group-member.entity';
import { TeacherStudentGroup } from './entities/teacher-student-group.entity';
import { Teacher } from './teacher.entity';
import { TeacherScopeService } from './teacher-scope.service';
import { formatClassName } from './utils/teacher-format.util';

@Injectable()
export class TeacherGroupsService {
  constructor(
    @InjectRepository(TeacherStudentGroup)
    private groupRepo: Repository<TeacherStudentGroup>,
    @InjectRepository(TeacherGroupMember)
    private memberRepo: Repository<TeacherGroupMember>,
    private scope: TeacherScopeService,
  ) {}

  async listGroups(teacher: Teacher) {
    const rows = await this.groupRepo.find({
      where: { teacher: { id: teacher.id } },
      relations: ['class_section', 'members', 'members.student'],
      order: { created_at: 'DESC' },
    });

    return rows.map((g) => this.toGroupRow(g));
  }

  async createGroup(teacher: Teacher, dto: CreateGroupDto) {
    let classSection: ClassSection | null = null;
    if (dto.class_section_id != null) {
      classSection = await this.scope.assertClassAssigned(
        teacher,
        dto.class_section_id,
      );
    }

    const group = await this.groupRepo.save(
      this.groupRepo.create({
        teacher,
        class_section: classSection,
        name: dto.name.trim(),
        level: dto.level ?? null,
      }),
    );

    if (dto.student_ids?.length) {
      for (const studentId of dto.student_ids) {
        const student = await this.scope.assertStudentInScope(
          teacher,
          studentId,
        );
        await this.memberRepo.save(
          this.memberRepo.create({ group, student }),
        );
      }
    }

    const full = await this.groupRepo.findOne({
      where: { id: group.id },
      relations: ['class_section', 'members', 'members.student'],
    });
    return this.toGroupRow(full!);
  }

  private toGroupRow(g: TeacherStudentGroup) {
    return {
      id: `grp_${g.id}`,
      group_id: g.id,
      name: g.name,
      student_count: g.members?.length ?? 0,
      students:
        g.members?.map((member) => ({
          student_id: member.student?.id,
          student_name: member.student?.name,
        })) ?? [],
      class_name: g.class_section
        ? formatClassName(g.class_section.grade, g.class_section.section)
        : null,
      level: g.level,
    };
  }
}
