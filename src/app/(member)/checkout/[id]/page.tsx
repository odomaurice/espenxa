import type { Metadata } from "next";
import Checkout from "@/components/bookings/Checkout";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage(props: PageProps<"/checkout/[id]">) {
  const { id } = await props.params;
  return <Checkout id={id} />;
}
