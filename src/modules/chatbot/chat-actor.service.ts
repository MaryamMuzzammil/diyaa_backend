import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InstituteAdmin } from '../institute-admin/institute-admin.entity';
import { Parent } from '../parent/parent.entity';
import { Student } from '../student/student.entity';
import { Teacher } from '../teacher/teacher.entity';
import { User, UserRole } from '../users/users.entity';

export type ChatActorContext = {
  user_id: number;
  user_name: string;
  user_role: string;
  institute_id: number | null;
  profile_id: number | null;
  profile_type: string | null;
};

type JwtActor = { sub: number; email: string; role: string };

@Injectable()
export class ChatActorService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Student)
    private studentRepo: Repository<Student>,
    @InjectRepository(Teacher)
    private teacherRepo: Repository<Teacher>,
    @InjectRepository(Parent)
    private parentRepo: Repository<Parent>,
    @InjectRepository(InstituteAdmin)
    private adminRepo: Repository<InstituteAdmin>,
  ) {}

  async resolve(actor: JwtActor): Promise<ChatActorContext> {
    const user = await this.userRepo.findOne({
      where: { user_id: actor.sub },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const base: ChatActorContext = {
      user_id: user.user_id,
      user_name: user.name,
      user_role: actor.role,
      institute_id: user.institute_id ?? null,
      profile_id: null,
      profile_type: null,
    };

    switch (actor.role) {
      case UserRole.STUDENT: {
        const student = await this.studentRepo.findOne({
          where: { user_id: user.user_id },
        });
        if (student) {
          base.profile_id = student.id;
          base.profile_type = 'student';
          if (student.institute_id != null) {
            base.institute_id = student.institute_id;
          }
        }
        break;
      }
      case UserRole.TEACHER: {
        const teacher = await this.teacherRepo.findOne({
          where: { user: { user_id: user.user_id } },
          relations: ['institute'],
        });
        if (teacher) {
          base.profile_id = teacher.id;
          base.profile_type = 'teacher';
          base.institute_id = teacher.institute?.id ?? base.institute_id;
        }
        break;
      }
      case UserRole.PARENT: {
        const parent = await this.parentRepo.findOne({
          where: { user: { user_id: user.user_id } },
          relations: ['institute'],
        });
        if (parent) {
          base.profile_id = parent.id;
          base.profile_type = 'parent';
          base.institute_id = parent.institute?.id ?? base.institute_id;
        }
        break;
      }
      case UserRole.ADMIN: {
        const admin = await this.adminRepo.findOne({
          where: { user: { user_id: user.user_id } },
          relations: ['institute'],
        });
        if (admin) {
          base.profile_id = admin.id;
          base.profile_type = 'institute_admin';
          base.institute_id = admin.institute?.id ?? base.institute_id;
        }
        break;
      }
      default:
        break;
    }

    return base;
  }
}
