# Policy Desk: Complete Code and Interview Guide

This guide explains the repository as a complete system. Use it to understand the code, practise explaining engineering decisions, and prepare for likely React, TypeScript, JavaScript, API, testing, accessibility, security, and performance questions.

Do not memorize every sentence. Learn the flow, explain it in your own words, and verify answers by opening the referenced source file.

## 1. What the application does

Policy Desk is a small insurance-domain proof of concept with two user journeys:

1. **Create submission and review quote**
   - Enter a fictional customer name.
   - Select Health, Motor, or Home insurance.
   - Select a coverage amount.
   - Submit the form to a local Node API.
   - Receive and display a server-calculated fictional annual premium.
   - Edit the same submission or start a new one.

2. **Review policy portfolio**
   - Load six fictional policies from the API.
   - Search by customer name.
   - Filter by status and product.
   - Reset all filters.
   - Select a policy and review its details in a side panel.

This application demonstrates an end-to-end request flow. It does not issue policies, save submissions, authenticate users, or apply real insurance pricing.

## 2. Technology stack

| Technology | Purpose in this repository |
| --- | --- |
| React 19 | Component rendering, state, effects, event handling and conditional UI |
| TypeScript | Compile-time types for frontend data, state and function contracts |
| Vite | Development server, React build tooling and `/api` proxy |
| Node HTTP module | Small local API without an additional server framework |
| Vitest | Frontend unit and component test runner |
| React Testing Library | Tests user-visible React behavior through accessible queries |
| Playwright | End-to-end browser journeys at desktop and mobile viewport sizes |
| Node test runner | API tests against a real temporary HTTP server |
| ESLint | JavaScript/TypeScript checks and React Hooks rules |
| CSS Grid and Flexbox | Responsive form, navigation, policy list and detail layouts |
| GitHub Actions | Intended automated lint, test, build and browser-test workflow |

### Why these choices are reasonable

- The UI is small, so local component state is sufficient.
- The server has two routes, so native Node keeps the backend small.
- Vite gives fast development startup and a production frontend build.
- The tests are divided by responsibility rather than relying on only one test type.
- There is no current need for Redux, Zustand, React Router or TanStack Query.

Adding a library should solve a real problem. A larger application with shared client state could justify Zustand or Redux. Frequently reused server data with caching, background refetching and mutation invalidation could justify TanStack Query. Multiple deep-linkable pages could justify React Router.

## 3. Repository map

```text
insurance-policy-quote-workbench/
├── .github/workflows/ci.yml       Automated repository checks
├── docs/screenshots/              README UI previews
├── e2e/workspace.spec.ts          Full browser journeys
├── public/policies.json           Six fictional policy records
├── scripts/dev.mjs                Starts frontend and API together
├── server/
│   ├── app.mjs                    HTTP routing and JSON handling
│   ├── quotes.mjs                 Validation and premium calculation
│   ├── start.mjs                  Starts only the API
│   └── app.test.mjs               HTTP API tests
├── src/
│   ├── App.tsx                    Top-level workspace navigation
│   ├── PolicyList.tsx             Policy request, filters and detail panel
│   ├── QuoteSubmission.tsx        Submission form and quote states
│   ├── quoteApi.ts                Frontend quote API boundary
│   ├── *.test.tsx / api.test.ts   Component and API-client tests
│   ├── styles.css                 Policy and shared styles
│   ├── workspace.css              Header, form and quotation styles
│   └── main.tsx                   React entry point
├── eslint.config.mjs              Lint rules
├── playwright.config.ts           Browser-test configuration
├── vite.config.ts                 Vite, proxy and Vitest configuration
└── tsconfig.json                  TypeScript compiler configuration
```

## 4. Application architecture

### Quotation flow

```text
User enters form values
        ↓
Controlled React inputs update form state
        ↓
Submit handler performs client validation
        ↓
POST /api/quotes with JSON request body
        ↓
Vite development proxy forwards /api to Node on port 3001
        ↓
Server checks content type, body size, JSON and business fields
        ↓
Server calculates the fictional premium
        ↓
Server returns 201 Created with JSON
        ↓
Frontend validates the response at runtime
        ↓
React stores success state and renders the quote summary
```

### Policy flow

```text
PolicyList mounts
        ↓
useEffect creates AbortController and calls fetchPolicies
        ↓
GET /api/policies
        ↓
Server reads fictional policies.json and returns JSON
        ↓
Frontend checks HTTP status and validates every policy
        ↓
Request state becomes success with Policy[]
        ↓
Search, status and product values derive filtered records
        ↓
React maps matching policies to list items
        ↓
selectedId derives the policy shown in the detail panel
```

## 5. Application entry point

Open `src/main.tsx`.

```tsx
createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
);
```

### `createRoot`

`createRoot` attaches the React component tree to `<div id="root">` in `index.html`.

The `!` after `getElementById('root')` is a TypeScript non-null assertion. It tells TypeScript that the element exists. It does not create the element or perform a runtime check. This is safe only because `index.html` contains that element.

### `StrictMode`

Strict Mode enables extra development checks. React may perform an additional setup and cleanup cycle for effects in development to expose missing cleanup logic. That helps verify that request cancellation is correct.

Strict Mode does not cause every effect to run twice in the production build.

### Likely question

**Why might I see two requests during local development?**

Strict Mode can remount or repeat effect setup and cleanup in development. A correctly written effect should tolerate that by cleaning up its request. Production behavior is different.

## 6. Top-level component and navigation

Open `src/App.tsx`.

```tsx
const [view, setView] = useState<'submission' | 'policies'>('submission');
```

The union type permits only two valid view names. A misspelling such as `'policy'` becomes a compile-time error.

### Why the submission uses `hidden`

```tsx
<div hidden={view !== 'submission'}><QuoteSubmission /></div>
{view === 'policies' && <PolicyList />}
```

`QuoteSubmission` remains mounted when the policy view is selected. Its local form and quote state therefore survive navigation between the two workspace tabs.

`PolicyList` mounts only when the policy view is active. Returning to it creates a new component instance and reloads policies.

This is an intentional behavior choice, not a universal React rule.

### Trade-offs

Keeping the form mounted preserves its state but also keeps its component, DOM and any pending request alive. For a larger application, routes or lifted state might express navigation more clearly.

The app uses buttons with `aria-pressed` rather than links because the view is local UI state and has no URL. A production application that requires deep links, browser Back/Forward support or refreshable pages should use routing.

### Accessibility details

- The skip link lets keyboard users jump to the main content.
- `<nav aria-label="Workspace">` gives the navigation an accessible name.
- `aria-pressed` communicates which view button is active.
- The decorative brand mark is hidden from assistive technology.

## 7. TypeScript model design

### Policy status union

```ts
export type PolicyStatus = 'Active' | 'Pending' | 'Expired';
```

This is narrower than `string`. It documents valid status values and prevents unrelated strings in typed code.

### Policy type

```ts
export type Policy = {
  id: string;
  customerName: string;
  premium: number;
  status: PolicyStatus;
  product?: string;
  renewalDate?: string;
};
```

`product?` and `renewalDate?` are optional. The UI handles missing values with nullish coalescing:

```tsx
policy.product ?? 'Insurance'
```

`??` uses the fallback for `null` or `undefined`. Unlike `||`, it would preserve valid falsy values such as an empty string or zero.

### Function type

```ts
export type PolicyLoader = (signal: AbortSignal) => Promise<Policy[]>;
```

This states that a loader receives a cancellation signal and asynchronously resolves to policies. The component accepts this function as a prop, allowing tests to replace the real network loader.

This is dependency injection through a function prop.

### Quote types

`src/quoteApi.ts` defines:

- `Product`: the allowed quotation categories.
- `Submission`: fields sent to the server.
- `Quote`: submission fields plus the calculated response fields.
- `FieldErrors`: an optional error for each submission field.
- `QuoteLoader`: the asynchronous quotation function contract.

```ts
export type FieldErrors = Partial<Record<keyof Submission, string>>;
```

Breakdown:

- `keyof Submission` produces `customerName | product | coverageAmount`.
- `Record<..., string>` creates a string error for every field.
- `Partial` makes each error optional because valid fields have no error.

## 8. TypeScript does not validate API responses

This is one of the most important concepts in the project.

TypeScript checks code during development. Its types are erased when JavaScript runs. A server can still return malformed data.

Unsafe assertion:

```ts
const policies = await response.json() as Policy[];
```

That only tells the compiler to trust the developer. It does not inspect the response.

The application instead starts with `unknown`:

```ts
const value: unknown = await response.json();
```

`unknown` forces validation before property access.

### Policy type guard

```ts
function isPolicy(value: unknown): value is Policy
```

The function checks:

- value is a non-null object;
- ID and customer name are strings;
- premium is a finite number;
- optional fields are absent or strings;
- status is one of the three allowed literals.

The `value is Policy` return type is a type predicate. When it returns `true`, TypeScript narrows that value to `Policy`.

```ts
if (!Array.isArray(value) || !value.every(isPolicy)) {
  throw new Error('Unexpected policy response');
}
```

JavaScript short-circuiting matters here. If `value` is not an array, the right side of `||` is not evaluated, so `.every()` is never called on an invalid value.

### Quote runtime validation

`isQuote` applies the same boundary rule to the quote response. It checks strings, numbers, product membership and the INR currency literal.

### Current validation limitations

The guards validate basic structure but do not guarantee:

- unique policy IDs;
- non-empty customer names for every policy;
- realistic positive premiums in the policy list;
- valid renewal date formats;
- correspondence between requested values and response values;
- a valid UUID structure after the `Q-` prefix.

A production system could use a schema library or generated OpenAPI types plus runtime validation.

## 9. Request state as a discriminated union

`PolicyList` represents the request with:

```ts
type RequestState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'success'; policies: Policy[] };
```

`QuoteSubmission` uses a similar `QuoteState`:

```ts
type QuoteState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'error'; message: string }
  | { kind: 'success'; quote: Quote };
```

The `kind` property is the discriminant.

### Why this is preferable to several booleans

Separate values such as `isLoading`, `isError`, `data` and `error` can accidentally describe impossible states:

```text
isLoading = true
isError = true
data = old data
```

A union lists only allowed combinations. When code checks `request.kind === 'success'`, TypeScript knows `request.policies` exists.

### Early returns

```tsx
if (request.kind === 'loading') return ...;
if (request.kind === 'error') return ...;
```

After these returns, the remaining code is narrowed to the success state.

### State transition examples

Policy request:

```text
loading → success
loading → error
error → retry → loading → success/error
```

Quote submission:

```text
idle → submitting → success
idle → validation error
submitting → server/network error
error → input change → idle
success → edit/new → idle
```

## 10. Effects and request cancellation

### Loading policies

The policy request belongs in an effect because loading should happen when `PolicyList` mounts and when retry state changes.

```ts
useEffect(() => {
  const controller = new AbortController();
  let active = true;
  setRequest({ kind: 'loading' });

  loadPolicies(controller.signal).then(...);

  return () => {
    active = false;
    controller.abort();
  };
}, [loadPolicies, attempt]);
```

### Dependency array

- `loadPolicies`: rerun if the loader prop changes.
- `attempt`: rerun when Retry increments the counter.

Search, status and product are absent because client filtering should not cause another API request.

### Functional update

```ts
setAttempt(n => n + 1)
```

The next value is derived from the previous value. The functional form avoids relying on a possibly stale captured value.

### Why both `AbortController` and `active` exist

`AbortController` requests cancellation from `fetch`. A custom loader used in tests or future code might ignore the signal. The `active` flag prevents that stale promise from updating an unmounted or superseded component.

### What cancellation does not mean

Cancelling the browser request does not roll back server work that has already completed. Cancellation is not a database transaction.

## 11. Why quotation happens in an event handler

The POST request happens inside the form submit handler because it is caused by a user action.

```ts
async function submit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  // validate and send
}
```

It should not be placed in an effect watching form state. That could submit during rendering-related state changes and make the trigger difficult to control.

General rule:

- Use effects to synchronize with external systems because a component is displayed or a dependency changed.
- Use event handlers for work directly caused by a click, submit or input event.

## 12. Controlled form inputs

The form object is React state:

```ts
const [form, setForm] = useState(emptyForm);
```

Each control receives its current value and an `onChange` handler:

```tsx
<input
  value={form.customerName}
  onChange={event => change('customerName', event.currentTarget.value)}
/>
```

React state is the source of truth. This is a controlled input.

### Immutable object update

```ts
setForm(current => ({ ...current, [field]: value }));
```

- `...current` copies existing fields.
- `[field]` is a computed property name.
- the selected field overwrites its previous value.
- a new object reference tells React that state changed.

Directly mutating `form.customerName` would not follow React's state update model.

### Select values are strings

DOM select values are strings, including coverage amounts. Before sending the request:

```ts
const coverageAmount = Number(form.coverageAmount);
```

The allowed-number check rejects values outside the three supported coverage amounts.

### Client validation

The client validates:

- trimmed name length from 2 to 80;
- product is Health, Motor or Home;
- coverage is one of the allowed numeric values.

This gives immediate feedback and avoids unnecessary requests.

### Why the server validates again

Clients cannot be trusted as an authority. A caller can bypass React using DevTools, curl, Postman or another client. The server therefore repeats validation before calculating the premium.

## 13. State versus refs

State causes a render when it changes. A ref preserves a mutable value across renders without causing a render.

### State in the form

- `form`: visible control values.
- `errors`: visible validation messages.
- `state`: visible request and quote state.

### Refs in the form

- `request`: current AbortController.
- `resultHeading`: success-heading DOM element.
- `errorSummary`: error-summary DOM element.
- `nameInput`: first form field.
- `returnToForm`: whether focus should return after editing/resetting.

### Why the controller is a ref

The UI does not need to render the controller. The handler needs the same controller value across renders to prevent duplicate submissions and abort it during cleanup.

### Duplicate submission defense

There are two protections:

1. The fieldset and button become disabled during the submitting state.
2. `if (request.current) return` blocks a second call before React has rendered the disabled state.

This prevents repeated clicks within the current UI. It is not server-level idempotency. Retrying can create another quote reference.

## 14. Focus management and accessibility

Accessibility is part of behavior, not only styling.

### Form semantics

- Every input has a visible `<label>` connected by `htmlFor` and `id`.
- Required controls are grouped in a `<fieldset>` with a legend.
- `aria-invalid` marks invalid controls.
- `aria-describedby` connects controls with their error or help text.
- The error summary uses `role="alert"`.
- Error-summary links move focus directly to the corresponding field.
- The pending message uses `role="status"`.
- `aria-busy` communicates that the form is processing.

### Focus after state changes

- Validation/server error focuses the error summary.
- Successful quote focuses the quote-summary heading.
- Edit and New submission return focus to the customer-name field.
- On mobile, opening policy details focuses the stacked detail heading.
- Closing details restores focus to the Details button that opened them.

`tabIndex={-1}` makes a heading programmatically focusable without adding it to normal Tab order.

### Policy semantics

- Policies use a semantic unordered list.
- Policy attributes use a description list (`dl`, `dt`, `dd`).
- The result count uses a polite live region.
- Details buttons have customer-specific accessible names.
- `aria-controls` connects a Details button to the panel.
- `aria-pressed` communicates the selected row.
- The detail content is announced as one atomic update.

### Remaining accessibility work

- Run a formal automated accessibility scan.
- Test with screen readers such as NVDA and VoiceOver.
- Verify color contrast with tooling rather than visual judgment alone.
- Test zoom, Windows High Contrast Mode and reduced motion preferences.
- Consider whether every filter change should clear details or preserve a still-visible selection.

## 15. Quote API client

Open `src/quoteApi.ts`.

```ts
const response = await fetch('/api/quotes', {
  method: 'POST',
  signal,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(submission),
});
```

### Important fetch behavior

`fetch` rejects for network-level failures and cancellation. It normally does not reject merely because the server returned HTTP 400, 422 or 500. The application must inspect `response.ok` or `response.status`.

### Serialization

`JSON.stringify` converts the typed JavaScript object to JSON text for the HTTP body. The content-type header tells the server how to interpret it.

### Error handling

For an unsuccessful response, the client tries to parse JSON. If parsing fails, `.catch(() => null)` provides a safe fallback.

Only recognized field names with string values are copied into `FieldErrors`. This avoids trusting arbitrary error objects from the server.

### Custom error class

```ts
export class QuoteApiError extends Error {
  constructor(message: string, public fieldErrors: FieldErrors = {}) {
    super(message);
  }
}
```

The error carries both a general message and structured field errors. `instanceof QuoteApiError` allows the component to handle expected API errors differently from unexpected errors.

### Current limitation

Only status 422 receives the specific “check highlighted fields” message. Other statuses are grouped into a general retry message. A larger application could map authentication, authorization, conflict, rate-limit and server errors separately.

## 16. Vite proxy and local development

`vite.config.ts` includes:

```ts
proxy: { '/api': 'http://127.0.0.1:3001' }
```

The browser requests `/api/quotes` from the frontend origin. During development, Vite forwards that request to the Node API.

Benefits:

- frontend code uses a relative URL;
- the browser sees one origin during development;
- no local CORS configuration is needed.

This proxy is development infrastructure. The production `dist` folder contains only frontend files. Production hosting must separately deploy the API and route `/api` to it.

## 17. Node API request handling

Open `server/app.mjs`.

The API uses `createServer` from Node's built-in `http` module. Each request is routed by method and pathname.

### `GET /api/policies`

The handler reads `public/policies.json`, parses it and returns it with status 200.

This route does not currently validate the seed file before returning it. The frontend validates the result. A production API should validate data at its own boundary as well.

### `POST /api/quotes`

The handler performs these steps in order:

1. Require `application/json`.
2. Stream request chunks.
3. Track body size and reject more than 8 KB.
4. Concatenate the chunks.
5. Parse JSON inside `try/catch`.
6. Validate business fields.
7. Return 422 with field errors if invalid.
8. Calculate and return a quote with 201.

### Why the body is streamed

An HTTP request body may arrive in multiple chunks. `for await...of` consumes the asynchronous request stream.

The code counts bytes while reading so an oversized request can be rejected without accepting an unlimited payload into memory.

### Response helper

`sendJson` consistently:

- sets the status code;
- sets JSON UTF-8 content type;
- disables caching;
- stringifies the response body;
- ends the response.

### HTTP status codes

| Status | Meaning in this API |
| --- | --- |
| 200 | Policy list returned |
| 201 | Quote calculated successfully |
| 400 | Request body is malformed JSON |
| 404 | Route does not exist |
| 405 | Known route with unsupported method |
| 413 | Request body exceeds 8 KB |
| 415 | Content type is not JSON |
| 422 | JSON is valid but fields fail validation |
| 500 | Unexpected server failure |

### Why 201 is used

The API returns a newly generated quote representation with a unique reference, so `201 Created` is reasonable. However, quotes are not persisted and cannot be retrieved later. A strict alternative for a calculation-only endpoint could be `200 OK`. Be ready to acknowledge this trade-off.

### `Allow` header

For a wrong method, the API sets `Allow` to describe the supported method. This is helpful HTTP behavior.

## 18. Server validation and pricing

Open `server/quotes.mjs`.

### Rate representation

```js
const rates = { Health: 300, Motor: 200, Home: 100 };
```

Rates are basis points:

- 100 basis points = 1%
- Health 300 = 3%
- Motor 200 = 2%
- Home 100 = 1%

Representing rates as integers avoids storing percentage values such as `0.02` directly. This reduces some floating-point ambiguity, although JavaScript Number arithmetic still is not suitable for every financial use case.

### Premium calculation

```js
Math.round(coverageAmount * rateBasisPoints / 10000)
```

Motor example:

```text
coverage = 500000
rate = 200 basis points
premium = round(500000 × 200 ÷ 10000)
premium = 10000
```

### Pure and impure functions

`calculatePremium` is pure:

- same inputs produce the same output;
- it does not change external state;
- it is easy to test independently.

`createQuote` is not fully pure because `randomUUID()` produces a different reference each time.

### `Object.hasOwn`

```js
Object.hasOwn(rates, input.product)
```

This checks that the product is an own key of the rates object. A value such as `toString`, inherited from `Object.prototype`, must not be accepted as a product.

### Server authority

The server explicitly constructs the response and ignores any client-supplied premium. If someone sends:

```json
{
  "customerName": "Asha",
  "product": "Motor",
  "coverageAmount": 500000,
  "annualPremium": 1
}
```

the API calculates ₹10,000. It does not trust ₹1.

### Production financial arithmetic

Real insurance pricing should use reviewed domain rules, appropriate decimal/integer money handling, versioned rating data, audit records and regulatory controls. This formula is intentionally fictional.

## 19. Policy filtering and derived data

Policy filter state consists of:

- `query` for customer search;
- `status` for status selection;
- `product` for product selection.

### Normalized query

```ts
const normalizedQuery = query.trim().toLocaleLowerCase();
```

- `trim()` removes surrounding whitespace.
- lowercase conversion makes matching case-insensitive.
- `includes()` permits partial-name search.

### Combined conditions

```ts
policy.customerName.toLocaleLowerCase().includes(normalizedQuery) &&
(status === 'All' || policy.status === status) &&
(product === '' || policy.product === product)
```

All three conditions use AND, so every active filter must match.

The all-values option short-circuits its condition:

- `'All'` accepts any status.
- empty product accepts any product.
- empty query is included in every string, so it accepts every customer.

### Product options

```ts
[...new Set(request.policies.map(...).filter(...))].sort()
```

Steps:

1. `map` extracts optional product values.
2. `filter` removes missing/empty values and narrows them to strings.
3. `Set` removes duplicates.
4. spread converts the Set back into an array.
5. `sort` orders labels alphabetically.

Product options are derived from the full policy list rather than filtered results, so choosing one filter does not make other valid product options disappear.

### Why filtered policies are not state

`filtered` can be calculated from request data and filter state during rendering. Storing it separately would duplicate data and introduce synchronization risks.

### Selection by ID

```ts
const selected = request.policies.find(policy => policy.id === selectedId);
```

Only the ID is stored. The selected object is derived from the source list. This avoids duplicating the entire policy in state.

### Why filter changes clear selection

A selected policy could disappear from the result list after a filter change. Clearing `selectedId` prevents the panel from displaying a record outside the visible results.

### Time and space complexity

For `n` policies:

- filtering: O(n), plus customer-name string matching;
- active count: O(n);
- pending count: O(n);
- product extraction: O(n), followed by sorting unique products;
- selected lookup: O(n);
- filtered result array: O(n) space in the worst case.

Several passes are fine for six records. At large scale, search, filtering and pagination should move to the server, and repeated derivations should be measured before optimizing.

## 20. Rendering decisions

### List keys

```tsx
<li key={policy.id}>
```

React uses a stable key to match each rendered item across updates. An index would be less reliable if records were reordered, inserted or removed.

Keys are used internally by React and are not passed to the component as a normal prop.

### Conditional rendering

The project uses:

- early returns for loading and error states;
- a ternary for empty versus populated results;
- `selected ? ... : ...` for populated versus placeholder details;
- `state.kind === 'success'` for quote summary versus form.

### Formatting

`Intl.NumberFormat` formats quotation currency. `toLocaleString('en-IN')` formats policy premiums using Indian digit grouping.

For consistency, a shared money formatter could eventually serve both features.

## 21. Responsive CSS architecture

The project uses plain CSS rather than a component library.

### Main layout choices

- Flexbox aligns the header, hero, toolbar and action groups.
- CSS Grid lays out metrics, form/guide cards and policy list/detail panel.
- `minmax(0, 1fr)` prevents grid children from forcing unwanted overflow.
- The policy details panel is sticky on wider screens.
- Below 800px the policy layout becomes one column.
- Below 700px the header, quote layout and other sections adapt.
- At very narrow widths the policy controls become one column.

### Sticky details

```css
position: sticky;
top: 24px;
max-height: calc(100dvh - 48px);
overflow-y: auto;
```

The details remain visible while the policy list scrolls. The height and internal scrolling prevent a tall panel from extending beyond the viewport.

On mobile, sticky positioning is removed and the panel stacks below the list.

### CSS maintainability considerations

For a larger design system, consider:

- CSS custom properties for color, spacing and radius tokens;
- reusable button/card classes;
- component-scoped styling or CSS modules;
- documented breakpoints;
- visual regression tests.

## 22. Test strategy

The repository uses several test layers because each catches different failures.

### Component behavior tests

`PolicyList.test.tsx` verifies:

- loading then success;
- case-insensitive search;
- status filtering;
- product, status and trimmed search together;
- reset behavior;
- unchanged portfolio totals;
- network failure and retry;
- valid empty response versus no filter matches;
- opening, changing and closing policy details;
- focus restoration.

`QuoteSubmission.test.tsx` verifies:

- invalid inputs do not call the loader;
- error summary receives focus;
- error links focus invalid fields;
- coverage is submitted as a number;
- duplicate pending submission is blocked;
- success renders the server quote;
- Edit preserves values and focuses the first field;
- New resets values and focuses the first field;
- server field errors are displayed;
- network failure can be retried;
- unmount aborts an in-flight request.

### API-client tests

`api.test.ts` replaces `fetch` and verifies:

- policy HTTP errors are rejected;
- malformed policy data is rejected;
- an empty policy array is valid;
- quotation request method, headers, body and signal;
- invalid successful quote responses are rejected;
- valid field errors are retained;
- non-JSON server failures still produce useful errors.

### Server tests

`server/app.test.mjs` starts a real API on an available local port and verifies:

- six policies are returned;
- premium calculation and name trimming;
- client-supplied premium is ignored;
- all fictional product rates;
- invalid shapes, inherited keys, numeric strings and negative values;
- malformed JSON;
- wrong content type;
- oversized request bodies;
- unknown routes and wrong methods.

### Browser tests

`e2e/workspace.spec.ts` runs in desktop and mobile projects:

- keyboard navigation through the quotation form;
- real POST request and 201 response;
- expected quote totals;
- edit and new-submission behavior;
- combined policy filters;
- responsive detail panel placement;
- selected-policy changes;
- reset behavior;
- 320px overflow check;
- simulated 503 failure and successful retry.

### Why inject loaders in component tests

Function props let component tests control loading, success and failure without depending on a real server. This makes those tests fast and deterministic.

Browser tests then cover actual integration with the server.

### What the tests do not prove

- absence of every accessibility problem;
- compatibility with every browser or real device;
- production network behavior;
- correctness of real insurance pricing;
- authentication and authorization;
- resilience under concurrent or high-volume use;
- successful deployment configuration.

## 23. Tooling and quality checks

### Useful commands

```sh
npm run dev       # frontend + local API
npm run api       # API only
npm run typecheck # TypeScript without emitting files
npm run lint      # ESLint and Hooks rules
npm test          # component/client tests + server tests
npm run build     # typecheck + Vite production frontend build
npm run check     # lint + tests + build
npm run test:e2e  # Playwright browser journeys
```

### TypeScript configuration

- `strict: true` enables stronger safety checks.
- `noEmit: true` makes TypeScript a checker; Vite handles building.
- ES2022 and DOM libraries provide modern JavaScript and browser types.
- bundler module resolution matches Vite's environment.
- React JSX transform avoids manually importing React in every JSX file.

### ESLint configuration

The project uses recommended JavaScript and TypeScript rules plus:

- Rules of Hooks: Hooks must be called consistently at the component top level.
- Exhaustive dependencies: effect dependency arrays must include referenced reactive values.

### Continuous integration

The workflow is designed to:

1. check out the repository;
2. install Node 22;
3. run `npm ci`;
4. run lint, tests and build;
5. install Chromium;
6. run browser tests;
7. upload browser reports.

The current GitHub account must be able to start hosted runners before this workflow can execute remotely. Local verification remains separate evidence.

## 24. Security discussion

### Existing defensive choices

- Both client and server validate input.
- The server, not the browser, calculates the premium.
- Request bodies are size-limited.
- The content type is checked.
- Responses use explicit JSON content type.
- Arbitrary product object keys are rejected.
- Unexpected errors return a generic message rather than raw internals.
- React escapes rendered strings by default.
- No HTML is injected with `dangerouslySetInnerHTML`.
- Generated files and environment files are ignored by Git.

### Production security gaps

- No authentication.
- No authorization checks.
- No rate limiting.
- No CSRF strategy for cookie-authenticated deployments.
- No CORS production policy.
- No security headers such as CSP configured here.
- No audit log.
- No encryption/storage design because nothing is persisted.
- No request correlation or security monitoring.
- No secret-management setup.
- No idempotency protection for quote creation.

### XSS question

Customer names are rendered as JSX text. React escapes text by default, reducing DOM-based XSS risk for this path. That does not replace server validation, output-context awareness or a content security policy.

### Authentication versus authorization

- Authentication answers: who is the user?
- Authorization answers: may this user perform this action or access this record?

A real policy system needs both, enforced on the server for every protected resource.

## 25. Performance discussion

### Current performance is appropriate

- Six policies make client filtering inexpensive.
- Derived values are simple.
- No large dependency is added for caching or global state.
- There is no reason to add `useMemo` merely because filtering exists.

### When optimization would become useful

For thousands of policies:

- send search/filter/page parameters to the API;
- paginate or use cursor-based retrieval;
- debounce search requests;
- cancel stale requests;
- cache server data;
- consider list virtualization for many rendered rows;
- measure rendering with React Profiler;
- use code splitting for genuinely separate routes;
- measure bundle and Core Web Vitals.

### `useMemo` answer

`useMemo` can cache a calculation between renders, but it also adds dependency management and memory cost. Use it after measuring an expensive recalculation or when referential stability is required, not automatically for a six-record filter.

### Debounce versus throttle

- Debounce waits until events stop for a period, useful for server search input.
- Throttle limits execution frequency, useful for continuous events such as scroll or resize.

The current local filter needs neither.

## 26. Error-handling discussion

The project distinguishes:

1. **Client validation error**: request is never sent.
2. **Server validation error**: HTTP 422 with field errors.
3. **Other HTTP error**: response exists but `response.ok` is false.
4. **Network failure**: `fetch` rejects, for example because the server is unavailable.
5. **Cancellation**: request rejects with an abort-related error or is ignored through the signal guard.
6. **Invalid success body**: HTTP succeeds but runtime validation fails.

This distinction is useful because the recovery and user message can differ.

### Retry behavior

- Policy Retry increments `attempt`, which reruns the effect.
- Quote retry submits the preserved form again.

A production client might use exponential backoff only for appropriate transient failures. It should not automatically retry every POST without considering idempotency.

## 27. Production limitations and improvements

### Current limitations

- Data is fictional and policy records come from a file.
- Quotes are not saved.
- Refresh clears the form and quote.
- Quote references cannot be retrieved.
- No login or role-based access.
- No real underwriting rules.
- No database or migrations.
- No audit trail.
- No server-side policy pagination/filtering.
- No OpenAPI documentation.
- No production deployment.
- No observability or alerting.

### Sensible next features

1. Add independently implemented premium sorting.
2. Add persistent quote history with `POST /quotes` and `GET /quotes/:id`.
3. Add URL routing for deep links.
4. Add OpenAPI documentation and generated/shared contract types.
5. Add authentication and server-side authorization.
6. Move policy filtering and pagination to the server for a large portfolio.
7. Add structured logging, correlation IDs and metrics.
8. Deploy frontend and API with environment-specific configuration.

Avoid adding libraries only to list them as technologies. Each addition should solve a demonstrated problem.

## 28. Likely recruiter and interviewer questions

### Product and architecture

**What problem does this solve?**

It demonstrates a simplified new-business workflow: collect submission details, request a quotation and review policy records. It focuses on frontend and API engineering rather than real underwriting.

**Why is this called a POC?**

It proves a user flow and technical integration with fictional rules. It lacks the persistence, security, domain rules, integrations and operational controls required for production.

**Why use a local Node API rather than calculate in React?**

Pricing is a server-owned business decision. A browser can be manipulated and should not be trusted to define the premium. Keeping the formula on the server also models a real API boundary.

**Why no database?**

Persistence was outside the focused learning scope. The limitation is explicit. The next API design would save submissions and quotes and allow retrieval by ID.

**Why no global state library?**

State belongs to one of two small feature components and is not shared widely. Local state is easier to understand and maintain here.

**Why no React Router?**

The two views are local tabs without deep-link requirements. Routing becomes useful when URLs, Back/Forward navigation, nested pages or shareable records are required.

### React

**What causes a re-render?**

Calling a state setter with a changed value schedules a render. Parent rendering and context changes can also render descendants. Updating a ref does not cause a render.

**Why are Hooks at the top level?**

React identifies Hook state by call order. Conditional Hook calls could change that order between renders.

**Why use an effect for policies but a handler for quotes?**

Policies load because the component is mounted or retry changes. A quote is requested because the user submits the form.

**What is stale closure risk?**

A function captures values from the render in which it was created. Functional state updates and correct effect dependencies help avoid relying on stale values.

**Why not store the selected policy object?**

The object already exists in the policies array. Storing only its ID avoids duplicate state and derives the current object with `find`.

**Why not store filtered policies in state?**

They are derived from policies and filters. Separate state could become outdated when any input changes.

**What is reconciliation?**

React compares the next element tree with the previous one and updates the required DOM parts. Stable keys help it match list items correctly.

### JavaScript

**Difference between `map`, `filter` and `find`?**

- `map` transforms every element and returns an array.
- `filter` keeps matching elements and returns an array.
- `find` returns the first matching element or `undefined`.

**Does `filter` mutate the source array?**

No. It returns a new array of references. The referenced objects are not deep-cloned.

**Does `sort` mutate the array?**

Yes. Before implementing premium sorting, copy the filtered array or use a non-mutating alternative supported by the target environment.

**What is short-circuit evaluation?**

`&&` stops at the first falsy operand; `||` stops at the first truthy operand. The validation and filter expressions rely on this behavior.

**Promise versus `async/await`?**

An async function returns a Promise. `await` is syntax for pausing that async function until a Promise settles, while the event loop can continue other work.

**Why `Number.isFinite`?**

It accepts only actual finite numbers and avoids coercing strings, unlike some global numeric checks.

### TypeScript

**Type versus interface?**

Both can describe object shapes. Types also directly express unions and mapped compositions used here. Interfaces support declaration merging and are often used for extensible public object contracts. Consistency matters more than a blanket rule.

**What is narrowing?**

TypeScript refines a wider type after runtime checks, such as checking `request.kind`, `typeof`, `Array.isArray` or a type guard.

**What does `as` do?**

It changes the compiler's view. It performs no runtime conversion or validation.

**Why use `unknown` instead of `any`?**

`unknown` requires checking before use. `any` disables type safety and lets invalid operations pass compilation.

**What is a discriminated union?**

A union whose members share a literal property, such as `kind`, which allows safe narrowing and prevents impossible state shapes.

**What is `keyof`?**

It produces a union of property names from an object type. The field-error type uses it to keep error keys aligned with submission fields.

### API and HTTP

**Does fetch reject for 404 or 500?**

Normally no. It resolves with a Response, and the code must inspect `ok` or `status`.

**Why use POST for quotations?**

The request sends structured customer and coverage data and generates a quote reference. GET parameters would expose data in URLs and are less suitable for this operation.

**Difference between 400 and 422 here?**

400 means the JSON syntax cannot be parsed. 422 means valid JSON was parsed but its business fields are invalid.

**Why 415?**

The server requires JSON and rejects unsupported request media types.

**Why set `Cache-Control: no-store`?**

The demo responses should not be reused from an HTTP cache, especially quotation responses containing submitted values.

**What is CORS?**

It is a browser-enforced policy governing cross-origin requests. The local Vite proxy avoids cross-origin development requests. Production origins need an explicit policy.

**What is idempotency?**

Repeating an idempotent operation has the same intended effect. Quote creation currently generates a new reference on every accepted POST. A production API could use an idempotency key to safely handle retries.

### Testing

**Why test behavior instead of implementation details?**

Behavior tests survive internal refactoring and reflect what users experience. The tests locate controls by roles and labels rather than CSS classes.

**Unit, component, integration and E2E differences?**

- Unit: isolated function such as premium calculation.
- Component: rendered React component with controlled dependencies.
- Integration: multiple real units together, such as the HTTP server routes.
- E2E: browser, frontend and API through a complete user journey.

**Why not test everything through Playwright?**

Browser tests are slower and harder to isolate. Component and unit tests cover edge cases quickly; a smaller E2E suite verifies critical integration paths.

**What should be mocked?**

Mock boundaries that a test is not trying to verify. Component tests replace network loaders. Server tests use real HTTP. E2E success uses the real local API, while one scenario intercepts a request specifically to simulate a 503.

### Accessibility

**What accessibility work exists?**

Semantic labels, form grouping, linked errors, alert/status regions, keyboard-operable native controls, focus management, skip link, responsive layouts and descriptive control names.

**Why manage focus after submission?**

The visible content changes significantly. Moving focus to the error or success heading helps keyboard and screen-reader users discover the result.

**Why prefer native buttons and selects?**

They provide keyboard behavior, focus, semantics and platform accessibility without rebuilding those behaviors in custom elements.

### Performance and scale

**How would this handle 100,000 policies?**

It should not download and render them all. Move search/filter/pagination to the server, return a page or cursor, debounce search, cancel stale requests and consider virtualization for long visible lists.

**Would you add TanStack Query?**

When the app needs caching, stale-data handling, background refetch, mutation invalidation or shared server data, yes. The current manual state is small enough to explain directly.

**Would you use `useMemo` for filtered policies?**

Only if profiling shows meaningful cost or stable identity is needed. Six records do not justify it.

## 29. Questions where a careful answer matters

**Is the quote secure because the formula is on the server?**

No. That is one correct boundary, but the API still lacks authentication, authorization, rate limiting, audit logging and production controls.

**Is TypeScript enough to protect the API boundary?**

No. Runtime validation is still necessary.

**Does AbortController guarantee the server stopped processing?**

No. It cancels or signals cancellation on the client side. The server may already have completed the work.

**Does a passing test suite prove there are no bugs?**

No. It provides evidence for covered behaviors. Missing cases, environmental differences and incorrect requirements can remain.

**Is the mobile Playwright project a real mobile-device test?**

No. It emulates a mobile viewport and device characteristics in a Chromium-based browser.

**Is this production-ready?**

No. It is intentionally a focused POC with clearly documented gaps.

## 30. One-minute interview walkthrough

> Policy Desk is a React and TypeScript POC for a simplified insurance submission and policy-review workflow using fictional data. The quotation form uses controlled inputs, client validation and explicit idle, submitting, error and success states. On submit, it sends JSON to a local Node API. The server validates the request and owns the fictional premium calculation, so it does not trust a browser-supplied premium. The frontend checks both HTTP errors and the runtime shape of successful responses before rendering the quote. The policy view loads records with cancellation support, then derives search, status and product results without duplicating them in state. I also focused on semantic HTML, keyboard focus, responsive details and layered tests covering components, API routes and browser journeys. It remains a POC: there is no authentication, database, real underwriting or policy issuance. My next independently implemented extension is premium sorting with tests.

## 31. Three-minute technical walkthrough

Use this structure rather than reciting code line by line:

1. **Problem**: demonstrate a fictional submission-to-quote journey and policy lookup.
2. **Frontend structure**: App selects two views; each feature owns local state.
3. **Quotation state**: controlled form plus discriminated request union.
4. **API boundary**: POST JSON, check HTTP response, validate runtime shape.
5. **Server authority**: validate again and calculate premium using basis points.
6. **Policy data**: effect-driven GET, cancellation and discriminated request state.
7. **Derived UI**: combined filters and ID-based detail selection.
8. **Quality**: accessible semantics, focus management and responsive CSS.
9. **Testing**: component, client, real HTTP and browser layers.
10. **Limits**: no persistence, authentication or real pricing.

## 32. How to study this repository

### Pass 1: explain the user journey

Without code, explain:

- what the user enters;
- what React validates;
- what the API validates;
- where the premium is calculated;
- how the result returns to the screen.

### Pass 2: trace exact files

Follow this order:

1. `src/main.tsx`
2. `src/App.tsx`
3. `src/QuoteSubmission.tsx`
4. `src/quoteApi.ts`
5. `server/app.mjs`
6. `server/quotes.mjs`
7. `src/PolicyList.tsx`
8. tests

### Pass 3: predict before running

For each scenario, predict the state and UI first:

- empty submission;
- invalid product sent directly to API;
- API unavailable;
- successful Motor quote at ₹5,00,000;
- edit after success;
- unmount during request;
- product and status with zero matches;
- filter change while details are open.

### Pass 4: make one independent change

Implement premium sorting:

- original order;
- low to high;
- high to low;
- reset integration;
- tests with active filters;
- no mutation of source policies.

Before coding, answer:

1. What state is essential?
2. What value is derived?
3. Does `sort` mutate?
4. Where should sorting occur relative to filtering?
5. Which behaviors need tests?

### Pass 5: practise failure diagnosis

Temporarily stop the API or intercept an error and explain:

- what `fetch` does;
- which catch path runs;
- what form data remains;
- how the user retries;
- what you would log in production.

## 33. Rapid self-test

Answer these without opening the guide:

1. Why is API JSON typed as `unknown`?
2. What makes `RequestState` a discriminated union?
3. Why is the policy request in an effect?
4. Why is quote submission in an event handler?
5. Why are filters derived rather than stored as a result array?
6. Why store `selectedId` instead of the selected object?
7. What does the effect cleanup do?
8. Why validate on both client and server?
9. Does fetch reject for HTTP 422?
10. What is the difference between a network error and invalid JSON data?
11. Why is the premium calculated on the server?
12. What is a pure function in this repository?
13. What does `Object.hasOwn` protect against?
14. Why is coverage converted with `Number`?
15. Why does the pending guard use a ref as well as disabled controls?
16. What does `aria-live="polite"` do?
17. Why return focus after closing details?
18. What do component tests mock?
19. What do server tests exercise for real?
20. What do browser tests add?
21. How would the architecture change for 100,000 policies?
22. What are the largest production gaps?

If you cannot answer one, return to the relevant section and explain it with a concrete example.

## 34. Honest ownership statement

Describe only work you personally understand and can reproduce. A safe structure is:

> I used this repository as a focused learning project. I can explain the existing architecture, API boundary, request states and test strategy. I independently implemented [name the change you actually completed], added [specific tests], and verified [specific behavior]. The project is a POC, and I can describe what would be required for production.

Do not claim real underwriting rules, real customer data, production deployment or independent implementation of work you cannot explain.

## 35. Final preparation checklist

- [ ] I can give the one-minute walkthrough without reading.
- [ ] I can trace `Calculate quote` from event to server and back.
- [ ] I can explain `unknown`, type guards and discriminated unions.
- [ ] I can explain effect dependencies and cleanup.
- [ ] I can explain state versus refs.
- [ ] I can explain client versus server validation.
- [ ] I can explain the HTTP status codes used.
- [ ] I can dry-run the premium calculation.
- [ ] I can explain filtering complexity and scale limits.
- [ ] I can describe accessibility behavior with concrete examples.
- [ ] I can explain what each test layer covers.
- [ ] I can name at least five production limitations.
- [ ] I have completed and tested one change independently.
- [ ] I can discuss a professional React problem from my actual work separately from this POC.

The strongest interview position is not “this project has many technologies.” It is “I understand why each current piece exists, where its limits are, and how I would change it when requirements grow.”
