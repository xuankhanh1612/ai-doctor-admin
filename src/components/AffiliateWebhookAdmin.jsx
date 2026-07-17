import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Copy, 
  ExternalLink, 
  Activity, 
  Check, 
  Terminal, 
  Settings, 
  Users, 
  DollarSign, 
  Layers 
} from 'lucide-react';

export default function AffiliateWebhookAdmin() {
  const [activeWebhookTab, setActiveWebhookTab] = useState('affiliate');
  const [copied, setCopied] = useState(false);

  // Dữ liệu Webhook đồng bộ từ hệ thống Alchemy và biến môi trường .env
  const webhookData = {
    affiliate: {
      name: 'AFFILIATE TRACKER WEBHOOK',
      id: 'wh_pqra43npyunzk8w7',
      contract: '0x44f787D670Ff4Ef65334D6637960bb7Fe5E1231c',
      description: 'Giám sát thời gian thực các sự kiện log giao dịch và đăng ký của hệ thống Affiliate giới thiệu hiến máu.',
      dashboardUrl: 'https://dashboard.alchemy.com/apps/xo4ut1zr4j2ut5qk/webhooks/wh_pqra43npyunzk8w7',
      query: `{
  block {
    hash, number, timestamp,
    logs(filter: {addresses: ["0x44f787D670Ff4Ef65334D6637960bb7Fe5E1231c"]}) { 
      data, topics, index,
      account { address },
      transaction { hash, from { address }, to { address }, value, status, gasUsed }
    }
  }
}`
    },
    paymaster: {
      name: 'HIENMAUPAYMASTERCONTRACT',
      id: 'wh_ck5mia12huh25nvp',
      contract: '0x177858e3450ff286E7d301100363567A555E435f',
      description: 'Giám sát luồng phí giao dịch tài trợ gas (Gas Sponsorship) và các log phát sinh từ Paymaster Smart Contract.',
      dashboardUrl: 'https://dashboard.alchemy.com/apps/xo4ut1zr4j2ut5qk/webhooks/wh_ck5mia12huh25nvp',
      query: `{
  block {
    hash, number, timestamp,
    logs(filter: {addresses: ["0x177858e3450ff286E7d301100363567A555E435f"]}) { 
      data, topics, index,
      account { address },
      transaction { hash, from { address }, to { address }, value, status, gasUsed }
    }
  }
}`
    }
  };

  const targetEndpoint = "https://hien-mau-nhan-van.vercel.app/api/alchemy-webhook";

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Header */}
      <div className="mb-8 border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings className="text-emerald-500 w-7 h-7 animate-spin-slow" />
          Quản Trị Hệ Thống & Cấu Hình Webhook
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Quản lý vòng đời Smart Contract, phân tích Affiliate Tracker và giám sát cổng cổng kết nối chuỗi khối On-chain.
        </p>
      </div>

      {/* Grid Tổng quan trạng thái hệ thống */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase">Tổng Đối Tác Affiliate</p>
            <p className="text-2xl font-bold text-white mt-1">1,248</p>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase">Gas Tài Trợ (Paymaster)</p>
            <p className="text-2xl font-bold text-white mt-1">4.825 BNB</p>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 text-purple-500 rounded-lg">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase">Tín Hiệu Webhook (24h)</p>
            <p className="text-2xl font-bold text-white mt-1 text-emerald-400">Ổn định (Active)</p>
          </div>
        </div>
      </div>

      {/* Khu vực chính: Cấu hình Webhook */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Layers className="text-emerald-400 w-5 h-5" />
            Cấu Hình Kết Nối Alchemy Webhooks
          </h2>
          <span className="px-3 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            Kết nối Live
          </span>
        </div>

        {/* Bộ chọn Tab Webhook (Giao diện thẻ như trong thiết kế) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Tab Affiliate */}
          <button 
            onClick={() => setActiveWebhookTab('affiliate')}
            className={`text-left p-5 rounded-xl border transition-all relative ${
              activeWebhookTab === 'affiliate' 
                ? 'bg-slate-900 border-emerald-500 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/30' 
                : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-bold tracking-wide text-slate-200">AFFILIATE TRACKER WEBHOOK</span>
              <ShieldCheck className="text-emerald-400 w-5 h-5" />
            </div>
            <p className="text-xs font-mono text-slate-400 select-all mb-3">{webhookData.affiliate.id}</p>
            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
              {webhookData.affiliate.description}
            </p>
          </button>

          {/* Tab Paymaster */}
          <button 
            onClick={() => setActiveWebhookTab('paymaster')}
            className={`text-left p-5 rounded-xl border transition-all relative ${
              activeWebhookTab === 'paymaster' 
                ? 'bg-slate-900 border-emerald-500 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/30' 
                : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-bold tracking-wide text-slate-200">HIENMAUPAYMASTERCONTRACT</span>
              <ShieldCheck className="text-emerald-400 w-5 h-5" />
            </div>
            <p className="text-xs font-mono text-slate-400 select-all mb-3">{webhookData.paymaster.id}</p>
            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
              {webhookData.paymaster.description}
            </p>
          </button>
        </div>

        {/* Nội dung chi tiết của Webhook đang chọn */}
        <div className="border-t border-slate-800/80 pt-6">
          <h3 className="text-sm font-bold tracking-wider text-slate-300 uppercase mb-6 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-emerald-500 rounded-sm"></span>
            Thông tin kết nối: {webhookData[activeWebhookTab].name}
          </h3>

          <div className="space-y-6">
            {/* 1. Target URL */}
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                1. Vercel Production Endpoint URL (Target URL nhận POST Request):
              </label>
              <div className="flex gap-2">
                <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-slate-300 flex items-center justify-between shadow-inner overflow-x-auto">
                  <span>{targetEndpoint}</span>
                </div>
                <button 
                  onClick={() => handleCopy(targetEndpoint)}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors flex items-center gap-2 border border-slate-700 font-medium text-sm whitespace-nowrap min-w-[110px] justify-center"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Đã lưu!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 2. Direct Admin Link */}
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                2. Link cấu hình & Quản lý trực tiếp trên Alchemy:
              </label>
              <a 
                href={webhookData[activeWebhookTab].dashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-emerald-400 hover:text-emerald-300 rounded-xl font-mono text-sm transition-all shadow-inner w-full md:w-auto"
              >
                <span>{webhookData[activeWebhookTab].dashboardUrl}</span>
                <ExternalLink className="w-4 h-4 shrink-0" />
              </a>
            </div>

            {/* 3. Contract Address monitored */}
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                3. Địa chỉ Contract đang giám sát log sự kiện:
              </label>
              <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-3">
                <Terminal className="text-slate-500 w-4 h-4" />
                <span className="font-mono text-sm text-slate-300 select-all">{webhookData[activeWebhookTab].contract}</span>
              </div>
            </div>

            {/* 4. GraphQL Query Schema Template */}
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                4. Cấu trúc GraphQL Schema đăng ký (Query Template):
              </label>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-x-auto shadow-inner max-h-60 overflow-y-auto">
                <pre className="font-mono text-xs text-slate-400 leading-relaxed whitespace-pre select-all">
                  {webhookData[activeWebhookTab].query}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}