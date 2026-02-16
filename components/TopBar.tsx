import type { ReactNode } from "react";
import { ShellTopBar } from "@/components/ShellTopBar";

export function TopBar({ rightSlot }: { rightSlot?: ReactNode }) {
  return (
    <ShellTopBar
      href="/"
      title="NOVIRA"
      subtitle="Az olvashato irodalom muhelye"
      ariaLabel="Novira home"
      rightSlot={rightSlot}
    />
  );
}
