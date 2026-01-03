import React, { createContext, useContext, useEffect, ReactNode } from 'react'
import { usePreferences, useUpdatePreferences } from '../hooks/useAPI'
import type { UserPreferences } from '../lib/api'

interface PreferencesContextType {
  preferences: UserPreferences | undefined
  isLoading: boolean
  updatePreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => Promise<void>
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined)

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { data: preferences, isLoading } = usePreferences()
  const updateMutation = useUpdatePreferences()

  // Apply theme preference
  useEffect(() => {
    if (preferences?.theme) {
      const root = document.documentElement
      if (preferences.theme === 'dark') {
        root.classList.add('dark')
      } else if (preferences.theme === 'light') {
        root.classList.remove('dark')
      } else if (preferences.theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        if (prefersDark) {
          root.classList.add('dark')
        } else {
          root.classList.remove('dark')
        }
      }
    }
  }, [preferences?.theme])

  // Apply text size preference
  useEffect(() => {
    if (preferences?.text_size) {
      const root = document.documentElement
      root.setAttribute('data-text-size', preferences.text_size)
    }
  }, [preferences?.text_size])

  // Apply reduce motion preference
  useEffect(() => {
    if (preferences?.reduce_motion) {
      const root = document.documentElement
      root.setAttribute('data-reduce-motion', 'true')
    } else {
      const root = document.documentElement
      root.removeAttribute('data-reduce-motion')
    }
  }, [preferences?.reduce_motion])

  // Apply high contrast preference
  useEffect(() => {
    if (preferences?.high_contrast) {
      const root = document.documentElement
      root.classList.add('high-contrast')
    } else {
      const root = document.documentElement
      root.classList.remove('high-contrast')
    }
  }, [preferences?.high_contrast])

  const updatePreference = async <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    await updateMutation.mutateAsync({ [key]: value })
  }

  const updatePreferencesHandler = async (updates: Partial<UserPreferences>) => {
    await updateMutation.mutateAsync(updates)
  }

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        isLoading,
        updatePreference,
        updatePreferences: updatePreferencesHandler,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferencesContext() {
  const context = useContext(PreferencesContext)
  if (context === undefined) {
    throw new Error('usePreferencesContext must be used within a PreferencesProvider')
  }
  return context
}
