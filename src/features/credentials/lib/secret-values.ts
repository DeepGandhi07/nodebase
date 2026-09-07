import z from "zod";

/**
 * Credentials store a single encrypted string. Integrations that need more
 * than one field (WhatsApp providers, the inbox a workflow listens on) encode
 * their configuration as JSON inside that string.
 */

export const twilioWhatsappSchema = z.object({
  provider: z.literal("twilio"),
  accountSid: z.string().min(1, "Account SID is required"),
  authToken: z.string().min(1, "Auth token is required"),
  fromNumber: z.string().min(1, "Sender number is required"),
  defaultTo: z.string().min(1, "Your WhatsApp number is required"),
});

export const metaWhatsappSchema = z.object({
  provider: z.literal("meta"),
  phoneNumberId: z.string().min(1, "Phone number ID is required"),
  accessToken: z.string().min(1, "Access token is required"),
  defaultTo: z.string().min(1, "Your WhatsApp number is required"),
});

export const whatsappCredentialSchema = z.discriminatedUnion("provider", [
  twilioWhatsappSchema,
  metaWhatsappSchema,
]);

export type WhatsappCredential = z.infer<typeof whatsappCredentialSchema>;

export const emailCredentialSchema = z.object({
  address: z.email("A valid email address is required"),
  displayName: z.string().optional(),
});

export type EmailCredential = z.infer<typeof emailCredentialSchema>;

const parseJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const parseWhatsappCredential = (value: string): WhatsappCredential => {
  const parsed = whatsappCredentialSchema.safeParse(parseJson(value));

  if (!parsed.success) {
    throw new Error(
      "WhatsApp credential is malformed. Re-save it from the Credentials page.",
    );
  }

  return parsed.data;
};

export const parseEmailCredential = (value: string): EmailCredential => {
  const parsed = emailCredentialSchema.safeParse(parseJson(value));

  if (!parsed.success) {
    throw new Error(
      "Email credential is malformed. Re-save it from the Credentials page.",
    );
  }

  return parsed.data;
};

/** Normalizes "+91 98765 43210", "whatsapp:+919876543210" → "+919876543210". */
export const normalizePhoneNumber = (value: string): string => {
  const trimmed = value.trim().replace(/^whatsapp:/i, "");
  const digits = trimmed.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : `+${digits}`;
};
