/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SignInPortal } from './components/SignInPortal';
import { AdminDashboard } from './components/AdminDashboard';
// import { Columns, LayoutDashboard } from 'lucide-react';

class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-white bg-slate-900 border border-red-500 min-h-screen">
          <h1 className="text-xl font-bold text-red-500">App Error</h1>
          <pre className="text-red-400 whitespace-pre-wrap">{this.state.error?.toString()}</pre>
          <pre className="text-slate-400 text-xs mt-4">{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'portal' | 'admin'>('portal');

  return (
    <ErrorBoundary>
      <div className="bg-slate-900 min-h-screen">
        <div className="fixed top-4 left-4 z-50 flex bg-slate-800/80 backdrop-blur rounded-full p-1 border border-slate-700/50 shadow-xl shadow-black/20">
          <button 
            onClick={() => setActiveTab('portal')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all ${activeTab === 'portal' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <span className="text-sm font-medium">Portal</span>
          </button>
          <button 
            onClick={() => setActiveTab('admin')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all ${activeTab === 'admin' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <span className="text-sm font-medium">Admin</span>
          </button>
        </div>
        
        {activeTab === 'portal' ? <SignInPortal /> : <AdminDashboard />}
      </div>
    </ErrorBoundary>
  );
}

