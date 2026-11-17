import { UserDetail } from "@/components/admin/Oversight";

export default async function Page(props: PageProps<"/admin/users/[id]">) {
  const { id } = await props.params;
  return <UserDetail id={id} />;
}
