import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { requireAuth } from "@/lib/auth-utils";
import { caller } from "@/trpc/server";

const Page = async () => {
  await requireAuth();
  const data = await caller.getUsers();
  return (
    <div className="min-h-screen min-w-screen flex flex-col  items-center justify-center gap-y-6">
      Protected Page
      <div>{JSON.stringify(data)}</div>
      {/* <Button onClick={() => authClient.signOut()}>Logout</Button> */}
    </div>
  );
};

export default Page;
