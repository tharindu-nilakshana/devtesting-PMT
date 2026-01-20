import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/serverAuth';
import { fetchCommonWidgetDataSSR } from '@/lib/ssr/widgetDataFetcher';
import BloombergDashboard from '../components/bloomberg-ui/BloombergDashboard';

export default async function HomePage() {
  // Get server-side user for authentication
  const serverUser = await getServerUser();
  
  // Fetch SSR data for common widgets using modular approach
  const ssrWidgetData = await fetchCommonWidgetDataSSR();

  // Redirect to login if no server user
  if (!serverUser) {
    redirect('/login');
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading dashboard...</div>
      </div>
    }>
      <BloombergDashboard ssrWidgetData={ssrWidgetData} />
    </Suspense>
  );
}
