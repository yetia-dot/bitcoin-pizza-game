import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================================================
// IP DETECTION UTILITY
// ============================================================================

/**
 * Get the user's public IP address
 * In dev mode (localhost), returns '127.0.0.1'
 * In production, fetches from ipify.org
 */
export async function getClientIP() {
    // Check if we're in dev mode
    if (import.meta.env.DEV || window.location.hostname === 'localhost') {
        return '127.0.0.1'
    }

    try {
        const response = await fetch('https://api.ipify.org?format=json')
        const data = await response.json()
        return data.ip
    } catch (error) {
        console.warn('Failed to fetch IP, using fallback:', error)
        return '0.0.0.0' // Fallback IP
    }
}

// ============================================================================
// HELPER FUNCTIONS FOR FRONTEND
// ============================================================================

/**
 * Register a new player in Supabase after on-chain registration
 * @param {string} walletAddress - Ethereum wallet address
 * @param {string} username - Player's chosen username
 */
export async function registerPlayer(walletAddress, username) {
    const ipAddress = await getClientIP()

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
 * Subscribe to real-time room updates
 * @param {Function} callback - Function to call when rooms change
 * @returns {Object} Subscription object (call .unsubscribe() to stop)
 */
export function subscribeToRooms(callback) {
    return supabase
        .channel('rooms-channel')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'rooms' },
            callback
        )
        .subscribe()
}

/**
 * Check if an IP address already has an active session in a room (Sybil prevention)
 * @param {string} roomId - Room identifier
 * @param {string} ipAddress - IP address to check (optional, will auto-detect)
 */
export async function checkExistingSession(roomId, ipAddress = null) {
    // Skip Sybil check in dev mode
    if (import.meta.env.DEV || window.location.hostname === 'localhost') {
        return false
    }

    const ip = ipAddress || await getClientIP()

    const { data, error } = await supabase
        .from('active_sessions')
        .select('*')
        .eq('room_id', roomId)
        .eq('ip_address', ip)

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Failed to check existing session:', error)
        return false // Fail open to not block legitimate users
    }

    return data && data.length > 0
}

/**
 * Create an active session when a player joins a room
 * @param {string} walletAddress - Player's wallet address
 * @param {string} roomId - Room identifier
 */
export async function createSession(walletAddress, roomId) {
    const ipAddress = await getClientIP()

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

// ============================================================================
// SLICE MANAGEMENT (For Real-Time Grid)
// ============================================================================

/**
 * Get all slices for a specific room
 * @param {string} roomId - Room identifier
 * @returns {Array} Array of slice objects with ownership data
 */
export async function getRoomSlices(roomId) {
    const { data, error } = await supabase
        .from('slices')
        .select('*')
        .eq('room_id', roomId)
        .order('slice_id', { ascending: true })

    if (error) {
        console.error('Failed to fetch room slices:', error)
        throw error
    }

    return data || []
}

/**
 * Subscribe to real-time slice updates for a specific room
 * @param {string} roomId - Room identifier
 * @param {Function} callback - Function to call when slices change
 * @returns {Object} Subscription object (call .unsubscribe() to stop)
 */
export function subscribeToSlices(roomId, callback) {
    return supabase
        .channel(`slices-${roomId}`)
        .on('postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'slices',
                filter: `room_id=eq.${roomId}`
            },
            callback
        )
        .subscribe()
}