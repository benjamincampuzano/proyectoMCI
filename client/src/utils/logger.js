// Disable all console logs in production
const disableLogs = () => {
  if (import.meta.env.PROD) {
    const originalConsole = { ...console };
    
    // Override all console methods
    console.log = () => {};
    console.info = () => {};
    console.debug = () => {};
    console.warn = () => {};
    console.error = () => {};
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
