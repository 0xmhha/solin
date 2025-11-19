// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

/**
 * @title GasOptimization
 * @dev Example contract demonstrating various gas optimization opportunities
 * This contract contains intentional gas inefficiencies for educational purposes
 */
contract GasOptimization {
    uint256[] public numbers;
    mapping(address => bool) public whitelist;

    event NumberAdded(uint256 indexed number);
    event UserWhitelisted(address indexed user);

    // Gas inefficient: reading array.length in every iteration
    function sumArrayBad() public view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < numbers.length; i++) {
            total += numbers[i];
        }
        return total;
    }

    // Gas efficient: caching array.length
    function sumArrayGood() public view returns (uint256) {
        uint256 total = 0;
        uint256 length = numbers.length;
        for (uint256 i = 0; i < length; i++) {
            total += numbers[i];
        }
        return total;
    }

    // Gas inefficient: using require() with string error messages
    function addNumberBad(uint256 num) public {
        require(num > 0, "Number must be greater than zero");
        require(num < 1000, "Number must be less than 1000");
        numbers.push(num);
        emit NumberAdded(num);
    }

    // Gas efficient: using custom errors (saves ~24 KB deployment + ~50 gas runtime)
    error InvalidNumber(uint256 num);
    error NumberTooLarge(uint256 num, uint256 max);

    function addNumberGood(uint256 num) public {
        if (num == 0) revert InvalidNumber(num);
        if (num >= 1000) revert NumberTooLarge(num, 999);
        numbers.push(num);
        emit NumberAdded(num);
    }

    // Gas inefficient: multiple storage reads
    function checkWhitelistBad(address user1, address user2, address user3)
        public
        view
        returns (bool)
    {
        return whitelist[user1] && whitelist[user2] && whitelist[user3];
    }

    // Gas efficient: local variable caching
    function checkWhitelistGood(address user1, address user2, address user3)
        public
        view
        returns (bool)
    {
        bool isUser1Whitelisted = whitelist[user1];
        bool isUser2Whitelisted = whitelist[user2];
        bool isUser3Whitelisted = whitelist[user3];
        return isUser1Whitelisted && isUser2Whitelisted && isUser3Whitelisted;
    }

    // Gas inefficient: string concatenation and large strings waste storage
    string public largeDescription = "This is a very long description that takes up a lot of storage and costs more gas";

    // Gas efficient: shorter strings or using bytes32 for small strings
    bytes32 public constant SHORT_DESC = "ShortDesc";

    // Add number to array
    function addNumber(uint256 num) public {
        numbers.push(num);
        emit NumberAdded(num);
    }

    // Whitelist user
    function whitelistUser(address user) public {
        whitelist[user] = true;
        emit UserWhitelisted(user);
    }

    // Get array length
    function getNumberCount() public view returns (uint256) {
        return numbers.length;
    }
}
