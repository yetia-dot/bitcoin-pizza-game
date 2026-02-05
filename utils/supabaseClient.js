import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================================================
// HELPER FUNCTIONS FOR COMMON QUERIES
// ============================================================================

/**
 * Register a new player in Supabase after on-chain registration
 * @param {string} walletAddress - Ethereum wallet address
 * @param {string} username - Player's chosen username
 * @param {string} ipAddress - IP address for Sybil detection
 */
export async function registerPlayer(walletAddress, username, ipAddress) {
    const { data, error } = await supabase
        .from('players')
        .upsert({
            wallet_address: walletAddress,
            username: username,
            last_ip: ipAddress,
            last_seen: new Date().toISOString()
        }, {
            onConflict: 'wallet_address'
        })
        .select()
        .single()

    if (error) {
        console.error('Failed to register player in Supabase:', error)
        throw error
    }

    return data
}

/**
 * Create a new room in Supabase after on-chain room creation
 * @param {string} roomId - Unique room identifier
 * @param {string} creatorAddress - Wallet address of room creator
 * @param {boolean} isPrivate - Whether the room is private
 */
export async function createRoom(roomId, creatorAddress, isPrivate = false) {
    const { data, error } = await supabase
        .from('rooms')
        .insert({
            room_id: roomId,
            creator_address: creatorAddress,
            is_private: isPrivate,
            level: 1,
            total_slices: 0
        })
        .select()
        .single()

    if (error) {
        console.error('Failed to create room in Supabase:', error)
        throw error
    }

    return data
}

/**
 * Update room king after a hostile takeover
 * @param {string} roomId - Room identifier
 * @param {string} newKingAddress - Wallet address of new king
 */
export async function updateRoomKing(roomId, newKingAddress) {
    const { data, error } = await supabase
        .from('rooms')
        .update({
            current_king: newKingAddress,
            updated_at: new Date().toISOString()
        })
        .eq('room_id', roomId)
        .select()
        .single()

    if (error) {
        console.error('Failed to update room king:', error)
        throw error
    }

    return data
}

/**
 * Increment room slice count after a slice purchase
 * @param {string} roomId - Room identifier
 */
export async function incrementRoomSlices(roomId) {
    const { data, error } = await supabase.rpc('increment_room_slices', {
        p_room_id: roomId
    })

    if (error) {
        console.error('Failed to increment room slices:', error)
        // Fallback to manual increment if RPC function doesn't exist
        const { data: room } = await supabase
            .from('rooms')
            .select('total_slices')
            .eq('room_id', roomId)
            .single()

        if (room) {
            await supabase
                .from('rooms')
                .update({
                    total_slices: room.total_slices + 1,
                    updated_at: new Date().toISOString()
                })
                .eq('room_id', roomId)
        }
    }

    return data
}

/**
 * Get all active rooms (for lobby display)
 * @param {boolean} includePrivate - Whether to include private rooms
 */
export async function getAllRooms(includePrivate = true) {
    let query = supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: false })

    if (!includePrivate) {
        query = query.eq('is_private', false)
    }

    const { data, error } = await query

    if (error) {
        console.error('Failed to fetch rooms:', error)
        throw error
    }

    return data
}

/**
 * Check if an IP address already has an active session in a room (Sybil prevention)
 * @param {string} roomId - Room identifier
 * @param {string} ipAddress - IP address to check
 */
export async function checkExistingSession(roomId, ipAddress) {
    const { data, error } = await supabase
        .from('active_sessions')
        .select('*')
        .eq('room_id', roomId)
        .eq('ip_address', ipAddress)
        .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Failed to check existing session:', error)
        throw error
    }

    return data !== null
}

/**
 * Create an active session when a player joins a room
 * @param {string} walletAddress - Player's wallet address
 * @param {string} roomId - Room identifier
 * @param {string} ipAddress - Player's IP address
 */
export async function createSession(walletAddress, roomId, ipAddress) {
    const { data, error } = await supabase
        .from('active_sessions')
        .insert({
            wallet_address: walletAddress,
            room_id: roomId,
            ip_address: ipAddress
        })
        .select()
        .single()

    if (error) {
        console.error('Failed to create session:', error)
        throw error
    }

    return data
}

/**
 * Remove a session when a player leaves a room
 * @param {string} walletAddress - Player's wallet address
 * @param {string} roomId - Room identifier
 */
export async function removeSession(walletAddress, roomId) {
    const { error } = await supabase
        .from('active_sessions')
        .delete()
        .eq('wallet_address', walletAddress)
        .eq('room_id', roomId)

    if (error) {
        console.error('Failed to remove session:', error)
        throw error
    }
}

/**
 * Update player's last seen timestamp
 * @param {string} walletAddress - Player's wallet address
 */
export async function updatePlayerActivity(walletAddress) {
    const { error } = await supabase
        .from('players')
        .update({ last_seen: new Date().toISOString() })
        .eq('wallet_address', walletAddress)

    if (error) {
        console.error('Failed to update player activity:', error)
    }
}