import type { NextApiRequest } from 'next';
import { jwtDecode } from 'jwt-decode';

interface CognitoJwtPayload {
  sub: string;
  email?: string;
  name?: string;
  'cognito:username'?: string;
  exp: number;
  iat: number;
  token_use: 'access' | 'id';
}

/**
 * Extract user ID from the Authorization header JWT token
 * @param req - Next.js API request
 * @returns User ID or null if not authenticated
 */
export function getUserIdFromRequest(req: NextApiRequest): string | null {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = jwtDecode<CognitoJwtPayload>(token);

    // Check if token is expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp < currentTime) {
      return null;
    }

    return decoded.sub;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Extract user email from the Authorization header JWT token
 * @param req - Next.js API request
 * @returns User email or null if not authenticated
 */
export function getUserEmailFromRequest(req: NextApiRequest): string | null {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const decoded = jwtDecode<CognitoJwtPayload>(token);

    return decoded.email || decoded['cognito:username'] || null;
  } catch (error) {
    return null;
  }
}

/**
 * Middleware helper to require authentication
 * @param req - Next.js API request
 * @returns Object with isAuthenticated status and userId
 */
export function requireAuth(req: NextApiRequest): { isAuthenticated: boolean; userId: string | null } {
  const userId = getUserIdFromRequest(req);
  return {
    isAuthenticated: userId !== null,
    userId,
  };
}

/**
 * Validate that a request is authenticated, return error response if not
 * Use this at the start of protected API routes
 */
export function validateAuthentication(req: NextApiRequest): { userId: string } | { error: string; status: number } {
  const userId = getUserIdFromRequest(req);
  
  if (!userId) {
    return { error: 'Unauthorized', status: 401 };
  }

  return { userId };
}
