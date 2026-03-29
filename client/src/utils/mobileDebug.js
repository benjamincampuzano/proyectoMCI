// Mobile debugging utilities for Chrome mobile issues
export const mobileDebug = {
  // Log mobile-specific information
  logMobileInfo() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    
    console.log('=== Mobile Debug Info ===');
    console.log('User Agent:', navigator.userAgent);
    console.log('Is Mobile:', isMobile);
    console.log('Is Chrome:', isChrome);
    console.log('Screen Width:', window.screen.width);
    console.log('Screen Height:', window.screen.height);
    console.log('Viewport Width:', window.innerWidth);
    console.log('Viewport Height:', window.innerHeight);
    console.log('Device Pixel Ratio:', window.devicePixelRatio);
    console.log('Touch Support:', 'ontouchstart' in window);
    console.log('========================');
  },

  // Check for common mobile issues
  checkMobileIssues() {
    const issues = [];
    
    // Check viewport
    if (window.innerWidth < 360) {
      issues.push('Viewport too narrow (< 360px)');
    }
    
    // Check touch issues
    if (!('ontouchstart' in window)) {
      issues.push('Touch events not supported');
    }
    
    // Check storage
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
    } catch (e) {
      issues.push('LocalStorage not available: ' + e.message);
    }
    
    // Check console availability
    if (!console.error) {
      issues.push('Console.error not available');
    }
    
    if (issues.length > 0) {
      console.error('Mobile Issues Detected:', issues);
    }
    
    return issues;
  },

  // Initialize mobile debugging
  init() {
    this.logMobileInfo();
    this.checkMobileIssues();
    
    // Log navigation changes
    let lastPath = window.location.pathname;
    const checkNavigation = () => {
      if (window.location.pathname !== lastPath) {
        console.log('Navigation changed from', lastPath, 'to', window.location.pathname);
        lastPath = window.location.pathname;
      }
    };
    
    // Check navigation every second
    setInterval(checkNavigation, 1000);
    
    // Log errors globally
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
    });
  }
};

export default mobileDebug;
