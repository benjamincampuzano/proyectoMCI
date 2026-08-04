import React, { useEffect, useRef } from 'react';
import { useLoading } from '../context/LoadingContext';

const TransitionLoader = () => {
    const { startLoading, stopLoading, updateProgress } = useLoading();

    const loadingRef = useRef({ startLoading, stopLoading, updateProgress });

    useEffect(() => {
        const { startLoading: start, stopLoading: stop, updateProgress: update } = loadingRef.current;
        start();

        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 30;
            if (progress > 95) {
                progress = 95;
                clearInterval(interval);
            }
            update(Math.floor(progress));
        }, 200);

        return () => {
            clearInterval(interval);
            stop();
        };
    }, []);

    return null; // The LoadingOverlay handles the UI
};

export default TransitionLoader;
