# WCAG 2.2 AA self-assessment

This is a code-based self-assessment, not an independent accessibility audit or a claim of full WCAG conformance. “Supports” describes the feature as implemented in the repository; the whole product still needs manual testing with the target browsers, devices, and assistive technologies.

| Criterion | Supports / Partly / Does not | Notes |
|---|---|---|
| 1.1.1 Non-text Content | Partly | The helper gives a learner-uploaded screenshot an alt text, and controls have text labels. There has not been a complete audit of every image or other non-text item in all pages. |
| 1.2.1 Audio-only and Video-only (Prerecorded) | Partly | A tutor can play a learner's recorded voice note, but the code does not provide a transcript for that note. |
| 1.2.2 Captions (Prerecorded) | Supports | The repository contains no prerecorded synchronized audio/video program requiring captions. Tutor voice notes are audio-only. |
| 1.2.3 Audio Description or Media Alternative (Prerecorded) | Supports | The repository contains no prerecorded video that needs audio description or a media alternative. |
| 1.2.4 Captions (Live) | Supports | The desktop screen-sharing stream sends video only (`audio: false`); the current feature has no live audio to caption. |
| 1.2.5 Audio Description (Prerecorded) | Supports | The repository contains no prerecorded video requiring audio description. |
| 1.3.1 Info and Relationships | Partly | Pages use headings, landmarks, labels, lists, and status regions, but relationships and reading order have not been audited across all content and generated states. |
| 1.4.3 Contrast (Minimum) | Partly | The CSS defines foreground/background colors and visible focus styles, but all text, links, states, and themes have not been measured against contrast thresholds. |
| 1.4.4 Resize Text | Partly | The layouts use responsive CSS and relative units in places, but the full interface has not been verified at 200% text resize without loss. |
| 1.4.10 Reflow | Partly | The widget and helper use responsive layouts, but every page and state has not been checked at 320 CSS pixels or high zoom. |
| 1.4.11 Non-text Contrast | Partly | Controls have borders and focus outlines in CSS; the contrast of every control boundary, icon, and state has not been measured. |
| 2.1.1 Keyboard | Partly | The widget uses native buttons and form controls and includes keyboard handling. Keyboard-only operation of every flow, including browser capture and voice prompts, still needs testing. |
| 2.1.2 No Keyboard Trap | Partly | The widget closes with Escape and returns focus to its launcher. The full page and all browser/helper states have not had a keyboard trap audit. |
| 2.4.3 Focus Order | Partly | The markup follows a mostly logical DOM order and the widget moves focus when it opens and closes. Complete flow-by-flow testing is outstanding. |
| 2.4.7 Focus Visible | Partly | The pages and widget define `:focus-visible` outlines. Confirm visibility in all themes, forced-colors mode, and embedded host pages. |
| 2.5.7 Dragging Movements | Supports | No app task requires a dragging movement; screen-source selection is delegated to the browser's native picker. |
| 2.5.8 Target Size (Minimum) | Partly | Many buttons have a 44-pixel minimum height, but every link, control, and spacing exception has not been measured. |
| 3.1.1 Language of Page | Partly | Demo pages declare a document language and the widget sets its language from the selected pack. The full set of pages and locale variants has not been checked. |
| 3.1.2 Language of Parts | Partly | Chat messages and translated controls set language attributes, but mixed-language course content and every generated message have not been audited. |
| 3.3.1 Error Identification | Partly | Several form errors are shown in alert/status regions and the question input receives `aria-invalid`; not every server-side error is tied to a specific field. |
| 3.3.2 Labels or Instructions | Partly | Most inputs have associated labels and the screen-sharing flows include consent text. Instructions and labels still need a full review in every language and state. |
| 4.1.2 Name, Role, Value | Partly | The widget and helper use native controls, labels, and explicit roles for status regions. Assistive-technology output and all custom-element states have not been manually verified. |
| 4.1.3 Status Messages | Partly | The widget and helper use `role="status"`/`aria-live` for updates, but announcement timing and completeness need testing with screen readers. |

Who tested, on which device and screen reader, and what they could not do: [TESTER NAME] tested on [DEVICE, OPERATING SYSTEM, BROWSER] with [SCREEN READER AND VERSION]; they could not [UNTESTED TASKS OR BARRIERS].
