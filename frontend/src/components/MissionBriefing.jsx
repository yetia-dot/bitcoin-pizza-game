import React from 'react';

const MissionBriefing = ({ onClose }) => {
    return (
        <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
        }}>
            <div className="mission-modal" style={{
                background: '#000',
                border: '2px solid #0f0',
                padding: '40px',
                maxWidth: '600px',
                width: '90%',
                position: 'relative',
                boxShadow: '0 0 20px rgba(0, 255, 0, 0.3)',
                fontFamily: 'Courier New, monospace'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '10px',
                        right: '15px',
                        background: 'transparent',
                        border: 'none',
                        color: '#0f0',
                        fontSize: '24px',
                        cursor: 'pointer'
                    }}
                >
                    ×
                </button>

                <h1 style={{ color: '#0f0', textAlign: 'center', borderBottom: '1px dashed #0f0', paddingBottom: '10px' }}>
                    MISSION BRIEFING
                </h1>

                <div className="mission-content" style={{ color: '#ddd', marginTop: '20px', lineHeight: '1.6' }}>
                    <h3 style={{ color: '#fff' }}>🎯 THE OBJECTIVE</h3>
                    <p>
                        Infiltrate a <span style={{ color: '#FFD700' }}>PARLOR NODE</span>.
                        Buy enough slices to achieve <span style={{ color: '#f00' }}>51% CONSENSUS</span>.
                        Once you hit the threshold, you don't just eat the pizza—you
                        <span style={{ color: '#f00', fontWeight: 'bold' }}> OWN THE NODE</span>.
                    </p>

                    <h3 style={{ color: '#fff', marginTop: '20px' }}>📈 PROGRESSION TIERS</h3>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        <li style={{ marginBottom: '10px' }}>
                            <span style={{ color: '#0f0' }}>TIER 1 (NEWBIE):</span> 4-slice Parlors. Low risk.
                        </li>
                        <li style={{ marginBottom: '10px' }}>
                            <span style={{ color: '#FFD700' }}>TIER 2 (MANAGER):</span> 9-slice Parlors. Scaling up.
                        </li>
                        <li style={{ marginBottom: '10px' }}>
                            <span style={{ color: '#ff00ff' }}>TIER 3 (EXECUTIVE):</span> 16-slice grids. High stakes.
                        </li>
                    </ul>

                    <h3 style={{ color: '#fff', marginTop: '20px' }}>💰 THE PAYCHECK</h3>
                    <p>
                        Every slice you buy is an investment in the 51% Attack.
                        Use your <span style={{ color: '#FFD700' }}>10,000 $PZZA SIGNING BONUS</span> wisely.
                        Once the bonus is gone, you must win to earn more.
                    </p>
                </div>

                <div style={{ marginTop: '30px', textAlign: 'center' }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: '#0f0',
                            color: '#000',
                            border: 'none',
                            padding: '10px 30px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 0 10px #0f0'
                        }}
                    >
                        ACKNOWLEDGE & START
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MissionBriefing;
