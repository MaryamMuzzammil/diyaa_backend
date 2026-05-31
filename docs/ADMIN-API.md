# Diyaa Admin / Product Owner API

All routes require **Bearer JWT** and **`SuperAdmin`** role (Product Owner).

## Response format

```json
{ "success": true, "data": { ... } }
```

## Auth

Login: `POST /auth/login` with Product Owner credentials from env (`SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD`).

## Endpoints

| Section | Method | Path |
|---------|--------|------|
| Overview | GET | `/admin/dashboard/overview` |
| Overview (legacy) | GET | `/admin/overview` |
| Analytics | GET | `/admin/analytics?school_id=all\|:id&range=7d\|30d\|90d` |
| Feature engagement | GET | `/admin/feature-engagement?range=7d\|30d` |
| Schools | GET | `/admin/schools` |
| Institutes list | GET | `/admin/institutes?search=&status=&page=&limit=` |
| Suspend/activate | PATCH | `/admin/institutes/:id/status` |
| Users | GET | `/admin/users?role=&status=&search=&page=&limit=` |
| User CRUD | GET/PATCH/DELETE | `/admin/users/:id` |
| User status | PATCH | `/admin/users/:id/status` |
| Export users | GET | `/admin/users/export` |
| Content | GET/POST | `/admin/content` |
| Content review | POST | `/admin/content/:id/approve\|reject` |
| Games | GET | `/admin/games`, `/admin/games/analytics` |
| Curriculum | GET/POST | `/admin/curriculum/versions` |
| Publish/rollback | POST | `/admin/curriculum/versions/:id/publish\|rollback` |
| Moderation | GET | `/admin/moderation/summary`, `/admin/moderation/queue` |
| Security | GET/PATCH | `/admin/security/permissions`, `/admin/security/alerts` |
| Community | GET | `/admin/community/summary`, `/admin/community/posts` |
| Revenue | GET | `/admin/subscriptions-revenue` |
| Plans | GET/POST/PATCH | `/admin/subscription-plans` |
| Settings | GET/PATCH | `/admin/platform-settings`, `/admin/platform-settings/:key` |
| Search | GET | `/admin/search?q=` |
| Notifications | GET/PATCH | `/admin/notifications`, `/admin/notifications/:id/read` |
| Audit logs | GET | `/admin/audit-logs` |

## Frontend integration notes

- Institute list: use `data.institutes` + `data.pagination`
- Users: `data.users` with fields `id`, `name`, `email`, `role`, `status`, `last_active`, `institute_id`
- Revenue: `data.summary`, `data.revenue_by_school`, `data.user_distribution`, `data.active_subscriptions`, `data.expiring_subscriptions`, `data.payment_issues`
- Suspend institute blocks tenant login except Product Owner
- Platform settings and demo moderation/community/content rows seed on server start

## Database tables (auto-created via TypeORM sync in dev)

`audit_logs`, `platform_settings`, `platform_content_items`, `curriculum_versions`, `moderation_items`, `community_posts`, `subscription_plans`, `platform_notifications`, `security_alerts`, `login_anomalies`, `system_alerts`, `platform_games`

## Product Owner permissions (catalog)

See `src/modules/admin/constants/product-owner-permissions.ts`
