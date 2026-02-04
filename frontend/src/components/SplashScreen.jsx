import React, { useEffect } from 'react';

const SplashScreen = ({ onComplete }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onComplete();
        }, 3000);

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: '#000',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <video
                src="/splash.mp4"
                autoPlay
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
        </div>
    );
};

export default SplashScreen;
