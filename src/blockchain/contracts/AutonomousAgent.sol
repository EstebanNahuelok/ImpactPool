// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AutonomousAgent
 * @notice Implementa ERC-8004 - Agente autónomo on-chain para ImpactoPool.
 *         Puede ejecutar donaciones automáticas, redistribuir rewards
 *         y actuar en nombre de la plataforma de forma trustless.
 *
 * ERC-8004 define:
 *   - Un agente con identidad on-chain
 *   - Capacidad de ejecutar acciones autónomas
 *   - Registro de acciones verificable
 */
contract AutonomousAgent is Ownable {

    string public agentName;
    string public agentVersion;
    bool public isActive;

    struct Action {
        string actionType;     // "donate", "distribute_reward", "verify_association"
        address target;
        uint256 value;
        uint256 timestamp;
        bool executed;
    }

    uint256 public actionCount;
    mapping(uint256 => Action) public actions;

    // Direcciones autorizadas a interactuar con el agente
    mapping(address => bool) public authorizedCallers;

    event ActionQueued(uint256 indexed id, string actionType, address target, uint256 value);
    event ActionExecuted(uint256 indexed id);
    event AgentStatusChanged(bool active);
    event CallerAuthorized(address indexed caller);
    event CallerRevoked(address indexed caller);

    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    modifier onlyActive() {
        require(isActive, "Agent is not active");
        _;
    }

    constructor(string memory _name, string memory _version) Ownable(msg.sender) {
        agentName = _name;
        agentVersion = _version;
        isActive = true;
    }

    /**
     * @notice ERC-8004: Identidad del agente
     */
    function getIdentity() external view returns (string memory name, string memory version, address agentOwner, bool active) {
        return (agentName, agentVersion, owner(), isActive);
    }

    /**
     * @notice Encolar una acción para ejecución autónoma
     */
    function queueAction(string calldata _actionType, address _target, uint256 _value) 
        external onlyAuthorized onlyActive returns (uint256) 
    {
        actionCount++;
        actions[actionCount] = Action({
            actionType: _actionType,
            target: _target,
            value: _value,
            timestamp: block.timestamp,
            executed: false
        });

        emit ActionQueued(actionCount, _actionType, _target, _value);
        return actionCount;
    }

    /**
     * @notice Marcar acción como ejecutada (después de ejecución off-chain/on-chain)
     */
    function markExecuted(uint256 _actionId) external onlyAuthorized {
        require(_actionId > 0 && _actionId <= actionCount, "Invalid action ID");
        require(!actions[_actionId].executed, "Already executed");

        actions[_actionId].executed = true;
        emit ActionExecuted(_actionId);
    }

    function setActive(bool _active) external onlyOwner {
        isActive = _active;
        emit AgentStatusChanged(_active);
    }

    function authorizeCaller(address _caller) external onlyOwner {
        authorizedCallers[_caller] = true;
        emit CallerAuthorized(_caller);
    }

    function revokeCaller(address _caller) external onlyOwner {
        authorizedCallers[_caller] = false;
        emit CallerRevoked(_caller);
    }

    function getAction(uint256 _id) external view returns (
        string memory actionType, address target, uint256 value, uint256 timestamp, bool executed
    ) {
        Action memory a = actions[_id];
        return (a.actionType, a.target, a.value, a.timestamp, a.executed);
    }
}
