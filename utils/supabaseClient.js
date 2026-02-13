import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================================================
// HELPER FUNCTIONS FOR COMMON QUERIES
// ============================================================================

/**
 * Register a new player in Supabase after on-chain registration
 */
export async function registerPlayer(walletAddress, username, ipAddress = 'unknown') {
    const { data, error } = await supabase
        .from('players')
        .upsert({
            wallet_address: walletAddress.toLowerCase(),
            username: username,
            last_ip: ipAddress,
            last_seen: new Date().toISOString()
        }, {
            onConflict: 'wallet_address'
        })
        .select()
        .single()

    if (error) {
        console.error('❌ Failed to register player in Supabase:', error.message)
        throw error
    }

    return data
}

/**
 * Create/Update a parlor (room) in Supabase
 */
export async function createRoom(roomId, creatorAddress, isPrivate = false) {
    const { data, error } = await supabase
        .from('rooms')
        .upsert({
            room_id: roomId,
            creator_address: creatorAddress.toLowerCase(),
            is_private: isPrivate,
            level: 1,
            total_slices: 0,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'room_id'
        })
        .select()
        .single()

    if (error) {
        console.error('❌ Failed to create room in Supabase:', error.message)
        throw error
    }

    return data
}

/**
 * Sync individual slice ownership (Crucial for Real-Time Grid UI)
 */
export async function syncSlice(roomId, sliceId, ownerAddress) {
    const { data, error } = await supabase
        .from('slices')
        .upsert({
            room_id: roomId,
            slice_id: Number(sliceId),
            owner_address: ownerAddress.toLowerCase(),
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'room_id,slice_id'
        })

    if (error) {
        console.error('❌ Failed to sync slice in Supabase:', error.message)
    }
    return data
}

/**
 * Update room king after a successful 51% takeover
 */
export async function updateRoomKing(roomId, newKingAddress) {
    const { data, error } = await supabase
        .from('rooms')
        .update({
            current_king: newKingAddress.toLowerCase(),
            updated_at: new Date().toISOString()
        })
        .eq('room_id', roomId)
        .select()
        .single()

    if (error) {
        console.error('❌ Failed to update room king:', error.message)
        throw error
    }

    return data
}

/**
 * Increment room slice count (Uses atomic RPC)
 */
export async function incrementRoomSlices(roomId) {
    const { data, error } = await supabase.rpc('increment_room_slices', {
        p_room_id: roomId
    })

    if (error) {
        console.warn('⚠️ RPC Failed, falling back to manual increment...')
        const { data: room } = await supabase
            .from('rooms')
            .select('total_slices')
            .eq('room_id', roomId)
            .single()

        if (room) {
            await supabase
                .from('rooms')
                .update({
                    total_slices: (room.total_slices || 0) + 1,
                    updated_at: new Date().toISOString()
                })
                .eq('room_id', roomId)
        }
    }

    return data
}

/**
 * Get all active rooms (Lobby Display)
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
    if (error) throw error
    return data
}

/**
 * Check if an IP address has an active session (Sybil Prevention)
 */
export async function checkExistingSession(roomId, ipAddress) {
    const { data, error } = await supabase
        .from('active_sessions')
        .select('*')
        .eq('room_id', roomId)
        .eq('ip_address', ipAddress)
        .maybeSingle()

    if (error) throw error
    return data !== null
}

/**
 * Create active session (Joining a room)
 */
export async function createSession(walletAddress, roomId, ipAddress) {
    const { data, error } = await supabase
        .from('active_sessions')
        .insert({
            wallet_address: walletAddress.toLowerCase(),
            room_id: roomId,
            ip_address: ipAddress
        })
        .select()
        .single()

    if (error) throw error
    return data
}

/**
 * Remove session (Leaving a room)
 */
export async function removeSession(walletAddress, roomId) {
    const { error } = await supabase
        .from('active_sessions')
        .delete()
        .eq('wallet_address', walletAddress.toLowerCase())
        .eq('room_id', roomId)

    if (error) throw error
}

/**
 * Keepalive / Activity Update
 */
export async function updatePlayerActivity(walletAddress) {
    await supabase
        .from('players')
        .update({ last_seen: new Date().toISOString() })
        .eq('wallet_address', walletAddress.toLowerCase())
}