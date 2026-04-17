"use client"

import { Toast } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"

export function Toaster() {
    const { toasts, dismiss } = useToast()

    return (
        <div className="fixed bottom-0 left-0 z-[100] flex max-h-screen w-full flex-col p-4 md:max-w-[420px]">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    id={toast.id}
                    title={toast.title}
                    description={toast.description}
                    variant={toast.variant}
                    duration={toast.duration}
                    onClose={() => dismiss(toast.id)}
                />
            ))}
        </div>
    )
}