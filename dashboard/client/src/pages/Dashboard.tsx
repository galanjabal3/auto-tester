import { useEffect, useState } from 'react';
import { getStats, getRuns } from '../api/client';
import Pagination from '../components/Pagination';
import { CheckCircle, XCircle, Clock, Activity, AlertTriangle, TrendingUp } from 'lucide-react';

interface Stats {
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  running_runs: number;
  avg_duration_ms: number;
  total_passed: number;
  total_failed: number;
  total_slow_apis: number;
}

interface Run {
  id: string;
  site_name: string;
  status: string;
  passed: number;
  failed: number;
  started_at: string;
  total_duration_ms: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentRuns, setRecentRuns] = useState<Run[]>([]);
  const [page, setPage] = useState(1);
  const perPage = 5;

  useEffect(() => {
    const load = () => {
      getStats()
        .then(setStats)
        .catch(err => console.error('Error fetching stats:', err));
      getRuns()
        .then(setRecentRuns)
        .catch(err => console.error('Error fetching runs:', err));
    };

    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    { label: 'Total Runs', value: stats?.total_runs ?? 0, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Successful', value: stats?.successful_runs ?? 0, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Failed', value: stats?.failed_runs ?? 0, icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'Running', value: stats?.running_runs ?? 0, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Tests Passed', value: stats?.total_passed ?? 0, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Tests Failed', value: stats?.total_failed ?? 0, icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'Slow APIs', value: stats?.total_slow_apis ?? 0, icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: 'Avg Duration', value: `${Math.round((stats?.avg_duration_ms ?? 0) / 1000)}s`, icon: Clock, color: 'text-gray-500', bg: 'bg-gray-500/10' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Overview of your test runs</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{card.label}</span>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon size={18} className={card.color} />
              </div>
            </div>
            <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Recent Runs */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="p-5 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold">Recent Runs</h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {recentRuns.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No runs yet. Go to Sites and click Run to start a test.
            </div>
          ) : (
            <>
              {recentRuns.slice((page - 1) * perPage, page * perPage).map((run) => (
                <div key={run.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      run.status === 'completed' && run.failed === 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                      run.status === 'completed' && run.failed > 0 ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                      run.status === 'running' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                      'bg-gray-500/10 text-gray-600 dark:text-gray-400'
                    }`}>
                      {run.status}
                    </span>
                    <div>
                      <div className="font-medium">{run.site_name}</div>
                      <div className="text-xs text-gray-500">{new Date(run.started_at).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="text-emerald-600 dark:text-emerald-400">{run.passed} passed</span>
                    <span className="text-red-600 dark:text-red-400">{run.failed} failed</span>
                    <span className="text-gray-500">{Math.round((run.total_duration_ms ?? 0) / 1000)}s</span>
                  </div>
                </div>
              ))}
              <div className="px-5 py-3">
                <Pagination page={page} total={recentRuns.length} perPage={perPage} onChange={setPage} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
