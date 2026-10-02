import './styles.css';import {WebsiteContentProvider} from '../components/WebsiteContent';import {Suspense} from 'react';import {AuthProvider} from '../components/auth/AuthProvider';
export const dynamic='force-dynamic';
export const metadata={title:'Singh Academy | Master the Art of Resolution',description:'Executive education in negotiation, mediation, leadership and cross-cultural communication.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning><body><AuthProvider><WebsiteContentProvider><Suspense fallback={<div role="status" style={{padding:40}}>Loading Singh Academy…</div>}>{children}</Suspense></WebsiteContentProvider></AuthProvider></body></html>}
