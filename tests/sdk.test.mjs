import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SyntheticsClient,
  generateKeyPair
} from "../dist/index.js";

const WAD = 10n ** 18n;

class MockSyntheticsEngine {
  constructor() {
    this.staked = 0n;
    this.issued = 0n;
    this.adminIntentsExecuted = [];
  }

  stakeCollateral(user, amount) {
    this.staked += amount;
    return {
      txId: "tx_mock_stake",
      operation: "STAKE",
      actor: user,
      timestamp: 1234567890,
      success: true,
      details: { amount: amount.toString() }
    };
  }

  unstakeCollateral(user, amount) {
    this.staked -= amount;
    return {
      txId: "tx_mock_unstake",
      operation: "UNSTAKE",
      actor: user,
      timestamp: 1234567890,
      success: true,
      details: { amount: amount.toString() }
    };
  }

  issueSynths(user, susdAmount) {
    this.issued += susdAmount;
    return {
      txId: "tx_mock_issue",
      operation: "ISSUE",
      actor: user,
      timestamp: 1234567890,
      success: true,
      details: { susdAmount: susdAmount.toString() }
    };
  }

  burnSynths(user, susdAmount) {
    this.issued -= susdAmount;
    return {
      txId: "tx_mock_burn",
      operation: "BURN",
      actor: user,
      timestamp: 1234567890,
      success: true,
      details: { susdAmount: susdAmount.toString() }
    };
  }

  exchange(user, sourceKey, sourceAmount, destKey) {
    return {
      txId: "tx_mock_exchange",
      operation: "EXCHANGE",
      actor: user,
      timestamp: 1234567890,
      success: true,
      details: { sourceKey, sourceAmount: sourceAmount.toString(), destKey }
    };
  }

  liquidate(liquidator, user, debtToCover) {
    return {
      txId: "tx_mock_liquidate",
      operation: "LIQUIDATE",
      actor: liquidator,
      timestamp: 1234567890,
      success: true,
      details: { targetUser: user, debtCovered: debtToCover.toString() }
    };
  }

  getStakerPosition(user) {
    return {
      user,
      stakedCollateral: this.staked,
      debtShares: this.issued,
      debtValueUsd: this.issued,
      collateralValueUsd: this.staked * 10n,
      collateralRatioBps: this.issued === 0n ? 100000000n : ((this.staked * 10n) * 10000n) / this.issued,
      isSolvent: true,
      isLiquidatable: false
    };
  }

  totalGlobalDebtValue() {
    return this.issued;
  }

  getOraclePrice(currencyKey) {
    if (currencyKey === "sETH") return 2000n * WAD;
    if (currencyKey === "sBTC") return 50000n * WAD;
    return 1n * WAD;
  }

  executeAdminIntent(intent) {
    this.adminIntentsExecuted.push(intent);
  }
}

test("1. SyntheticsClient staking, issuing, and position queries", async () => {
  const engine = new MockSyntheticsEngine();
  const client = new SyntheticsClient(engine, { issuerContractAddress: "0xIssuer123" });

  const stakeRes = await client.executeStake("0xAlice", 1000n * WAD);
  assert.equal(stakeRes.success, true);

  const issueRes = await client.executeIssue("0xAlice", 2000n * WAD);
  assert.equal(issueRes.success, true);

  const pos = client.getStakerPosition("0xAlice");
  assert.equal(pos.stakedCollateral, 1000n * WAD);
  assert.equal(pos.debtValueUsd, 2000n * WAD);
  assert.equal(pos.isSolvent, true);
});

test("2. Calldata payload builders format correct contract method calls", () => {
  const engine = new MockSyntheticsEngine();
  const client = new SyntheticsClient(engine, { issuerContractAddress: "0xIssuer123" });

  const stakePayload = client.buildStakePayload(500n * WAD);
  assert.equal(stakePayload.to, "0xIssuer123");
  assert.equal(stakePayload.method, "stakeCollateral");

  const issuePayload = client.buildIssuePayload(1000n * WAD);
  assert.equal(issuePayload.method, "issueSynths");

  const exchangePayload = client.buildExchangePayload("sUSD", 1000n * WAD, "sETH");
  assert.equal(exchangePayload.method, "exchange");
  assert.deepEqual(exchangePayload.params, ["sUSD", (1000n * WAD).toString(), "sETH"]);

  const liqPayload = client.buildLiquidatePayload("0xBob", 2000n * WAD);
  assert.equal(liqPayload.method, "liquidatePosition");
});

test("3. Admin intent cryptographic signing and execution via SDK", () => {
  const engine = new MockSyntheticsEngine();
  const client = new SyntheticsClient(engine);
  const { privateKey } = generateKeyPair();

  const intent = client.signAndExecuteAdminIntent(
    "SET_EXCHANGE_FEE",
    { feeBps: 25 },
    privateKey,
    1,
    Math.floor(Date.now() / 1000) + 3600
  );

  assert.equal(intent.action, "SET_EXCHANGE_FEE");
  assert.equal(intent.nonce, 1);
  assert.equal(engine.adminIntentsExecuted.length, 1);
});

test("4. Invalid input boundaries fail closed", () => {
  const engine = new MockSyntheticsEngine();
  const client = new SyntheticsClient(engine);

  assert.throws(() => client.buildStakePayload(0n), /STAKE_AMOUNT_MUST_BE_POSITIVE/);
  assert.throws(() => client.buildIssuePayload(0n), /ISSUE_AMOUNT_MUST_BE_POSITIVE/);
  assert.throws(() => client.buildExchangePayload("sUSD", 0n, "sETH"), /INVALID_SOURCE_AMOUNT/);
  assert.throws(() => client.buildLiquidatePayload("0xBob", 0n), /DEBT_TO_COVER_MUST_BE_POSITIVE/);
});
