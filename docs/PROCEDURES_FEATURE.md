## Audit Procedures – Feature & Workflow Overview

This document explains how the **Audit Procedures** feature works in the Audit Portal: the concepts, user workflow, and the main pieces of frontend/backend logic that power it.

---

## 1. High–level concept

- **Goal**: guide auditors through planning, fieldwork, and completion procedures, using AI–assisted generation and structured checklists, then capture their responses and recommendations in a consistent format.
- **Three procedure “phases”**:
  - **Planning** – risk assessment, materiality, and planning procedures.
  - **Fieldwork (Procedures / “Field Work”)** – detailed audit questions and responses per classification.
  - **Completion** – wrap‑up procedures and final recommendations.
- **Two core modes**:
  - **Generate** – wizard/stepper experience that uses AI + configuration to build procedures.
  - **View** – a structured, editable view for executing and maintaining the procedures that were generated.

In the UI, all of this is surfaced through the `Procedures` tab on the engagement (see `EngagementDetails.tsx` → `ProceduresTab`).

---

## 2. Main frontend building blocks

- **Entry point**
  - `components/procedures/ProceduresTab.tsx`
    - Hosts the “Audit Procedures” area inside an engagement.
    - Integrates with the URL query string for deep‑linking and history (browser back/forward).
    - Coordinates which phase (planning / fieldwork / completion) and which sub‑tab (generate / view) is active.

- **Generation flows**
  - `components/procedures/ProcedureGeneration.tsx` – fieldwork (core procedures) generation wizard.
  - `components/procedures/PlanningProcedureGeneration.tsx` – planning generation wizard.
  - `components/procedures/CompletionProcedureGeneration.tsx` – completion generation wizard.
  - `components/procedures/steps/*` – shared step components used by the generators, including:
    - AI question/answer steps (`AIPlanningQuestionsStep`, `AIPlanningAnswersStep`, etc.).
    - Hybrid/manual steps (`HybridPlanningProceduresStep`, `HybridCompletionProceduresStep`, etc.).
    - Classification/materiality/recommendation steps (`ClassificationStep`, `MaterialityStep`, `RecommendationsStep`, etc.).

- **View/execution flows**
  - `components/procedures/ProcedureView.tsx` – **Fieldwork** execution view:
    - Shows questions & answers grouped by classification.
    - Allows editing questions/answers, tracking validity, and exporting an audit‑ready PDF.
    - Integrates classification‑scoped recommendations via a floating notes UI.
  - `components/procedures/PlanningProcedureView.tsx` – **Planning** execution view:
    - Renders a dynamic, form‑style “procedures” structure with question types (text, number, select, multiselect, table, group, etc.).
    - Applies `visibleIf` rules to hide/show questions based on other answers.
    - Supports editing, adding/removing questions, attaching files, and persisting everything back to the API.
  - `components/procedures/CompletionProcedureView.tsx` – **Completion** execution view (similar in spirit to `ProcedureView`).

- **Shared UX**
  - `FloatingNotesButton.tsx` + `NotebookInterface.tsx`
    - Provide a floating “Notes / Recommendations” entry point which opens a notebook for the current classification/phase.
    - In Planning, the notebook manipulates an array of checklist‑style recommendation items.
    - In Fieldwork, the notebook is tied to classification‑specific recommendations derived from or written back to the procedure object.

---

## 3. URL‑driven navigation model

`ProceduresTab` relies heavily on the engagement route’s query string to represent where the user is in the procedures flow. The key parameters are:

- **`section`** – outer engagement tab (e.g. `procedures`).
- **`procedureTab`** – `"generate"` or `"view"`.
- **`procedureType`** – `"planning" | "fieldwork" | "completion"`.
- **`mode`** – depends on the generator (e.g. `"ai"`, `"hybrid"`, `"manual"` – see generation components).
- **`step`** – the current wizard step index within a generation flow.

`ProceduresTab` exposes a helper:

```ts
updateProcedureParams(updates, replace?)
```

which:

- Merges updates into the existing `URLSearchParams`.
- Calls `setSearchParams(...)`, optionally with `{ replace: true }` to avoid creating a new history entry.

This design has two main benefits:

1. **Deep linking** – a URL can represent “Engagement X → Procedures → planning → generate → step 3”.
2. **Browser navigation** – back/forward navigates logically between wizard steps and views without extra state management.

---

## 4. Data model & backend interaction (high level)

> Note: precise backend models live in the backend repo, but the frontend expects the following shapes.

### 4.1. Common fields

Each procedure object (planning/fieldwork/completion) includes fields like:

- `engagement` – engagement id.
- `procedureType` – `"planning" | "fieldwork" | "completion" | "procedures"`.
- `mode` – generation mode (`"ai"`, `"manual"`, `"hybrid"`).
- `status` – `"draft" | "in-progress" | "completed"`.
- `materiality` – numeric materiality amount (fieldwork/planning).
- `questions` – for fieldwork: list of Q/A objects per classification.
- `procedures` – for planning: list of “sections”, each with `fields`.
- `recommendations` – array of checklist items (new model) or legacy markdown/string (legacy model).

### 4.2. Planning data structure

In `PlanningProcedureView`:

- `procedure.procedures` is an array of **sections**, each with:
  - `title`, `standards`, `currency`, etc.
  - `fields`: a list of **questions**/inputs.
    - Each field has:
      - `key` – internal key (used to build an answers map).
      - `label` – human‑readable label.
      - `type` – question type (text, textarea, checkbox, number, currency, select, multiselect, table, group, etc.).
      - `options` – for select/multiselect.
      - `columns` – for table.
      - `visibleIf` – conditional visibility rules based on other answers.
      - `answer` – current answer value (type varies with `type`).

The view:

- Derives `answersMap` per section from `fields[key].answer`.
- Uses `isFieldVisible(field, answersMap)` to compute whether a field should be shown.
- Normalizes types via `normalizeType` so `textfield`/`selection` map to core types.

### 4.3. Fieldwork data structure

In `ProcedureView`:

- `procedure.questions` is a flat array of objects:
  - `id`
  - `question`
  - `answer`
  - `classification`
  - `framework`, `reference`, `isValid`, etc.

The view:

- Filters questions by `currentClassification`.
- Groups them by `classification` key for display.
- Allows edit/add/delete, with local state (`localQuestions`) and a single `handleSaveAllChanges` to persist everything.

### 4.4. Recommendations model

Across planning and fieldwork, the **new** recommendations model is:

- An array of **checklist items**:

```ts
interface ChecklistItem {
  id: string
  text: string
  checked: boolean
  classification?: string   // fieldwork: which classification
  section?: string          // planning: which section/group
}
```

`ProcedureView` additionally supports a **legacy** string/markdown representation and converts it on the fly to checklist items. Helpers like `splitRecommendationsByClassification` and `normalizeKey` map legacy headings to classifications.

---

## 5. User workflows

### 5.1. Generating procedures

1. **Navigate** to an engagement → `Procedures` tab (`EngagementDetails.tsx` + `ProceduresTab`).
2. In **Generate Procedures**:
   - Choose `Planning`, `Field Work`, or `Completion` via `ProcedureTypeSelection`.
   - The chosen type sets `procedureType` and loads the appropriate generator:
     - Planning → `PlanningProcedureGeneration`.
     - Fieldwork → `ProcedureGeneration`.
     - Completion → `CompletionProcedureGeneration`.
3. The generator presents a **wizard** of steps (`components/procedures/steps/*`), which may include:
   - Capturing trial balance / materiality / risk details.
   - Selecting classifications and areas.
   - Running AI prompts to generate questions and recommended procedures.
   - Reviewing and confirming generated content.
4. On final step:
   - Generator calls `onComplete(procedureData)` back to `ProceduresTab`.
   - `ProceduresTab` updates the corresponding state (`planningProcedure`, `fieldworkProcedure`, etc.).
   - It flips `procedureTab` to `"view"` and resets any `mode`/`step` URL parameters.

Result: the procedures for the chosen phase are now stored (via the backend) and visible in the **View** tab.

### 5.2. Viewing & executing procedures – Planning

1. In **View Procedures**, select `Planning` as the procedure type.
2. `PlanningProcedureView` loads the planning procedure object and:
   - Shows a status badge (`draft / in‑progress / completed`).
   - Renders each section and its fields, respecting `visibleIf`.
   - In **view mode**:
     - Answers are read‑only but nicely formatted (including tables and grouped selections).
   - In **edit mode**:
     - You can change keys, labels, types, help text, and required flags.
     - You can modify answers, options, table data, and even add/remove questions.
3. Click **Save** or **Save & Complete**:
   - The component:
     - Normalizes `procedures` to a backend‑friendly structure (removing UI‑only `__uid` keys).
     - Ensures `recommendations` is an array.
     - Sends a `POST` to `/api/planning-procedures/:engagementId/save` using `authFetch`.
   - On success:
     - Local state is updated from the response.
     - Status may become `completed` when requested.
4. **Notebook / recommendations**:
   - The floating notes button opens `NotebookInterface` scoped to planning.
   - `onSave` from the notebook writes back an array of recommendation checklist items and triggers the same save logic as above.

### 5.3. Viewing & executing procedures – Fieldwork

1. In **View Procedures**, select `Field Work`.
2. `ProcedureView` receives the fieldwork `procedure` and optional `currentClassification` (when integrated with classification views).
3. The UI shows:
   - Header with engagement name, mode, materiality, year‑end, and optional classification.
   - A `Card` listing classification groups, each containing ordered questions.
   - For each question:
     - Normal view mode (markdown rendering of answers, framework/reference badges).
     - Inline edit mode with inputs for question text and answer.
4. When you click **Save Changes**:
   - The component builds a payload `{ ...procedure, status: "completed", questions, recommendations }`.
   - It chooses the endpoint:
     - `/api/procedures/:engagementId` for full‑procedure saves.
     - `/api/procedures/:engagementId/section` when saving a specific classification section (if `currentClassification` is set).
   - It then:
     - Calls `authFetch`, handles success/error toasts.
     - Re‑fetches the updated procedure from the backend and passes it to `onProcedureUpdate`, so parent components stay in sync.
5. **Recommendations & notebook**:
   - The floating notes button opens `NotebookInterface` for the current classification only.
   - Notebook edits are converted to checklist items and merged into the `procedure.recommendations` array for the current classification when saving.
   - PDF export uses the filtered questions + recommendations to build a multi‑page, branded PDF for a single classification.

### 5.4. Completion procedures

Completion procedures follow a similar pattern to fieldwork:

- Generation wizard → `CompletionProcedureGeneration`.
- View/execution → `CompletionProcedureView`.
- Status & recommendations are managed similarly; the main difference is the content/phrasing of the prompts and sections.

---

## 6. Key extension points

If you need to extend or customize the procedures feature, these are the primary hooks:

- **Add new question types (Planning)**
  - Update `normalizeType` and the `switch` in `PlanningProcedureView`’s answer renderer/editor to handle the new type.
  - Ensure `TableEditor`/`MultiSelectEditor` patterns are followed for complex types.

- **Add additional phases**
  - Extend `ProceduresTab`’s `procedureType` handling.
  - Add new generator and view components modeled after the existing ones.
  - Wire up new backend endpoints for loading/saving.

- **Change recommendation behavior**
  - Recommendation arrays are used uniformly as `ChecklistItem[]`.
  - To add fields (e.g. priority, owner, due date), extend the interface and update:
    - `NotebookInterface` props and renderers.
    - Conversion logic in `ProcedureView` and `PlanningProcedureView` (`handleSaveRecommendations`, legacy conversion, PDF export).

- **Integrate with other modules**
  - `ProcedureView` already accepts `currentClassification` and `onProcedureUpdate`, which allows tight integration with classification drill‑downs.
  - Similar hooks can be added for linking procedures to KYC, PBC, or other engagement modules.

---

## 7. Summary

The Procedures feature provides:

- A **URL‑driven, phase‑aware wizard** for generating audit procedures.
- Rich **planning and fieldwork execution UIs**, including conditional questions and per‑classification filtering.
- A unified **recommendations** model and notebook experience.
- Clean **persistence contracts** via Supabase‑authenticated API calls.

Use this document as a starting point when:

- Onboarding new developers to the procedures system.
- Adding new question types or phases.
- Integrating procedures with other audit modules or external reporting.


