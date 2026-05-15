import { Repository } from 'typeorm';
import { SCHOOL_ID_PREFIX } from './institute.constants';
import { Institute } from './institute.entity';

/** e.g. diyaa.0012026 — prefix + 3-digit sequence + registration year */
export async function generateNextSchoolId(
  instituteRepo: Repository<Institute>,
): Promise<string> {
  const year = new Date().getFullYear();
  const pattern = `${SCHOOL_ID_PREFIX}%${year}`;

  const rows = await instituteRepo
    .createQueryBuilder('i')
    .select('i.school_id', 'school_id')
    .where('i.school_id LIKE :pattern', { pattern })
    .getRawMany<{ school_id: string }>();

  const seqRe = new RegExp(
    `^${SCHOOL_ID_PREFIX.replace('.', '\\.')}(\\d{3})${year}$`,
  );

  let maxSeq = 0;
  for (const row of rows) {
    const match = row.school_id?.match(seqRe);
    if (match) {
      maxSeq = Math.max(maxSeq, parseInt(match[1], 10));
    }
  }

  const next = maxSeq + 1;
  return `${SCHOOL_ID_PREFIX}${String(next).padStart(3, '0')}${year}`;
}

export async function ensureInstituteSchoolId(
  institute: Institute,
  instituteRepo: Repository<Institute>,
): Promise<Institute> {
  if (institute.school_id?.trim()) {
    return institute;
  }
  institute.school_id = await generateNextSchoolId(instituteRepo);
  return instituteRepo.save(institute);
}
