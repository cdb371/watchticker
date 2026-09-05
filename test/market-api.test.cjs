'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { searchSuggest, fetchQuotes, SUGGEST_URL, ULIST_URL } = require('../lib/market-api.cjs');

/* fixture:取自真实探针响应 */
const FIX_SUGGEST = { QuotationCodeTable: { Data: [
  { Code: '00700', Name: '腾讯控股', Classify: 'HK', SecurityTypeName: '港股', QuoteID: '116.00700' },
  { Code: '600700', Name: '*ST数码', Classify: 'AStock', SecurityTypeName: '沪A', QuoteID: '1.600700' },
  { Code: '000700', Name: 'Eusu Holdings', Classify: 'KRX', SecurityTypeName: '韩股', QuoteID: '177.000700' },
] } };
const FIX_ULIST = { rc: 0, data: { total: 2, diff: [
  { f2: 1330.0, f3: 2.4, f4: 31.12, f12: '600519', f13: 1, f14: '贵州茅台', f18: 1298.88 },
  { f2: 442.8, f3: 2.26, f4: 9.8, f12: '00700', f13: 116, f14: '腾讯控股', f18: 433.0 },
] } };

function okJson(body) { return { ok: true, status: 200, json: async () => body }; }
function errResp(status) { return { ok: false, status, json: async () => ({}) }; }

test('searchSuggest: URL 参数正确(utf8 编码、token、type=14)+ 过滤韩股', async () => {
  let calledUrl = '';
  const fake = async (u) => { calledUrl = u; return okJson(FIX_SUGGEST); };
  const out = await searchSuggest('00700', { fetchImpl: fake });
  const u = new URL(calledUrl);
  assert.equal(u.origin + u.pathname, SUGGEST_URL);
  assert.equal(u.searchParams.get('input'), '00700');
  assert.equal(u.searchParams.get('type'), '14');
  assert.equal(u.searchParams.get('count'), '10');
  assert.ok(u.searchParams.get('token').length > 10);
  assert.deepEqual(out.map(c => c.quoteId), ['116.00700', '1.600700']); // KRX 已滤
});

test('searchSuggest: 空输入不请求网络直接返回 []', async () => {
  let called = false;
  const out = await searchSuggest('   ', { fetchImpl: async () => { called = true; return okJson({}); } });
  assert.deepEqual(out, []);
  assert.equal(called, false);
});

test('searchSuggest: http 错误抛错带状态码', async () => {
  await assert.rejects(() => searchSuggest('茅台', { fetchImpl: async () => errResp(500) }),
    /http 500/);
});

test('fetchQuotes: URL secids 拼装正确 + 5 类字段参数', async () => {
  let calledUrl = '';
  const fake = async (u) => { calledUrl = u; return okJson(FIX_ULIST); };
  const out = await fetchQuotes(['1.600519', '116.00700'], { fetchImpl: fake });
  const u = new URL(calledUrl);
  assert.equal(u.origin + u.pathname, ULIST_URL);
  assert.equal(u.searchParams.get('secids'), '1.600519,116.00700');
  assert.equal(u.searchParams.get('fields'), 'f2,f3,f4,f12,f13,f14,f18');
  assert.equal(u.searchParams.get('fltt'), '2');
  assert.equal(u.searchParams.get('invt'), '2');
  assert.equal(out.length, 2);
  assert.deepEqual(out[0], { market: '1', code: '600519', name: '贵州茅台', price: 1330.0, delta: 31.12, pct: 2.4 });
  assert.equal(out[1].name, '腾讯控股');
});

test('fetchQuotes: 空数组不请求返回 []', async () => {
  let called = false;
  const out = await fetchQuotes([], { fetchImpl: async () => { called = true; return okJson({}); } });
  assert.deepEqual(out, []);
  assert.equal(called, false);
});

test('fetchQuotes: http 错误抛错', async () => {
  await assert.rejects(() => fetchQuotes(['1.600519'], { fetchImpl: async () => errResp(502) }),
    /http 502/);
});
