import {describe, it} from 'node:test';
import assert from 'node:assert/strict';

export {describe, it};

export function expect(actual: unknown) {
  return {
    toBe(expected: unknown) {
      assert.strictEqual(actual, expected);
    },
    toEqual(expected: unknown) {
      assert.deepStrictEqual(actual, expected);
    },
    toHaveLength(expected: number) {
      assert.strictEqual((actual as unknown[]).length, expected);
    },
    toBeNull() {
      assert.strictEqual(actual, null);
    },
    toContain(item: unknown) {
      if (Array.isArray(actual) || typeof actual === 'string') {
        assert.ok((actual as any).includes(item));
      } else if (actual instanceof Set) {
        assert.ok((actual as Set<unknown>).has(item));
      } else {
        assert.fail(`Expected ${actual} to contain ${item}`);
      }
    },
    not: {
      toBe(expected: unknown) {
        assert.notStrictEqual(actual, expected);
      },
      toBeNull() {
        assert.notStrictEqual(actual, null);
      },
      toContain(item: unknown) {
        if (Array.isArray(actual) || typeof actual === 'string') {
          assert.ok(!(actual as any).includes(item));
        } else if (actual instanceof Set) {
          assert.ok(!(actual as Set<unknown>).has(item));
        }
      },
      toThrow() {
        if (typeof actual === 'function') {
          assert.doesNotThrow(actual as () => void);
        }
      },
    },
    toBeGreaterThanOrEqual(expected: number) {
      assert.ok((actual as number) >= expected);
    },
    toBeLessThanOrEqual(expected: number) {
      assert.ok((actual as number) <= expected);
    },
    toBeGreaterThan(expected: number) {
      assert.ok((actual as number) > expected);
    },
    toThrow(matcher?: unknown) {
      if (typeof actual !== 'function') throw new Error('Expected function to throw');
      assert.throws(actual as () => void, matcher as any);
    },
  };
}
