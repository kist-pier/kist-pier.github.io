#!/usr/bin/env python3
"""Refresh citation counts only for explicitly linked, existing publications."""
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
import os
import sys
import tempfile

import bibtexparser
import yaml
from scholarly import scholarly

ROOT = Path(__file__).resolve().parents[1]


def collect_citations(entries, publications, scholar_user_id):
    """Require all linked papers before replacing the last successful cache."""
    linked = {
        f"{scholar_user_id}:{entry['google_scholar_id']}": entry
        for entry in entries if entry.get('google_scholar_id')
    }
    if not linked:
        raise ValueError('No publications have a Google Scholar ID.')
    found = {}
    for publication in publications:
        pub_id = publication.get('author_pub_id') or publication.get('pub_id')
        if pub_id and ':' not in pub_id:
            pub_id = f'{scholar_user_id}:{pub_id}'
        if pub_id not in linked:
            continue
        count = publication.get('num_citations')
        if type(count) is not int or count < 0:
            raise ValueError(f'Missing or invalid citation count: {pub_id}')
        entry = linked[pub_id]
        found[pub_id] = {
            'title': entry['title'],
            'year': entry.get('year', 'Unknown Year'),
            'citations': count,
        }
    missing = linked.keys() - found.keys()
    if missing:
        raise ValueError(f'Scholar response missing linked papers: {sorted(missing)}')
    return found


def main():
    with (ROOT / '_data/socials.yml').open() as stream:
        scholar_user_id = yaml.safe_load(stream)['scholar_userid']
    with (ROOT / '_bibliography/papers.bib').open() as stream:
        entries = bibtexparser.load(stream).entries
    scholarly.set_timeout(15)
    scholarly.set_retries(3)
    author = scholarly.fill(scholarly.search_author_id(scholar_user_id), sections=['publications'])
    papers = collect_citations(entries, author['publications'], scholar_user_id)
    data = {
        'metadata': {'last_updated': datetime.now(ZoneInfo('Asia/Seoul')).date().isoformat()},
        'papers': papers,
    }
    destination = ROOT / '_data/citations.yml'
    content = yaml.safe_dump(data, allow_unicode=True, sort_keys=True, width=1000)
    if destination.exists() and destination.read_text() == content:
        print('Citation cache is already current.')
        return
    # A failed fetch or write must never truncate the last successful cache.
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=destination.parent, delete=False) as stream:
            temporary = stream.name
            stream.write(content)
        os.chmod(temporary, 0o644)
        os.replace(temporary, destination)
    finally:
        if temporary and os.path.exists(temporary):
            os.unlink(temporary)
    print(f'Updated citation counts for {len(papers)} existing publications.')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'Citation update failed; existing cache retained: {error}', file=sys.stderr)
        sys.exit(1)
