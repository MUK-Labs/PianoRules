# [PianoRules](https://muk-labs.github.io/PianoRules/)

PianoRules is a static, browser-based MIDI rule engine for interactive piano performance, algorithmic composition, improvisation and teaching. It is designed for GitHub Pages and does not require a server.

## Highlights

- Web MIDI input from keyboards, Clavinovas, Disklaviers and controllers.
- MIDI output to hardware, virtual MIDI ports, DAWs and player pianos.
- **Browser preview piano** for immediate sound without external MIDI output.
- Human-readable, editable performance rules.
- Live input/output monitoring.
- Trigger-driven **sections**; only one section is active at a time.
- `when`, `while`, elapsed-time, regular and random triggers.
- Arbitrary chord detection: `when chord played ...`.
- Musical memory: harmony, motifs and phrases.
- Chord-derived tremoli, clouds and ostinati.
- Phrase capture, retrograde, transposition, timing/velocity transforms and looping.
- Named sequences, MIDI-file playback and audio playback.
- Shared GitHub `Library/` rulesets via `?ruleset=Name`.
- Local/remote assets with `assets from ...` and `asset ... from ...`.
- Remembered MIDI routing and fullscreen preferences.
- MIDI feedback protection for player-piano loops.

## Quick start

Press **START PERFORMANCE**, then open **MIDI** and choose an input and output.

For quick testing, choose:

```text
Browser preview piano (built-in)
```

as the MIDI output. For a Disklavier, select the Disklavier/interface as both the appropriate MIDI input and output. For a DAW, select a virtual MIDI port as the output.

After editing the rules, click **Apply changes** or press **Cmd+Enter** / **Ctrl+Enter**. The page does not need to be reloaded.

## A harmonic-memory example

```text
section Harmonic Cloud:
  when chord played notes 3..6 within 170ms:
    remember chord as harmony

  while harmony exists every 75ms:
    play random note from harmony octave random -2..+2 velocity 14..32 for 55ms

  while harmony exists every 240ms:
    play next note from harmony pattern [1 3 2 4 3 2] octave -1 velocity 34 for 110ms
```

The pianist supplies harmony; PianoRules supplies independent machine behaviours around it.

## Phrase memory

```text
when phrase ends after 900ms:
  remember phrase as melody
  play remembered melody backwards transpose +12 velocity *0.45 timing *1.15
```

Or loop a captured phrase:

```text
loop remembered melody every 4s velocity *0.5
```

## Sections

```text
section A:
  when note C7:
    go to section B

section B:
  when note C1:
    go to section A
```

Changing section is a hard musical reset: timers, loops, sequences, sounding generated notes and musical memories are cleared, and the new section receives a fresh local clock.

Existing files without section headers remain valid as one implicit `Main` section.

During performance, you can also **click anywhere inside an inactive section in the code editor** to activate it immediately. This is equivalent to a section change: the previous section is reset and the clicked section becomes the running code. If the editor contains unapplied changes, PianoRules leaves the section unchanged until you apply the edits, to avoid accidentally running half-edited code.

## Shared rulesets

A URL such as:

```text
https://muk-labs.github.io/PianoRules/?ruleset=Prepared
```

loads:

```text
Library/Prepared/Prepared.rules
```

A ruleset can declare its asset folder:

```text
assets from "./assets/"
```

so a file such as:

```text
play sound "C3.mp3"
```

resolves to the corresponding `assets/` folder beside the ruleset. Referenced remote assets are preloaded with cache revalidation before the engine starts.

## Local assets

Drop `.mid`, `.wav`, `.mp3`, `.m4a`, `.ogg`, etc. onto the bottom bar. They are stored in IndexedDB on that browser/device and can be referenced by filename.

## Deploy on GitHub Pages

1. Put the project files at the repository root.
2. Commit and push to GitHub.
3. In **Settings → Pages**, deploy the `main` branch from `/ (root)`.
4. Open the resulting HTTPS URL in a Web-MIDI-capable desktop browser.

GitHub Pages supplies HTTPS, which Web MIDI requires.

## Example study

`examples/Harmonic-Machines-study.rules` is an original multi-section study demonstrating harmonic reservoirs, morphing clouds, chord-derived ostinati, phrase loops, and delayed canons. It is meant as a starting point to edit, not as a transcription of any other artist's code.

## [Documentation](https://muk-labs.github.io/PianoRules/docs/)

The full performer-facing musical grammar is in [`docs/README.md`](docs/README.md). On GitHub Pages it is also available as the formatted `/docs/` page.

It includes dedicated setup instructions for:

- Disklavier / player-piano routing;
- the built-in browser preview piano;
- Ableton Live and software piano libraries using virtual MIDI ports;
- shared Library rulesets and assets.

## [Shared library](https://drive.google.com/drive/folders/13X9AR03kODoQFeSk52oS9WSVNPSqHkpw)

The toolbar's **Files** button opens the communal Google Drive folder:

<https://drive.google.com/drive/folders/13X9AR03kODoQFeSk52oS9WSVNPSqHkpw?usp=sharing>

## MIDI monitor and debug mode

The incoming MIDI log is quiet by default. Repetitive **Active Sensing** (`0xFE`),
**MIDI Clock** (`0xF8`), MIDI time-code quarter frames and reserved system messages
are hidden. Notes, note releases, pedals/CC, pressure, program changes and pitch
bend remain visible. Transport messages (Start/Continue/Stop) and System Reset
also remain visible, with readable names.

Use `?debug=1` to include housekeeping messages and raw hexadecimal bytes:

```text
https://muk-labs.github.io/PianoRules/?debug=1
https://muk-labs.github.io/PianoRules/?ruleset=Prepared&debug=1
```

Use `?debug=0`, or omit `debug`, for the normal view. Only the exact value `1`
enables debug; it is not saved in browser preferences. Reload after changing
this URL parameter. Debug mode changes **input logging only**, not the score,
MIDI output, echo guard or timing. System messages have no channel, so their
debug display is independent of the selected input channel (but still uses
only the selected input devices). Empty/malformed channel messages cannot
trigger notes; malformed non-empty messages are shown only in debug mode.

For example, the Disklavier's single-byte heartbeat is displayed as
`Active Sensing [FE]`, not `0xfe undefined 0`. This is not MIDI Clock.
See the MIDI Association's [status-byte table](https://midi.org/expanded-midi-1-0-messages-list)
and [message summary](https://midi.org/summary-of-midi-1-0-messages).
Debug does not request additional System Exclusive permissions or implement
external clock synchronization/Active Sensing connection supervision.

Regression tests (Node.js 18+; no dependencies):

```sh
node --test tests/midi-monitor.test.mjs
```

## Browser notes

- Web MIDI requires HTTPS or localhost.
- Chromium-based desktop browsers are the safest performance target.
- Fullscreen requires a user gesture, so PianoRules requests it from the initial Start button.
- The operating system's default General MIDI synth is not reliably exposed as a browser MIDI output; PianoRules therefore includes its own browser-native preview synth.

## Player-piano safety

Start with modest velocities and density. Leave the MIDI feedback guard enabled until the routing has been verified. **Panic** sends All Notes Off / All Sound Off across all channels.

## Author

PianoRules was conceived and developed by **Adrián Artacho**, composer, researcher and educator at the [Music and Arts University of the City of Vienna (MUK)](https://muk.ac.at/studienangebot/lehrende/details/adrian-artacho.html).

## 📝 [To-Do](https://trello.com/c/FkmRScNz/104-pianorules)
