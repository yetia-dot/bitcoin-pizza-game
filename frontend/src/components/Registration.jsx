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
                    <h1>👨‍🍳 CHEF REGISTRATION</h1>
                    <p style={{ color: '#aaa', marginBottom: '30px' }}>
                        Enter your alias to join the global kitchen.
                    </p>

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

                    <div className="warning-box">
                        ⚠️ CAUTION: YOUR CHEF CREDENTIALS ARE STORED IN THIS TERMINAL'S CACHE.
                        CLEARING DATA WILL FORFEIT YOUR $PZZA.
                    </div>
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
