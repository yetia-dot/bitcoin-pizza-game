import React, { useState, useEffect } from 'react';

const LoadingScreen = ({ isReady, onComplete }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let interval;

        if (progress < 90) {
            // Simulate loading up to 90%
            interval = setInterval(() => {
                setProgress(prev => Math.min(prev + Math.random() * 5, 90));
            }, 100);
        } else if (isReady && progress >= 90 && progress < 100) {
            // If app is ready, quickly finish to 100%
            interval = setInterval(() => {
                setProgress(prev => Math.min(prev + 5, 100));
            }, 50);
        } else if (progress >= 100) {
            // Animation complete
            setTimeout(onComplete, 200); // Short delay before unmounting
        }

        return () => clearInterval(interval);
    }, [progress, isReady, onComplete]);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9998, // Below splash (9999) but above content
            backgroundColor: 'transparent' // Global background handles this
        }}>
            <img
                src="/loading.png"
                alt="Loading..."
                style={{
                    maxWidth: '300px',
                    marginBottom: '20px',
                    animation: 'pulse 2s infinite' // Simple pulse animation
                }}
            />

            {/* Progress Bar Container */}
            <div style={{
                width: '300px',
                height: '10px',
                backgroundColor: '#333',
                borderRadius: '5px',
                overflow: 'hidden',
                border: '1px solid #555'
            }}>
                {/* Green Progress Bar */}
                <div style={{
                    width: `${progress}%`,
                    height: '100%',
                    backgroundColor: '#4CAF50', // Green
                    transition: 'width 0.2s ease-out'
                }} />
            </div>

            <p style={{ marginTop: '10px', color: '#888', fontSize: '12px' }}>
                LOADING ASSETS... {Math.round(progress)}%
            </p>

            <style>{`
        @keyframes pulse {
          0% { opacity: 0.8; transform: scale(0.98); }
          50% { opacity: 1; transform: scale(1.02); }
          100% { opacity: 0.8; transform: scale(0.98); }
        }
      `}</style>
        </div>
    );
};

export default LoadingScreen;
