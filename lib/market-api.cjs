'use strict';
/**
 * market-api.cjs —— 主进程行情数据模块(node fetch 直连东财,无 CORS 限制)
 * 经三轮探针实测收敛的单源架构:联想 suggest + 批量行情 ulist,全 UTF-8 JSON。
 * fetchImpl 可注入,便于单测 stub。
 */
const { emSuggestToCandidates, emUlistToQuotes } = require('./quote-mapper.cjs');

const SUGGEST_URL = 'https://searchapi.eastmoney.com/api/suggest/get';
const ULIST_URL = 'https://push2.eastmoney.com/api/qt/ulist.np/get';
// 东财 suggest 公开固定参数(token 为接口约定值,非个人密钥)
const SUGGEST_TOKEN = 'D43BF722C8E33BDC906FB84D85E326E8';

/** 搜索联想 → 候选列表(已过滤 A股/港股/美股/期货) */
async function searchSuggest(kw, { fetchImpl = fetch } = {}) {
  if (!kw || !kw.trim()) return [];
  const u = new URL(SUGGEST_URL);
  u.searchParams.set('input', kw.trim());
  u.searchParams.set('type', '14');
  u.searchParams.set('token', SUGGEST_TOKEN);
  u.searchParams.set('count', '10');
  const res = await fetchImpl(u.toString());
  if (!res.ok) throw new Error(`suggest http ${res.status}`);
  const json = await res.json();
  return emSuggestToCandidates(json);
}

/** 批量行情:quoteIds = ['1.600519','116.00700',...] → 行情记录数组 */
async function fetchQuotes(quoteIds, { fetchImpl = fetch } = {}) {
  if (!Array.isArray(quoteIds) || quoteIds.length === 0) return [];
  const u = new URL(ULIST_URL);
  u.searchParams.set('secids', quoteIds.join(','));
  u.searchParams.set('fields', 'f2,f3,f4,f12,f13,f14,f18');
  u.searchParams.set('fltt', '2');
  u.searchParams.set('invt', '2');
  const res = await fetchImpl(u.toString());
  if (!res.ok) throw new Error(`quotes http ${res.status}`);
  const json = await res.json();
  return emUlistToQuotes(json);
}

module.exports = { searchSuggest, fetchQuotes, SUGGEST_URL, ULIST_URL };
