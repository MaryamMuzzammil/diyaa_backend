export const PRODUCT_OWNER_PERMISSIONS = [
  'view_global_dashboard',
  'manage_institutes',
  'suspend_institute',
  'manage_platform_users',
  'review_content',
  'manage_curriculum_versions',
  'view_analytics',
  'manage_moderation',
  'manage_security',
  'manage_community',
  'manage_subscriptions',
  'manage_platform_settings',
] as const;

export type ProductOwnerPermission =
  (typeof PRODUCT_OWNER_PERMISSIONS)[number];
