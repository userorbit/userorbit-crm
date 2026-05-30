# Email Warmup Feature Spec

## Objective

Add first-class mailbox warmup to UserOrbit CRM so a user can select a configured sender mailbox, choose internal/test recipients, start a low-volume warmup plan, and track progress before using the mailbox for outreach campaigns.

This should replace the current local `scripts/warmup-mailer.mjs` workflow with product-owned data, APIs, scheduled processing, and UI.

## Competitor Research

### Instantly

Instantly describes warmup as a shared pool: enabled accounts send to other users, receive from other users, get opens, and get positive replies. Their positioning is that warmup creates “positive, human-like email interactions” and warms both SMTP sending and IMAP receiving infrastructure. They recommend at least two weeks before campaigns and say warmup should remain enabled rather than being a one-time action.

Source: https://help.instantly.ai/en/articles/5975329-how-warm-up-works-and-why-it-s-important

### MailReach

MailReach emphasizes a large inbox network, real conversations, opens, important markers, spam-folder rescue, replies, provider-specific monitoring, reputation scores per mailbox, and alerts. Their product is less about static sending volume and more about feedback loops: “did it land, was it opened, was it rescued, did it get a reply?”

Source: https://www.mailreach.co/how-email-warmup-works

### Smartlead

Smartlead positions warmup as built into the sending platform. Public materials and help docs emphasize automatic peer-to-peer engagement, ramp scheduling, inbox rotation, health monitoring, and troubleshooting failed warmup when prerequisites such as MX/DNS/inbox connectivity are missing.

Sources:
- https://www.smartlead.ai/blog/benefits-of-email-warm-up
- https://helpcenter.smartlead.ai/en/articles/413-troubleshooting-guide-for-failed-warmup

### Market Pattern

Current warmup products generally include:

- Mailbox connection and health validation.
- Daily volume ramp with randomized send times.
- Plain-text human-like message variation.
- Opens, replies, spam rescue, and positive mailbox actions.
- Provider/domain health metrics.
- DNS checks for SPF, DKIM, DMARC, MX.
- Progress score per mailbox.
- Warnings when campaign sending exceeds warmup maturity.

The strongest competitors use an external warmup network. UserOrbit does not have one yet, so the MVP should be honest: internal-recipient warmup plus diagnostics and progress tracking, not a claim of broad network reputation building.

## Key Product Decisions

### MVP Scope

Build an internal warmup system:

- User selects one sender mailbox from env-backed SMTP config.
- User enters warmup recipients, initially internal addresses only.
- User chooses start date, duration, daily min/max volume, and active sending window.
- App generates scheduled warmup messages with varied subjects/bodies.
- Cron sends due messages via existing SMTP code.
- UI shows status, today’s due/sent count, total progress, failures, and recent events.
- User can pause/resume/cancel.

Do not build an external warmup pool in MVP.

### Safety Constraints

- Default to 5-10 emails/day.
- Hard cap at 20/day per sender for MVP.
- Minimum 2-week plan.
- Plain text only.
- No links by default.
- No tracking pixels.
- No repeated identical body within the same week.
- Require at least 3 warmup recipients.
- Show explicit warning that internal warmup cannot guarantee cold inbox placement.

### Progress Model

Warmup progress should be computed from observable local signals:

- Scheduled messages completed.
- SMTP sent/failed ratio.
- Manual spam rescue count, entered by the user.
- Manual reply count, entered by the user or later detected through IMAP.
- Days warmed.

Initial score:

```text
progress = weighted average of:
- days completed / planned days
- sent messages / scheduled messages
- failure rate penalty
- manual positive interactions
```

This is a “warmup progress” score, not a deliverability guarantee.

## Data Model

Add a new migration:

```sql
CREATE TABLE warmup_mailboxes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  smtp_host TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  daily_min INTEGER NOT NULL DEFAULT 5,
  daily_max INTEGER NOT NULL DEFAULT 10,
  send_window_start TEXT NOT NULL DEFAULT '09:30',
  send_window_end TEXT NOT NULL DEFAULT '18:30',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE warmup_recipients (
  id TEXT PRIMARY KEY,
  mailbox_id TEXT NOT NULL REFERENCES warmup_mailboxes(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE warmup_plans (
  id TEXT PRIMARY KEY,
  mailbox_id TEXT NOT NULL REFERENCES warmup_mailboxes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  starts_on TEXT NOT NULL,
  ends_on TEXT NOT NULL,
  daily_min INTEGER NOT NULL,
  daily_max INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE warmup_messages (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES warmup_plans(id) ON DELETE CASCADE,
  mailbox_id TEXT NOT NULL REFERENCES warmup_mailboxes(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES warmup_recipients(id) ON DELETE CASCADE,
  scheduled_for TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  provider_message_id TEXT,
  error TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_warmup_messages_due ON warmup_messages(status, scheduled_for);
CREATE INDEX idx_warmup_messages_mailbox ON warmup_messages(mailbox_id, scheduled_for);
```

Optional later table:

```sql
CREATE TABLE warmup_interactions (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES warmup_messages(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- not_spam, reply, inbox, spam, important
  source TEXT NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TEXT NOT NULL
);
```

## API Design

Add:

- `GET /api/warmup`  
  Returns mailboxes, active plans, aggregate progress, due counts, recent messages.

- `POST /api/warmup/mailboxes`  
  Creates or updates a warmup mailbox. For MVP this maps to configured SMTP env; it should not store SMTP passwords in D1.

- `POST /api/warmup/plans`  
  Creates a plan and generated `warmup_messages`.

- `PATCH /api/warmup/plans/:id`  
  Pause/resume/cancel.

- `POST /api/warmup/run`  
  Sends due warmup messages. Called by cron and a manual UI button.

- `POST /api/warmup/messages/:id/interaction`  
  Records manual positive/negative signals.

## Worker Changes

- Extend scheduled handler to run both sequence sends and warmup sends.
- Reuse `sendEmail`/`smtpSend` path after making it mailbox-aware enough to pass message metadata.
- Move warmup message generation from `scripts/warmup-mailer.mjs` into Worker functions.
- Keep `scripts/warmup-mailer.mjs` temporarily for migration/testing, then delete when app feature is stable.

## UI Design

Add a sixth sidebar page: `Warmup`.

Views:

- Overview metrics:
  - Active mailboxes
  - Emails sent today
  - Scheduled today
  - Failure rate
  - Warmup progress

- Mailbox panel:
  - Sender email
  - SMTP configured status
  - SPF/DKIM/DMARC status if available
  - Active/paused status

- Plan setup panel:
  - Recipients textarea
  - Duration
  - Daily min/max
  - Send window
  - Start date
  - Generate preview
  - Start warmup

- Schedule table:
  - Time
  - Recipient
  - Subject
  - Status
  - Error

- Interaction controls:
  - Mark inbox
  - Mark spam
  - Mark not spam
  - Mark replied

## DNS And Deliverability Diagnostics

MVP can display DNS checks server-side using Cloudflare Worker DNS-over-HTTPS fetches:

- SPF TXT at root.
- DKIM selector configured by user, default `zmail`.
- DMARC TXT at `_dmarc`.
- MX records.

The app should label these as authentication checks, not inbox placement guarantees.

## Risks

- Gmail and Microsoft may discount obvious warmup patterns.
- Internal-only warmup has weaker reputation effect than a broad real inbox network.
- Too much automation can worsen reputation if messages are repetitive.
- Storing mailbox credentials in D1 would be unsafe; use env/secrets for MVP.
- Warmup should not encourage spammy sending volume.

## Recommended Build Order

1. Add D1 tables and API read model for warmup.
2. Add plan generation and due-message sending.
3. Add Warmup UI page with mailbox/plan/progress.
4. Add manual interaction tracking.
5. Add DNS diagnostics.
6. Remove local script automation after app cron is verified.

## Acceptance Criteria

- User can create a warmup plan from the UI.
- The plan schedules 5-10 messages/day by default over two weeks.
- Cron sends due messages without duplicates.
- UI shows progress and failures.
- User can pause/resume/cancel.
- User can record not-spam/reply signals.
- SMTP credentials are not stored in D1 or exposed in API responses.
