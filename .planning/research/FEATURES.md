# Feature Research

**Domain:** Exam room allocation / student distribution web app for Vietnamese education operations
**Researched:** 2026-04-08
**Confidence:** MEDIUM

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Excel template import with validation | Vietnamese schools and training offices still operate primarily from Excel lists; re-keying data kills trust immediately | MEDIUM | Must accept `.xlsx`, validate required columns, tolerate optional notes column, and show row-level errors before allocation |
| Automatic room allocation by room count/capacity | Core job-to-be-done is “take this list and split it into rooms correctly” | MEDIUM | Needs configurable room count or per-room capacity, deterministic output, and clear handling for remainder students |
| Candidate number generation (SBD) | Exam operations expect each student to receive a unique seat/candidate identifier before printing room lists | LOW | Format should be configurable enough for local convention; project already prefers `Pxx-yyy` |
| Vietnamese-correct sorting and display | Name ordering by `TÊN`, then `HỌ LÓT`, then ID is an operational convention; ASCII sort looks wrong and causes disputes | MEDIUM | Must normalize dấu (diacritics), extra spaces, casing, and tie-break predictably |
| Preview before export | Staff need to verify room sizes, class mix, and numbering before finalizing because printouts become official artifacts | MEDIUM | Summary table plus per-room preview is enough for MVP |
| Excel export and print-ready room lists | Real-world workflow ends in printed room rosters, door sheets, collection sheets, or shared Excel files | MEDIUM | A4-friendly print layout and one master sheet + per-room sheets match common admin behavior |
| Manual correction after auto-allocation | No allocation algorithm survives every real-life exception; operators need last-mile control | MEDIUM | At minimum support moving a student to another room and regenerating affected numbering safely |
| Allocation summary/reporting | Staff need to quickly confirm fairness: students per room, empty seats, class distribution, overflow | LOW | Lightweight dashboard or totals panel is enough; this is operational verification, not BI |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Multiple allocation strategies (balanced mix / keep class clusters / proportional representation) | Lets one tool serve different exam policies instead of forcing a single distribution logic | HIGH | Strong fit with project context; this is the clearest product differentiator |
| Interactive drag-and-drop reallocation with live rule checks | Makes exception handling much faster than spreadsheet editing while reducing accidental imbalance | HIGH | Best when combined with warnings for room over-capacity, duplicate SBD, or policy violations |
| Distribution quality dashboard | Helps cán bộ khảo thí explain and defend fairness decisions to leadership using visible metrics | MEDIUM | Show per-room counts, class ratios, max-min spread, and warning badges |
| Saved allocation runs and comparison history | Valuable for internal operations because schools often rerun allocation after roster changes or policy adjustments | MEDIUM | Compare run A vs B by moved students, changed room counts, and changed SBD |
| Institution-specific print/export templates | Competitive in Vietnam because paperwork conventions differ by school/training center | MEDIUM | Example outputs: door posting sheet, invigilator handoff sheet, room attendance list |
| Constraint-based exception rules | Supports real operational edge cases such as keeping flagged students separated, reserving seats, or grouping special cases | HIGH | Powerful, but should be rule presets rather than a generic rule engine in early versions |
| “Explain allocation” audit trail | Builds trust by showing why a student landed in a room: balance rule, class-preservation threshold, manual override | MEDIUM | Especially useful when staff need to justify fairness or investigate complaints |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full exam management suite (question bank, online testing, grading, transcripts) | Buyers often imagine one system covering the whole exam lifecycle | Blows up scope and turns a focused allocation tool into a generic SIS/EMS competitor | Stay focused on allocation workflow; integrate via import/export rather than owning all upstream/downstream modules |
| Real-time multi-user collaboration | Sounds modern for office teams | High complexity, conflict resolution pain, little value when one operator usually owns a run | Use single-editor workflow with save history and explicit versioning |
| Generic no-code rule builder in v1 | Admins may ask for “any rule we can think of” | Hard to validate, easy to misconfigure, and expensive to support | Ship 3-5 named allocation strategies plus a few constrained exception toggles |
| Native mobile app | Stakeholders may ask for phone access | Allocation work is spreadsheet-heavy and print-oriented; mobile adds cost without improving main workflow | Responsive web for viewing/printing; desktop-first UX for editing |
| PDF-first export pipeline | PDF feels official | For Vietnamese school offices, Excel + browser print usually fits better and remains editable | Use print-friendly HTML plus Excel export first; add PDF only if formatting becomes a recurring pain point |

## Feature Dependencies

```text
Excel import with validation
    └──requires──> Input template definition

Automatic room allocation by room count/capacity
    └──requires──> Clean imported roster
        └──requires──> Vietnamese-correct sorting and normalization

Candidate number generation (SBD)
    └──requires──> Final room assignment

Preview before export
    └──requires──> Automatic room allocation by room count/capacity

Manual correction after auto-allocation
    └──requires──> Preview before export
        └──enhances──> Excel export and print-ready room lists

Interactive drag-and-drop reallocation with live rule checks
    └──requires──> Manual correction after auto-allocation
        └──requires──> Allocation summary/reporting

Saved allocation runs and comparison history
    └──requires──> Stable allocation data model

Multiple allocation strategies
    └──requires──> Automatic room allocation by room count/capacity
        └──enhances──> Distribution quality dashboard

Constraint-based exception rules
    └──conflicts──> Ruthless MVP scope
```

### Dependency Notes

- **Automatic room allocation requires clean imported roster:** Garbage-in-garbage-out is brutal here; duplicate IDs, malformed names, or missing room parameters produce official-looking but wrong exports.
- **SBD generation requires final room assignment:** If room assignment changes, numbering can shift. Re-numbering logic must be explicit after manual edits.
- **Preview requires allocation:** Users need to inspect a proposed result before approving export, so preview sits directly on top of the allocation engine.
- **Manual correction enhances export:** The tool becomes operationally useful only when staff can fix special cases before generating final paperwork.
- **Drag-and-drop requires reporting and rule checks:** Without visible constraints, drag-and-drop becomes a fast way to break fairness and capacity rules.
- **Constraint-based exception rules conflict with ruthless MVP scope:** They are valuable, but too early they create rule explosion and support burden.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] Excel template import with validation — because current workflow already starts in Excel, and failure here kills adoption immediately
- [ ] Automatic room allocation by room count/capacity — because this is the core promise of the product
- [ ] Vietnamese-correct sorting and candidate number generation — because official room lists must look right and be trusted
- [ ] Preview before export — because admin users need a confidence checkpoint before finalizing
- [ ] Excel export and print-ready room lists — because usable output, not algorithm elegance, is what users pay attention to
- [ ] Manual correction after auto-allocation — because real exam operations always contain edge cases

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] Multiple allocation strategies — add when users confirm one default strategy is not enough across cohorts/exams
- [ ] Distribution quality dashboard — add when users want evidence of fairness and not just final room lists
- [ ] Saved allocation runs and comparison history — add when repeated reruns become common in production
- [ ] Interactive drag-and-drop reallocation — add when manual correction volume is high enough that list-based editing feels slow

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Institution-specific print/export templates — defer until two or more schools/units require different paperwork conventions
- [ ] Constraint-based exception rules — defer until recurring edge cases are known well enough to productize safely
- [ ] Invigilator assignment / supervision planning — adjacent value, but not core to validating room allocation product-market fit
- [ ] Hall-ticket/QR workflows — useful in larger exam systems, but outside the narrow v1 job-to-be-done

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Excel import with validation | HIGH | MEDIUM | P1 |
| Automatic room allocation by room count/capacity | HIGH | MEDIUM | P1 |
| Vietnamese-correct sorting | HIGH | MEDIUM | P1 |
| Candidate number generation (SBD) | HIGH | LOW | P1 |
| Preview before export | HIGH | MEDIUM | P1 |
| Excel export and print-ready room lists | HIGH | MEDIUM | P1 |
| Manual correction after auto-allocation | HIGH | MEDIUM | P1 |
| Allocation summary/reporting | MEDIUM | LOW | P2 |
| Multiple allocation strategies | HIGH | HIGH | P2 |
| Interactive drag-and-drop reallocation | MEDIUM | HIGH | P2 |
| Saved allocation runs and comparison history | MEDIUM | MEDIUM | P2 |
| Institution-specific print/export templates | MEDIUM | MEDIUM | P3 |
| Constraint-based exception rules | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Competitor A | Competitor B | Our Approach |
|---------|--------------|--------------|--------------|
| Automatic room allocation | `xepphongthi.com` emphasizes auto room assignment and configurable students-per-room for Vietnamese exam operations | OpenEduCat includes room allocation as part of a broader exam management suite | Stay narrow and optimize for faster, clearer room allocation rather than a full ERP flow |
| Seating layout / room output | `xepphongthi.com` highlights printable seating diagrams and room paperwork | OpenEduCat supports hall tickets and seating charts | Prioritize master Excel + per-room sheets + print-friendly room lists before richer exam artifacts |
| Anti-cheating seating logic | OpenEduCat highlights randomized seating and separation rules for same-subject students | Vietnamese room-allocation tools appear more paperwork-oriented than rule-rich | Treat advanced anti-cheating constraints as v2+, not MVP |
| Manual operations UX | Many existing tools appear form-heavy or desktop-like | Broad ERP products spread attention across many modules | Differentiate with preview-first editing, simple overrides, and later drag-and-drop |
| Auditability / rerun handling | Existing marketing focuses more on outputs than rerun comparison | ERP systems keep records but are heavier than needed for a focused tool | Offer saved runs and change comparison as a practical operational differentiator |

## Sources

- Project context: `/home/minhnhut_dev/projects/sapxepdanhsach/.planning/PROJECT.md`
- Template used: `/home/minhnhut_dev/.claude/get-shit-done/templates/research-project/FEATURES.md`
- Official/Open product source: OpenEduCat Exam Management for Colleges — https://openeducat.org/feature-exam-management-system/colleges/ (MEDIUM confidence for broader exam-management conventions)
- Official/Vietnamese product source: Hệ Thống Quản Lý Thi THPT — https://xepphongthi.com/ (MEDIUM confidence for Vietnamese exam-operations conventions)
- Vendor marketing source: Softloom ERP Software for Exam Hall Allocation — https://softloom.com/erp-software-for-exam-hall-allocation/ (LOW-MEDIUM confidence; useful for recurring feature patterns, not local conventions)

---
*Feature research for: exam room allocation / student distribution tools in Vietnamese education context*
*Researched: 2026-04-08*
