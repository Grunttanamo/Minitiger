import {
    useEffect,
    useState
} from 'react';

import { useApi } from 'hooks/useApi';

import {
    getDefaultMinitigerToolbarBranding,
    readMinitigerToolbarBranding,
    subscribeMinitigerToolbarBranding,
    type MinitigerToolbarBrandingConfig
} from '../toolbarBranding';

const useMinitigerToolbarBranding = () => {
    const {
        __legacyApiClient__: apiClient
    } = useApi();

    const [ branding, setBranding ] =
        useState<MinitigerToolbarBrandingConfig>(
            () => getDefaultMinitigerToolbarBranding()
        );

    useEffect(() => {
        const unsubscribe =
            subscribeMinitigerToolbarBranding(
                setBranding
            );

        return unsubscribe;
    }, []);

    useEffect(() => {
        if (!apiClient) {
            setBranding(
                getDefaultMinitigerToolbarBranding()
            );
            return;
        }

        let cancelled = false;

        void readMinitigerToolbarBranding(
            apiClient
        ).then(value => {
            if (cancelled) {
                return;
            }

            setBranding(
                value
                ?? getDefaultMinitigerToolbarBranding()
            );
        }).catch(error => {
            console.warn(
                '[Minitiger Branding] Toolbar konnte globale Branding-Daten nicht laden.',
                error
            );
        });

        return () => {
            cancelled = true;
        };
    }, [apiClient]);

    return branding;
};

export default useMinitigerToolbarBranding;

// MINITIGER_PATCH_MARKER: PHASE_18_13_0_TEST_STABILITY_TRANSLATOR_BACKGROUND
