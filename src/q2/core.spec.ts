import { describe, expect, it } from 'vitest';
import { parseLines, aggregate } from './core.js';

describe('Q2 core', () => {
  describe('parseLines', () => {
    it('正常なCSV行を正しくパース', () => {
      const rows = parseLines([
        '2025-01-03T10:12:00Z,u1,/api/orders,200,120',
        '2025-01-04T00:10:00Z,u2,/api/users,404,90',
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
        timestamp: '2025-01-04T00:10:00Z',
        userId: 'u2',
        path: '/api/users',
        status: 404,
        latencyMs: 90,
      });
    });

    it('カラム不足の行をスキップ', () => {
      const rows = parseLines([
        '2025-01-03T10:12:00Z,u1,/api/orders,200,120', // 正常
        'broken,row,only,three',                      // カラム不足
        '2025-01-04T00:10:00Z,u2,/api/users,404,90',  // 正常
        'incomplete,row',                             // カラム不足
      ]);
      
      expect(rows).toHaveLength(2);
      expect(rows[0].userId).toBe('u1');
      expect(rows[1].userId).toBe('u2');
    });

    it('無効な数値フィールドをスキップ', () => {
      const rows = parseLines([
        '2025-01-03T10:12:00Z,u1,/api/orders,200,120',       // 正常
        '2025-01-04T00:10:00Z,u2,/api/users,invalid,90',     // status が無効
        '2025-01-05T00:10:00Z,u3,/api/items,200,not_number', // latencyMs が無効
        '2025-01-06T00:10:00Z,u4,/api/valid,201,150',        // 正常
      ]);
      
      expect(rows).toHaveLength(2);
      expect(rows[0].userId).toBe('u1');
      expect(rows[1].userId).toBe('u4');
    });

    it('空行と空白のみの行をスキップ', () => {
      const rows = parseLines([
        '2025-01-03T10:12:00Z,u1,/api/orders,200,120',
        '',                                           // 空行
        '   ',                                        // 空白のみ
        '2025-01-04T00:10:00Z,u2,/api/users,404,90',
        '\t\n',                                       // タブと改行
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
        '2025-01-04T00:10:00Z,,/api/users,404,90',     // userId が空
        '2025-01-05T00:10:00Z,u3,,200,100',           // path が空
        ',u4,/api/items,200,80',                      // timestamp が空
      ]);
      
      expect(rows).toHaveLength(1);
      expect(rows[0].userId).toBe('u1');
    });
  });

  it.todo('aggregate basic');
});
