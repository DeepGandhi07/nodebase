# Email → AI summarize → urgency → WhatsApp

This guide covers the pieces added for natural-language workflow generation plus the
Email trigger, Condition and WhatsApp nodes.

The target automation:

```
Email Trigger → AI Summarize → AI Classify Urgency → Condition (urgent?) → WhatsApp
```

## 1. Database

Three node types (`EMAIL_TRIGGER`, `CONDITION`, `WHATSAPP`) and two credential types
(`EMAIL`, `WHATSAPP`) were added to the Prisma enums.

```bash
npx prisma migrate deploy   # or: npx prisma migrate dev
npx prisma generate
```

The migration lives in `prisma/migrations/20260907000000_email_condition_whatsapp_nodes`.
Postgres cannot add enum values inside a transaction that also uses them, so run the
migration before deploying the app code.

## 2. Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | yes | Used to build the inbound email webhook URL shown in the trigger dialog. |
| `EMAIL_WEBHOOK_SECRET` | recommended | When set, `/api/webhooks/email` requires `?secret=<value>` and returns 401 otherwise. |
| `ENCRYPTION_KEY` | already used | Encrypts every credential value, including the new JSON ones. |

No WhatsApp or email provider keys go into the environment — they are per-user
credentials stored encrypted in the database.

## 3. Credentials (per user, encrypted)

`Credential.value` is a single encrypted string, so integrations that need multiple
fields serialize JSON into it (`src/features/credentials/lib/secret-values.ts`). The
Credentials form renders provider-specific fields and does that serialization.

**WhatsApp — Twilio**

1. Twilio Console → Messaging → Try it out → Send a WhatsApp message (sandbox), or a
   WhatsApp sender for production.
2. Collect Account SID, Auth Token and the sender number (`+14155238886` for sandbox).
3. Join the sandbox from your phone once (`join <code>` to the sandbox number).
4. Credentials → New → WhatsApp → Twilio, and fill Account SID, Auth Token, sender
   number and *your* WhatsApp number (the default recipient).

Stored value: `{"provider":"twilio","accountSid":"…","authToken":"…","fromNumber":"…","defaultTo":"…"}`

**WhatsApp — Meta Cloud API**

1. developers.facebook.com → your app → WhatsApp → API setup.
2. Copy the Phone number ID and an access token (temporary for testing, a System User
   token for production).
3. Credentials → New → WhatsApp → Meta Cloud API.

Stored value: `{"provider":"meta","phoneNumberId":"…","accessToken":"…","defaultTo":"…"}`

Note: outside the 24h customer-service window Meta only delivers *template* messages —
set the template name/language in the WhatsApp node for that case.

**Email**

Credentials → New → Email: the inbox address the workflow listens on, plus an optional
display name. The trigger only accepts mail addressed to that inbox.

## 4. Receiving email

`POST /api/webhooks/email?workflowId=<id>[&secret=<EMAIL_WEBHOOK_SECRET>]`

The route (`src/app/api/webhooks/email/route.ts`) accepts JSON or
`multipart/form-data` and normalizes Resend-style, Postmark, SendGrid Inbound Parse,
Mailgun and plain `{ from, to, subject, text }` payloads into:

```ts
context.email = { from, fromName, to, subject, text, html, messageId, receivedAt, raw }
```

Point your provider's inbound route at that URL. If you don't use an inbound provider,
the Email trigger dialog generates a Gmail Apps Script (copy button) that polls unread
mail and posts it to the same endpoint — paste it into script.google.com and add a
time-driven trigger.

The trigger node can additionally filter by sender and subject substrings; a
non-matching email ends the run without executing downstream nodes.

## 5. Branching

`CONDITION` nodes expose two source handles, `source-true` and `source-false`. The
executor records which handle won in `context.__branchDecisions`, and the Inngest
runner (`src/inngest/functions.ts`) skips any node whose every incoming connection
comes from a losing branch or an already-skipped node
(`src/features/executions/lib/branching.ts`). Branch bookkeeping is stripped before the
execution output is persisted.

Operators: `equals`, `notEquals`, `contains`, `notContains`, `startsWith`, `endsWith`,
`greaterThan`, `lessThan`, `isEmpty`, `isNotEmpty`, `matchesRegex`. Both sides are
Handlebars templates, so `{{classification.text}}` / `URGENT` is a valid comparison.

## 6. WhatsApp node

Message content is a Handlebars template rendered against the run context, e.g.

```
Urgent email from {{email.from}}

{{summary.text}}
```

Twilio posts to `https://api.twilio.com/2010-04-01/Accounts/<sid>/Messages.json` with
Basic auth; Meta posts to `https://graph.facebook.com/v21.0/<phoneNumberId>/messages`
with a Bearer token. The recipient defaults to `defaultTo` from the credential and can
be overridden per node.

## 7. Natural language → workflow

Type the request in the panel at the top-left of the editor, e.g.

> When I receive a customer email, summarize it, classify its urgency and send me a
> WhatsApp message if it is urgent

`workflows.generate` (`src/features/workflows/server/routers.ts`) picks your most
recently updated OpenAI/Anthropic/Gemini credential, calls `generateObject` with a Zod
schema (`src/features/workflows/lib/workflow-generation.ts`), attaches your own
WhatsApp/email/AI credentials to the generated nodes, replaces the workflow's nodes and
connections in one transaction, and returns React Flow nodes/edges that the editor
renders immediately. Everything stays editable by drag and drop afterwards.

The system prompt lists only the supported node types and explicitly forbids
substituting Slack, Discord or email when WhatsApp is requested. Anything the model
returns that fails schema validation is rejected rather than persisted.

Generating replaces the nodes currently on the canvas.

## 8. Security notes

- Credential values are only ever decrypted server-side, scoped by `userId`.
- The generation mutation verifies workflow ownership before writing.
- Set `EMAIL_WEBHOOK_SECRET` so third parties cannot start your workflows.
- Provider payloads are treated as untrusted input and normalized before use.
