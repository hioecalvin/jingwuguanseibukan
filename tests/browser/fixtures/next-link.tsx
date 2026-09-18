import type { AnchorHTMLAttributes } from 'react';

// Presentational navigation fixture only: no Next routing, server layout or Auth.
export default function FixtureLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} />;
}
