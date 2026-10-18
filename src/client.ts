import {
  StakerPosition,
  ExchangeQuote,
  LiquidationQuote,
  SignedAdminIntent,
  AdminActionType,
  SyntheticsOperationResult,
  TransactionPayload,
  ClientConfig,
  EngineAdapter
} from "./types.js";
import { signAdminIntent } from "./crypto.js";

export class SyntheticsClient {
  private readonly engine: EngineAdapter;
  private readonly issuerAddress: string;
  private readonly defaultDeadlineSeconds: number;
  private readonly chainId: number;
  private lastNonce: number = 0;

  constructor(
    engine: EngineAdapter,
    config: ClientConfig = {},
    chainId: number = 31337
  ) {
    this.engine = engine;
    this.issuerAddress = config.issuerContractAddress || "0xQmoosaSyntheticsIssuer";
    this.defaultDeadlineSeconds = config.defaultDeadlineSeconds ?? 300;
    this.chainId = chainId;
  }

  public getStakerPosition(user: string): StakerPosition {
    return this.engine.getStakerPosition(user);
  }

  public getTotalGlobalDebt(): bigint {
    return this.engine.totalGlobalDebtValue();
  }

  public getOraclePrice(currencyKey: string): bigint {
    return this.engine.getOraclePrice(currencyKey);
  }

  public buildStakePayload(amount: bigint): TransactionPayload {
    if (amount <= 0n) throw new RangeError("STAKE_AMOUNT_MUST_BE_POSITIVE");
    return {
      to: this.issuerAddress,
      method: "stakeCollateral",
      params: [amount.toString()],
      calldataEstimate: `0xstake_${amount.toString(16)}`
    };
  }

  public buildUnstakePayload(amount: bigint): TransactionPayload {
    if (amount <= 0n) throw new RangeError("UNSTAKE_AMOUNT_MUST_BE_POSITIVE");
    return {
      to: this.issuerAddress,
      method: "unstakeCollateral",
      params: [amount.toString()],
      calldataEstimate: `0xunstake_${amount.toString(16)}`
    };
  }

  public buildIssuePayload(susdAmount: bigint): TransactionPayload {
    if (susdAmount <= 0n) throw new RangeError("ISSUE_AMOUNT_MUST_BE_POSITIVE");
    return {
      to: this.issuerAddress,
      method: "issueSynths",
      params: [susdAmount.toString()],
      calldataEstimate: `0xissue_${susdAmount.toString(16)}`
    };
  }

  public buildBurnPayload(susdAmount: bigint): TransactionPayload {
    if (susdAmount <= 0n) throw new RangeError("BURN_AMOUNT_MUST_BE_POSITIVE");
    return {
      to: this.issuerAddress,
      method: "burnSynths",
      params: [susdAmount.toString()],
      calldataEstimate: `0xburn_${susdAmount.toString(16)}`
    };
  }

  public buildExchangePayload(sourceKey: string, sourceAmount: bigint, destKey: string): TransactionPayload {
    if (sourceAmount <= 0n) throw new RangeError("INVALID_SOURCE_AMOUNT");
    return {
      to: this.issuerAddress,
      method: "exchange",
      params: [sourceKey, sourceAmount.toString(), destKey],
      calldataEstimate: `0xexchange_${sourceKey}_${sourceAmount.toString(16)}_${destKey}`
    };
  }

  public buildLiquidatePayload(targetUser: string, debtToCover: bigint): TransactionPayload {
    if (debtToCover <= 0n) throw new RangeError("DEBT_TO_COVER_MUST_BE_POSITIVE");
    return {
      to: this.issuerAddress,
      method: "liquidatePosition",
      params: [targetUser, debtToCover.toString()],
      calldataEstimate: `0xliquidate_${targetUser}_${debtToCover.toString(16)}`
    };
  }

  public async executeStake(user: string, amount: bigint): Promise<SyntheticsOperationResult> {
    return this.engine.stakeCollateral(user, amount);
  }

  public async executeUnstake(user: string, amount: bigint): Promise<SyntheticsOperationResult> {
    return this.engine.unstakeCollateral(user, amount);
  }

  public async executeIssue(user: string, susdAmount: bigint): Promise<SyntheticsOperationResult> {
    return this.engine.issueSynths(user, susdAmount);
  }

  public async executeBurn(user: string, susdAmount: bigint): Promise<SyntheticsOperationResult> {
    return this.engine.burnSynths(user, susdAmount);
  }

  public async executeExchange(
    user: string,
    sourceKey: string,
    sourceAmount: bigint,
    destKey: string
  ): Promise<SyntheticsOperationResult> {
    return this.engine.exchange(user, sourceKey, sourceAmount, destKey);
  }

  public async executeLiquidate(
    liquidator: string,
    targetUser: string,
    debtToCover: bigint
  ): Promise<SyntheticsOperationResult> {
    return this.engine.liquidate(liquidator, targetUser, debtToCover);
  }

  public signAndExecuteAdminIntent(
    action: AdminActionType,
    params: Record<string, any>,
    privateKeyPem: string,
    nonce?: number,
    deadline?: number
  ): SignedAdminIntent {
    const nextNonce = nonce !== undefined ? nonce : ++this.lastNonce;
    const expiry = deadline !== undefined ? deadline : Math.floor(Date.now() / 1000) + 3600;
    const domain = `QMOOSA:SYNTHETICS_ENGINE:${this.chainId}`;

    const intent = signAdminIntent(action, params, nextNonce, expiry, domain, privateKeyPem);
    this.engine.executeAdminIntent(intent);
    return intent;
  }
}
