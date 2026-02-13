// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PizzaStorage.sol";
import "./PizzaCoin.sol";

contract PizzaLogic is PizzaStorage {
    // Events notify your Frontend (React) + Supabase Indexer instantly
    event NewKing(string roomId, address newKing);
    event SliceBought(string roomId, uint256 sliceId, address buyer);
    event RoomCreated(string roomId, string name, address creator);
    event WorkerRegistered(address indexed worker, string username); // ADDED FOR LISTENER

    function initialize(address _pizzaCoinAddress) public {
        require(pizzaCoin == address(0), "Already initialized");
        pizzaCoin = _pizzaCoinAddress;
        currentGlobalLevel = 1;
    }

    /**
     * @dev Register as a Worker and receive the $PZZA sign-on bonus.
     */
    function registerChef(string memory _username) public {
        require(!registeredChefs[msg.sender], "Agent already registered");
        registeredChefs[msg.sender] = true;
        chefNames[msg.sender] = _username;
        
        // Mint bonus: This is the 10,000 $PZZA we discussed
        PizzaCoin(pizzaCoin).mint(msg.sender, REGISTRATION_BONUS);
        
        emit WorkerRegistered(msg.sender, _username); // TRIGGER EVENT
    }

    // --- Parlor (Room) Logic ---

    function createRoom(string calldata _name, bool _isPrivate, string calldata _password) public {
        require(bytes(_name).length > 0, "Parlor name required");
        require(rooms[_name].level == 0, "Parlor already exists");

        Room storage r = rooms[_name];
        r.name = _name;
        r.creator = msg.sender;
        r.level = 1; 
        r.isPrivate = _isPrivate;
        
        if (_isPrivate) {
            require(bytes(_password).length > 0, "Passkey required for private parlor");
            r.keyHash = keccak256(abi.encodePacked(_password));
        }

        allRoomIds.push(_name);
        emit RoomCreated(_name, _name, msg.sender);
    }

    function buySlice(string calldata _roomId, uint256 _sliceId) public {
        Room storage r = rooms[_roomId];
        
        require(r.level > 0, "Parlor node offline");
        require(registeredChefs[msg.sender], "Unauthorized worker");
        
        uint256 gridSize = getGridSize(r.level);
        require(_sliceId < gridSize, "Target out of bounds");
        require(roomSlices[_roomId][_sliceId].owner == address(0), "Slice compromised");

        // Payment Settlement
        bool success = PizzaCoin(pizzaCoin).transferFrom(msg.sender, address(this), SLICE_COST);
        require(success, "PZZA funding failed");

        roomSlices[_roomId][_sliceId].owner = msg.sender;
        roomSlices[_roomId][_sliceId].seasoningStartTime = block.timestamp; 
        
        userSliceCounts[_roomId][msg.sender]++;
        r.totalSlices++;
        totalSlicesMinted++;

        _checkConsensus(_roomId, gridSize);

        emit SliceBought(_roomId, _sliceId, msg.sender);
    }

    function _checkConsensus(string memory _roomId, uint256 _gridSize) internal {
        uint256 winThreshold = (_gridSize / 2) + 1;
        if (userSliceCounts[_roomId][msg.sender] >= winThreshold) {
            if (roomKings[_roomId] != msg.sender) {
                roomKings[_roomId] = msg.sender;
                emit NewKing(_roomId, msg.sender);
            }
        }
    }

    // View helper for password check
    function verifyRoomPassword(string calldata _roomId, string calldata _candidate) public view returns (bool) {
        Room storage r = rooms[_roomId];
        if (!r.isPrivate) return true;
        return r.keyHash == keccak256(abi.encodePacked(_candidate));
    }

    function getAllRooms() public view returns (string[] memory) {
        return allRoomIds;
    }
}