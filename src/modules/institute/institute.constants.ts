/** Auto-generated tenant id prefix: diyaa.0012026 */
export const SCHOOL_ID_PREFIX = 'diyaa.';

/** Fixed values for institute registration (matches frontend). */
export const INSTITUTE_TYPES = [
  'School',
  'Academy',
  'Tuition Center',
] as const;

export const CREATE_PRINCIPAL_OPTIONS = ['yes', 'no'] as const;

export const GRADES_OFFERED = [
  'Nursery',
  'KG',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
] as const;

export const STUDENT_RANGES = [
  '1-50',
  '50-100',
  '100-300',
  '300+',
] as const;

export const TEACHER_RANGES = ['1-5', '6-10', '11-20', '20+'] as const;

export const PLAN_PRICE_BY_STUDENT_RANGE: Record<string, string> = {
  '1-50': 'PKR 15,000',
  '50-100': 'PKR 25,000',
  '100-300': 'PKR 45,000',
  '300+': 'PKR 75,000',
};

export const REGISTRATION_OPTIONS = {
  institute_types: [...INSTITUTE_TYPES],
  create_principal: [...CREATE_PRINCIPAL_OPTIONS],
  grades_offered: [...GRADES_OFFERED],
  student_ranges: [...STUDENT_RANGES],
  teacher_ranges: [...TEACHER_RANGES],
  plan_price_by_student_range: PLAN_PRICE_BY_STUDENT_RANGE,
  payment: {
    use_payment_method_token: true,
    do_not_send: ['card_number', 'card_cvv'],
  },
  minimal_signup_role: 'school-admin',
};
