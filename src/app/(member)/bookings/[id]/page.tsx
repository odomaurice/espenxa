import type { Metadata } from "next";
import BookingDetail from "@/components/bookings/BookingDetail";

export const metadata: Metadata = { title: "Booking" };

export default async function BookingPage(props: PageProps<"/bookings/[id]">) {
  const { id } = await props.params;
  return <BookingDetail id={id} />;
}
