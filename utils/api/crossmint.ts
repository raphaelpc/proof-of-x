import { cleanDate, getRandomInt, wait } from "../utils";
import fetch from 'node-fetch';
import { IMG_URIS } from "../constants";

const CROSS_MINT_SECRET = process.env.CROSS_MINT_SECRET;
const CROSS_MINT_PROJECT = process.env.CROSS_MINT_PROJECT;

export const cmMintNft = async (pyro: string, amount: string, timestamp: string | number, tokenName: string, txid: string) => {
    if (!CROSS_MINT_SECRET || !CROSS_MINT_PROJECT) {
        console.error('Missing CrossMint credentials')
        return;
    }
    const imgIndex = getRandomInt(0, IMG_URIS.length);
    const imgUrl = IMG_URIS[imgIndex];
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
                name: 'Proof of X - BONK Burn',
                symbol: 'BURN',
                seller_fee_basis_points: 500,
                image: imgUrl,
                description: 'Proof of Burn! This digital trophy commemorates your bold decision to burn a significant amount of BONK tokens, solidifying your status as a Solana Pyro. Keep this one-of-a-kind NFT in your digital collection as a constant reminder of your achievement.',
                attributes: [
                    { trait_type: 'Proof of', value: 'Burn' },
                    { trait_type: 'Burn Token', value: tokenName },
                    { trait_type: 'Burn Amount', value: amount },
                    { trait_type: 'wen', value: cleanDate(timestamp) },
                    { trait_type: 'Pyro', value: pyro },
                    { trait_type: 'Proof', value: txid },
                    { trait_type: 'Variant', value: imgIndex.toLocaleString() }
                ]
            },
            properties: {
                files: [
                    {
                        "uri": imgUrl,
                        "type": "image/png"
                    }
                ],
                category: 'image',
            }

        })
    };

    try {
        let response = await fetch('https://staging.crossmint.com/api/2022-06-09/collections/default-solana/nfts', options);
        let result = (await response.json()) as CmMintResponse;
        let mintResults = await cmMintStatus(result.id);
        console.log(`   - CMID: ${result.id}`)
        return {
            id: result.id,
            details: mintResults
        };
    }
    catch (err) {
        console.log(err);
        return;
    }
}
export const cmMintStatus = async (id: string, configOpts: MintStatusOptions = { maxRetries: 12, waitTime: 4800 }) => {
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
            numTries++;
            await wait(configOpts.waitTime);
            let response = await fetch(`https://staging.crossmint.com/api/2022-06-09/collections/default-solana/nfts/${id}`, options)
            let result = (await response.json()) as CmMintResponse;
            if (result.onChain.status === "success") {
                success = true;
                console.log(`Returned success after ${numTries} attempt`);
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