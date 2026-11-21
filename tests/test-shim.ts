// @ts-ignore
import {describe, it} from 'node:test';
// @ts-ignore
import assert from 'node:assert/strict';

export {describe, it};

export function expect(actual: unknown, message?: string) {
  return {
    toBe(expected: unknown) {
      assert.strictEqual(actual, expected, message);
    },
    toEqual(expected: unknown) {
      assert.deepStrictEqual(actual, expected, message);
    },
    toHaveLength(expected: number) {
      assert.strictEqual((actual as unknown[]).length, expected, message);
    },
    toBeNull() {
      assert.strictEqual(actual, null, message);
    },
    toContain(expected: unknown) {
      if (typeof actual === 'string') {
        assert.ok(actual.includes(expected as string), message || `Expected string "${actual}" to contain "${expected}"`);
      } else if (Array.isArray(actual) || (actual instanceof Set)) {
        let found = false;
        for (const item of actual as Iterable<unknown>) {
          try {
            assert.deepStrictEqual(item, expected);
            found = true;
            break;
          } catch {}
        }
        assert.ok(found, message || `Expected collection to contain ${JSON.stringify(expected)}`);
      } else {
        throw new Error('toContain called on non-collection');
      }
    },
    not: {
      toBe(expected: unknown) {
        assert.notStrictEqual(actual, expected, message);
      },
      toBeNull() {
        assert.notStrictEqual(actual, null, message);
      },
      toThrow() {
        if (typeof actual === 'function') {
          assert.doesNotThrow(actual as () => void, message);
        }
      },
    },
    toBeGreaterThanOrEqual(expected: number) {
      assert.ok((actual as number) >= expected, message);
    },
    toBeLessThanOrEqual(expected: number) {
      assert.ok((actual as number) <= expected, message);
    },
    toBeGreaterThan(expected: number) {
      assert.ok((actual as number) > expected, message);
    },
    toThrow(matcher?: unknown) {
      if (typeof actual !== 'function') throw new Error('Expected function to throw');
      assert.throws(actual as () => void, matcher as any, message);
    },
  };
}
