// Auth/session helpers for getting userId from session
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { SystemVariablesCookieManager } from './systemVariables'
import type { SystemVariables } from '../types/systemVariables'

const authSecret = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'your-auth-secret-change-in-production'
)

export interface UserSession {
  userId: string
  email: string
  name: string
  role: string
  iat: number
  exp: number
}

export async function createAuthToken(session: Omit<UserSession, 'iat' | 'exp'>): Promise<string> {
  const jwt = await new SignJWT(session)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(authSecret)
  
  return jwt
}

export async function verifyAuthToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, authSecret)
    return payload as unknown as UserSession
  } catch (error) {
    console.error('Error verifying auth token:', error)
    return null
  }
}

export async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth')?.value
    
    if (!token) {
      return null
    }
    
    const session = await verifyAuthToken(token)
    return session?.userId || null
  } catch (error) {
    console.error('Error getting user ID from session:', error)
    return null
  }
}

export async function getUserSession(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth')?.value
    
    if (!token) {
      return null
    }
    
    return await verifyAuthToken(token)
  } catch (error) {
    console.error('Error getting user session:', error)
    return null
  }
}

export async function setAuthCookie(session: Omit<UserSession, 'iat' | 'exp'>): Promise<void> {
  const token = await createAuthToken(session)
  const cookieStore = await cookies()
  
  cookieStore.set('auth', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  })
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('auth')
  
  // Also clear system variables when logging out
  await SystemVariablesCookieManager.clearSystemVariables('logout')
}

export async function requireAuth(): Promise<UserSession> {
  const session = await getUserSession()
  
  if (!session) {
    throw new Error('Authentication required')
  }
  
  return session
}

/**
 * Set system variables after successful login
 * This should be called after user authentication is complete
 */
export async function setSystemVariablesAfterLogin(
  session: Omit<UserSession, 'iat' | 'exp'>,
  systemVariables: SystemVariables
): Promise<void> {
  try {
    // Set auth cookie
    await setAuthCookie(session)
    
    // Set system variables cookie
    await SystemVariablesCookieManager.setSystemVariables(
      systemVariables,
      session.userId,
      session.userId // Using userId as sessionId
    )
    
  } catch (error) {
    console.error('Error setting system variables after login:', error)
    throw error
  }
}

/**
 * Complete logout - clears both auth and system variables
 */
export async function completeLogout(): Promise<void> {
  try {
    await clearAuthCookie()
  } catch (error) {
    console.error('Error during complete logout:', error)
    throw error
  }
}

/**
 * Check if user has both valid auth and system variables
 */
export async function hasCompleteSession(): Promise<boolean> {
  try {
    const hasAuth = await getUserSession() !== null
    const hasSystemVars = await SystemVariablesCookieManager.hasValidSystemVariables()
    
    return hasAuth && hasSystemVars
  } catch (error) {
    console.error('Error checking complete session:', error)
    return false
  }
}
