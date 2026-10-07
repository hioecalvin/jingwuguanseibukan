"use client";

import { useId, useState, type HTMLAttributes, type ReactNode } from "react";

type CompactRecordProps = HTMLAttributes<HTMLElement> & {
  summary: ReactNode;
  detail?: ReactNode;
  defaultExpanded?: boolean;
  alwaysCollapsible?: boolean;
  as?: "article" | "section";
};

/** Keep controls mounted: collapsing a record must never discard an edit. */
export default function CompactRecord({
  summary, detail, defaultExpanded = false, alwaysCollapsible = false, as: Element = "article", children, className = "", ...props
}: CompactRecordProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const bodyId = useId();
  return (
    <Element {...props} className={`compact-record ${alwaysCollapsible ? "compact-record-always" : ""} ${className}`} data-expanded={expanded}>
      <button
        type="button"
        className="compact-record-toggle"
        aria-expanded={expanded}
        aria-controls={bodyId}
        onClick={() => setExpanded(value => !value)}
      >
        <span className="min-w-0 flex-1">
          <span className="block break-words font-semibold text-neutral-100">{summary}</span>
          <span className="mt-0.5 block break-words text-xs font-normal text-neutral-400">
            {detail ?? (expanded ? "Hide details" : "Details & actions")}
          </span>
        </span>
        <span aria-hidden="true" className="shrink-0 text-sky-300">{expanded ? "−" : "+"}</span>
      </button>
      <div
        id={bodyId}
        className="compact-record-body"
        onInvalidCapture={event => {
          // A required control may be in a collapsed record within a larger form.
          // Reveal it before native validation attempts to focus it.
          setExpanded(true);
          const control = event.target as HTMLElement;
          requestAnimationFrame(() => control.focus());
        }}
      >
        {children}
      </div>
    </Element>
  );
}
