/**
 * Moralis Blockchain Indexer Service Layer
 * Dự án: Hiến Máu Nhân Văn (2026)
 */

const formatNumber = (number) => {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(number ?? 0);
};

/**
 * Quét liên hợp lịch sử giao dịch (Native + ERC-20) và đồng bộ Metadata
 * @param {string} targetAddress - Địa chỉ ví cần tra cứu
 * @param {string} apiKey - Moralis Web3 API Key
 * @returns {Promise<Array>} Mảng danh sách giao dịch đã được chuẩn hóa Explorer
 */
export const fetchUnifiedHistory = async (targetAddress, apiKey) => {
  if (!targetAddress || !apiKey) {
    throw new Error("Thiếu tham số Target Address hoặc API Key hợp lệ.");
  }

  const headers = { accept: 'application/json', 'X-API-Key': apiKey };
  const chain = '0x61'; // BNB Smart Chain Testnet Code
  let unifiedResult = [];

  // 1. Khởi chạy đồng thời lệnh quét cổng Native và cổng ERC-20
  const nativePromise = fetch(`https://deep-index.moralis.io/api/v2/${targetAddress}?chain=${chain}&limit=5`, { headers })
    .then(res => res.json());
    
  const erc20Promise = fetch(`https://deep-index.moralis.io/api/v2/${targetAddress}/erc20/transfers?chain=${chain}&limit=5`, { headers })
    .then(res => res.json());

  const [nativeTransactions, erc20Transactions] = await Promise.all([nativePromise, erc20Promise]);

  // 2. Phân tách và chuẩn hóa gói tin Native Transactions
  if (nativeTransactions?.result && Array.isArray(nativeTransactions.result)) {
    nativeTransactions.result.forEach((tx) => {
      const { from_address, to_address, value, hash, block_timestamp, block_number } = tx;
      unifiedResult.push({
        type: from_address.toLowerCase() === targetAddress.toLowerCase() ? 'sent' : 'received',
        from: from_address,
        to: to_address,
        valueEth: String(parseFloat(value) / 10 ** 18), // Quy đổi Wei sang BNB thực tế
        hash,
        block: block_number,
        date: block_timestamp,
        tokenType: 'native',
        name: 'BNB',
        chain,
      });
    });
  }

  // 3. Phân tách và chuẩn hóa gói tin ERC-20 Transfers
  if (erc20Transactions?.result && Array.isArray(erc20Transactions.result)) {
    erc20Transactions.result.forEach((tx) => {
      const { from_address, to_address, value, transaction_hash, block_timestamp, address, block_number } = tx;
      unifiedResult.push({
        type: from_address.toLowerCase() === targetAddress.toLowerCase() ? 'sent' : 'received',
        from: from_address,
        to: to_address,
        valueEth: value, // Lưu số thô tạm thời để chờ map Metadata
        hash: transaction_hash,
        block: block_number,
        date: block_timestamp,
        tokenType: 'erc20',
        chain,
        tokenAddress: address,
      });
    });

    // 4. Gọi bổ sung Metadata Token để giải mã chuỗi Decimals
    const erc20Addresses = [...new Set(erc20Transactions.result.map((r) => r.address))].filter(Boolean);
    if (erc20Addresses.length > 0) {
      const addressQueryString = '&addresses=' + erc20Addresses.join('&addresses=');
      const erc20Metadata = await (await fetch(`https://deep-index.moralis.io/api/v2/erc20/metadata?chain=${chain}${addressQueryString}`, { headers })).json();
      
      if (Array.isArray(erc20Metadata)) {
        unifiedResult.forEach((item) => {
          if (item.tokenType === 'erc20') {
            const meta = erc20Metadata.find((m) => m.address?.toLowerCase() === item.tokenAddress?.toLowerCase());
            if (meta) {
              item.name = meta.symbol || 'ERC-20';
              if (meta.decimals) {
                item.valueEth = String(formatNumber(parseFloat(item.valueEth) / 10 ** parseInt(meta.decimals)));
              }
            }
          }
        });
      }
    }
  }

  // 5. Sắp xếp thứ tự thời gian khối giảm dần (Mới nhất hiển thị lên đầu)
  unifiedResult.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return unifiedResult;
};