import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { getRoomSlices, subscribeToSlices, getActiveSessions, subscribeToActiveSessions } from '../supabase'
import PizzaCoinABI from '../abis/PizzaCoin.json'
import './GameRoom.css'

export function GameRoom({ contract, roomId, walletAddress, onLeaveRoom, onSliceBought }) {
    const [slices, setSlices] = useState(Array(4).fill(null)) // Level 1 (2x2)
    const [gridSize, setGridSize] = useState(4)
    const [roomData, setRoomData] = useState(null)
    const [kingAddress, setKingAddress] = useState(null)
    const [userSliceCount, setUserSliceCount] = useState(0)
    const [isPurchasing, setIsPurchasing] = useState(false)
    const [activeSessions, setActiveSessions] = useState([])
    const [slicePrice, setSlicePrice] = useState("100")

    // Level Transition States
    const [isLevelPaused, setIsLevelPaused] = useState(false)
    const [prevLevelWinner, setPrevLevelWinner] = useState(null)

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

                // Get transition state and previous winner
                const paused = await contract.roomLevelPaused(roomId)
                setIsLevelPaused(paused)

                if (level > 1) {
                    const prevWinner = await contract.roomLevelWinners(roomId, level - 1)
                    if (prevWinner !== ethers.ZeroAddress) {
                        setPrevLevelWinner(prevWinner)
                    }
                }
            } catch (error) {
                console.error('Failed to fetch room data:', error)
            }
        }

        fetchRoomData()
    }, [contract, roomId])

    // Helper function to calculate grid size (matches contract logic)
    const getGridSize = (level) => {
        const side = Number(level) + 1;
        return side * side;
    }

    const [useSupabase, setUseSupabase] = useState(true)

    // Poll for dynamic slice price
    const updateSlicePrice = async () => {
        if (!contract || !roomId) return
        try {
            const price = await contract.getSlicePrice(roomId)
            setSlicePrice(ethers.formatEther(price))
        } catch (e) {
            console.error('Failed to update slice price', e)
        }
    }

    useEffect(() => {
        updateSlicePrice()
    }, [contract, roomId, slices])

    // Wait Room Logic using Active Sessions
    useEffect(() => {
        if (!roomId || !useSupabase) return

        const fetchSessions = async () => {
            try {
                const sessions = await getActiveSessions(roomId)
                setActiveSessions(sessions)
            } catch (e) { }
        }
        fetchSessions()

        const sessionSub = subscribeToActiveSessions(roomId, () => {
            fetchSessions()
        })

        return () => {
            if (sessionSub) sessionSub.unsubscribe()
        }
    }, [roomId, useSupabase])

    // Level up contract listener
    useEffect(() => {
        if (!contract) return

        // Level up contract listener
        const levelUpHandler = (eventRoomId, newLevel) => {
            if (eventRoomId === roomId) {
                console.log(`Room leveled up to ${newLevel}`)
                setRoomData(prev => prev ? { ...prev, level: newLevel } : prev)
                setGridSize(getGridSize(Number(newLevel)))
                setIsLevelPaused(false) // Level is unpaused

                // Set the previous winner crown
                if (Number(newLevel) > 1) {
                    contract.roomLevelWinners(roomId, Number(newLevel) - 1).then(prevWinner => {
                        if (prevWinner !== ethers.ZeroAddress) {
                            setPrevLevelWinner(prevWinner)
                        }
                    }).catch(console.error)
                }

                setSlices(prev => {
                    const expectedSize = getGridSize(Number(newLevel))
                    if (prev.length < expectedSize) {
                        const newSlices = Array(expectedSize).fill(null)
                        prev.forEach((s, i) => newSlices[i] = s)
                        return newSlices
                    }
                    return prev
                })
            }
        }

        // Wait for King to advance level
        const levelWaitHandler = (eventRoomId, currentLevel, king) => {
            if (eventRoomId === roomId) {
                console.log(`Level ${currentLevel} completed! Waiting for King ${king} to select toppings.`)
                setIsLevelPaused(true)
            }
        }

        contract.on("RoomLevelUp", levelUpHandler)
        contract.on("LevelWaiting", levelWaitHandler)
        return () => {
            contract.off("RoomLevelUp", levelUpHandler)
            contract.off("LevelWaiting", levelWaitHandler)
        }
    }, [contract, roomId])

    // Fetch initial slices from Supabase or Blockchain
    useEffect(() => {
        if (!roomId || !gridSize) return

        const fetchSlices = async () => {
            if (useSupabase) {
                try {
                    console.log('⚡ Fetching slices from Supabase...')
                    const roomSlices = await getRoomSlices(roomId)
                    const sliceMap = Array(gridSize).fill(null)
                    roomSlices.forEach(slice => {
                        sliceMap[slice.slice_id] = slice.owner_address
                    })
                    setSlices(sliceMap)

                    const userCount = roomSlices.filter(
                        s => s.owner_address?.toLowerCase() === walletAddress?.toLowerCase()
                    ).length
                    setUserSliceCount(userCount)
                } catch (error) {
                    console.warn('⚠️ Supabase connection failed, switching to Blockchain Scan:', error)
                    setUseSupabase(false)
                }
            } else {
                fetchSlicesFromBlockchain()
            }
        }

        fetchSlices()

        // Polling fallback if Supabase is offline
        let interval
        if (!useSupabase) {
            interval = setInterval(fetchSlicesFromBlockchain, 5000)
        }
        return () => clearInterval(interval)
    }, [roomId, gridSize, walletAddress, useSupabase])

    const fetchSlicesFromBlockchain = async () => {
        if (!contract || !roomId) return
        try {
            console.log('📡 Scanning Blockchain for map state...')
            const owners = await contract.getRoomSlicesData(roomId)
            setSlices(owners.map(o => o === ethers.ZeroAddress ? null : o))

            const userCount = owners.filter(
                o => o.toLowerCase() === walletAddress?.toLowerCase()
            ).length
            setUserSliceCount(userCount)
        } catch (err) {
            console.error("Blockchain scan failed:", err)
            // If scan fails (e.g. function not deployed yet), ensure we still have a grid to show
            if (slices.length === 0) {
                setSlices(Array(gridSize).fill(null))
            }
        }
    }

    // Subscribe to real-time slice updates (Only if Supabase is active)
    useEffect(() => {
        if (!roomId || !useSupabase) return

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
            if (subscription) subscription.unsubscribe()
        }
    }, [roomId, walletAddress, useSupabase])

    // Handle slice purchase
    const handleBuySlice = async (sliceId) => {
        if (!contract || isPurchasing) return
        if (slices[sliceId]) {
            alert('This slice is already owned!')
            return
        }
        if (isWaitingRoom || isLevelPaused) {
            alert("Node operations are currently paused.")
            return
        }

        setIsPurchasing(true)
        try {
            console.log(`Analyzing purchase for slice #${sliceId} in room "${roomId}"...`)

            // 1. Get Token Contract
            const coinAddress = await contract.pizzaCoin()
            const coinContract = new ethers.Contract(coinAddress, PizzaCoinABI.abi, contract.runner)

            // 2. Check Balance
            const balance = await coinContract.balanceOf(walletAddress)
            const currentCostWei = ethers.parseEther(slicePrice)

            if (balance < currentCostWei) {
                alert(`Insufficient $PZZA! Use the DEV FAUCET or check your rewards.\n\nCost: ${slicePrice} $PZZA\nYour Balance: ${parseFloat(ethers.formatEther(balance)).toFixed(0)} $PZZA`)
                setIsPurchasing(false)
                return
            }

            // 3. Check & Handle Allowance (Smooth UX)
            const allowance = await coinContract.allowance(walletAddress, await contract.getAddress())
            if (allowance < currentCostWei) {
                console.log("Establishing spending permissions for $PZZA...")
                const approveTx = await coinContract.approve(await contract.getAddress(), ethers.MaxUint256)
                await approveTx.wait()
                console.log("✅ Spending permissions established.")
            }

            // Optimistic UI Update (Fast Response)
            setSlices(prev => {
                const updated = [...prev]
                updated[sliceId] = walletAddress
                return updated
            })
            setUserSliceCount(prev => prev + 1)

            // 4. Execute Purchase
            console.log(`Executing buy order for slice #${sliceId}...`)
            const tx = await contract.buySlice(roomId, sliceId)
            await tx.wait()
            console.log('✅ Slice purchased! Event listener will sync to Supabase.')

            if (onSliceBought) onSliceBought()
        } catch (error) {
            console.error('Failed to purchase slice:', error)

            // Revert Optimistic Update on Failure
            setSlices(prev => {
                const updated = [...prev]
                updated[sliceId] = null
                return updated
            })
            setUserSliceCount(prev => prev - 1)

            // Differentiate between common errors
            if (error.message?.includes("Slice compromised") || error.data?.message?.includes("Slice compromised")) {
                alert("SYNDICATE CONFLICT: This slice was claimed by another agent just moments ago. \n\nEnsure your 'npm run listener' is active to keep the map in sync.")
            } else if (error.message?.includes("insufficient funds")) {
                alert("OUT OF FUEL: You don't have enough 'Uplink Credit' (gas) to execute this order. requesting subsidy...")
            } else {
                alert('Purchase failed. Ensure your local node is running and you have enough $PZZA.')
            }
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

    // King Toppings Update
    const handleChangeTopping = async (toppingId) => {
        if (!contract) return
        try {
            const tx = await contract.changeParlorTopping(roomId, toppingId)
            await tx.wait()
            alert("Toppings changed globally!")
        } catch (e) {
            console.error("Failed to change toppings", e)
            alert("Failed to change toppings.")
        }
    }

    // King Advance Level
    const handleAdvanceLevel = async (toppingId) => {
        if (!contract) return
        try {
            const tx = await contract.advanceLevel(roomId, toppingId)
            await tx.wait()
            console.log("Advanced to next level!")
        } catch (e) {
            console.error("Failed to advance level", e)
            alert("Failed to advance level. Did you already do it?")
        }
    }

    const scoreboard = React.useMemo(() => {
        const counts = {}
        slices.forEach(owner => {
            if (owner) {
                counts[owner] = (counts[owner] || 0) + 1
            }
        })
        return Object.entries(counts).sort((a, b) => b[1] - a[1])
    }, [slices])

    const gridDimension = Math.sqrt(gridSize)
    const hasGameStarted = roomData ? Number(roomData.totalSlices) > 0 || slices.some(s => s !== null) : slices.some(s => s !== null)
    const isWaitingRoom = activeSessions.length < 2 && useSupabase && !hasGameStarted

    return (
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            <div className="game-room-container" style={{ flex: 1 }}>
                {/* HEADER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                        <h2 style={{ margin: 0, color: '#0f0' }}>🍕 PARLOR: {roomId}</h2>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <p style={{ margin: '5px 0', fontSize: '12px', color: '#888' }}>
                                Level {roomData ? Number(roomData.level) : '?'} | Grid: {gridDimension}x{gridDimension}
                            </p>
                            <span style={{ fontSize: '10px', color: '#555' }}>
                                {useSupabase ? '🟢 SYNC' : '📡 SCAN'} | ACTIVE PLAYERS: {activeSessions.length}
                            </span>
                        </div>
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
                    {/* Dynamically Update Price Notification */}
                    <p style={{ fontSize: '12px', color: '#888', marginBottom: '5px' }}>
                        CURRENT SLICE PRICE: {parseFloat(slicePrice).toFixed(0)} $PZZA
                    </p>
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

                {/* GRID / WAITING ROOM */}
                {slices.length === 0 ? (
                    <div className="grid-loading">SYNDICATE SCANNING NETWORK...</div>
                ) : isWaitingRoom ? (
                    <div className="waiting-overlay" style={{ textAlign: 'center', padding: '50px', border: '1px dashed #f00', margin: '20px 0' }}>
                        <h3 style={{ color: '#f00' }}>WAITING FOR MORE AGENTS...</h3>
                        <p>At least 2 players must be connected to this node to begin operations. Coordinate your strike force!</p>
                    </div>
                ) : isLevelPaused ? (
                    <div className="waiting-overlay" style={{ textAlign: 'center', padding: '50px', border: '1px solid #FFD700', borderRadius: '8px', margin: '20px 0', background: 'rgba(255, 215, 0, 0.1)' }}>
                        <h2 style={{ color: '#FFD700', textShadow: '0 0 10px #FFD700' }}>🎉 LEVEL CLEARED! 🎉</h2>
                        <h3 style={{ color: '#fff' }}>AWAITING THE KING'S DECREE</h3>
                        <p style={{ color: '#ccc' }}>
                            The winner of this level has been awarded 5,000 $PZZA and must select the toppings for the next level.
                        </p>
                        {isKing && (
                            <div style={{ marginTop: '20px', padding: '20px', border: '1px dashed #FFD700', display: 'inline-block' }}>
                                <h4 style={{ color: '#FFD700', margin: '0 0 15px 0' }}>👑 SELECT NEXT LEVEL TOPPINGS</h4>
                                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                                    <button onClick={() => handleAdvanceLevel(1)} style={{ background: '#222', color: '#FFD700', border: '1px solid #FFD700', padding: '10px 20px', cursor: 'pointer' }}>
                                        PEPPERONI PROTOCOL
                                    </button>
                                    <button onClick={() => handleAdvanceLevel(99)} style={{ background: '#FFD700', color: '#000', border: 'none', padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold' }}>
                                        GOLDEN PINEAPPLE
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
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
                                onClick={() => !owner && !isWaitingRoom && handleBuySlice(index)}
                                title={
                                    owner
                                        ? `Owned by ${owner.substring(0, 6)}...${owner.substring(38)}`
                                        : `Click to purchase (${parseFloat(slicePrice).toFixed(0)} $PZZA)`
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
                )}

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
                        <span>Available</span>
                    </div>
                </div>
            </div>

            {/* SIDEBAR SCOREBOARD */}
            <div className="sidebar" style={{ width: '250px', background: 'rgba(0,0,0,0.8)', padding: '15px', borderLeft: '2px solid #333', border: '1px solid #0f0' }}>
                <h3 style={{ color: '#0f0', borderBottom: '1px solid #333', paddingBottom: '10px', marginTop: 0 }}>SCOREBOARD</h3>
                <div style={{ marginBottom: '10px' }}>
                    <span style={{ color: '#888', fontSize: '12px' }}>PLAYERS PRESENT: {activeSessions.length}</span>
                </div>

                {scoreboard.length === 0 && <p style={{ color: '#555', fontSize: '12px' }}>Grid empty.</p>}

                {scoreboard.map(([player, count]) => (
                    <div key={player} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                        <span
                            title={player}
                            style={{ color: player.toLowerCase() === walletAddress?.toLowerCase() ? '#0f0' : (player.toLowerCase() === kingAddress?.toLowerCase() ? '#FFD700' : '#fff') }}
                        >
                            {player.toLowerCase() === walletAddress?.toLowerCase() ? 'YOU' : `${player.substring(0, 6)}...`}
                            {player.toLowerCase() === kingAddress?.toLowerCase() && ' 👑'}
                            {prevLevelWinner && player.toLowerCase() === prevLevelWinner.toLowerCase() && ' 👑 (PREV)'}
                        </span>
                        <span style={{ color: '#aaa' }}>{count} SLICES</span>
                    </div>
                ))}

                {isKing && (
                    <div style={{ marginTop: '30px', border: '1px solid #FFD700', padding: '15px' }}>
                        <h4 style={{ color: '#FFD700', marginTop: 0, fontSize: '12px', textAlign: 'center' }}>👑 KING CONTROLS</h4>
                        <p style={{ color: '#888', fontSize: '10px', textAlign: 'center', marginBottom: '10px' }}>Commandeer parlor toppings</p>
                        <button
                            onClick={() => handleChangeTopping(1)}
                            style={{ background: 'transparent', color: '#FFD700', border: '1px solid #FFD700', cursor: 'pointer', display: 'block', width: '100%', marginBottom: '10px', padding: '5px' }}
                        >
                            + PEPPERONI PROTOCOL
                        </button>
                        <button
                            onClick={() => handleChangeTopping(99)}
                            style={{ background: '#FFD700', color: '#000', cursor: 'pointer', display: 'block', width: '100%', border: 'none', padding: '5px' }}
                        >
                            + GOLDEN PINEAPPLE
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
