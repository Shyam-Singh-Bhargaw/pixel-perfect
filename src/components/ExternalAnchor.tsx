import * as React from "react";

import { cn } from "@/lib/utils";

interface ExternalAnchorProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string;
}

function normalizeHref(href: string) {
  if (/^(https?:|mailto:|tel:)/i.test(href)) return href;
  return `https://${href}`;
}

const ExternalAnchor = React.forwardRef<HTMLAnchorElement, ExternalAnchorProps>(
  ({ href, className, style, onClick, children, ...props }, ref) => {
    const resolvedHref = normalizeHref(href);

    const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.stopPropagation();
      onClick?.(event);
      if (event.defaultPrevented) return;
      event.preventDefault();
      window.open(resolvedHref, "_blank", "noopener,noreferrer");
    };

    return (
      <a
        ref={ref}
        href={resolvedHref}
        target="_blank"
        rel="noopener noreferrer"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={handleClick}
        className={cn(className)}
        style={{ cursor: "pointer", ...style }}
        {...props}
      >
        {children}
      </a>
    );
  },
);

ExternalAnchor.displayName = "ExternalAnchor";

export { ExternalAnchor };
