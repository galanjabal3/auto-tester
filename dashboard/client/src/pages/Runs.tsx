import { useEffect, useState } from 'react';
import { getRuns, getRun, getTestSpecs } from '../api/client';
import Pagination from '../components/Pagination';
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Play, Film, Code, Image } from 'lucide-react';

interface Run {
  id: string;
  site_id: string;
  site_name: string;
  status: string;
  passed: number;
  failed: number;
  skipped: number;
  slow_api_count: number;
  total_duration_ms: number;
  started_at: string;
}

interface TestResult {
  test_name: string;
  status: string;
  duration_ms: number;
  error: string | null;
  screenshot_path: string | null;
  video_path: string | null;
  slow_apis: string;
}

interface TestSpec {
  test_name: string;
  code: string;
  spec_file: string;
}

export default function Runs() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [runDetails, setRunDetails] = useState<Record<string, TestResult[]>>({});
  const [testSpecs, setTestSpecs] = useState<Record<string, TestSpec[]>>({});
  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [videoSpeed, setVideoSpeed] = useState<number>(0.5);
  const [page, setPage] = useState(1);
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);
  const perPage = 10;

  useEffect(() => {
    getRuns()
      .then(data => setRuns(data))
      .catch(err => console.error('Error fetching runs:', err));
  }, []);

  const toggleExpand = async (runId: string, siteId?: string) => {
    if (expandedRun === runId) {
      setExpandedRun(null);
      setPlayingVideo(null);
      setExpandedTest(null);
      return;
    }
    setExpandedRun(runId);
    setPlayingVideo(null);
    setExpandedTest(null);
    if (!runDetails[runId]) {
      const detail = await getRun(runId);
      setRunDetails(prev => ({ ...prev, [runId]: detail.tests }));
      if (siteId && !testSpecs[siteId]) {
        const specs = await getTestSpecs(siteId);
        setTestSpecs(prev => ({ ...prev, [siteId]: specs }));
      }
    }
  };

  const getVideoUrl = (videoPath: string) => {
    const parts = videoPath.replace(/\\/g, '/').split('/');
    const folderIndex = parts.indexOf('artifacts');
    if (folderIndex >= 0 && folderIndex < parts.length - 2) {
      const folder = parts[folderIndex + 1];
      const file = parts[folderIndex + 2];
      return `/api/artifacts/${folder}/${file}`;
    }
    const filename = parts.pop() || 'video.webm';
    return `/api/artifacts/${filename}`;
  };

  const getScreenshotUrl = (screenshotPath: string) => {
    const parts = screenshotPath.replace(/\\/g, '/').split('/');
    const folderIndex = parts.indexOf('artifacts');
    if (folderIndex >= 0 && folderIndex < parts.length - 2) {
      const folder = parts[folderIndex + 1];
      const file = parts[folderIndex + 2];
      return `/api/artifacts/${folder}/${file}`;
    }
    const filename = parts.pop() || 'screenshot.png';
    return `/api/artifacts/${filename}`;
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Test Runs</h2>

      <div className="space-y-3">
        {runs.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-500">
            No runs yet. Go to Sites and click "Run" to start a test.
          </div>
        ) : (
          <>
            {runs.slice((page - 1) * perPage, page * perPage).map((run) => (
              <div key={run.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                onClick={() => toggleExpand(run.id, run.site_id)}
              >
                <div className="flex items-center gap-4">
                  {expandedRun === run.id ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    run.status === 'completed' && run.failed === 0 ? 'bg-emerald-500/10 text-emerald-400' :
                    run.status === 'completed' && run.failed > 0 ? 'bg-red-500/10 text-red-400' :
                    run.status === 'running' ? 'bg-yellow-500/10 text-yellow-400' :
                    'bg-gray-500/10 text-gray-400'
                  }`}>
                    {run.status === 'completed' && run.failed === 0 ? 'PASSED' :
                     run.status === 'completed' ? 'FAILED' : run.status.toUpperCase()}
                  </span>
                  <div>
                    <div className="font-semibold">{run.site_name}</div>
                    <div className="text-xs text-gray-500">{new Date(run.started_at).toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-emerald-400">{run.passed} passed</span>
                  <span className="text-red-400">{run.failed} failed</span>
                  {run.slow_api_count > 0 && (
                    <span className="text-orange-400">{run.slow_api_count} slow APIs</span>
                  )}
                  <span className="text-gray-500">{Math.round((run.total_duration_ms ?? 0) / 1000)}s</span>
                </div>
              </div>

              {/* Expanded test results */}
              {expandedRun === run.id && runDetails[run.id] && (
                <div className="border-t border-gray-200 dark:border-gray-800">
                  {/* Video player */}
                  {playingVideo && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">Test Recording</span>
                          <div className="flex items-center gap-1">
                            {[0.25, 0.5, 1, 1.5, 2].map(speed => (
                              <button
                                key={speed}
                                onClick={() => setVideoSpeed(speed)}
                                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                                  videoSpeed === speed
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700'
                                }`}
                              >
                                {speed}x
                              </button>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => setPlayingVideo(null)}
                          className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                          Close
                        </button>
                      </div>
                      <video
                        src={getVideoUrl(playingVideo)}
                        controls
                        autoPlay
                        playbackRate={videoSpeed}
                        className="w-full max-w-3xl rounded-lg bg-black"
                      />
                    </div>
                  )}

                  {/* Screenshot viewer */}
                  {viewingScreenshot && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500">Failure Screenshot</span>
                        <button
                          onClick={() => setViewingScreenshot(null)}
                          className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                          Close
                        </button>
                      </div>
                      <img
                        src={getScreenshotUrl(viewingScreenshot)}
                        alt="Failure screenshot"
                        className="max-w-3xl rounded-lg border border-gray-200 dark:border-gray-800"
                      />
                    </div>
                  )}

                  {/* Test list */}
                  <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    {runDetails[run.id].map((test, i) => {
                      const spec = testSpecs[run.site_id]?.find((s: TestSpec) => s.test_name === test.test_name);
                      const testKey = `${run.id}-${test.test_name}`;
                      const isCodeOpen = expandedTest === testKey;
                      return (
                        <div key={i}>
                          <div className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                            <div className="flex items-center gap-3">
                              {test.status === 'pass' ? (
                                <CheckCircle size={16} className="text-emerald-400" />
                              ) : (
                                <XCircle size={16} className="text-red-400" />
                              )}
                              <span className="text-sm">{test.test_name}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs">
                              <span className="text-gray-500">{test.duration_ms}ms</span>
                              {test.error && <span className="text-red-400 max-w-xs truncate">{test.error}</span>}
                              {spec && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedTest(isCodeOpen ? null : testKey);
                                  }}
                                  className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                                    isCodeOpen
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                                  }`}
                                >
                                  <Code size={12} /> Code
                                </button>
                              )}
                              {test.video_path && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPlayingVideo(test.video_path);
                                  }}
                                  className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded hover:bg-emerald-500/20 transition-colors"
                                >
                                  <Film size={12} /> Video
                                </button>
                              )}
                              {test.screenshot_path && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingScreenshot(test.screenshot_path);
                                  }}
                                  className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-400 rounded hover:bg-amber-500/20 transition-colors"
                                >
                                  <Image size={12} /> Screenshot
                                </button>
                              )}
                            </div>
                          </div>
                          {isCodeOpen && spec && (
                            <div className="px-5 pb-4">
                              <pre className="bg-gray-50 dark:bg-gray-950 rounded-lg p-4 text-xs text-gray-700 dark:text-gray-300 overflow-x-auto border border-gray-200 dark:border-gray-800">
                                <code>{spec.code}</code>
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
            <Pagination page={page} total={runs.length} perPage={perPage} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
