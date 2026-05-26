import React, { useEffect, useState } from 'react';
import dbGames from '../../game-db.json';

// Type definitions for the electron window api
declare global {
  interface Window {
    electronAPI: any;
  }
}

interface LocalGameStatus {
  status: 'cloned' | 'built';
  destFolder: string;
}

const App = () => {
  const [games, setGames] = useState<any[]>([]);
  const [installPath, setInstallPath] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'library' | 'discover' | 'downloads' | 'settings'>('library');
  const [logs, setLogs] = useState<Record<string, string[]>>({});
  const [localGames, setLocalGames] = useState<Record<string, LocalGameStatus>>({});
  const [buildConfirmation, setBuildConfirmation] = useState<{ game: any; destFolder: string } | null>(null);

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
      
      // Load local games from localStorage
      const saved = localStorage.getItem('localGames');
      if (saved) {
        try {
          setLocalGames(JSON.parse(saved));
        } catch(e) {}
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

  const saveLocalGames = (newLocalGames: Record<string, LocalGameStatus>) => {
    setLocalGames(newLocalGames);
    localStorage.setItem('localGames', JSON.stringify(newLocalGames));
  };

  const handleCloneGame = async (game: any) => {
    if (!window.electronAPI) {
      window.open(game.github_url || game.repoUrl, '_blank');
      return;
    }
    
    // Use the template if available, else fallback
    let destFolder = "";
    if (game.local_path_template) {
      destFolder = game.local_path_template.replace('~', installPath.split('\\')[0] + '\\Users\\' + installPath.split('\\')[2]).replace('{game_folder}', game.id);
      // In a real robust app, we'd expand ~ properly. For now we just use installPath.
      destFolder = `${installPath}\\${game.id}`;
    } else {
      destFolder = `${installPath}\\${game.id}`;
    }
    
    // Clear previous logs
    setLogs(prev => ({ ...prev, [destFolder]: [] }));

    // Clone
    const cloneCmd = game.clone_command || `git clone --depth 1 ${game.github_url || game.repoUrl} "${destFolder}"`;
    const success = await window.electronAPI.cloneGame(cloneCmd, destFolder);
    
    if (success) {
      const updated = { ...localGames, [game.id]: { status: 'cloned' as const, destFolder } };
      saveLocalGames(updated);
      
      const buildCmd = game.build_command || game.buildInstructions?.windows || game.buildInstructions?.all;
      if (buildCmd && buildCmd.trim() !== '') {
        setBuildConfirmation({ game, destFolder });
      } else {
        // No build required, mark as built
        saveLocalGames({ ...updated, [game.id]: { status: 'built' as const, destFolder } });
      }
    } else {
      alert("Clone failed. Check logs.");
    }
  };

  const confirmBuild = async () => {
    if (!buildConfirmation) return;
    const { game, destFolder } = buildConfirmation;
    setBuildConfirmation(null);

    const buildCmd = game.build_command || game.buildInstructions?.windows || game.buildInstructions?.all;
    if (buildCmd) {
      const success = await window.electronAPI.buildGame(game.id, buildCmd, destFolder);
      if (success) {
        saveLocalGames({ ...localGames, [game.id]: { status: 'built' as const, destFolder } });
      } else {
        alert("Build failed. Check logs.");
      }
    }
  };

  const cancelBuild = () => {
    setBuildConfirmation(null);
  };

  const handlePlayGame = async (game: any) => {
    if (!window.electronAPI) {
      window.open(game.github_url || game.repoUrl, '_blank');
      return;
    }
    const local = localGames[game.id];
    const destFolder = local ? local.destFolder : `${installPath}\\${game.id}`;
    const launchCmd = game.run_command || (typeof game.launchCommand === 'string' ? game.launchCommand : game.launchCommand?.windows);
    
    if (launchCmd) {
      // Normalize slashes for Windows
      const execPath = `${destFolder}\\${launchCmd}`.replace(/\\/g, '/');
      await window.electronAPI.launchGame(game.type, execPath, destFolder);
    } else {
      alert("No launch command found.");
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

  const renderGameCard = (game: any, isDownloadsTab: boolean = false) => {
    const local = localGames[game.id];
    const logKey = local?.destFolder || game.id;
    const hasLogs = logs[logKey]?.length > 0;

    return (
      <div key={game.id} className="bg-card rounded-lg overflow-hidden border border-slate-700/50 hover:border-primary/50 transition flex flex-col">
        <div className="h-40 bg-slate-800 relative flex items-center justify-center">
          <span className="text-slate-500 font-medium">{game.genre}</span>
        </div>
        <div className="p-4 flex flex-col flex-1 gap-2">
          <h3 className="font-semibold text-lg">{game.name}</h3>
          <p className="text-sm text-slate-400 line-clamp-2 mb-2">{game.description}</p>
          <div className="mt-auto flex gap-2">
            {!local && (
              <button 
                onClick={() => handleCloneGame(game)}
                className="bg-slate-700 hover:bg-slate-600 px-4 py-1.5 rounded text-white font-medium flex-1 transition text-sm">
                Clone & Setup Locally
              </button>
            )}
            {local?.status === 'cloned' && (
              <button 
                onClick={() => setBuildConfirmation({ game, destFolder: local.destFolder })}
                className="bg-accent hover:bg-rose-600 px-4 py-1.5 rounded text-white font-medium flex-1 transition text-sm">
                Resume Build
              </button>
            )}
            {(local?.status === 'built' || (game.type === 'html5' && !game.build_command)) && (
              <button 
                onClick={() => handlePlayGame(game)}
                className="bg-primary hover:bg-blue-600 px-4 py-1.5 rounded text-white font-medium flex-1 transition text-sm">
                Launch Game
              </button>
            )}
          </div>
          {/* Terminal progress view */}
          {hasLogs && (
            <div className="mt-2 text-xs text-green-400 bg-black p-2 rounded h-24 overflow-y-auto font-mono border border-slate-800 flex flex-col justify-end">
              {(logs[logKey] || []).slice(-10).map((l, i) => <div key={'log'+i}>{l}</div>)}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full w-full">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-slate-700/50 p-4 flex flex-col gap-4 z-10">
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
            onClick={() => setActiveTab('downloads')}
            className={`text-left px-4 py-2 rounded transition ${activeTab === 'downloads' ? 'bg-slate-800' : 'hover:bg-slate-700'} flex justify-between items-center`}>
            Downloads
            {Object.keys(localGames).length > 0 && (
              <span className="bg-primary text-xs px-2 py-0.5 rounded-full">{Object.keys(localGames).length}</span>
            )}
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
      <div className="flex-1 p-8 overflow-y-auto flex flex-col relative">
        {activeTab === 'library' && (
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-6">Your Library</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {games.map(g => renderGameCard(g))}
            </div>
          </div>
        )}

        {activeTab === 'downloads' && (
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-6">Downloaded Games</h2>
            {Object.keys(localGames).length === 0 ? (
              <p className="text-slate-400">You haven't downloaded any games yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {games.filter(g => localGames[g.id]).map(g => renderGameCard(g, true))}
              </div>
            )}
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

        {/* Build Confirmation Modal */}
        {buildConfirmation && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card border border-slate-700 rounded-lg p-6 max-w-lg w-full shadow-2xl">
              <h3 className="text-xl font-bold mb-2">Confirm Build</h3>
              <p className="text-slate-300 mb-4">
                The repository for <strong>{buildConfirmation.game.name}</strong> has been cloned successfully. 
                The next step is to build the game using the following command:
              </p>
              <div className="bg-black p-3 rounded text-green-400 font-mono text-sm mb-6 border border-slate-800">
                $ {buildConfirmation.game.build_command || buildConfirmation.game.buildInstructions?.windows || buildConfirmation.game.buildInstructions?.all}
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={cancelBuild}
                  className="px-4 py-2 rounded hover:bg-slate-800 transition text-slate-300">
                  Cancel
                </button>
                <button 
                  onClick={confirmBuild}
                  className="bg-primary hover:bg-blue-600 px-4 py-2 rounded text-white font-medium transition">
                  Execute Build
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
