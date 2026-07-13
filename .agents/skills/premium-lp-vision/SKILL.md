---
name: premium-lp-vision
description: Use for any planning, copywriting, design, asset selection, implementation, review, or QA work on the Otica Vision Araguaina landing page. Enforce the local project docs as the definition of premium, prevent invented business data, require one section per implementation round, and preserve the beige, polished steel, editorial, clean brand direction.
---

# Premium LP Vision

Use this skill for every task related to the Otica Vision landing page.

## Required Reading

Before making decisions, read:

1. `AGENTS.md`
2. `docs/brand.md`
3. `docs/copy-bank.md`
4. `docs/design-system.md`
5. `docs/v3-design-direction.md`
6. `docs/v3-architecture.md`
7. `docs/assets-map.md`
8. `docs/v3-assets-manifest.md`
9. `docs/anti-erros.md`

## Core Rule

Do not decide independently what "premium" means. Use the local project documents as the source of truth.

## Project Facts

- Brand: Otica Vision.
- Location: Araguaina - TO.
- Real offer: national and imported frames.
- Real differentiator: LAB. DIGITAL for in-house lens production.
- Real channels: official WhatsApp, Instagram, and Google Maps links documented in `AGENTS.md`.

## Forbidden Assumptions

Do not invent:

- Full address.
- Opening hours.
- Real reviews.
- Testimonials.
- Brands sold.
- Delivery timing.
- Warranty.
- Services such as eye exams, fitting, maintenance, or installment payment.

## Working Process

- Implement only one section per round.
- Do not implement the landing unless explicitly asked.
- Do not run a redesign unless explicitly asked.
- Do not edit `package.json` unless explicitly asked.
- Do not delete, move, or rename assets unless explicitly asked.
- Prefer real photos over generic icons.
- Avoid generic SaaS styling and artificial gradients.
- Run mobile checks for every implemented section.
- Run lint/build when the project has those scripts.

## Output Discipline

When reviewing or implementing, report:

- Which local docs were followed.
- Which section was touched.
- Which data was avoided because it is absent.
- Which mobile/build checks were completed or could not be run.
