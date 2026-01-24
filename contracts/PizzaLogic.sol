// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PizzaStorage.sol";

contract PizzaLogic is PizzaStorage {
    // Events notify your Frontend (React) the moment something happens
    event NewKing(string roomId, address newKing);
    event SliceBought(string roomId, uint256 sliceId, address buyer);

    /**
     * @dev Claim a slice. If you hit 51%, you seize the room.
     */
    function buySlice(string memory _roomId, uint256 _sliceId) public payable {
        uint256 gridSize = getGridSize(currentGlobalLevel);
        
        // 1. Validation
        require(_sliceId < gridSize, "Slice out of bounds");
        require(roomSlices[_roomId][_sliceId].owner == address(0), "Already claimed!");

        // 2. State Update
        roomSlices[_roomId][_sliceId].owner = msg.sender;
        userSliceCounts[_roomId][msg.sender]++;
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