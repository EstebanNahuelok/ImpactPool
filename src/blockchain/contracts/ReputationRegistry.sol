// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/**
 * @title ReputationRegistry
 * @notice ERC-8004 Reputation Registry — Feedback system for agents.
 *         Clients can leave feedback (positive/negative) on agents,
 *         revoke feedback, and query summary reputation scores.
 *
 * ERC-8004 spec: https://eips.ethereum.org/EIPS/eip-8004
 *
 * Integrates with AgentRegistry to verify agent existence.
 */

interface IAgentRegistry {
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract ReputationRegistry {

    IAgentRegistry public agentRegistry;

    struct Feedback {
        address client;
        int128 value;
        uint8 valueDecimals;
        string tag1;
        string tag2;
        string endpoint;
        string feedbackURI;
        bytes32 feedbackHash;
        bool isRevoked;
        uint256 timestamp;
    }

    // agentId => client => feedbacks array
    mapping(uint256 => mapping(address => Feedback[])) private _feedbacks;

    // agentId => list of unique clients who gave feedback
    mapping(uint256 => address[]) private _clients;
    mapping(uint256 => mapping(address => bool)) private _isClient;

    event NewFeedback(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 feedbackIndex,
        int128 value,
        uint8 valueDecimals,
        string indexed indexedTag1,
        string tag1,
        string tag2,
        string endpoint,
        string feedbackURI,
        bytes32 feedbackHash
    );

    event FeedbackRevoked(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 indexed feedbackIndex
    );

    constructor(address _agentRegistry) {
        agentRegistry = IAgentRegistry(_agentRegistry);
    }

    /**
     * @notice Give feedback to an agent
     * @param agentId The agent token ID in the AgentRegistry
     * @param value Feedback value (positive or negative, e.g. -100 to 100)
     * @param valueDecimals Number of decimals for the value (0-18)
     * @param tag1 Optional category tag (e.g. "donation", "speed")
     * @param tag2 Optional sub-category tag
     * @param endpoint Optional endpoint the feedback refers to
     * @param feedbackURI Optional URI to off-chain detailed feedback JSON
     * @param feedbackHash Optional KECCAK-256 hash of the feedbackURI content
     */
    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata endpoint,
        string calldata feedbackURI,
        bytes32 feedbackHash
    ) external {
        // Verify agent exists in the registry
        agentRegistry.ownerOf(agentId); // reverts if agent doesn't exist

        // Track unique clients
        if (!_isClient[agentId][msg.sender]) {
            _clients[agentId].push(msg.sender);
            _isClient[agentId][msg.sender] = true;
        }

        uint64 feedbackIndex = uint64(_feedbacks[agentId][msg.sender].length);

        _feedbacks[agentId][msg.sender].push(Feedback({
            client: msg.sender,
            value: value,
            valueDecimals: valueDecimals,
            tag1: tag1,
            tag2: tag2,
            endpoint: endpoint,
            feedbackURI: feedbackURI,
            feedbackHash: feedbackHash,
            isRevoked: false,
            timestamp: block.timestamp
        }));

        emit NewFeedback(
            agentId,
            msg.sender,
            feedbackIndex,
            value,
            valueDecimals,
            tag1,
            tag1,
            tag2,
            endpoint,
            feedbackURI,
            feedbackHash
        );
    }

    /**
     * @notice Revoke a previously given feedback. Only the original author can revoke.
     * @param agentId The agent token ID
     * @param feedbackIndex Index of the feedback in the caller's feedback array
     */
    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external {
        require(feedbackIndex < _feedbacks[agentId][msg.sender].length, "Invalid feedback index");
        require(!_feedbacks[agentId][msg.sender][feedbackIndex].isRevoked, "Already revoked");

        _feedbacks[agentId][msg.sender][feedbackIndex].isRevoked = true;

        emit FeedbackRevoked(agentId, msg.sender, feedbackIndex);
    }

    /**
     * @notice Get a summary of feedback for an agent, optionally filtered by clients and tags
     * @param agentId The agent token ID
     * @param clientAddresses Filter by specific clients (empty array = all clients)
     * @param tag1 Filter by tag1 (empty string = no filter)
     * @param tag2 Filter by tag2 (empty string = no filter)
     * @return count Number of non-revoked feedbacks matching filters
     * @return summaryValue Sum of feedback values
     * @return summaryValueDecimals Decimals used for the summary (max of all feedbacks)
     */
    function getSummary(
        uint256 agentId,
        address[] calldata clientAddresses,
        string calldata tag1,
        string calldata tag2
    ) external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals) {
        address[] memory clients;
        if (clientAddresses.length > 0) {
            clients = new address[](clientAddresses.length);
            for (uint256 i = 0; i < clientAddresses.length; i++) {
                clients[i] = clientAddresses[i];
            }
        } else {
            clients = _clients[agentId];
        }

        for (uint256 i = 0; i < clients.length; i++) {
            Feedback[] storage feedbacks = _feedbacks[agentId][clients[i]];
            for (uint256 j = 0; j < feedbacks.length; j++) {
                if (feedbacks[j].isRevoked) continue;

                // Tag filtering
                if (bytes(tag1).length > 0 && keccak256(bytes(feedbacks[j].tag1)) != keccak256(bytes(tag1))) continue;
                if (bytes(tag2).length > 0 && keccak256(bytes(feedbacks[j].tag2)) != keccak256(bytes(tag2))) continue;

                count++;
                summaryValue += feedbacks[j].value;
                if (feedbacks[j].valueDecimals > summaryValueDecimals) {
                    summaryValueDecimals = feedbacks[j].valueDecimals;
                }
            }
        }
    }

    /**
     * @notice Read a specific feedback entry
     * @param agentId The agent token ID
     * @param clientAddress The client who gave the feedback
     * @param feedbackIndex Index in the client's feedback array
     */
    function readFeedback(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex
    ) external view returns (
        int128 value,
        uint8 valueDecimals,
        string memory tag1,
        string memory tag2,
        bool isRevoked
    ) {
        require(feedbackIndex < _feedbacks[agentId][clientAddress].length, "Invalid feedback index");
        Feedback storage f = _feedbacks[agentId][clientAddress][feedbackIndex];
        return (f.value, f.valueDecimals, f.tag1, f.tag2, f.isRevoked);
    }

    /**
     * @notice Get all unique clients who gave feedback to an agent
     * @param agentId The agent token ID
     */
    function getClients(uint256 agentId) external view returns (address[] memory) {
        return _clients[agentId];
    }

    /**
     * @notice Get the last feedback index for a client on an agent
     * @param agentId The agent token ID
     * @param clientAddress The client address
     * @return The last index (0 if no feedback exists)
     */
    function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64) {
        uint256 len = _feedbacks[agentId][clientAddress].length;
        if (len == 0) return 0;
        return uint64(len - 1);
    }
}
