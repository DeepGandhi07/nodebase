export type NormalizedEmail = {
  from: string;
  fromName: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  messageId: string;
  receivedAt: string;
  raw: Record<string, unknown>;
};

type UnknownRecord = Record<string, unknown>;

const asString = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(asString).filter(Boolean).join(", ");
  }
  if (value && typeof value === "object") {
    const record = value as UnknownRecord;
    const email = asString(record.email ?? record.address ?? "");
    const name = asString(record.name ?? "");
    return name && email ? `${name} <${email}>` : email || name;
  }
  return "";
};

const pick = (source: UnknownRecord, keys: string[]): string => {
  for (const key of keys) {
    const value = asString(source[key]);
    if (value) return value;
  }
  return "";
};

/** Extracts the bare address out of `Jane Doe <jane@acme.com>`. */
export const extractAddress = (value: string): string => {
  const match = value.match(/<([^>]+)>/);
  return (match ? match[1] : value).trim().toLowerCase();
};

/** Extracts the display name out of `Jane Doe <jane@acme.com>`. */
export const extractName = (value: string): string => {
  const match = value.match(/^\s*"?([^"<]*?)"?\s*</);
  return match ? match[1].trim() : "";
};

const stripHtml = (html: string): string =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Accepts the payload shapes of the common inbound-email providers
 * (Resend, Postmark, SendGrid Inbound Parse, Mailgun) plus the plain
 * `{ from, to, subject, text }` body the Gmail Apps Script forwarder sends.
 */
export const normalizeInboundEmail = (payload: unknown): NormalizedEmail => {
  const body = (payload ?? {}) as UnknownRecord;

  // Resend / provider envelopes nest the message under `data` or `message`.
  const envelope = (body.data ?? body.message ?? body) as UnknownRecord;

  const rawFrom = pick(envelope, ["from", "From", "sender", "FromFull"]);
  const rawTo = pick(envelope, [
    "to",
    "To",
    "recipient",
    "ToFull",
    "envelope_to",
  ]);
  const subject = pick(envelope, ["subject", "Subject"]);
  const html = pick(envelope, ["html", "HtmlBody", "body-html", "bodyHtml"]);
  const text =
    pick(envelope, [
      "text",
      "TextBody",
      "stripped-text",
      "body-plain",
      "plain",
      "bodyPlain",
    ]) || stripHtml(html);

  return {
    from: extractAddress(rawFrom),
    fromName: extractName(rawFrom),
    to: extractAddress(rawTo),
    subject,
    text,
    html,
    messageId: pick(envelope, [
      "messageId",
      "message_id",
      "MessageID",
      "Message-Id",
      "id",
    ]),
    receivedAt:
      pick(envelope, ["receivedAt", "Date", "date", "timestamp"]) ||
      new Date().toISOString(),
    raw: body,
  };
};
