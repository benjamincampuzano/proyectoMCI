import React, { useState, useEffect } from 'react';

const MobileDebugger = () => {
    const [touchSupport, setTouchSupport] = useState(false);
    const [events, setEvents] = useState([]);
    const [deviceInfo, setDeviceInfo] = useState({});

    useEffect(() => {
        // Detectar soporte touch
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        setTouchSupport(hasTouch);

        // Información del dispositivo
        setDeviceInfo({
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            touchPoints: navigator.maxTouchPoints,
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
            isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
            isAndroid: /Android/.test(navigator.userAgent)
        });

        // Detectar eventos touch
        const handleTouchStart = (e) => {
            addEvent('touchstart', e);
        };

        const handleTouchEnd = (e) => {
            addEvent('touchend', e);
        };

        const handleTouchMove = (e) => {
            addEvent('touchmove', e);
        };

        const handleClick = (e) => {
            addEvent('click', e);
        };

        const addEvent = (type, e) => {
            const event = {
                type,
                timestamp: new Date().toLocaleTimeString(),
                target: e.target?.tagName || 'unknown',
                className: e.target?.className || 'none',
                id: e.target?.id || 'none'
            };
            
            setEvents(prev => [event, ...prev.slice(0, 9)]); // Mantener últimos 10 eventos
        };

        // Agregar listeners
        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        document.addEventListener('click', handleClick, { passive: true });

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchend', handleTouchEnd);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('click', handleClick);
        };
    }, []);

    useEffect(() => {
        // Detectar el error específico de touch events
        const originalConsoleError = console.error;
        console.error = (...args) => {
            const message = args.join(' ');
            if (message.includes('Touch events not supported')) {
                setEvents(prev => [{
                    type: 'ERROR',
                    timestamp: new Date().toLocaleTimeString(),
                    message: 'Touch events not supported detected',
                    details: message
                }, ...prev.slice(0, 9)]);
            }
            originalConsoleError.apply(console, args);
        };

        return () => {
            console.error = originalConsoleError;
        };
    }, []);

    if (import.meta.env.PROD) {
        return null; // No mostrar en producción
    }

    return (
        <div style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '10px',
            borderRadius: '8px',
            fontSize: '12px',
            zIndex: 9999,
            maxWidth: '300px',
            maxHeight: '400px',
            overflow: 'auto'
        }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#4CAF50' }}>📱 Mobile Debugger</h4>
            
            <div style={{ marginBottom: '10px' }}>
                <strong>Touch Support:</strong> {touchSupport ? '✅ Yes' : '❌ No'}
            </div>
            
            <div style={{ marginBottom: '10px', fontSize: '11px' }}>
                <strong>Device Info:</strong>
                <div>Platform: {deviceInfo.platform}</div>
                <div>Mobile: {deviceInfo.isMobile ? '✅' : '❌'}</div>
                <div>iOS: {deviceInfo.isIOS ? '✅' : '❌'}</div>
                <div>Android: {deviceInfo.isAndroid ? '✅' : '❌'}</div>
                <div>Touch Points: {deviceInfo.touchPoints}</div>
            </div>
            
            <div>
                <strong>Recent Events:</strong>
                {events.length === 0 ? (
                    <div style={{ fontSize: '11px', opacity: 0.7 }}>No events yet...</div>
                ) : (
                    events.map((event, index) => (
                        <div key={index} style={{ 
                            fontSize: '10px', 
                            marginBottom: '4px',
                            borderBottom: '1px solid rgba(255,255,255,0.2)',
                            paddingBottom: '2px'
                        }}>
                            <span style={{ color: event.type === 'ERROR' ? '#ff6b6b' : '#4CAF50' }}>
                                [{event.timestamp}] {event.type}
                            </span>
                            {event.message && <div>{event.message}</div>}
                            {event.target && <div>Target: {event.target}</div>}
                        </div>
                    ))
                )}
            </div>
            
            <button 
                onClick={() => setEvents([])}
                style={{
                    marginTop: '10px',
                    padding: '4px 8px',
                    background: '#4CAF50',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                    fontSize: '10px',
                    cursor: 'pointer'
                }}
            >
                Clear Events
            </button>
        </div>
    );
};

export default MobileDebugger;
