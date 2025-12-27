export interface Track {
  id: string;
  title: string;
  artist: string;
  fileBlob: Blob; // Stored in IndexedDB
  fileName: string;
  mimeType: string;
  dateAdded: number;
  duration?: number;
  // AI Enhanced Metadata
  mood?: string;
  themeColor?: string;
  description?: string;
}

export interface PlayerState {
  currentTrackId: string | null;
  isPlaying: boolean;
  volume: number;
  progress: number; // 0 to 100
  currentTime: number;
  duration: number;
  isShuffle: boolean;
  isRepeat: boolean;
}

export enum AppView {
  HOME = 'HOME',
  SEARCH = 'SEARCH',
  LIBRARY = 'LIBRARY'
}