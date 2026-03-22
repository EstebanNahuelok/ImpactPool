// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VoucherToken
 * @notice ERC-721 token representing ImpactPool vouchers on-chain.
 *         Each voucher issued on the platform mints an NFT.
 *         When a voucher is cancelled, the corresponding token is burned.
 */
contract VoucherToken is ERC721, ERC721URIStorage, Ownable {

    uint256 private _nextTokenId;

    struct VoucherData {
        string code;        // Off-chain voucher code (e.g., IP-1234-AB)
        address association; // Association that issued the voucher
        uint256 amount;     // Voucher value in USDC (6 decimals)
        uint64 issuedAt;    // Timestamp of issuance
        bool burned;        // Whether the token was burned
    }

    // tokenId => voucher data
    mapping(uint256 => VoucherData) private _vouchers;

    // code => tokenId (to find token by off-chain code)
    mapping(string => uint256) private _codeToToken;

    event VoucherMinted(
        uint256 indexed tokenId,
        string code,
        address indexed association,
        uint256 amount
    );

    event VoucherBurned(
        uint256 indexed tokenId,
        string code,
        address indexed burnedBy
    );

    constructor() ERC721("ImpactPool Voucher", "IPVOUCHER") Ownable(msg.sender) {
        _nextTokenId = 1;
    }

    /**
     * @notice Mint a new voucher token
     * @param to Address to receive the voucher NFT (association wallet)
     * @param code Off-chain voucher code
     * @param association Address of the issuing association
     * @param amount Voucher value in USDC units (6 decimals)
     * @param tokenURI_ Metadata URI for the voucher
     * @return tokenId The ID of the newly minted token
     */
    function mintVoucher(
        address to,
        string calldata code,
        address association,
        uint256 amount,
        string calldata tokenURI_
    ) external onlyOwner returns (uint256) {
        require(bytes(code).length > 0, "Code cannot be empty");
        require(_codeToToken[code] == 0, "Code already minted");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        _vouchers[tokenId] = VoucherData({
            code: code,
            association: association,
            amount: amount,
            issuedAt: uint64(block.timestamp),
            burned: false
        });

        _codeToToken[code] = tokenId;

        emit VoucherMinted(tokenId, code, association, amount);
        return tokenId;
    }

    /**
     * @notice Burn (destroy) a voucher token — called when voucher is cancelled
     * @param tokenId The ID of the token to burn
     */
    function burnVoucher(uint256 tokenId) external onlyOwner {
        require(tokenId > 0 && tokenId < _nextTokenId, "Token does not exist");
        require(!_vouchers[tokenId].burned, "Token already burned");

        _vouchers[tokenId].burned = true;
        string memory code = _vouchers[tokenId].code;

        _burn(tokenId);

        emit VoucherBurned(tokenId, code, msg.sender);
    }

    /**
     * @notice Get voucher data by tokenId
     */
    function getVoucher(uint256 tokenId) external view returns (
        string memory code,
        address association,
        uint256 amount,
        uint64 issuedAt,
        bool burned
    ) {
        VoucherData memory v = _vouchers[tokenId];
        return (v.code, v.association, v.amount, v.issuedAt, v.burned);
    }

    /**
     * @notice Get tokenId by off-chain voucher code
     */
    function getTokenByCode(string calldata code) external view returns (uint256) {
        return _codeToToken[code];
    }

    /**
     * @notice Total vouchers minted (including burned)
     */
    function totalVouchers() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    // === Required overrides ===

    function tokenURI(uint256 tokenId)
        public view override(ERC721, ERC721URIStorage) returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721URIStorage) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
