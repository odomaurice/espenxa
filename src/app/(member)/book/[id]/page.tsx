import type { Metadata } from "next";
import BookRequest from "@/components/bookings/BookRequest";

export const metadata: Metadata = { title: "Request a booking" };

export default async function BookPage(props: PageProps<"/book/[id]">) {
  const { id } = await props.params;
  return <BookRequest id={id} />;
}
