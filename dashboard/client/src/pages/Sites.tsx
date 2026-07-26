import { useEffect, useState } from 'react';
import { getSites, createSite, deleteSite, generateTest } from '../api/client';
import LiveRun from '../components/LiveRun';
import Pagination from '../components/Pagination';
import { useToast } from '../components/useToast';
import { Plus, Trash2, Play, Globe, Settings, Video, Copy, ExternalLink } from 'lucide-react';

interface Site {
  id: string;
  name: string;
  base_url: string;
  login_path: string;
  email_field: string;
  password_field: string;
  submit_button: string;
  success_selector: string | null;
  tests: string[];
  api_threshold_ms: number;
  created_at: string;
}

interface ActiveRun {
  runId: string;
  siteName: string;
}

const defaultForm = {
  name: '',
  base_url: '',
  login_path: '/login',
  email_field: '[name="email"]',
  password_field: '[name="password"]',
  submit_button: 'button[type="submit"]',
  success_selector: '',
  api_threshold_ms: '2000',
  tests: '',
};

function validate(form: typeof defaultForm) {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = 'Site name is required';
  if (!form.base_url.trim()) {
    errors.base_url = 'Base URL is required';
  } else if (!/^https?:\/\/.+/.test(form.base_url.trim())) {
    errors.base_url = 'Must start with http:// or https://';
  }
  return errors;
}

export default function Sites() {
  const [sites, setSites] = useState<Site[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [activeRun, setActiveRun] = useState<ActiveRun | null>(() => {
    const saved = localStorage.getItem('activeRun');
    return saved ? JSON.parse(saved) : null;
  });
  const [codegenModal, setCodegenModal] = useState<{ siteId: string; siteName: string; baseUrl: string } | null>(null);
  const [codegenTestName, setCodegenTestName] = useState('');
  const [codegenCode, setCodegenCode] = useState('');
  const [codegenStatus, setCodegenStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [runModal, setRunModal] = useState<{ siteId: string; siteName: string; tests: string[] } | null>(null);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const { addToast, ToastContainer } = useToast();
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getSites()
      .then(data => setSites(data))
      .catch(err => console.error('Error fetching sites:', err));
  }, []);

  useEffect(() => {
    if (activeRun) {
      localStorage.setItem('activeRun', JSON.stringify(activeRun));
    } else {
      localStorage.removeItem('activeRun');
    }
  }, [activeRun]);

  const handleCreate = async () => {
    const validationErrors = validate(form);
    setErrors(validationErrors);
    setTouched({ name: true, base_url: true });
    if (Object.keys(validationErrors).length > 0) return;

    const tests = form.tests.split(',').map(t => t.trim()).filter(Boolean);
    try {
      const site = await createSite({
        name: form.name.trim(),
        base_url: form.base_url.trim(),
        login_path: form.login_path,
        email_field: form.email_field,
        password_field: form.password_field,
        submit_button: form.submit_button,
        success_selector: form.success_selector || null,
        api_threshold_ms: Number(form.api_threshold_ms) || 2000,
        tests,
      });
      setSites([site, ...sites]);
      setForm(defaultForm);
      setErrors({});
      setTouched({});
      setShowForm(false);
      setShowAdvanced(false);
      addToast('success', `Site "${site.name}" created`);
    } catch {
      addToast('error', 'Failed to create site');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm('Delete this site and its YAML config?')) return;
    try {
      await deleteSite(id);
      setSites(sites.filter(s => s.id !== id));
      addToast('success', `Site "${name}" deleted`);
    } catch {
      addToast('error', 'Failed to delete site');
    }
  };

  const handleRun = async (siteId: string, siteName: string, tests: string[]) => {
    if (tests.length > 1) {
      setRunModal({ siteId, siteName, tests });
      setSelectedTests([...tests]);
      return;
    }
    startRun(siteId, siteName, tests);
  };

  const startRun = async (siteId: string, siteName: string, tests: string[]) => {
    const baseURL = window.location.port === '5173' ? 'http://localhost:3001' : '';
    const res = await fetch(`${baseURL}/api/live/live`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: siteId, tests }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.runId) {
        setActiveRun({ runId: data.runId, siteName });
      }
    }
  };

  const handleCodegenGenerate = async () => {
    if (!codegenModal || !codegenTestName.trim() || !codegenCode.trim()) return;
    setCodegenStatus('saving');
    try {
      await generateTest({
        site_id: codegenModal.siteId,
        test_name: codegenTestName.trim(),
        code: codegenCode.trim(),
      });
      setCodegenStatus('done');
      addToast('success', `Spec "${codegenTestName}" saved`);
    } catch {
      setCodegenStatus('error');
      addToast('error', 'Failed to save spec');
    }
  };

  const inputClass = "bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 w-full";
  const labelClass = "text-xs text-gray-500 mb-1 block";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Sites</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your test targets</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Add Site
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">New Site</h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelClass}>Site Name *</label>
              <input
                placeholder="My Website"
                value={form.name}
                onChange={e => {
                  setForm({ ...form, name: e.target.value });
                  if (touched.name) setErrors(validate({ ...form, name: e.target.value }));
                }}
                onBlur={() => {
                  setTouched(t => ({ ...t, name: true }));
                  setErrors(validate(form));
                }}
                className={`${inputClass} ${touched.name && errors.name ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {touched.name && errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className={labelClass}>Base URL *</label>
              <input
                placeholder="https://example.com"
                value={form.base_url}
                onChange={e => {
                  setForm({ ...form, base_url: e.target.value });
                  if (touched.base_url) setErrors(validate({ ...form, base_url: e.target.value }));
                }}
                onBlur={() => {
                  setTouched(t => ({ ...t, base_url: true }));
                  setErrors(validate(form));
                }}
                className={`${inputClass} ${touched.base_url && errors.base_url ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {touched.base_url && errors.base_url && <p className="text-xs text-red-500 mt-1">{errors.base_url}</p>}
            </div>
          </div>

          <div className="mb-4">
            <label className={labelClass}>Tests (comma separated)</label>
            <input placeholder="login, dashboard, checkout" value={form.tests} onChange={e => setForm({ ...form, tests: e.target.value })} className={inputClass} />
          </div>

          <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 mb-4 transition-colors">
            <Settings size={14} />
            {showAdvanced ? 'Hide' : 'Show'} auth & threshold settings
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <div>
                <label className={labelClass}>Login Path</label>
                <input placeholder="/login" value={form.login_path} onChange={e => setForm({ ...form, login_path: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>API Threshold (ms)</label>
                <input type="number" placeholder="2000" value={form.api_threshold_ms} onChange={e => setForm({ ...form, api_threshold_ms: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email/Username Selector</label>
                <input placeholder='[name="email"]' value={form.email_field} onChange={e => setForm({ ...form, email_field: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Password Selector</label>
                <input placeholder='[name="password"]' value={form.password_field} onChange={e => setForm({ ...form, password_field: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Submit Button Selector</label>
                <input placeholder='button[type="submit"]' value={form.submit_button} onChange={e => setForm({ ...form, submit_button: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Success Selector (optional)</label>
                <input placeholder=".flash.success" value={form.success_selector} onChange={e => setForm({ ...form, success_selector: e.target.value })} className={inputClass} />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleCreate} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium">Create</button>
            <button onClick={() => { setShowForm(false); setShowAdvanced(false); setErrors({}); setTouched({}); }} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm font-medium">Cancel</button>
          </div>
        </div>
      )}

      {/* Active Live Run */}
      {activeRun && (
        <div className="mb-6">
          <LiveRun runId={activeRun.runId} siteName={activeRun.siteName} onComplete={() => setActiveRun(null)} onNotify={addToast} />
        </div>
      )}

      {/* Sites List */}
      <div className="space-y-3">
        {sites.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-500">
            No sites configured yet. Click "Add Site" to get started.
          </div>
        ) : (
          <>
            {sites.slice((page - 1) * perPage, page * perPage).map((site) => (
              <div key={site.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 flex items-center justify-between hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                    <Globe size={20} className="text-emerald-500" />
                  </div>
                  <div>
                    <div className="font-semibold">{site.name}</div>
                    <div className="text-sm text-gray-500">{site.base_url}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {site.tests.length} test{site.tests.length !== 1 ? 's' : ''} • {site.api_threshold_ms}ms threshold
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCodegenModal({ siteId: site.id, siteName: site.name, baseUrl: site.base_url })}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
                    title="Record with Playwright Codegen"
                  >
                    <Video size={14} /> Record
                  </button>
                  <button
                    onClick={() => handleRun(site.id, site.name, site.tests)}
                    disabled={activeRun !== null}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Play size={14} /> Run
                  </button>
                  <button
                    onClick={() => handleDelete(site.id, site.name)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            <Pagination page={page} total={sites.length} perPage={perPage} onChange={setPage} />
          </>
        )}
      </div>

      {/* Codegen Modal */}
      {codegenModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 w-full max-w-2xl shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Record Test — {codegenModal.siteName}</h3>
              <button onClick={() => { setCodegenModal(null); setCodegenTestName(''); setCodegenCode(''); setCodegenStatus('idle'); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
            </div>

            <div className="mb-4">
              <label className={labelClass}>1. Run Playwright Codegen</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg text-sm text-emerald-600 dark:text-emerald-400 overflow-x-auto">
                  npx playwright codegen {codegenModal.baseUrl}
                </code>
                <button onClick={() => navigator.clipboard.writeText(`npx playwright codegen ${codegenModal.baseUrl}`)} className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Copy command">
                  <Copy size={14} />
                </button>
                <a href="https://playwright.dev/docs/codegen" target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Playwright Codegen docs">
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            <div className="mb-4">
              <label className={labelClass}>2. Test Name</label>
              <input placeholder="e.g. login, checkout, search" value={codegenTestName} onChange={e => setCodegenTestName(e.target.value)} className={inputClass} />
            </div>

            <div className="mb-4">
              <label className={labelClass}>3. Paste Recorded Code</label>
              <textarea placeholder="Paste your Playwright Codegen output here..." value={codegenCode} onChange={e => setCodegenCode(e.target.value)} className={`${inputClass} font-mono text-xs h-48 resize-y`} />
            </div>

            {codegenStatus === 'done' && (
              <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg text-sm text-emerald-700 dark:text-emerald-400">
                Spec saved! Test "{codegenTestName}" added to {codegenModal.siteName}.
              </div>
            )}
            {codegenStatus === 'error' && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-sm text-red-700 dark:text-red-400">
                Failed to save spec. Check the server logs.
              </div>
            )}

            <div className="flex gap-3">
              {codegenStatus === 'done' ? (
                <button onClick={() => { setCodegenModal(null); setCodegenTestName(''); setCodegenCode(''); setCodegenStatus('idle'); getSites().then(data => setSites(data)); }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium transition-colors">
                  Done
                </button>
              ) : (
                <button onClick={handleCodegenGenerate} disabled={!codegenTestName.trim() || !codegenCode.trim() || codegenStatus === 'saving'} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors">
                  {codegenStatus === 'saving' ? 'Saving...' : 'Generate Spec'}
                </button>
              )}
              <button onClick={() => { setCodegenModal(null); setCodegenTestName(''); setCodegenCode(''); setCodegenStatus('idle'); }} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm font-medium">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Run Test Selector Modal */}
      {runModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Run Tests</h3>
            <p className="text-sm text-gray-500 mb-4">{runModal.siteName} — select which tests to run:</p>

            <div className="space-y-2 mb-6">
              {runModal.tests.map((t) => (
                <label key={t} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedTests.includes(t)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedTests([...selectedTests, t]);
                      else setSelectedTests(selectedTests.filter(x => x !== t));
                    }}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-sm">{t}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => { startRun(runModal.siteId, runModal.siteName, selectedTests); setRunModal(null); }} disabled={selectedTests.length === 0} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors">
                Run {selectedTests.length > 0 ? `(${selectedTests.length})` : ''}
              </button>
              <button onClick={() => setRunModal(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm font-medium">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <ToastContainer />
    </div>
  );
}
