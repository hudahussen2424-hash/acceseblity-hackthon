# Track 3 Translation Review Inventory

This inventory identifies language coverage and fallback behavior for fluent-speaker review. It is not a translation-quality approval. Do not mark a language complete until a fluent speaker has reviewed the learner-facing text and recorded their review below.

## Coverage inventory

| Language | Widget strings (`module/i18n`) | Course content (`demo/data/content.json`) | Job content (`demo/data/jobs.json`) | API answer/refusal | Backend voice guide | Review status |
|---|---:|---:|---:|---:|---:|---|
| English (`en`) | 127/127 | 5/5 | 8/8 base listings | 2/2 | 5/5 steps | Needs review |
| Amharic (`am`) | 127/127 | 5/5 | 0/8 translated; job title/details are English | 2/2 | 5/5 steps | Needs review |
| Tigrinya (`ti`) | 127/127 | 5/5 | 8/8 translated | 2/2 | 5/5 steps | Needs fluent-speaker review |
| Afaan Oromo (`om`) | 127/127 | 5/5 | 8/8 translated | 2/2 | 5/5 steps | Needs fluent-speaker review |
| Somali (`so`) | 127/127 | 5/5 | 8/8 translated | 2/2 | 5/5 steps | Needs fluent-speaker review |
| Arabic (`ar`) | 44/127; 83 widget strings fall back to English | 0/5 translated; answers can fall back to English | 0/8 translated; content falls back to English | 2/2 | 5/5 steps | Incomplete; translation needed and reviewed |

Counts were read from the checked-in locale, course, and job data on 2026-11-16. They measure field coverage only; they do not establish translation accuracy, reading level, screen-reader pronunciation, or cultural suitability.

## Fallback and review notes

- The widget merges missing locale strings with English. Arabic therefore has 83 English fallbacks, including control labels, help, error, tutor, accommodation, and screen-sharing text.
- Course content has five localized sections for English, Amharic, Tigrinya, Afaan Oromo, and Somali. It has no Arabic course text; search can use English text for Arabic questions, so those answers must not be described as Arabic course translations.
- The jobs file has English base text and translated title/details for Tigrinya, Afaan Oromo, and Somali. Job titles and details are not translated for Amharic or Arabic and can appear in English.
- The API localizes the not-found answer and medical/legal/immigration refusal in all six languages. General API validation/error messages and the helper page are not fully localized and need separate review if those flows are claimed as multilingual.
- The backend voice guide has five steps for all six languages. The installed speech voices/models are device and operator dependent; text coverage does not prove speech support.

## Fluent-speaker sign-off

For each language, review the widget controls and errors, course answers and source labels, job titles/details, API responses, tutor messages, voice instructions, and right-to-left or screen-reader behavior where applicable.

| Language | Fluent reviewer (consented name/identifier) | Review date | Areas reviewed | Corrections applied | Approved for claim? |
|---|---|---|---|---|---|
| English |  |  |  |  |  |
| Amharic |  |  |  |  |  |
| Tigrinya |  |  |  |  |  |
| Afaan Oromo |  |  |  |  |  |
| Somali |  |  |  |  |  |
| Arabic |  |  |  |  |  |
