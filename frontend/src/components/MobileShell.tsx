import type { ReactNode } from "react";

interface MobileShellProps {
  children: ReactNode;
  className?: string;
}

export default function MobileShell({ children, className = "" }: MobileShellProps) {
  return <main className={`mobile-shell ${className}`.trim()}>{children}</main>;
}
