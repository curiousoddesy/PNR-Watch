import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { AuthResult, LoginCredentials, UserRegistration, User, TrackedPNR, PNRStatusResult, Notification, NotificationSettings } from '../types';

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
      timeout: 10000,
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.clearToken();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );

    // Load token from localStorage on initialization
    this.loadToken();
  }

  private loadToken(): void {
    const token = localStorage.getItem('authToken');
    if (token) {
      this.token = token;
    }
  }

  setToken(token: string): void {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  clearToken(): void {
    this.token = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
  }

  // Authentication endpoints
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    const response: AxiosResponse<AuthResult> = await this.client.post('/auth/login', credentials);
    this.setToken(response.data.token);
    localStorage.setItem('refreshToken', response.data.refreshToken);
    return response.data;
  }

  async register(userData: UserRegistration): Promise<AuthResult> {
    const response: AxiosResponse<AuthResult> = await this.client.post('/auth/register', userData);
    this.setToken(response.data.token);
    localStorage.setItem('refreshToken', response.data.refreshToken);
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } finally {
      this.clearToken();
    }
  }

  async refreshToken(): Promise<string> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response: AxiosResponse<{ token: string }> = await this.client.post('/auth/refresh', {
      refreshToken,
    });
    
    this.setToken(response.data.token);
    return response.data.token;
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.client.post('/auth/forgot-password', { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.client.post('/auth/reset-password', { token, password: newPassword });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.client.post('/auth/change-password', { 
      currentPassword, 
      newPassword 
    });
  }

  // User endpoints
  async getCurrentUser(): Promise<User> {
    const response: AxiosResponse<User> = await this.client.get('/user/profile');
    return response.data;
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    const response: AxiosResponse<User> = await this.client.put('/user/profile', updates);
    return response.data;
  }

  async updateNotificationSettings(settings: NotificationSettings): Promise<NotificationSettings> {
    const response: AxiosResponse<NotificationSettings> = await this.client.put('/user/notification-settings', settings);
    return response.data;
  }

  // PNR endpoints
  async getPNRs(): Promise<TrackedPNR[]> {
    const response: AxiosResponse<TrackedPNR[]> = await this.client.get('/pnrs');
    return response.data;
  }

  async addPNR(pnr: string): Promise<TrackedPNR> {
    const response: AxiosResponse<TrackedPNR> = await this.client.post('/pnrs', { pnr });
    return response.data;
  }

  async removePNR(pnrId: string): Promise<void> {
    await this.client.delete(`/pnrs/${pnrId}`);
  }

  async checkPNRStatus(pnrId: string): Promise<PNRStatusResult> {
    const response: AxiosResponse<PNRStatusResult> = await this.client.get(`/pnrs/${pnrId}/status`);
    return response.data;
  }

  async checkAllPNRs(): Promise<PNRStatusResult[]> {
    const response: AxiosResponse<PNRStatusResult[]> = await this.client.post('/pnrs/check-all');
    return response.data;
  }

  async getPNRHistory(pnrId: string): Promise<PNRStatusResult[]> {
    const response: AxiosResponse<PNRStatusResult[]> = await this.client.get(`/pnrs/${pnrId}/history`);
    return response.data;
  }

  // Notification endpoints
  async getNotifications(): Promise<Notification[]> {
    const response: AxiosResponse<Notification[]> = await this.client.get('/notifications');
    return response.data;
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await this.client.put(`/notifications/${notificationId}/read`);
  }

  async markAllNotificationsAsRead(): Promise<void> {
    await this.client.put('/notifications/mark-all-read');
  }
}

export const apiClient = new ApiClient();