# ISP website usability review — November 5, 2026

## Scope and method

Expert review using [Nielsen Norman Group’s ten usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/), followed by implementation and browser checks. Starting point: published commit `5c40b787f8b93dd220d34ff6446e6b06bd3714ca` (the same file tree as local commit `0bec02c`).

Reviewed the eleven core pages, shared navigation, directory interactions, and generated detail-page navigation. All 77 generated pages received automated structural checks; representative flows received browser testing at 320 × 800 and 1280 × 900. This is an expert inspection, not a participant study or a complete accessibility certification.

Severity: 0 = no identified issue, 1 = minor friction, 2 = meaningful difficulty, 3 = task failure, 4 = critical blocker. Ratings describe the observed starting state, not a score for the whole website.

## Findings against all ten heuristics

| Heuristic focus | Finding and impact | Severity | Implementation / assessment |
| --- | --- | --- | --- |
| 1. Visible state | The directory count omitted search text and ordering. Browser reload also loaded new markup with cached old JavaScript during testing, leaving behavior inconsistent with the new controls. | 2 | Result status includes the query, directory, facets, and ordering. Generated CSS/JS URLs contain content hashes, so changed assets receive new URLs. |
| 2. Familiar language | “Explore faculty expertise” remained the heading when viewing students or staff. About contained an internal TODO asking for enrollment counts. | 1 | Use “Find people and research” and describe all directory audiences. About retains the dated provenance of leadership information and a plain instruction to confirm current roles; editorial housekeeping is removed from that page. |
| 3. Reversible actions | Every filter used replaceState, so Back could not undo a selection. Mobile primary navigation disappeared when its script did not initialize. | 3 | Filter changes create history entries; Back/Forward restore controls and results. Typing is grouped into one history entry per editing session. Mobile links remain expanded until the working script enables the menu. The skip target is explicitly focusable. |
| 4. Predictable conventions | “View all ISP news” was rewritten into a link to the page already being viewed. Detail breadcrumbs omitted their parent section, although imported articles did have a separate Back link. | 2 | The news handoff explicitly links to the live ISP site. Semantic breadcrumbs include the parent on degree and imported detail pages. Existing navigation labels and section structure remain. |
| 5. Preventing mistakes | Selecting a faculty topic and then Graduate students produced zero results, because student profiles lack those labels. It falsely suggested that there were no students in that area. | 3 | Switching to a non-faculty directory clears and disables topic/school filters with an adjacent explanation. Name search remains available. Back restores the previous faculty combination. All people can still use the faculty facets, with a visible coverage explanation. |
| 6. Recognition over memory | Faculty-only metadata coverage was explained in a disclosure below all results. Readers had to remember where an imported page belonged. | 2 | Put coverage guidance immediately beside the controls, associated with both facet fields. Parent breadcrumbs give a direct, recognizable return route. |
| 7. Efficient repeated tasks | Existing sorting, saved query URLs, homepage shortcuts, and expandable cards already support repeat visits. Filter history was the main missing efficiency aid. | 1 | Preserve those features and add reversible filter changes without one history entry per keystroke. Verify sorting, combined filters, and reload persistence. No additional search dependency or framework introduced. |
| 8. Focused presentation | Non-faculty cards repeated two “not listed” lines even though the entire category was unclassified. This added noise and could look like a defect in each person’s record. | 1 | Omit those redundant fields on unclassified non-faculty cards; explain coverage once near the controls. Retain explicit missing-topic text where a faculty record lacks it, and retain compact portraits and on-demand biographies. |
| 9. Useful recovery | An empty result offered only advice to reset elsewhere. Invalid filter values in a shared URL were silently ignored. Malformed percent encoding in a fragment threw an exception. | 2 | Empty results include Clear name or keyword (preserves facets) and Show all people. Invalid choices receive a visible explanation and valid defaults. Fragment parsing tolerates invalid encoding. |
| 10. Help in context | Student resources already provide task-named disclosures and official contacts. Directory source notes were available but too far from the controls to explain a failed search. | 1 | Preserve the task guidance and official handoffs; surface coverage guidance and recovery at the decision point. Linked disclosures still expand automatically, including disclosure ancestors for nested targets. |

## Verification results

- Build and lint pass for all 77 pages: local links/anchors, heading hierarchy, image alt attributes, duplicate IDs, design-token use, and the theme’s enumerated text-color pairings.
- 15 automated Python regressions pass. Added checks cover parent breadcrumbs on all 66 imported pages and both degree pages, the live-news destination, and current asset versions on every generated page. JavaScript syntax checks pass for both scripts.
- Browser: Faculty defaults to 30 people. Language and information retrieval + School of Computing and Information returns 6. Switching to Graduate students returns 32, disables the unsupported facets, and Back restores the original 6-person result.
- Browser: Daqing He search returns 1 and survives reload. A deliberate unmatched query exposes recovery actions. Clearing only the query restores 6; Show all people returns 190; Back restores 6. First-name sorting yields Adriana, Daqing, Diane, Lorraine, Michael, Raquel for that subset.
- Browser: stale category/topic values show a warning and 30 faculty using valid defaults. A malformed fragment does not prevent the mobile menu from working; no JavaScript errors were reported in the tested flows.
- Browser: all eleven core pages fit at 320 px without horizontal overflow. Menu Escape closes the menu and returns focus. Enter opens a profile disclosure; the skip link focuses main. The MS breadcrumb returns to Academics. The live-news link retains its external destination.
- Browser: a temporary copy with script tags removed retains mobile navigation and all 190 profiles, hides inactive filter controls and the menu button, and supports native profile disclosure. This checks the script-free fallback; it does not simulate every browser failure mode. The fixture was deleted after testing.
- Browser: `resources.html#permissions` expands the correct instructions. Desktop directory layout was visually inspected at 1280 × 900; a screenshot was saved outside the repository.

## Remaining review needs

- Program staff still need to confirm current roles, research memberships, academic guidance, and advising availability. No new policy or people facts were invented. Grapevine data was not available for this pass; provenance links and the coverage explanation remain necessary.
- The approved institutional mark is still a labeled placeholder. Do not replace it with a reconstructed logo.
- The historical news archive remains a long list. Date-based browsing would help repeat research tasks, but needs consistent source dates rather than guessed publication metadata (minor remaining friction).
- Conduct task-based sessions with prospective/current students and keyboard/screen-reader users. In particular, test comprehension of faculty-only facets, selection of degree guidance, finding a contact, and recovery from an empty search. Automated structure/contrast checks do not establish full WCAG conformance.

README edits are deliberately excluded from the usability commit.
