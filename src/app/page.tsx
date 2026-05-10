"use client";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const Page = () => {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.getWorkflows.queryOptions());
  const queryClient = useQueryClient();
  const create = useMutation(
    trpc.createWorkflow.mutationOptions({
      onSuccess: () => {
        toast.success("Job Queued");
      },
    }),
  );
  return (
    <div className="min-h-screen min-w-screen flex flex-col  items-center justify-center gap-y-3">
      <div>Protected Page</div>
      <div>{JSON.stringify(data)}</div>
      <Button disabled={create.isPending} onClick={() => create.mutate()}>
        Create Workflow
      </Button>
    </div>
  );
};

export default Page;
