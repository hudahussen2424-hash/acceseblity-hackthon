# Accessibility gate: co-designer manual run

Use `https://` or `http://localhost` and test both the blank demo and a Savanna page. Open the chat before starting each chat-specific check. Mark each item **Pass** or **Fail** and note the browser, phone, screen reader, and viewport.

## Keyboard only

1. Reload. Use Tab until the launcher is focused; confirm its focus outline is easy to see and the target is at least 44 by 44 CSS pixels. Press Enter or Space.
2. Confirm focus moves to the chat heading. Press Tab through Close, Talk to a person, the accommodation action, language choices, question field, voice controls, and Send in that order. Do not use a mouse.
3. Confirm you can still Tab to and activate a page link while the non-modal chat is open. Press Escape from inside the chat and again after tabbing to a page control. Confirm the panel closes and focus returns to the launcher.
4. Submit an empty question. Confirm a worded error appears, the question field receives focus, and the field is marked invalid. Enter a question; confirm the error clears. Check Enter sends and Shift+Enter inserts a line break.
5. Open Talk to a person, enter an invalid phone number, and send. Confirm the field gets a visible error and focus, then correct it and submit.
6. Tab to each checkbox, microphone, Stop, Listen, audio player, and screen/page sharing control. Confirm each has a visible focus indicator and can be operated without dragging.

## TalkBack, eyes closed (Android Chrome over HTTPS)

1. Turn on TalkBack, close your eyes, reload, and navigate by swipe. Find and activate the assistant launcher by its spoken name.
2. Listen to the heading, labels, Talk to a person action, language controls, input, and Send button. Confirm focus does not jump when a new message arrives.
3. Ask a short question. Confirm TalkBack announces the added message politely and the answer is also readable as text. Find its source link and Listen control by swipe.
4. Change to Amharic. Confirm the language controls and new messages are announced in Amharic and the message direction follows its text.
5. Open the microphone only by activating its button. Confirm the visible Listening/recording state is announced, Stop works, and recognized text is not sent until Send is pressed. With sound off, confirm all spoken output remains available as text and nothing autoplays.
6. Open an accommodation request. Listen for the privacy statement and confirm it says the choice is for the tutor and is not shared with an employer.

## NVDA (Windows, Chrome or Firefox)

1. With NVDA running, open the blank demo and navigate to the launcher using Tab. Open the chat and confirm the heading is announced as a dialog heading.
2. Use Tab and Shift+Tab to check the full focus order, visible focus, and Escape/return-focus behavior. Confirm the page remains usable while the panel is open.
3. Ask a question and listen for one polite message announcement, then browse the message as text. Check its source link and Listen button.
4. Trigger the empty-question and invalid-phone errors. Confirm each error is spoken and associated with its field; correct the input and confirm invalid state clears.

## 200% zoom and 320 CSS px

1. At 200% browser zoom, open the chat. Repeat at a 320 CSS-pixel viewport (DevTools device emulation is acceptable).
2. Confirm the panel is a full-width bottom sheet, stays within 80vh, scrolls internally, and does not cover or prevent access to page controls.
3. Open both escalation forms and the screen/page assistance section. Confirm no labels, buttons, errors, or submit actions are clipped; use scroll instead of relying on hidden content.
4. Repeat with Amharic and Arabic (`lang="ar"`) and confirm RTL placement does not push controls off-screen.

## Sound off

1. Mute the device. Load the page and open the assistant. Confirm there is no automatic speech or audio playback.
2. Ask a question and use only the text transcript and links. Confirm every assistant message has a Listen button even though sound is muted.
3. If available, activate Listen and voice input explicitly; stop them. Confirm the transcript and visible status remain understandable with sound off.
