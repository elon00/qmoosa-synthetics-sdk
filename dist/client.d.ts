import { StakerPosition, SignedAdminIntent, AdminActionType, SyntheticsOperationResult, TransactionPayload, ClientConfig, EngineAdapter } from "./types.js";
export declare class SyntheticsClient {
    private readonly engine;
    private readonly issuerAddress;
    private readonly defaultDeadlineSeconds;
    private readonly chainId;
    private lastNonce;
    constructor(engine: EngineAdapter, config?: ClientConfig, chainId?: number);
    getStakerPosition(user: string): StakerPosition;
    getTotalGlobalDebt(): bigint;
    getOraclePrice(currencyKey: string): bigint;
    buildStakePayload(amount: bigint): TransactionPayload;
    buildUnstakePayload(amount: bigint): TransactionPayload;
    buildIssuePayload(susdAmount: bigint): TransactionPayload;
    buildBurnPayload(susdAmount: bigint): TransactionPayload;
    buildExchangePayload(sourceKey: string, sourceAmount: bigint, destKey: string): TransactionPayload;
    buildLiquidatePayload(targetUser: string, debtToCover: bigint): TransactionPayload;
    executeStake(user: string, amount: bigint): Promise<SyntheticsOperationResult>;
    executeUnstake(user: string, amount: bigint): Promise<SyntheticsOperationResult>;
    executeIssue(user: string, susdAmount: bigint): Promise<SyntheticsOperationResult>;
    executeBurn(user: string, susdAmount: bigint): Promise<SyntheticsOperationResult>;
    executeExchange(user: string, sourceKey: string, sourceAmount: bigint, destKey: string): Promise<SyntheticsOperationResult>;
    executeLiquidate(liquidator: string, targetUser: string, debtToCover: bigint): Promise<SyntheticsOperationResult>;
    signAndExecuteAdminIntent(action: AdminActionType, params: Record<string, any>, privateKeyPem: string, nonce?: number, deadline?: number): SignedAdminIntent;
}
