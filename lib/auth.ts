import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { type Database } from '@/types/supabase';
import { env } from './env';

export const supabase = createClientComponentClient<Database>({
  supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

export type AuthError = {
  message: string;
  status?: number;
  code?: string;
};

export type AuthResponse = {
  data: any;
  error: AuthError | null;
};

/**
 * Sign in with email and password
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise<AuthResponse>
 */
export async function signIn(email: string, password: string): Promise<AuthResponse> {
  try {
    // Validate email format
    if (!isValidEmail(email)) {
      return {
        data: null,
        error: {
          message: 'Invalid email format',
          code: 'INVALID_EMAIL'
        }
      };
    }

    // Validate password strength
    if (!isValidPassword(password)) {
      return {
        data: null,
        error: {
          message: 'Password must be at least 8 characters long and contain uppercase, lowercase, number and special character',
          code: 'INVALID_PASSWORD'
        }
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Check if email is verified
    if (!data.user?.email_confirmed_at) {
      return {
        data: null,
        error: {
          message: 'Please verify your email before signing in',
          code: 'EMAIL_NOT_VERIFIED'
        }
      };
    }

    return { data, error: null };
  } catch (error: any) {
    return {
      data: null,
      error: {
        message: error.message,
        status: error.status,
        code: error.code
      }
    };
  }
}

/**
 * Sign up with email and password
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise<AuthResponse>
 */
export async function signUp(email: string, password: string): Promise<AuthResponse> {
  try {
    // Validate email format
    if (!isValidEmail(email)) {
      return {
        data: null,
        error: {
          message: 'Invalid email format',
          code: 'INVALID_EMAIL'
        }
      };
    }

    // Validate password strength
    if (!isValidPassword(password)) {
      return {
        data: null,
        error: {
          message: 'Password must be at least 8 characters long and contain uppercase, lowercase, number and special character',
          code: 'INVALID_PASSWORD'
        }
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
        }
      },
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    return {
      data: null,
      error: {
        message: error.message,
        status: error.status,
        code: error.code
      }
    };
  }
}

/**
 * Sign out the current user
 * @returns Promise<AuthResponse>
 */
export async function signOut(): Promise<AuthResponse> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { data: null, error: null };
  } catch (error: any) {
    return {
      data: null,
      error: {
        message: error.message,
        status: error.status,
        code: error.code
      }
    };
  }
}

/**
 * Reset password for a user
 * @param email - User's email address
 * @returns Promise<AuthResponse>
 */
export async function resetPassword(email: string): Promise<AuthResponse> {
  try {
    if (!isValidEmail(email)) {
      return {
        data: null,
        error: {
          message: 'Invalid email format',
          code: 'INVALID_EMAIL'
        }
      };
    }

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    return {
      data: null,
      error: {
        message: error.message,
        status: error.status,
        code: error.code
      }
    };
  }
}

/**
 * Update user's password
 * @param newPassword - New password
 * @returns Promise<AuthResponse>
 */
export async function updatePassword(newPassword: string): Promise<AuthResponse> {
  try {
    if (!isValidPassword(newPassword)) {
      return {
        data: null,
        error: {
          message: 'Password must be at least 8 characters long and contain uppercase, lowercase, number and special character',
          code: 'INVALID_PASSWORD'
        }
      };
    }

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    return {
      data: null,
      error: {
        message: error.message,
        status: error.status,
        code: error.code
      }
    };
  }
}

/**
 * Get the current user session
 * @returns Promise<AuthResponse>
 */
export async function getSession(): Promise<AuthResponse> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return { data: session, error: null };
  } catch (error: any) {
    return {
      data: null,
      error: {
        message: error.message,
        status: error.status,
        code: error.code
      }
    };
  }
}

/**
 * Get the current user
 * @returns Promise<AuthResponse>
 */
export async function getUser(): Promise<AuthResponse> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { data: user, error: null };
  } catch (error: any) {
    return {
      data: null,
      error: {
        message: error.message,
        status: error.status,
        code: error.code
      }
    };
  }
}

/**
 * Update user profile information
 * @param updates - Object containing profile updates
 * @returns Promise<AuthResponse>
 */
export async function updateProfile(updates: {
  username?: string;
  full_name?: string;
  avatar_url?: string;
}): Promise<AuthResponse> {
  try {
    // Validate username if provided
    if (updates.username && !isValidUsername(updates.username)) {
      return {
        data: null,
        error: {
          message: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores',
          code: 'INVALID_USERNAME'
        }
      };
    }

    const { data, error } = await supabase.auth.updateUser({
      data: {
        ...updates,
        updated_at: new Date().toISOString()
      }
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    return {
      data: null,
      error: {
        message: error.message,
        status: error.status,
        code: error.code
      }
    };
  }
}

/**
 * Subscribe to auth state changes
 * @param callback - Function to call when auth state changes
 * @returns Unsubscribe function
 */
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

/**
 * Verify email address
 * @param token - Verification token
 * @returns Promise<AuthResponse>
 */
export async function verifyEmail(token: string): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email'
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    return {
      data: null,
      error: {
        message: error.message,
        status: error.status,
        code: error.code
      }
    };
  }
}

/**
 * Check if user is authenticated
 * @returns Promise<boolean>
 */
export async function isAuthenticated(): Promise<boolean> {
  const { data: session } = await supabase.auth.getSession();
  return !!session;
}

/**
 * Get user's claims (permissions)
 * @returns Promise<AuthResponse>
 */
export async function getUserClaims(): Promise<AuthResponse> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { data: user?.app_metadata, error: null };
  } catch (error: any) {
    return {
      data: null,
      error: {
        message: error.message,
        status: error.status,
        code: error.code
      }
    };
  }
}

// Helper functions for validation

/**
 * Validate email format
 * @param email - Email to validate
 * @returns boolean
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns boolean
 */
function isValidPassword(password: string): boolean {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

/**
 * Validate username format
 * @param username - Username to validate
 * @returns boolean
 */
function isValidUsername(username: string): boolean {
  // 3-20 characters, letters, numbers, and underscores only
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
}