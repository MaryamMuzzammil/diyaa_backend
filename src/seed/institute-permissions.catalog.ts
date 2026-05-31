/** Institute-scoped permission catalog (snake_case), grouped by module. */

export type PermissionDef = {
  name: string;
  module: string;
  description: string;
};

export const INSTITUTE_PERMISSIONS: PermissionDef[] = [
  // users
  { name: 'users_view', module: 'users', description: 'View users in institute' },
  { name: 'users_view_assigned', module: 'users', description: 'View assigned students/users only' },
  { name: 'users_create', module: 'users', description: 'Create users' },
  { name: 'users_update', module: 'users', description: 'Update user profiles' },
  { name: 'users_delete', module: 'users', description: 'Delete users' },
  { name: 'users_deactivate', module: 'users', description: 'Deactivate users' },
  { name: 'users_assign_roles', module: 'users', description: 'Assign roles to users' },
  // roles
  { name: 'roles_view', module: 'roles', description: 'View roles and permission templates' },
  { name: 'roles_manage', module: 'roles', description: 'Manage role definitions' },
  { name: 'roles_assign_permissions', module: 'roles', description: 'Assign permissions to roles/users' },
  // institute
  { name: 'institute_view', module: 'institute', description: 'View institute profile' },
  { name: 'institute_update', module: 'institute', description: 'Update institute profile' },
  { name: 'institute_delete', module: 'institute', description: 'Delete institute' },
  { name: 'institute_settings_manage', module: 'institute', description: 'Manage school settings' },
  // academics
  { name: 'academics_grades_create', module: 'academics', description: 'Create grades' },
  { name: 'academics_sections_create', module: 'academics', description: 'Create sections' },
  { name: 'academics_subjects_create', module: 'academics', description: 'Create subjects' },
  { name: 'academics_classes_manage', module: 'academics', description: 'Manage classes' },
  { name: 'academics_assign_teacher_class', module: 'academics', description: 'Assign teachers to classes' },
  { name: 'academics_assign_teacher_subject', module: 'academics', description: 'Assign teachers to subjects' },
  { name: 'academics_view_assigned', module: 'academics', description: 'View assigned classes only' },
  // content
  { name: 'content_view', module: 'content', description: 'View content library' },
  { name: 'content_create', module: 'content', description: 'Create lessons/resources' },
  { name: 'content_update', module: 'content', description: 'Update content' },
  { name: 'content_delete', module: 'content', description: 'Delete content' },
  { name: 'content_assign', module: 'content', description: 'Assign content to classes' },
  // assignments
  { name: 'assignments_view_own', module: 'assignments', description: 'View own assignments' },
  { name: 'assignments_view_assigned', module: 'assignments', description: 'View assignments for assigned classes' },
  { name: 'assignments_view_all', module: 'assignments', description: 'View all assignments in school' },
  { name: 'assignments_create', module: 'assignments', description: 'Create assignments/quizzes' },
  { name: 'assignments_mark', module: 'assignments', description: 'Mark/grade assignments' },
  { name: 'assignments_submit', module: 'assignments', description: 'Submit assignments' },
  { name: 'assignments_feedback', module: 'assignments', description: 'Give feedback to students' },
  // attendance
  { name: 'attendance_mark', module: 'attendance', description: 'Mark attendance' },
  { name: 'attendance_view_own', module: 'attendance', description: 'View own attendance' },
  { name: 'attendance_view_assigned', module: 'attendance', description: 'View attendance for assigned classes' },
  { name: 'attendance_view_all', module: 'attendance', description: 'View all attendance records' },
  { name: 'attendance_view_child', module: 'attendance', description: 'View linked child attendance' },
  // fees
  { name: 'fees_view', module: 'fees', description: 'View fees and billing' },
  { name: 'fees_manage', module: 'fees', description: 'Manage fees and invoices' },
  { name: 'fees_view_child', module: 'fees', description: 'View linked child fees' },
  // gamification
  { name: 'gamification_view_own', module: 'gamification', description: 'View own badges/streaks/leaderboard' },
  { name: 'gamification_view_assigned', module: 'gamification', description: 'View gamification for assigned students' },
  { name: 'gamification_view_child', module: 'gamification', description: 'View linked child gamification' },
  // reports
  { name: 'reports_view_own', module: 'reports', description: 'View own reports' },
  { name: 'reports_view_assigned_students', module: 'reports', description: 'View reports for assigned students' },
  { name: 'reports_view_all', module: 'reports', description: 'View all school reports' },
  { name: 'reports_student_progress', module: 'reports', description: 'View student progress reports' },
  { name: 'reports_view_child', module: 'reports', description: 'View linked child reports' },
  // chat
  { name: 'chat_use', module: 'chat', description: 'Use chatbot' },
  { name: 'chat_message_teachers', module: 'chat', description: 'Message teachers' },
  { name: 'chat_message_admin', module: 'chat', description: 'Message admin/principal' },
  // notifications
  { name: 'notifications_send', module: 'notifications', description: 'Send notifications' },
  { name: 'notifications_receive', module: 'notifications', description: 'Receive notifications' },
  // subscription
  { name: 'subscription_view', module: 'subscription', description: 'View subscription plan' },
  { name: 'subscription_manage', module: 'subscription', description: 'Manage subscription plan' },
  // audit_logs
  { name: 'audit_logs_view', module: 'audit_logs', description: 'View audit logs' },
];

const all = () => INSTITUTE_PERMISSIONS.map((p) => p.name);

const pick = (...names: string[]) => names;

/** Default permissions per institute role (UserRole enum values). */
export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  SuperAdmin: all(),

  Owner: all(),

  Admin: pick(
    'users_view',
    'users_create',
    'users_update',
    'users_deactivate',
    'users_assign_roles',
    'roles_view',
    'roles_assign_permissions',
    'institute_view',
    'institute_update',
    'institute_settings_manage',
    'academics_grades_create',
    'academics_sections_create',
    'academics_subjects_create',
    'academics_classes_manage',
    'academics_assign_teacher_class',
    'academics_assign_teacher_subject',
    'content_view',
    'content_create',
    'content_update',
    'content_delete',
    'content_assign',
    'assignments_view_all',
    'assignments_create',
    'assignments_mark',
    'assignments_feedback',
    'attendance_mark',
    'attendance_view_all',
    'fees_view',
    'fees_manage',
    'reports_view_all',
    'reports_student_progress',
    'notifications_send',
    'notifications_receive',
    'chat_use',
    'chat_message_teachers',
    'subscription_view',
    'audit_logs_view',
  ),

  Teacher: pick(
    'users_view_assigned',
    'academics_view_assigned',
    'content_view',
    'content_create',
    'content_assign',
    'assignments_view_assigned',
    'assignments_create',
    'assignments_mark',
    'assignments_feedback',
    'attendance_mark',
    'attendance_view_assigned',
    'gamification_view_assigned',
    'reports_view_assigned_students',
    'reports_student_progress',
    'notifications_receive',
    'chat_use',
    'chat_message_admin',
  ),

  Student: pick(
    'assignments_view_own',
    'assignments_submit',
    'attendance_view_own',
    'gamification_view_own',
    'reports_view_own',
    'content_view',
    'chat_use',
    'notifications_receive',
  ),

  Parent: pick(
    'reports_view_child',
    'attendance_view_child',
    'fees_view_child',
    'gamification_view_child',
    'notifications_receive',
    'chat_use',
    'chat_message_teachers',
    'chat_message_admin',
  ),
};

/** Roles an institute Owner may assign when creating users. */
export const INSTITUTE_ASSIGNABLE_ROLES = [
  'Admin',
  'Teacher',
  'Student',
  'Parent',
] as const;
