
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly';

// Use environment variable for production, fallback for local development
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

export interface DriveAuthStatus {
  accessToken: string | null;
  expiry: number;
}

export class GoogleDriveService {
  private static STORAGE_KEY = 'nebula_drive_auth';
  private static FOLDER_NAME = 'NebulaMusic_Vault';

  static getAuth(): DriveAuthStatus | null {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) return null;
    try {
        const auth = JSON.parse(data);
        if (Date.now() > auth.expiry) {
          localStorage.removeItem(this.STORAGE_KEY);
          return null;
        }
        return auth;
    } catch (e) {
        return null;
    }
  }

  static saveAuth(token: string, expiresIn: number) {
    const auth = {
      accessToken: token,
      expiry: Date.now() + (expiresIn * 1000)
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(auth));
  }

  static logout() {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  static async requestAccess(): Promise<string> {
    if (CLIENT_ID.startsWith('YOUR_GOOGLE')) {
        console.error("Missing Google Client ID. Please set GOOGLE_CLIENT_ID environment variable.");
        alert("App not configured for Google Login. Set GOOGLE_CLIENT_ID in environment variables.");
    }

    return new Promise((resolve, reject) => {
      const client = (window as any).google?.accounts?.oauth2?.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response: any) => {
          if (response.error) {
            reject(response);
          } else {
            this.saveAuth(response.access_token, response.expires_in);
            resolve(response.access_token);
          }
        },
      });

      if (client) {
        client.requestAccessToken();
      } else {
        // Fallback to manual redirect if GIS script isn't ready
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(window.location.origin)}&response_type=token&scope=${encodeURIComponent(SCOPES)}`;
        window.location.href = authUrl;
      }
    });
  }

  static async getOrCreateFolder(): Promise<string> {
    const auth = this.getAuth();
    if (!auth) throw new Error("Not authenticated");

    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${this.FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`, {
      headers: { Authorization: `Bearer ${auth.accessToken}` }
    });
    const data = await searchRes.json();

    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: this.FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder'
      })
    });
    const folder = await createRes.json();
    return folder.id;
  }

  static async uploadTrack(file: Blob, metadata: any): Promise<void> {
    const auth = this.getAuth();
    if (!auth) throw new Error("Not authenticated");

    const folderId = await this.getOrCreateFolder();

    const fileMetadata = {
      name: metadata.fileName,
      parents: [folderId],
      description: JSON.stringify(metadata),
      appProperties: {
          nebula_track: 'true',
          artist: metadata.artist,
          title: metadata.title,
          mood: metadata.mood || '',
          color: metadata.themeColor || ''
      }
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
    form.append('file', file);

    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.accessToken}` },
      body: form
    });

    if (!uploadRes.ok) throw new Error("Upload failed");
  }

  static async fetchTracks(): Promise<any[]> {
    const auth = this.getAuth();
    if (!auth) return [];

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=trashed=false and appProperties has { key='nebula_track' and value='true' }&fields=files(id, name, description, appProperties, size)`, {
      headers: { Authorization: `Bearer ${auth.accessToken}` }
    });
    const data = await res.json();
    
    return (data.files || []).map((file: any) => {
        const props = file.appProperties || {};
        return {
            id: file.id,
            title: props.title || file.name,
            artist: props.artist || 'Unknown',
            mood: props.mood,
            themeColor: props.color,
            fileName: file.name,
            driveFileId: file.id
        };
    });
  }

  static async getFileBlob(fileId: string): Promise<Blob> {
    const auth = this.getAuth();
    if (!auth) throw new Error("Not authenticated");

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${auth.accessToken}` }
    });
    return await res.blob();
  }

  static async deleteFile(fileId: string): Promise<void> {
    const auth = this.getAuth();
    if (!auth) return;
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${auth.accessToken}` }
    });
  }
}
