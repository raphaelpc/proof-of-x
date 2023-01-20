import { wait } from "../utils";
import fetch from 'node-fetch';

const CROSS_MINT_SECRET = process.env.CROSS_MINT_SECRET;
const CROSS_MINT_PROJECT = process.env.CROSS_MINT_PROJECT;

export const cmMintNft = async (pyro: string, amount: string, timestamp: string | number,) => {
    if (!CROSS_MINT_SECRET || !CROSS_MINT_PROJECT) {
        console.error('Missing CrossMint credentials')
        return;
    }

    const options = {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-client-secret': CROSS_MINT_SECRET,
            'x-project-id': CROSS_MINT_PROJECT
        },
        body: JSON.stringify({
            recipient: `solana:${pyro}`,
            metadata: {
                name: 'Proof of X',
                image: 'https://www.crossmint.com/assets/crossmint/logo.png',
                description: 'Test',
                attributes: [
                    { trait_type: 'Burn Token', value: 'BONK' },
                    { trait_type: 'Burn Amount', value: amount },
                    { trait_type: 'wen', value: timestamp },
                    { trait_type: 'pyro', value: pyro },

                ]
            }
        })
    };

    try {
        console.log('1-Making CM Request');
        let response = await fetch('https://staging.crossmint.com/api/2022-06-09/collections/default-solana/nfts', options);
        console.log(response);
        console.log('2-Fetch Complete');

        let result = (await response.json()) as CmMintResponse;
        let mintResults = await cmMintStatus(result.id);
        console.log(`CrossMint Tx ID: ${result.id}`)
        return {
            id: result.id,
            details: mintResults
        };
    }
    catch (err) {
        console.log(err);
        //console.error(err);
        return;
    }
}
//maxRetries = 5, waitTime = 10000
export const cmMintStatus = async (id: string, configOpts: MintStatusOptions = { maxRetries: 5, waitTime: 10000 }) => {
    if (!CROSS_MINT_SECRET || !CROSS_MINT_PROJECT) {
        console.error('Missing CrossMint credentials')
        return;
    }
    let success = false;
    let numTries = 0;

    const options = {
        method: 'GET',
        headers: {
            'x-client-secret': CROSS_MINT_SECRET,
            'x-project-id': CROSS_MINT_PROJECT
        }
    };
    try {
        while (!success && numTries < configOpts.maxRetries) {
            await wait(configOpts.waitTime);
            let response = await fetch(`https://staging.crossmint.com/api/2022-06-09/collections/default-solana/nfts/${id}`, options)
            let result = (await response.json()) as CmMintResponse;
            if (result.onChain.status === "success") {
                success = true;
                return result;
            }
        }
        return;
    }
    catch (err) {
        console.error(err);
        return;
    }

}

interface CmMintResponse {
    id: string,
    onChain: OnChain,
    metadata?: Metadata;
}

interface Metadata {
    name: string;
    symbol: string;
    description: string;
    seller_fee_basis_points: number;
    image: string;
    attributes?: unknown | null;
    properties: unknown;
}

interface OnChain {
    status: string;
    chain: string;
    mintHash?: string;
    owner?: string;
}

interface MintStatusOptions {
    maxRetries: number,
    waitTime: number
}