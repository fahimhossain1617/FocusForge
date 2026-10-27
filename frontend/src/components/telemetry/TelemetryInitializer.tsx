'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { telemetryClient } from '@/services/telemetry/telemetryClient';

/**
 * Completely silent telemetry initializer.
 * Renders null - zero UI footprint, zero banners, badges, or popups.
 * Safe failure isolation: all tracking is internal try/catch.
 */
export default function TelemetryInitializer() {
    const { isGuest, user } = useAuth();
    const initializedRef = useRef(false);

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        telemetryClient.init(isGuest);

        if (user?.id) {
            telemetryClient.trackSessionStart(user.id);
        } else if (isGuest) {
            telemetryClient.trackSessionStart();
        }

        const handleBeforeUnload = () => {
            telemetryClient.trackSessionEnd();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isGuest, user?.id]);

    return null;
}
