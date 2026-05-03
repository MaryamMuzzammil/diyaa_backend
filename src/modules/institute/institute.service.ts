import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Institute } from './institute.entity';
import { User, UserRole } from '../users/users.entity';
import { AcademicConfig } from './academic.entity';
import { Subscription } from './subscription.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class InstituteService {
  constructor(
    @InjectRepository(Institute)
    private instituteRepo: Repository<Institute>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    // 🔥 NEW
    @InjectRepository(AcademicConfig)
    private academicRepo: Repository<AcademicConfig>,

    @InjectRepository(Subscription)
    private subscriptionRepo: Repository<Subscription>,
  ) {}

  async findAll() {
    return this.instituteRepo.find({ relations: ['users'] });
  }

  async create(data: any) {
    return this.register(data);
  }

  async register(data: any) {
    const ownerName = data.owner_name ?? data.ownerName;
    const ownerEmail = data.owner_email ?? data.ownerEmail;
    const ownerPhone = data.owner_phone ?? data.ownerPhone ?? 'N/A';
    const instituteName = data.institute_name ?? data.instituteName;

    if (!ownerName || !ownerEmail || !data.password || !instituteName) {
      throw new BadRequestException(
        'institute_name, owner_name, owner_email and password are required',
      );
    }

    const existingInstitute = await this.instituteRepo.findOne({
      where: [{ owner_email: ownerEmail }],
    });
    if (existingInstitute) {
      throw new ConflictException(
        'An institute is already registered with this owner email',
      );
    }

    const existingUser = await this.userRepo.findOne({
      where: { email: ownerEmail },
    });
    if (existingUser) {
      throw new ConflictException('A user already exists with this email');
    }

    // 1️⃣ institute create
    const institute = await this.instituteRepo.save({
      name: instituteName,
      type: data.type,
      city: data.city,
      country: data.country,
      owner_name: ownerName,
      owner_email: ownerEmail,
      owner_phone: ownerPhone,
    });

    // 2️⃣ password hash
    const hash = await bcrypt.hash(data.password, 10);

    // 3️⃣ owner create
    const owner = await this.userRepo.save({
      name: ownerName,
      email: ownerEmail,
      password_hash: hash,
      role: UserRole.OWNER,
      institute: institute,
    });

    // 4️⃣ academic config (🔥 NEW)
    await this.academicRepo.save({
      institute: institute,
      grades: data.grades || [],
      students_range: data.students_range || '0',
      teachers_count: data.teachers_count || '0',
    });

    // 5️⃣ subscription (🔥 NEW)
    await this.subscriptionRepo.save({
      institute: institute,
      plan: data.plan || 'free',
    });

    return {
      message: 'Full institute setup complete 🚀',
      institute,
      owner,
    };
  }
}