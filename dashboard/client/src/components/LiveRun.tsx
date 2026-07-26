import { useEffect, useState, useRef } from 'react';
import { CheckCircle, XCircle, Loader, Clock, AlertTriangle, X } from 'lucide-react';

interface TestEvent {
  test_name: string;
  status: 'pass' | 'fail' | 'skip';
  duration_ms: number;
  error?: string;
  index: number;
  total: number;
}

interface RunState {
  status: 'starting' | 'running' | 'completed' | 'error';
  siteName: string;
  tests: TestEvent[];
  passed: number;
  failed: number;
  skipped: number;
  error?: string;
}

interface LiveRunProps {
  runId: string;
  siteName: string;
  onComplete?: () => void;
  onNotify?: (type: 'success' | 'error', message: string) => void;
}

export default function LiveRun({ runId, siteName, onComplete, onNotify }: LiveRunProps) {
  const [state, setState] = useState<RunState>({
    status: 'starting',
    siteName,
    tests: [],
    passed: 0,
    failed: 0,
    skipped: 0,
  });
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const baseURL = window.location.port === '5173' ? 'http://localhost:3001' : '';
    const es = new EventSource(`${baseURL}/api/live/live/${runId}`);
    eventSourceRef.current = es;

    es.addEventListener('testcomplete', (e) => {
      const test: TestEvent = JSON.parse(e.data);
      setState(prev => ({
        ...prev,
        status: 'running',
        tests: [...prev.tests, test],
      }));
    });

    es.addEventListener('runcomplete', (e) => {
      const data = JSON.parse(e.data);
      setState(prev => ({
        ...prev,
        status: 'completed',
        passed: data.passed,
        failed: data.failed,
        skipped: data.skipped,
      }));
      es.close();
      onNotify?.(
        data.failed === 0 ? 'success' : 'error',
        `${siteName}: ${data.passed} passed, ${data.failed} failed`
      );
    });

    es.addEventListener('runerror', (e) => {
      const data = JSON.parse(e.data);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: data.error,
      }));
      es.close();
      onNotify?.('error', `${siteName}: Run failed — ${data.error}`);
    });

    es.onerror = () => {
      setTimeout(() => {
        es.close();
        onComplete?.();
      }, 2000);
    };

    return () => es.close();
  }, [runId]);

  const progress = state.tests.length > 0
    ? Math.round((state.tests.length / (state.tests[state.tests.length - 1]?.total || 1)) * 100)
    : 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {state.status === 'completed' ? (
            state.failed === 0 ? <CheckCircle size={20} className="text-emerald-400" /> : <XCircle size={20} className="text-red-400" />
          ) : state.status === 'error' ? (
            <AlertTriangle size={20} className="text-red-400" />
          ) : (
            <Loader size={20} className="text-emerald-400 animate-spin" />
          )}
          <div>
            <div className="font-semibold">{siteName}</div>
            <div className="text-xs text-gray-500">
              {state.status === 'starting' && 'Initializing...'}
              {state.status === 'running' && `Test ${state.tests.length} of ${state.tests[state.tests.length - 1]?.total || '?'} — ${progress}%`}
              {state.status === 'completed' && `Completed — ${state.passed} passed, ${state.failed} failed`}
              {state.status === 'error' && 'Error occurred'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-emerald-400">{state.passed} pass</span>
          <span className="text-red-400">{state.failed} fail</span>
          {(state.status === 'completed' || state.status === 'error') && (
            <button
              onClick={onComplete}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-xs font-medium transition-colors"
            >
              <X size={12} /> Done
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {(state.status === 'running' || state.status === 'starting') && (
        <div className="h-1 bg-gray-200 dark:bg-gray-800">
          <div
            className="h-full bg-emerald-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Completion summary */}
      {state.status === 'completed' && (
        <div className={`p-4 border-b ${
          state.failed === 0
            ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20'
            : 'bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20'
        }`}>
          <div className="flex items-center gap-3">
            {state.failed === 0 ? (
              <CheckCircle size={20} className="text-emerald-500" />
            ) : (
              <XCircle size={20} className="text-red-500" />
            )}
            <div>
              <div className={`text-sm font-semibold ${
                state.failed === 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
              }`}>
                {state.failed === 0 ? 'All tests passed!' : `${state.failed} test(s) failed`}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {state.passed} passed{state.skipped > 0 ? `, ${state.skipped} skipped` : ''}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test list */}
      <div className="divide-y divide-gray-200 dark:divide-gray-800 max-h-96 overflow-y-auto">
        {state.tests.map((test, i) => (
          <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <div className="flex items-center gap-3">
              {test.status === 'pass' ? (
                <CheckCircle size={16} className="text-emerald-400" />
              ) : test.status === 'fail' ? (
                <XCircle size={16} className="text-red-400" />
              ) : (
                <Clock size={16} className="text-gray-500" />
              )}
              <span className="text-sm">{test.test_name}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{test.duration_ms}ms</span>
              {test.error && (
                <span className="text-red-400 max-w-xs truncate">{test.error}</span>
              )}
            </div>
          </div>
        ))}

        {state.tests.length === 0 && state.status === 'running' && (
          <div className="px-5 py-8 text-center text-gray-500">
            <Loader size={24} className="animate-spin mx-auto mb-2" />
            Running first test...
          </div>
        )}
      </div>

      {/* Error */}
      {state.status === 'error' && state.error && (
        <div className="p-5 bg-red-500/5 border-t border-red-500/20">
          <div className="text-sm text-red-400">{state.error}</div>
        </div>
      )}
    </div>
  );
}
