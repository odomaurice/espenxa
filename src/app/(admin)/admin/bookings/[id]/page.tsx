import { BookingDetail } from "@/components/admin/Oversight";

export default async function Page(props: PageProps<"/admin/bookings/[id]">) {
  const { id } = await props.params;
  return <BookingDetail id={id} />;
}
