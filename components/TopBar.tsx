import type { ReactNode } from "react";
import { ShellTopBar } from "@/components/ShellTopBar";

export function TopBar({ rightSlot }: { rightSlot?: ReactNode }) {
  return (
    <ShellTopBar
      className="home-topbar-shell"
      href="/"
      title="NOVIRA"
      subtitle="Az olvasható irodalom műhelye"
      ariaLabel="Novira home"
      rightSlot={rightSlot}
    />
  );
}
