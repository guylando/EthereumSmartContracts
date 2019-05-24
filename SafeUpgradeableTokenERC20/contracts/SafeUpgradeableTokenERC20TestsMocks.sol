pragma solidity 0.5.8;

import "./SafeUpgradeableTokenERC20.sol";

contract SafeUpgradeableTokenERC20Test is SafeUpgradeableTokenERC20 {
    constructor (address _previousToken, string memory _name, string memory _symbol, uint8 _decimals, uint256 _supply)
        public
        SafeUpgradeableTokenERC20(_previousToken, _name, _symbol, _decimals, _supply)
    {
    }

    function getPausersCount() public view returns (uint256) {
        return _pausersCount;
    }

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) public {
        _burn(account, amount);
    }

    function burnFrom(address account, uint256 amount) public {
        _burnFrom(account, amount);
    }

    function transferInternal(address from, address to, uint256 value) public {
        _transfer(from, to, value);
    }

    function approveInternal(address owner, address spender, uint256 value) public {
        _approve(owner, spender, value);
    }

    function onlyPauserMock() public view onlyPauser {
        // solhint-disable-previous-line no-empty-blocks
    }

    function upgradeFromRemote(UpgradeAgent agent, uint256 value) public {
        agent.upgradeFrom(msg.sender, value);
    }

    function isOwnerRemote(Ownable otherContract) public view returns (bool) {
        return otherContract.isOwner();
    }
}
contract NoUpgradeAgentMock {
    address private owner;
    constructor () public
    {
        owner = msg.sender;
    }

    function () external payable {
        // solhint-disable-previous-line no-empty-blocks
    }

    function kill(address payable target) public {
        require(msg.sender == owner, "only owner can call this");
        selfdestruct(target);
    }
}
contract NoTransferMock {
    address private owner;
    constructor () public
    {
        owner = msg.sender;
    }

    function balanceOf(address) public pure returns (uint256) {
        return 10;
    }
}