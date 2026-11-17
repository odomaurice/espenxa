import type { Metadata } from "next";
import BookingList from "@/components/bookings/BookingList";

export const metadata: Metadata = { title: "Bookings" };

export default function BookingsPage() {
  return <BookingList />;
}
