## Sūrya's Description Report

### Files Description Table


|  File Name  |  SHA-1 Hash  |
|-------------|--------------|
| SafeUpgradeableTokenERC20.sol | 1e37c8e085877645f41c3b9346d02713d78f4621 |


### Contracts Description Table


|  Contract  |         Type        |       Bases      |                  |                 |
|:----------:|:-------------------:|:----------------:|:----------------:|:---------------:|
|     └      |  **Function Name**  |  **Visibility**  |  **Mutability**  |  **Modifiers**  |
||||||
| **IERC20** | Interface |  |||
| └ | transfer | External ❗️ | 🛑  |NO❗️ |
| └ | approve | External ❗️ | 🛑  |NO❗️ |
| └ | transferFrom | External ❗️ | 🛑  |NO❗️ |
| └ | totalSupply | External ❗️ |   |NO❗️ |
| └ | balanceOf | External ❗️ |   |NO❗️ |
| └ | allowance | External ❗️ |   |NO❗️ |
||||||
| **SafeMath** | Library |  |||
| └ | mul | Internal 🔒 |   | |
| └ | div | Internal 🔒 |   | |
| └ | sub | Internal 🔒 |   | |
| └ | add | Internal 🔒 |   | |
| └ | mod | Internal 🔒 |   | |
||||||
| **Ownable** | Implementation |  |||
| └ | \<Constructor\> | Internal 🔒 | 🛑  | |
| └ | owner | Public ❗️ |   |NO❗️ |
| └ | isOwner | Public ❗️ |   |NO❗️ |
| └ | transferOwnership | Public ❗️ | 🛑  | onlyOwner |
| └ | _transferOwnership | Internal 🔒 | 🛑  | |
||||||
| **ERC20** | Implementation | IERC20 |||
| └ | totalSupply | Public ❗️ |   |NO❗️ |
| └ | balanceOf | Public ❗️ |   |NO❗️ |
| └ | allowance | Public ❗️ |   |NO❗️ |
| └ | transfer | Public ❗️ | 🛑  |NO❗️ |
| └ | approve | Public ❗️ | 🛑  |NO❗️ |
| └ | transferFrom | Public ❗️ | 🛑  |NO❗️ |
| └ | increaseAllowance | Public ❗️ | 🛑  |NO❗️ |
| └ | decreaseAllowance | Public ❗️ | 🛑  |NO❗️ |
| └ | _transfer | Internal 🔒 | 🛑  | |
| └ | _mint | Internal 🔒 | 🛑  | |
| └ | _burn | Internal 🔒 | 🛑  | |
| └ | _approve | Internal 🔒 | 🛑  | |
| └ | _burnFrom | Internal 🔒 | 🛑  | |
||||||
| **Roles** | Library |  |||
| └ | add | Internal 🔒 | 🛑  | |
| └ | remove | Internal 🔒 | 🛑  | |
| └ | has | Internal 🔒 |   | |
||||||
| **PauserRole** | Implementation |  |||
| └ | \<Constructor\> | Internal 🔒 | 🛑  | |
| └ | isPauser | Public ❗️ |   |NO❗️ |
| └ | addPauser | Public ❗️ | 🛑  | onlyPauser |
| └ | removePauser | Public ❗️ | 🛑  | onlyPauser |
| └ | _addPauser | Internal 🔒 | 🛑  | |
| └ | _removePauser | Internal 🔒 | 🛑  | |
||||||
| **Pausable** | Implementation | PauserRole |||
| └ | \<Constructor\> | Internal 🔒 | 🛑  | |
| └ | paused | Public ❗️ |   |NO❗️ |
| └ | pause | Public ❗️ | 🛑  | onlyPauser whenNotPaused |
| └ | unpause | Public ❗️ | 🛑  | onlyPauser whenPaused |
||||||
| **ERC20Pausable** | Implementation | ERC20, Pausable |||
| └ | transfer | Public ❗️ | 🛑  | whenNotPaused |
| └ | transferFrom | Public ❗️ | 🛑  | whenNotPaused |
| └ | approve | Public ❗️ | 🛑  | whenNotPaused |
| └ | increaseAllowance | Public ❗️ | 🛑  | whenNotPaused |
| └ | decreaseAllowance | Public ❗️ | 🛑  | whenNotPaused |
||||||
| **ERC20Detailed** | Implementation | IERC20 |||
| └ | \<Constructor\> | Public ❗️ | 🛑  | |
| └ | name | Public ❗️ |   |NO❗️ |
| └ | symbol | Public ❗️ |   |NO❗️ |
| └ | decimals | Public ❗️ |   |NO❗️ |
||||||
| **UpgradeAgent** | Implementation |  |||
| └ | isUpgradeAgent | Public ❗️ |   |NO❗️ |
| └ | upgradeFrom | Public ❗️ | 🛑  |NO❗️ |
||||||
| **Address** | Library |  |||
| └ | isContract | Internal 🔒 |   | |
||||||
| **SafeERC20** | Library |  |||
| └ | safeTransfer | Internal 🔒 | 🛑  | |
| └ | safeTransferFrom | Internal 🔒 | 🛑  | |
| └ | safeApprove | Internal 🔒 | 🛑  | |
| └ | safeIncreaseAllowance | Internal 🔒 | 🛑  | |
| └ | safeDecreaseAllowance | Internal 🔒 | 🛑  | |
| └ | callOptionalReturn | Private 🔐 | 🛑  | |
||||||
| **SafeUpgradeableTokenERC20** | Implementation | ERC20Pausable, ERC20Detailed, Ownable, UpgradeAgent |||
| └ | \<Constructor\> | Public ❗️ | 🛑  | ERC20Detailed |
| └ | upgrade | External ❗️ | 🛑  |NO❗️ |
| └ | upgradeFrom | Public ❗️ | 🛑  | validateAddress |
| └ | setUpgradeAgent | External ❗️ | 🛑  | onlyUpgradeMaster validateAddress |
| └ | getUpgradeState | Public ❗️ |   |NO❗️ |
| └ | setUpgradeMaster | Public ❗️ | 🛑  | onlyUpgradeMaster validateAddress |
| └ | recoverToken | External ❗️ | 🛑  | onlyOwner |
| └ | reclaimContract | External ❗️ | 🛑  | onlyOwner |
| └ | tokenFallback | External ❗️ |   |NO❗️ |
| └ | recoverEther | External ❗️ | 🛑  | onlyOwner |


### Legend

|  Symbol  |  Meaning  |
|:--------:|-----------|
|    🛑    | Function can modify state |
|    💵    | Function is payable |
