// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PizzaStorage
 * @dev This contract defines the "Database" for The Progressive Pizza.
 * In a Proxy pattern, this layout must NEVER be changed, only appended to.
 */
contract PizzaStorage {
    struct Slice {
        address owner;
        uint256 toppingId; // 0=Cheese, 1=Pepperoni, 99=Golden Pineapple
        uint256 seasoningStartTime; // Timestamp for the "Sybil Defense"
        string message; // 10-character shoutout
    }

    struct Room {
        string name;
        address creator;
        uint256 level; // Starts at 1, grows independently
        uint256 totalSlices; // Track slices bought in this room
        bool isPrivate;
        bytes32 keyHash;
    }

    // --- Global Game State ---
    uint256 public totalSlicesMinted;
    // currentGlobalLevel is deprecated/unused in favor of per-Room levels, 
    // but kept to avoid storage collision if this were a real proxy upgrade.
    // We will just likely ignore it or repurpose it.
    uint256 public currentGlobalLevel; 

    // --- Room & Level Data ---
    string[] public allRoomIds;
    mapping(string => Room) public rooms;

    // Mapping: RoomID => (SliceIndex => SliceData)
    mapping(string => mapping(uint256 => Slice)) public roomSlices;
    
    // Mapping: RoomID => (UserAddress => Count) - Essential for 51% check
    mapping(string => mapping(address => uint256)) public userSliceCounts;

    // Mapping: RoomID => address of the current "King" (Landlord)
    mapping(string => address) public roomKings;

    // --- Economy & Identity ---
    address public pizzaCoin;
    mapping(address => bool) public registeredChefs;
    mapping(address => string) public chefNames;

    uint256 public constant REGISTRATION_BONUS = 10000 * 10**18;
    uint256 public constant SLICE_COST = 100 * 10**18;

    // --- Constants / Config ---
    uint256 public constant SEASONING_PERIOD = 1 hours;

    /**
     * @dev Helper to calculate how many slices are in a level.
     * Hybrid Square Growth: Level 1 = 4, Level 2 = 16, Level 3 = 36...
     */
    function getGridSize(uint256 _level) public pure returns (uint256) {
        uint256 side = _level * 2;
        return side * side;
    }

    // This "gap" is a professional trick. It reserves 50 slots in the storage
    // so we can add new variables in the future without breaking the proxy!
    uint256[50] private __gap;
}