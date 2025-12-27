
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Upload, 
  Music, Heart, Plus, Loader2, Wand2, X, Disc, 
  ListMusic, Volume2, Trash2, Home, Search, Library,
  Sparkles, ChevronRight, LogOut, Cloud
} from 'lucide-react';
import { Track, AppView } from './types';
import { analyzeTrackVibe } from './services/gemini';
import { GoogleDriveService } from './services/googleDrive';
import Visualizer from './components/Visualizer';

// --- Internal Components ---

// 1. Auth Overlay
const AuthOverlay: React.FC<{ onAuth: () => void }> = ({ onAuth }) => {
    const [loading, setLoading] = useState(false);

    const handleConnect = async () => {
        setLoading(true);
        try {
            await GoogleDriveService.requestAccess();
            onAuth();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_50%,#4f46e5,transparent_70%)]" />
            
            <div className="relative z-10 space-y-8 max-w-sm">
                <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center mx-auto shadow-2xl shadow-purple-900/40">
                    <Cloud size={48} className="text-white" />
                </div>
                
                <div className="space-y-3">
                    <h1 className="text-4xl font-bold tracking-tight">Cloud Sync</h1>
                    <p className="text-slate-400 leading-relaxed">
                        Connect your Google Drive to store your music library and access it from any device.
                    </p>
                </div>

                <button 
                    onClick={handleConnect}
                    disabled={loading}
                    className="w-full bg-white text-slate-950 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <img src="https://www.google.com/favicon.ico" className="w-5 h-5" />}
                    Continue with Google
                </button>
                
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    Encrypted • Secure • Private
                </p>
            </div>
        </div>
    );
};

// 2. Upload Modal
interface UploadModalProps {
  onClose: () => void;
  onUploadComplete: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ onClose, onUploadComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      const nameParts = selectedFile.name.replace(/\.[^/.]+$/, "").split('-');
      if (nameParts.length > 1) {
        setArtist(nameParts[0].trim());
        setTitle(nameParts.slice(1).join('-').trim());
      } else {
        setTitle(nameParts[0].trim());
        setArtist('Unknown Artist');
      }
    }
  };

  const handleSave = async () => {
    if (!file || !title) return;
    setIsSaving(true);

    let vibe = { mood: '', color: '#a855f7', description: '' };

    if (process.env.API_KEY) {
        setIsAnalyzing(true);
        vibe = await analyzeTrackVibe(title, artist);
        setIsAnalyzing(false);
    }

    const metadata = {
      title,
      artist,
      fileName: file.name,
      mood: vibe.mood,
      themeColor: vibe.color,
      description: vibe.description
    };

    try {
        await GoogleDriveService.uploadTrack(file, metadata);
        onUploadComplete();
    } catch (e) {
        console.error("Upload failed", e);
        alert("Upload failed. Please check your connection.");
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X size={20} />
        </button>
        
        <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
          <Upload className="text-purple-500" /> Upload to Drive
        </h2>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-600 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer relative group">
            <input 
              type="file" 
              accept="audio/*"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
            />
            {file ? (
              <div className="text-center">
                <Music size={32} className="mx-auto mb-2 text-purple-400" />
                <p className="text-sm font-medium text-purple-200 truncate max-w-[200px]">{file.name}</p>
              </div>
            ) : (
              <div className="text-center text-slate-400 group-hover:text-purple-300 transition-colors">
                <Plus size={32} className="mx-auto mb-2" />
                <p className="text-sm">Tap to select song</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500"
              placeholder="Song Title"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Artist</label>
            <input 
              type="text" 
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500"
              placeholder="Artist Name"
            />
          </div>

          <button 
            onClick={handleSave}
            disabled={!file || isSaving || isAnalyzing}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 mt-4 active:scale-95 transition-all"
          >
            {isSaving || isAnalyzing ? (
              <><Loader2 className="animate-spin" /> Uploading to Drive...</>
            ) : (
              <>Cloud Upload</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- View components ---

// Home View
const HomeView: React.FC<{ tracks: any[], onPlay: (t: any) => void, onTabChange: (v: AppView) => void }> = ({ tracks, onPlay, onTabChange }) => {
    const greeting = (() => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    })();

    const recentTracks = tracks.slice(0, 6);
    const moods = Array.from(new Set(tracks.map(t => t.mood).filter(Boolean)));

    return (
        <div className="p-6 space-y-8 animate-fade-in pb-32">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                    {greeting}
                </h1>
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shadow-lg cursor-pointer" onClick={() => { GoogleDriveService.logout(); window.location.reload(); }}>
                    <LogOut size={18} className="text-slate-400" />
                </div>
            </div>

            {tracks.length === 0 && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
                    <Cloud className="mx-auto text-indigo-400 opacity-50" size={48} />
                    <h3 className="text-xl font-bold text-white">Your Cloud is Empty</h3>
                    <p className="text-slate-400 text-sm">Upload music to your Google Drive to start streaming.</p>
                </div>
            )}

            {recentTracks.length > 0 && (
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Recently Synced</h2>
                        <button onClick={() => onTabChange(AppView.LIBRARY)} className="text-xs text-indigo-400 font-bold flex items-center">
                            LIBRARY <ChevronRight size={14} />
                        </button>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 no-scrollbar snap-x">
                        {recentTracks.map(t => (
                            <div key={t.id} onClick={() => onPlay(t)} className="flex-shrink-0 w-40 group cursor-pointer snap-start">
                                <div 
                                    className="w-40 h-40 rounded-3xl mb-3 shadow-2xl relative overflow-hidden transition-all group-hover:scale-95 group-active:scale-90"
                                    style={{background: t.themeColor || '#1e293b'}}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[1px]">
                                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl">
                                            <Play size={24} className="text-black ml-1" fill="black" />
                                        </div>
                                    </div>
                                    <Cloud size={16} className="absolute top-4 right-4 text-white/40" />
                                </div>
                                <h3 className="font-bold text-white truncate text-sm px-1">{t.title}</h3>
                                <p className="text-xs text-slate-500 truncate px-1">{t.artist}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {moods.length > 0 && (
                <section>
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Select Your Vibe</h2>
                    <div className="flex flex-wrap gap-2">
                        {moods.map((m: any, i) => (
                            <button 
                                key={i}
                                onClick={() => {
                                    const match = tracks.find(t => t.mood === m);
                                    if(match) onPlay(match);
                                }} 
                                className="px-5 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-sm font-bold text-slate-300 hover:text-white hover:border-indigo-500 transition-all active:scale-95 flex items-center gap-2"
                            >
                                <Sparkles size={14} className="text-indigo-400" />
                                {m}
                            </button>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

// Search View
const SearchView: React.FC<{ tracks: any[], onPlay: (t: any) => void, onDelete: (e: React.MouseEvent, id: string) => void }> = ({ tracks, onPlay, onDelete }) => {
  const [query, setQuery] = useState('');
  const filteredTracks = tracks.filter(t => 
    t.title.toLowerCase().includes(query.toLowerCase()) || 
    t.artist.toLowerCase().includes(query.toLowerCase()) ||
    t.mood?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in pb-32">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
        <input 
          type="text" 
          placeholder="Search by title, artist, or mood..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500 transition-all shadow-xl"
        />
      </div>

      <div className="space-y-2">
        {filteredTracks.map(t => (
          <div 
            key={t.id} 
            onClick={() => onPlay(t)}
            className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-900 transition-all cursor-pointer border border-transparent hover:border-white/5"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center relative overflow-hidden flex-shrink-0" style={{background: t.themeColor || '#1e293b'}}>
                <div className="absolute inset-0 bg-black/20" />
                <Music size={18} className="relative z-10" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm truncate">{t.title}</h4>
              <p className="text-xs text-slate-500 truncate">{t.artist}</p>
            </div>
            <button 
                onClick={(e) => onDelete(e, t.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-400 transition-all"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        {query && filteredTracks.length === 0 && (
          <div className="py-20 text-center text-slate-500">
            <Search size={48} className="mx-auto mb-4 opacity-20" />
            <p>No matches for "{query}"</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Library View
const LibraryView: React.FC<{ 
    tracks: any[], 
    currentTrackId: string | null, 
    isPlaying: boolean, 
    onPlay: (t: any) => void, 
    onDelete: (e: React.MouseEvent, id: string) => void 
}> = ({ tracks, currentTrackId, isPlaying, onPlay, onDelete }) => {
  return (
    <div className="p-6 space-y-6 animate-fade-in pb-32">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Your Library</h1>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">{tracks.length} Tracks</div>
      </div>

      <div className="space-y-1">
        {tracks.map((t, idx) => {
            const isActive = t.id === currentTrackId;
            return (
                <div 
                    key={t.id} 
                    onClick={() => onPlay(t)}
                    className={`group flex items-center gap-4 p-4 rounded-2xl transition-all cursor-pointer ${isActive ? 'bg-indigo-600/10 border border-indigo-500/20' : 'hover:bg-slate-900 border border-transparent'}`}
                >
                    <div className="w-10 text-xs font-bold text-slate-600 group-hover:text-indigo-400 flex items-center justify-center">
                        {isActive && isPlaying ? (
                            <div className="flex items-end gap-0.5 h-3">
                                <div className="w-0.5 bg-indigo-400 animate-pulse" style={{ height: '70%' }} />
                                <div className="w-0.5 bg-indigo-400 animate-pulse" style={{ height: '100%' }} />
                                <div className="w-0.5 bg-indigo-400 animate-pulse" style={{ height: '40%' }} />
                            </div>
                        ) : (
                            (idx + 1).toString().padStart(2, '0')
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className={`font-bold text-sm truncate ${isActive ? 'text-indigo-400' : 'text-white'}`}>{t.title}</h4>
                        <p className="text-xs text-slate-500 truncate">{t.artist}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {t.mood && <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 hidden sm:block">{t.mood}</span>}
                        <button 
                            onClick={(e) => onDelete(e, t.id)}
                            className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-400 transition-all"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            );
        })}

        {tracks.length === 0 && (
            <div className="py-20 text-center text-slate-500 border-2 border-dashed border-slate-900 rounded-3xl">
                <ListMusic size={48} className="mx-auto mb-4 opacity-20" />
                <p>Your library is empty</p>
            </div>
        )}
      </div>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!GoogleDriveService.getAuth());
  const [tracks, setTracks] = useState<any[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<AppView>(AppView.HOME);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(new Audio());
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const syncLibrary = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
        const cloudTracks = await GoogleDriveService.fetchTracks();
        setTracks(cloudTracks);
    } catch (e) {
        console.error("Sync failed", e);
        // If 401, re-auth
        if ((e as any).status === 401) {
            GoogleDriveService.logout();
            setIsAuthenticated(false);
        }
    } finally {
        setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    syncLibrary();
    const audio = audioRef.current;
    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const onEnded = () => {
        if (tracks.length > 0) {
            setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
        }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
    };
  }, [syncLibrary, tracks.length]);

  // Cloud Playback Logic
  useEffect(() => {
    const playTrack = async () => {
      if (currentTrackIndex >= 0 && tracks[currentTrackIndex]) {
        const track = tracks[currentTrackIndex];
        
        if (isPlaying) {
            // Check if we need to download the blob
            if (!audioRef.current.src || audioRef.current.dataset.trackId !== track.id) {
                try {
                    const blob = await GoogleDriveService.getFileBlob(track.driveFileId);
                    const url = URL.createObjectURL(blob);
                    audioRef.current.src = url;
                    audioRef.current.dataset.trackId = track.id;
                } catch (e) {
                    console.error("Fetch failed", e);
                    return;
                }
            }
            try {
                await audioRef.current.play();
            } catch (e) {
                console.error("Playback interrupted", e);
            }
        } else {
            audioRef.current.pause();
        }
      }
    };
    playTrack();
  }, [currentTrackIndex, isPlaying, tracks]);

  const handlePlayTrack = (track: any) => {
    const idx = tracks.findIndex(t => t.id === track.id);
    if (idx !== -1) {
        setCurrentTrackIndex(idx);
        setIsPlaying(true);
    }
  };

  const currentTrack = tracks[currentTrackIndex];
  const themeColor = currentTrack?.themeColor || '#6366f1';

  if (!isAuthenticated) {
      return <AuthOverlay onAuth={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden flex flex-col relative selection:bg-indigo-500/30">
      
      {/* Background Ambience */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none transition-colors duration-1000 z-0"
        style={{ background: `radial-gradient(circle at 50% 30%, ${themeColor}, transparent 60%)` }}
      />
      
      <main className="flex-1 overflow-y-auto z-10 scroll-smooth relative no-scrollbar">
         {activeTab === AppView.HOME && (
             <HomeView tracks={tracks} onPlay={handlePlayTrack} onTabChange={setActiveTab} />
         )}
         {activeTab === AppView.SEARCH && (
             <SearchView tracks={tracks} onPlay={handlePlayTrack} onDelete={async (e, id) => {
                 e.stopPropagation();
                 if(confirm("Delete from Drive?")) {
                     await GoogleDriveService.deleteFile(id);
                     syncLibrary();
                 }
             }} />
         )}
         {activeTab === AppView.LIBRARY && (
             <LibraryView 
                tracks={tracks} 
                currentTrackId={currentTrack?.id || null} 
                isPlaying={isPlaying} 
                onPlay={handlePlayTrack} 
                onDelete={async (e, id) => {
                    e.stopPropagation();
                    if(confirm("Delete from Drive?")) {
                        await GoogleDriveService.deleteFile(id);
                        syncLibrary();
                    }
                }}
             />
         )}
      </main>

      {/* Navigation & Overlays */}
      
      {!isPlayerOpen && currentTrack && (
        <div 
            className="fixed left-4 right-4 bg-slate-900/95 backdrop-blur-2xl border border-white/5 rounded-3xl p-2 pr-5 shadow-2xl z-40 animate-slide-up flex items-center gap-3"
            style={{ bottom: '92px' }}
            onClick={() => setIsPlayerOpen(true)}
        >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden relative shadow-lg">
                <div className="absolute inset-0 opacity-40" style={{backgroundColor: themeColor}} />
                <Music size={20} className="relative z-10 text-white" />
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm truncate text-white">{currentTrack.title}</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{currentTrack.artist}</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }} className="w-10 h-10 rounded-full bg-white text-slate-950 flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>
        </div>
      )}

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-xl border-t border-white/5 pb-safe z-50">
          <div className="flex items-center justify-around p-3">
              {[
                  { id: AppView.HOME, icon: Home, label: 'Home' },
                  { id: AppView.SEARCH, icon: Search, label: 'Search' },
                  { id: 'upload', icon: Upload, label: 'Upload', special: true },
                  { id: AppView.LIBRARY, icon: Library, label: 'Library' },
                  { id: 'refresh', icon: Cloud, label: 'Sync' }
              ].map((tab) => {
                  if (tab.special) return (
                      <button key={tab.id} onClick={() => setShowUpload(true)} className="w-14 h-14 -mt-10 rounded-full bg-indigo-600 text-white shadow-2xl shadow-indigo-500/50 flex items-center justify-center active:scale-90 transition-all border-4 border-slate-950">
                          <Upload size={24} />
                      </button>
                  );
                  if (tab.id === 'refresh') return (
                      <button key={tab.id} onClick={syncLibrary} className={`flex flex-col items-center gap-1 w-16 text-slate-500 hover:text-indigo-400 ${isLoading ? 'animate-pulse' : ''}`}>
                          <Cloud size={22} />
                          <span className="text-[9px] font-bold uppercase tracking-tighter">Sync</span>
                      </button>
                  );
                  const active = activeTab === tab.id;
                  return (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id as AppView)} className={`flex flex-col items-center gap-1 w-16 transition-all ${active ? 'text-indigo-400' : 'text-slate-600 hover:text-slate-400'}`}>
                          <tab.icon size={22} strokeWidth={active ? 2.5 : 2} />
                          <span className="text-[9px] font-bold uppercase tracking-tighter">{tab.label}</span>
                      </button>
                  );
              })}
          </div>
      </div>

      {/* Player & Modals */}
      {isPlayerOpen && currentTrack && (
        <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col animate-slide-up overflow-hidden">
             <div 
                className="absolute inset-0 opacity-10 pointer-events-none transition-colors duration-1000"
                style={{ background: `radial-gradient(circle at 50% 50%, ${themeColor}, transparent 80%)` }}
            />
            <div className="flex items-center justify-between p-6 relative z-10">
                <button onClick={() => setIsPlayerOpen(false)} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                    <X size={24} />
                </button>
                <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-black">STREAMING FROM DRIVE</div>
                <div className="w-12"></div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-8 gap-10 relative z-10">
                <div className="w-full max-w-sm aspect-square bg-slate-900 rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden relative border border-white/5">
                    <div className="absolute inset-0 opacity-30" style={{ backgroundColor: themeColor }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Visualizer audioElement={audioRef.current} isPlaying={isPlaying} color={themeColor} />
                    </div>
                </div>

                <div className="text-center space-y-3 w-full max-w-sm">
                    <h2 className="text-4xl font-black text-white truncate px-2">{currentTrack.title}</h2>
                    <p className="text-lg text-slate-500 font-bold uppercase tracking-widest">{currentTrack.artist}</p>
                    {currentTrack.mood && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-black uppercase tracking-widest mt-4">
                            <Sparkles size={14} /> {currentTrack.mood}
                        </div>
                    )}
                </div>
            </div>

            <div className="p-10 pb-16 relative z-10">
                <div className="mb-10 group">
                    <div className="h-1.5 w-full bg-slate-900 rounded-full relative overflow-hidden group-hover:h-2 transition-all">
                         <div 
                            className="h-full bg-white transition-all duration-100 ease-linear"
                            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-600 mt-4 font-black tracking-widest uppercase">
                        <span>{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2,'0')}</span>
                        <span>{Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2,'0')}</span>
                    </div>
                </div>

                <div className="flex items-center justify-around max-w-sm mx-auto">
                    <button onClick={() => setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length)} className="text-slate-400 hover:text-white transition-all hover:scale-110 active:scale-90">
                        <SkipBack size={40} fill="currentColor" />
                    </button>
                    <button onClick={() => setIsPlaying(!isPlaying)} className="w-24 h-24 bg-white text-slate-950 rounded-[2.5rem] flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all">
                        {isPlaying ? <Pause size={40} fill="currentColor" /> : <Play size={40} fill="currentColor" className="ml-2" />}
                    </button>
                    <button onClick={() => setCurrentTrackIndex((prev) => (prev + 1) % tracks.length)} className="text-slate-400 hover:text-white transition-all hover:scale-110 active:scale-90">
                        <SkipForward size={40} fill="currentColor" />
                    </button>
                </div>
            </div>
        </div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUploadComplete={() => { setShowUpload(false); syncLibrary(); }} />}
    </div>
  );
};

export default App;
