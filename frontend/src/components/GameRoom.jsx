import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { getRoomSlices, subscribeToSlices } from '../supabase'
import './GameRoom.css'

export function GameRoom({ contract, roomId, walletAddress, onLeaveRoom }) {
    const [slices, setSlices] = useState([])
    const [gridSize, setGridSize] = useState(16) // Default 4x4
    const [roomData, setRoomData] = useState(null)
    const [kingAddress, setKingAddress] = useState(null)
    const [userSliceCount, setUserSliceCount] = useState(0)
    const [isPurchasing, setIsPurchasing] = useState(false)

    // Fetch initial room data and grid size
    useEffect(() => {
        if (!contract || !roomId) return

        const fetchRoomData = async () => {
            try {
                const room = await contract.rooms(roomId)
                setRoomData(room)

                // Calculate grid size based on level
                const level = Number(room.level)
                const size = getGridSize(level)
                setGridSize(size)

                // Get current king
                const king = await contract.roomKings(roomId)
                if (king !== ethers.ZeroAddress) {
                    setKingAddress(king)
                }
            } catch (error) {
                console.error('Failed to fetch room data:', error)
            }
        }

        fetchRoomData()
    }, [contract, roomId])

    // Helper function to calculate grid size (matches contract logic)
    const getGridSize = (level) => {
        if (level === 1) return 16  // 4x4
        if (level === 2) return 36  // 6x6
        if (level === 3) return 64  // 8x8
        return 100 // 10x10 for level 4+
    }

    // Fetch initial slices from Supabase
    useEffect(() => {
        if (!roomId) return

        const fetchSlices = async () => {
            try {
                const roomSlices = await getRoomSlices(roomId)

                // Create a map of slice ownership
                const sliceMap = Array(gridSize).fill(null)
                roomSlices.forEach(slice => {
                    sliceMap[slice.slice_id] = slice.owner_address
                })

                setSlices(sliceMap)

                // Count user's slices
                const userCount = roomSlices.filter(
                    s => s.owner_address?.toLowerCase() === walletAddress?.toLowerCase()
                ).length
                setUserSliceCount(userCount)
            } catch (error) {
                console.warn('Failed to fetch slices, using empty grid:', error)
                setSlices(Array(gridSize).fill(null))
            }
        }

        fetchSlices()
    }, [roomId, gridSize, walletAddress])

    // Subscribe to real-time slice updates
    useEffect(() => {
        if (!roomId) return

        console.log('🔔 Subscribing to real-time slice updates for:', roomId)

        const subscription = subscribeToSlices(roomId, (payload) => {
            console.log('🔄 Slice update detected:', payload)

            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const { slice_id, owner_address } = payload.new

                setSlices(prev => {
                    const updated = [...prev]
                    updated[slice_id] = owner_address
                    return updated
                })

                // Update user slice count
                if (owner_address?.toLowerCase() === walletAddress?.toLowerCase()) {
                    setUserSliceCount(prev => prev + 1)
                }
            }
        })

        return () => {
            console.log('🔕 Unsubscribing from slice updates')
            subscription.unsubscribe()
        }
    }, [roomId, walletAddress])

    // Handle slice purchase
    const handleBuySlice = async (sliceId) => {
        if (!contract || isPurchasing) return
        if (slices[sliceId]) {
            alert('This slice is already owned!')
            return
        }

        setIsPurchasing(true)
        try {
            console.log(`Purchasing slice #${sliceId} in room "${roomId}"`)
            const tx = await contract.buySlice(roomId, sliceId)
            await tx.wait()
            console.log('✅ Slice purchased! Event listener will sync to Supabase.')
        } catch (error) {
            console.error('Failed to purchase slice:', error)
            alert('Purchase failed. Check your $PZZA balance and gas.')
        } finally {
            setIsPurchasing(false)
        }
    }

    // Calculate takeover progress
    const winThreshold = Math.floor(gridSize / 2) + 1
    const progressPercent = Math.min((userSliceCount / winThreshold) * 100, 100)
    const isKing = kingAddress?.toLowerCase() === walletAddress?.toLowerCase()

    // Get color for slice owner
    const getSliceColor = (ownerAddress) => {
        if (!ownerAddress) return '#111' // Empty
        if (ownerAddress.toLowerCase() === walletAddress?.toLowerCase()) {
            return '#0f0' // User's slices = green
        }
        if (ownerAddress.toLowerCase() === kingAddress?.toLowerCase()) {
            return '#FFD700' // King's slices = gold
        }
        return '#ff00ff' // Other players = magenta
    }

    const gridDimension = Math.sqrt(gridSize)

    return (
        <div className="game-room-container">
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#0f0' }}>🍕 PARLOR: {roomId}</h2>
                    <p style={{ margin: '5px 0', fontSize: '12px', color: '#888' }}>
                        Level {roomData ? Number(roomData.level) : '?'} | Grid: {gridDimension}x{gridDimension}
                    </p>
                </div>
                <button onClick={onLeaveRoom} className="btn-retreat">
                    ← RETREAT TO LOBBY
                </button>
            </div>

            {/* TAKEOVER PROGRESS */}
            <div className="takeover-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ color: '#0f0', fontWeight: 'bold' }}>
                        YOUR CONTROL: {userSliceCount} / {winThreshold}
                    </span>
                    {isKing && <span style={{ color: '#FFD700', fontSize: '20px' }}>👑 YOU ARE KING</span>}
                </div>
                <div className="progress-bar">
                    <div
                        className="progress-fill"
                        style={{
                            width: `${progressPercent}%`,
                            background: isKing ? '#FFD700' : '#0f0'
                        }}
                    />
                </div>
                <p style={{ fontSize: '10px', color: '#555', marginTop: '5px' }}>
                    {progressPercent >= 100 ? '🚨 51% ATTACK SUCCESSFUL!' : `${(100 - progressPercent).toFixed(1)}% until takeover`}
                </p>
            </div>

            {/* GRID */}
            <div
                className="pizza-grid"
                style={{
                    gridTemplateColumns: `repeat(${gridDimension}, 1fr)`,
                    gridTemplateRows: `repeat(${gridDimension}, 1fr)`
                }}
            >
                {slices.map((owner, index) => (
                    <div
                        key={index}
                        className={`slice ${!owner ? 'available' : ''} ${isPurchasing ? 'disabled' : ''}`}
                        style={{
                            background: getSliceColor(owner),
                            cursor: !owner && !isPurchasing ? 'pointer' : 'not-allowed',
                            opacity: !owner ? 0.6 : 1
                        }}
                        onClick={() => !owner && handleBuySlice(index)}
                        title={
                            owner
                                ? `Owned by ${owner.substring(0, 6)}...${owner.substring(38)}`
                                : 'Click to purchase (100 $PZZA)'
                        }
                    >
                        <span className="slice-id">{index}</span>
                        {owner && owner.toLowerCase() === walletAddress?.toLowerCase() && (
                            <span className="ownership-badge">YOU</span>
                        )}
                        {owner && owner.toLowerCase() === kingAddress?.toLowerCase() && (
                            <span className="king-badge">👑</span>
                        )}
                    </div>
                ))}
            </div>

            {/* LEGEND */}
            <div className="legend">
                <div className="legend-item">
                    <div className="legend-color" style={{ background: '#0f0' }} />
                    <span>Your Slices</span>
                </div>
                <div className="legend-item">
                    <div className="legend-color" style={{ background: '#FFD700' }} />
                    <span>King's Slices</span>
                </div>
                <div className="legend-item">
                    <div className="legend-color" style={{ background: '#ff00ff' }} />
                    <span>Other Players</span>
                </div>
                <div className="legend-item">
                    <div className="legend-color" style={{ background: '#111', border: '1px solid #333' }} />
                    <span>Available (100 $PZZA)</span>
                </div>
            </div>
        </div>
    )
}
