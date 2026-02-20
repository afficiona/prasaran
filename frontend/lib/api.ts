const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface User {
  id: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Platform {
  name: string;
  id: string;
  created_at: number;
  status: string;
}

export interface PublishJob {
  jobId: string;
  postId: string;
  status: string;
  job_id?: string;
  job_status?: string;
  created_at?: number;
  content?: string;
  platforms?: Array<{
    name: string;
    status: string;
  }>;
}

export interface JobStatus {
  jobId: string;
  status: string;
  tasks: Array<{
    id: string;
    platform_name: string;
    status: string;
    external_post_id?: string;
    last_error?: string;
  }>;
}

class ApiClient {
  private getHeaders(includeAuth = false) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = localStorage.getItem('prasaran_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  async register(email: string, password: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    return response.json();
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    localStorage.setItem('prasaran_token', data.token);
    localStorage.setItem('prasaran_user', JSON.stringify(data.user));
    return data;
  }

  async getConnectedPlatforms(): Promise<Platform[]> {
    const response = await fetch(`${API_BASE_URL}/platforms`, {
      headers: this.getHeaders(true),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch platforms');
    }

    return response.json();
  }

  async getConnectUrl(platform: string): Promise<{ authUrl: string }> {
    const response = await fetch(`${API_BASE_URL}/platforms/connect?platform=${platform}`, {
      headers: this.getHeaders(true),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to get connect URL');
    }

    return response.json();
  }

  async disconnectPlatform(platform: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/platforms/disconnect?platform=${platform}`, {
      method: 'POST',
      headers: this.getHeaders(true),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to disconnect platform');
    }

    return response.json();
  }

  async publish(content: string, platforms: string[]): Promise<PublishJob> {
    const response = await fetch(`${API_BASE_URL}/publish`, {
      method: 'POST',
      headers: this.getHeaders(true),
      credentials: 'include',
      body: JSON.stringify({ content, platforms }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to publish');
    }

    return response.json();
  }

  async getPublishHistory(): Promise<PublishJob[]> {
    const response = await fetch(`${API_BASE_URL}/publish/history`, {
      headers: this.getHeaders(true),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch history');
    }

    return response.json();
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    const response = await fetch(`${API_BASE_URL}/publish/job/${jobId}`, {
      headers: this.getHeaders(true),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch job status');
    }

    return response.json();
  }

  logout() {
    localStorage.removeItem('prasaran_token');
    localStorage.removeItem('prasaran_user');
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('prasaran_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('prasaran_token');
  }
}

export const api = new ApiClient();
