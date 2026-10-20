import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'SLR / STUDIO — See the grammar unfold', description: 'An interactive SLR(1) parser construction and simulation studio.' };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
