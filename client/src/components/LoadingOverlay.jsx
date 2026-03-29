import React, { useEffect, useState } from 'react';
import { useLoading } from '../context/LoadingContext';
import logo from '../assets/logo.jpg';

const LoadingOverlay = () => {
    const { isLoading, progress } = useLoading();
    const [displayProgress, setDisplayProgress] = useState(0);

    // Smoothly animate the progress number
    useEffect(() => {
        if (isLoading) {
            const timer = setInterval(() => {
                setDisplayProgress(prev => {
                    if (prev < progress) return prev + 1;
                    if (prev > progress) return progress;
                    return prev;
                });
            }, 10);
            return () => clearInterval(timer);
        } else {
            setDisplayProgress(0);
        }
    }, [isLoading, progress]);

    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md transition-opacity duration-500">
            <div className="relative w-32 h-32 sm:w-48 sm:h-48 mb-8">
                {/* Outer Glow Animation */}
                <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping"></div>

                {/* Rotating Progress Ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle
                        cx="50%"
                        cy="50%"
                        r="45%"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-slate-700"
                    />
                    <circle
                        cx="50%"
                        cy="50%"
                        r="45%"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={`${2 * Math.PI * 0.45}`}
                        strokeDashoffset={`${2 * Math.PI * 0.45 * (1 - displayProgress / 100)}`}
                        strokeLinecap="round"
                        className="text-blue-500 transition-all duration-300 ease-out"
                    />
                </svg>

                {/* Central Logo */}
                <div className="absolute inset-2 sm:inset-4 rounded-full overflow-hidden bg-white shadow-xl animate-pulse">
                    <img
                        src={logo}
                        alt="Logo"
                        className="w-full h-full object-cover"
                    />
                </div>
            </div>

            {/* Percentage Text */}
            <div className="text-center px-4">
                <h2 className="text-2xl sm:text-4xl font-bold text-white mb-2 tabular-nums">
                    {displayProgress}%
                </h2>
                <p className="text-blue-200 text-sm sm:text-lg font-medium animate-pulse">
                    Cargando la página web...
                </p>
                <p className="text-slate-400 text-xs sm:text-sm mt-1">
                    Actualizando la informacion, ten paciencia.
                </p>
            </div>

            {/* Subtle bottom progress bar */}
            <div className="fixed bottom-0 left-0 w-full h-1 bg-slate-800">
                <div
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-500 ease-out"
                    style={{ width: `${displayProgress}%` }}
                ></div>
            </div>
        </div>
    );
};

export default LoadingOverlay;
