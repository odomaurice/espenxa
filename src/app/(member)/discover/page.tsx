import type { Metadata } from "next";
import { Suspense } from "react";
import Discover from "@/components/discover/Discover";

export const metadata: Metadata = { title: "Discover" };

export default function DiscoverPage() {
  return (
    <Suspense>
      <Discover />
    </Suspense>
  );
}
