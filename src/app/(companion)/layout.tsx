import AppShell from "@/components/shell/AppShell";

// Companion-only pages: members are sent to "Become a companion".
export default function CompanionLayout({ children }: LayoutProps<"/">) {
  return <AppShell companionOnly>{children}</AppShell>;
}
