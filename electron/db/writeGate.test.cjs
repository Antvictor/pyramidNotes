const test = require('node:test');
const assert = require('node:assert/strict');
const { setWriteGate, waitForWriteGate } = require('./writeGate.cjs');

test('no gate → resolves immediately', async () => {
  setWriteGate(null);
  await waitForWriteGate();
});

test('waits until the reconcile promise settles', async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  setWriteGate(gate);

  let passed = false;
  const waiter = waitForWriteGate().then(() => { passed = true; });
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(passed, false);

  release();
  await waiter;
  assert.equal(passed, true);
  setWriteGate(null);
});

test('rejected reconcile does not block writes forever', async () => {
  const gate = Promise.reject(new Error('reconcile failed'));
  gate.catch(() => {});
  setWriteGate(gate);
  await waitForWriteGate();
  setWriteGate(null);
});
