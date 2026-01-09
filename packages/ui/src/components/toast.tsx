'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

const toastVariants = cva(
    'pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-xl border p-4 pr-8 shadow-lg transition-all animate-in slide-in-from-top-full',
    {
        variants: {
            variant: {
                default: 'bg-background border-border',
                success: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
                error: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
                warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800',
                info: 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

const iconMap = {
    default: null,
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
};

const iconColorMap = {
    default: '',
    success: 'text-green-600 dark:text-green-400',
    error: 'text-red-600 dark:text-red-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    info: 'text-blue-600 dark:text-blue-400',
};

export interface ToastProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
    title?: string;
    description?: string;
    onClose?: () => void;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
    ({ className, variant = 'default', title, description, onClose, ...props }, ref) => {
        const Icon = iconMap[variant || 'default'];

        return (
            <div
                ref={ref}
                className={cn(toastVariants({ variant }), className)}
                {...props}
            >
                <div className="flex items-start gap-3">
                    {Icon && (
                        <Icon className={cn('h-5 w-5 shrink-0', iconColorMap[variant || 'default'])} />
                    )}
                    <div className="grid gap-1">
                        {title && <p className="text-sm font-semibold">{title}</p>}
                        {description && (
                            <p className="text-sm opacity-90">{description}</p>
                        )}
                    </div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute right-2 top-2 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>
        );
    }
);
Toast.displayName = 'Toast';

// Toast Container
interface ToastContainerProps {
    children: React.ReactNode;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ children }) => {
    return (
        <div className="fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:flex-col sm:max-w-[420px]">
            {children}
        </div>
    );
};

export { Toast, ToastContainer, toastVariants };
