// API client for task-management-api
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface RegisterData {
  username: string;
  email: string;
  password: string;
  fullName?: string;
  organizationName?: string;
}

interface LoginData {
  username: string;
  password: string;
}

interface AuthResponse {
  accessToken: string;
  userId: string;
  username: string;
  email: string;
  roles: string[];
}

interface ApiError {
  message: string;
  statusCode: number;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      const error: ApiError = {
        message: data.message || 'An error occurred',
        statusCode: response.status,
      };
      throw error;
    }

    return data as T;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginData): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getGoogleAuthUrl(): string {
    return `${this.baseUrl}/auth/google`;
  }

  // Get available plans for pricing
  async getPlans() {
    return this.request('/payment/plans', {
      method: 'GET',
    });
  }

  // Create Stripe checkout session (requires auth token)
  async createStripeCheckout(plan: string, token: string) {
    return this.request<{ url: string; sessionId: string }>('/payment/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan }),
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // Create PayPal order (requires auth token)
  async createPayPalOrder(plan: string, token: string) {
    return this.request<{ orderId: string; approvalUrl: string }>('/payment/paypal/create-order', {
      method: 'POST',
      body: JSON.stringify({ plan }),
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
}

export const api = new ApiClient(API_URL);
export type { RegisterData, LoginData, AuthResponse, ApiError };
