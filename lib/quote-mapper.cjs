/**
 * quote-mapper.cjs —— 东财行情接口 → 内部统一结构(纯函数,无 IO)
 *
 * 数据源架构(经三轮探针实测收敛):
 *   搜索联想: GET https://searchapi.eastmoney.com/api/suggest/get
 *             ?input=<kw>&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=8
 *   批量行情: GET https://push2.eastmoney.com/api/qt/ulist.np/get
 *             ?secids=<quoteId 逗号拼接>&fields=f2,f3,f4,f12,f13,f14,f18&fltt=2&invt=2
 *   实测字段: f2=现价 f3=涨跌幅% f4=涨跌额 f12=代码 f13=市场号 f14=名称 f18=昨收
 *   实测 QuoteID: 沪A=1.600519 深A=0.000001 港股=116.00700 美股=105.AAPL 期货=113.cu2609
 *   (注意:港股 116 / 美股 105 —— 曾误以为港股 105,探针实测纠正)
 */

/** 联想条目 → 候选(过滤出用户要的品类;排除债券 Notes/REIT/LOF/韩股等噪音) */
// Classify 混合类型:老板块字符串('AStock'/'HK'/'UsStock'/'Futures'),科创板数字码 23(实测),
// 北交所 'NEEQ'。科创板属 A 股全谱系故保留。has 统一 String() 兼容数字码。
const KEEP_CLASSIFY = new Set(['AStock', 'HK', 'UsStock', 'Futures', '23']);  // '23'=科创板

function emSuggestToCandidates(json) {
  const list = json && json.QuotationCodeTable && json.QuotationCodeTable.Data;
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const d of list) {
    if (!KEEP_CLASSIFY.has(String(d.Classify))) continue;
    if (!d.QuoteID || !d.Code || !d.Name) continue;
    if (seen.has(d.QuoteID)) continue;          // 去重(同名不同市场按 QuoteID 区分)
    seen.add(d.QuoteID);
    out.push({
      quoteId: d.QuoteID,                       // '116.00700'
      code: d.Code,                             // '00700'
      name: d.Name,                             // '腾讯控股'
      securityType: d.SecurityTypeName || '',   // '港股'
      classify: d.Classify,                     // 'HK'
    });
  }
  return out;
}

/** 批量行情 diff 数组 → 行情记录(数值缺失过滤) */
function emUlistToQuotes(json) {
  const diff = json && json.data && json.data.diff;
  if (!Array.isArray(diff)) return [];
  const out = [];
  for (const d of diff) {
    const price = Number(d.f2);
    if (!d.f12 || !d.f14 || Number.isNaN(price)) continue;
    out.push({
      quoteId: String(d.f13) + '.' + String(d.f12),   // '1.600519' / '116.00700' 跨市场唯一键
      market: String(d.f13),   // '1'|'0'|'116'|'105'|'113'
      code: String(d.f12),
      name: String(d.f14),
      price,                   // f2 现价
      delta: Number(d.f4),     // f4 涨跌额
      pct: Number(d.f3),       // f3 涨跌幅%
    });
  }
  return out;
}

/** quoteId → 腾讯风格符号(备选通道用;腾讯已弃用但保留转换以防主源故障) */
function quoteIdToTencentSymbol(quoteId) {
  const [mkt, code] = quoteId.split('.');
  const pre = { '1': 'sh', '0': 'sz', '116': 'hk', '105': 'us' }[mkt];
  return pre ? pre + code : null;
}

module.exports = { emSuggestToCandidates, emUlistToQuotes, quoteIdToTencentSymbol, KEEP_CLASSIFY };
