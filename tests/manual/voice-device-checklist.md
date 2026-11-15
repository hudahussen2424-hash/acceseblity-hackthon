# Voice verification: real-device test record

**Status: NOT RUN.** No physical microphone, speech engine, browser/device combination, Amharic recognition engine, or Amharic speech voice has been tested and recorded here. Playwright browser API stubs verify code paths only; they are not evidence of real-device support.

## How to record a run

Copy the record below for every target device/browser combination the team wants to claim as tested. Use the actual installed browser and operating-system versions. If an engine or voice name is exposed by the browser, record it; do not infer it from the browser brand. Run on HTTPS or localhost so microphone APIs are eligible, and record whether permission was previously granted, prompted, denied, or unavailable.

For each learner answer, verify it remains readable in the chat as text. No recognition or synthesis should start until the learner activates its control. A recognized transcript must appear in the editable question field and must not be sent until the learner reviews it and presses **Send**.

## Device/browser run record (copy per combination)

- Tester:
- Co-designer name or consented identifier (if applicable):
- Consent to record results:
- Test date and time (include timezone):
- Device make/model:
- Operating system and version/build:
- Browser and version:
- Browser engine (if known):
- Screen reader and version (if used):
- Microphone model/accessory (if relevant):
- Page origin (HTTPS or localhost):
- UI language:
- Network conditions:
- Browser speech-recognition engine/locale (if exposed):
- Speech-synthesis voice name/locale (if exposed):

| Check | Result (Pass/Fail/Not offered/Not run) | Observations, exact status text, and limitations |
|---|---|---|
| Page load and answer text: all replies remain readable; no audio starts automatically on load, answer arrival, or language change | Not run |  |
| Microphone permission: prompt/granted/denied/unavailable behavior is understandable; Stop works | Not run |  |
| English recognition (`en-US`): words appear in the question field for review and are not sent automatically | Not run |  |
| Amharic recognition (`am-ET`), if offered; otherwise record “Not offered” | Not run |  |
| Tigrinya recognition (`ti-ET`), if offered; otherwise record “Not offered” | Not run |  |
| Afaan Oromo recognition (`om-ET`), if offered; otherwise record “Not offered” | Not run |  |
| Somali recognition (`so-SO`), if offered; otherwise record “Not offered” | Not run |  |
| Arabic recognition (`ar-SA`), if offered; otherwise record “Not offered” | Not run |  |
| English Listen (`en-US`): playback starts only after activation; record actual voice/clarity and keep text available | Not run |  |
| Amharic Listen (`am-ET`): playback starts only after activation; record actual voice and result | Not run |  |
| Tigrinya Listen (`ti-ET`): playback starts only after activation; record actual voice and result | Not run |  |
| Afaan Oromo Listen (`om-ET`): playback starts only after activation; record actual voice and result | Not run |  |
| Somali Listen (`so-SO`): playback starts only after activation; record actual voice and result | Not run |  |
| Arabic Listen (`ar-SA`): playback starts only after activation; record actual voice and result | Not run |  |
| Requested voice unavailable for any selected language: readable status appears and answer text remains available | Not run |  |
| Speech recognition unavailable or denied: limitation is readable and text entry/send remain usable | Not run |  |
| Speech synthesis unavailable or playback fails: limitation is readable and the answer remains available as text | Not run |  |
| Sound-off check: with device muted, complete the text task without relying on audio | Not run |  |

The tags in parentheses are the locale tags requested from browser APIs, not evidence that a browser/device offers recognition or a matching voice. Test and record all six languages on each target device/browser; mark unavailable combinations “Not offered” rather than passing them.

### Result and follow-up

- Main question/reply used:
- Did the tester review the recognized transcript before pressing Send?:
- Did any network request send the transcript before Send was activated?:
- Could the tester complete the task using text only?:
- Barriers, errors, or unexpected audio:
- Requested recognition/synthesis locale versus the engine/voice actually exposed:
- Follow-up fix/owner:
- Retest date and result:

Do not mark an unavailable locale as a successful language test. Record “Not offered” or “Unavailable” and the observed text fallback. Do not report support for untested combinations or claim physical-device verification from browser stubs.
