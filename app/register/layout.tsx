import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = { title: 'Member registration' };

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return children;
}
