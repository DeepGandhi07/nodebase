"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CopyIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials";
import { CredentialType } from "@/generated/prisma/enums";
import { generateGmailForwarderScript } from "./utils";

const formSchema = z.object({
  credentialId: z.string().optional(),
  fromFilter: z.string().optional(),
  subjectFilter: z.string().optional(),
});

export type EmailTriggerFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: EmailTriggerFormValues) => void;
  defaultValues?: Partial<EmailTriggerFormValues>;
}

export const EmailTriggerDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const params = useParams();
  const workflowId = params.workflowId as string;

  const { data: credentials, isLoading: isLoadingCredentials } =
    useCredentialsByType(CredentialType.EMAIL);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const webhookUrl = `${baseUrl}/api/webhooks/email?workflowId=${workflowId}`;

  const form = useForm<EmailTriggerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      credentialId: defaultValues.credentialId || "",
      fromFilter: defaultValues.fromFilter || "",
      subjectFilter: defaultValues.subjectFilter || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        credentialId: defaultValues.credentialId || "",
        fromFilter: defaultValues.fromFilter || "",
        subjectFilter: defaultValues.subjectFilter || "",
      });
    }
  }, [open, defaultValues, form]);

  const copy = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(message);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleSubmit = (values: EmailTriggerFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Email Trigger Configuration</DialogTitle>
          <DialogDescription>
            Runs this workflow whenever an email is delivered to the webhook
            below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="email-webhook-url">Webhook URL</Label>
          <div className="flex gap-2">
            <Input
              id="email-webhook-url"
              value={webhookUrl}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => copy(webhookUrl, "Webhook URL copied")}
            >
              <CopyIcon className="size-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Point Resend / Postmark / SendGrid Inbound Parse / Mailgun at this
            URL, or use the Gmail script below.
          </p>
        </div>

        <div className="rounded-lg bg-muted p-4 space-y-3">
          <h4 className="font-medium text-sm">
            No inbound provider? Use Gmail
          </h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Open script.google.com → New project</li>
            <li>Paste the script below</li>
            <li>Triggers → Add trigger → forwardEmailsToNodebase</li>
            <li>Run every 1 or 5 minutes</li>
          </ol>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              copy(
                generateGmailForwarderScript(webhookUrl),
                "Gmail script copied",
              )
            }
          >
            <CopyIcon className="size-4 mr-2" />
            Copy Gmail Apps Script
          </Button>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-8 mt-2"
          >
            <FormField
              control={form.control}
              name="credentialId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inbox (Email credential)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoadingCredentials || !credentials?.length}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Any recipient" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {credentials?.map((credential) => (
                        <SelectItem key={credential.id} value={credential.id}>
                          {credential.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Optional. Only emails delivered to this saved address run
                    the workflow. Create one under Credentials → Email.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fromFilter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sender filter (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="@acme.com, support@" {...field} />
                  </FormControl>
                  <FormDescription>
                    Comma separated. The run stops unless the sender contains
                    one of these.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subjectFilter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject filter (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="invoice, refund" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-lg bg-muted p-4 space-y-2">
              <h4 className="font-medium text-sm">Available Variables</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  <code className="bg-background px-1 py-0.5 rounded">
                    {"{{email.from}}"}
                  </code>{" "}
                  sender address
                </li>
                <li>
                  <code className="bg-background px-1 py-0.5 rounded">
                    {"{{email.subject}}"}
                  </code>{" "}
                  subject line
                </li>
                <li>
                  <code className="bg-background px-1 py-0.5 rounded">
                    {"{{email.text}}"}
                  </code>{" "}
                  plain-text body
                </li>
                <li>
                  <code className="bg-background px-1 py-0.5 rounded">
                    {"{{json email}}"}
                  </code>{" "}
                  the whole message
                </li>
              </ul>
            </div>

            <DialogFooter className="mt-4">
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
