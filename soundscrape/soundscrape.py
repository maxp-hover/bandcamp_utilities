#! /usr/bin/env python
from __future__ import unicode_literals

import argparse
import demjson
import json
import os
import re
import requests
import sys
import urllib

from clint.textui import colored, puts, progress

def main():
    print(demjson.encode(get_bandcamp_metadata(sys.argv[1])))

def get_bandcamp_metadata(url):
    """
    Read information from the Bandcamp JavaScript object.
    The method may return a list of URLs (indicating this is probably a "main" page which links to one or more albums),
    or a JSON if we can already parse album/track info from the given url.
    The JSON is "sloppy". The native python JSON parser often can't deal, so we use the more tolerant demjson instead.
    """
    request = requests.get(url)
    try:
        sloppy_json = request.text.split("var TralbumData = ")
        sloppy_json = sloppy_json[1].replace('" + "', "")
        sloppy_json = sloppy_json.replace("'", "\'")
        sloppy_json = sloppy_json.split("};")[0] + "};"
        sloppy_json = sloppy_json.replace("};", "}")
        output = demjson.decode(sloppy_json)
    # if the JSON parser failed, we should consider it's a "/music" page,
    # so we generate a list of albums/tracks and return it immediately
    except Exception as e:
        regex_all_albums = r'<a href="(/(?:album|track)/[^>]+)">'
        all_albums = re.findall(regex_all_albums, request.text, re.MULTILINE)
        album_url_list = list()
        for album in all_albums:
            album_url = re.sub(r'music/?$', '', url) + album
            album_url_list.append(album_url)
        return album_url_list
    # if the JSON parser was successful, use a regex to get all tags
    # from this album/track, join them and set it as the "genre"
    regex_tags = r'<a class="tag" href[^>]+>([^<]+)</a>'
    tags = re.findall(regex_tags, request.text, re.MULTILINE)
    # make sure we treat integers correctly with join()
    # according to http://stackoverflow.com/a/7323861
    # (very unlikely, but better safe than sorry!)
    output['genre'] = ' '.join(s for s in tags)
    # make sure we always get the correct album name, even if this is a
    # track URL (unless this track does not belong to any album, in which
    # case the album name remains set as None.
    output['album_name'] = None
    regex_album_name = r'album_title\s*:\s*"([^"]+)"\s*,'
    match = re.search(regex_album_name, request.text, re.MULTILINE)
    if match:
        output['album_name'] = match.group(1)

    try:
        artUrl = request.text.split("\"tralbumArt\">")[1].split("\">")[0].split("href=\"")[1]
        output['artFullsizeUrl'] = artUrl
    except:
        puts_safe(colored.red("Couldn't get full artwork") + "")
        output['artFullsizeUrl'] = None

    return output

main()
