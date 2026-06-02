# Diyaa Parent Dashboard API

All routes require Bearer JWT for a `Parent` user.

Response wrapper:

```json
{ "success": true, "data": {} }
```

Parents can only access students linked through `parent_student_links`.

## Institute Admin Linking

Parent creation accepts optional `student_ids` or `child_ids`:

```json
{
  "name": "Parent Name",
  "email": "parent@diyaa.local",
  "password": "secret123",
  "role": "Parent",
  "student_ids": [12, 15]
}
```

Existing parents can be linked later:

`POST /institute/parents/:parentId/students`

```json
{ "student_ids": [12, 15] }
```

## Parent Shell

`GET /parent/profile`

Returns `{ id, name, email, phone, avatar }`.

`GET /parent/children`

Returns:

```json
{
  "children": [
    {
      "id": "stu_12",
      "name": "Ali Khan",
      "avatar": "avatar_1",
      "grade": "Class 2",
      "class_name": "Class 2"
    }
  ]
}
```

## Child Dashboard

Use `stu_12` or numeric `12` as `:childId`.

| Method | Path |
|---|---|
| GET | `/parent/children/:childId/overview` |
| GET | `/parent/children/:childId/progress` |
| GET | `/parent/children/:childId/behavior` |
| GET | `/parent/children/:childId/certificates` |
| GET | `/parent/children/:childId/safety-controls` |
| PATCH | `/parent/children/:childId/safety-controls/:key` |
| GET | `/parent/children/:childId/notifications` |
| GET | `/parent/children/:childId/engagement-tips` |

Patch safety control:

```json
{ "enabled": false }
```

## Settings

`GET /parent/settings`

`PATCH /parent/settings`

```json
{
  "notification_preferences": {
    "progress_notifications": true,
    "weekly_reports": true,
    "safety_alerts": true
  },
  "email": "parent@diyaa.local",
  "language": "en"
}
```
