import Link from "next/link";
import type { ReactNode } from "react";

type ShellTopBarProps = {
  href: string;
  title: string;
  subtitle?: string;
  ariaLabel: string;
  middleSlot?: ReactNode;
  rightSlot?: ReactNode;
  className?: string;
};

export function ShellTopBar({ href, title, subtitle, ariaLabel, middleSlot, rightSlot, className }: ShellTopBarProps) {
  return (
    <div className={className}>
      <Link className="home-topbar-logo" href={href} aria-label={ariaLabel}>
        <span className="home-topbar-logo-mark" aria-hidden="true" />
        {middleSlot}
        <span className="home-topbar-copy">
          <span className="home-topbar-title">{title}</span>
          {subtitle ? <span className="home-topbar-subtitle">{subtitle}</span> : null}
        </span>
      </Link>
      {rightSlot}
    </div>
  );
}
