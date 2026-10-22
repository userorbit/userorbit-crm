- When verifying browser UI fixes, check the user's actual open browser/port and reload it before concluding. A served script can be fixed while the current tab is still running the old broken JavaScript.
- Confirm the exact repository URL before a product comparison or implementation. Userorbit CRM is github.com/userorbit/userorbit-crm; github.com/middlerange/open-crm is a different product.
- A successful API smoke check does not establish UI quality. Capture and inspect every routed view at desktop and narrow widths before calling a UI release verified. Check form controls independently: global input width/padding and grid-label rules must never stretch checkboxes or radio controls.

- A reference defines layout and component treatment; retain Userorbit branding. Use the owner-supplied mark and brand colors instead of carrying over Apollo’s yellow.

- Cloudflare Workers supports fetch redirect modes follow and manual, not error. Provider clients must use manual, reject redirect responses explicitly, and be verified in the Workers runtime as well as Bun mocks.
