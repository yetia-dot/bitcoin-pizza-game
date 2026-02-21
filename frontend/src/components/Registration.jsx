import React, { useState } from 'react';
import './Registration.css';

export function Registration({ onRegister, isRegistering, walletAddress, isContractMissing }) {
    const [username, setUsername] = useState("");

    const handleSubmit = () => {
        if (!username.trim() || isContractMissing) return;
        onRegister(username);
    };

    const getButtonText = () => {
        if (isContractMissing) return "SYSTEM ERROR: DEPLOYMENT REQUIRED";
        if (isRegistering) return "AUTHORIZING...";
        return "[ AUTHORIZE & ENTER LOBBY ]";
    };

    return (
        <div className="registration-container">
            {/* LEFT/TOP: FORM */}
            <div className="registration-form-section">
                <div className="registration-content">
                    <h1>🕵️ SYNDICATE REGISTRATION</h1>
                    <p style={{ color: isContractMissing ? '#f00' : '#aaa', marginBottom: '20px', fontFamily: 'monospace' }}>
                        {isContractMissing
                            ? "ERROR: Core Logic not found. Run deployment script."
                            : "Identify yourself, Network Agent."}
                    </p>

                    <input
                        type="text"
                        maxLength="20"
                        placeholder="ENTER WORKER CALLSIGN"
                        value={username}
                        disabled={isContractMissing}
                        onChange={(e) => setUsername(e.target.value.toUpperCase())}
                        style={{
                            width: '100%',
                            padding: '15px',
                            fontSize: '18px',
                            textAlign: 'center',
                            marginBottom: '20px',
                            background: '#000',
                            border: `2px solid ${isContractMissing ? '#f00' : '#0f0'}`,
                            color: isContractMissing ? '#f00' : '#0f0',
                            fontFamily: 'Courier New, monospace',
                            boxShadow: `0 0 10px ${isContractMissing ? 'rgba(255, 0, 0, 0.2)' : 'rgba(0, 255, 0, 0.2)'}`,
                            opacity: isContractMissing ? 0.5 : 1
                        }}
                    />

                    {/* BONUS DISPLAY */}
                    <div style={{
                        margin: '20px 0',
                        padding: '15px',
                        background: 'rgba(255, 215, 0, 0.1)',
                        border: '1px dashed #FFD700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '15px',
                        opacity: isContractMissing ? 0.3 : 1
                    }}>
                        <div style={{ fontSize: '30px' }}>🪙</div>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ color: '#FFD700', fontSize: '12px', letterSpacing: '2px' }}>SIGNING BONUS</div>
                            <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>10,000 $PZZA</div>
                        </div>
                    </div>

                    <div className="terminal-status" style={{
                        marginBottom: '20px',
                        textAlign: 'left',
                        fontSize: '12px',
                        color: '#555',
                        fontFamily: 'monospace'
                    }}>
                        <p>connection: <span style={{ color: isContractMissing ? '#f00' : '#0f0' }}>{isContractMissing ? 'OFFLINE' : 'BASE_SEPOLIA_NODE_04'}</span></p>
                        <p>auth_key: <span style={{ color: '#0f0' }}>[{walletAddress?.substring(0, 8)}...{walletAddress?.substring(38)}]</span></p>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={!username || isRegistering || isContractMissing}
                        className="btn-primary"
                        style={{
                            width: '100%',
                            padding: '15px',
                            fontSize: '16px',
                            background: (isRegistering || isContractMissing) ? '#333' : '#0f0',
                            color: (isRegistering || isContractMissing) ? '#888' : '#000',
                            border: isContractMissing ? '1px solid #f00' : 'none',
                            fontWeight: 'bold',
                            cursor: (isRegistering || isContractMissing) ? 'not-allowed' : 'pointer',
                            textTransform: 'uppercase'
                        }}
                    >
                        {getButtonText()}
                    </button>
                </div>
            </div>

            {/* RIGHT/BOTTOM: VISUALS */}
            <div className="registration-visuals-section">
                <img
                    src="/pizza-box.png"
                    alt="Pizza Box"
                    className="pizza-box-img"
                />

                {/* Decoration: Popping Items */}
                {/* We can hardcode a few with inline styles for random positions/delays to keep it simple */}
                {[...Array(6)].map((_, i) => {
                    const isSlice = i % 2 === 0;
                    const rTop = Math.floor(Math.random() * 80) + 10; // 10% to 90%
                    const rLeft = Math.floor(Math.random() * 80) + 10;
                    // Random translation direction for pop effect
                    const tx = (Math.random() - 0.5) * 200 + 'px';
                    const ty = (Math.random() - 0.5) * 200 + 'px';
                    const delay = Math.random() * 2 + 's';

                    return (
                        <img
                            key={i}
                            src={isSlice ? "/slice.png" : "/pzza-coin.png"}
                            alt="decoration"
                            className={`pop-icon ${isSlice ? 'pop-slice' : 'pop-coin'}`}
                            style={{
                                top: `${rTop}%`,
                                left: `${rLeft}%`,
                                '--tx': tx,
                                '--ty': ty,
                                animationDelay: delay
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
}
