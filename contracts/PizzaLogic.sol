// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PizzaStorage.sol";
import "./PizzaCoin.sol";

contract PizzaLogic is PizzaStorage {
    // Events notify your Frontend (React) the moment something happens
    event NewKing(string roomId, address newKing);
    event SliceBought(string roomId, uint256 sliceId, address buyer);
    event RoomCreated(string roomId, string name, address creator);

    function initialize(address _pizzaCoinAddress) public {
        require(pizzaCoin == address(0), "Already initialized");
        pizzaCoin = _pizzaCoinAddress;
        currentGlobalLevel = 1;
    }

    function registerChef(string memory _username) public {
        require(!registeredChefs[msg.sender], "Already registered");
        registeredChefs[msg.sender] = true;
        chefNames[msg.sender] = _username;
        
        // Mint bonus
        PizzaCoin(pizzaCoin).mint(msg.sender, REGISTRATION_BONUS);
    }

    // --- Room Logic ---

    function createRoom(string memory _name, bool _isPrivate, string memory _password) public {
        // Enforce basic validation
        require(bytes(_name).length > 0, "Room name required");
        require(rooms[_name].level == 0, "Room exists");

        // Validate Key if Private
        if (_isPrivate) {
            require(bytes(_password).length > 0, "Password required for private room");
        }

        Room storage r = rooms[_name];
        r.name = _name;
        r.creator = msg.sender;
        r.level = 1;
        r.isPrivate = _isPrivate;
        
        if (_isPrivate) {
            r.keyHash = keccak256(abi.encodePacked(_password));
        }

        allRoomIds.push(_name);
        emit RoomCreated(_name, _name, msg.sender);
    }

    function verifyRoomPassword(string memory _roomId, string memory _candidate) public view returns (bool) {
        Room storage r = rooms[_roomId];
        if (!r.isPrivate) return true;
        return r.keyHash == keccak256(abi.encodePacked(_candidate));
    }

    function getAllRooms() public view returns (string[] memory) {
        return allRoomIds;
    }

    /**
     * @dev Claim a slice. If you hit 51%, you seize the room.
     */
    function buySlice(string memory _roomId, uint256 _sliceId) public {
        Room storage r = rooms[_roomId];
        require(r.level > 0, "Room does not exist");
        
        // Use Room's specific level
        uint256 gridSize = getGridSize(r.level);
        
        // 0. Payment
        PizzaCoin(pizzaCoin).transferFrom(msg.sender, address(this), SLICE_COST);

        // 1. Validation
        require(_sliceId < gridSize, "Slice out of bounds");
        require(roomSlices[_roomId][_sliceId].owner == address(0), "Already claimed!");

        // 2. State Update
        roomSlices[_roomId][_sliceId].owner = msg.sender;
        userSliceCounts[_roomId][msg.sender]++;
        r.totalSlices++; // Track total for this room
        totalSlicesMinted++;

        // 3. 51% Hostile Takeover Math
        // If the grid is 4, you need 3. If it's 16, you need 9.
        uint256 winThreshold = (gridSize / 2) + 1;
        
        if (userSliceCounts[_roomId][msg.sender] >= winThreshold) {
            if (roomKings[_roomId] != msg.sender) {
                roomKings[_roomId] = msg.sender;
                emit NewKing(_roomId, msg.sender);
            }
        }

        emit SliceBought(_roomId, _sliceId, msg.sender);
    }
}