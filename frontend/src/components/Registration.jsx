import React, { useState } from 'react';
import './Registration.css';

export function Registration({ onRegister, isRegistering }) {
    const [username, setUsername] = useState("");

    const handleSubmit = () => {
        if (!username.trim()) return;
        onRegister(username);
    };

    return (
        <div className="registration-container">
            {/* LEFT/TOP: FORM */}
            <div className="registration-form-section">
                <div className="registration-content">
                    <h1>🕵️ SYNDICATE REGISTRATION</h1>
                    <p style={{ color: '#aaa', marginBottom: '20px', fontFamily: 'monospace' }}>
                        Identify yourself, Network Agent.
                    </p>

                    <input
                        type="text"
                        maxLength="20"
                        placeholder="ENTER WORKER CALLSIGN"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toUpperCase())}
                        style={{
                            width: '100%',
                            padding: '15px',
                            fontSize: '18px',
                            textAlign: 'center',
                            marginBottom: '20px',
                            background: '#000',
                            border: '2px solid #0f0',
                            color: '#0f0',
                            fontFamily: 'Courier New, monospace',
                            boxShadow: '0 0 10px rgba(0, 255, 0, 0.2)'
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
                        gap: '15px'
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
                        <p>connection: <span style={{ color: '#0f0' }}>BASE_SEPOLIA_NODE_04</span></p>
                        <p>auth_key: <span style={{ color: '#0f0' }}>[0x...3FF5]</span></p>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={!username || isRegistering}
                        className="btn-primary"
                        style={{
                            width: '100%',
                            padding: '15px',
                            fontSize: '16px',
                            background: isRegistering ? '#333' : '#0f0',
                            color: isRegistering ? '#888' : '#000',
                            border: 'none',
                            fontWeight: 'bold',
                            cursor: isRegistering ? 'not-allowed' : 'pointer',
                            textTransform: 'uppercase'
                        }}
                    >
                        {isRegistering ? "AUTHORIZING..." : "[ AUTHORIZE & ENTER LOBBY ]"}
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
