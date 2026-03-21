// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentRegistry
 * @notice ERC-8004 Identity Registry — Agents as NFTs.
 *         Each agent is an ERC-721 token with an agentURI pointing to
 *         a JSON registration file (type, name, description, services, etc.)
 *
 * ERC-8004 spec: https://eips.ethereum.org/EIPS/eip-8004
 *
 * Global Agent Identifier format:
 *   eip155:{chainId}:{identityRegistry}#{agentId}
 *   Example: eip155:43113:0x742d35Cc...#42
 */
contract AgentRegistry is ERC721, ERC721URIStorage, Ownable {

    uint256 private _nextAgentId;

    struct MetadataEntry {
        string key;
        bytes value;
    }

    // agentId => key => value
    mapping(uint256 => mapping(string => bytes)) private _metadata;

    // agentId => associated wallet (for payments, etc.)
    mapping(uint256 => address) private _agentWallets;

    event Registered(uint256 indexed agentId, string agentURI, address indexed owner);
    event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy);
    event MetadataSet(
        uint256 indexed agentId,
        string indexed indexedMetadataKey,
        string metadataKey,
        bytes metadataValue
    );
    event AgentWalletSet(uint256 indexed agentId, address indexed wallet);
    event AgentWalletUnset(uint256 indexed agentId);

    constructor() ERC721("ImpactoPool Agent Registry", "IPAGENT") Ownable(msg.sender) {
        _nextAgentId = 1;
    }

    /**
     * @notice Register a new agent with a URI pointing to the JSON registration file
     * @param agentURI URL or IPFS hash of the agent registration JSON
     * @return agentId The newly minted agent NFT ID
     */
    function register(string calldata agentURI) external returns (uint256) {
        uint256 agentId = _nextAgentId++;
        _safeMint(msg.sender, agentId);
        _setTokenURI(agentId, agentURI);

        emit Registered(agentId, agentURI, msg.sender);
        return agentId;
    }

    /**
     * @notice Register a new agent with URI and initial metadata entries
     * @param agentURI URL or IPFS hash of the agent registration JSON
     * @param metadata Array of key-value metadata entries to set on registration
     * @return agentId The newly minted agent NFT ID
     */
    function registerWithMetadata(
        string calldata agentURI,
        MetadataEntry[] calldata metadata
    ) external returns (uint256) {
        uint256 agentId = _nextAgentId++;
        _safeMint(msg.sender, agentId);
        _setTokenURI(agentId, agentURI);

        for (uint256 i = 0; i < metadata.length; i++) {
            _metadata[agentId][metadata[i].key] = metadata[i].value;
            emit MetadataSet(agentId, metadata[i].key, metadata[i].key, metadata[i].value);
        }

        emit Registered(agentId, agentURI, msg.sender);
        return agentId;
    }

    /**
     * @notice Update the agent URI. Only the NFT owner can update.
     * @param agentId The agent token ID
     * @param newURI New URI for the agent registration JSON
     */
    function setAgentURI(uint256 agentId, string calldata newURI) external {
        require(ownerOf(agentId) == msg.sender, "Not agent owner");
        _setTokenURI(agentId, newURI);
        emit URIUpdated(agentId, newURI, msg.sender);
    }

    /**
     * @notice Get on-chain metadata for an agent
     * @param agentId The agent token ID
     * @param metadataKey The metadata key to look up
     * @return The metadata value as bytes
     */
    function getMetadata(uint256 agentId, string memory metadataKey) external view returns (bytes memory) {
        require(_ownerOf(agentId) != address(0), "Agent does not exist");
        return _metadata[agentId][metadataKey];
    }

    /**
     * @notice Set on-chain metadata for an agent. Only the NFT owner can set.
     * @param agentId The agent token ID
     * @param metadataKey The metadata key
     * @param metadataValue The metadata value as bytes
     */
    function setMetadata(uint256 agentId, string memory metadataKey, bytes memory metadataValue) external {
        require(ownerOf(agentId) == msg.sender, "Not agent owner");
        _metadata[agentId][metadataKey] = metadataValue;
        emit MetadataSet(agentId, metadataKey, metadataKey, metadataValue);
    }

    /**
     * @notice Get the associated wallet for an agent (used for receiving payments)
     * @param agentId The agent token ID
     * @return The associated wallet address (address(0) if not set)
     */
    function getAgentWallet(uint256 agentId) external view returns (address) {
        require(_ownerOf(agentId) != address(0), "Agent does not exist");
        return _agentWallets[agentId];
    }

    /**
     * @notice Set the associated wallet for an agent. Only the NFT owner can set.
     * @param agentId The agent token ID
     * @param newWallet The wallet address to associate
     */
    function setAgentWallet(uint256 agentId, address newWallet) external {
        require(ownerOf(agentId) == msg.sender, "Not agent owner");
        require(newWallet != address(0), "Invalid wallet address");
        _agentWallets[agentId] = newWallet;
        emit AgentWalletSet(agentId, newWallet);
    }

    /**
     * @notice Remove the associated wallet for an agent
     * @param agentId The agent token ID
     */
    function unsetAgentWallet(uint256 agentId) external {
        require(ownerOf(agentId) == msg.sender, "Not agent owner");
        delete _agentWallets[agentId];
        emit AgentWalletUnset(agentId);
    }

    /**
     * @notice Get the total number of registered agents
     */
    function totalAgents() external view returns (uint256) {
        return _nextAgentId - 1;
    }

    // ================================
    // Required overrides for ERC-721 + URIStorage
    // ================================

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
