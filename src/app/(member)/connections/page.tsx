import type { Metadata } from "next";
import { Suspense } from "react";
import Connections from "@/components/connections/Connections";

export const metadata: Metadata = { title: "Connections" };

export default function ConnectionsPage() {
  return (
    <Suspense>
      <Connections />
    </Suspense>
  );
}
