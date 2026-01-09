'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const inputVariants = cva(
    'flex w-full rounded-xl border bg-background px-4 py-3 text-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
    {
        variants: {
            variant: {
                default: 'border-input',
                error: 'border-destructive focus-visible:ring-destructive',
            },
            inputSize: {
                default: 'h-11',
                sm: 'h-9 text-xs px-3',
                lg: 'h-14 text-base px-5',
            },
        },
        defaultVariants: {
            variant: 'default',
            inputSize: 'default',
        },
    }
);

export interface InputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
    error?: string;
    label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, variant, inputSize, type, error, label, ...props }, ref) => {
        const id = React.useId();

        return (
            <div className="space-y-2">
                {label && (
                    <label
                        htmlFor={id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        {label}
                    </label>
                )}
                <input
                    id={id}
                    type={type}
                    className={cn(
                        inputVariants({
                            variant: error ? 'error' : variant,
                            inputSize,
                            className,
                        })
                    )}
                    ref={ref}
                    {...props}
                />
                {error && (
                    <p className="text-sm text-destructive">{error}</p>
                )}
            </div>
        );
    }
);
Input.displayName = 'Input';

export { Input, inputVariants };
