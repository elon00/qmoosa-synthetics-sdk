import { signAdminIntent } from "./crypto.js";
export class SyntheticsClient {
    engine;
    issuerAddress;
    defaultDeadlineSeconds;
    chainId;
    lastNonce = 0;
    constructor(engine, config = {}, chainId = 31337) {
        this.engine = engine;
        this.issuerAddress = config.issuerContractAddress || "0xQmoosaSyntheticsIssuer";
        this.defaultDeadlineSeconds = config.defaultDeadlineSeconds ?? 300;
        this.chainId = chainId;
    }
    getStakerPosition(user) {
        return this.engine.getStakerPosition(user);
    }
    getTotalGlobalDebt() {
        return this.engine.totalGlobalDebtValue();
    }
    getOraclePrice(currencyKey) {
        return this.engine.getOraclePrice(currencyKey);
    }
    buildStakePayload(amount) {
        if (amount <= 0n)
            throw new RangeError("STAKE_AMOUNT_MUST_BE_POSITIVE");
        return {
            to: this.issuerAddress,
            method: "stakeCollateral",
            params: [amount.toString()],
            calldataEstimate: `0xstake_${amount.toString(16)}`
        };
    }
    buildUnstakePayload(amount) {
        if (amount <= 0n)
            throw new RangeError("UNSTAKE_AMOUNT_MUST_BE_POSITIVE");
        return {
            to: this.issuerAddress,
            method: "unstakeCollateral",
            params: [amount.toString()],
            calldataEstimate: `0xunstake_${amount.toString(16)}`
        };
    }
    buildIssuePayload(susdAmount) {
        if (susdAmount <= 0n)
            throw new RangeError("ISSUE_AMOUNT_MUST_BE_POSITIVE");
        return {
            to: this.issuerAddress,
            method: "issueSynths",
            params: [susdAmount.toString()],
            calldataEstimate: `0xissue_${susdAmount.toString(16)}`
        };
    }
    buildBurnPayload(susdAmount) {
        if (susdAmount <= 0n)
            throw new RangeError("BURN_AMOUNT_MUST_BE_POSITIVE");
        return {
            to: this.issuerAddress,
            method: "burnSynths",
            params: [susdAmount.toString()],
            calldataEstimate: `0xburn_${susdAmount.toString(16)}`
        };
    }
    buildExchangePayload(sourceKey, sourceAmount, destKey) {
        if (sourceAmount <= 0n)
            throw new RangeError("INVALID_SOURCE_AMOUNT");
        return {
            to: this.issuerAddress,
            method: "exchange",
            params: [sourceKey, sourceAmount.toString(), destKey],
            calldataEstimate: `0xexchange_${sourceKey}_${sourceAmount.toString(16)}_${destKey}`
        };
    }
    buildLiquidatePayload(targetUser, debtToCover) {
        if (debtToCover <= 0n)
            throw new RangeError("DEBT_TO_COVER_MUST_BE_POSITIVE");
        return {
            to: this.issuerAddress,
            method: "liquidatePosition",
            params: [targetUser, debtToCover.toString()],
            calldataEstimate: `0xliquidate_${targetUser}_${debtToCover.toString(16)}`
        };
    }
    async executeStake(user, amount) {
        return this.engine.stakeCollateral(user, amount);
    }
    async executeUnstake(user, amount) {
        return this.engine.unstakeCollateral(user, amount);
    }
    async executeIssue(user, susdAmount) {
        return this.engine.issueSynths(user, susdAmount);
    }
    async executeBurn(user, susdAmount) {
        return this.engine.burnSynths(user, susdAmount);
    }
    async executeExchange(user, sourceKey, sourceAmount, destKey) {
        return this.engine.exchange(user, sourceKey, sourceAmount, destKey);
    }
    async executeLiquidate(liquidator, targetUser, debtToCover) {
        return this.engine.liquidate(liquidator, targetUser, debtToCover);
    }
    signAndExecuteAdminIntent(action, params, privateKeyPem, nonce, deadline) {
        const nextNonce = nonce !== undefined ? nonce : ++this.lastNonce;
        const expiry = deadline !== undefined ? deadline : Math.floor(Date.now() / 1000) + 3600;
        const domain = `QMOOSA:SYNTHETICS_ENGINE:${this.chainId}`;
        const intent = signAdminIntent(action, params, nextNonce, expiry, domain, privateKeyPem);
        this.engine.executeAdminIntent(intent);
        return intent;
    }
}
