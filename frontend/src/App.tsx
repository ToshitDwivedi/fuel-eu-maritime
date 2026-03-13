import { useState } from 'react';
import { RoutesTab } from '@adapters/ui/RoutesTab';

const TABS = ['Routes', 'Compare', 'Banking', 'Pooling'] as const;
type Tab = (typeof TABS)[number];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Routes');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white py-4 px-6 shadow">
        <h1 className="text-2xl font-bold">FuelEU Maritime Compliance Dashboard</h1>
      </header>

      {/* Tab bar */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="flex overflow-x-auto px-4">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </nav>

      {/* Tab content */}
      <main className="p-6">
        {activeTab === 'Routes' && <RoutesTab />}
        {activeTab === 'Compare' && (
          <p className="text-gray-500">Compare tab coming soon.</p>
        )}
        {activeTab === 'Banking' && (
          <p className="text-gray-500">Banking tab coming soon.</p>
        )}
        {activeTab === 'Pooling' && (
          <p className="text-gray-500">Pooling tab coming soon.</p>
        )}
      </main>
    </div>
  );
}
