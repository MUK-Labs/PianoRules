# PianoRules — Musical Grammar

PianoRules is a browser-based language for creating relationships between a performer and a MIDI-capable instrument. It is designed to read like a **description of musical behaviour**, not like conventional computer code.

The basic shape is:

```text
trigger:
  action
```

A trigger says **when** something becomes relevant. An action says **what the machine does** in response.

After editing the code, press **Apply changes** or **⌘/Ctrl+Enter**. No page reload is required.

---

# 1. First performance

1. Connect a MIDI keyboard, Clavinova, Disklavier, or other MIDI controller.
2. Open PianoRules in a Web-MIDI-capable desktop browser such as Chrome or Edge.
3. Press **Start Performance**.
4. Open **MIDI** and choose an input and an output.
5. For immediate testing without any external sound generator, choose **Browser preview piano (built-in)** as the output.
6. Edit the rules and press **Apply changes**.

The MIDI setup is remembered locally by the browser.

---

# 2. Event triggers: `when`

## Any note

```text
when any note:
  play +12
```

Every incoming note triggers an octave above it.

## A specific note

```text
when note C4:
  play G4
```

Notes may be written as names such as `C4`, `F#3`, `Bb5`, or as MIDI numbers from `0` to `127`.

## Dynamics as a trigger

```text
when any note velocity 90..127:
  play +7 velocity 40
```

This makes playing intensity part of the form. Soft and loud gestures can open different machine behaviours.

## A specific chord

```text
when chord [C4 E4 G4] within 180ms:
  play [D5 F#5 A5] velocity 60
```

The notes may arrive in any order within the indicated time window.

## Any newly played chord

```text
when chord played notes 3..6 within 170ms:
  remember chord as harmony
```

This is different from matching one predefined chord. PianoRules gathers the compact chord-like gesture you just played and makes its pitches available to the actions below.

`notes 3..6` means that the detected sonority must contain between three and six distinct notes. If omitted, PianoRules accepts a broader chord size.

This trigger is especially useful for pieces in which the performer controls the harmony while the computer controls texture, register, density, or rhythm.

## Phrase endings

```text
when phrase ends after 900ms:
  remember phrase as melody
```

A phrase ends when no new note has arrived for the specified amount of time. The notes since the previous phrase ending are provided to the rule as one captured phrase.

This is intentionally simple: phrase segmentation is based on silence, so the performer can shape the segmentation through timing.

---

# 3. State triggers: `while`

`when` describes an event. `while` describes a state that remains true.

## While a note is held

```text
while note C4 down every 180ms:
  play +7 velocity input*0.6 for 80ms
```

The process runs only while C4 remains physically down.

## While any note is held

```text
while any note down every 120ms:
  play +12 velocity input*0.45 for 60ms
```

A velocity condition can also be added:

```text
while any note down velocity 90..127 every 100ms:
  play -12 velocity 35 for 50ms
```

## While a sequence is playing

```text
sequence answer:
  play +12 for 160ms
  wait 200ms
  play +7 for 160ms

when note D4:
  play sequence answer

while sequence answer playing every 220ms:
  play -12 velocity 35 for 80ms
```

One process can therefore accompany another process.

## While musical memory exists

```text
while harmony exists every 80ms:
  play random note from harmony velocity 20..40 for 60ms
```

The repetition interval can itself be random:

```text
while harmony exists every random 700ms..1.8s:
  play random note from harmony octave +2 velocity 18..34 for 420ms
```

The process begins as soon as a memory named `harmony` has been created and remains available until that memory is cleared or the section changes.

This is one of the central ideas of PianoRules: **the performer can create material, and other rules can keep acting upon that material independently.**

---

# 4. Time triggers

## After the beginning of a section

```text
after start 8s:
  play [C3 G3 C4] velocity 48 for 700ms
```

Every section has its own clock. Entering a new section resets `start`.

## Regular autonomous events

```text
every 3s:
  play C5 velocity 40 for 100ms
```

## Random autonomous events

```text
every random 2s..5s:
  play random [C4 D4 E4 G4 A4] velocity 25..55 for 140ms
```

A new interval is chosen after every event.

---

# 5. Sections and musical form

A piece can contain several independent behavioural worlds:

```text
section Solo:
  when note C7:
    go to section Tremolo

section Tremolo:
  when chord played notes 3..6:
    remember chord as harmony

  while harmony exists every 70ms:
    play random note from harmony velocity 20..40 for 50ms

  when note C1:
    go to section Solo
```

Only one section runs at a time. The first section is active by default.

Sections do **not** need to follow one another sequentially. A trigger can jump from A to C, C back to A, or create a branching form.

When a section changes, PianoRules performs a hard musical reset:

- old timers and repetitions are cancelled;
- named sequences stop;
- loops stop;
- `while` processes stop;
- generated notes receive an all-notes-off reset;
- PianoRules-started audio stops;
- musical memories such as `harmony`, `motif`, and `melody` are cleared;
- the new section receives a fresh clock.

A file with no `section` headers still works as one implicit section called `Main`.

During performance, you can also **click anywhere inside an inactive section in the code editor** to activate it immediately. This is equivalent to a section change: the previous section is reset and the clicked section becomes the running code. If the editor contains unapplied changes, PianoRules leaves the section unchanged until you apply the edits, to avoid accidentally running half-edited code.

---

# 6. Basic note actions

## Absolute notes

```text
play C5
```

## Chords

```text
play [C4 E4 G4]
```

## Relative notes

```text
when any note:
  play +4
```

`+4` means four semitones above the triggering note. Negative values move downward.

## Velocity

```text
play C5 velocity 60
play +7 velocity input
play +7 velocity input*0.5
play C5 velocity 30..70
```

The last form chooses a random velocity inside the range.

## Delay and duration

```text
play +12 after 300ms for 120ms
```

## Repetition

```text
play +4 repeat 8 every 300ms for 90ms
```

## Acceleration and deceleration

```text
play +4 repeat 9 every 420ms accelerate 0.84 for 90ms
```

Each following interval is multiplied by `0.84`, so the repetition accelerates. A value above `1` decelerates.

## Output channel

```text
play C5 channel 2
```

---

# 7. Musical memory

Musical memory lets a performer create material that remains available to independent rules.

## Remember a chord

```text
when chord played notes 3..6 within 170ms:
  remember chord as harmony
```

A later chord replaces the memory if the same name is used again.

Equivalent wording is available:

```text
replace harmony with chord
```

## Morph from one harmony to the next

```text
when chord played notes 3..6 within 170ms:
  morph harmony to chord over 2s
```

Instead of abruptly replacing the pitch reservoir, PianoRules gradually changes the probability of choosing notes from the old chord toward the new chord.

This is particularly useful for clouds and tremoli: the texture can remain continuous while its harmonic identity changes progressively.

## Clear a memory

```text
clear harmony
```

Any `while harmony exists` process then stops.

## Remember the last notes

```text
when note C7:
  remember last 8 notes as motif
```

This captures the timing, velocity, pitch and approximate duration of the most recent eight performed notes.

## Remember a phrase

```text
when phrase ends after 900ms:
  remember phrase as melody
```

The phrase can then be replayed, transformed or looped.

---

# 8. Chord-derived textures

## Random chord tone

```text
while harmony exists every 70ms:
  play random note from harmony velocity 15..35 for 50ms
```

The pianist determines pitch content; the machine determines which chord tone occurs next.

## Random register displacement

```text
while harmony exists every 70ms:
  play random note from harmony octave random -2..+2 velocity 15..35 for 50ms
```

The stored chord is treated as a pitch reservoir that can be projected into different octaves.

## Fixed register displacement

```text
play random note from harmony octave -2
```

## Restrict the register

```text
while harmony exists every 120ms:
  play random note from harmony range C5..C7 velocity 18..36 for 90ms
```

PianoRules preserves the pitch class of the selected chord tone and places it inside the requested range when possible.

## Patterned ostinato from a chord

```text
while harmony exists every 190ms:
  play next note from harmony pattern [1 3 2 4 3 2] octave -1 velocity 38 for 100ms
```

The numbers refer to the stored chord tones in ascending order. For a four-note harmony, `1 3 2 4` means first chord tone, third, second, fourth.

If a pattern asks for an index larger than the number of chord tones, PianoRules wraps around the available material rather than failing.

This makes one rule reusable with triads, seventh chords, clusters, and changing voicings.

---

# 9. Captured material: replay, retrograde and looping

## Replay remembered material

```text
play remembered melody
```

The captured relative timing and note durations are retained.

## Transposition

```text
play remembered melody transpose +12
```

## Backwards

```text
play remembered melody backwards
```

This produces a temporal retrograde of the captured material.

## Combine transformations

```text
play remembered melody backwards transpose +12 velocity *0.45 timing *1.15
```

This means:

- reverse the captured phrase;
- transpose it one octave upward;
- scale its velocities to 45%;
- stretch its timing by 15%.

## Random timing scale

```text
play remembered melody timing * random 0.8..1.2
```

A new timing factor is chosen for that playback.

## Loop captured material

```text
loop remembered phrase1 every 4s
```

Or:

```text
loop remembered phrase1 every 4s velocity *0.55 timing * random 0.9..1.1
```

The loop continues until the rules are restarted, Panic is pressed, or the section changes.

If `every ...` is omitted, PianoRules begins the next repetition after the remembered material has finished.

---

# 10. Named sequences

Sequences are reusable blocks of actions:

```text
sequence answer:
  play +12 velocity input*0.8 for 130ms
  wait 160ms
  play +7 velocity input*0.7 for 130ms
  wait 160ms
  play +3 velocity input*0.6 for 180ms

when note D4:
  play sequence answer
```

`wait` advances the internal sequence timeline.

Sequences are useful when a behaviour is composed in advance but should remain triggerable from several places.

---

# 11. MIDI and audio files

```text
when note F4:
  play midi "gesture.mid"

when note G4:
  play sound "resonance.wav"
```

Files can be dropped onto PianoRules and stored locally in the browser.

A ruleset can also declare a shared remote asset folder:

```text
assets from "./assets/"
```

If a shared ruleset is located at:

```text
Library/Prepared/Prepared.rules
```

then `./assets/` refers naturally to:

```text
Library/Prepared/assets/
```

You can also declare one asset explicitly:

```text
asset "special.wav" from "./other-folder/special.wav"
```

Shared Library rulesets can be opened with a URL such as:

```text
?ruleset=Prepared
```

PianoRules then looks for:

```text
Library/Prepared/Prepared.rules
```

and preloads the assets referenced by that ruleset before starting.

---

# 12. Browser preview piano

The **MIDI → Output device** menu includes:

```text
Browser preview piano (built-in)
```

This is a lightweight Web Audio instrument built into PianoRules. It is not intended to replace a high-quality piano library or a Disklavier; it exists so that a casual user can hear the generated notes immediately.

This option is useful for:

- testing a ruleset on a laptop;
- teaching without configuring a DAW;
- checking generative behaviour before connecting a Disklavier;
- verifying that a trigger produces the expected pitches and rhythms.

The operating system's default General MIDI synthesizer is not consistently exposed to web pages as a MIDI destination, so PianoRules provides this browser-native preview instead.

---

<div id="setup"></div>

# 13. Using PianoRules with a Disklavier

There are two common connection arrangements.

<figure class="setup-diagram">
  <a href="https://docs.google.com/drawings/d/10dKmDZOXFOA87uljbhqiqpM8oFLAOZ4iyeYUn3Q3u3M/export/png" target="_blank" rel="noopener noreferrer">
    <img src="https://docs.google.com/drawings/d/10dKmDZOXFOA87uljbhqiqpM8oFLAOZ4iyeYUn3Q3u3M/export/png" alt="Cable diagram for connecting a computer to a Disklavier with a USB-MIDI interface." width="902" height="486" loading="lazy" />
  </a>
  <figcaption>USB-MIDI cable setup. Connect USB to your computer, MIDI OUT to the Disklavier’s MIDI IN, and MIDI IN to the Disklavier’s MIDI OUT. Click the diagram to view it at full size.</figcaption>
</figure>

## USB MIDI

If the Disklavier exposes MIDI over USB, connect it to the computer and open PianoRules.

In **MIDI setup**:

- **Input device:** choose the Disklavier/Yamaha MIDI input;
- **Output device:** choose the corresponding Disklavier/Yamaha MIDI output;
- **Input channel:** usually `All channels` is easiest while testing;
- **Output channel:** begin with channel `1` unless the instrument is configured differently.

The conceptual signal path is:

```text
pianist → Disklavier MIDI OUT → PianoRules → Disklavier MIDI IN → physical keys
```

## MIDI DIN through an interface

With a conventional MIDI interface:

```text
Disklavier MIDI OUT → interface MIDI IN
interface MIDI OUT → Disklavier MIDI IN
```

Then choose the interface's input and output ports in PianoRules.

## Feedback protection

When the same player piano both sends the performer's notes and receives generated notes, the mechanically reproduced notes may sometimes return to the computer as MIDI input. Leave **Ignore likely MIDI feedback from generated notes** enabled unless you deliberately want recursive behaviour.

The exact MIDI/Local Control settings differ between Disklavier generations, so if the physical piano does not respond, confirm on the instrument that incoming MIDI note messages are enabled and that the selected MIDI channel matches PianoRules.

Before using dense or very fast generative rules on a real player piano, begin at low density and moderate velocity. Mechanical instruments have physical repetition and dynamic limits that a software synthesizer does not.

---

# 14. Using PianoRules with Ableton Live or a piano library

PianoRules can send its generated MIDI into a DAW. This is useful for Pianoteq, Kontakt piano libraries, Ableton's instruments, or any other MIDI-controlled software instrument.

The required ingredient is a **virtual MIDI port** between the browser and Ableton.

## macOS: IAC Driver

1. Open **Audio MIDI Setup**.
2. Open **MIDI Studio**.
3. Open **IAC Driver**.
4. Enable **Device is online** and create a bus, for example `PianoRules`.
5. In PianoRules, choose that IAC bus as the **Output device**.
6. In Ableton Live, enable **Track** input for the IAC port in MIDI preferences.
7. Create a MIDI track.
8. Set **MIDI From** to the PianoRules/IAC port.
9. Set monitoring to **In** or arm the track.
10. Load the piano instrument or library you want to hear.

The route becomes:

```text
MIDI keyboard → PianoRules → IAC PianoRules → Ableton MIDI track → piano instrument
```

## Windows

Windows does not include an IAC-style virtual cable by default. A virtual MIDI-port utility such as **loopMIDI** can provide the same connection:

```text
PianoRules → virtual MIDI port → Ableton → piano library
```

Create a virtual port, choose it as PianoRules' output, then choose the same port as the MIDI input for the Ableton track.

## Original piano plus generated piano library

You can keep playing your physical keyboard locally while only the generated PianoRules output goes into Ableton. In that setup, your acoustic/electronic piano is the foreground and the virtual piano library becomes the responsive machine layer.

If you instead want both your own playing and the generated layer to sound from the same plugin, route the keyboard into Ableton as well, taking care to avoid MIDI loops.

---

# 15. Shared PianoRules file library

The **Files** button opens the shared Google Drive folder created for exchanging useful material.

It can contain:

- `.rules` studies;
- MIDI gestures;
- audio samples;
- prepared-piano samples;
- example materials for classes and workshops.

A useful workflow is:

1. download a shared file;
2. drop it into PianoRules if it is a local MIDI/audio asset;
3. refer to its filename in the rules;
4. alter the musical behaviour rather than rebuilding the material from scratch.

The GitHub `Library/` mechanism is particularly useful for rulesets that should open directly from a public URL, while the Drive folder remains convenient as a communal drop/share area.

---

# 16. Musical studies to try

The downloadable project also includes `examples/Harmonic-Machines-study.rules`, an original multi-section study that combines the techniques below into one playable form.


## Harmonic cloud

```text
when chord played notes 3..6 within 170ms:
  remember chord as harmony

while harmony exists every 65ms:
  play random note from harmony octave random -2..+2 velocity 12..32 for 45ms
```

The performer determines harmony; the machine creates a tremulous orchestration of it.

## Low ostinato + high cloud

```text
when chord played notes 3..6 within 170ms:
  remember chord as harmony

while harmony exists every 220ms:
  play next note from harmony pattern [1 3 2 4 3 2] range C1..C3 velocity 38 for 120ms

while harmony exists every 95ms:
  play random note from harmony range C5..C7 velocity 15..30 for 60ms
```

One harmonic gesture becomes two independent machine layers.

## Continuous harmonic morph

```text
when chord played notes 3..6 within 170ms:
  morph harmony to chord over 2.5s

while harmony exists every 70ms:
  play random note from harmony octave random -2..+2 velocity 14..34 for 50ms
```

The texture does not restart when harmony changes; its pitch reservoir gradually changes underneath it.

## Phrase shadow

```text
when phrase ends after 800ms:
  remember phrase as shadow
  play remembered shadow backwards transpose +12 velocity *0.4 timing *1.3
```

## Memory loop

```text
when phrase ends after 1s:
  remember phrase as loop1
  loop remembered loop1 every 5s velocity *0.45 timing * random 0.85..1.15
```

## Machine-controlled formal branching

```text
section Cloud:
  when note C7:
    go to section Canon

section Canon:
  when note C1:
    go to section Cloud
```

Replace the navigation notes with chords, dynamic thresholds, timed events, or other triggers to make the form itself performative.

---

# 17. Compact grammar reference

## Triggers

```text
when any note:
when any note velocity 80..127:
when note C4:
when note C4 velocity 80..127:
when chord [C4 E4 G4] within 180ms:
when chord played:
when chord played notes 3..6 within 170ms:
when phrase ends:
when phrase ends after 900ms:

while note C4 down:
while note C4 down every 180ms:
while any note down every 120ms:
while sequence answer playing every 220ms:
while harmony exists every 80ms:

after start 8s:
every 3s:
every random 2s..5s:
```

## Memory actions

```text
remember chord as harmony
replace harmony with chord
morph harmony to chord over 2s
clear harmony
remember last 8 notes as motif
remember phrase as melody
```

## Note actions

```text
play C5
play [C4 E4 G4]
play +7
play random [C4 D4 E4]
play C5 velocity 60
play +7 velocity input*0.5
play C5 after 300ms for 120ms
play +4 repeat 8 every 300ms accelerate 0.85
```

## Actions from memory

```text
play random note from harmony
play random note from harmony octave random -2..+2
play random note from harmony range C5..C7
play next note from harmony pattern [1 3 2 4]

play remembered melody
play remembered melody backwards
play remembered melody transpose +12
play remembered melody backwards transpose +12 velocity *0.5 timing *1.2
loop remembered melody every 4s
```

## Other actions

```text
play sequence answer
play midi "gesture.mid"
play sound "resonance.wav"
go to section Echoes
wait 300ms
stop all
```

---

# Credits

**PianoRules** was conceived and developed by [Adrián Artacho](https://muk.ac.at/studienangebot/lehrende/details/adrian-artacho.html), composer, researcher and educator at the **Music and Arts University of the City of Vienna (MUK)**.

The project explores browser-based, performer-readable rules for interactive piano performance, teaching, algorithmic composition and human–machine improvisation.
