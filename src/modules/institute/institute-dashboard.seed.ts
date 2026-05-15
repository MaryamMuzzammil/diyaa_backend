import { Repository } from 'typeorm';
import { AcademicConfig } from './academic.entity';
import { BillingInvoice } from './entities/billing-invoice.entity';
import { ClassSection } from './entities/class-section.entity';
import { DailyActivity } from './entities/daily-activity.entity';
import { EngagementInsight } from './entities/engagement-insight.entity';
import { InstituteContent } from './entities/institute-content.entity';
import { SubjectMetric } from './entities/subject-metric.entity';
import { Institute } from './institute.entity';
import { Subscription } from './subscription.entity';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;

const DEFAULT_SUBJECTS = [
  { subject: 'English', score: 82, engagement: 76 },
  { subject: 'Urdu', score: 74, engagement: 68 },
  { subject: 'Math', score: 79, engagement: 81 },
  { subject: 'Science', score: 85, engagement: 88 },
];

const DEFAULT_INSIGHTS = [
  'Grade 3 Urdu engagement is below school average.',
  'Science games are driving the highest repeat usage.',
];

export async function seedInstituteDashboardIfEmpty(deps: {
  institute: Institute;
  academic: AcademicConfig | null;
  subscription: Subscription | null;
  classRepo: Repository<ClassSection>;
  contentRepo: Repository<InstituteContent>;
  invoiceRepo: Repository<BillingInvoice>;
  activityRepo: Repository<DailyActivity>;
  subjectRepo: Repository<SubjectMetric>;
  insightRepo: Repository<EngagementInsight>;
}) {
  const instituteId = deps.institute.id;
  const existing = await deps.activityRepo.count({
    where: { institute: { id: instituteId } },
  });
  if (existing > 0) {
    return;
  }

  const grades =
    deps.academic?.grades?.filter(Boolean) ??
    ['Grade 1', 'Grade 2', 'Grade 3'];
  const branch = deps.institute.city?.trim()
    ? `${deps.institute.city} Campus`
    : 'Main Campus';
  const sections = ['A', 'B'];

  for (const grade of grades.slice(0, 4)) {
    for (const section of sections) {
      await deps.classRepo.save({
        institute: deps.institute,
        grade,
        section,
        branch,
        student_count: 28 + sections.indexOf(section) * 4,
        teacher_names: [],
      });
    }
  }

  await deps.contentRepo.save([
    {
      institute: deps.institute,
      title: 'Grade 2 English: Reading Fluency',
      subject: 'English',
      type: 'Lesson Pack',
      assigned_to: grades[0] ? `${grades[0]} - A` : null,
    },
    {
      institute: deps.institute,
      title: 'Science Lab Safety',
      subject: 'Science',
      type: 'Lesson',
      assigned_to: null,
    },
  ]);

  const planPrice = deps.subscription?.plan_price ?? 'PKR 15,000';
  const today = new Date();
  const lastMonth = new Date(today);
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  await deps.invoiceRepo.save({
    institute: deps.institute,
    invoice: `INV-${today.getFullYear()}-${String(instituteId).padStart(3, '0')}`,
    invoice_date: lastMonth.toISOString().slice(0, 10),
    amount: planPrice,
    status: 'Paid',
  });

  const baseActive = 400 + instituteId * 20;
  for (let i = 0; i < WEEKDAYS.length; i++) {
    const factor = 0.85 + i * 0.05;
    await deps.activityRepo.save({
      institute: deps.institute,
      day: WEEKDAYS[i],
      active: Math.round(baseActive * factor),
      lessons: Math.round(baseActive * 0.45 * factor),
      games: Math.round(baseActive * 0.28 * factor),
    });
  }

  for (const row of DEFAULT_SUBJECTS) {
    await deps.subjectRepo.save({ institute: deps.institute, ...row });
  }

  for (const message of DEFAULT_INSIGHTS) {
    await deps.insightRepo.save({ institute: deps.institute, message });
  }
}
