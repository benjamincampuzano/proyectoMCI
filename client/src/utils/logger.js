// Disable console logs in production but keep errors for debugging
const disableLogs = () => {
  if (import.meta.env.PROD) {
    const originalConsole = { ...console };
    
    // Override only non-error console methods in production
    console.log = () => {};
    console.info = () => {};
    console.debug = () => {};
    console.warn = () => {};
    // Keep console.error for debugging mobile issues
    console.trace = () => {};
    console.group = () => {};
    console.groupEnd = () => {};
    console.groupCollapsed = () => {};
    console.table = () => {};
    console.clear = () => {};
    console.count = () => {};
    console.countReset = () => {};
    console.time = () => {};
    console.timeEnd = () => {};
    console.timeLog = () => {};
    console.assert = () => {};
    console.dir = () => {};
    console.dirxml = () => {};
    
    // Store original console for debugging if needed
    console.original = originalConsole;
  }
};

// For development, we can still enable/disable logs with a flag
if (import.meta.env.DEV && import.meta.env.VITE_DISABLE_LOGS === 'true') {
  disableLogs();
} else if (import.meta.env.PROD) {
  disableLogs();
}

export default disableLogs;
