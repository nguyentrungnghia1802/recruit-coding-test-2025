import { describe, expect, it } from 'vitest';
import { parseLines } from './core.js';

describe('parseLines関数', () => {
  it('正常なCSV行を適切にパース', () => {
    const rows = parseLines([
      '2025-01-03T10:12:00Z,u1,/api/orders,200,120',
      '2025-01-04T11:30:00Z,u2,/api/users,404,90',
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      timestamp: '2025-01-03T10:12:00Z',
      userId: 'u1',
      path: '/api/orders',
      status: 200,
      latencyMs: 120,
    });
    expect(rows[1]).toEqual({
      timestamp: '2025-01-04T11:30:00Z',
      userId: 'u2',
      path: '/api/users',
      status: 404,
      latencyMs: 90,
    });
  });

  it('カラム不足の行をスキップ', () => {
    const rows = parseLines([
      '2025-01-03T10:12:00Z,u1,/api/orders,200,120', // 正常
      'broken,row,only,three', // カラム不足
      '2025-01-04T11:30:00Z,u2,/api/users,404,90', // 正常
      'incomplete', // カラム不足
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0].userId).toBe('u1');
    expect(rows[1].userId).toBe('u2');
  });

  it('無効な数値フィールドをスキップ', () => {
    const rows = parseLines([
      '2025-01-03T10:12:00Z,u1,/api/orders,200,120', // 正常
      '2025-01-04T11:30:00Z,u2,/api/users,invalid,90', // status無効
      '2025-01-05T12:00:00Z,u3,/api/items,200,not_number', // latency無効
      '2025-01-06T13:00:00Z,u4,/api/valid,201,150', // 正常
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0].userId).toBe('u1');
    expect(rows[1].userId).toBe('u4');
  });

  it('空行と空白のみの行をスキップ', () => {
    const rows = parseLines([
      '2025-01-03T10:12:00Z,u1,/api/orders,200,120',
      '', // 空行
      '   ', // 空白のみ
      '2025-01-04T11:30:00Z,u2,/api/users,404,90',
      '\t\n', // タブと改行
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0].userId).toBe('u1');
    expect(rows[1].userId).toBe('u2');
  });

  it('フィールド内の空白を適切にトリム', () => {
    const rows = parseLines([
      ' 2025-01-03T10:12:00Z , u1 , /api/orders , 200 , 120 ',
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      timestamp: '2025-01-03T10:12:00Z',
      userId: 'u1',
      path: '/api/orders',
      status: 200,
      latencyMs: 120,
    });
  });

  it('空のフィールドを含む行をスキップ', () => {
    const rows = parseLines([
      '2025-01-03T10:12:00Z,u1,/api/orders,200,120', // 正常
      '2025-01-04T11:30:00Z,,/api/users,404,90', // userId空
      '2025-01-05T12:00:00Z,u3,,200,100', // path空
      ',u4,/api/items,200,80', // timestamp空
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe('u1');
  });
});
