export interface User {
  id: string;
  email: string;
  displayName?: string;
  profilePicture?: string;
  preferredLanguage?: string;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
  };
  error?: string;
}

// Export mesh types
export * from './mesh';
