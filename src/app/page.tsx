import { requireAuth } from "@/lib/auth-utils";
import { caller } from "@/trpc/server";

const Page = async () => {
  await requireAuth();
  const data = await caller.getUsers();

  return (
    <div className="min-h-screen min-w-screen flex flex-col  items-center justify-center gap-y-3">
      <div>Protected Page</div>
      <div>{JSON.stringify(data)}</div>
    </div>
  );
};

export default Page;
