import React, { Suspense, lazy } from 'react';

// Wrapper for Recharts components to allow lazy loading
const Recharts = lazy(() => import('recharts'));

const LazyChart = ({ type, data, children, ...props }) => {
    return (
        <Suspense fallback={<div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg animate-pulse text-gray-400 text-xs font-medium uppercase tracking-wider">Cargando gráfico...</div>}>
            <ChartComponent type={type} data={data} {...props}>
                {children}
            </ChartComponent>
        </Suspense>
    );
};

const ChartComponent = ({ type, data, children, ...props }) => {
    // This is a bit complex because we need the components from the lazy loaded module
    // It's actually easier to just lazy load the entire chart component in each file
    // So I'll reconsider this approach.
    return null;
};

export default LazyChart;
