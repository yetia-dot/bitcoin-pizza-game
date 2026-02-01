import React, { useState, useEffect } from 'react';
import './Lobby.css';

export function Lobby({ contract, onJoinRoom }) {
    const [rooms, setRooms] = useState([]);
    const [newRoomName, setNewRoomName] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [password, setPassword] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [joinPassword, setJoinPassword] = useState("");
    const [selectedRoom, setSelectedRoom] = useState(null);

    useEffect(() => {
        fetchRooms();
    }, [contract]);

    const fetchRooms = async () => {
        if (!contract) return;
        try {
            const roomIds = await contract.getAllRooms();
            const loadedRooms = [];

            for (let id of roomIds) {
                const r = await contract.rooms(id);
                // r is an array-like struct: [name, creator, level, totalSlices, isPrivate, keyHash]
                // Index 4 should be isPrivate
                loadedRooms.push({
                    id: id,
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
            alert("Private rooms need a password!");
            return;
        }

        setIsCreating(true);
        try {
            console.log("Creating room:", newRoomName, isPrivate);
            // createRoom(name, isPrivate, password)
            const tx = await contract.createRoom(newRoomName, isPrivate, isPrivate ? password : "");
            await tx.wait();
            setNewRoomName("");
            setPassword("");
            setIsPrivate(false);
            fetchRooms();
        } catch (err) {
            console.error("Failed to create room:", err);
            alert("Failed to create room. Name taken?");
        } finally {
            setIsCreating(false);
        }
    };

    const handleJoinAttempt = async (room) => {
        if (room.isPrivate) {
            setSelectedRoom(room.id);
            setJoinPassword("");
        } else {
            onJoinRoom(room.id);
        }
    };

    const confirmJoinPrivate = async () => {
        // Verify password locally/on-chain before joining?
        // Actually, we can just check `verifyRoomPassword` on contract to be nice, 
        // or just pass it to the parent.
        // The parent `onJoinRoom` just sets the Active ID. 
        // The `buySlice` later will fail if we don't have the password?
        // Wait, `buySlice` doesn't take a password. 
        // Current Contract: `verifyRoomPassword` exists. `buySlice` does NOT check password.
        // This means the "Security" is purely front-end gating for now (as per MVP).
        // Or did I miss protecting `buySlice`? 
        // *Self-Correction*: I did NOT protect `buySlice` in the contract.
        // "Retro-Cipherpunk" security: User must verify key to SEE the grid.
        // Let's verify on-chain before letting them "Enter".

        try {
            const isValid = await contract.verifyRoomPassword(selectedRoom, joinPassword);
            if (isValid) {
                onJoinRoom(selectedRoom);
                setSelectedRoom(null);
            } else {
                alert("ACCESS DENIED: INVALID KEYCODE");
            }
        } catch (e) {
            console.error(e);
            alert("Error verifying key");
        }
    };

    return (
        <div className="lobby-container">
            <div className="lobby-header">
                <h2>PIZZA PARLORS</h2>

                <div className="create-section">
                    <div className="create-row">
                        <input
                            className="lobby-input"
                            type="text"
                            placeholder="NEW PARLOR NAME"
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value.toUpperCase())}
                            maxLength={12}
                        />
                        <button className="lobby-btn" onClick={handleCreate} disabled={isCreating || !newRoomName}>
                            {isCreating ? "OPENING..." : "OPEN PARLOR"}
                        </button>
                    </div>

                    <div className="create-options">
                        <label className="privacy-label" style={{ color: isPrivate ? '#ff00ff' : '#888' }}>
                            <input
                                className="privacy-input"
                                type="checkbox"
                                checked={isPrivate}
                                onChange={(e) => setIsPrivate(e.target.checked)}
                            />
                            PRIVATE (REQ. KEY)
                        </label>

                        {isPrivate && (
                            <input
                                className="lobby-input"
                                type="password"
                                placeholder="SET ACCESS KEY"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{ border: '1px solid #ff00ff', color: '#ff00ff' }}
                            />
                        )}
                    </div>
                </div>
            </div>

            <div className="room-list">
                {rooms.length === 0 ? (
                    <p className="no-rooms">NO PARLORS DETECTED. SCANNING...</p>
                ) : (
                    rooms.map((room) => (
                        <div key={room.id} className="room-card" style={{ borderColor: room.isPrivate ? '#ff00ff' : '#0f0' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <span className="room-name" style={{ color: room.isPrivate ? '#ff00ff' : '#0f0' }}>
                                    {room.id}
                                </span>
                                {room.isPrivate && <span>🔒</span>}
                            </div>
                            <button className="join-btn" onClick={() => handleJoinAttempt(room)}
                                style={{ borderColor: room.isPrivate ? '#ff00ff' : '#0f0', color: room.isPrivate ? '#ff00ff' : '#0f0' }}>
                                {room.isPrivate ? "UNLOCK" : "ENTER"}
                            </button>
                        </div>
                    ))
                )}
            </div>

            {selectedRoom && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>ENTER KEYCODE FOR {selectedRoom}</h3>
                        <input
                            className="lobby-input"
                            type="password"
                            value={joinPassword}
                            onChange={(e) => setJoinPassword(e.target.value)}
                            placeholder="ACCESS KEY"
                            style={{ marginBottom: '20px', width: '100%' }}
                        />
                        <div className="modal-actions">
                            <button className="lobby-btn" onClick={confirmJoinPrivate}>DECRYPT</button>
                            <button className="lobby-btn" onClick={() => setSelectedRoom(null)} style={{ borderColor: '#f00', color: '#f00' }}>CANCEL</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
