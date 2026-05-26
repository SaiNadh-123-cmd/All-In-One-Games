import React, { useEffect, useState } from 'react';

import dbGames from '../../game-db.json';

// Type definitions for the electron window api
declare global {
  interface Window {
    electronAPI: any;
  }
}

const App = () => {
  const [games, setGames] = useState<any[]>([]);
  const [installPath, setInstallPath] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'library' | 'discover' | 'settings'>('library');
  const [logs, setLogs] = useState<Record<string, string[]>>({});

  useEffect(() => {
    // Load library and settings on mount
    const loadData = async () => {
      if (window.electronAPI) {
        const desktopGames = await window.electronAPI.readLibrary();
        setGames(desktopGames);
        const path = await window.electronAPI.getInstallPath();
        setInstallPath(path);
      } else {
        // Fallback for web browser
        setGames(dbGames);
      }
    };
    loadData();

    if (window.electronAPI) {
      // Listen to clone progress
      window.electronAPI.onCloneProgress((event: any, data: any) => {
        setLogs(prev => ({
          ...prev,
          [data.url]: [...(prev[data.url] || []), data.message]
        }));
      });

      // Listen to build output
      window.electronAPI.onBuildOutput((event: any, data: any) => {
        setLogs(prev => ({
          ...prev,
          [data.gameId]: [...(prev[data.gameId] || []), data.message]
        }));
      });

      return () => {
        window.electronAPI.removeAllListeners('clone-progress');
        window.electronAPI.removeAllListeners('build-output');
      };
    }
  }, []);

  const handleInstallGame = async (game: any) => {
    if (!window.electronAPI) {
      window.open(game.repoUrl, '_blank');
      return;
    }
    const destFolder = `${installPath}\\${game.id}`;
    
    // Clone
    await window.electronAPI.cloneGame(game.repoUrl, destFolder);
    
    // Build if instructions exist for this OS
    // Naively assume windows for now based on context
    const buildCmd = game.buildInstructions?.windows || game.buildInstructions?.all;
    if (buildCmd) {
      await window.electronAPI.buildGame(game.id, buildCmd, destFolder);
    }
  };

  const handlePlayGame = async (game: any) => {
    if (!window.electronAPI) {
      window.open(game.repoUrl, '_blank');
      return;
    }
    const destFolder = `${installPath}\\${game.id}`;
    const launchCmd = typeof game.launchCommand === 'string' ? game.launchCommand : game.launchCommand?.windows;
    
    if (launchCmd) {
      const execPath = `${destFolder}\\${launchCmd}`;
      await window.electronAPI.launchGame(game.type, execPath, destFolder);
    } else {
      alert("No launch command found for Windows.");
    }
  };

  const handleSelectInstallPath = async () => {
    if (!window.electronAPI) return;
    const newPath = await window.electronAPI.selectDirectory();
    if (newPath) {
      await window.electronAPI.setInstallPath(newPath);
      setInstallPath(newPath);
    }
  };

  return (
    <div className="flex h-full w-full">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-slate-700/50 p-4 flex flex-col gap-4">
        <h1 className="text-xl font-bold text-primary">OpenGames Hub</h1>
        <nav className="flex flex-col gap-2 flex-1">
          <button 
            onClick={() => setActiveTab('library')}
            className={`text-left px-4 py-2 rounded transition ${activeTab === 'library' ? 'bg-slate-800' : 'hover:bg-slate-700'}`}>
            Library
          </button>
          <button 
            onClick={() => setActiveTab('discover')}
            className={`text-left px-4 py-2 rounded transition ${activeTab === 'discover' ? 'bg-slate-800' : 'hover:bg-slate-700'}`}>
            Discover
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`text-left px-4 py-2 rounded transition ${activeTab === 'settings' ? 'bg-slate-800' : 'hover:bg-slate-700'}`}>
            Settings
          </button>
        </nav>
        
        {/* Ad Placeholder Space in Sidebar */}
        <div className="mt-auto bg-slate-800/50 border border-slate-700/50 h-64 rounded flex items-center justify-center p-4 text-center">
          <span className="text-sm text-slate-500 font-semibold uppercase tracking-wider">Advertisement Space</span>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto flex flex-col">
        {activeTab === 'library' && (
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-6">Your Library</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {games.map(game => (
                <div key={game.id} className="bg-card rounded-lg overflow-hidden border border-slate-700/50 hover:border-primary/50 transition flex flex-col">
                  <div className="h-40 bg-slate-800 relative flex items-center justify-center">
                    <span className="text-slate-500 font-medium">{game.genre}</span>
                  </div>
                  <div className="p-4 flex flex-col flex-1 gap-2">
                    <h3 className="font-semibold text-lg">{game.name}</h3>
                    <p className="text-sm text-slate-400 line-clamp-2 mb-2">{game.description}</p>
                    <div className="mt-auto flex gap-2">
                      <button 
                        onClick={() => handleInstallGame(game)}
                        className="bg-slate-700 hover:bg-slate-600 px-4 py-1.5 rounded text-white font-medium flex-1 transition">
                        Install
                      </button>
                      <button 
                        onClick={() => handlePlayGame(game)}
                        className="bg-primary hover:bg-blue-600 px-4 py-1.5 rounded text-white font-medium flex-1 transition">
                        Play
                      </button>
                    </div>
                    {/* Tiny log preview if something is running */}
                    {(logs[game.repoUrl]?.length > 0 || logs[game.id]?.length > 0) && (
                      <div className="mt-2 text-xs text-slate-500 bg-slate-900 p-2 rounded h-16 overflow-y-auto font-mono">
                        {(logs[game.repoUrl] || []).slice(-3).map((l, i) => <div key={'c'+i}>{l}</div>)}
                        {(logs[game.id] || []).slice(-3).map((l, i) => <div key={'b'+i}>{l}</div>)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'discover' && (
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-6">Discover New Games</h2>
            <p className="text-slate-400">Integration with GitHub APIs and community lists coming soon.</p>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-6">Settings</h2>
            
            <div className="bg-card p-6 rounded-lg border border-slate-700/50">
              <h3 className="text-lg font-semibold mb-4">Storage</h3>
              <div className="flex flex-col gap-2">
                <label className="text-sm text-slate-400">Game Install Directory</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={installPath}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300"
                  />
                  <button 
                    onClick={handleSelectInstallPath}
                    className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded text-sm transition">
                    Change...
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ad Placeholder Space in Bottom Area */}
        <div className="mt-8 bg-slate-800/50 border border-slate-700/50 h-24 rounded flex items-center justify-center p-4 text-center">
          <span className="text-sm text-slate-500 font-semibold uppercase tracking-wider">Bottom Advertisement Space</span>
        </div>
      </div>
    </div>
  );
};

export default App;
