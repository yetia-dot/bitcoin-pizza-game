import React, { useState, useEffect } from 'react';
import { getAllRooms, subscribeToRooms, checkExistingSession, createSession } from '../supabase';
import './Lobby.css';

export function Lobby({ contract, onJoinRoom, walletAddress }) {
    const [rooms, setRooms] = useState([]);
    const [newRoomName, setNewRoomName] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [password, setPassword] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [joinPassword, setJoinPassword] = useState("");
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [useSupabase, setUseSupabase] = useState(true); // Toggle for fallback

    // Fetch rooms from Supabase (real-time) or blockchain (fallback)
    useEffect(() => {
        if (useSupabase) {
            fetchRoomsFromSupabase();

            // Subscribe to real-time updates
            const subscription = subscribeToRooms((payload) => {
                console.log('🔄 Room update detected:', payload);
                fetchRoomsFromSupabase(); // Refresh on any change
            });

            return () => {
                subscription.unsubscribe();
            };
        } else {
            fetchRoomsFromBlockchain();
        }
    }, [contract, useSupabase]);

    const fetchRoomsFromSupabase = async () => {
        try {
            const supabaseRooms = await getAllRooms(true);
            setRooms(supabaseRooms.map(r => ({
                id: r.room_id,
                creator: r.creator_address,
                level: r.level,
                totalSlices: r.total_slices,
                isPrivate: r.is_private,
                currentKing: r.current_king
            })));
        } catch (error) {
            console.error('Failed to fetch from Supabase, falling back to blockchain:', error);
            setUseSupabase(false); // Fallback to blockchain
        }
    };

    const fetchRoomsFromBlockchain = async () => {
        if (!contract) return;
        try {
            const roomIds = await contract.getAllRooms();
            const loadedRooms = [];

            for (let id of roomIds) {
                const r = await contract.rooms(id);
                loadedRooms.push({
                    id: id,
                    creator: r[1],
                    level: r[2],
                    totalSlices: r[3],
                    isPrivate: r[4]
                });
            }
            setRooms(loadedRooms);
        } catch (err) {
            console.error("Error fetching rooms:", err);
        }
    };

    const handleCreate = async () => {
        if (!newRoomName) return;
        if (isPrivate && !password) {
            alert("Private nodes require an ACCESS KEY!");
            return;
        }

        setIsCreating(true);
        try {
            console.log("Deploying node:", newRoomName, isPrivate);
            const tx = await contract.createRoom(newRoomName, isPrivate, isPrivate ? password : "");
            await tx.wait();

            console.log("✅ Room created on blockchain");
            // Event listener will sync to Supabase automatically

            setNewRoomName("");
            setPassword("");
            setIsPrivate(false);

            // Refresh rooms (Supabase subscription should handle this, but force refresh for immediate feedback)
            if (useSupabase) {
                setTimeout(fetchRoomsFromSupabase, 1000);
            } else {
                fetchRoomsFromBlockchain();
            }
        } catch (err) {
            console.error("Failed to deploy node:", err);
            alert("Failed to deploy node. Identifier taken?");
        } finally {
            setIsCreating(false);
        }
    };

    const handleJoinAttempt = async (room) => {
        // Check for Sybil attack (same IP already in room)
        if (useSupabase) {
            try {
                const hasExistingSession = await checkExistingSession(room.id);
                if (hasExistingSession) {
                    alert("⚠️  SECURITY ALERT: Another agent from your network is already infiltrating this parlor!");
                    return;
                }
            } catch (error) {
                console.warn("Sybil check failed, proceeding anyway:", error);
            }
        }

        if (room.isPrivate) {
            setSelectedRoom(room.id);
            setJoinPassword("");
        } else {
            joinRoom(room.id);
        }
    };

    const confirmJoinPrivate = async () => {
        try {
            const isValid = await contract.verifyRoomPassword(selectedRoom, joinPassword);
            if (isValid) {
                joinRoom(selectedRoom);
                setSelectedRoom(null);
            } else {
                alert("ACCESS DENIED: INVALID KEYCODE");
            }
        } catch (e) {
            console.error(e);
            alert("Error verifying key");
        }
    };

    const joinRoom = async (roomId) => {
        // Create session in Supabase
        if (useSupabase) {
            try {
                await createSession(walletAddress, roomId)
                console.log("✅ Session created in Supabase")
            } catch (error) {
                console.warn("Failed to create session:", error)
            }
        }

        onJoinRoom(roomId)
    }

    return (
        <div className="lobby-container">
            {/* SECTION A: FRANCHISE OFFICE (CREATE) */}
            <div className="lobby-section create-section" style={{ borderBottom: '2px dashed #444', paddingBottom: '30px', marginBottom: '30px' }}>
                <h2 style={{ color: '#FFD700', textShadow: '0 0 10px #FFD700' }}>🏢 THE FRANCHISE OFFICE</h2>
                <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '20px' }}>
                    Become an <span style={{ color: '#fff', fontWeight: 'bold' }}>OWNER</span>. Deploy a node. Set the rules.
                    <br />
                    Owners control the Invite Key and watch the takeover happen.
                </p>

                <div className="create-row" style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                        <input
                            className="lobby-input scanline-text"
                            type="text"
                            placeholder="PARLOR NAME (e.g. THE GENESIS CRUST)"
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value.toUpperCase())}
                            maxLength={20}
                            style={{ width: '100%', marginBottom: '10px' }}
                        />

                        <div className="create-options">
                            <label className="privacy-label" style={{ color: isPrivate ? '#ff00ff' : '#888', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                                <input
                                    className="privacy-input"
                                    type="checkbox"
                                    checked={isPrivate}
                                    onChange={(e) => setIsPrivate(e.target.checked)}
                                />
                                {isPrivate ? "🔒 PRIVATE KEY-LOCKED" : "🔓 PUBLIC ACCESS"}
                            </label>
                        </div>
                    </div>

                    {isPrivate && (
                        <input
                            className="lobby-input scanline-text"
                            type="password"
                            placeholder="SET ACCESS KEY"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ border: '1px solid #ff00ff', color: '#ff00ff', flex: 1 }}
                        />
                    )}

                    <button className="lobby-btn" onClick={handleCreate} disabled={isCreating || !newRoomName}
                        style={{ background: '#FFD700', color: '#000', border: 'none', fontWeight: 'bold', padding: '15px 30px' }}>
                        {isCreating ? "DEPLOYING NODE..." : "FOUND NEW PARLOR"}
                    </button>
                </div>
            </div>

            {/* SECTION B: ACTIVE PARLORS (LIST) */}
            <div className="lobby-section list-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h2 style={{ color: '#0f0', textShadow: '0 0 10px #0f0', margin: 0 }}>📡 ACTIVE PARLORS</h2>
                    <div style={{ fontSize: '10px', color: '#555' }}>
                        {useSupabase ? '🟢 REAL-TIME MODE' : '🔴 BLOCKCHAIN FALLBACK'}
                    </div>
                </div>
                <div className="room-list">
                    {rooms.length === 0 ? (
                        <p className="no-rooms blinking-text">SCANNING NETWORK FOR ACTIVE NODES...</p>
                    ) : (
                        rooms.map((room) => (
                            <div key={room.id} className="room-card" style={{
                                borderColor: room.isPrivate ? '#ff00ff' : '#0f0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '15px',
                                background: '#111',
                                marginBottom: '10px',
                                borderLeft: `5px solid ${room.isPrivate ? '#ff00ff' : '#0f0'}`
                            }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span className="room-name" style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>
                                            {room.id}
                                        </span>
                                        {room.isPrivate ? <span title="Locked">🔒</span> : <span title="Open 24/7" style={{ fontSize: '12px', background: '#0f0', color: '#000', padding: '2px 5px' }}>OPEN 24/7</span>}
                                        {room.currentKing && <span title="Current King" style={{ fontSize: '12px' }}>👑</span>}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                                        OWNER: <span style={{ color: '#bbb' }}>{room.creator.substring(0, 6)}...{room.creator.substring(38)}</span>
                                        <span style={{ margin: '0 10px' }}>|</span>
                                        STATUS: <span style={{ color: '#bbb' }}>LVL {Number(room.level)}</span>
                                        <span style={{ margin: '0 10px' }}>|</span>
                                        POPULATION: <span style={{ color: '#bbb' }}>{Number(room.totalSlices)} SLICES</span>
                                    </div>
                                </div>

                                <button className="join-btn" onClick={() => handleJoinAttempt(room)}
                                    style={{
                                        borderColor: room.isPrivate ? '#ff00ff' : '#0f0',
                                        color: room.isPrivate ? '#ff00ff' : '#0f0',
                                        background: 'transparent',
                                        border: '1px solid',
                                        padding: '10px 20px',
                                        cursor: 'pointer'
                                    }}>
                                    {room.isPrivate ? "INPUT KEY" : "ENTER PARLOR"}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {selectedRoom && (
                <div className="modal-overlay">
                    <div className="modal" style={{ border: '2px solid #ff00ff', background: '#000', padding: '30px' }}>
                        <h3 style={{ color: '#ff00ff' }}>🔐 ENCRYPTED PARLOR DETECTED</h3>
                        <p style={{ color: '#fff', marginBottom: '20px' }}>Target: {selectedRoom}</p>
                        <input
                            className="lobby-input"
                            type="password"
                            value={joinPassword}
                            onChange={(e) => setJoinPassword(e.target.value)}
                            placeholder="ENTER ACCESS KEY"
                            style={{ marginBottom: '20px', width: '100%', borderColor: '#ff00ff', color: '#ff00ff' }}
                        />
                        <div className="modal-actions" style={{ display: 'flex', gap: '10px' }}>
                            <button className="lobby-btn" onClick={confirmJoinPrivate} style={{ flex: 1, background: '#ff00ff', color: '#000' }}>DECRYPT & ENTER</button>
                            <button className="lobby-btn" onClick={() => setSelectedRoom(null)} style={{ flex: 1, borderColor: '#f00', color: '#f00' }}>ABORT</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
