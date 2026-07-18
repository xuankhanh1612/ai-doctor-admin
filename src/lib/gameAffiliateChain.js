/**
 * gameAffiliateChain.js — Ghi quan hệ Affiliate + phần thưởng game lên
 * blockchain (BSC Testnet), dùng Account Abstraction (ERC-4337) gasless qua
 * Pimlico bundler + Paymaster, giống hệt kiến trúc đã dùng trong
 * `AffiliateSystemControlPanel.jsx` (executeGaslessTask).
 *
 * QUAN TRỌNG — ABI: hợp đồng Affiliate thật (VITE_AFFILIATE_CONTRACT_ADDRESS)
 * chưa có ABI đầy đủ được cung cấp trong dự án. Các hàm bên dưới encode lệnh
 * gọi contract bằng chữ ký hàm tối giản (functionName + kiểu tham số) theo
 * đúng quy ước đã có sẵn trong AffiliateSystemControlPanel.jsx. Trước khi
 * lên production, hãy đối chiếu lại `functionName`/kiểu tham số dưới đây với
 * ABI thật đã deploy (Solidity) và chỉnh cho khớp — hiện tại:
 *   - registerReferral(address referee, address referrer)
 *   - recordGameReward(address player, uint256 gameIdHash, uint256 amount)
 *
 * Mỗi user (uuid) có 1 smart-account ví ẩn danh riêng, private key sinh 1
 * lần và lưu trong localStorage (giống getOrGeneratePrivateKey trong
 * AffiliateSystemControlPanel.jsx) — KHÔNG dùng để giữ tài sản thật, chỉ để
 * ký các userOperation gasless.
 */

import { createPublicClient, http, encodeFunctionData, keccak256, stringToBytes } from 'viem'
import { bscTestnet } from 'viem/chains'
import { createSmartAccountClient } from 'permissionless'
import { toSimpleSmartAccount } from 'permissionless/accounts'
import { privateKeyToAccount } from 'viem/accounts'
import {
  markReferralSynced,
  markRewardSynced,
  markRewardFailed,
} from './gameAffiliateDB'

const PIMLICO_URL = import.meta.env.VITE_PIMLICO_BUNDLER_URL
  || 'https://api.pimlico.io/v2/97/rpc?apikey=VITE_YOUR_PIMLICO_API_KEY'

const PAYMASTER_ADDRESS = import.meta.env.VITE_PAYMASTER_CONTRACT_ADDRESS
  || '0x177858e3450ff286E7d301100363567A555E435f'
const AFFILIATE_CONTRACT = import.meta.env.VITE_AFFILIATE_CONTRACT_ADDRESS
  || '0x44f787D670Ff4Ef65334D6637960bb7Fe5E1231c'

const ENTRY_POINT = { address: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789', version: '0.6' }

const publicClient = createPublicClient({
  chain: bscTestnet,
  transport: http('https://data-seed-prebsc-1-s1.binance.org:8545'),
})

// ─── Ví ẩn danh riêng cho mỗi uuid (giống AffiliateSystemControlPanel) ─────
function getOrGeneratePrivateKey(uuid) {
  const storageKey = `game_affiliate_pk_${uuid}`
  let pk = localStorage.getItem(storageKey)
  if (!pk) {
    const array = new Uint8Array(32)
    window.crypto.getRandomValues(array)
    pk = '0x' + Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
    localStorage.setItem(storageKey, pk)
  }
  return pk
}

export function getGameAffiliateWalletAddress(uuid) {
  if (!uuid) return null
  const pk = getOrGeneratePrivateKey(uuid)
  return privateKeyToAccount(pk).address
}

async function getSmartAccountClient(uuid) {
  const owner = privateKeyToAccount(getOrGeneratePrivateKey(uuid))
  const smartAccount = await toSimpleSmartAccount({
    client: publicClient,
    owner,
    entryPoint: ENTRY_POINT,
  })
  return createSmartAccountClient({
    account: smartAccount,
    chain: bscTestnet,
    bundlerTransport: http(PIMLICO_URL),
    paymaster: {
      getPaymasterStubData: async () => ({ paymasterAndData: PAYMASTER_ADDRESS }),
      getPaymasterData: async () => ({ paymasterAndData: PAYMASTER_ADDRESS }),
    },
  })
}

// uint256 hash ổn định cho 1 chuỗi id (vd gameId "camera-key") — dùng khi
// contract chỉ nhận uint256 chứ không nhận string trực tiếp.
function idToUint256(id) {
  return BigInt(keccak256(stringToBytes(String(id || ''))))
}

// Cache 1 smart-account-client theo uuid trong phiên hiện tại để tránh khởi
// tạo lại (và gọi getPaymasterStubData) mỗi lần gửi transaction.
const clientCache = new Map()
async function getCachedSmartAccountClient(uuid) {
  if (clientCache.has(uuid)) return clientCache.get(uuid)
  const client = await getSmartAccountClient(uuid)
  clientCache.set(uuid, client)
  return client
}

async function sendGaslessCall(uuid, { abi, functionName, args }) {
  const smartAccountClient = await getCachedSmartAccountClient(uuid)
  const callData = encodeFunctionData({ abi, functionName, args })
  const txHash = await smartAccountClient.sendTransaction({
    to: AFFILIATE_CONTRACT,
    data: callData,
    value: 0n,
    maxFeePerGas: 5000000000n,
    maxPriorityFeePerGas: 5000000000n,
  })
  return txHash
}

// ─── Ghi quan hệ referral lên chain ────────────────────────────────────────
const REGISTER_REFERRAL_ABI = [{
  type: 'function',
  name: 'registerReferral',
  inputs: [{ type: 'address', name: 'referee' }, { type: 'address', name: 'referrer' }],
  outputs: [],
  stateMutability: 'nonpayable',
}]

export async function registerReferralOnChain({ id, referrerUuid, refereeUuid }) {
  try {
    const refereeAddress = getGameAffiliateWalletAddress(refereeUuid)
    const referrerAddress = getGameAffiliateWalletAddress(referrerUuid)
    const txHash = await sendGaslessCall(refereeUuid, {
      abi: REGISTER_REFERRAL_ABI,
      functionName: 'registerReferral',
      args: [refereeAddress, referrerAddress],
    })
    if (id) await markReferralSynced(id, txHash)
    return { ok: true, txHash }
  } catch (error) {
    console.error('[gameAffiliateChain] registerReferralOnChain lỗi:', error)
    return { ok: false, error: error?.message || String(error) }
  }
}

// ─── Ghi thưởng (xem QC / hoàn thành game / hoa hồng) lên chain ───────────
const RECORD_REWARD_ABI = [{
  type: 'function',
  name: 'recordGameReward',
  inputs: [
    { type: 'address', name: 'player' },
    { type: 'uint256', name: 'gameIdHash' },
    { type: 'uint256', name: 'amount' },
  ],
  outputs: [],
  stateMutability: 'nonpayable',
}]

export async function recordRewardOnChain({ id, uuid, gameId, amount }) {
  try {
    const playerAddress = getGameAffiliateWalletAddress(uuid)
    // amount lưu local có thể là số thập phân (VIET/PI) — quy đổi ra số
    // nguyên nhỏ nhất (x1000) để truyền uint256, tuỳ chỉnh lại theo đúng
    // decimals thật của token thưởng khi có ABI chính thức.
    const amountUint = BigInt(Math.round((Number(amount) || 0) * 1000))
    const txHash = await sendGaslessCall(uuid, {
      abi: RECORD_REWARD_ABI,
      functionName: 'recordGameReward',
      args: [playerAddress, idToUint256(gameId), amountUint],
    })
    if (id) await markRewardSynced(id, txHash)
    return { ok: true, txHash }
  } catch (error) {
    console.error('[gameAffiliateChain] recordRewardOnChain lỗi:', error)
    if (id) await markRewardFailed(id, error?.message || String(error))
    return { ok: false, error: error?.message || String(error) }
  }
}

// ─── Đồng bộ lại toàn bộ reward đang "pending" (vd sau khi mất mạng) ──────
export async function retryPendingRewards(pendingRows) {
  const results = []
  for (const row of pendingRows) {
    // eslint-disable-next-line no-await-in-loop
    const res = await recordRewardOnChain({ id: row.id, uuid: row.uuid, gameId: row.gameId, amount: row.amount })
    results.push({ id: row.id, ...res })
  }
  return results
}
