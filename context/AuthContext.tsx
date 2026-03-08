import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { cognitoConfig, validateCognitoConfig } from '../config/cognito';
import { setAuthTokenGetter } from '../services/api';

// User interface
export interface User {
  id: string;
  email: string;
  name?: string;
  accessToken: string;
  idToken: string;
  refreshToken: string;
}

// Auth state interface
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Auth context interface
interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  resendConfirmationCode: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  confirmForgotPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  clearError: () => void;
  getAccessToken: () => string | null;
  isLocalAuth: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Initialize Cognito User Pool
let userPool: CognitoUserPool | null = null;
const isCognitoConfigured = typeof window !== 'undefined' && validateCognitoConfig();

if (isCognitoConfigured) {
  userPool = new CognitoUserPool({
    UserPoolId: cognitoConfig.userPoolId,
    ClientId: cognitoConfig.clientId,
  });
}

// Local Storage Keys for local auth
const LOCAL_AUTH_USERS_KEY = 'samvaad_users';
const LOCAL_AUTH_CURRENT_USER_KEY = 'samvaad_current_user';

// Local auth helper functions
function getLocalUsers(): Record<string, { email: string; password: string; name: string; id: string }> {
  if (typeof window === 'undefined') return {};
  try {
    const users = localStorage.getItem(LOCAL_AUTH_USERS_KEY);
    return users ? JSON.parse(users) : {};
  } catch {
    return {};
  }
}

function saveLocalUser(email: string, password: string, name: string): string {
  const users = getLocalUsers();
  const id = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  users[email] = { email, password, name, id };
  localStorage.setItem(LOCAL_AUTH_USERS_KEY, JSON.stringify(users));
  return id;
}

function verifyLocalUser(email: string, password: string): { email: string; name: string; id: string } | null {
  const users = getLocalUsers();
  const user = users[email];
  if (user && user.password === password) {
    return { email: user.email, name: user.name, id: user.id };
  }
  return null;
}

function getStoredLocalUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const userData = localStorage.getItem(LOCAL_AUTH_CURRENT_USER_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch {
    return null;
  }
}

function saveCurrentLocalUser(user: User | null): void {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(LOCAL_AUTH_CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(LOCAL_AUTH_CURRENT_USER_KEY);
  }
}

function generateLocalToken(): string {
  return `local_token_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const isLocalAuth = !isCognitoConfigured;

  // Parse user from session (Cognito)
  const parseUserFromSession = useCallback((session: CognitoUserSession, email: string): User => {
    const idToken = session.getIdToken();
    const accessToken = session.getAccessToken();
    const refreshToken = session.getRefreshToken();

    const payload = idToken.decodePayload();

    return {
      id: payload.sub,
      email: payload.email || email,
      name: payload.name || payload.email?.split('@')[0],
      accessToken: accessToken.getJwtToken(),
      idToken: idToken.getJwtToken(),
      refreshToken: refreshToken.getToken(),
    };
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      // LOCAL AUTH MODE
      if (isLocalAuth) {
        const storedUser = getStoredLocalUser();
        if (storedUser) {
          setState({
            user: storedUser,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
        return;
      }

      // COGNITO MODE
      if (!userPool) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const cognitoUser = userPool.getCurrentUser();
      
      if (!cognitoUser) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session || !session.isValid()) {
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }

        const user = parseUserFromSession(session, cognitoUser.getUsername());
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      });
    };

    checkSession();
  }, [parseUserFromSession, isLocalAuth]);

  // Sign Up
  const signUp = useCallback(async (email: string, password: string, name?: string): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    // LOCAL AUTH MODE
    if (isLocalAuth) {
      return new Promise((resolve, reject) => {
        try {
          const existingUsers = getLocalUsers();
          if (existingUsers[email]) {
            setState(prev => ({ ...prev, isLoading: false, error: 'User already exists' }));
            reject(new Error('User already exists'));
            return;
          }

          const id = saveLocalUser(email, password, name || email.split('@')[0]);
          
          // Auto login after signup (for local auth)
          const user: User = {
            id,
            email,
            name: name || email.split('@')[0],
            accessToken: generateLocalToken(),
            idToken: generateLocalToken(),
            refreshToken: generateLocalToken(),
          };
          
          saveCurrentLocalUser(user);
          
          setState({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          
          resolve();
        } catch (err: any) {
          setState(prev => ({ ...prev, isLoading: false, error: err.message }));
          reject(err);
        }
      });
    }

    // COGNITO MODE
    if (!userPool) {
      throw new Error('Cognito is not configured');
    }

    return new Promise((resolve, reject) => {
      const attributeList: CognitoUserAttribute[] = [
        new CognitoUserAttribute({ Name: 'email', Value: email }),
      ];

      if (name) {
        attributeList.push(new CognitoUserAttribute({ Name: 'name', Value: name }));
      }

      userPool!.signUp(email, password, attributeList, [], (err, result) => {
        if (err) {
          setState(prev => ({ ...prev, isLoading: false, error: err.message }));
          reject(err);
          return;
        }

        setState(prev => ({ ...prev, isLoading: false }));
        resolve();
      });
    });
  }, [isLocalAuth]);

  // Confirm Sign Up
  const confirmSignUp = useCallback(async (email: string, code: string): Promise<void> => {
    // LOCAL AUTH MODE - auto confirm
    if (isLocalAuth) {
      return Promise.resolve();
    }

    // COGNITO MODE
    if (!userPool) {
      throw new Error('Cognito is not configured');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    return new Promise((resolve, reject) => {
      cognitoUser.confirmRegistration(code, true, (err, result) => {
        if (err) {
          setState(prev => ({ ...prev, isLoading: false, error: err.message }));
          reject(err);
          return;
        }

        setState(prev => ({ ...prev, isLoading: false }));
        resolve();
      });
    });
  }, [isLocalAuth]);

  // Resend Confirmation Code
  const resendConfirmationCode = useCallback(async (email: string): Promise<void> => {
    // LOCAL AUTH MODE - not needed
    if (isLocalAuth) {
      return Promise.resolve();
    }

    // COGNITO MODE
    if (!userPool) {
      throw new Error('Cognito is not configured');
    }

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    return new Promise((resolve, reject) => {
      cognitoUser.resendConfirmationCode((err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }, [isLocalAuth]);

  // Sign In
  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    // LOCAL AUTH MODE
    if (isLocalAuth) {
      return new Promise((resolve, reject) => {
        const localUser = verifyLocalUser(email, password);
        
        if (!localUser) {
          setState(prev => ({ ...prev, isLoading: false, error: 'Invalid email or password' }));
          reject(new Error('Invalid email or password'));
          return;
        }

        const user: User = {
          id: localUser.id,
          email: localUser.email,
          name: localUser.name,
          accessToken: generateLocalToken(),
          idToken: generateLocalToken(),
          refreshToken: generateLocalToken(),
        };

        saveCurrentLocalUser(user);

        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        resolve();
      });
    }

    // COGNITO MODE
    if (!userPool) {
      throw new Error('Cognito is not configured');
    }

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    const authenticationDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    return new Promise((resolve, reject) => {
      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (session) => {
          const user = parseUserFromSession(session, email);
          setState({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          resolve();
        },
        onFailure: (err) => {
          setState(prev => ({ ...prev, isLoading: false, error: err.message }));
          reject(err);
        },
        newPasswordRequired: (userAttributes, requiredAttributes) => {
          setState(prev => ({ 
            ...prev, 
            isLoading: false, 
            error: 'New password required. Please contact support.' 
          }));
          reject(new Error('New password required'));
        },
      });
    });
  }, [parseUserFromSession, isLocalAuth]);

  // Sign Out
  const signOut = useCallback(async (): Promise<void> => {
    // LOCAL AUTH MODE
    if (isLocalAuth) {
      saveCurrentLocalUser(null);
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      return;
    }

    // COGNITO MODE
    if (!userPool) {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      return;
    }

    const cognitoUser = userPool.getCurrentUser();
    
    if (cognitoUser) {
      cognitoUser.signOut();
    }

    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }, [isLocalAuth]);

  // Forgot Password
  const forgotPassword = useCallback(async (email: string): Promise<void> => {
    // LOCAL AUTH MODE - simple flow
    if (isLocalAuth) {
      // In local mode, just verify user exists
      const users = getLocalUsers();
      if (!users[email]) {
        throw new Error('User not found');
      }
      return Promise.resolve();
    }

    // COGNITO MODE
    if (!userPool) {
      throw new Error('Cognito is not configured');
    }

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    return new Promise((resolve, reject) => {
      cognitoUser.forgotPassword({
        onSuccess: () => {
          resolve();
        },
        onFailure: (err) => {
          reject(err);
        },
      });
    });
  }, [isLocalAuth]);

  // Confirm Forgot Password
  const confirmForgotPassword = useCallback(async (
    email: string, 
    code: string, 
    newPassword: string
  ): Promise<void> => {
    // LOCAL AUTH MODE - update password directly
    if (isLocalAuth) {
      const users = getLocalUsers();
      if (!users[email]) {
        throw new Error('User not found');
      }
      users[email].password = newPassword;
      localStorage.setItem(LOCAL_AUTH_USERS_KEY, JSON.stringify(users));
      return Promise.resolve();
    }

    // COGNITO MODE
    if (!userPool) {
      throw new Error('Cognito is not configured');
    }

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    return new Promise((resolve, reject) => {
      cognitoUser.confirmPassword(code, newPassword, {
        onSuccess: () => {
          resolve();
        },
        onFailure: (err) => {
          reject(err);
        },
      });
    });
  }, [isLocalAuth]);

  // Clear Error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Get Access Token
  // In local auth mode, return null so the backend uses its demo-user fallback
  // instead of attempting (and failing) Cognito token verification.
  const getAccessToken = useCallback((): string | null => {
    if (isLocalAuth) return null;
    return state.user?.accessToken || null;
  }, [state.user, isLocalAuth]);

  // Set up auth token getter for API service
  useEffect(() => {
    setAuthTokenGetter(getAccessToken);
  }, [getAccessToken]);

  const value: AuthContextType = {
    ...state,
    signUp,
    signIn,
    signOut,
    confirmSignUp,
    resendConfirmationCode,
    forgotPassword,
    confirmForgotPassword,
    clearError,
    getAccessToken,
    isLocalAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Export context for advanced use cases
export { AuthContext };
