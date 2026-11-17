import type { Metadata } from "next";
import Messages from "@/components/chats/Messages";

export const metadata: Metadata = { title: "Messages" };

export default async function ThreadPage(props: PageProps<"/chats/[id]">) {
  const { id } = await props.params;
  return <Messages activeId={id} />;
}
