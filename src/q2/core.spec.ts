import { describe, expect, it } from 'vitest';
import { aggregate, parseLines } from './core.js';

describe('Q2 CSV パース機能', () => {
  it('正常なCSV行を適切にパース', () => {
    const rows = parseLines(['2025-01-03T10:12:00Z,u1,/api/orders,200,120']);
    expect(rows[0]).toEqual({
      timestamp: '2025-01-03T10:12:00Z',
      userId: 'u1',
      path: '/api/orders',
      status: 200,
      latencyMs: 120,
    });
  });

  it('壊れた行をスキップ（カラム不足/非数値）', () => {
    const rows = parseLines([
      '2025-01-03T10:12:00Z,u1,/api/orders,200,120', // 正常
      'broken,row,only,three', // カラム不足
      '2025-01-04T11:30:00Z,u2,/api/users,abc,90', // status非数値
      '2025-01-05T12:00:00Z,u3,/api/items,200,xyz', // latency非数値
      '',
      '   ', // 空行・空白行
      '2025-01-06T13:00:00Z,,/api/empty,200,100', // userId空
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe('u1');
  });
});

describe('Q2 期間フィルタ機能', () => {
  it('from/to境界含む判定が正しい', () => {
    const lines = [
      '2024-12-31T23:59:59Z,u1,/api/before,200,100', // 除外
      '2025-01-01T00:00:00Z,u2,/api/start,200,110', // 含む
      '2025-01-02T12:00:00Z,u3,/api/middle,200,120', // 含む
      '2025-01-03T23:59:59Z,u4,/api/end,200,130', // 含む
      '2025-01-04T00:00:00Z,u5,/api/after,200,140', // 除外
    ];
    const result = aggregate(lines, {
      from: '2025-01-01',
      to: '2025-01-03',
      tz: 'jst',
      top: 10,
    });
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.path)).toEqual([
      '/api/start',
      '/api/middle',
      '/api/end',
    ]);
  });
});

describe('Q2 タイムゾーン変換機能', () => {
  it('UTC→JST/ICT変換で日付跨ぎが正しい', () => {
    const lines = ['2025-01-01T15:30:00Z,u1,/api/test,200,100']; // UTC 15:30
    const jstResult = aggregate(lines, {
      from: '2025-01-01',
      to: '2025-01-02',
      tz: 'jst',
      top: 10,
    });
    const ictResult = aggregate(lines, {
      from: '2025-01-01',
      to: '2025-01-02',
      tz: 'ict',
      top: 10,
    });
    expect(jstResult[0].date).toBe('2025-01-02'); // JST: 00:30+1日
    expect(ictResult[0].date).toBe('2025-01-01'); // ICT: 22:30同日
  });
});

describe('Q2 集計機能', () => {
  it('date×pathの件数・平均が正しい', () => {
    const lines = [
      '2025-01-01T10:00:00Z,u1,/api/orders,200,100',
      '2025-01-01T11:00:00Z,u2,/api/orders,200,200',
      '2025-01-01T12:00:00Z,u3,/api/users,200,150',
    ];
    const result = aggregate(lines, {
      from: '2025-01-01',
      to: '2025-01-01',
      tz: 'jst',
      top: 10,
    });
    const orders = result.find((r) => r.path === '/api/orders')!;
    const users = result.find((r) => r.path === '/api/users')!;
    expect(orders.count).toBe(2);
    expect(orders.avgLatency).toBe(150); // (100+200)/2=150
    expect(users.count).toBe(1);
    expect(users.avgLatency).toBe(150);
  });
});

describe('Q2 ランキング機能', () => {
  it('日付ごとにcount降順、同数時はpath昇順', () => {
    const lines = [
      '2025-01-01T10:00:00Z,u1,/api/c,200,100',
      '2025-01-01T10:00:00Z,u2,/api/a,200,100',
      '2025-01-01T10:00:00Z,u3,/api/a,200,100', // count=2
      '2025-01-01T10:00:00Z,u4,/api/b,200,100', // count=1
      '2025-01-02T10:00:00Z,u5,/api/z,200,100',
      '2025-01-02T10:00:00Z,u6,/api/y,200,100',
    ];
    const result = aggregate(lines, {
      from: '2025-01-01',
      to: '2025-01-02',
      tz: 'jst',
      top: 2,
    });
    // 各日付でtop2、最終順序：date ASC, count DESC, path ASC
    expect(
      result.map((r) => ({ date: r.date, path: r.path, count: r.count }))
    ).toEqual([
      { date: '2025-01-01', path: '/api/a', count: 2 }, // count降順1位
      { date: '2025-01-01', path: '/api/b', count: 1 }, // count降順2位（path昇順でb<c）
      { date: '2025-01-02', path: '/api/y', count: 1 }, // path昇順
      { date: '2025-01-02', path: '/api/z', count: 1 },
    ]);
  });
});

describe('Q2 統合テスト', () => {
  it('最終出力順序が決定的（date ASC, count DESC, path ASC）', () => {
    const lines = [
      '2025-01-03T10:00:00Z,u1,/api/z,200,100', // 2025-01-03, count=1
      '2025-01-01T10:00:00Z,u2,/api/b,200,100', // 2025-01-01, count=1
      '2025-01-01T10:00:00Z,u3,/api/a,200,100', // 2025-01-01, count=2
      '2025-01-01T10:00:00Z,u4,/api/a,200,100',
      '2025-01-02T10:00:00Z,u5,/api/x,200,100', // 2025-01-02, count=1
    ];
    const result = aggregate(lines, {
      from: '2025-01-01',
      to: '2025-01-03',
      tz: 'jst',
      top: 10,
    });
    expect(
      result.map((r) => ({ date: r.date, path: r.path, count: r.count }))
    ).toEqual([
      { date: '2025-01-01', path: '/api/a', count: 2 }, // 日付1位、件数1位
      { date: '2025-01-01', path: '/api/b', count: 1 }, // 日付1位、件数2位
      { date: '2025-01-02', path: '/api/x', count: 1 }, // 日付2位
      { date: '2025-01-03', path: '/api/z', count: 1 }, // 日付3位
    ]);
  });
});
