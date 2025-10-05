import { describe, expect, it } from 'vitest';
import { aggregate } from './core.js';

describe('タイムゾーン変換機能', () => {
  it('UTC→JST変換で日付跨ぎが正しい', () => {
    const lines = [
      '2025-01-01T14:59:59Z,u1,/api/test,200,100', // UTC→JST: 2025-01-01 23:59
      '2025-01-01T15:00:00Z,u2,/api/test,200,110', // UTC→JST: 2025-01-02 00:00
      '2025-01-02T14:59:59Z,u3,/api/test,200,120', // UTC→JST: 2025-01-02 23:59
      '2025-01-02T15:00:00Z,u4,/api/test,200,130', // UTC→JST: 2025-01-03 00:00
    ];

    const result = aggregate(lines, {
      from: '2025-01-01',
      to: '2025-12-31',
      tz: 'jst',
      top: 10,
    });

    // JST変換後の日付が正しいことを確認
    const dateGroups = result.reduce(
      (acc, r) => {
        acc[r.date] = (acc[r.date] || 0) + r.count;
        return acc;
      },
      {} as Record<string, number>
    );

    expect(dateGroups['2025-01-01']).toBe(1); // 1件
    expect(dateGroups['2025-01-02']).toBe(2); // 2件
    expect(dateGroups['2025-01-03']).toBe(1); // 1件
  });

  it('UTC→ICT変換で日付跨ぎが正しい', () => {
    const lines = [
      '2025-01-01T16:59:59Z,u1,/api/test,200,100', // UTC→ICT: 2025-01-01 23:59
      '2025-01-01T17:00:00Z,u2,/api/test,200,110', // UTC→ICT: 2025-01-02 00:00
      '2025-01-02T16:59:59Z,u3,/api/test,200,120', // UTC→ICT: 2025-01-02 23:59
      '2025-01-02T17:00:00Z,u4,/api/test,200,130', // UTC→ICT: 2025-01-03 00:00
    ];

    const result = aggregate(lines, {
      from: '2025-01-01',
      to: '2025-12-31',
      tz: 'ict',
      top: 10,
    });

    // ICT変換後の日付が正しいことを確認
    const dateGroups = result.reduce(
      (acc, r) => {
        acc[r.date] = (acc[r.date] || 0) + r.count;
        return acc;
      },
      {} as Record<string, number>
    );

    expect(dateGroups['2025-01-01']).toBe(1); // 1件
    expect(dateGroups['2025-01-02']).toBe(2); // 2件
    expect(dateGroups['2025-01-03']).toBe(1); // 1件
  });

  it('タイムゾーン変換による期間フィルタへの影響', () => {
    const lines = [
      '2025-01-01T15:30:00Z,u1,/api/jst,200,100', // UTC→JST: 2025-01-02
      '2025-01-01T17:30:00Z,u2,/api/ict,200,110', // UTC→ICT: 2025-01-02
    ];

    //期間フィルタは「UTC基準」で動作するため、タイムゾーン変換後の日付ではなく
    // 元のUTC時刻で期間判定される
    const result = aggregate(lines, {
      from: '2025-01-01',
      to: '2025-01-01',
      tz: 'jst',
      top: 10,
    });

    // UTC 2025-01-01の範囲内なので両方含まれる
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.date === '2025-01-02')).toBe(true); // JST変換後は2025-01-02
  });
});
