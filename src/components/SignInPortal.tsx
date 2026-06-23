import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, addDoc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';

interface Teacher {
  id: string;
  Name: string;
  Department: string;
  Status: 'In' | 'Out';
}

export function SignInPortal() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [latenessReason, setLatenessReason] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Registration State
  const [isRegistering, setIsRegistering] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherSubject, setNewTeacherSubject] = useState('');

  // Digital clock update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch teachers
  const fetchTeachers = async () => {
    try {
      const q = query(collection(db, 'Teachers'), orderBy('Name'));
      const snapshot = await getDocs(q);
      const loaded: Teacher[] = [];
      snapshot.forEach((doc) => {
        loaded.push({ id: doc.id, ...doc.data() } as Teacher);
      });
      
      // Seed if empty
      if (loaded.length === 0) {
        const initialTeachers = [
          { Name: 'Alice Johnson', Department: 'Science', Status: 'Out' as const },
          { Name: 'Bob Smith', Department: 'Math', Status: 'Out' as const },
          { Name: 'Carol Williams', Department: 'History', Status: 'Out' as const }
        ];
        for (const t of initialTeachers) {
          const added = await addDoc(collection(db, 'Teachers'), t);
          loaded.push({ id: added.id, ...t });
        }
      }
      setTeachers(loaded);
    } catch (err) {
      console.error("Error fetching teachers", err);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRegisterTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim() || !newTeacherSubject.trim()) return;

    try {
      const newTeacher = {
        Name: newTeacherName.trim(),
        Department: newTeacherSubject.trim(),
        Status: 'Out' as const
      };
      
      await addDoc(collection(db, 'Teachers'), newTeacher);
      showToast("Teacher registered successfully!");
      setNewTeacherName('');
      setNewTeacherSubject('');
      setIsRegistering(false);
      fetchTeachers(); // Refresh list
    } catch (err) {
      console.error("Error registering teacher", err);
      showToast("Error registering. Please try again.");
    }
  };

  const handleSignInOut = async (action: 'Sign-In' | 'Sign-Out') => {
    if (!selectedTeacherId) return;

    try {
      const teacherRef = doc(db, 'Teachers', selectedTeacherId);
      
      // Update Teachers collection
      const newStatus = action === 'Sign-In' ? 'In' : 'Out';
      await updateDoc(teacherRef, { Status: newStatus });

      // Build the AttendanceLog
      const logData: any = {
        TeacherID: selectedTeacherId,
        Action: action,
        Timestamp: serverTimestamp()
      };

      if (action === 'Sign-In' && isPast8AM && latenessReason.trim()) {
        logData.LatenessReason = latenessReason.trim();
      }

      await addDoc(collection(db, 'AttendanceLogs'), logData);

      // Update local state
      setTeachers(prev => prev.map(t => t.id === selectedTeacherId ? { ...t, Status: newStatus } : t));
      
      showToast(`Successfully ${action === 'Sign-In' ? 'signed in' : 'signed out'}!`);
      
      // Reset form
      setSelectedTeacherId('');
      setLatenessReason('');
    } catch (err) {
      console.error("Error logging attendance", err);
      showToast("Error processing request. Please try again.");
    }
  };

  const isPast8AM = currentTime.getHours() >= 8;
  const showReasonInput = selectedTeacherId && isPast8AM;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-full flex items-center space-x-2 shadow-lg animate-in fade-in slide-in-from-top-4 z-50">
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="w-full max-w-xl flex flex-col items-center space-y-12 mt-16">
        
        {/* Live Clock */}
        <div className="flex flex-col items-center space-y-2">
          <div className="text-6xl md:text-8xl font-light tracking-tighter text-emerald-400 font-mono drop-shadow-sm">
            {format(currentTime, 'HH:mm')}
          </div>
          <div className="text-slate-400 text-lg md:text-xl font-medium tracking-wide">
            {format(currentTime, 'EEEE, MMMM do, yyyy')}
          </div>
        </div>

        {/* Action Card */}
        <div className="w-full bg-slate-800/50 backdrop-blur-md rounded-3xl p-8 md:p-10 shadow-2xl border border-slate-700/50 relative overflow-hidden">
          
          {/* Toggle Button */}
          <div className="absolute top-4 right-6">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              {isRegistering ? "Back to Sign In" : "Register New Teacher"}
            </button>
          </div>

          {isRegistering ? (
            <form onSubmit={handleRegisterTeacher} className="space-y-6 pt-6">
              <h2 className="text-2xl font-bold text-white mb-6">Register Details</h2>
              <div className="space-y-3">
                <label className="text-sm font-semibold tracking-wider text-slate-400 uppercase ml-1">Full Name</label>
                <input 
                  type="text"
                  placeholder="E.g., Jane Doe"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  className="w-full bg-slate-900 border-2 border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold tracking-wider text-slate-400 uppercase ml-1">Subjects / Department</label>
                <input 
                  type="text"
                  placeholder="E.g., Mathematics & Physics"
                  value={newTeacherSubject}
                  onChange={(e) => setNewTeacherSubject(e.target.value)}
                  className="w-full bg-slate-900 border-2 border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={!newTeacherName.trim() || !newTeacherSubject.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/30 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg active:scale-[0.98] mt-4"
              >
                Save Details
              </button>
            </form>
          ) : (
            <div className="space-y-8 pt-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold tracking-wider text-slate-400 uppercase ml-1">
                  Select Identity
                </label>
                <select 
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full bg-slate-900 border-2 border-slate-700 text-white text-lg rounded-2xl px-6 py-4 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer appearance-none"
                >
                  <option value="" disabled>Search or select your name...</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.Name} ({t.Department}) - Currently: {t.Status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Conditional Lateness Input */}
              <div className={`transition-all duration-500 overflow-hidden ${showReasonInput ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="space-y-3">
                  <label className="text-sm font-semibold tracking-wider text-amber-500/80 uppercase ml-1 flex items-center gap-2">
                    Past 8:00 AM — Reason for lateness
                  </label>
                  <input 
                    type="text"
                    placeholder="E.g., Traffic, Doctor's appointment..."
                    value={latenessReason}
                    onChange={(e) => setLatenessReason(e.target.value)}
                    className="w-full bg-slate-900 border-2 border-amber-500/30 text-white rounded-xl px-6 py-4 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <button 
                  onClick={() => handleSignInOut('Sign-In')}
                  disabled={!selectedTeacherId || (showReasonInput && !latenessReason.trim())}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/30 disabled:text-white/30 text-white py-6 rounded-2xl font-bold text-xl md:text-2xl transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98]"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => handleSignInOut('Sign-Out')}
                  disabled={!selectedTeacherId}
                  className="bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/30 disabled:text-white/30 text-slate-900 py-6 rounded-2xl font-bold text-xl md:text-2xl transition-all shadow-lg shadow-amber-900/20 active:scale-[0.98]"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
