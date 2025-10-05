import { describe, expect, it } from 'vitest';
import { aggregate } from './core.js';

describe('期間フィルタ機能', () => {
  it('from/to境界含む判定が正しい', () => {
    const lines = [
      '2025-01-01T00:00:00Z,u1,/api/orders,200,100', // from境界（含む）
      '2025-01-01T14:59:59Z,u2,/api/users,200,110',  // from境界内
      '2025-01-02T12:00:00Z,u3,/api/items,200,120',  // 範囲内
      '2025-01-03T14:59:59Z,u4,/api/orders,200,130', // to境界内（含む）
    ];
    
    const result = aggregate(lines, {
      from: '2025-01-01',
      to: '2025-01-03',
      tz: 'jst',
      top: 10
    });
    
    // 各パスが含まれているか確認
    expect(result.some(r => r.path === '/api/orders')).toBe(true);
    expect(result.some(r => r.path === '/api/users')).toBe(true);
    expect(result.some(r => r.path === '/api/items')).toBe(true);
    
    // 全ての結果が期間内であることを確認
    result.forEach(r => {
      expect(['2025-01-01', '2025-01-02', '2025-01-03']).toContain(r.date);
    });
    
    expect(result).toHaveLength(4); // 4つのエントリ（date×path別）
  });

  it('範囲外のデータを除外', () => {
    const lines = [
      '2024-12-31T23:59:59Z,u1,/api/old,200,100',    // from前（除外）
      '2025-01-01T00:00:00Z,u2,/api/orders,200,110', // 範囲内
      '2025-01-04T00:00:00Z,u3,/api/future,200,120', // to後（除外）
    ];
    
    const result = aggregate(lines, {
      from: '2025-01-01',
      to: '2025-01-03',
      tz: 'jst',
      top: 10
    });
    
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('/api/orders');
    expect(result[0].date).toBe('2025-01-01');
  });

  it('境界値の精密テスト（1秒単位）', () => {
    const lines = [
      '2024-12-31T23:59:59Z,u1,/api/before,200,100', // 1秒前（除外）
      '2025-01-01T00:00:00Z,u2,/api/start,200,110',  // 開始時刻（含む）
      '2025-01-03T23:59:59Z,u3,/api/end,200,120',    // 終了時刻（含む）
      '2025-01-04T00:00:00Z,u4,/api/after,200,130',  // 1秒後（除外）
    ];
    
    const result = aggregate(lines, {
      from: '2025-01-01',
      to: '2025-01-03',
      tz: 'jst',
      top: 10
    });
    
    expect(result).toHaveLength(2);
    expect(result.some(r => r.path === '/api/start')).toBe(true);
    expect(result.some(r => r.path === '/api/end')).toBe(true);
    expect(result.some(r => r.path === '/api/before')).toBe(false);
    expect(result.some(r => r.path === '/api/after')).toBe(false);
  });
});