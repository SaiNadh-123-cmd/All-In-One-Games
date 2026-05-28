import React, { useEffect, useState } from 'react';

// Type definitions for the game schema
interface Game {
  id: string;
  name: string;
  description: string;
  genre: string;
  play_url: string;
  github_url: string;
  embed_type: string;
  thumbnail: string;
}

const AdSenseWidget = () => {
  useEffect(() => {
    try {
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      (window as any).adsbygoogle.push({});
    } catch (e) {
      console.error("AdSense error", e);
    }
  }, []);

  return (
    <ins className="adsbygoogle"
         style={{ display: 'block' }}
         data-ad-client="ca-pub-5224273312267357"
         data-ad-slot="9181079962"
         data-ad-format="auto"
         data-full-width-responsive="true"></ins>
  );
};

const App = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [activeTab, setActiveTab] = useState<'library' | 'discover'>('library');
  const [activeGame, setActiveGame] = useState<Game | null>(null);

  useEffect(() => {
    // Load library on mount
    const loadData = async () => {
      try {
        const res = await fetch('/games-database.json');
        const data = await res.json();
        setGames(data);
      } catch (e) {
        console.error('Failed to load games db', e);
      }
    };
    loadData();
  }, []);

  const renderGameCard = (game: Game) => {
    return (
      <div key={game.id} className="bg-card rounded-lg overflow-hidden border border-slate-700/50 hover:border-primary/50 transition flex flex-col">
        <div className="h-40 relative bg-slate-800">
          <img 
            src={game.thumbnail} 
            alt={game.name} 
            className="w-full h-full object-cover opacity-80 hover:opacity-100 transition"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200.png?text=No+Image';
            }}
          />
          <span className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {game.genre}
          </span>
        </div>
        <div className="p-4 flex flex-col flex-1 gap-2">
          <h3 className="font-semibold text-lg">{game.name}</h3>
          <p className="text-sm text-slate-400 line-clamp-2 mb-2">{game.description}</p>
          <div className="mt-auto flex gap-2">
            <button 
              onClick={() => setActiveGame(game)}
              className="bg-primary hover:bg-blue-600 px-4 py-2 rounded text-white font-medium flex-1 transition text-sm">
              ▶ Play Now
            </button>
            <a 
              href={game.github_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded text-white font-medium transition text-sm flex items-center justify-center">
              Source
            </a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-slate-700/50 p-4 flex flex-col gap-4 z-10 hidden md:flex">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-lg shadow-lg" />
          <h1 className="text-xl font-bold text-primary">WebGames Portal</h1>
        </div>
        <nav className="flex flex-col gap-2 flex-1">
          <button 
            onClick={() => setActiveTab('library')}
            className={`text-left px-4 py-2 rounded transition ${activeTab === 'library' ? 'bg-slate-800' : 'hover:bg-slate-700'}`}>
            Games Library
          </button>
          <button 
            onClick={() => setActiveTab('discover')}
            className={`text-left px-4 py-2 rounded transition ${activeTab === 'discover' ? 'bg-slate-800' : 'hover:bg-slate-700'}`}>
            Discover
          </button>
        </nav>
        
        {/* Ad Space in Sidebar */}
        <div className="mt-auto bg-slate-800/50 border border-slate-700/50 rounded p-2 text-center w-full min-h-[250px]">
          <AdSenseWidget />
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto flex flex-col relative">
        {activeTab === 'library' && (
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-6">Play Instantly</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {games.map(g => renderGameCard(g))}
            </div>
          </div>
        )}

        {activeTab === 'discover' && (
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-6">Discover</h2>
            <p className="text-slate-400">More HTML5 games coming soon!</p>
          </div>
        )}

        {/* Ad Space in Bottom Area */}
        <div className="mt-8 bg-slate-800/50 border border-slate-700/50 rounded p-2 text-center shrink-0 w-full min-h-[100px]">
          <AdSenseWidget />
        </div>
      </div>

      {/* Game Player Modal */}
      {activeGame && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Top Bar */}
          <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setActiveGame(null)}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 rounded transition font-medium flex items-center gap-2">
                <span>←</span> Exit Game
              </button>
              <h2 className="text-lg font-semibold text-white hidden sm:block">
                Playing: {activeGame.name}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <a 
                href={activeGame.github_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-white transition text-sm">
                View Source on GitHub
              </a>
            </div>
          </div>
          
          {/* Iframe Container */}
          <div className="flex-1 w-full bg-black">
            <iframe 
              src={activeGame.play_url} 
              title={activeGame.name}
              className="w-full h-full border-none"
              allow="fullscreen; autoplay; keyboard"
              sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
