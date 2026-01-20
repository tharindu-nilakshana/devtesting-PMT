// System Variables Cookie Management - Secure HTTP-only cookies for system-wide variables
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { SystemVariables, SystemVariablesCookie, SystemVariableGroup } from '../types/systemVariables'

const systemVariablesSecret = new TextEncoder().encode(
  process.env.SYSTEM_VARIABLES_SECRET || 'your-system-variables-secret-change-in-production'
)

const COOKIE_NAME = 'system_vars'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export class SystemVariablesCookieManager {
  /**
   * Create a signed JWT token containing system variables
   */
  private static async createSignedToken(cookieData: SystemVariablesCookie): Promise<string> {
    // Convert cookieData to a plain object with string keys for JWTPayload compatibility
    const payload: Record<string, unknown> = { ...cookieData }
    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(systemVariablesSecret)
    
    return jwt
  }

  /**
   * Verify and decode a signed JWT token
   */
  private static async verifySignedToken(token: string): Promise<SystemVariablesCookie | null> {
    try {
      const { payload } = await jwtVerify(token, systemVariablesSecret)
      return payload as unknown as SystemVariablesCookie
    } catch (error) {
      console.error('Error verifying system variables token:', error)
      return null
    }
  }

  /**
   * Set system variables in secure HTTP-only cookie
   */
  static async setSystemVariables(
    variables: SystemVariables, 
    userId: string, 
    sessionId: string
  ): Promise<void> {
    try {
      const cookieData: SystemVariablesCookie = {
        variables,
        userId,
        sessionId,
        expires: Date.now() + (COOKIE_MAX_AGE * 1000),
        version: 1
      }

      const token = await this.createSignedToken(cookieData)
      const cookieStore = await cookies()
      
      cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
        path: '/'
      })

      console.log(`System variables set for user ${userId}`)
    } catch (error) {
      console.error('Error setting system variables cookie:', error)
      throw error
    }
  }

  /**
   * Get system variables from secure HTTP-only cookie
   */
  static async getSystemVariables(): Promise<SystemVariables | null> {
    try {
      const cookieStore = await cookies()
      const token = cookieStore.get(COOKIE_NAME)?.value
      
      if (!token) {
        return null
      }
      
      const cookieData = await this.verifySignedToken(token)
      
      if (!cookieData || cookieData.expires < Date.now()) {
        // Cookie expired, clear it
        await this.clearSystemVariables('expired')
        return null
      }
      
      return cookieData.variables
    } catch (error) {
      console.error('Error getting system variables cookie:', error)
      return null
    }
  }

  /**
   * Get specific variable group from cookie
   */
  static async getVariableGroup<T extends SystemVariableGroup>(
    group: T
  ): Promise<SystemVariables[T] | null> {
    try {
      const variables = await this.getSystemVariables()
      return variables?.[group] || null
    } catch (error) {
      console.error(`Error getting variable group ${group}:`, error)
      return null
    }
  }

  /**
   * Get specific variable by key
   */
  static async getVariable(key: string): Promise<unknown> {
    try {
      const variables = await this.getSystemVariables()
      if (!variables) return null

      // Search through all variable groups
      for (const group of Object.values(variables)) {
        if (group && typeof group === 'object' && key in group) {
          return (group as Record<string, unknown>)[key]
        }
      }
      
      return null
    } catch (error) {
      console.error(`Error getting variable ${key}:`, error)
      return null
    }
  }

  /**
   * Update specific variable groups
   */
  static async updateVariableGroups(
    updates: Partial<SystemVariables>,
    userId: string,
    sessionId: string
  ): Promise<void> {
    try {
      const currentVariables = await this.getSystemVariables()
      
      if (!currentVariables) {
        throw new Error('No existing system variables found')
      }

      const updatedVariables: SystemVariables = {
        ...currentVariables,
        ...updates
      }

      await this.setSystemVariables(updatedVariables, userId, sessionId)
      console.log(`System variables updated for user ${userId}`)
    } catch (error) {
      console.error('Error updating system variables:', error)
      throw error
    }
  }

  /**
   * Clear system variables cookie
   */
  static async clearSystemVariables(reason: string = 'manual'): Promise<void> {
    try {
      const cookieStore = await cookies()
      cookieStore.delete(COOKIE_NAME)
      console.log(`System variables cleared. Reason: ${reason}`)
    } catch (error) {
      console.error('Error clearing system variables cookie:', error)
      throw error
    }
  }

  /**
   * Check if system variables cookie exists and is valid
   */
  static async hasValidSystemVariables(): Promise<boolean> {
    try {
      const variables = await this.getSystemVariables()
      return variables !== null
    } catch (error) {
      console.error('Error checking system variables validity:', error)
      return false
    }
  }

  /**
   * Get user ID from system variables cookie
   */
  static async getUserIdFromSystemVariables(): Promise<string | null> {
    try {
      const cookieStore = await cookies()
      const token = cookieStore.get(COOKIE_NAME)?.value
      
      if (!token) return null
      
      const cookieData = await this.verifySignedToken(token)
      return cookieData?.userId || null
    } catch (error) {
      console.error('Error getting user ID from system variables:', error)
      return null
    }
  }

  /**
   * Invalidate system variables when user makes changes
   */
  static async invalidateOnUserChange(
    userId: string, 
    affectedGroups: SystemVariableGroup[],
    reason: string
  ): Promise<void> {
    try {
      console.log(`Invalidating system variables for user ${userId}. Reason: ${reason}. Affected groups: ${affectedGroups.join(', ')}`)
      
      // Clear the cookie to force refresh on next request
      await this.clearSystemVariables(reason)
      
      // Log the invalidation event for debugging
      console.log('System variables invalidation event:', {
        userId,
        affectedGroups,
        reason,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error invalidating system variables:', error)
      throw error
    }
  }
}
