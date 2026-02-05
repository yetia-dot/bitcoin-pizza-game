import { ethers } from 'ethers'
import dotenv from 'dotenv'
import {
    supabase,
    registerPlayer,
    createRoom,
    updateRoomKing,
    incrementRoomSlices
} from './supabaseClient.js'
import PizzaABI from '../frontend/src/abis/PizzaLogic.json' assert { type: 'json' }

dotenv.config()

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
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
            const { error } = await supabase.from('players').select('count').limit(1)
            if (error) throw error
            console.log('✅ Connected to Supabase')

            return true
        } catch (error) {
            console.error('❌ Initialization failed:', error.message)
            return false
        }
    }

    async startListening() {
        if (this.isRunning) {
            console.warn('⚠️  Event listener is already running')
            return
        }

        this.isRunning = true
        console.log('👂 Starting event listeners...\n')

        // Listen for player registrations
        this.contract.on('*', async (event) => {
            try {
                // Filter for registerChef transactions
                if (event.fragment && event.fragment.name === 'registerChef') {
                    await this.handleRegistration(event)
                }
            } catch (error) {
                console.error('Error processing event:', error)
            }
        })

        // Listen for RoomCreated events
        this.contract.on('RoomCreated', async (roomId, name, creator, event) => {
            await this.handleRoomCreated(roomId, name, creator, event)
        })

        // Listen for NewKing events (hostile takeovers)
        this.contract.on('NewKing', async (roomId, newKing, event) => {
            await this.handleNewKing(roomId, newKing, event)
        })

        // Listen for SliceBought events
        this.contract.on('SliceBought', async (roomId, sliceId, buyer, event) => {
            await this.handleSliceBought(roomId, sliceId, buyer, event)
        })

        console.log('✅ All event listeners active\n')
        console.log('📊 Monitoring blockchain for events...\n')
    }

    async handleRegistration(event) {
        try {
            const address = event.args[0] // msg.sender from registerChef

            // Get username from contract
            const username = await this.contract.chefNames(address)

            console.log(`👤 NEW REGISTRATION: ${username} (${address})`)

            // Sync to Supabase
            await registerPlayer(address, username, '0.0.0.0') // Backend doesn't have IP

            console.log(`   ✅ Synced to Supabase\n`)
        } catch (error) {
            console.error('   ❌ Failed to handle registration:', error.message)
        }
    }

    async handleRoomCreated(roomId, name, creator, event) {
        try {
            console.log(`🏠 NEW ROOM: "${roomId}" by ${creator}`)

            // Get room details from contract
            const room = await this.contract.rooms(roomId)
            const isPrivate = room.isPrivate

            // Sync to Supabase
            await createRoom(roomId, creator, isPrivate)

            console.log(`   ✅ Synced to Supabase (Private: ${isPrivate})\n`)
        } catch (error) {
            console.error('   ❌ Failed to handle room creation:', error.message)
        }
    }

    async handleNewKing(roomId, newKing, event) {
        try {
            console.log(`👑 HOSTILE TAKEOVER: ${newKing} seized "${roomId}"`)

            // Update room king in Supabase
            await updateRoomKing(roomId, newKing)

            console.log(`   ✅ Synced to Supabase\n`)
        } catch (error) {
            console.error('   ❌ Failed to handle king update:', error.message)
        }
    }

    async handleSliceBought(roomId, sliceId, buyer, event) {
        try {
            console.log(`🍕 SLICE BOUGHT: Slice #${sliceId} in "${roomId}" by ${buyer}`)

            // Increment room slice count in Supabase
            await incrementRoomSlices(roomId)

            console.log(`   ✅ Synced to Supabase\n`)
        } catch (error) {
            console.error('   ❌ Failed to handle slice purchase:', error.message)
        }
    }

    async stopListening() {
        if (!this.isRunning) return

        console.log('\n🛑 Stopping event listeners...')
        this.contract.removeAllListeners()
        this.isRunning = false
        console.log('✅ Event listeners stopped')
    }

    async syncHistoricalData() {
        console.log('📚 Syncing historical data from blockchain...\n')

        try {
            // Get all rooms from contract
            const roomIds = await this.contract.getAllRooms()
            console.log(`Found ${roomIds.length} rooms on-chain`)

            for (const roomId of roomIds) {
                try {
                    const room = await this.contract.rooms(roomId)

                    // Check if room exists in Supabase
                    const { data: existingRoom } = await supabase
                        .from('rooms')
                        .select('room_id')
                        .eq('room_id', roomId)
                        .single()

                    if (!existingRoom) {
                        console.log(`   Syncing room: ${roomId}`)
                        await createRoom(roomId, room.creator, room.isPrivate)

                        // Update king if exists
                        const king = await this.contract.roomKings(roomId)
                        if (king !== ethers.ZeroAddress) {
                            await updateRoomKing(roomId, king)
                        }
                    }
                } catch (error) {
                    console.error(`   Failed to sync room ${roomId}:`, error.message)
                }
            }

            console.log('\n✅ Historical sync complete\n')
        } catch (error) {
            console.error('❌ Historical sync failed:', error.message)
        }
    }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
    console.log('╔════════════════════════════════════════════════════════╗')
    console.log('║   PZZA PARTY - Blockchain Event Listener Service      ║')
    console.log('╚════════════════════════════════════════════════════════╝\n')

    const listener = new BlockchainEventListener()

    // Initialize
    const initialized = await listener.initialize()
    if (!initialized) {
        console.error('❌ Failed to initialize. Exiting...')
        process.exit(1)
    }

    // Sync historical data first
    await listener.syncHistoricalData()

    // Start listening for new events
    await listener.startListening()

    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n\n🛑 Received shutdown signal...')
        await listener.stopListening()
        process.exit(0)
    })

    process.on('SIGTERM', async () => {
        console.log('\n\n🛑 Received shutdown signal...')
        await listener.stopListening()
        process.exit(0)
    })

    // Keep process alive
    console.log('Press Ctrl+C to stop\n')
}

// Run the service
main().catch((error) => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
})
