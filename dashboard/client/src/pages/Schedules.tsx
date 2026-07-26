import { Clock, Construction } from 'lucide-react';

export default function Schedules() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Schedules</h2>
        <p className="text-sm text-gray-500 mt-1">Automate recurring test runs</p>
      </div>

      {/* Coming Soon Banner */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center">
        <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Construction size={32} className="text-amber-500" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Cron scheduler is under development. This feature will allow you to schedule automated test runs at specific intervals (hourly, daily, weekly).
        </p>
        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-500">
          <Clock size={14} />
          <span>Planned: node-cron integration with auto-execution</span>
        </div>
      </div>
    </div>
  );
}
