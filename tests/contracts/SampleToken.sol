pragma solidity ^0.4.24;

/**
 * Originally from https://github.com/OpenZeppelin/zeppelin-solidity
 * Modified by https://www.coinfabrik.com/
 *
 * This version is being used for solc-native test. Please do not remove.
 */

import {SafeMath} from "./libs/SafeMath.sol";

/**
 * @title Standard token
 * @notice Basic implementation of the EIP20 standard token (also known as ERC20 token).
 */
contract SampleToken {
    using SafeMath for uint256;

    //-----------------------------------------
    //Events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed burner, uint256 amount);

    //-----------------------------------------
    //Variables
    address public owner;
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public total_supply;
    mapping(address => uint256) private balances;
    mapping(address => mapping(address => uint256)) private allowed;

    //-----------------------------------------
    //Functions
    constructor(string _name, string _symbol, uint8 _decimals) public {
        owner = msg.sender;
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    /**
     * @dev transfer token for a specified address
     * @param to The address to transfer to.
     * @param value The amount to be transferred.
     */
    function transfer(address to, uint256 value) public returns (bool success) {
        balances[msg.sender] = balances[msg.sender].sub(value);
        balances[to] = balances[to].add(value);

        emit Transfer(msg.sender, to, value);
        return true;
    }

    /**
     * @dev Gets the balance of the specified address.
     * @param account The address whose balance is to be queried.
     * @return An uint256 representing the amount owned by the passed address.
     */
    function balanceOf(address account) public view returns (uint256 balance) {
        return balances[account];
    }

    /**
     * @dev Transfer tokens from one address to another
     * @param from address The address which you want to send tokens from
     * @param to address The address which you want to transfer to
     * @param value uint256 the amout of tokens to be transfered
     */
    function transferFrom(address from, address to, uint256 value) public returns (bool success) {
        uint256 allowance = allowed[from][msg.sender];

        // Check is not needed because sub(allowance, value) will already throw if this condition is not met
        // require(value <= allowance);
        // SafeMath uses assert instead of require though, beware when using an analysis tool

        balances[from] = balances[from].sub(value);
        balances[to] = balances[to].add(value);
        allowed[from][msg.sender] = allowance.sub(value);
        emit Transfer(from, to, value);
        return true;
    }

    /**
     * @dev Aprove the passed address to spend the specified amount of tokens on behalf of msg.sender.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     */
    function approve(address spender, uint256 value) public returns (bool success) {
        // To change the approve amount you first have to reduce the addresses'
        //  allowance to zero by calling `approve(spender, 0)` if it is not
        //  already 0 to mitigate the race condition described here:
        //  https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
        require(value == 0 || allowed[msg.sender][spender] == 0);

        allowed[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    /**
     * @dev Function to check the amount of tokens than an owner allowed to a spender.
     * @param account address The address which owns the funds.
     * @param spender address The address which will spend the funds.
     * @return A uint256 specifing the amount of tokens still avaible for the spender.
     */
    function allowance(address account, address spender) public view returns (uint256 remaining) {
        return allowed[account][spender];
    }

    /**
     * Atomic increment of approved spending
     *
     * Works around https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     */
    function addApproval(address spender, uint256 addedValue) public returns (bool success) {
        uint256 oldValue = allowed[msg.sender][spender];
        allowed[msg.sender][spender] = oldValue.add(addedValue);
        emit Approval(msg.sender, spender, allowed[msg.sender][spender]);
        return true;
    }

    /**
     * Atomic decrement of approved spending.
     *
     * Works around https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     */
    function subApproval(address spender, uint256 subtractedValue) public returns (bool success) {
        uint256 oldVal = allowed[msg.sender][spender];
        if (subtractedValue > oldVal) {
            allowed[msg.sender][spender] = 0;
        } else {
            allowed[msg.sender][spender] = oldVal.sub(subtractedValue);
        }
        emit Approval(msg.sender, spender, allowed[msg.sender][spender]);
        return true;
    }

    /**
     * @dev Function to mint tokens
     * @param _to The address that will receive the minted tokens.
     * @param _amount The amount of tokens to mint.
     * @return A boolean that indicates if the operation was successful.
     */
    function mint(address _to, uint256 _amount) onlyOwner public returns (bool) {
        total_supply = total_supply.add(_amount);
        balances[_to] = balances[_to].add(_amount);
        emit Mint(_to, _amount);
        emit Transfer(address(0), _to, _amount);
        return true;
    }

    /**
     * @dev Burns a specific amount of tokens.
     * @param amount The amount of token to be burned.
     */
    function burn(uint256 amount) public {
        require(amount <= balances[msg.sender]);
        // no need to require amount <= totalSupply, since that would imply the
        // sender's balance is greater than the totalSupply, which *should* be an assertion failure
        total_supply = total_supply.sub(amount);
        balances[msg.sender] = balances[msg.sender].sub(amount);
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
    }

    function doClamp(uint256 a) public pure returns (uint256) {
        uint256 c = SafeMath.clamp(a, 1, 100);
        return c;
    }

    //-----------------------------------------
    //Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }
}


/**
 * @title DummyContractInSameFile
 * @notice A dummy contract to test support of multiple contracts on the same file
 */
contract DummyContractInSameFile {
    uint256 public value;

    function set(uint256 newValue) public {
        value = newValue;
    }

    function get() public view returns (uint256) {
        return value;
    }
}
