"""Render the Faculty Explorer from the ISP directory and curated research-area facets."""
from pathlib import Path
import html
import json

ROOT = Path(__file__).resolve().parents[1]
e = html.escape


def load_people():
    people = json.loads((ROOT / 'src/people.json').read_text())
    facets = json.loads((ROOT / 'src/people-facets.json').read_text())['people']
    slugs = {person['slug'] for person in people}
    if set(facets) - slugs:
        raise ValueError('Browse labels must match an existing ISP person')
    for person in people:
        person = {**person, **facets.get(person['slug'], {})}
        for key in ('schools', 'departments', 'topics'):
            person.setdefault(key, [])
        yield person


def options(values, default):
    return '<option value="">' + e(default) + '</option>' + ''.join(
        f'<option value="{e(value)}">{e(value)}</option>' for value in values
    )


def render():
    people = list(load_people())
    cards = []
    for person in people:
        name, slug = person['name'], person['slug']
        image = (
            f'<img src="{e(person["image"])}" alt="{e(name)}" width="72" height="80" loading="lazy">'
            if person.get('image')
            else '<div class="portrait-missing" aria-hidden="true">No photo</div>'
        )
        links = [
            f'<a data-source-link href="{e(person["source"])}">ISP profile<span class="directory-sr"> for {e(name)}</span> ↗</a>'
        ]
        for key, label in [
            ('scholar', 'Google Scholar'),
            ('website', 'Personal website'),
            ('email', 'Email'),
        ]:
            if person.get(key):
                links.append(
                    f'<a href="{e(person[key])}">{label}<span class="directory-sr"> for {e(name)}</span> ↗</a>'
                )
        details = []
        preview = []
        if person['departments']:
            details.append(
                '<p><strong>Department / unit</strong><br>'
                + e('; '.join(person['departments']))
                + '</p>'
            )
            preview.append('Department')
        if person.get('interests'):
            details.append(
                f'<p><strong>Research interests</strong><br>{e(person["interests"])}</p>'
            )
            preview.append('Interests')
        if person.get('research_summary'):
            details.append(
                f'<p><strong>Research overview</strong><br>{e(person["research_summary"])}</p>'
            )
            if 'Interests' not in preview:
                preview.append('Research')
        if person.get('bio'):
            details.append(
                f'<p><strong>From the ISP profile</strong><br>{e(person["bio"])}</p>'
            )
            preview.append('Bio')
        sources = person.get('sources', [])
        if sources:
            source_links = ' · '.join(
                f'<a data-source-link href="{e(s["url"])}">{e(s["label"])} ↗</a>'
                for s in sources
            )
            details.append(
                f'<p class="person-sources"><strong>Information sources</strong><br>{source_links}</p>'
            )
        for key, label in [
            ('scholar', 'Scholar'),
            ('website', 'Website'),
            ('email', 'Email'),
        ]:
            if person.get(key):
                preview.append(label)
        if not preview:
            preview.append('ISP profile link')
        details.append('<div class="person-links">' + ''.join(links) + '</div>')
        topic_items = ''.join(
            f'<li><button type="button" class="topic-tag" data-topic="{e(topic)}" aria-label="Filter by research topic {e(topic)}">{e(topic)}</button></li>'
            for topic in person['topics']
        )
        is_faculty = 'Faculty' in person['categories']
        topics_markup = (
            f'<ul class="person-topics" aria-label="Research topics">{topic_items}</ul>'
            if topic_items
            else '<p class="person-unlisted">Research topics not listed</p>'
            if is_faculty
            else ''
        )
        school = '; '.join(person['schools']) or (
            'School / department not listed' if is_faculty else ''
        )
        school_markup = f'<p class="person-school">{e(school)}</p>' if school else ''
        # Separate topic-search text (strictly excludes name & role so "Chair", "Haiyi", "Paine", "Lorraine" never leak into topic searches)
        topic_search_blob = ' '.join(
            person['topics']
            + [
                person.get('interests', ''),
                person.get('research_summary', ''),
                person.get('bio', ''),
            ]
        )
        full_search = ' '.join(
            [
                person.get(k, '')
                for k in ('name', 'role', 'interests', 'bio', 'research_summary')
            ]
            + person['schools']
            + person['departments']
            + person['topics']
        )
        attrs = {
            'categories': '|'.join(person['categories']),
            'schools': '|'.join(person['schools']),
            'topics': '|'.join(person['topics']),
            'topic-search': topic_search_blob,
            'search': full_search,
            'name': name,
            'sort-name': name.split()[-1] + ' ' + name,
        }
        data = ' '.join(f'data-{key}="{e(value)}"' for key, value in attrs.items())
        cards.append(
            f'''<article class="person-card" id="person-{e(slug)}" {data}>
<div class="person-overview">{image}<div><p class="person-category">{e(' · '.join(person['categories']))}</p>
<h3>{e(name)}</h3><p class="person-role">{e(person.get('role', ''))}</p></div></div>
{school_markup}{topics_markup}
<details><summary><span>Profile and contacts<span class="directory-sr"> for {e(name)}</span><span class="summary-meta">Includes: {e(' · '.join(preview))}</span></span></summary>{''.join(details)}</details></article>'''
        )

    schools = sorted({school for person in people for school in person['schools']})
    topics = sorted({topic for person in people for topic in person['topics']})
    topic_counts = {
        t: sum(t in p['topics'] for p in people if 'Faculty' in p['categories'])
        for t in topics
    }
    categories = ['Faculty', 'Graduate students', 'Emeriti faculty', 'Staff', 'Alumni']
    cat_counts = {c: sum(c in p['categories'] for p in people) for c in categories}
    cat_options = f'<option value="">All people ({len(people)})</option>' + ''.join(
        f'<option value="{e(c)}">{e(c)} ({cat_counts[c]})</option>' for c in categories
    )
    scope_tabs_html = (
        ''.join(
            f'<button type="button" class="scope-tab" data-category="{e(c)}" aria-pressed="{"true" if c == "Faculty" else "false"}">{e(c)} ({cat_counts[c]})</button>'
            for c in categories
        )
        + f'<button type="button" class="scope-tab" data-category="" aria-pressed="false">All people ({len(people)})</button>'
    )
    topic_chips_html = (
        f'<button type="button" class="topic-chip" data-topic-chip="" aria-pressed="true">All research areas ({cat_counts["Faculty"]})</button>'
        + ''.join(
            f'<button type="button" class="topic-chip" data-topic-chip="{e(t)}" aria-pressed="false">{e(t)} ({topic_counts[t]})</button>'
            for t in topics
        )
    )

    return f'''<nav class="page-jumps wrap" aria-label="On this page"><span>On this page ↓</span><a href="#explorer-title">Search by name or topic</a><a href="#topic-chip-bar">Research topic filters ({len(topics)})</a><a href="#people-results">Faculty &amp; people directory ({len(people)})</a><a href="#directory-notes">About this information</a></nav>
<section class="section wrap people-directory" aria-labelledby="explorer-title">
<div class="directory-intro"><div><p class="eyebrow">ISP community &amp; research advising</p><h2 id="explorer-title">Search faculty by partial name or research area</h2></div>
<p>Search by partial first or last name (for example, <em>Brus</em>, <em>Lit</em>, <em>Kov</em>, or <em>HJ Park</em>), search by research topic or acronym (for example, <em>AI</em>, <em>NLP</em>, <em>ML</em>, <em>CV</em>, or <em>HCI</em>), or select a research area chip below.</p></div>
<p id="people-feedback" hidden></p>
<div class="scope-tabs" role="group" aria-label="Directory scope">{scope_tabs_html}</div>
<form class="directory-controls" role="search" aria-label="Faculty Explorer search and filters">
<div class="directory-search"><label for="people-name">Partial name search</label><input type="search" id="people-name" name="name" placeholder="Try Brus, Lit, Kov, Yu Ru, or HJ Park" autocomplete="off"></div>
<div class="directory-topic-search"><label for="people-topic-search">Topic or research area search</label><input type="search" id="people-topic-search" name="topic_q" placeholder="Try AI, NLP, ML, CV, HCI, or biomedicine" autocomplete="off"></div>
<div><label for="people-category">Directory scope</label><select id="people-category" name="category">{cat_options}</select></div>
<div><label for="people-topic">Research topic category</label><select id="people-topic" name="topic" aria-describedby="people-filter-help">{options(topics, 'All topics')}</select></div>
<div><label for="people-school">Pitt school</label><select id="people-school" name="school" aria-describedby="people-filter-help">{options(schools, 'All schools')}<option value="unlisted">School not listed</option></select></div>
<div><label for="people-sort">Sort by name</label><select id="people-sort" name="sort"><option value="last">Last name A–Z</option><option value="first">First name A–Z</option></select></div>
<button type="button" id="people-reset">Reset / Show all people</button></form>
<div class="topic-chip-section" id="topic-chip-bar">
<p class="topic-chip-label"><strong>Filter by research area:</strong> Select a topic chip or click any topic tag on a faculty card.</p>
<div class="topic-chips" role="group" aria-label="Research topic filter chips">{topic_chips_html}</div>
</div>
<p id="people-filter-help">Partial-name and topic/research-area search work across all directory scopes. Curated topic chips and school filters highlight faculty appointments.</p>
<div class="directory-status"><p id="people-count" role="status" aria-live="polite" aria-atomic="true">{len(people)} people in the directory</p><a href="#directory-notes">About this information ↓</a></div>
<div id="people-hidden-banner" hidden><p id="people-hidden-text"></p><div class="hidden-category-pills"><button type="button" data-switch-category="Graduate students">Graduate students ({cat_counts['Graduate students']})</button><button type="button" data-switch-category="Alumni">Alumni ({cat_counts['Alumni']})</button><button type="button" data-switch-category="Emeriti faculty">Emeriti faculty ({cat_counts['Emeriti faculty']})</button><button type="button" data-switch-category="Staff">Staff ({cat_counts['Staff']})</button><button type="button" class="show-all-pill" data-switch-category="">Show all {len(people)} people</button></div></div>
<noscript><p>All profiles are listed below. Use your browser’s Find command to search for a name or research topic; profile details and links work without JavaScript.</p></noscript>
<div id="people-empty" hidden><p id="people-empty-message"><strong>No people match these filters.</strong> Check the spelling or remove a filter. Missing topic or school information does not mean a person has no expertise or affiliation.</p><button type="button" id="people-search-all" hidden>Show matching people across all directories</button><button type="button" id="people-clear-search">Clear search filters</button> <button type="button" id="people-empty-reset">Reset / Show all people</button></div>
<div class="people-grid" id="people-results">{''.join(cards)}</div>
<details id="directory-notes"><summary>About the Faculty Explorer information</summary><p>School and research-topic labels cover the faculty directory, while topic and research-area search also matches documented research interests across graduate students, emeriti faculty, and alumni. Topic labels summarize listed research interests; they are a browsing aid, not a complete research history. Unlisted fields do not mean a person has no affiliation or expertise.</p><p>Profiles come from the ISP directory, with selected additions from linked Pitt and faculty pages. The listed schools group departments and may not include every appointment. Check the linked sources and contact faculty about current research and advising availability.</p></details>
</section>'''
