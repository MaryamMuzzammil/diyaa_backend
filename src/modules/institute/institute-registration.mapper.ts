import { BadRequestException } from '@nestjs/common';
import { PLAN_PRICE_BY_STUDENT_RANGE } from './institute.constants';
import { RegisterInstituteDto } from './dto/register-institute.dto';

export interface NormalizedInstituteRegistration {
  ownerFullName: string;
  ownerEmail: string;
  ownerPhone: string;
  password: string;
  instituteName: string;
  instituteType: string;
  registrationNumber: string | null;
  logoFileName: string | null;
  country: string;
  city: string;
  address: string | null;
  createPrincipal: boolean;
  principalName: string | null;
  principalEmail: string | null;
  principalPhone: string | null;
  principalPassword: string | null;
  gradesOffered: string[];
  studentRange: string;
  teacherRange: string;
  planName: string;
  planPrice: string | null;
  trialDays: number;
  billingName: string | null;
  billingAddress: string | null;
  paymentMethodToken: string | null;
  paymentLast4: string | null;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  isMinimalSignup: boolean;
}

function hasRawCardFields(dto: RegisterInstituteDto): boolean {
  const card =
    dto.card_number?.trim() ||
    dto.card_cvv?.trim() ||
    (dto.card_expiry?.trim() && !dto.payment_method_token?.trim());
  return Boolean(card);
}

function isMinimalPayload(dto: RegisterInstituteDto): boolean {
  const hasFullMarker =
    dto.institute_name?.trim() ||
    dto.owner_full_name?.trim() ||
    dto.owner_email?.trim();
  const hasMinimal =
    (dto.email?.trim() || dto.owner_email?.trim()) &&
    dto.password &&
    dto.name?.trim();
  return Boolean(hasMinimal && !hasFullMarker);
}

export function normalizeInstituteRegistration(
  dto: RegisterInstituteDto,
): NormalizedInstituteRegistration {
  if (hasRawCardFields(dto)) {
    throw new BadRequestException(
      'Do not send card_number or card_cvv. Use payment_method_token from your payment provider instead.',
    );
  }

  if (
    dto.confirm_password !== undefined &&
    dto.confirm_password !== dto.password
  ) {
    throw new BadRequestException(
      'password and confirm_password do not match',
    );
  }

  const minimal = isMinimalPayload(dto);

  if (minimal) {
    if (!dto.email?.trim() || !dto.name?.trim()) {
      throw new BadRequestException(
        'email and name are required for minimal signup',
      );
    }
    const ownerEmail = String(dto.email).trim().toLowerCase();
    const displayName = String(dto.name).trim();
    if (dto.role && dto.role !== 'school-admin') {
      throw new BadRequestException(
        'Minimal signup only supports role "school-admin" (institute owner)',
      );
    }

    return {
      ownerFullName: displayName,
      ownerEmail,
      ownerPhone: 'N/A',
      password: dto.password,
      instituteName: displayName,
      instituteType: 'School',
      registrationNumber: null,
      logoFileName: null,
      country: '',
      city: '',
      address: null,
      createPrincipal: false,
      principalName: null,
      principalEmail: null,
      principalPhone: null,
      principalPassword: null,
      gradesOffered: [],
      studentRange: '1-50',
      teacherRange: '1-5',
      planName: 'Starter',
      planPrice: PLAN_PRICE_BY_STUDENT_RANGE['1-50'],
      trialDays: 7,
      billingName: displayName,
      billingAddress: null,
      paymentMethodToken: dto.payment_method_token?.trim() || null,
      paymentLast4: dto.payment_last4?.trim() || null,
      acceptTerms: true,
      acceptPrivacy: true,
      isMinimalSignup: true,
    };
  }

  const ownerEmail = String(dto.owner_email ?? dto.email)
    .trim()
    .toLowerCase();
  const ownerFullName = String(dto.owner_full_name ?? dto.name ?? '').trim();
  const instituteName = String(dto.institute_name ?? '').trim();

  if (!ownerFullName || !ownerEmail || !instituteName) {
    throw new BadRequestException(
      'owner_full_name, owner_email, and institute_name are required for full registration',
    );
  }

  if (!dto.institute_type?.trim()) {
    throw new BadRequestException('institute_type is required');
  }

  if (!dto.country?.trim() || !dto.city?.trim()) {
    throw new BadRequestException('country and city are required');
  }

  if (dto.accept_terms !== true || dto.accept_privacy !== true) {
    throw new BadRequestException(
      'accept_terms and accept_privacy must be true',
    );
  }

  const studentRange = dto.student_range ?? '1-50';
  const teacherRange = dto.teacher_range ?? '1-5';
  const createPrincipal = dto.create_principal === 'yes';

  if (createPrincipal) {
    if (!dto.principal_name?.trim() || !dto.principal_email?.trim()) {
      throw new BadRequestException(
        'principal_name and principal_email are required when create_principal is yes',
      );
    }
  }

  const planPrice =
    dto.plan_price?.trim() ||
    PLAN_PRICE_BY_STUDENT_RANGE[studentRange] ||
    null;

  return {
    ownerFullName,
    ownerEmail,
    ownerPhone: dto.owner_phone?.trim() || 'N/A',
    password: dto.password,
    instituteName,
    instituteType: dto.institute_type.trim(),
    registrationNumber: dto.registration_number?.trim() || null,
    logoFileName: dto.logo_file_name?.trim() || null,
    country: dto.country.trim(),
    city: dto.city.trim(),
    address: dto.address?.trim() || null,
    createPrincipal,
    principalName: dto.principal_name?.trim() || null,
    principalEmail: dto.principal_email?.trim().toLowerCase() || null,
    principalPhone: dto.principal_phone?.trim() || null,
    principalPassword: dto.principal_password?.trim() || null,
    gradesOffered: dto.grades_offered ?? [],
    studentRange,
    teacherRange,
    planName: dto.plan_name?.trim() || 'Premium Plan',
    planPrice,
    trialDays: dto.trial_days ?? 7,
    billingName: dto.billing_name?.trim() || ownerFullName,
    billingAddress: dto.billing_address?.trim() || null,
    paymentMethodToken: dto.payment_method_token?.trim() || null,
    paymentLast4: dto.payment_last4?.trim() || null,
    acceptTerms: dto.accept_terms === true,
    acceptPrivacy: dto.accept_privacy === true,
    isMinimalSignup: false,
  };
}
