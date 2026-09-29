import { createFileRoute } from "@tanstack/react-router";
import { AdminDemoNote, AdminHeader } from "@/components/admin/admin-kit";
import { PeopleTable } from "@/components/admin/people";
import { adminHead } from "@/lib/admin/head";

export const Route = createFileRoute("/admin/users")({ head: adminHead("Users"), component: () => <>
  <AdminHeader title="Users" intro="Search accounts, review activity and suspend or restore access. Records are never deleted from here."/>
  <AdminDemoNote/>
  <PeopleTable caption="All users" emptyTitle="No users found."/>
</> });
