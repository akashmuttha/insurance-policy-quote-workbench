# Explain, then change

Use this guide to study the project in small checkpoints. Read one checkpoint, explain it without reading, then make a small change yourself.

## 1. Entry point and state

Read `src/main.tsx`, then `src/App.tsx`. `createRoot` connects React to HTML. `StrictMode` performs extra development checks, including an effect setup/cleanup cycle; it does not mean production requests always happen twice.

The submission stays mounted in a hidden container so switching views preserves its state. The policy viewer mounts when opened. A refresh clears local state. No global store is needed.

Check: Why would unmounting the submission clear its draft?

## 2. Fetch and validate

Read `fetchPolicies` and `isPolicy` in `src/PolicyList.tsx`. `await` pauses the async function, not the browser. HTTP error responses do not automatically reject `fetch`, so check `response.ok`. Parsing JSON is separate from validating its shape.

`unknown` requires checks before trusting data. `Array.isArray` checks the container; `every(isPolicy)` checks records. `value is Policy` is a type predicate that narrows a successful check. An `as` assertion alone does not validate anything. Optional fields use `?`; `??` supplies a fallback for null/undefined while preserving empty strings and zero.

Check: Does declaring `Promise<Policy[]>` prove the server sent valid policies?

## 3. Effects and request state

Read the policy effect and early returns. `kind` is the discriminant: loading, error with a message, or success with policies. Early returns narrow the remaining code to success. This avoids contradictory combinations of separate flags.

Changing `attempt` retries the request. Search is not an effect dependency, so typing does not refetch. Cleanup aborts the request; `active` also ignores stale results from loaders that do not respect cancellation. Hooks stay above conditional returns to preserve call order.

Check: Why use a stale-result guard as well as AbortController?

## 4. Derive and render

Search uses `trim`, lowercase conversion, and `includes`. `filter` creates a new array; search AND status AND product must match. Each all-values option bypasses its condition. Product choices come from the full collection using `Set` to remove duplicates, so filtering does not shrink the available choices. `map` creates JSX; stable IDs identify rows. Selection stores an ID and uses `find` instead of copying a record into state. Portfolio counts use all policies.

Changing a filter clears the selected ID. Reset changes the three controls back to their defaults without modifying source records. On mobile, selecting a policy focuses the detail heading so the stacked panel becomes visible. Closing restores focus to the button that opened the details.

Filtering performs O(n) record checks plus string-search work, and uses O(n) extra space for matching references. Six records do not justify memoization.

Check: Why might storing filteredPolicies as additional state cause synchronization bugs?

## 5. Controlled form and submit handler

Read `src/QuoteSubmission.tsx`. React supplies each input value and updates it on change. Select values are strings; `Number` converts coverage before sending JSON. Object spread preserves fields when updating another field.

`preventDefault` stops native form navigation. A user-triggered POST belongs in the submit handler, not a mount effect. The handler validates, sets submitting state, and calls the API. Disabled controls prevent pending clicks; a ref also guards an immediate second submission before a render.

State drives UI. The AbortController ref holds a non-rendering value across renders. Cleanup aborts on unmount, and the signal guards late results. Switching views intentionally preserves the mounted submission and any in-flight request.

The quote is a submitted snapshot. Editing requires another request instead of changing the previous premium silently. Labels, linked errors, status announcements, and focused result/error headings support accessible use.

Check: Why does the controller belong in a ref while the quote belongs in state?

## 6. API boundary

Read `src/quoteApi.ts`, `server/app.mjs`, and `server/quotes.mjs`. `JSON.stringify` serializes the request. The content-type header identifies JSON. Vite proxies `/api` to Node, keeping the browser on one origin during development; production requires its own routing setup.

The server checks body size, JSON syntax, and input fields before calculating. Client validation is for feedback; server validation remains necessary because callers can bypass the UI. `Object.hasOwn` prevents inherited object keys from becoming valid product names.

`calculatePremium` is pure: identical inputs give identical output without external changes. `createQuote` adds a random reference and is not pure. The frontend validates the response and renders the server's premium.

Dry run: Motor + ₹5,00,000 → 200 basis points → 500000 × 200 / 10000 → ₹10,000/year.

Check: What happens if someone manually submits `annualPremium: 1`?

## 7. Your independent premium-sorting exercise

Ask for a hint or review after each step. No completed solution is included.

The product filter is part of the current implementation. First explain how it works, then add sorting yourself:

1. Add a sort control with original order, lowest premium first, and highest premium first.
2. Apply it to the visible records after filtering.
3. Keep the original policy array unchanged. Investigate whether `sort` mutates its receiver.
4. Make Reset filters also restore the original ordering.
5. Test ascending and descending order with active filters; verify portfolio counts remain unchanged.

Expected examples: **Health Protect + Active + “meera”** matches Meera Joshi only. **Motor Comprehensive + Active** matches no records.

## One-minute walkthrough

“This is a small insurance submission and quotation POC using fictional data. I use it to practise explaining and extending a complete React flow. React and TypeScript manage controlled inputs and explicit request states. Submitting sends JSON to a local Node API, which validates the request and calculates a fictional annual premium. The frontend checks the response and renders a quote summary, with edit, retry, and error paths. There is also a policy overview with combined search, status, and product filtering. Tests cover the UI, response validation, real HTTP routes, and desktop and mobile browser journeys. It has no authentication, persistence, or real underwriting, and does not issue policies. My independently implemented change is [describe only something you completed and tested].”

Until you make that change, replace the final sentence with: “My next exercise is to implement and test premium sorting independently.”

Practise explaining HTTP versus network errors, TypeScript versus runtime checks, effects versus event handlers, state versus refs, and why cancelling a request does not roll back server work.
