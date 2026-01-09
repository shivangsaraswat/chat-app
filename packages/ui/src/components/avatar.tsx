'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const avatarVariants = cva(
    'relative flex shrink-0 overflow-hidden rounded-full bg-muted',
    {
        variants: {
            size: {
                xs: 'h-6 w-6',
                sm: 'h-8 w-8',
                default: 'h-10 w-10',
                lg: 'h-12 w-12',
                xl: 'h-16 w-16',
                '2xl': 'h-24 w-24',
            },
        },
        defaultVariants: {
            size: 'default',
        },
    }
);

export interface AvatarProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
    src?: string | null;
    alt?: string;
    fallback?: string;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
    ({ className, size, src, alt, fallback, ...props }, ref) => {
        const [hasError, setHasError] = React.useState(false);

        const initials = React.useMemo(() => {
            if (fallback) return fallback.slice(0, 2).toUpperCase();
            if (alt) {
                const words = alt.split(' ');
                return words
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase();
            }
            return '?';
        }, [fallback, alt]);

        return (
            <div
                ref={ref}
                className={cn(avatarVariants({ size, className }))}
                {...props}
            >
                {src && !hasError ? (
                    <img
                        src={src}
                        alt={alt || 'Avatar'}
                        className="aspect-square h-full w-full object-cover"
                        onError={() => setHasError(true)}
                    />
                ) : (
                    <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40 text-sm font-medium text-primary">
                        {initials}
                    </span>
                )}
            </div>
        );
    }
);
Avatar.displayName = 'Avatar';

export { Avatar, avatarVariants };
