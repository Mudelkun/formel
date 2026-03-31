import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useSettings } from '@/hooks/use-settings';

export default function AppLayout() {
  const { data: settings } = useSettings();

  useEffect(() => {
    document.title = settings?.schoolName
      ? `Formel — ${settings.schoolName}`
      : 'Formel';
  }, [settings?.schoolName]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
