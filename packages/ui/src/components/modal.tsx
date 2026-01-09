'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
    description?: string;
    className?: string;
}

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
    ({ isOpen, onClose, children, title, description, className }, ref) => {
        React.useEffect(() => {
            const handleEscape = (e: KeyboardEvent) => {
                if (e.key === 'Escape') onClose();
            };

            if (isOpen) {
                document.addEventListener('keydown', handleEscape);
                document.body.style.overflow = 'hidden';
            }

            return () => {
                document.removeEventListener('keydown', handleEscape);
                document.body.style.overflow = 'unset';
            };
        }, [isOpen, onClose]);

        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in-0"
                    onClick={onClose}
                />

                {/* Modal Content */}
                <div
                    ref={ref}
                    className={cn(
                        'relative z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg duration-200 animate-in fade-in-0 zoom-in-95 sm:rounded-2xl',
                        className
                    )}
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </button>

                    {/* Header */}
                    {(title || description) && (
                        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                            {title && (
                                <h2 className="text-lg font-semibold leading-none tracking-tight">
                                    {title}
                                </h2>
                            )}
                            {description && (
                                <p className="text-sm text-muted-foreground">{description}</p>
                            )}
                        </div>
                    )}

                    {/* Content */}
                    {children}
                </div>
            </div>
        );
    }
);
Modal.displayName = 'Modal';

export { Modal };
