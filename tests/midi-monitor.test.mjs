// Run with: node --test tests/midi-monitor.test.mjs
// Exercise the actual production input handler without requiring MIDI hardware
// or importing the rest of the browser UI. Only its DOM/engine dependencies
// are stubbed; the handler and logging policy are read directly from app.js.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const start = app.indexOf('const MIDI_DEBUG=');
const end = app.indexOf('\n\nfunction processNote(', start);
assert.ok(start >= 0 && end > start, 'Production MIDI handler must be found');
const source = app.slice(start, end);

function monitor(search = '', inputChannel = 'all', echo = false) {
  const logs = [], calls = [], elements = new Map();
  const state = { inputChannel, running: true, heldInputs: new Map() };
  const context = {
    window: { location: { search } }, URLSearchParams, state,
    inputLog: {}, log: (_, text) => logs.push(text),
    $: selector => {
      if (!elements.has(selector)) elements.set(selector, {});
      return elements.get(selector);
    },
    midiToNoteName: n => ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][n % 12] + (Math.floor(n / 12) - 1),
    isLikelyEcho: () => echo, performance: { now: () => 1000 },
    captureInputNote: (note, velocity, channel, time) => {
      calls.push(['capture', note, velocity, channel]);
      return { note, velocity, channel, time };
    },
    releaseCapturedInput: (note, channel) => calls.push(['release', note, channel]),
    setHeld: () => calls.push(['held']),
    processNote: ctx => calls.push(['process', ctx.note]),
    refreshWhileRules: () => calls.push(['while'])
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'app.js MIDI handler' });
  return {
    logs, calls, state, elements,
    receive(bytes) { context.handleMidi({ data: bytes == null ? bytes : Uint8Array.from(bytes) }, { id: 'test-disklavier' }); }
  };
}

for (const search of ['', '?debug=0', '?debug=false', '?debug=true', '?debug=', '?ruleset=Prepared', '?ruleset=Prepared&debug=0']) {
  test(`quiet by default/without exact opt-in: ${search || '(no query)'}`, () => {
    const m = monitor(search);
    for (const packet of [[0xfe], [0xf8], [0xf1, 0x10], [0xf4], [0xf5], [0xf9], [0xfd]]) m.receive(packet);
    assert.deepEqual(m.logs, []);
    assert.deepEqual(m.calls, []);
    assert.equal(m.elements.size, 0);
  });
}

for (const search of ['?debug=1', '?ruleset=Prepared&debug=1']) {
  test(`debug names single-byte messages without invented data: ${search}`, () => {
    const m = monitor(search);
    m.receive([0xfe]); m.receive([0xf8]); m.receive([0xf1, 0x10]);
    assert.deepEqual(m.logs, ['Active Sensing  [FE]', 'MIDI Clock  [F8]', 'MIDI Time Code Quarter Frame  [F1 10]']);
    assert.deepEqual(m.calls, []);
    assert.ok(m.logs.every(x => !x.includes('undefined') && !x.includes('ch ')));
  });
}

test('transport and reset remain readable in normal mode', () => {
  const m = monitor();
  for (const status of [0xfa, 0xfb, 0xfc, 0xff]) m.receive([status]);
  assert.deepEqual(m.logs, ['Start  [FA]', 'Continue  [FB]', 'Stop  [FC]', 'System Reset  [FF]']);
  assert.deepEqual(m.calls, []);
});

test('system messages are not assigned a fictitious MIDI channel', () => {
  const m = monitor('?debug=1', '1');
  m.receive([0xfe]); m.receive([0xf8]); m.receive([0x91, 60, 50]);
  assert.deepEqual(m.logs, ['Active Sensing  [FE]', 'MIDI Clock  [F8]']);
  assert.deepEqual(m.calls, []);
  m.receive([0x90, 60, 50]);
  assert.match(m.logs.at(-1), /C4  vel 50  ch 1  \[90 3C 32\]/);
  assert.ok(m.state.heldInputs.has('1:60'));
});

test('note-on, note-off and note-on with zero velocity preserve musical behavior', () => {
  const m = monitor();
  m.receive([0x90, 64, 50]);
  assert.equal(m.elements.get('#inputHero').textContent, 'E4');
  assert.equal(m.elements.get('#inputVelocity').textContent, 'velocity 50 · ch 1');
  assert.ok(m.state.heldInputs.has('1:64'));
  m.receive([0x80, 64, 32]);
  assert.equal(m.state.heldInputs.size, 0);
  m.receive([0x90, 60, 70]); m.receive([0x90, 60, 0]);
  assert.equal(m.state.heldInputs.size, 0);
  assert.deepEqual(m.logs, ['E4  vel 50  ch 1', 'E4 off  ch 1', 'C4  vel 70  ch 1', 'C4 off  ch 1']);
  assert.equal(m.calls.filter(x => x[0] === 'process').length, 2);
  assert.equal(m.calls.filter(x => x[0] === 'release').length, 2);
  assert.equal(m.calls.filter(x => x[0] === 'while').length, 4);
});

test('pedal CCs remain visible without triggering notes', () => {
  const m = monitor();
  for (const value of [81, 83, 87, 93, 101, 113, 127, 0]) m.receive([0xb0, 64, value]);
  assert.equal(m.logs.length, 8);
  assert.equal(m.logs[0], 'CC 64 = 81  ch 1');
  assert.equal(m.logs.at(-1), 'CC 64 = 0  ch 1');
  assert.deepEqual(m.calls, []);
});

test('two-byte channel messages and pitch/pressure are readable', () => {
  const m = monitor();
  for (const packet of [[0xc0, 5], [0xd0, 48], [0xa0, 60, 39], [0xe0, 0, 64]]) m.receive(packet);
  assert.deepEqual(m.logs, ['Program Change 5  ch 1', 'Channel pressure 48  ch 1', 'Polyphonic pressure C4 = 39  ch 1', 'Pitch Bend 8192  ch 1']);
  assert.deepEqual(m.calls, []);
});

test('debug logs append only the bytes actually received', () => {
  const m = monitor('?debug=1');
  m.receive([0xc0, 5]); m.receive([0xb0, 64, 127]);
  assert.equal(m.logs[0], 'Program Change 5  ch 1  [C0 05]');
  assert.equal(m.logs[1], 'CC 64 = 127  ch 1  [B0 40 7F]');
});

for (const search of ['', '?debug=1']) {
  test(`empty/malformed channel packets never trigger or release a note: ${search}`, () => {
    const m = monitor(search);
    for (const packet of [[], undefined, null, [0x90], [0x90, 60], [0x90, 60, 128], [0x90, 60, 50, 0], [0xc0], [0x01]]) m.receive(packet);
    assert.deepEqual(m.calls, []);
    assert.equal(m.state.heldInputs.size, 0);
    assert.equal(m.logs.length, search ? 6 : 0);
    assert.ok(m.logs.every(x => !x.includes('undefined')));
  });
}

test('echo protection still suppresses generated-note feedback', () => {
  const m = monitor('?debug=1', 'all', true);
  m.receive([0x90, 60, 50]); m.receive([0x80, 60, 0]);
  assert.ok(m.logs.every(x => x.includes('[echo ignored]')));
  assert.deepEqual(m.calls, []);
  assert.equal(m.state.heldInputs.size, 0);
});

test('heartbeat burst cannot overwrite the input display or evict notes from the log', () => {
  const m = monitor();
  m.receive([0x90, 64, 50]);
  const before = m.calls.length;
  for (let i = 0; i < 1000; i++) { m.receive([0xfe]); m.receive([0xf8]); }
  assert.equal(m.logs.length, 1);
  assert.equal(m.calls.length, before);
  assert.equal(m.elements.get('#inputHero').textContent, 'E4');
});

test('all channel statuses and system names avoid undefined fields', () => {
  const m = monitor('?debug=1');
  for (let status = 0x80; status <= 0xff; status++) {
    if (status >= 0xf0) m.receive([status]);
    else if ((status & 0xf0) === 0xc0 || (status & 0xf0) === 0xd0) m.receive([status, 60]);
    else m.receive([status, 60, 50]);
  }
  assert.equal(m.logs.length, 128);
  assert.ok(m.logs.every(x => !x.includes('undefined') && !x.includes('NaN')));
});
