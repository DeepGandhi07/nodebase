"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useCreateCredential,
  useUpdateCredential,
  useSuspenseCredential,
} from "../hooks/use-credentials";
import { useUpgradeModal } from "@/hooks/use-upgrade-modal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CredentialType } from "@/generated/prisma/enums";
import { MailIcon } from "lucide-react";
import {
  emailCredentialSchema,
  whatsappCredentialSchema,
} from "../lib/secret-values";

const formSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    type: z.enum(CredentialType),
    value: z.string().optional(),
    whatsappProvider: z.enum(["twilio", "meta"]).optional(),
    accountSid: z.string().optional(),
    authToken: z.string().optional(),
    fromNumber: z.string().optional(),
    phoneNumberId: z.string().optional(),
    accessToken: z.string().optional(),
    defaultTo: z.string().optional(),
    address: z.string().optional(),
    displayName: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.type === CredentialType.WHATSAPP) {
      const parsed = whatsappCredentialSchema.safeParse({
        provider: values.whatsappProvider,
        accountSid: values.accountSid,
        authToken: values.authToken,
        fromNumber: values.fromNumber,
        phoneNumberId: values.phoneNumberId,
        accessToken: values.accessToken,
        defaultTo: values.defaultTo,
      });

      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          ctx.addIssue({
            code: "custom",
            path: issue.path.length ? issue.path : ["whatsappProvider"],
            message: issue.message,
          });
        }
      }
      return;
    }

    if (values.type === CredentialType.EMAIL) {
      const parsed = emailCredentialSchema.safeParse({
        address: values.address,
        displayName: values.displayName,
      });

      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          ctx.addIssue({
            code: "custom",
            path: issue.path.length ? issue.path : ["address"],
            message: issue.message,
          });
        }
      }
      return;
    }

    if (!values.value) {
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "API key is required",
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

const credentialTypeOptions = [
  {
    value: CredentialType.OPENAI,
    label: "OpenAI",
    logo: "/logos/openai.svg",
  },
  {
    value: CredentialType.ANTHROPIC,
    label: "Anthropic",
    logo: "/logos/anthropic.svg",
  },
  {
    value: CredentialType.GEMINI,
    label: "Gemini",
    logo: "/logos/gemini.svg",
  },
  {
    value: CredentialType.WHATSAPP,
    label: "WhatsApp",
    logo: "/logos/whatsapp.svg",
  },
  {
    value: CredentialType.EMAIL,
    label: "Email inbox",
    logo: null,
  },
];

/** Structured credentials are stored as an encrypted JSON blob in `value`. */
const serializeValue = (values: FormValues): string => {
  if (values.type === CredentialType.WHATSAPP) {
    return JSON.stringify(
      values.whatsappProvider === "meta"
        ? {
            provider: "meta",
            phoneNumberId: values.phoneNumberId,
            accessToken: values.accessToken,
            defaultTo: values.defaultTo,
          }
        : {
            provider: "twilio",
            accountSid: values.accountSid,
            authToken: values.authToken,
            fromNumber: values.fromNumber,
            defaultTo: values.defaultTo,
          },
    );
  }

  if (values.type === CredentialType.EMAIL) {
    return JSON.stringify({
      address: values.address,
      displayName: values.displayName || undefined,
    });
  }

  return values.value ?? "";
};

interface CredentialFormProps {
  initialData?: {
    id?: string;
    name: string;
    type: CredentialType;
    value: string;
  };
}

export const CredentialForm = ({ initialData }: CredentialFormProps) => {
  const router = useRouter();
  const createCredential = useCreateCredential();
  const updateCredential = useUpdateCredential();
  const { handleError, modal } = useUpgradeModal();

  const isEdit = !!initialData?.id;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      type: initialData?.type ?? CredentialType.OPENAI,
      value: initialData?.value ?? "",
      whatsappProvider: "twilio",
      accountSid: "",
      authToken: "",
      fromNumber: "",
      phoneNumberId: "",
      accessToken: "",
      defaultTo: "",
      address: "",
      displayName: "",
    },
  });

  const type = form.watch("type");
  const whatsappProvider = form.watch("whatsappProvider");

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      type: values.type,
      value: serializeValue(values),
    };

    if (isEdit && initialData?.id) {
      await updateCredential.mutateAsync({ id: initialData.id, ...payload });
      return;
    }

    await createCredential.mutateAsync(payload, {
      onSuccess: (data) => {
        router.push(`/credentials/${data.id}`);
      },
      onError: (error) => {
        handleError(error);
      },
    });
  };

  return (
    <>
      {modal}
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>
            {isEdit ? "Edit Credential" : "Create Credential"}
          </CardTitle>
          <CardDescription>
            {isEdit
              ? "Update your API key or credential details"
              : "Add a new API key or credential to your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My API key" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {credentialTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              {option.logo ? (
                                <Image
                                  src={option.logo}
                                  alt={option.label}
                                  width={16}
                                  height={16}
                                />
                              ) : (
                                <MailIcon className="size-4" />
                              )}
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {type === CredentialType.WHATSAPP && (
                <>
                  <FormField
                    control={form.control}
                    name="whatsappProvider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="twilio">
                              Twilio WhatsApp
                            </SelectItem>
                            <SelectItem value="meta">
                              Meta WhatsApp Cloud API
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {whatsappProvider === "meta" ? (
                    <>
                      <FormField
                        control={form.control}
                        name="phoneNumberId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone number ID</FormLabel>
                            <FormControl>
                              <Input placeholder="1234567890" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="accessToken"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Access token</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="EAAG..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  ) : (
                    <>
                      <FormField
                        control={form.control}
                        name="accountSid"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account SID</FormLabel>
                            <FormControl>
                              <Input placeholder="AC..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="authToken"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Auth token</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="fromNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sender number</FormLabel>
                            <FormControl>
                              <Input placeholder="+14155238886" {...field} />
                            </FormControl>
                            <FormDescription>
                              The Twilio WhatsApp number (sandbox number works
                              for testing)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  <FormField
                    control={form.control}
                    name="defaultTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your WhatsApp number</FormLabel>
                        <FormControl>
                          <Input placeholder="+919876543210" {...field} />
                        </FormControl>
                        <FormDescription>
                          Notifications go here unless a node overrides the
                          recipient
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {type === CredentialType.EMAIL && (
                <>
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email address</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="support@acme.com"
                            type="email"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Email triggers only run for messages delivered to this
                          address
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display name (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Support" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {type !== CredentialType.WHATSAPP &&
                type !== CredentialType.EMAIL && (
                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="sk-..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={
                    createCredential.isPending || updateCredential.isPending
                  }
                >
                  {isEdit ? "Update" : "Create"}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/credentials" prefetch>
                    Cancel
                  </Link>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
};

export const CredentialView = ({ credentialId }: { credentialId: string }) => {
  const { data: credential } = useSuspenseCredential(credentialId);

  return <CredentialForm initialData={credential} />;
};
