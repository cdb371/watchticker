'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { emSuggestToCandidates, emUlistToQuotes } = require('../lib/quote-mapper.cjs');

/* ===== fixture:取自真实探针响应(probe3 ulist,全品类 5 条) ===== */
const FIX_ULIST = {
  rc: 0, data: { total: 5, diff: [
    { f2: 1330.0,  f3: 2.4,  f4: 31.12,  f12: '600519', f13: 1,   f14: '贵州茅台', f18: 1298.88 },
    { f2: 11.89,   f3: 0.08, f4: 0.01,   f12: '000001', f13: 0,   f14: '平安银行', f18: 11.88 },
    { f2: 442.8,   f3: 2.26, f4: 9.8,    f12: '00700',  f13: 116, f14: '腾讯控股', f18: 433.0 },
    { f2: 319.97,  f3: -2.51,f4: -8.24,  f12: 'AAPL',   f13: 105, f14: '苹果',     f18: 328.21 },
    { f2: 109760.0,f3: 0.16, f4: 180.0,  f12: 'cu2609', f13: 113, f14: '沪铜2609', f18: 109260.0 },
  ] }
};

/* ===== fixture:取自真实探针响应(probe2 suggest 00700) ===== */
const FIX_SUGGEST_00700 = {
  QuotationCodeTable: { Data: [
    { Code: '00700', Name: '腾讯控股', Classify: 'HK',   SecurityTypeName: '港股', QuoteID: '116.00700' },
    { Code: '000700', Name: '模塑科技', Classify: 'AStock', SecurityTypeName: '深A', QuoteID: '0.000700' },
    { Code: '300700', Name: '岱勒新材', Classify: 'AStock', SecurityTypeName: '深A', QuoteID: '0.300700' },
    { Code: '600700', Name: '*ST数码', Classify: 'AStock', SecurityTypeName: '沪A', QuoteID: '1.600700' },
    { Code: '000700', Name: 'Eusu Holdings', Classify: 'KRX', SecurityTypeName: '韩股', QuoteID: '177.000700' },
  ] }
};

test('ulist: 全品类 5 条正确映射为行情记录', () => {
  const qs = emUlistToQuotes(FIX_ULIST);
  assert.equal(qs.length, 5);
  const maotai = qs.find(q => q.code === '600519');
  assert.deepEqual(maotai, { quoteId: '1.600519', market: '1', code: '600519', name: '贵州茅台', price: 1330.0, delta: 31.12, pct: 2.4 });
  const tencent = qs.find(q => q.code === '00700');
  assert.equal(tencent.name, '腾讯控股');
  assert.equal(tencent.price, 442.8);
  assert.equal(tencent.pct, 2.26);
  assert.equal(tencent.market, '116');
  assert.equal(tencent.quoteId, '116.00700');
  const copper = qs.find(q => q.code === 'cu2609');
  assert.equal(copper.pct, 0.16);
  assert.equal(copper.market, '113');
  assert.equal(copper.quoteId, '113.cu2609');
});

test('ulist: 数值缺失/代码空的记录被过滤', () => {
  const qs = emUlistToQuotes({ data: { diff: [
    { f2: '-', f3: 0, f4: 0, f12: 'X1', f13: 1, f14: '无价格' },
    { f2: 10, f3: 0, f4: 0, f12: '', f13: 1, f14: '无代码' },
    { f2: 10.5, f3: 1.2, f4: 0.12, f12: 'OK', f13: 1, f14: '正常' },
  ] } });
  assert.equal(qs.length, 1);
  assert.equal(qs[0].code, 'OK');
  assert.equal(qs[0].price, 10.5);
});

test('ulist: 无 data/空 data 安全返回空数组', () => {
  assert.deepEqual(emUlistToQuotes({}), []);
  assert.deepEqual(emUlistToQuotes({ data: null }), []);
  assert.deepEqual(emUlistToQuotes(null), []);
});

test('suggest: 00700 → 港股腾讯保留且 QuoteID=116.00700', () => {
  const cs = emSuggestToCandidates(FIX_SUGGEST_00700);
  const tencent = cs.find(c => c.quoteId === '116.00700');
  assert.ok(tencent, '港股腾讯应在结果中');
  assert.equal(tencent.name, '腾讯控股');
  assert.equal(tencent.classify, 'HK');
  assert.equal(tencent.securityType, '港股');
});

test('suggest: 韩股(KRX)被排除,但同数字前缀的 A股 000700 保留', () => {
  const cs = emSuggestToCandidates(FIX_SUGGEST_00700);
  assert.ok(!cs.some(c => c.classify === 'KRX'), '韩股不应在结果中');
  assert.ok(cs.some(c => c.code === '000700' && c.classify === 'AStock'));
});

test('suggest: 输入为空/异常结构安全返回空', () => {
  assert.deepEqual(emSuggestToCandidates(null), []);
  assert.deepEqual(emSuggestToCandidates({}), []);
  assert.deepEqual(emSuggestToCandidates({ QuotationCodeTable: { Data: 'x' } }), []);
});

test('suggest: 相同 QuoteID 去重', () => {
  const dup = { QuotationCodeTable: { Data: [
    { Code: '00700', Name: '腾讯控股', Classify: 'HK', SecurityTypeName: '港股', QuoteID: '116.00700' },
    { Code: '00700', Name: '腾讯控股重复', Classify: 'HK', SecurityTypeName: '港股', QuoteID: '116.00700' },
  ] } };
  const cs = emSuggestToCandidates(dup);
  assert.equal(cs.length, 1);
});
