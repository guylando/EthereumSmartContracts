/* This file is based on the MIT licensed code in https://github.com/OpenZeppelin/openzeppelin-solidity https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/LICENSE */
const { BN, constants, expectEvent, shouldFail } = require('openzeppelin-test-helpers');
const { ZERO_ADDRESS } = constants;

const {
  shouldBehaveLikeERC20,
  shouldBehaveLikeERC20Transfer,
  shouldBehaveLikeERC20Approve,
} = require('./ERC20.behavior');

const SafeUpgradeableTokenERC20 = artifacts.require('SafeUpgradeableTokenERC20Test');
const NoUpgradeAgentContract = artifacts.require('NoUpgradeAgentMock');
const NoTransferMock = artifacts.require('NoTransferMock');

function createNewSafeUpgradeableTokenERC20(initialHolder,
  { initialSupply = web3.utils.toBN('650000000000000000000000000'),
  name = 'Test Token',
  symbol = 'Test',
  decimals = 18,
  previousTokenAddress = ZERO_ADDRESS }) {
    return SafeUpgradeableTokenERC20.new(previousTokenAddress, name, symbol, decimals, initialSupply, { from: initialHolder });
}

function capitalize (str) {
  return str.replace(/\b\w/g, l => l.toUpperCase());
}

// Tests that a role complies with the standard role interface, that is:
//  * an onlyRole modifier
//  * an isRole function
//  * an addRole function, accessible to role havers
//  * a renounceRole function
//  * roleAdded and roleRemoved events
// Both the modifier and an additional internal remove function are tested through a mock contract that exposes them.
// This mock contract should be stored in this.contract.
//
// @param authorized an account that has the role
// @param otherAuthorized another account that also has the role
// @param other an account that doesn't have the role, passed inside an array for ergonomics
// @param rolename a string with the name of the role
// @param manager undefined for regular roles, or a manager account for managed roles. In these, only the manager
// account can create and remove new role bearers.
function shouldBehaveLikePublicRole (authorized, otherAuthorized, [other], rolename, manager) {
  rolename = capitalize(rolename);

  describe('should behave like public role', function () {
    beforeEach('check preconditions', async function () {
      (await this.contract[`is${rolename}`](authorized)).should.equal(true);
      (await this.contract[`is${rolename}`](otherAuthorized)).should.equal(true);
      (await this.contract[`is${rolename}`](other)).should.equal(false);
      (await this.contract[`get${rolename}sCount`]()).should.be.bignumber.equal(new BN(2));
    });

    if (manager === undefined) { // Managed roles are only assigned by the manager, and none are set at construction
      it('emits events during construction', async function () {
        await expectEvent.inConstruction(this.contract, `${rolename}Added`, {
          account: authorized,
        });
      });
    }

    it('reverts when querying roles for the null account', async function () {
      await shouldFail.reverting.withMessage(this.contract[`is${rolename}`](ZERO_ADDRESS),
        'Roles: account is the zero address'
      );
    });

    describe('access control', function () {
      context('from authorized account', function () {
        const from = authorized;

        it('allows access', async function () {
          await this.contract[`only${rolename}Mock`]({ from });
        });
      });

      context('from unauthorized account', function () {
        const from = other;

        it('reverts', async function () {
          await shouldFail.reverting.withMessage(this.contract[`only${rolename}Mock`]({ from }),
            `${rolename}Role: caller does not have the ${rolename} role`
          );
        });
      });
    });

    describe('add', function () {
      const from = manager === undefined ? authorized : manager;

      context(`from ${manager ? 'the manager' : 'a role-haver'} account`, function () {
        it('adds role to a new account', async function () {
          await this.contract[`add${rolename}`](other, { from });
          (await this.contract[`is${rolename}`](other)).should.equal(true);
          (await this.contract[`get${rolename}sCount`]()).should.be.bignumber.equal(new BN(3));
        });

        it(`emits a ${rolename}Added event`, async function () {
          const { logs } = await this.contract[`add${rolename}`](other, { from });
          expectEvent.inLogs(logs, `${rolename}Added`, { account: other });
        });

        it('reverts when adding role to an already assigned account', async function () {
          await shouldFail.reverting.withMessage(this.contract[`add${rolename}`](authorized, { from }),
            'Roles: account already has role'
          );
        });

        it('reverts when adding role to the null account', async function () {
          await shouldFail.reverting.withMessage(this.contract[`add${rolename}`](ZERO_ADDRESS, { from }),
            'Roles: account is the zero address'
          );
        });

        it('reverts when adding role to the current contract', async function () {
          await shouldFail.reverting.withMessage(this.contract[`add${rolename}`](this.contract.address, { from }),
            'Roles: account is the contract address'
          );
        });
      });
    });

    describe('remove', function () {
      // Non-managed roles have no restrictions on the mocked '_remove' function (exposed via 'remove').
      const from = manager || other;

      context(`from ${manager ? 'the manager' : 'any'} account`, function () {
        it('removes role from an already assigned account by same account', async function () {
          await this.contract[`remove${rolename}`](authorized, { from: authorized });
          (await this.contract[`is${rolename}`](authorized)).should.equal(false);
          (await this.contract[`is${rolename}`](otherAuthorized)).should.equal(true);
          (await this.contract[`get${rolename}sCount`]()).should.be.bignumber.equal(new BN(1));
        });

        it('removes role from an already assigned account by other account', async function () {
          await this.contract[`remove${rolename}`](authorized, { from: otherAuthorized });
          (await this.contract[`is${rolename}`](authorized)).should.equal(false);
          (await this.contract[`is${rolename}`](otherAuthorized)).should.equal(true);
          (await this.contract[`get${rolename}sCount`]()).should.be.bignumber.equal(new BN(1));
        });

        it(`emits a ${rolename}Removed event`, async function () {
          const { logs } = await this.contract[`remove${rolename}`](authorized, { from: authorized });
          expectEvent.inLogs(logs, `${rolename}Removed`, { account: authorized });
        });

        it('reverts when removing last assigned account', async function () {
          await this.contract[`remove${rolename}`](authorized, { from: authorized });
          await shouldFail.reverting.withMessage(this.contract[`remove${rolename}`](otherAuthorized, { from: otherAuthorized }),
            `${rolename}Role: there should always be at least one ${rolename.toLowerCase()} left`
          );
        });

        it('reverts when removing from an unassigned account', async function () {
          await shouldFail.reverting.withMessage(this.contract[`remove${rolename}`](other, { from: authorized }),
            'Roles: account does not have role'
          );
        });

        it('reverts when removing role from the null account', async function () {
          await shouldFail.reverting.withMessage(this.contract[`remove${rolename}`](ZERO_ADDRESS, { from: authorized }),
            'Roles: account is the zero address'
          );
        });

        /* Can't be reached normally since current contract can't be added the role in the first place */
        it('reverts when removing role from the current contract', async function () {
          await shouldFail.reverting.withMessage(this.contract[`remove${rolename}`](this.contract.address, { from: authorized }),
            /* truffle test passes if message is 'Roles: account is the contract address' while coverage passes if message is  */
          // 'Roles: account is the contract address'
          'Roles: account does not have role'
          );
        });
      });
    });
  });
}

contract('ERC20', function ([_, initialHolder, recipient, anotherAccount]) {
  const initialSupply = new BN(100);

  beforeEach(async function () {
    this.token = await createNewSafeUpgradeableTokenERC20(initialHolder, {initialSupply: initialSupply});
  });

  shouldBehaveLikeERC20('ERC20', initialSupply, initialHolder, recipient, anotherAccount);

  describe('decrease allowance', function () {
    describe('when the spender is not the zero address', function () {
      const spender = recipient;

      function shouldDecreaseApproval (amount) {
        describe('when there was no approved amount before', function () {
          it('reverts', async function () {
            await shouldFail.reverting.withMessage(this.token.decreaseAllowance(
              spender, amount, { from: initialHolder }), 'ERC20: current allowance must not be 0'
            );
          });
        });

        describe('when the spender had an approved amount', function () {
          const approvedAmount = amount;

          beforeEach(async function () {
            ({ logs: this.logs } = await this.token.approve(spender, approvedAmount, { from: initialHolder }));
          });

          it('emits an approval event', async function () {
            const { logs } = await this.token.decreaseAllowance(spender, approvedAmount, { from: initialHolder });

            const event = expectEvent.inLogs(logs, 'Approval', {
              owner: initialHolder,
              spender: spender,
              value: new BN(0),
            });
      
            event.args.value.should.be.bignumber.equal(new BN(0));
          });

          it('decreases the spender allowance subtracting the requested amount', async function () {
            await this.token.decreaseAllowance(spender, approvedAmount.subn(1), { from: initialHolder });

            (await this.token.allowance(initialHolder, spender)).should.be.bignumber.equal('1');
          });

          it('sets the allowance to zero when all allowance is removed', async function () {
            await this.token.decreaseAllowance(spender, approvedAmount, { from: initialHolder });
            (await this.token.allowance(initialHolder, spender)).should.be.bignumber.equal('0');
          });

          it('sets the allowance to zero when more than the full allowance is removed', async function () {
            await this.token.decreaseAllowance(spender, approvedAmount.addn(1), { from: initialHolder });
            (await this.token.allowance(initialHolder, spender)).should.be.bignumber.equal('0');
          });
        });
      }

      describe('when the sender has enough balance', function () {
        const amount = initialSupply;

        shouldDecreaseApproval(amount);
      });

      describe('when the sender does not have enough balance', function () {
        const amount = initialSupply.addn(1);

        shouldDecreaseApproval(amount);
      });
    });

    describe('when the amount is zero', function () {
      const spender = recipient;
      amount = 0;

      it('reverts', async function () {
        await shouldFail.reverting.withMessage(
          this.token.decreaseAllowance(spender, amount, { from: initialHolder }), 'ERC20: decreaseAllowance value can\'t be 0'
        );
      });
    });

    describe('when the spender is the zero address', function () {
      const amount = initialSupply;
      const spender = ZERO_ADDRESS;

      it('reverts', async function () {
        await shouldFail.reverting.withMessage(this.token.decreaseAllowance(
          spender, amount, { from: initialHolder }), 'ERC20: current allowance must not be 0'
        );
      });
    });
  });

  describe('increase allowance', function () {
    const amount = initialSupply;

    describe('when the spender is not the zero address', function () {
      const spender = recipient;

      describe('when the sender has enough balance', function () {
        it('emits an approval event', async function () {
          const { logs } = await this.token.increaseAllowance(spender, amount, { from: initialHolder });

          const event = expectEvent.inLogs(logs, 'Approval', {
            owner: initialHolder,
            spender: spender,
            value: amount,
          });
      
          event.args.value.should.be.bignumber.equal(amount);
        });

        describe('when there was no approved amount before', function () {
          beforeEach(async function () {
            await this.token.approve(spender, new BN(0), { from: initialHolder });
          });
          it('approves the requested amount', async function () {
            await this.token.increaseAllowance(spender, amount, { from: initialHolder });

            (await this.token.allowance(initialHolder, spender)).should.be.bignumber.equal(amount);
          });
        });

        describe('when the spender had an approved amount', function () {
          beforeEach(async function () {
            await this.token.approve(spender, new BN(1), { from: initialHolder });
          });

          it('increases the spender allowance adding the requested amount', async function () {
            await this.token.increaseAllowance(spender, amount, { from: initialHolder });

            (await this.token.allowance(initialHolder, spender)).should.be.bignumber.equal(amount.addn(1));
          });
        });
      });

      describe('when the sender does not have enough balance', function () {
        const amount = initialSupply.addn(1);

        it('emits an approval event', async function () {
          const { logs } = await this.token.increaseAllowance(spender, amount, { from: initialHolder });

          const event = expectEvent.inLogs(logs, 'Approval', {
            owner: initialHolder,
            spender: spender,
            value: amount,
          });
      
          event.args.value.should.be.bignumber.equal(amount);
        });

        describe('when there was no approved amount before', function () {
          it('approves the requested amount', async function () {
            await this.token.increaseAllowance(spender, amount, { from: initialHolder });

            (await this.token.allowance(initialHolder, spender)).should.be.bignumber.equal(amount);
          });
        });

        describe('when the spender had an approved amount', function () {
          beforeEach(async function () {
            await this.token.approve(spender, new BN(1), { from: initialHolder });
          });

          it('increases the spender allowance adding the requested amount', async function () {
            await this.token.increaseAllowance(spender, amount, { from: initialHolder });

            (await this.token.allowance(initialHolder, spender)).should.be.bignumber.equal(amount.addn(1));
          });
        });
      });
    });

    describe('when the amount is zero', function () {
      const spender = recipient;

      it('reverts', async function () {
        await shouldFail.reverting.withMessage(
          this.token.increaseAllowance(spender, 0, { from: initialHolder }), 'ERC20: addedValue value can\'t be 0'
        );
      });
    });

    describe('when the spender is the zero address', function () {
      const spender = ZERO_ADDRESS;

      it('reverts', async function () {
        await shouldFail.reverting.withMessage(
          this.token.increaseAllowance(spender, amount, { from: initialHolder }), 'ERC20: approve to the zero address'
        );
      });
    });
  });

  describe('_mint', function () {
    const amount = new BN(50);
    it('rejects a null account', async function () {
      await shouldFail.reverting.withMessage(
        this.token.mint(ZERO_ADDRESS, amount), 'ERC20: mint to the zero address'
      );
    });

    describe('when the amount overflows', function () {
      it('reverts', async function () {
        await shouldFail.reverting.withMessage(this.token.mint(initialHolder, new BN('2').pow(new BN('256')).sub(new BN('1'))),
          'SafeMath: addition overflow'
        );
      });
    });

    describe('when the account is the current contract', function () {
      it('reverts', async function () {
        await shouldFail.reverting.withMessage(this.token.mint(this.token.address, new BN(1)),
          'ERC20: mint to the contract address'
        );
      });
    });

    it('rejects minting zero value', async function () {
      await shouldFail.reverting.withMessage(
        this.token.mint(recipient, new BN(0)), 'ERC20: mint value must be positive'
      );
    });

    describe('for a non zero account', function () {
      beforeEach('minting', async function () {
        const { logs } = await this.token.mint(recipient, amount);
        this.logs = logs;
      });

      it('increments totalSupply', async function () {
        const expectedSupply = initialSupply.add(amount);
        (await this.token.totalSupply()).should.be.bignumber.equal(expectedSupply);
      });

      it('increments recipient balance', async function () {
        (await this.token.balanceOf(recipient)).should.be.bignumber.equal(amount);
      });

      it('emits Transfer event', async function () {
        const event = expectEvent.inLogs(this.logs, 'Transfer', {
          from: ZERO_ADDRESS,
          to: recipient,
          value: amount,
        });

        event.args.value.should.be.bignumber.equal(amount);
      });
    });
  });

  describe('_burn', function () {
    it('rejects a null account', async function () {
      await shouldFail.reverting.withMessage(this.token.burn(ZERO_ADDRESS, new BN(1)),
        'ERC20: burn from the zero address');
    });

    describe('when the account is the current contract', function () {
      it('reverts', async function () {
        await shouldFail.reverting.withMessage(this.token.burn(this.token.address, new BN(1)),
          'ERC20: burn from the contract address'
        );
      });
    });

    describe('for a non zero account', function () {
      it('rejects burning more than balance', async function () {
        await shouldFail.reverting.withMessage(this.token.burn(
          initialHolder, initialSupply.addn(1)), 'SafeMath: subtraction overflow'
        );
      });

      const describeBurn = function (description, amount) {
        describe(description, function () {
          beforeEach('burning', async function () {
            const { logs } = await this.token.burn(initialHolder, amount);
            this.logs = logs;
          });

          it('decrements totalSupply', async function () {
            const expectedSupply = initialSupply.sub(amount);
            (await this.token.totalSupply()).should.be.bignumber.equal(expectedSupply);
          });

          it('decrements initialHolder balance', async function () {
            const expectedBalance = initialSupply.sub(amount);
            (await this.token.balanceOf(initialHolder)).should.be.bignumber.equal(expectedBalance);
          });

          it('emits Transfer event', async function () {
            const event = expectEvent.inLogs(this.logs, 'Transfer', {
              from: initialHolder,
              to: ZERO_ADDRESS,
              value: amount,
            });

            event.args.value.should.be.bignumber.equal(amount);
          });
        });
      };

      describeBurn('for entire balance', initialSupply);
      describeBurn('for less amount than balance', initialSupply.subn(1));
    });
  });

  describe('_burnFrom', function () {
    const allowance = new BN(70);

    const spender = anotherAccount;

    beforeEach('approving', async function () {
      await this.token.approve(spender, allowance, { from: initialHolder });
    });

    it('rejects a null account', async function () {
      await shouldFail.reverting.withMessage(this.token.burnFrom(ZERO_ADDRESS, new BN(1)),
        'ERC20: burn from the zero address'
      );
    });

    describe('for a non zero account', function () {
      it('rejects burning more than allowance', async function () {
        await shouldFail.reverting.withMessage(this.token.burnFrom(initialHolder, allowance.addn(1)),
          'SafeMath: subtraction overflow'
        );
      });

      it('rejects burning more than balance', async function () {
        await shouldFail.reverting.withMessage(this.token.burnFrom(initialHolder, initialSupply.addn(1)),
          'SafeMath: subtraction overflow'
        );
      });

      const describeBurnFrom = function (description, amount) {
        describe(description, function () {
          beforeEach('burning', async function () {
            const { logs } = await this.token.burnFrom(initialHolder, amount, { from: spender });
            this.logs = logs;
          });

          it('decrements totalSupply', async function () {
            const expectedSupply = initialSupply.sub(amount);
            (await this.token.totalSupply()).should.be.bignumber.equal(expectedSupply);
          });

          it('decrements initialHolder balance', async function () {
            const expectedBalance = initialSupply.sub(amount);
            (await this.token.balanceOf(initialHolder)).should.be.bignumber.equal(expectedBalance);
          });

          it('decrements spender allowance', async function () {
            const expectedAllowance = allowance.sub(amount);
            (await this.token.allowance(initialHolder, spender)).should.be.bignumber.equal(expectedAllowance);
          });

          it('emits a Transfer event', async function () {
            const event = expectEvent.inLogs(this.logs, 'Transfer', {
              from: initialHolder,
              to: ZERO_ADDRESS,
              value: amount,
            });

            event.args.value.should.be.bignumber.equal(amount);
          });

          it('emits an Approval event', async function () {
            const currentAllowance = await this.token.allowance(initialHolder, spender); 
            const event = expectEvent.inLogs(this.logs, 'Approval', {
              owner: initialHolder,
              spender: spender,
              value: currentAllowance,
            });
      
            event.args.value.should.be.bignumber.equal(currentAllowance);
          });
        });
      };

      describeBurnFrom('for entire allowance', allowance);
      describeBurnFrom('for less amount than allowance', allowance.subn(1));
    });
  });

  describe('_transfer', function () {
    shouldBehaveLikeERC20Transfer('ERC20', initialHolder, recipient, initialSupply, function (from, to, amount) {
      return this.token.transferInternal(from, to, amount);
    });

    describe('when the sender is the zero address', function () {
      it('reverts', async function () {
        await shouldFail.reverting.withMessage(this.token.transferInternal(ZERO_ADDRESS, recipient, initialSupply),
          'ERC20: transfer from the zero address'
        );
      });
    });

    describe('when the receiver is the current contract', function () {
      it('reverts', async function () {
        await shouldFail.reverting.withMessage(this.token.transferInternal(initialHolder, this.token.address, initialSupply),
          'ERC20: transfer to the contract address'
        );
      });
    });
  });

  describe('_approve', function () {
    shouldBehaveLikeERC20Approve('ERC20', initialHolder, recipient, initialSupply, function (owner, spender, amount) {
      return this.token.approveInternal(owner, spender, amount);
    }, true);

    describe('when the owner is the zero address', function () {
      it('reverts', async function () {
        await shouldFail.reverting.withMessage(this.token.approveInternal(ZERO_ADDRESS, recipient, initialSupply),
          'ERC20: approve from the zero address'
        );
      });
    });
  });
});

contract('ERC20Detailed', function (accounts) {
  const _name = 'My Detailed ERC20';
  const _symbol = 'MDT';
  const _decimals = new BN(18);

  beforeEach(async function () {
    this.detailedERC20 = await createNewSafeUpgradeableTokenERC20(accounts[0], {name: _name, symbol: _symbol, decimals: _decimals});
  });

  it('has a name', async function () {
    (await this.detailedERC20.name()).should.be.equal(_name);
  });

  it('has a symbol', async function () {
    (await this.detailedERC20.symbol()).should.be.equal(_symbol);
  });

  it('has an amount of decimals', async function () {
    (await this.detailedERC20.decimals()).should.be.bignumber.equal(_decimals);
  });
});

contract('ERC20Pausable', function ([_, pauser, otherPauser, recipient, anotherAccount, ...otherAccounts]) {
  const initialSupply = new BN(100);

  beforeEach(async function () {
    this.token = await createNewSafeUpgradeableTokenERC20(pauser, {initialSupply: initialSupply});
  });

  describe('pauser role', function () {
    beforeEach(async function () {
      this.contract = this.token;
      await this.contract.addPauser(otherPauser, { from: pauser });
    });

    shouldBehaveLikePublicRole(pauser, otherPauser, otherAccounts, 'pauser');
  });

  describe('pause', function () {
    describe('when the sender is the token pauser', function () {
      const from = pauser;

      describe('when the token is unpaused', function () {
        it('pauses the token', async function () {
          await this.token.pause({ from });
          (await this.token.paused()).should.equal(true);
        });

        it('emits a Pause event', async function () {
          const { logs } = await this.token.pause({ from });

          expectEvent.inLogs(logs, 'Paused');
        });
      });

      describe('when the token is paused', function () {
        beforeEach(async function () {
          await this.token.pause({ from });
        });

        it('reverts', async function () {
          await shouldFail.reverting.withMessage(this.token.pause({ from }), 'Pausable: paused');
        });
      });
    });

    describe('when the sender is not the token pauser', function () {
      const from = anotherAccount;

      it('reverts', async function () {
        await shouldFail.reverting.withMessage(this.token.pause({ from }),
          'PauserRole: caller does not have the Pauser role'
        );
      });
    });
  });

  describe('unpause', function () {
    describe('when the sender is the token pauser', function () {
      const from = pauser;

      describe('when the token is paused', function () {
        beforeEach(async function () {
          await this.token.pause({ from });
        });

        it('unpauses the token', async function () {
          await this.token.unpause({ from });
          (await this.token.paused()).should.equal(false);
        });

        it('emits an Unpause event', async function () {
          const { logs } = await this.token.unpause({ from });

          expectEvent.inLogs(logs, 'Unpaused');
        });
      });

      describe('when the token is unpaused', function () {
        it('reverts', async function () {
          await shouldFail.reverting.withMessage(this.token.unpause({ from }), 'Pausable: not paused');
        });
      });
    });

    describe('when the sender is not the token pauser', function () {
      const from = anotherAccount;

      it('reverts', async function () {
        await shouldFail.reverting.withMessage(this.token.unpause({ from }),
          'PauserRole: caller does not have the Pauser role'
        );
      });
    });
  });

  describe('pausable token', function () {
    const from = pauser;

    describe('paused', function () {
      it('is not paused by default', async function () {
        (await this.token.paused({ from })).should.equal(false);
      });

      it('is paused after being paused', async function () {
        await this.token.pause({ from });
        (await this.token.paused({ from })).should.equal(true);
      });

      it('is not paused after being paused and then unpaused', async function () {
        await this.token.pause({ from });
        await this.token.unpause({ from });
        (await this.token.paused()).should.equal(false);
      });
    });

    describe('transfer', function () {
      it('allows to transfer when unpaused', async function () {
        await this.token.transfer(recipient, initialSupply, { from: pauser });

        (await this.token.balanceOf(pauser)).should.be.bignumber.equal('0');
        (await this.token.balanceOf(recipient)).should.be.bignumber.equal(initialSupply);
      });

      it('allows to transfer when paused and then unpaused', async function () {
        await this.token.pause({ from: pauser });
        await this.token.unpause({ from: pauser });

        await this.token.transfer(recipient, initialSupply, { from: pauser });

        (await this.token.balanceOf(pauser)).should.be.bignumber.equal('0');
        (await this.token.balanceOf(recipient)).should.be.bignumber.equal(initialSupply);
      });

      it('reverts when trying to transfer when paused', async function () {
        await this.token.pause({ from: pauser });

        await shouldFail.reverting.withMessage(this.token.transfer(recipient, initialSupply, { from: pauser }),
          'Pausable: paused'
        );
      });
    });

    describe('approve', function () {
      const allowance = new BN(40);

      it('allows to approve when unpaused', async function () {
        await this.token.approve(anotherAccount, allowance, { from: pauser });

        (await this.token.allowance(pauser, anotherAccount)).should.be.bignumber.equal(allowance);
      });

      it('allows to approve when paused and then unpaused', async function () {
        await this.token.pause({ from: pauser });
        await this.token.unpause({ from: pauser });

        await this.token.approve(anotherAccount, allowance, { from: pauser });

        (await this.token.allowance(pauser, anotherAccount)).should.be.bignumber.equal(allowance);
      });

      it('reverts when trying to approve when paused', async function () {
        await this.token.pause({ from: pauser });

        await shouldFail.reverting.withMessage(this.token.approve(anotherAccount, allowance, { from: pauser }),
          'Pausable: paused'
        );
      });
    });

    describe('transfer from', function () {
      const allowance = new BN(40);

      beforeEach(async function () {
        await this.token.approve(anotherAccount, allowance, { from: pauser });
      });

      it('allows to transfer from when unpaused', async function () {
        await this.token.transferFrom(pauser, recipient, allowance, { from: anotherAccount });

        (await this.token.balanceOf(recipient)).should.be.bignumber.equal(allowance);
        (await this.token.balanceOf(pauser)).should.be.bignumber.equal(initialSupply.sub(allowance));
      });

      it('allows to transfer when paused and then unpaused', async function () {
        await this.token.pause({ from: pauser });
        await this.token.unpause({ from: pauser });

        await this.token.transferFrom(pauser, recipient, allowance, { from: anotherAccount });

        (await this.token.balanceOf(recipient)).should.be.bignumber.equal(allowance);
        (await this.token.balanceOf(pauser)).should.be.bignumber.equal(initialSupply.sub(allowance));
      });

      it('reverts when trying to transfer from when paused', async function () {
        await this.token.pause({ from: pauser });

        await shouldFail.reverting.withMessage(this.token.transferFrom(
          pauser, recipient, allowance, { from: anotherAccount }), 'Pausable: paused'
        );
      });
    });

    describe('decrease approval', function () {
      const allowance = new BN(40);
      const decrement = new BN(10);

      beforeEach(async function () {
        await this.token.approve(anotherAccount, allowance, { from: pauser });
      });

      it('allows to decrease approval when unpaused', async function () {
        await this.token.decreaseAllowance(anotherAccount, decrement, { from: pauser });

        (await this.token.allowance(pauser, anotherAccount)).should.be.bignumber.equal(allowance.sub(decrement));
      });

      it('allows to decrease approval when paused and then unpaused', async function () {
        await this.token.pause({ from: pauser });
        await this.token.unpause({ from: pauser });

        await this.token.decreaseAllowance(anotherAccount, decrement, { from: pauser });

        (await this.token.allowance(pauser, anotherAccount)).should.be.bignumber.equal(allowance.sub(decrement));
      });

      it('reverts when trying to transfer when paused', async function () {
        await this.token.pause({ from: pauser });

        await shouldFail.reverting.withMessage(this.token.decreaseAllowance(
          anotherAccount, decrement, { from: pauser }), 'Pausable: paused'
        );
      });
    });

    describe('increase approval', function () {
      const allowance = new BN(40);
      const increment = new BN(30);

      beforeEach(async function () {
        await this.token.approve(anotherAccount, allowance, { from: pauser });
      });

      it('allows to increase approval when unpaused', async function () {
        await this.token.increaseAllowance(anotherAccount, increment, { from: pauser });

        (await this.token.allowance(pauser, anotherAccount)).should.be.bignumber.equal(allowance.add(increment));
      });

      it('allows to increase approval when paused and then unpaused', async function () {
        await this.token.pause({ from: pauser });
        await this.token.unpause({ from: pauser });

        await this.token.increaseAllowance(anotherAccount, increment, { from: pauser });

        (await this.token.allowance(pauser, anotherAccount)).should.be.bignumber.equal(allowance.add(increment));
      });

      it('reverts when trying to increase approval when paused', async function () {
        await this.token.pause({ from: pauser });

        await shouldFail.reverting.withMessage(this.token.increaseAllowance(
          anotherAccount, increment, { from: pauser }), 'Pausable: paused'
        );
      });
    });
  });
});

function shouldBehaveLikeOwnable (owner, [other]) {
  describe('as an ownable', function () {
    it('should have an owner', async function () {
      (await this.ownable.owner()).should.equal(owner);
    });

    it('changes owner after transfer', async function () {
      (await this.ownable.isOwner({ from: other })).should.be.equal(false);
      const { logs } = await this.ownable.transferOwnership(other, { from: owner });
      expectEvent.inLogs(logs, 'OwnershipTransferred');

      (await this.ownable.owner()).should.equal(other);
      (await this.ownable.isOwner({ from: other })).should.be.equal(true);
    });

    it('should prevent non-owners from transferring', async function () {
      await shouldFail.reverting.withMessage(
        this.ownable.transferOwnership(other, { from: other }),
        'Ownable: caller is not the owner'
      );
    });

    it('should guard ownership against stuck state', async function () {
      await shouldFail.reverting.withMessage(
        this.ownable.transferOwnership(ZERO_ADDRESS, { from: owner }),
        'Ownable: new owner is the zero address'
      );
    });

    it('should prevent transferring ownership to the contract itself', async function () {
      await shouldFail.reverting.withMessage(
        this.ownable.transferOwnership(this.ownable.address, { from: owner }),
        'Ownable: new owner is the contract address'
      );
    });
  });
}

contract('Ownable', function ([_, owner, ...otherAccounts]) {
  beforeEach(async function () {
    this.ownable = await createNewSafeUpgradeableTokenERC20(owner, { from: owner });
  });

  shouldBehaveLikeOwnable(owner, otherAccounts);
});

contract('ERC20UpgradeableToken', function ([_, originalUpgradeMaster, other, upgradedTokenOwner, ...otherAccounts]) {
  const initialSupply = new BN(100);

  beforeEach(async function () {
    this.token = await createNewSafeUpgradeableTokenERC20(originalUpgradeMaster, {initialSupply: initialSupply});
    this.upgradedToken = await createNewSafeUpgradeableTokenERC20(upgradedTokenOwner, {initialSupply: new BN(0), previousTokenAddress: this.token.address});
    this.contractWithoutUpgradeAgent = await NoUpgradeAgentContract.new({ from: originalUpgradeMaster });
  });

  describe('setUpgradeAgent', function () {
    describe('when the caller is not upgrade master', function () {
      const caller = other;
      const newAgentAddress = ZERO_ADDRESS;

      it('reverts', async function () {
        await shouldFail.reverting.withMessage(this.token.setUpgradeAgent(newAgentAddress, { from: caller }),
          'caller must be upgradeMaster'
        );
      });
    });

    describe('when the caller is upgrade master', function () {
      const caller = originalUpgradeMaster;

      describe('when new agent address is the zero address', function () {
        const newAgentAddress = ZERO_ADDRESS;

        it('reverts', async function () {
          await shouldFail.reverting.withMessage(this.token.setUpgradeAgent(newAgentAddress, { from: caller }),
            'invalid address, shouldnt be 0'
          );
        });
      });

      describe('when new agent address is the current contract address', function () {
        it('reverts', async function () {
          const newAgentAddress = this.token.address;
          await shouldFail.reverting.withMessage(this.token.setUpgradeAgent(newAgentAddress, { from: caller }),
            'invalid address, shouldnt be current contract address'
          );
        });
      });

      describe('when new agent does not implement upgrade agent interface', function () {
        it('reverts', async function () {
          const newAgentAddress = this.contractWithoutUpgradeAgent.address;
          await shouldFail.reverting(this.token.setUpgradeAgent(newAgentAddress, { from: caller }));
        });
      });

      describe('when new agent is not a contract', function () {
        const newAgentAddress = '0x0000000000000000000000000000000000000001';

        it('reverts', async function () {
          await shouldFail.reverting(this.token.setUpgradeAgent(newAgentAddress, { from: caller }));
        });
      });

      describe('when new agent implements upgrade agent interface', function () {
        describe('when upgrade state is WaitingForAgent', function () {
          it('sets the upgradeAgent correctly', async function () {
            const newAgentAddress = this.upgradedToken.address;
            await this.token.setUpgradeAgent(newAgentAddress, { from: caller });

            (await this.token.upgradeAgent()).should.be.equal(newAgentAddress);
          });

          it('emits a LogUpgradeAgentSet event', async function () {
            const newAgentAddress = this.upgradedToken.address;
            const { logs } = await this.token.setUpgradeAgent(newAgentAddress, { from: caller });

            expectEvent.inLogs(logs, 'LogUpgradeAgentSet', {
              agent: newAgentAddress,
            });
          });
        });

        describe('when upgrade state is ReadyToUpgrade', function () {
          beforeEach(async function () {
            const newAgentAddress = this.upgradedToken.address;
            await this.token.setUpgradeAgent(newAgentAddress, { from: caller });
          });

          it('sets the upgradeAgent correctly', async function () {
            const newAgentAddress = this.upgradedToken.address;
            await this.token.setUpgradeAgent(newAgentAddress, { from: caller });

            (await this.token.upgradeAgent()).should.be.equal(newAgentAddress);
          });

          it('emits a LogUpgradeAgentSet event', async function () {
            const newAgentAddress = this.upgradedToken.address;
            const { logs } = await this.token.setUpgradeAgent(newAgentAddress, { from: caller });

            expectEvent.inLogs(logs, 'LogUpgradeAgentSet', {
              agent: newAgentAddress,
            });
          });
        });

        describe('when upgrade state is Upgrading', function () {
          it('reverts', async function () {
            const newAgentAddress = this.upgradedToken.address;
            await this.token.setUpgradeAgent(newAgentAddress, { from: caller });
            await this.token.upgrade(10, {from: originalUpgradeMaster});
            await shouldFail.reverting.withMessage(this.token.setUpgradeAgent(newAgentAddress, { from: caller }),
              'upgrade already started'
            );
          });
        });
      });
    });
  });

  describe('setUpgradeMaster', function () {
    describe('when the caller is not upgrade master', function () {
      const caller = other;
      const newUpgradeMasterAddress = ZERO_ADDRESS;

      it('reverts', async function () {
        await shouldFail.reverting.withMessage(this.token.setUpgradeMaster(newUpgradeMasterAddress, { from: caller }),
          'caller must be upgradeMaster'
        );
      });
    });
    describe('when the caller is upgrade master', function () {
      const caller = originalUpgradeMaster;

      describe('when new upgrade master address is the zero address', function () {
        const newUpgradeMasterAddress = ZERO_ADDRESS;

        it('reverts', async function () {
          await shouldFail.reverting.withMessage(this.token.setUpgradeMaster(newUpgradeMasterAddress, { from: caller }),
            'invalid address, shouldnt be 0'
          );
        });
      });

      describe('when new upgrade master address is the current contract address', function () {
        it('reverts', async function () {
          const newUpgradeMasterAddress = this.token.address;
          await shouldFail.reverting.withMessage(this.token.setUpgradeMaster(newUpgradeMasterAddress, { from: caller }),
            'invalid address, shouldnt be current contract address'
          );
        });
      });

      describe('when new upgrade master address is not 0 and not contract address', function () {
        it('sets the upgrade master correctly', async function () {
          const newUpgradeMasterAddress = other;
          await this.token.setUpgradeMaster(newUpgradeMasterAddress, { from: caller });

          (await this.token.upgradeMaster()).should.be.equal(newUpgradeMasterAddress);
        });
      });
    });
  });

  describe('getUpgradeState', function () {
    it('returns WaitingForAgent when upgrade agent is not set', async function () {
      (await this.token.upgradeAgent()).should.be.equal(ZERO_ADDRESS);
      (await this.token.getUpgradeState()).should.be.bignumber.equal(new BN(0));
    });
    it('returns ReadyToUpgrade when upgrade agent is set but no tokens were upgraded yet', async function () {
      const newAgentAddress = this.upgradedToken.address;
      await this.token.setUpgradeAgent(newAgentAddress, { from: originalUpgradeMaster });
      (await this.token.getUpgradeState()).should.be.bignumber.equal(new BN(1));
    });
    it('returns Upgrading when some upgrading happened but not all tokens were upgraded', async function () {
      const newAgentAddress = this.upgradedToken.address;
      await this.token.setUpgradeAgent(newAgentAddress, { from: originalUpgradeMaster });
      await this.token.upgrade(10, {from: originalUpgradeMaster});
      (await this.token.getUpgradeState()).should.be.bignumber.equal(new BN(2));
    });
    it('returns UpgradeFinished when all tokens were upgraded', async function () {
      const newAgentAddress = this.upgradedToken.address;
      await this.token.setUpgradeAgent(newAgentAddress, { from: originalUpgradeMaster });
      await this.token.upgrade(initialSupply, {from: originalUpgradeMaster});
      (await this.token.getUpgradeState()).should.be.bignumber.equal(new BN(3));
    });
  });

  describe('upgrade', function () {
    describe('when upgrade agent is not set', function () {
      it('reverts', async function () {
        (await this.token.upgradeAgent()).should.be.equal(ZERO_ADDRESS);
        await shouldFail.reverting.withMessage(this.token.upgrade(new BN(1), { from: originalUpgradeMaster }),
          'upgrade state does not allow upgrade'
        );
      });
    });
    describe('when upgrade agent is set and no upgrade was done yet', function () {
      beforeEach(async function () {
        const newAgentAddress = this.upgradedToken.address;
        await this.token.setUpgradeAgent(newAgentAddress, { from: originalUpgradeMaster });
      });

      describe('when upgrade value is zero', function () {
        const upgradeValue = new BN(0);

        it('reverts', async function () {
          await shouldFail.reverting.withMessage(this.token.upgrade(upgradeValue, { from: other }),
            'value must be non-zero'
          );
        });
      });

      describe('when upgrade value is higher than user balance', function () {
        const upgradeValue = new BN(1);
        const caller = other;

        it('reverts', async function () {
          await shouldFail.reverting.withMessage(this.token.upgrade(upgradeValue, { from: caller }),
            'SafeMath: subtraction overflow'
          );
        });
      });

      describe('when upgrade value is lower than user balance', function () {
        const upgradeValue = new BN(1);
        const caller = originalUpgradeMaster;

        describe('when token is not paused', function () {
          beforeEach(async function () {
            (await this.token.paused()).should.be.equal(false);
          });

          it('burns value from user balance and total supply', async function () {
            const userBalanceBeforeUpgrade = await this.token.balanceOf(caller);
            const totalSupplyBeforeUpgrade = await this.token.totalSupply();

            const { logs } = await this.token.upgrade(upgradeValue, { from: caller });

            (await this.token.balanceOf(caller)).should.be.bignumber.equal(userBalanceBeforeUpgrade.sub(upgradeValue));
            (await this.token.totalSupply()).should.be.bignumber.equal(totalSupplyBeforeUpgrade.sub(upgradeValue));
            const event = expectEvent.inLogs(logs, 'Transfer', {
              from: caller,
              to: ZERO_ADDRESS,
              value: upgradeValue,
            });

            event.args.value.should.be.bignumber.equal(upgradeValue);
          });

          it('adds value to totalUpgraded', async function () {
            (await this.token.totalUpgraded()).should.be.bignumber.equal(new BN(0));

            await this.token.upgrade(upgradeValue, { from: caller });

            (await this.token.totalUpgraded()).should.be.bignumber.equal(upgradeValue);
          });

          it('emits a LogUpgrade event', async function () {
            const newAgentAddress = this.upgradedToken.address;
            const { logs } = await this.token.upgrade(upgradeValue, { from: caller });

            const event = expectEvent.inLogs(logs, 'LogUpgrade', {
              from: caller,
              to: newAgentAddress,
              value: upgradeValue,
            });
        
            event.args.value.should.be.bignumber.equal(upgradeValue);
          });

          it('adds value to user balance in the upgraded token contract', async function () {
            (await this.upgradedToken.balanceOf(caller)).should.be.bignumber.equal(new BN(0));

            await this.token.upgrade(upgradeValue, { from: caller });

            (await this.upgradedToken.balanceOf(caller)).should.be.bignumber.equal(upgradeValue);
          });
        });

        describe('when token is paused', function () {
          beforeEach(async function () {
            (await this.token.paused()).should.be.equal(false);
            await this.token.pause({from: originalUpgradeMaster});
            (await this.token.paused()).should.be.equal(true);
          });

          it('burns value from user balance and total supply', async function () {
            const userBalanceBeforeUpgrade = await this.token.balanceOf(caller);
            const totalSupplyBeforeUpgrade = await this.token.totalSupply();

            const { logs } = await this.token.upgrade(upgradeValue, { from: caller });

            (await this.token.balanceOf(caller)).should.be.bignumber.equal(userBalanceBeforeUpgrade.sub(upgradeValue));
            (await this.token.totalSupply()).should.be.bignumber.equal(totalSupplyBeforeUpgrade.sub(upgradeValue));
            const event = expectEvent.inLogs(logs, 'Transfer', {
              from: caller,
              to: ZERO_ADDRESS,
              value: upgradeValue,
            });

            event.args.value.should.be.bignumber.equal(upgradeValue);
          });

          it('adds value to totalUpgraded', async function () {
            (await this.token.totalUpgraded()).should.be.bignumber.equal(new BN(0));

            await this.token.upgrade(upgradeValue, { from: caller });

            (await this.token.totalUpgraded()).should.be.bignumber.equal(upgradeValue);
          });

          it('emits a LogUpgrade event', async function () {
            const newAgentAddress = this.upgradedToken.address;
            const { logs } = await this.token.upgrade(upgradeValue, { from: caller });

            const event = expectEvent.inLogs(logs, 'LogUpgrade', {
              from: caller,
              to: newAgentAddress,
              value: upgradeValue,
            });
        
            event.args.value.should.be.bignumber.equal(upgradeValue);
          });

          it('adds value to user balance in the upgraded token contract', async function () {
            (await this.upgradedToken.balanceOf(caller)).should.be.bignumber.equal(new BN(0));

            await this.token.upgrade(upgradeValue, { from: caller });

            (await this.upgradedToken.balanceOf(caller)).should.be.bignumber.equal(upgradeValue);
          });
        });
      });

      describe('when upgrade value is equal to the user balance', function () {
        const upgradeValue = initialSupply;
        const caller = originalUpgradeMaster;

        describe('when token is not paused', function () {
          beforeEach(async function () {
            (await this.token.paused()).should.be.equal(false);
          });
          it('burns value from user balance and total supply', async function () {
            const userBalanceBeforeUpgrade = await this.token.balanceOf(caller);
            const totalSupplyBeforeUpgrade = await this.token.totalSupply();

            const { logs } = await this.token.upgrade(upgradeValue, { from: caller });

            (await this.token.balanceOf(caller)).should.be.bignumber.equal(userBalanceBeforeUpgrade.sub(upgradeValue));
            (await this.token.totalSupply()).should.be.bignumber.equal(totalSupplyBeforeUpgrade.sub(upgradeValue));
            const event = expectEvent.inLogs(logs, 'Transfer', {
              from: caller,
              to: ZERO_ADDRESS,
              value: upgradeValue,
            });
        
            event.args.value.should.be.bignumber.equal(upgradeValue);
          });

          it('adds value to totalUpgraded', async function () {
            (await this.token.totalUpgraded()).should.be.bignumber.equal(new BN(0));

            await this.token.upgrade(upgradeValue, { from: caller });

            (await this.token.totalUpgraded()).should.be.bignumber.equal(upgradeValue);
          });

          it('emits a LogUpgrade event', async function () {
            const newAgentAddress = this.upgradedToken.address;
            const { logs } = await this.token.upgrade(upgradeValue, { from: caller });

            const event = expectEvent.inLogs(logs, 'LogUpgrade', {
              from: caller,
              to: newAgentAddress,
              value: upgradeValue,
            });
        
            event.args.value.should.be.bignumber.equal(upgradeValue);
          });

          it('adds value to user balance in the upgraded token contract', async function () {
            (await this.upgradedToken.balanceOf(caller)).should.be.bignumber.equal(new BN(0));

            await this.token.upgrade(upgradeValue, { from: caller });

            (await this.upgradedToken.balanceOf(caller)).should.be.bignumber.equal(upgradeValue);
          });
        });

        describe('when token is paused', function () {
          beforeEach(async function () {
            (await this.token.paused()).should.be.equal(false);
            await this.token.pause({from: originalUpgradeMaster});
            (await this.token.paused()).should.be.equal(true);
          });
          it('burns value from user balance and total supply', async function () {
            const userBalanceBeforeUpgrade = await this.token.balanceOf(caller);
            const totalSupplyBeforeUpgrade = await this.token.totalSupply();

            const { logs } = await this.token.upgrade(upgradeValue, { from: caller });

            (await this.token.balanceOf(caller)).should.be.bignumber.equal(userBalanceBeforeUpgrade.sub(upgradeValue));
            (await this.token.totalSupply()).should.be.bignumber.equal(totalSupplyBeforeUpgrade.sub(upgradeValue));
            const event = expectEvent.inLogs(logs, 'Transfer', {
              from: caller,
              to: ZERO_ADDRESS,
              value: upgradeValue,
            });
        
            event.args.value.should.be.bignumber.equal(upgradeValue);
          });

          it('adds value to totalUpgraded', async function () {
            (await this.token.totalUpgraded()).should.be.bignumber.equal(new BN(0));

            await this.token.upgrade(upgradeValue, { from: caller });

            (await this.token.totalUpgraded()).should.be.bignumber.equal(upgradeValue);
          });

          it('emits a LogUpgrade event', async function () {
            const newAgentAddress = this.upgradedToken.address;
            const { logs } = await this.token.upgrade(upgradeValue, { from: caller });

            const event = expectEvent.inLogs(logs, 'LogUpgrade', {
              from: caller,
              to: newAgentAddress,
              value: upgradeValue,
            });
        
            event.args.value.should.be.bignumber.equal(upgradeValue);
          });

          it('adds value to user balance in the upgraded token contract', async function () {
            (await this.upgradedToken.balanceOf(caller)).should.be.bignumber.equal(new BN(0));

            await this.token.upgrade(upgradeValue, { from: caller });

            (await this.upgradedToken.balanceOf(caller)).should.be.bignumber.equal(upgradeValue);
          });
        });
      });
    });
    describe('when upgrade agent is set and upgrades were done but not all total supply was upgraded yet', function () {
      const otherUserBalance = new BN(1);

      beforeEach(async function () {
        await this.token.transfer(other, otherUserBalance, {from: originalUpgradeMaster});
        const newAgentAddress = this.upgradedToken.address;
        await this.token.setUpgradeAgent(newAgentAddress, { from: originalUpgradeMaster });
        await this.token.upgrade(otherUserBalance, { from: other });
        (await this.token.totalUpgraded()).should.be.bignumber.equal(otherUserBalance);
      });

      describe('when upgrade value is zero', function () {
        const upgradeValue = new BN(0);

        it('reverts', async function () {
          await shouldFail.reverting.withMessage(this.token.upgrade(upgradeValue, { from: other }),
            'value must be non-zero'
          );
        });
      });

      describe('when upgrade value is higher than user balance', function () {
        const upgradeValue = new BN(1);
        const caller = other;

        it('reverts', async function () {
          await shouldFail.reverting.withMessage(this.token.upgrade(upgradeValue, { from: caller }),
            'SafeMath: subtraction overflow'
          );
        });
      });

      describe('when upgrade value is lower than user balance', function () {
        const upgradeValue = new BN(1);
        const caller = originalUpgradeMaster;

        describe('when token is not paused', function () {
          beforeEach(async function () {
            (await this.token.paused()).should.be.equal(false);
          });
          it('burns value from user balance and total supply', async function () {
            const userBalanceBeforeUpgrade = await this.token.balanceOf(caller);
            const totalSupplyBeforeUpgrade = await this.token.totalSupply();

            const { logs } = await this.token.upgrade(upgradeValue, { from: caller });

            (await this.token.balanceOf(caller)).should.be.bignumber.equal(userBalanceBeforeUpgrade.sub(upgradeValue));
            (await this.token.totalSupply()).should.be.bignumber.equal(totalSupplyBeforeUpgrade.sub(upgradeValue));
            const event = expectEvent.inLogs(logs, 'Transfer', {
              from: caller,
              to: ZERO_ADDRESS,
              value: upgradeValue,
            });
        
            event.args.value.should.be.bignumber.equal(upgradeValue);
          });

          it('adds value to totalUpgraded', async function () {
            (await this.token.totalUpgraded()).should.be.bignumber.equal(otherUserBalance);

            await this.token.upgrade(upgradeValue, { from: caller });

            (await this.token.totalUpgraded()).should.be.bignumber.equal(otherUserBalance.add(upgradeValue));
          });

          it('emits a LogUpgrade event', async function () {
            const newAgentAddress = this.upgradedToken.address;
            const { logs } = await this.token.upgrade(upgradeValue, { from: caller });

            const event = expectEvent.inLogs(logs, 'LogUpgrade', {
              from: caller,
              to: newAgentAddress,
              value: upgradeValue,
            });
        
            event.args.value.should.be.bignumber.equal(upgradeValue);
          });

          it('adds value to user balance in the upgraded token contract', async function () {
            (await this.upgradedToken.balanceOf(caller)).should.be.bignumber.equal(new BN(0));

            await this.token.upgrade(upgradeValue, { from: caller });

            (await this.upgradedToken.balanceOf(caller)).should.be.bignumber.equal(upgradeValue);
          });
        });

        describe('when token is paused', function () {
          beforeEach(async function () {
            (await this.token.paused()).should.be.equal(false);
            await this.token.pause({from: originalUpgradeMaster});
            (await this.token.paused()).should.be.equal(true);
          });
          it('burns value from user balance and total supply', async function () {
            const userBalanceBeforeUpgrade = await this.token.balanceOf(caller);
            const totalSupplyBeforeUpgrade = await this.token.totalSupply();

            const { logs } = await this.token.upgrade(upgradeValue, { from: caller });

            (await this.token.balanceOf(caller)).should.be.bignumber.equal(userBalanceBeforeUpgrade.sub(upgradeValue));
            (await this.token.totalSupply()).should.be.bignumber.equal(totalSupplyBeforeUpgrade.sub(upgradeValue));
            const event = expectEvent.inLogs(logs, 'Transfer', {
              from: caller,
              to: ZERO_ADDRESS,
              value: upgradeValue,
            });
        
            event.args.value.should.be.bignumber.equal(upgradeValue);
          });

          it('adds value to totalUpgraded', async function () {
            (await this.token.totalUpgraded()).should.be.bignumber.equal(otherUserBalance);

            await this.token.upgrade(upgradeValue, { from: caller });

            (await this.token.totalUpgraded()).should.be.bignumber.equal(otherUserBalance.add(upgradeValue));
          });

          it('emits a LogUpgrade event', async function () {
            const newAgentAddress = this.upgradedToken.address;
            const { logs } = await this.token.upgrade(upgradeValue, { from: caller });

            const event = expectEvent.inLogs(logs, 'LogUpgrade', {
              from: caller,
              to: newAgentAddress,
              value: upgradeValue,
            });
        
            event.args.value.should.be.bignumber.equal(upgradeValue);
          });

          it('adds value to user balance in the upgraded token contract', async function () {
            (await this.upgradedToken.balanceOf(caller)).should.be.bignumber.equal(new BN(0));

            await this.token.upgrade(upgradeValue, { from: caller });

            (await this.upgradedToken.balanceOf(caller)).should.be.bignumber.equal(upgradeValue);
          });
        });
      });

      describe('when upgrade value is equal to the user balance', function () {
        const upgradeValue = initialSupply.sub(otherUserBalance);
        const caller = originalUpgradeMaster;
        
        describe('when token is not paused', function () {
          beforeEach(async function () {
            (await this.token.paused()).should.be.equal(false);
          });
          it('burns value from user balance and total supply', async function () {
            const userBalanceBeforeUpgrade = await this.token.balanceOf(caller);
            const totalSupplyBeforeUpgrade = await this.token.totalSupply();

            const { logs } = await this.token.upgrade(upgradeValue, { from: caller });

            (await this.token.balanceOf(caller)).should.be.bignumber.equal(userBalanceBeforeUpgrade.sub(upgradeValue));
            (await this.token.totalSupply()).should.be.bignumber.equal(totalSupplyBeforeUpgrade.sub(upgradeValue));
            const event = expectEvent.inLogs(logs, 'Transfer', {
              from: caller,
              to: ZERO_ADDRESS,
              value: upgradeValue,
            });
        
            event.args.value.should.be.bignumber.equal(upgradeValue);
          });

          it('adds value to totalUpgraded', async function () {
            (await this.token.totalUpgraded()).should.be.bignumber.equal(otherUserBalance);

            await this.token.upgrade(upgradeValue, { from: caller });

            (await this.token.totalUpgraded()).should.be.bignumber.equal(otherUserBalance.add(upgradeValue));
          });

          it('emits a LogUpgrade event', async function () {
            const newAgentAddress = this.upgradedToken.address;
            const { logs } = await this.token.upgrade(upgradeValue, { from: caller });

            const event = expectEvent.inLogs(logs, 'LogUpgrade', {
              from: caller,
              to: newAgentAddress,
              value: upgradeValue,
            });
        
            event.args.value.should.be.bignumber.equal(upgradeValue);
          });

          it('adds value to user balance in the upgraded token contract', async function () {
            (await this.upgradedToken.balanceOf(caller)).should.be.bignumber.equal(new BN(0));

            await this.token.upgrade(upgradeValue, { from: caller });

            (await this.upgradedToken.balanceOf(caller)).should.be.bignumber.equal(upgradeValue);
          });
        });

        describe('when token is paused', function () {
          beforeEach(async function () {
            (await this.token.paused()).should.be.equal(false);
            await this.token.pause({from: originalUpgradeMaster});
            (await this.token.paused()).should.be.equal(true);
          });
          it('burns value from user balance and total supply', async function () {
            const userBalanceBeforeUpgrade = await this.token.balanceOf(caller);
            const totalSupplyBeforeUpgrade = await this.token.totalSupply();

            const { logs } = await this.token.upgrade(upgradeValue, { from: caller });

            (await this.token.balanceOf(caller)).should.be.bignumber.equal(userBalanceBeforeUpgrade.sub(upgradeValue));
            (await this.token.totalSupply()).should.be.bignumber.equal(totalSupplyBeforeUpgrade.sub(upgradeValue));
            const event = expectEvent.inLogs(logs, 'Transfer', {
              from: caller,
              to: ZERO_ADDRESS,
              value: upgradeValue,
            });
        
            event.args.value.should.be.bignumber.equal(upgradeValue);
          });

          it('adds value to totalUpgraded', async function () {
            (await this.token.totalUpgraded()).should.be.bignumber.equal(otherUserBalance);

            await this.token.upgrade(upgradeValue, { from: caller });

            (await this.token.totalUpgraded()).should.be.bignumber.equal(otherUserBalance.add(upgradeValue));
          });

          it('emits a LogUpgrade event', async function () {
            const newAgentAddress = this.upgradedToken.address;
            const { logs } = await this.token.upgrade(upgradeValue, { from: caller });

            const event = expectEvent.inLogs(logs, 'LogUpgrade', {
              from: caller,
              to: newAgentAddress,
              value: upgradeValue,
            });
        
            event.args.value.should.be.bignumber.equal(upgradeValue);
          });

          it('adds value to user balance in the upgraded token contract', async function () {
            (await this.upgradedToken.balanceOf(caller)).should.be.bignumber.equal(new BN(0));

            await this.token.upgrade(upgradeValue, { from: caller });

            (await this.upgradedToken.balanceOf(caller)).should.be.bignumber.equal(upgradeValue);
          });
        });
      });
    });
    describe('when upgrade agent is set and all total supply was upgraded', function () {
      it('reverts', async function () {
        const newAgentAddress = this.upgradedToken.address;
        await this.token.setUpgradeAgent(newAgentAddress, { from: originalUpgradeMaster });
        await this.token.upgrade(initialSupply, {from: originalUpgradeMaster});
        await shouldFail.reverting.withMessage(this.token.upgrade(new BN(1), { from: originalUpgradeMaster }),
          'upgrade state does not allow upgrade'
        );
      });
    });
  });

  describe('upgradeFrom', function () {
    describe('when received address is the zero address', function () {
      const receivedAddress = ZERO_ADDRESS;

      it('reverts', async function () {
        await shouldFail.reverting.withMessage(this.token.upgradeFrom(receivedAddress, new BN(0), { from: other }),
          'invalid address, shouldnt be 0'
        );
      });
    });
    describe('when received address is the contract address', function () {
      it('reverts', async function () {
        const receivedAddress = this.token.address;
        await shouldFail.reverting.withMessage(this.token.upgradeFrom(receivedAddress, new BN(0), { from: other }),
          'invalid address, shouldnt be current contract address'
        );
      });
    });
    describe('when received address is not the zero address and not the contract address', function () {
      describe('when previous token is not set', function () {
        const upgradeValue = new BN(0);

        it('reverts', async function () {
          await shouldFail.reverting.withMessage(this.token.upgradeFrom(other, upgradeValue, { from: other }),
            'previousToken was not set'
          );
        });
      });
      describe('when previous token is set', function () {
        describe('when caller is not the previous token', function () {
          const upgradeValue = new BN(0);

          it('reverts', async function () {
            await shouldFail.reverting.withMessage(this.upgradedToken.upgradeFrom(other, upgradeValue, { from: other }),
              'upgradeFrom should only be called by previousToken'
            );
          });
        });
        describe('when caller is the previous token', function () {
          describe('when upgrade value is zero', function () {
            const upgradeValue = new BN(0);

            it('reverts', async function () {
              await shouldFail.reverting.withMessage(this.token.upgradeFromRemote(this.upgradedToken.address, upgradeValue, { from: other }),
                'ERC20: mint value must be positive'
              );
            });
          });
          describe('when upgrade value is positive', function () {
            const upgradeValue = new BN(1);
            const recipient = other;

            beforeEach(async function () {
              const { logs } = await this.token.upgradeFromRemote(this.upgradedToken.address, upgradeValue, { from: recipient });
              this.logs = logs;
            });

            it('increments totalSupply', async function () {
              (await this.upgradedToken.totalSupply()).should.be.bignumber.equal(upgradeValue);
            });

            it('increments recipient balance', async function () {
              (await this.upgradedToken.balanceOf(recipient)).should.be.bignumber.equal(upgradeValue);
            });

            it('emits Transfer event', async function () {
              const event = expectEvent.inLogs(this.logs, 'Transfer', {
                from: ZERO_ADDRESS,
                to: recipient,
                value: upgradeValue,
              });

              event.args.value.should.be.bignumber.equal(upgradeValue);
            });
          });
        });
      });
    });
  });

  describe('transferFrom of approved upgraded balance', function () {
    it('reverts', async function () {
      const newAgentAddress = this.upgradedToken.address;
      await this.token.setUpgradeAgent(newAgentAddress, { from: originalUpgradeMaster });
      await this.token.approve(other, initialSupply, { from: originalUpgradeMaster });
      await this.token.upgrade(initialSupply, { from: originalUpgradeMaster });
      await shouldFail.reverting.withMessage(this.token.transferFrom(originalUpgradeMaster, other, initialSupply, { from: other }),
        'SafeMath: subtraction overflow'
      );
    });
  });
});

contract('RecoveryFunctionality', function ([_, owner, other, ...otherAccounts]) {
  const initialSupply = new BN(100);

  beforeEach(async function () {
    this.token = await createNewSafeUpgradeableTokenERC20(owner, {initialSupply: initialSupply});
    this.anotherToken = await createNewSafeUpgradeableTokenERC20(other, {initialSupply: initialSupply});
  });

  describe('tokenFallback', function () {
    it('reverts', async function () {
      await shouldFail.reverting.withMessage(this.token.tokenFallback(
        owner, other, "0x0", { from: owner }), 'this contract does not support receiving ERC223 tokens'
      );
    });
  });

  describe('recoverEther', function () {
    describe('when caller is not token owner', function () {
      const caller = other;

      it('reverts', async function () {
        await shouldFail.reverting.withMessage(this.token.recoverEther({ from: caller }),
          'Ownable: caller is not the owner'
        );
      });
    });
    describe('when caller is token owner', function () {
      const caller = owner;

      describe('when contract does not have ether balance', function () {
        it('reverts', async function () {
          await shouldFail.reverting.withMessage(this.token.recoverEther({ from: caller }),
            'no ether to recover'
          );
        });
      });
      describe('when contract has ether balance', function () {
        it('transfers ether balance to the owner', async function () {
          /* Transfer ether to the token contract by transferring it to a killable contract with payable fallback function and then killing that contract making it transfer the ether to the token contract */
          const contractToKill = await NoUpgradeAgentContract.new({ from: other });
          await web3.eth.sendTransaction({from: other, to: contractToKill.address, gas: 300000, value: web3.utils.toWei('0.5')});
          await contractToKill.kill(this.token.address, {from: other});

          /* Check that token contract has ether and the balances before calling recoverEther */
          const ownerPreviousBalance = web3.utils.toBN(await web3.eth.getBalance(owner));
          const contractPreviousBalance = web3.utils.toBN(await web3.eth.getBalance(this.token.address));
          contractPreviousBalance.should.be.bignumber.equal(web3.utils.toBN(web3.utils.toWei('0.5')));

          /* Should move token contract ether to the owner */
          await this.token.recoverEther({ from: owner });

          /* Validate that token contract ether was moved to the owner (use closeTo instead of equal because owner paid gas. paying for contract deployment takes less than 0.01 so use 0.01 for estimation delta) */
          const ownerAfterBalance = web3.utils.toBN(await web3.eth.getBalance(owner));
          const contractAfterBalance = web3.utils.toBN(await web3.eth.getBalance(this.token.address));

          ownerAfterBalance.should.be.bignumber.closeTo(ownerPreviousBalance.add(contractPreviousBalance), web3.utils.toWei('0.01'));
          contractAfterBalance.should.be.bignumber.equal(new BN(0));
        });
      });
    });
  });

  describe('recoverToken', function () {
    describe('when caller is not token owner', function () {
      const caller = other;

      it('reverts', async function () {
        await shouldFail.reverting.withMessage(this.token.recoverToken(this.anotherToken.address, { from: caller }),
          'Ownable: caller is not the owner'
        );
      });
    });
    describe('when caller is token owner', function () {
      const caller = owner;

      describe('when input token contract does not implement balanceOf', function () {
        it('reverts', async function () {
          const contractWithoutBalanceOf = await NoUpgradeAgentContract.new({ from: other });
          await shouldFail.reverting(this.token.recoverToken(contractWithoutBalanceOf.address, { from: caller }));
        });
      });
      describe('when input token contract implements balanceOf with positive return value but does not implement transfer', function () {
        it('reverts', async function () {
          const contractWithBalanceOfWithoutTransfer = await NoTransferMock.new({ from: other });
          // NOTE: This case requires the contract passed as parameter to also not have a non-reverting fallback function or otherwise that function will be called successfully instead of returning an error: https://github.com/OpenZeppelin/openzeppelin-solidity/issues/1769
          await shouldFail.reverting.withMessage(this.token.recoverToken(contractWithBalanceOfWithoutTransfer.address, { from: caller }),
            'SafeERC20: low-level call failed'
          );
        });
      });
      describe('when contract does not have input token balance', function () {
        it('reverts', async function () {
          await shouldFail.reverting.withMessage(this.token.recoverToken(this.anotherToken.address, { from: caller }),
            'no tokens to recover for received token type'
          );
        });
      });
      describe('when contract has input token balance', function () {
        it('transfers token balance to the owner', async function () {
          /* Transfer input token tokens to the token contract address */
          const lostAmount = new BN(10);
          await this.anotherToken.transfer(this.token.address, lostAmount, {from: other});
          (await this.anotherToken.balanceOf(this.token.address)).should.be.bignumber.equal(lostAmount);
          (await this.anotherToken.balanceOf(owner)).should.be.bignumber.equal(new BN(0));

          /* Recover lost tokens to owner and verify that recovered correctly */
          await this.token.recoverToken(this.anotherToken.address, { from: caller });

          (await this.anotherToken.balanceOf(this.token.address)).should.be.bignumber.equal(new BN(0));
          (await this.anotherToken.balanceOf(owner)).should.be.bignumber.equal(lostAmount);
        });
      });
    });
  });

  describe('reclaimContract', function () {
    describe('when caller is not token owner', function () {
      const caller = other;

      it('reverts', async function () {
        await shouldFail.reverting.withMessage(this.token.reclaimContract(this.anotherToken.address, { from: caller }),
          'Ownable: caller is not the owner'
        );
      });
    });
    describe('when caller is token owner', function () {
      const caller = owner;

      describe('when input contract does not implement transferOwnership', function () {
        it('reverts', async function () {
          const contractWithoutTransferOwnership = await NoTransferMock.new({ from: other });
          // NOTE: This case requires the contract passed as parameter to also not have a non-reverting fallback function or otherwise that function will be called successfully instead of returning an error
          await shouldFail.reverting(this.token.reclaimContract(contractWithoutTransferOwnership.address, { from: caller }));
        });
      });
      describe('when contract is not owner of the input contract', function () {
        it('reverts', async function () {
          await shouldFail.reverting.withMessage(this.token.reclaimContract(this.anotherToken.address, { from: caller }),
            'Ownable: caller is not the owner'
          );
        });
      });
      describe('when contract is owner of the input contract', function () {
        it('transfers ownership of input contract to the token contract owner', async function () {
          /* Transfer input contract ownership to the token contract address */
          await this.anotherToken.transferOwnership(this.token.address, {from: other});
          (await this.token.isOwnerRemote(this.anotherToken.address, {from: caller})).should.be.equal(true);
          (await this.anotherToken.isOwner({from: caller})).should.be.equal(false);

          /* Recover lost tokens to owner and verify that recovered correctly */
          await this.token.reclaimContract(this.anotherToken.address, { from: caller });

          (await this.token.isOwnerRemote(this.anotherToken.address, {from: caller})).should.be.equal(false);
          (await this.anotherToken.isOwner({from: caller})).should.be.equal(true);
        });
      });
    });
  });
});
