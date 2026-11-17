import type { Metadata } from "next";
import PersonProfile from "@/components/people/PersonProfile";

export const metadata: Metadata = { title: "Profile" };

export default async function PersonPage(props: PageProps<"/people/[id]">) {
  const { id } = await props.params;
  return <PersonProfile id={id} />;
}
