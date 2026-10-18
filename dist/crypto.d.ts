import { AdminActionType, SignedAdminIntent } from "./types.js";
export declare function generateKeyPair(): {
    publicKey: string;
    privateKey: string;
};
export declare function canonicalize(obj: any): any;
export declare function computeParamsHash(params: Record<string, any>): string;
export declare function computeChallenge(action: AdminActionType, paramsHash: string, nonce: number, deadline: number, domain: string): string;
export declare function signAdminIntent(action: AdminActionType, params: Record<string, any>, nonce: number, deadline: number, domain: string, privateKeyPem: string): SignedAdminIntent;
