import React from "react";
import prisma from "@/lib/db";
const Page = async () => {
  const users = await prisma.user.findMany();
  return <div>{JSON.stringify(users)}</div>;
};

export default Page;
