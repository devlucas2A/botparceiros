import { useSyncExternalStore } from 'react';
import { useReducedMotion } from 'framer-motion';

const emptySubscribe = () => () => {};

/**
 * Wrapper for Framer Motion's useReducedMotion that respects SSR
 * and avoids hydration mismatch errors.
 * Returns false during SSR, then resolves to the actual value.
 */
export function useReducedMotionSafe() {
    const prefersReducedMotion = useReducedMotion();
    const isClient = useSyncExternalStore(
        emptySubscribe,
        () => true,
        () => false
    );

    return isClient ? prefersReducedMotion : false;
}
