"use client"

import * as React from "react"

export interface ToastType {
  id: string
  title?: string
  description?: string
  variant?: "default" | "success" | "error" | "warning" | "info"
  duration?: number
}

type ToastInput = Omit<ToastType, "id">

let toastCount = 0

// Global state for toasts
const toastState = {
  toasts: [] as ToastType[],
  listeners: [] as Array<(toasts: ToastType[]) => void>,
}

function generateId(): string {
  toastCount++
  return `toast-${toastCount}`
}

function addToast(toast: ToastInput): string {
  const id = generateId()
  const newToast: ToastType = {
    id,
    duration: 5000,
    variant: "default",
    ...toast,
  }

  toastState.toasts = [...toastState.toasts, newToast]
  toastState.listeners.forEach(listener => listener(toastState.toasts))

  // Auto-remove after duration
  setTimeout(() => {
    removeToast(id)
  }, newToast.duration)

  return id
}

function removeToast(id: string): void {
  toastState.toasts = toastState.toasts.filter(toast => toast.id !== id)
  toastState.listeners.forEach(listener => listener(toastState.toasts))
}

export function useToast() {
  const [toasts, setToasts] = React.useState<ToastType[]>(toastState.toasts)

  React.useEffect(() => {
    const listener = (newToasts: ToastType[]) => {
      setToasts(newToasts)
    }

    toastState.listeners.push(listener)

    return () => {
      const index = toastState.listeners.indexOf(listener)
      if (index > -1) {
        toastState.listeners.splice(index, 1)
      }
    }
  }, [])

  const toast = React.useCallback((input: ToastInput) => {
    return addToast(input)
  }, [])

  const dismiss = React.useCallback((id: string) => {
    removeToast(id)
  }, [])

  return {
    toasts,
    toast,
    dismiss,
  }
}

// Convenience functions for different toast types
export const toast = {
  success: (title: string, description?: string) => 
    addToast({ title, description, variant: "success" }),
  
  error: (title: string, description?: string) => 
    addToast({ title, description, variant: "error" }),
  
  warning: (title: string, description?: string) => 
    addToast({ title, description, variant: "warning" }),
  
  info: (title: string, description?: string) => 
    addToast({ title, description, variant: "info" }),
  
  default: (title: string, description?: string) => 
    addToast({ title, description, variant: "default" }),
}