"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONDITION_OPERATORS } from "./executor";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores",
    }),
  leftValue: z.string().min(1, "Value to check is required"),
  operator: z.enum(CONDITION_OPERATORS),
  rightValue: z.string().optional(),
});

export type ConditionFormValues = z.infer<typeof formSchema>;

const operatorLabels: Record<(typeof CONDITION_OPERATORS)[number], string> = {
  equals: "equals",
  notEquals: "does not equal",
  contains: "contains",
  notContains: "does not contain",
  startsWith: "starts with",
  endsWith: "ends with",
  greaterThan: "is greater than",
  lessThan: "is less than",
  isEmpty: "is empty",
  isNotEmpty: "is not empty",
  matchesRegex: "matches regex",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ConditionFormValues) => void;
  defaultValues?: Partial<ConditionFormValues>;
}

export const ConditionDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const form = useForm<ConditionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      leftValue: defaultValues.leftValue || "",
      operator: defaultValues.operator || "contains",
      rightValue: defaultValues.rightValue || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        leftValue: defaultValues.leftValue || "",
        operator: defaultValues.operator || "contains",
        rightValue: defaultValues.rightValue || "",
      });
    }
  }, [open, defaultValues, form]);

  const watchVariableName = form.watch("variableName") || "myCondition";

  const handleSubmit = (values: ConditionFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Condition Configuration</DialogTitle>
          <DialogDescription>
            Nodes wired to the green handle run when the check passes, nodes on
            the red handle run when it fails.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-8 mt-4"
          >
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input placeholder="isUrgent" {...field} />
                  </FormControl>
                  <FormDescription>
                    Use this name to reference the outcome in other nodes:{" "}
                    {`{{${watchVariableName}.result}}`}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="leftValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Value to check</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="{{urgency.text}}"
                      className="font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Handlebars template evaluated against the workflow context
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="operator"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Operator</FormLabel>
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
                      {CONDITION_OPERATORS.map((operator) => (
                        <SelectItem key={operator} value={operator}>
                          {operatorLabels[operator]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rightValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Compare with</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="URGENT"
                      className="font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Ignored by the &quot;is empty&quot; operators. Comparison is
                    case-insensitive.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-4">
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
