# Contact presence proposal

Date: 2026-09-04

## Decision

Add a compact creator/contact block in two places:

1. At the bottom of the existing **More** sheet in the interactive sky.
2. At the end of the reading pages as a shared, quiet footer.

Do not add permanent social icons to the header or canvas corners. Contact is useful for trust,
feedback, and attribution, but it is not part of the sky-viewing task. The More sheet already owns
secondary actions at the expected top-right location, while a footer makes the same information
available to visitors who arrive directly on an object, encounter, method, fallback, or error page.

## Exact content

Recommended visible copy:

```text
Created by Aliaksei Mazheika
Email  ·  LinkedIn  ·  GitHub
```

Use all three channels, in that order:

- **Email** is the clearest way to start a conversation or send project feedback.
- **LinkedIn** establishes professional identity and is useful for networking.
- **GitHub** lets technically curious visitors inspect the creator's work.

The labels should be visible text, not icon-only controls. Small platform icons may accompany the
labels if they fit the existing visual language, but they should be decorative and should not replace
the words.

Do not add a phone number, contact form, long biography, availability status, or a generic “Follow
me” call to action. They add weight without helping the likely Perigee visitor.

## Placement

### Interactive sky

Add a final `more-section` below Keyboard on desktop. On compact layouts, where Keyboard is already
hidden, the contact block follows Capture this sky. Keep it visually quieter than the action rows:
single creator byline, then one wrapping row of links.

This adds roughly 70–80 px to a sheet that currently has enough room at both the inspected desktop
size and 390 × 844 mobile size. Preserve the sheet's existing maximum height and scrolling behavior
rather than compressing tap targets.

### Reading and fallback pages

Create one shared site footer and place it after the page's final return-to-sky link. Use the same
creator name and link order as the More sheet. Apply it to the method page, object pages, encounter
fallback pages, the prerender landing, capability fallback, and the error page where practical.

This is a repetition, not a second design: visitors should meet the same identity and wording
regardless of how they entered the site.

## Interaction and accessibility contract

- Use native `<a>` elements with real `href` values.
- Use a `mailto:` URL for Email and canonical profile URLs for LinkedIn and GitHub.
- Keep visible labels descriptive: `Email`, `LinkedIn`, and `GitHub`.
- Open contact links in a new tab and announce that behavior in the accessible name.
- Preserve Perigee's existing hover, underline, and focus-visible treatment.
- Give each link at least a 24 × 24 CSS px target; prefer the existing 44 px coarse-pointer rhythm on
  mobile.
- Keep link order and names identical in both placements.
- Avoid printing the raw email address unless direct visibility is worth the scraping risk. The
  `Email` label can still use the address in its `mailto:` destination.

## Supporting metadata

The site already identifies Aliaksei Mazheika as the author in structured data. When the visible
links are added, also add the LinkedIn and GitHub URLs to the Person entity's `sameAs` values. Do not
publish the email address in JSON-LD.

Optionally track a small `contact_link_click` event with `channel` and `placement` (`more` or
`footer`). This can show whether all three links earn their space without collecting message content
or personal data.

## Why this follows established practice

- Nielsen Norman Group reports that people look for contact information in the top-right area or the
  footer. Perigee's More control and reading-page footer cover those expectations without adding
  persistent chrome: <https://www.nngroup.com/articles/contact-us-pages/>.
- W3C recommends descriptive link names that make sense out of context and accessible names for
  icon-only links: <https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-link-only.html>.
- WCAG 2.2 sets a 24 × 24 CSS px minimum target, subject to limited exceptions:
  <https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum>.
- New-tab behavior is an explicit product choice; its accessible names announce the context change,
  following the caution in <https://design-system.service.gov.uk/styles/links/>.

## Rejected alternatives

- **Header links:** too prominent for a secondary action and contrary to the header's current single
  purpose: brand/reset.
- **Three floating social icons:** creates visual noise, weakens the cinematic hierarchy, and makes
  small unlabeled targets more likely.
- **Contact hidden under an About page:** adds a navigation step and makes a simple action harder to
  find.
- **Footer only:** insufficient for the full-screen interactive route, which has no conventional page
  bottom during normal use.

## Inputs required before implementation

- Public contact email.
- Canonical LinkedIn profile URL.
- Canonical GitHub profile URL.
- Confirmation that exposing a `mailto:` address publicly is acceptable.
