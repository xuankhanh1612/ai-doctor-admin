import React, { useCallback, useEffect, useState } from 'react'
import { Gift, Users, Copy, CheckCircle2, Loader2, PlayCircle, RefreshCw, Trophy } from 'lucide-react'
import {
  getOrCreateReferralCode,
  getReferralsByReferrer,
  getRewards,
  addRewardWithReferralCommission,
} from '../lib/gameAffiliateDB'
import { recordRewardOnChain } from '../lib/gameAffiliateChain'

// Thời gian "xem quảng cáo" giả lập (giây) khi chưa gắn SDK Google Ads
// rewarded thật. Thay handleWatchAd bên dưới bằng lệnh gọi SDK thật
// (vd googletag.pubads() rewarded ad) khi có ad unit chính thức.
const AD_WATCH_SECONDS = 15
const AD_REWARD = { amount: 5000, currency: 'VIET' }

export default function GameAffiliateRewardWidget({ uuid, lastGameResult }) {
  const [code, setCode] = useState('')
  const [referralCount, setReferralCount] = useState(0)
  const [rewards, setRewards] = useState([])
  const [copied, setCopied] = useState(false)
  const [watchingAd, setWatchingAd] = useState(false)
  const [adSecondsLeft, setAdSecondsLeft] = useState(0)
  const [claiming, setClaiming] = useState(false)
  const [open, setOpen] = useState(false)

  const refresh = useCallback(async () => {
    if (!uuid) return
    const [c, refs, rws] = await Promise.all([
      getOrCreateReferralCode(uuid),
      getReferralsByReferrer(uuid),
      getRewards(uuid),
    ])
    setCode(c)
    setReferralCount(refs.length)
    setRewards(rws.slice(0, 8))
  }, [uuid])

  useEffect(() => { refresh() }, [refresh])

  // Ghi nhận thưởng "hoàn thành game" khi có kết quả mới từ iframe
  useEffect(() => {
    if (!uuid || !lastGameResult) return
    if (lastGameResult.status !== 'win' && lastGameResult.status !== 'freeplay') return
    ;(async () => {
      const { primaryId, commissionId, commissionReferrerUuid } = await addRewardWithReferralCommission({
        uuid,
        kind: 'game_complete',
        amount: 2000,
        currency: 'VIET',
        gameId: lastGameResult.gameId,
        note: `Hoàn thành ${lastGameResult.gameTitle || lastGameResult.gameId}`,
      })
      await refresh()
      await recordRewardOnChain({ id: primaryId, uuid, gameId: lastGameResult.gameId, amount: 2000 })
      if (commissionId && commissionReferrerUuid) {
        await recordRewardOnChain({ id: commissionId, uuid: commissionReferrerUuid, gameId: lastGameResult.gameId, amount: 200 })
      }
      await refresh()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uuid, lastGameResult])

  useEffect(() => {
    if (!watchingAd || adSecondsLeft <= 0) return
    const t = setTimeout(() => setAdSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [watchingAd, adSecondsLeft])

  const handleWatchAd = () => {
    setWatchingAd(true)
    setAdSecondsLeft(AD_WATCH_SECONDS)
  }

  useEffect(() => {
    if (watchingAd && adSecondsLeft === 0) {
      (async () => {
        setWatchingAd(false)
        setClaiming(true)
        const { primaryId, commissionId, commissionReferrerUuid } = await addRewardWithReferralCommission({
          uuid, kind: 'ad_watch', ...AD_REWARD, gameId: 'ad_watch', note: 'Xem quảng cáo nhận thưởng',
        })
        await refresh()
        await recordRewardOnChain({ id: primaryId, uuid, gameId: 'ad_watch', amount: AD_REWARD.amount })
        if (commissionId && commissionReferrerUuid) {
          await recordRewardOnChain({ id: commissionId, uuid: commissionReferrerUuid, gameId: 'ad_watch', amount: Math.round(AD_REWARD.amount * 0.1) })
        }
        await refresh()
        setClaiming(false)
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchingAd, adSecondsLeft])

  const referralLink = typeof window !== 'undefined' && code
    ? `${window.location.origin}${window.location.pathname}?ref=${encodeURIComponent(code)}`
    : ''

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  if (!uuid) return null

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-rose-500 px-4 py-3 text-sm font-bold text-white shadow-2xl transition hover:-translate-y-0.5"
        >
          <Gift size={18} /> Giới thiệu & Thưởng
        </button>
      )}

      {open && (
        <div className="w-80 overflow-hidden rounded-2xl border border-white/10 bg-[#101418] text-white shadow-2xl">
          <div className="flex items-center justify-between bg-gradient-to-r from-amber-500/20 to-rose-500/20 px-4 py-3">
            <div className="flex items-center gap-2 font-bold">
              <Gift size={16} className="text-amber-300" /> Affiliate Game
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-white/60 hover:text-white">✕</button>
          </div>

          <div className="space-y-4 p-4">
            <div>
              <div className="mb-1 text-xs text-white/50">Link giới thiệu của bạn</div>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2">
                <input readOnly value={referralLink} className="w-full truncate bg-transparent text-xs outline-none" />
                <button type="button" onClick={handleCopy} className="shrink-0 rounded-lg bg-white/10 p-1.5 hover:bg-white/20">
                  {copied ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm">
              <span className="flex items-center gap-2 text-white/70"><Users size={14} /> Đã giới thiệu</span>
              <b>{referralCount} người</b>
            </div>

            <button
              type="button"
              disabled={watchingAd || claiming}
              onClick={handleWatchAd}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:opacity-60"
            >
              {watchingAd ? (
                <>Đang xem quảng cáo… {adSecondsLeft}s</>
              ) : claiming ? (
                <><Loader2 size={14} className="animate-spin" /> Đang ghi nhận thưởng…</>
              ) : (
                <><PlayCircle size={16} /> Xem quảng cáo nhận thưởng</>
              )}
            </button>

            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-white/50">
                <span className="flex items-center gap-1"><Trophy size={12} /> Lịch sử thưởng gần đây</span>
                <button type="button" onClick={refresh} className="hover:text-white"><RefreshCw size={12} /></button>
              </div>
              <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                {rewards.length === 0 && (
                  <div className="rounded-lg border border-dashed border-white/10 p-3 text-center text-xs text-white/40">
                    Chưa có thưởng nào.
                  </div>
                )}
                {rewards.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg bg-black/30 px-2.5 py-1.5 text-xs">
                    <span className="text-white/70">{r.note || r.kind}</span>
                    <span className="flex items-center gap-1.5">
                      <b className="text-emerald-400">+{r.amount.toLocaleString()} {r.currency}</b>
                      <span
                        className={`rounded px-1 py-0.5 text-[9px] font-bold ${
                          r.chainStatus === 'synced' ? 'bg-emerald-500/20 text-emerald-300'
                          : r.chainStatus === 'failed' ? 'bg-red-500/20 text-red-300'
                          : 'bg-amber-500/20 text-amber-300'
                        }`}
                        title={r.chainStatus === 'synced' ? r.txHash : ''}
                      >
                        {r.chainStatus === 'synced' ? 'On-chain' : r.chainStatus === 'failed' ? 'Lỗi' : 'Đang gửi'}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
