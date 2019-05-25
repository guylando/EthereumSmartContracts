# EthereumSmartContracts
Provides implementations with full tests coverage for various Ethereum smart contracts:

### SafeUpgradeableTokenERC20 contract

An ERC20 implementation which includes many defense mechanisms and best practices from https://github.com/guylando/KnowledgeLists/blob/master/EthereumSmartContracts.md , for example:
1. Protects from double spend exploit of approve mechanism.
2. Protects from ether getting locked.
3. Protects from tokens getting locked.
4. Protects from contracts getting trapped as being owned by the token contract.
5. Provides a protection mechanism against a future discovered bug by first allowing to pause the token (which is important as described in: https://github.com/OpenZeppelin/openzeppelin-solidity/issues/795#issuecomment-492349517) and then to migrate the token to a new address safely and without trust issues.
6. Protects from decreaseAllowance failing when it is used to quickly remove allowance from an attacker.
7. Supports unbounded allowance to allow better gas usage for the users of this token.
8. Provides easy transperency into information saved in the contract so any non-technical user can verify that the deployed contract is not malicious.
9. Protects from undetected unexpected behavior when calling the contract by performing a wide range of input validations everywhere.
10. Uses latest solidity compiler version to get the benefits of all the improvements of latest compiler version.
11. Locks into specific compiler version to prevent the contract being compiled by a compiler version which will introduce bugs into the contract.
12. Well documented and tested. Has unit tests coverage of all the functions in over 200 automatic tests. You can find the tests list and execution information here: https://github.com/guylando/EthereumSmartContracts/blob/master/SafeUpgradeableTokenERC20/Token_Automatic_Tests_List.txt
13. Successfully approved after being scanned for security vulnerabilities by the Mithril smart contracts security analysis tool https://github.com/ConsenSys/mythril
14. Successfully verified that no serious bugs and vulnerabilities exist by the Slither static solidity security analyzer https://github.com/crytic/slither

To easily deploy the contract you can just copy https://github.com/guylando/EthereumSmartContracts/blob/master/SafeUpgradeableTokenERC20/contracts/SafeUpgradeableTokenERC20.sol to remix and choose 0.5.8 compiler version and then it should be compiled successfully and be ready for deployment with your desired token parameters.
