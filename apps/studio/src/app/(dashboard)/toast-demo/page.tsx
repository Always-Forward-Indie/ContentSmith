'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'

export default function ToastDemo() {
    return (
        <div className="container mx-auto py-8">
            <Card className="max-w-md mx-auto">
                <CardHeader>
                    <CardTitle>Toast Notifications Demo</CardTitle>
                    <CardDescription>
                        Test different types of toast notifications
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button
                        onClick={() => toast.success('Success!', 'Operation completed successfully')}
                        className="w-full"
                        variant="default"
                    >
                        Show Success Toast
                    </Button>

                    <Button
                        onClick={() => toast.error('Error!', 'Something went wrong')}
                        className="w-full"
                        variant="destructive"
                    >
                        Show Error Toast
                    </Button>

                    <Button
                        onClick={() => toast.warning('Warning!', 'Please check your input')}
                        className="w-full"
                        variant="outline"
                    >
                        Show Warning Toast
                    </Button>

                    <Button
                        onClick={() => toast.info('Info', 'Here is some information')}
                        className="w-full"
                        variant="outline"
                    >
                        Show Info Toast
                    </Button>

                    <Button
                        onClick={() => toast.default('Default', 'This is a default notification')}
                        className="w-full"
                        variant="outline"
                    >
                        Show Default Toast
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}