import { ethers } from 'ethers'
import dotenv from 'dotenv'
import {
    supabase,
    registerPlayer,
    createRoom,
    updateRoomKing,
    incrementRoomSlices,
    syncSlice
} from './supabaseClient.js'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const PizzaABI = require('../frontend/src/abis/PizzaLogic.json')

dotenv.config()

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545"

// ============================================================================
// EVENT LISTENER SERVICE
// ============================================================================

class BlockchainEventListener {
    constructor() {
        this.provider = null
        this.contract = null
        this.isRunning = false
    }

    async initialize() {
        try {
            console.log('🔗 Connecting to blockchain...')
            this.provider = new ethers.JsonRpcProvider(RPC_URL)

            // Test connection
            await this.provider.getNetwork()
            console.log('✅ Connected to blockchain')

            // Initialize contract
            this.contract = new ethers.Contract(CONTRACT_ADDRESS, PizzaABI.abi, this.provider)
            console.log(`📜 Contract loaded at ${CONTRACT_ADDRESS}`)

            // Test Supabase connection
            const { error } = await supabase.from('players').select('count', { count: 'exact', head: true })
            if (error) throw error
            console.log('✅ Connected to Supabase')

            return true
        } catch (error) {
            console.error('❌ Initialization failed:', error.message)
            if (error.message.includes('fetch failed')) {
                console.error('   👉 This usually means the SUPABASE_URL in your .env is invalid or unreachable.')
                console.error('   👉 Current URL:', process.env.SUPABASE_URL)
            }
            return false
        }
    }

    async startListening() {
        if (this.isRunning) {
            console.warn('⚠️  Event listener is already running')
            return
        }

        this.isRunning = true
        console.log('👂 Starting Real-Time Syndicate Listeners...\n')

        // 1. Listen for Worker Registrations (Updated to use the new event)
        this.contract.on('WorkerRegistered', async (workerAddress, username) => {
            console.log(`👤 NEW WORKER ENROLLED: ${username} (${workerAddress})`)
            try {
                // IP will be 'unknown' from event listener - frontend handles actual IP
                await registerPlayer(workerAddress, username)
                console.log(`   ✅ Synced to Supabase Profile`)
            } catch (err) {
                console.error(`   ❌ Registration sync failed:`, err.message)
            }
        })

        // 2. Listen for Parlor (Room) Creations
        this.contract.on('RoomCreated', async (roomId, name, creator) => {
            console.log(`🏠 NEW PARLOR NODE: "${name}" [ID: ${roomId}] by ${creator}`)
            try {
                const room = await this.contract.rooms(roomId)
                await createRoom(roomId, creator, room.isPrivate)
                console.log(`   ✅ Synced to Supabase Index`)
            } catch (err) {
                console.error(`   ❌ Room sync failed:`, err.message)
            }
        })

        // 3. Listen for 51% Attack Success (NewKing)
        this.contract.on('NewKing', async (roomId, newKing) => {
            console.log(`🚨 51% ATTACK SUCCESS: ${newKing} has seized control of ${roomId}!`)
            try {
                await updateRoomKing(roomId, newKing)
                console.log(`   ✅ King status updated in Supabase`)
            } catch (err) {
                console.error(`   ❌ King update failed:`, err.message)
            }
        })

        // 4. Listen for Slice Purchases (FIXED: Now syncs individual ownership)
        this.contract.on('SliceBought', async (roomId, sliceId, buyer) => {
            console.log(`🍕 SLICE SOLD: #${sliceId} in "${roomId}" to ${buyer}`)
            try {
                // Fix Issue #1: Sync the specific map coordinate
                await syncSlice(roomId, sliceId, buyer)

                // Keep the total count updated for the lobby view
                await incrementRoomSlices(roomId)

                console.log(`   ✅ Grid Map & Count updated in Supabase`)
            } catch (err) {
                console.error(`   ❌ Slice sync failed:`, err.message)
            }
        })

        // 5. Listen for Room Level Up
        this.contract.on('RoomLevelUp', async (roomId, newLevel) => {
            console.log(`📈 LEVEL UP: "${roomId}" leveled up to ${newLevel}!`)
            try {
                await supabase.from('rooms').update({
                    level: Number(newLevel),
                    updated_at: new Date().toISOString()
                }).eq('room_id', roomId)
                console.log(`   ✅ Level sync updated in Supabase`)
            } catch (err) {
                console.error(`   ❌ Level sync failed:`, err.message)
            }
        })

        // 6. Listen for Topping Change
        this.contract.on('ToppingChanged', async (roomId, toppingId) => {
            console.log(`🌶️ TOPPING CHANGED: King changed "${roomId}" topping to ${toppingId}`)
        })

        console.log('✅ All event listeners active. Monitoring Syndicate activity...\n')
    }

    async syncHistoricalData() {
        console.log('📚 Syncing historical records from the blockchain...')

        try {
            const roomIds = await this.contract.getAllRooms()
            console.log(`Found ${roomIds.length} parlors on-chain. Verifying Supabase sync...`)

            for (const roomId of roomIds) {
                try {
                    const { data: existingRoom } = await supabase
                        .from('rooms')
                        .select('room_id')
                        .eq('room_id', roomId)
                        .maybeSingle()

                    if (!existingRoom) {
                        const room = await this.contract.rooms(roomId)
                        console.log(`   🔄 Recovering Room: ${roomId}`)
                        await createRoom(roomId, room.creator, room.isPrivate)

                        const king = await this.contract.roomKings(roomId)
                        if (king !== ethers.ZeroAddress) {
                            await updateRoomKing(roomId, king)
                        }
                    }
                } catch (error) {
                    console.error(`   ❌ Failed to sync record for ${roomId}:`, error.message)
                }
            }
            console.log('✅ Historical sync complete.\n')
        } catch (error) {
            console.error('❌ Historical sync failed:', error.message)
        }
    }

    async stopListening() {
        if (!this.isRunning) return
        console.log('\n🛑 Stopping event listeners...')
        this.contract.removeAllListeners()
        this.isRunning = false
        console.log('✅ Listeners offline.')
    }
}

// ============================================================================
// SERVICE RUNNER
// ============================================================================

async function main() {
    console.log('------------------------------------------------------------')
    console.log('PZZA PARTY - HYBRID BLOCKCHAIN/SUPABASE SYNC SERVICE V1.0')
    console.log('------------------------------------------------------------\n')

    const listener = new BlockchainEventListener()

    const initialized = await listener.initialize()
    if (!initialized) process.exit(1)

    // Sync state before listening for new events
    await listener.syncHistoricalData()
    await listener.startListening()

    // Graceful Exit
    process.on('SIGINT', async () => {
        await listener.stopListening()
        process.exit(0)
    })
}

main().catch((error) => {
    console.error('💥 Fatal service error:', error)
    process.exit(1)
})