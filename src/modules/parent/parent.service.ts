import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateInstituteUserDto } from '../institute/dto/create-institute-user.dto';
import { Institute } from '../institute/institute.entity';
import { Student } from '../student/student.entity';
import { User } from '../users/users.entity';
import { ParentStudentLink } from './entities/parent-student-link.entity';
import { Parent } from './parent.entity';

@Injectable()
export class ParentService {
  constructor(
    @InjectRepository(Parent)
    private repo: Repository<Parent>,
    @InjectRepository(Student)
    private studentRepo: Repository<Student>,
    @InjectRepository(ParentStudentLink)
    private linkRepo: Repository<ParentStudentLink>,
  ) {}

  async create(user: User, institute: Institute, dto: CreateInstituteUserDto) {
    const parent = await this.repo.save(
      this.repo.create({
        institute,
        user,
        name: user.name,
        email: user.email,
        status: user.status,
        phone: dto.phone ?? user.phone ?? null,
        occupation: dto.occupation ?? null,
        address: dto.address ?? dto.permanent_address ?? null,
      }),
    );

    const studentIds = dto.student_ids ?? dto.child_ids ?? [];
    if (studentIds.length) {
      await this.linkStudents(parent, studentIds, institute.id);
    }

    return parent;
  }

  async linkStudents(parent: Parent, studentIds: number[], instituteId: number) {
    const students = await this.studentRepo.find({
      where: { id: In(studentIds), institute_id: instituteId },
    });
    if (students.length !== studentIds.length) {
      throw new BadRequestException(
        'All linked students must belong to the same institute as the parent',
      );
    }

    for (const student of students) {
      const exists = await this.linkRepo.findOne({
        where: { parent: { id: parent.id }, student: { id: student.id } },
      });
      if (!exists) {
        await this.linkRepo.save(this.linkRepo.create({ parent, student }));
      }
    }
  }

  async linkStudentsByParentId(
    parentId: number,
    studentIds: number[],
    instituteId: number,
  ) {
    const parent = await this.repo.findOne({
      where: { id: parentId, institute: { id: instituteId } },
      relations: ['institute'],
    });
    if (!parent) {
      throw new NotFoundException('Parent not found in this institute');
    }
    await this.linkStudents(parent, studentIds, instituteId);
    return this.getLinkedChildren(parent.id);
  }

  async getLinkedChildren(parentId: number) {
    const links = await this.linkRepo.find({
      where: { parent: { id: parentId } },
      relations: ['student'],
      order: { id: 'ASC' },
    });
    return links.map((link) => ({
      id: link.student.id,
      name: link.student.name,
      grade: link.student.grade,
      avatar: link.student.avatar_id,
    }));
  }

  async deleteForUser(userId: number) {
    await this.repo.delete({ user: { user_id: userId } });
  }

  async syncFromUser(user: User) {
    await this.repo.update(
      { user: { user_id: user.user_id } },
      { status: user.status, name: user.name, email: user.email },
    );
  }

  async findByInstituteId(instituteId: number) {
    const rows = await this.repo.find({
      where: { institute: { id: instituteId } },
      relations: ['user', 'institute'],
      order: { name: 'ASC' },
    });
    return rows.map((r) => this.toListItem(r));
  }

  toListItem(record: Parent) {
    return {
      ...this.toPublic(record),
      class_or_branch: null,
      last_active: formatLastActive(record.user?.last_active_at ?? null),
    };
  }

  toPublic(record: Parent, instituteId?: number, userId?: number) {
    return {
      id: record.id,
      institute_id: instituteId ?? record.institute?.id,
      user_id: userId ?? record.user?.user_id,
      role: 'Parent' as const,
      name: record.name,
      email: record.email,
      status: record.status,
      phone: record.phone,
      occupation: record.occupation,
      address: record.address,
      created_at: record.created_at,
    };
  }
}

function formatLastActive(date: Date | null): string {
  if (!date) return 'Never';
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return `${sec} secs ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)} mins ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hours ago`;
  return `${Math.floor(sec / 86400)} days ago`;
}
