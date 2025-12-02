## Settings Pages – Features & Backend Requirements

This document describes what the **Employee**, **Admin**, and **Client** settings pages should support functionally, and what backend work is needed to move from the current mostly‑UI implementation to a fully backed, multi‑tenant production feature.

---

## 1. Employee Settings (`/employee/settings`)

Tabs: **Profile**, **Security**, **Notifications**, **Integrations**, **Help & Legal**

### 1.1 Profile

**Current UI**
- Editable display name.
- Read‑only email.
- Text explaining that password resets happen via the reset‑password flow.

**Desired behaviour**
- **Update profile**:
  - Allow the employee to edit: `displayName`, optional `avatarUrl` (future), and possibly phone number.
  - Email can be either:
    - Managed by admin only (current approach), or
    - Editable, but must go through verification before being used for login/notifications.

**Backend requirements**
- API endpoint: `PATCH /api/users/me`
  - Input: `{ name?: string; avatarUrl?: string; phone?: string }`
  - Auth: employee access token; always scoped to "self".
  - Validation: rate‑limit, enforce size/type for avatar if file upload endpoint is added.
- (Optional) Avatar upload:
  - `POST /api/users/me/avatar` → returns `avatarUrl`.
- Profile read:
  - Today profile is already loaded from Supabase; settings page should reuse the same DTO.

### 1.2 Security (2FA)

**Current UI**
- Toggle for "Two‑factor authentication", saved only in `localStorage` and not enforced.

**Desired behaviour**
- **Enable/disable 2FA** per user:
  - Modes: `off`, `email`, later `totp_app` (Google Authenticator, etc.).
  - If turning 2FA on, show enrolment flow (e.g. confirm via email code, or scan TOTP QR).
  - If firm has **mandatory 2FA** from admin side, the toggle should be locked and show a message.

**Backend requirements**
- Data model:
  - Users table / profile: `twoFactorMode`, `twoFactorEnabledAt`, `twoFactorEnforcedByOrg`.
- APIs:
  - `POST /api/auth/2fa/setup` → returns secret / QR for TOTP or sends email code.
  - `POST /api/auth/2fa/verify` → confirm setup; switches `twoFactorMode` from `pending` to `active`.
  - `POST /api/auth/2fa/disable` → requires current password + 2FA code.
- Auth middleware:
  - On login, if `twoFactorMode !== 'off'`, require second factor.
  - Respect admin‑side "enforce 2FA for all staff" flag.

### 1.3 Notifications & Reminders

**Current UI**
- Toggle: "Document reminders".
- Numeric input: "Remind me X days before due date".
- Link to advanced notification settings (`/settings/notifications`).
- Values are only stored in `localStorage`.

**Desired behaviour**
- **User‑level preferences**:
  - `documentRemindersEnabled: boolean`
  - `reminderDaysBeforeDue: number`
  - Potentially per‑channel toggles (email / in‑app) for document‑related events.
- These preferences should be respected by:
  - Engagement/task scheduler (e.g. cron job that sends reminders).
  - In‑app notification system, email dispatcher, and push notifications.

**Backend requirements**
- Data model:
  - `user_notification_preferences` table keyed by `userId`.
  - Columns to match the existing NotificationSettings hook (`pushEnabled`, `emailEnabled`, `inAppEnabled`, `soundEnabled`, `soundVolume`, `engagementNotifications`, `documentNotifications`, and new reminder fields).
- APIs:
  - `GET /api/notifications/preferences` → returns full preference object for the logged‑in user.
  - `PUT /api/notifications/preferences` → updates any subset of preferences.
- Reminder engine:
  - Background job that:
    - Finds pending document requests / tasks with due dates.
    - For each user/assignee, checks `documentRemindersEnabled` and `reminderDaysBeforeDue`.
    - Sends email / in‑app / push using the existing notification service.

### 1.4 Integrations & External Services

**Current UI**
- Informational text about accounting API connections.
- Button that opens Malta Business Registry (`https://mbr.mt`) in a new tab.

**Desired behaviour**
- Show **per‑user** view of which integrations are active for their organization and (optionally) for themselves:
  - Accounting platforms (Xero, QuickBooks, etc.).
  - Banking aggregation (Salt Edge / Apideck).
  - Future: e‑signature providers.
- Allow user to trigger OAuth connects/disconnects where appropriate (if permissions allow).

**Backend requirements**
- Integrations model (most of this likely already exists):
  - `organization_integrations` table with provider, status, connection metadata.
  - Optional `user_integrations` for per‑user tokens/scopes where needed.
- APIs:
  - `GET /api/integrations/summary` → returns what is connected for the current org + what the user can access.
  - Provider‑specific connect/disconnect endpoints (OAuth flows) that are already in other parts of the app should be linked from this page.

### 1.5 Help, FAQs & Legal

**Current UI**
- Disabled textarea with placeholder FAQ text.
- Links pointing to `/legal/terms` and `/legal/privacy` marked "(coming soon)".

**Desired behaviour**
- Central **Help Center** experience:
  - Link to a hosted knowledge base, or in‑app FAQ/guide page.
  - Optional contact form to reach the firm’s support/admin email.
- Real **Terms of Use** and **Privacy Policy** pages.

**Backend / content requirements**
- Static routes:
  - `/legal/terms`
  - `/legal/privacy`
  - Both can be served as static React pages (markdown content) with version + last‑updated date.
- Config:
  - Firm‑wide support email configured in admin settings, reused across help/FAQ and system emails.

---

## 2. Admin Settings (`/admin/settings`)

Tabs: **Firm Defaults**, **Roles & Controls**, **Compliance & Legal**, **Integrations**

### 2.1 Firm Defaults

**Current UI**
- Inputs for:
  - `timeZone` (default "Europe/Malta").
  - `currency` (default "EUR").
- Saved to `localStorage` only.

**Desired behaviour**
- Configure **organization‑level** defaults:
  - Default time zone (used for all date displays, due dates, and logs).
  - Default currency (used for budgets, KPI dashboards, and invoicing).
  - Potentially date/number format preset.
- These values should apply automatically for:
  - New engagements.
  - New users created under the organization (initial locale preferences).

**Backend requirements**
- Data model:
  - `organizations` table should include:
    - `defaultTimeZone`
    - `defaultCurrency`
    - (Optional) `defaultDateFormat`, `defaultNumberFormat`.
- APIs:
  - `GET /api/org/settings` → returns current organization settings.
  - `PUT /api/org/settings` (admin‑only) → update defaults.
- Consumption:
  - Engage creation service should read `defaultTimeZone` / `defaultCurrency` when creating new engagements.
  - UI contexts (e.g. date formatting hooks) should default to org settings but allow per‑user override.

### 2.2 Roles & Access Controls

**Current UI**
- Toggles (stored locally only):
  - `enableCustomRoles`
  - `restrictDeleteToAdmins`
  - `allowESignature`
  - `showActivityLogToManagers`

**Desired behaviour**
- **Role model**:
  - Built‑in roles: `admin`, `manager`, `employee`, `client`.
  - Optional firm‑defined custom roles with configurable permissions.
- **Control restrictions**:
  - Policy to restrict permanent deletes (engagements, clients, documents) to admins only.
  - Policy to show/hide activity log for managers.
  - Policy to enable/disable e‑signature features organization‑wide.

**Backend requirements**
- Data model:
  - `roles` table with:
    - `id`, `organizationId`, `name`, `isSystemRole`, `permissionsJson`.
  - `user_roles` join table (user ↔ role).
  - `org_policies` or additional columns on `organizations`:
    - `restrictDeleteToAdmins: boolean`
    - `activityLogVisibleToManagers: boolean`
    - `eSignatureEnabled: boolean`
- APIs:
  - `GET /api/org/roles`
  - `POST /api/org/roles` (create custom role)
  - `PUT /api/org/roles/:id`
  - `DELETE /api/org/roles/:id`
  - `PUT /api/org/policies` to update flags above.
- Enforcement:
  - Middleware/guards on backend routes using permissions from role definitions.
  - Delete endpoints must check `restrictDeleteToAdmins`.
  - Activity log endpoints must check `activityLogVisibleToManagers`.
  - E‑signature flows must check `eSignatureEnabled`.

### 2.3 Compliance, FAQs & Legal

**Current UI**
- Disabled textarea for "Firm FAQs".
- Static bullet points for legal/privacy guidance.
- Note about settings being stored locally.

**Desired behaviour**
- Admins can record and manage:
  - Firm‑specific FAQs / internal guidance (could be WYSIWYG markdown stored per organization).
  - Links or uploaded documents for:
    - Engagement terms.
    - Data processing agreements.
    - Internal policies (ISQM, quality manuals).

**Backend requirements**
- Data model:
  - `org_compliance_content` table:
    - `organizationId`
    - `faqsMarkdown`
    - `termsUrl`
    - `privacyUrl`
    - `dataRetentionPolicy` (text)
    - Timestamps.
- APIs:
  - `GET /api/org/compliance`
  - `PUT /api/org/compliance` (admin‑only).
- UI:
  - Employee and client views should surface the appropriate URLs/content from this table.

### 2.4 Integrations Summary

**Current UI**
- Three cards summarizing:
  - Accounting APIs (coming soon).
  - MBR integration (descriptive).
  - E‑signature (descriptive).

**Desired behaviour**
- Central admin place to:
  - View which integrations are enabled for the organization.
  - Launch connection flows (OAuth) or disconnect providers.
  - Configure per‑integration options (e.g. default ledger, which users may initiate e‑signatures).

**Backend requirements**
- Extend/align with integration model described in **Employee → Integrations** section:
  - `organization_integrations` table.
  - Provider‑specific config JSON.
- APIs:
  - `GET /api/org/integrations`
  - `POST /api/org/integrations/:provider/connect`
  - `POST /api/org/integrations/:provider/disconnect`
  - `PUT /api/org/integrations/:provider/config`

---

## 3. Client Settings (future)

There is currently no dedicated `/client/settings` page other than the shared **Notification Settings** route (`/client/settings/notifications`). The design goal is to eventually mirror the same conceptual areas, but with a client‑appropriate scope.

### 3.1 Potential tabs

- **Profile**: company contact person details, notification email, phone.
- **Security**: 2FA and login options for the client portal.
- **Notifications**:
  - Document request reminders.
  - Engagement status change notifications.
- **Data & Privacy**:
  - View and download data export for their organization.
  - Acknowledge terms and privacy policies (track acceptance version).

### 3.2 Backend considerations

- Reuse the same **user profile**, **2FA**, and **notification preferences** infrastructure as for employees.
- For data export / privacy:
  - `POST /api/client/data-export` that prepares a downloadable archive with:
    - Their engagements, document requests, uploaded files (links), and logs involving them.
  - Track consent:
    - `client_terms_acceptance` table with `clientId`, `termsVersion`, `acceptedAt`.

---

## 4. Cross‑cutting Requirements

1. **Multi‑tenant awareness**
   - All organization/admin settings must be scoped by `organizationId`.
   - All user settings must be scoped by `userId` and derive `organizationId` from user membership.

2. **Audit logging**
   - Any changes to sensitive settings (2FA, org policies, roles, integrations) should be logged:
     - Who changed what, when, and previous vs new values.

3. **Permissions**
   - Employee settings: only the logged‑in user can update their own profile/security/notifications.
   - Admin settings: restricted to `admin` (and optionally `super‑admin`) roles.
   - Client settings: restricted to the specific client user account.

4. **Validation and UX**
   - Server‑side validation for all inputs (time zone, currency codes, email formats, numeric ranges).
   - Error responses should surface clear messages the UI can show inline.

This document should be used as the primary reference for implementing the missing backend logic and wiring the existing settings UIs to real persistence and policy enforcement.***

