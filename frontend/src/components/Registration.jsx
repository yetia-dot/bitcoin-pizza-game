import React, { useState } from 'react';

export function Registration({ onRegister, isRegistering }) {
    const [username, setUsername] = useState("");

    const handleSubmit = () => {
        if (!username.trim()) return;
        onRegister(username);
    };

    return (
        <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>
            <h1>👨‍🍳 CHEF REGISTRATION</h1>
            <p style={{ color: '#aaa', marginBottom: '30px' }}>
                Enter your alias to join the global kitchen.
            </p>

            <div className="registration-box" style={{ maxWidth: '400px', margin: '0 auto' }}>
                <input
                    type="text"
                    maxLength="20"
                    placeholder="ENTER CHEF NAME"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toUpperCase())}
                    style={{
                        width: '100%',
                        padding: '15px',
                        fontSize: '18px',
                        textAlign: 'center',
                        marginBottom: '20px',
                        background: '#000',
                        border: '2px solid #555',
                        color: '#fff',
                        fontFamily: 'monospace'
                    }}
                />

                <button
                    onClick={handleSubmit}
                    disabled={!username || isRegistering}
                    className="btn-primary"
                    style={{ width: '100%', padding: '15px', fontSize: '16px' }}
                >
                    {isRegistering ? "MINTING IDENTITY..." : "INITIALIZE CHEF"}
                </button>

                <div className="warning-box" style={{
                    marginTop: '40px',
                    border: '1px solid #ff4444',
                    padding: '15px',
                    fontSize: '10px',
                    color: '#ff4444'
                }}>
                    ⚠️ CAUTION: YOUR CHEF CREDENTIALS ARE STORED IN THIS TERMINAL'S CACHE.
                    CLEARING DATA WILL FORFEIT YOUR $PZZA.
                </div>
            </div>
        </div>
    );
}
