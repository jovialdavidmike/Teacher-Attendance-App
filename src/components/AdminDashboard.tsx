import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';

export function AdminDashboard() {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Admin Login State
  const [currentAdmin, setCurrentAdmin] = useState<string | null>(null);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Raw logs & Teachers state
  const [rawLogsList, setRawLogsList] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const ADMINS = [
    { id: 'admin1', name: 'Principal', password: 'admin' },
    { id: 'admin2', name: 'Vice Principal', password: 'admin' },
    { id: 'admin3', name: 'Director', password: 'admin' }
  ];

  // Fetch data to display initially
  useEffect(() => {
    if (!currentAdmin) return;
    
    const fetchData = async () => {
      setLoadingData(true);
      try {
        // Fetch Logs
        const logsQuery = query(collection(db, 'AttendanceLogs'), orderBy('Timestamp', 'desc'), limit(50));
        const logsSnapshot = await getDocs(logsQuery);
        
        const rawLogs: any[] = [];
        logsSnapshot.forEach(doc => {
          rawLogs.push({ id: doc.id, ...doc.data() });
        });

        // Fetch Teachers
        const teachersQuery = query(collection(db, 'Teachers'), orderBy('Name'));
        const teachersSnapshot = await getDocs(teachersQuery);
        
        const teachersData: any[] = [];
        const teacherCache: Record<string, string> = {};
        
        teachersSnapshot.forEach(tDoc => {
          const t = { id: tDoc.id, ...tDoc.data() };
          teachersData.push(t);
          teacherCache[t.id] = t.Name;
        });

        setTeachersList(teachersData);

        // Resolve log names
        const enrichedLogs = [];
        for (const log of rawLogs) {
          let dateString = "Unknown Time";
          if (log.Timestamp?.toDate) {
            dateString = log.Timestamp.toDate().toLocaleString();
          }

          enrichedLogs.push({
            id: log.id,
            TeacherName: teacherCache[log.TeacherID] || 'Unknown Teacher',
            Action: log.Action,
            Timestamp: dateString,
            LatenessReason: log.LatenessReason || null
          });
        }
        
        setRawLogsList(enrichedLogs);
      } catch (err) {
        console.error("Error fetching data", err);
      } finally {
        setLoadingData(false);
      }
    };
    
    fetchData();
  }, [currentAdmin]);

  const handleGenerateSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const logsQuery = query(collection(db, 'AttendanceLogs'), orderBy('Timestamp', 'desc'), limit(100));
      const logsSnapshot = await getDocs(logsQuery);
      
      const rawLogs: any[] = [];
      logsSnapshot.forEach(doc => {
        rawLogs.push({ id: doc.id, ...doc.data() });
      });

      if (rawLogs.length === 0) {
        setSummary("No logs found for the recent period.");
        setLoading(false);
        return;
      }

      const teacherCache: Record<string, string> = {};
      const enrichedLogs = [];

      for (const log of rawLogs) {
        if (!teacherCache[log.TeacherID]) {
          const tDoc = await getDoc(doc(db, 'Teachers', log.TeacherID));
          if (tDoc.exists()) {
            teacherCache[log.TeacherID] = tDoc.data().Name;
          } else {
            teacherCache[log.TeacherID] = 'Unknown Teacher';
          }
        }
        
        let dateString = "Unknown Time";
        if (log.Timestamp?.toDate) {
          dateString = log.Timestamp.toDate().toLocaleString();
        }

        enrichedLogs.push({
          TeacherName: teacherCache[log.TeacherID],
          Action: log.Action,
          Timestamp: dateString,
          LatenessReason: log.LatenessReason || undefined
        });
      }

      const response = await fetch('/api/summarize-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: enrichedLogs })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch summary from server');
      }

      const data = await response.json();
      setSummary(data.summary);
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred generating the summary');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const admin = ADMINS.find(a => a.id === selectedAdminId);
    if (!admin) {
      setLoginError('Please select an admin account.');
      return;
    }
    if (admin.password !== password) {
      setLoginError('Incorrect password.');
      return;
    }
    setCurrentAdmin(admin.name);
  };

  if (!currentAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
        <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 p-8 rounded-2xl shadow-xl w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center text-white">Admin Login</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Select Role</label>
              <select 
                value={selectedAdminId}
                onChange={(e) => setSelectedAdminId(e.target.value)}
                className="w-full bg-slate-900 border-2 border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                required
              >
                <option value="" disabled>Choose your admin account...</option>
                {ADMINS.map(admin => (
                  <option key={admin.id} value={admin.id}>
                    Log in as {admin.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Password</label>
              <input 
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border-2 border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                required
              />
            </div>
            {loginError && <p className="text-red-400 text-sm font-medium">{loginError}</p>}
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold transition-colors shadow-lg mt-2"
            >
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 pt-20">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Admin Intelligence Hub</h1>
            <p className="text-slate-400 mt-1">Welcome back, {currentAdmin}</p>
          </div>
          <div className="flex space-x-4">
            <button 
              onClick={handleGenerateSummary}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all shadow-lg"
            >
              <span>{loading ? 'Analyzing...' : 'Generate AI Report'}</span>
            </button>
            <button 
              onClick={() => {
                setCurrentAdmin(null);
                setPassword('');
                setSelectedAdminId('');
              }}
              className="bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-xl font-medium transition-all shadow-lg"
            >
              Log Out
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Registered Teachers Section */}
          <div className="space-y-4 lg:col-span-1">
            <h2 className="text-xl font-semibold text-emerald-400">Registered Teachers</h2>
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden h-[600px] overflow-y-auto">
              {loadingData ? (
                <div className="p-8 text-center text-slate-400">Loading teachers...</div>
              ) : teachersList.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No teachers found.</div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {teachersList.map((t) => (
                    <div key={t.id} className="p-4 hover:bg-slate-700/30 transition-colors">
                      <p className="font-medium text-white">{t.Name}</p>
                      <p className="text-sm text-slate-400">Dept/Subjects: {t.Department}</p>
                      <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${t.Status === 'In' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                        Currently {t.Status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Raw Logs Section */}
          <div className="space-y-4 lg:col-span-1">
            <h2 className="text-xl font-semibold text-emerald-400">Recent Logs</h2>
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden h-[600px] overflow-y-auto">
              {loadingData ? (
                <div className="p-8 text-center text-slate-400">Loading logs...</div>
              ) : rawLogsList.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No logs recorded yet.</div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {rawLogsList.map((log) => (
                    <div key={log.id} className="p-4 hover:bg-slate-700/30 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-white">{log.TeacherName}</p>
                          <p className="text-sm text-slate-400">{log.Timestamp}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${log.Action === 'Sign-In' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {log.Action}
                        </span>
                      </div>
                      {log.LatenessReason && (
                        <div className="mt-2 bg-slate-900/50 border border-amber-500/20 rounded-lg p-3">
                          <p className="text-xs text-amber-500 font-semibold mb-1">Lateness Reason</p>
                          <p className="text-sm text-slate-300">{log.LatenessReason}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* AI Report Section */}
          <div className="space-y-4 lg:col-span-1">
            <h2 className="text-xl font-semibold text-emerald-400">AI Insights</h2>
            {summary ? (
              <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 p-6 rounded-2xl shadow-xl h-[600px] overflow-y-auto">
                <div className="prose prose-invert max-w-none text-slate-300 text-sm">
                  {summary.split('\n').map((line, idx) => (
                    <p key={idx} className="mb-2 leading-relaxed">{line}</p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 p-8 rounded-2xl shadow-xl h-[600px] flex items-center justify-center text-slate-500">
                <p className="text-center px-4">Click "Generate AI Report" to compile a summary from the recent logs.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
