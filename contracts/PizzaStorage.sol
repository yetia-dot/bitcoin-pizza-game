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

    // --- Global Game State ---
    uint256 public totalSlicesMinted;
    uint256 public currentGlobalLevel; // Starts at 1

    // --- Room & Level Data ---
    // Mapping: RoomID => (SliceIndex => SliceData)
    mapping(string => mapping(uint256 => Slice)) public roomSlices;
    
    // Mapping: RoomID => (UserAddress => Count) - Essential for 51% check
    mapping(string => mapping(address => uint256)) public userSliceCounts;

    // Mapping: RoomID => address of the current "King" (Landlord)
    mapping(string => address) public roomKings;

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