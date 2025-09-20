"use client"

import * as React from "react"
import { X, CheckCircle, AlertCircle, XCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ToastProps {
    id?: string
    title?: string
    description?: string
    variant?: "default" | "success" | "error" | "warning" | "info"
    duration?: number
    onClose?: () => void
}

const Toast = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & ToastProps
>(({ className, title, description, variant = "default", onClose, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(true)

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false)
            setTimeout(() => onClose?.(), 300) // Wait for animation
        }, props.duration || 5000)

        return () => clearTimeout(timer)
    }, [onClose, props.duration])

    const handleClose = () => {
        setIsVisible(false)
        setTimeout(() => onClose?.(), 300)
    }

    const getVariantStyles = () => {
        switch (variant) {
            case "success":
                return "border-green-200 bg-green-50 text-green-800"
            case "error":
                return "border-red-200 bg-red-50 text-red-800"
            case "warning":
                return "border-yellow-200 bg-yellow-50 text-yellow-800"
            case "info":
                return "border-blue-200 bg-blue-50 text-blue-800"
            default:
                return "border bg-background text-foreground"
        }
    }

    const getIcon = () => {
        switch (variant) {
            case "success":
                return <CheckCircle className="h-5 w-5 text-green-600" />
            case "error":
                return <XCircle className="h-5 w-5 text-red-600" />
            case "warning":
                return <AlertCircle className="h-5 w-5 text-yellow-600" />
            case "info":
                return <Info className="h-5 w-5 text-blue-600" />
            default:
                return null
        }
    }

    if (!isVisible) return null

    return (
        <div
            ref={ref}
            className={cn(
                "pointer-events-auto relative flex w-full items-center space-x-4 overflow-hidden rounded-lg border p-6 pr-8 shadow-lg transition-all duration-300",
                isVisible ? "animate-in slide-in-from-top-full" : "animate-out slide-out-to-right-full",
                getVariantStyles(),
                className
            )}
            {...props}
        >
            {getIcon() && (
                <div className="flex-shrink-0">
                    {getIcon()}
                </div>
            )}
            <div className="flex-1">
                {title && (
                    <div className="text-sm font-semibold">
                        {title}
                    </div>
                )}
                {description && (
                    <div className="text-sm opacity-90">
                        {description}
                    </div>
                )}
            </div>
            <button
                onClick={handleClose}
                className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    )
})

Toast.displayName = "Toast"

export { Toast }