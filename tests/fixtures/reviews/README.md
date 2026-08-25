# Review fixtures

This directory contains standalone review requests used to exercise the EvidenceLens MCP contract.

## FIT5032 Week 4 Library review

`fit5032-week4-library-review.json` is an inline-content fixture derived from the local FIT5032 Week 3–4 Library project and its eFolio review notes.

It is intentionally independent from `/Users/yifeng/Documents/FIT5032`: it does not reference filesystem evidence at runtime and does not modify any FIT5032 course files.

The fixture contains the four required review roles:

- `assignment_brief`: condensed assignment requirements
- `rubric`: CSV-style criteria and evidence expectations
- `teacher_instructions`: condensed studio evidence requirements
- `solution`: summarized implementation and known evidence gaps

Expected review themes include the implemented Bootstrap breakpoint layout and form validation, plus possible findings for missing Australian Resident validation, missing `minlength`/`maxlength`, incomplete CSS evidence, insufficient DataTable evidence, and incorrect GitHub evidence type.

The request can be passed directly as the arguments of the `review_evidence` MCP tool.
