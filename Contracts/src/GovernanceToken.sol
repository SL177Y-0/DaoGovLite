// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GovernanceToken
 * @dev ERC20 token with voting capabilities for DAOGovLite
 */
contract GovernanceToken is ERC20Votes, Ownable {
    // Maximum supply of tokens (1 million tokens with 18 decimals)
    uint256 public constant MAX_SUPPLY = 1000000 * 10**18;
    
    constructor(string memory name, string memory symbol) 
        ERC20(name, symbol)
        ERC20Permit(name)
        Ownable()
    {
        // Mint initial supply to the deployer
        _mint(msg.sender, 100000 * 10**18); // 10% of total supply
    }
    
    /**
     * @dev Mints new tokens to a specified address
     * @param to Address to receive the tokens
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds maximum token supply");
        _mint(to, amount);
    }
    
    // The following functions are overrides required by Solidity

    function _afterTokenTransfer(address from, address to, uint256 amount) internal override(ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal override(ERC20Votes) {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount) internal override(ERC20Votes) {
        super._burn(account, amount);
    }
} 