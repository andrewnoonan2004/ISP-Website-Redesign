"""Render an accessible explorer from the ISP directory and curated browse labels."""
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
        f'<option value="{e(value)}">{e(value)}</option>' for value in values)


def render():
    people = list(load_people())
    cards = []
    for person in people:
        name, slug = person['name'], person['slug']
        image = (f'<img src="{e(person["image"])}" alt="{e(name)}" width="88" height="88" loading="lazy">'
                 if person.get('image') else '<div class="portrait-missing" aria-hidden="true">No photo</div>')
        links = [f'<a href="{e(person["source"])}">ISP profile<span class="directory-sr"> for {e(name)}</span> ↗</a>']
        for key, label in [('scholar', 'Google Scholar'), ('website', 'Personal website'), ('email', 'Email')]:
            if person.get(key):
                links.append(f'<a href="{e(person[key])}">{label}<span class="directory-sr"> for {e(name)}</span> ↗</a>')
        details = []
        if person['departments']:
            details.append('<p><strong>Department / unit</strong><br>' + e('; '.join(person['departments'])) + '</p>')
        if person.get('interests'):
            details.append(f'<p><strong>Research interests</strong><br>{e(person["interests"])}</p>')
        if person.get('research_summary'):
            details.append(f'<p><strong>Research overview</strong><br>{e(person["research_summary"])}</p>')
        if person.get('bio'):
            details.append(f'<p><strong>From the ISP profile</strong><br>{e(person["bio"])}</p>')
        sources = person.get('sources', [])
        if sources:
            source_links = ' · '.join(f'<a data-source-link href="{e(s["url"])}">{e(s["label"])} ↗</a>' for s in sources)
            details.append(f'<p class="person-sources"><strong>Information sources</strong><br>{source_links}</p>')
        details.append('<div class="person-links">' + ''.join(links) + '</div>')
        topics = ''.join(f'<li>{e(topic)}</li>' for topic in person['topics'])
        topics = f'<ul class="person-topics" aria-label="Research topics">{topics}</ul>' if topics else '<p class="person-unlisted">Research topics not listed</p>'
        school = '; '.join(person['schools']) or 'School / department not listed'
        search = ' '.join([person.get(k, '') for k in ('name', 'role', 'interests', 'bio', 'research_summary')] + person['schools'] + person['departments'] + person['topics'])
        attrs = {'categories': '|'.join(person['categories']), 'schools': '|'.join(person['schools']),
                 'topics': '|'.join(person['topics']), 'search': search,
                 'name': name, 'sort-name': name.split()[-1] + ' ' + name}
        data = ' '.join(f'data-{key}="{e(value)}"' for key, value in attrs.items())
        cards.append(f'''<article class="person-card" id="person-{e(slug)}" {data}>
<div class="person-overview">{image}<div><p class="person-category">{e(' · '.join(person['categories']))}</p>
<h3>{e(name)}</h3><p class="person-role">{e(person.get('role', ''))}</p></div></div>
<p class="person-school">{e(school)}</p>{topics}
<details><summary>Profile and contacts<span class="directory-sr"> for {e(name)}</span></summary>{''.join(details)}</details></article>''')
    schools = sorted({school for person in people for school in person['schools']})
    topics = sorted({topic for person in people for topic in person['topics']})
    categories = ['Faculty', 'Graduate students', 'Staff', 'Alumni', 'Emeriti faculty']
    return f'''<section class="section wrap people-directory" aria-labelledby="explorer-title">
<div class="directory-intro"><div><h2 id="explorer-title">Explore faculty expertise</h2></div>
<p>Find research that fits your interests. Filter the overview, then open a profile for research details and contacts.</p></div>
<form class="directory-controls" role="search" aria-label="People directory" hidden>
<div class="directory-search"><label for="people-search">Name or keyword</label><input type="search" id="people-search" placeholder="Try language, learning, or a name" autocomplete="off"></div>
<div><label for="people-topic">Research topic</label><select id="people-topic">{options(topics, 'All topics')}</select></div>
<div><label for="people-school">School</label><select id="people-school">{options(schools, 'All schools')}<option value="unlisted">School not listed</option></select></div>
<div><label for="people-category">Directory</label><select id="people-category">{options(categories, 'All people')}</select></div>
<div><label for="people-sort">Sort by name</label><select id="people-sort"><option value="last">Last name A–Z</option><option value="first">First name A–Z</option></select></div>
<button type="button" id="people-reset">Reset filters</button></form>
<div class="directory-status"><p id="people-count" role="status" aria-live="polite" aria-atomic="true">{len(people)} people in the directory</p><a href="#directory-notes">About this information ↓</a></div>
<noscript><p>All profiles are listed below. Use your browser’s Find command to search for a name; profile details and links work without JavaScript.</p></noscript>
<p id="people-empty" hidden>No people match these filters. Try a broader topic or school, or reset the filters to see everyone.</p>
<div class="people-grid">{''.join(cards)}</div>
<details id="directory-notes"><summary>About the directory information</summary><p>School and research-topic labels currently cover the faculty directory. Topic labels summarize the listed research interests; they are a browsing aid, not a complete research history. Unlisted fields do not mean a person has no affiliation or expertise.</p><p>Profiles come from the ISP directory, with selected additions from linked Pitt and faculty pages. The listed schools group departments and may not include every appointment. Check the linked sources and contact faculty about current research and advising availability.</p></details>
</section>'''
