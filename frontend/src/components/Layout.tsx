import { PropsWithChildren } from 'react';
import { Link, useLocation } from 'react-router-dom';

export function Layout({ children }: PropsWithChildren) {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: '🏠' },
    { name: 'Repositories', href: '/repositories', icon: '📦' },
    { name: 'Archives', href: '/archives', icon: '📁' },
    { name: 'Backup Jobs', href: '/backup-jobs', icon: '⏰' },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="text-xl font-bold text-gray-900">
                  🏛️ BorgDash
                </Link>
              </div>
              <div className="ml-10 flex items-baseline space-x-4">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="text-sm text-gray-500">
                Borg Backup Dashboard
              </div>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}