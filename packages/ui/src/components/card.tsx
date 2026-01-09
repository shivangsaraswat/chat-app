'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'outline' | 'ghost';
    padding?: 'none' | 'sm' | 'default' | 'lg';
    hoverable?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = 'default', padding = 'default', hoverable = false, ...props }, ref) => {
        const variantClasses = {
            default: 'border bg-card shadow-sm',
            outline: 'border-2 bg-transparent',
            ghost: 'bg-transparent',
        };

        const paddingClasses = {
            none: '',
            sm: 'p-3',
            default: 'p-5',
            lg: 'p-8',
        };

        return (
            <div
                ref={ref}
                className={cn(
                    'rounded-2xl text-card-foreground transition-all duration-200',
                    variantClasses[variant],
                    paddingClasses[padding],
                    hoverable && 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer',
                    className
                )}
                {...props}
            />
        );
    }
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn('flex flex-col space-y-1.5', className)}
            {...props}
        />
    )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h3
            ref={ref}
            className={cn('text-lg font-semibold leading-none tracking-tight', className)}
            {...props}
        />
    )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
    ({ className, ...props }, ref) => (
        <p
            ref={ref}
            className={cn('text-sm text-muted-foreground', className)}
            {...props}
        />
    )
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('', className)} {...props} />
    )
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn('flex items-center pt-4', className)}
            {...props}
        />
    )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
