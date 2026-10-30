'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '@/styles/analyze-button.css';

export interface AnalyzeButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    onAnalyze?: () => void;
    className?: string;
    label?: string;
    icon?: React.ReactNode;
    children?: React.ReactNode;
    hasInput?: boolean;
    withWrapper?: boolean;
    wrapperClassName?: string;
}

const buttonVariants = {
    idle: {
        height: 34,
        width: 'auto',
        borderRadius: 8,
    },
    hover: {
        scale: 1.02,
    },
    tap: {
        scale: 0.98,
    },
};

const contentVariants = {
    initial: { opacity: 0, filter: 'blur(2px)' },
    animate: { opacity: 1, filter: 'blur(0px)' },
    exit: { opacity: 0, filter: 'blur(2px)' },
    transition: { duration: 0.15 },
};

export const AnalyzeButton: React.FC<AnalyzeButtonProps> = ({
    onAnalyze,
    className = '',
    label = 'Analyze',
    icon,
    children,
    hasInput = false,
    withWrapper = false,
    wrapperClassName = '',
    type = 'button',
    onClick,
    ...props
}) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e);
        onAnalyze?.();
    };

    // Default SVG icon matching Archyve's query/analyze indicator
    const defaultIcon = (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 256 256"
            className="w-4 h-4 text-current transition-colors duration-200"
        >
            <rect width="256" height="256" fill="none" />
            <rect
                x="40"
                y="40"
                width="176"
                height="176"
                rx="8"
                transform="translate(0 256) rotate(-90)"
                opacity={hasInput ? 0.15 : 0.1}
                fill="currentColor"
            />
            <rect
                x="40"
                y="40"
                width="176"
                height="176"
                rx="8"
                transform="translate(0 256) rotate(-90)"
                fill="none"
                stroke={hasInput ? 'currentColor' : 'transparent'}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="16"
            />
            <line
                x1="160"
                y1="96"
                x2="96"
                y2="160"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="16"
            />
            <polyline
                points="112 96 160 96 160 144"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="16"
            />
        </svg>
    );

    const resolvedIcon = icon !== undefined ? icon : children !== undefined ? null : defaultIcon;

    const buttonContent = (
        <motion.button
            type={type}
            initial="idle"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            transition={{ duration: 0.2, type: 'spring', bounce: 0.15 }}
            onClick={handleClick}
            data-has-input={hasInput ? 'true' : 'false'}
            className={`analyze-btn flex items-center gap-1.5 group cursor-pointer ${hasInput ? 'has-input' : ''} ${className}`}
            aria-label={label}
            {...props as any}
        >
            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={`content-${hasInput}`}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    variants={contentVariants}
                    className="analyze-btn-content flex items-center gap-1.5"
                >
                    {resolvedIcon && (
                        <span className="analyze-icon flex items-center justify-center shrink-0">
                            {resolvedIcon}
                        </span>
                    )}
                    {children}
                    {label && <span>{label}</span>}
                </motion.div>
            </AnimatePresence>
        </motion.button>
    );

    if (withWrapper) {
        return (
            <div className={`analyze-wrapper ${wrapperClassName}`}>
                {buttonContent}
            </div>
        );
    }

    return buttonContent;
};

export default AnalyzeButton;
