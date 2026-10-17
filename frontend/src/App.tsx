import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { HomeView } from './components/home/HomeView';
import { WorkspaceView } from './components/workspace/WorkspaceView';
import { AuthPage } from './components/auth/AuthPage';
import { SettingsModal } from './components/settings/SettingsModal';
import { Compass } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { currentUser, isAuthChecking, setCurrentUser, activeSession } = useApp();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  if (isAuthChecking) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#FAF7F2] text-[#8E1735] font-serif">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-9 h-9 rounded-2xl bg-[#FBE3E8] border border-[#8E1735]/20 flex items-center justify-center text-[#8E1735] shadow-xs">
            <Compass className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <span className="text-xs font-mono uppercase tracking-widest text-[#4A1525]/60">
            Connecting to DeepDive...
          </span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthPage onAuthenticated={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#FAF7F2] font-sans text-[#4A1525] selection:bg-[#F6C8D2] selection:text-[#4A1525]">
      {/* Left Sidebar with DeepDive logo, New Analysis, History, Settings & Logout */}
      <Sidebar onOpenSettings={() => setIsSettingsOpen(true)} />

      {/* Main Content Workspace: either Home input or Active result */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {activeSession ? <WorkspaceView /> : <HomeView />}
      </div>

      {/* Minimal Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

export default App;
