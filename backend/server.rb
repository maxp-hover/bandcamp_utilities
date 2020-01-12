require 'sinatra'
require 'active_support/all'
require 'byebug'
require 'json'
require 'sinatra/cross_origin'
require 'rest_client'
require 'nokogiri'
require 'redis'
require 'slim'
require 'colored'

# =======================================================
# Redis connection - used to cache
# =======================================================

$redis = Redis.new(url: ENV["REDIS_URL"] ||
         "redis://localhost:6379/2")

# =======================================================
# We must enable CORS because we're hitting our backend
# from the browser extension
# =======================================================

configure { enable :cross_origin }
before do
  response.headers['Access-Control-Allow-Origin'] = '*'
end

# =======================================================
# Some helper methods for redis caching
# =======================================================

def redis_key(artist:, album:)
  key = { artist: artist, album: album }.to_json
end

def redis_set(key, &blk)
  val = blk.call
  $redis.set(key, val.to_json)
  val
end

def redis_get_or_set(key, &blk)
  $redis.get(key)&.tap do |found_val|
    return JSON.parse(found_val)
  end
  redis_set(key, &blk)
end

# =======================================================
# Method that uses soundscrape to look up an album's data.
# TODO: remove injection vulnerability
# =======================================================

def get_soundscrape_data(href)
  cmd = "python soundscrape/soundscrape_modified.py #{href}"

  # Backticks run the command in shell:
  data = JSON.parse(`#{cmd}`)

  # The total duration of the album:
  total_seconds = data["trackinfo"].sum do |track|
    track["duration"]
  end.to_i

  # Audio URL and name for each playable track
  track_infos = data["trackinfo"].reject do |track|
    track["unreleased_track"]
  end.map do |track|
    {
      track_href: track["file"]["mp3-128"],
      name: track['title']
    }
  end

  return {
    album:         data["album_name"],
    artist:        data["artist"],
    href:          href,
    tags:          data["genre"].split(" "),
    total_seconds: total_seconds,
    tracks:        track_infos
  }
end

# =======================================================
# Method called by the route handler - gets an album's info.
# It will first check the cache before delegating to
# get_soundscrape_data if needed
# =======================================================

def lookup_album(href:, album: nil, artist: nil, skip_cache: false, **opts)
  if skip_cache
    data = get_soundscrape_data(href)
    key = redis_key(artist: data[:artist], album: data[:album])
    redis_set(key) { get_soundscrape_data(href) }
  else
    key = redis_key(artist: artist, album: album)
    redis_get_or_set(key) { get_soundscrape_data(href) }
  end
end

# =======================================================
# Route handlers
# =======================================================

# Returns JSON data of the requested album
get '/lookup_album' do
  required_keys = if params[:skip_cache]
    %w{href}
  else
    %w{href album artist}
  end

  missing_keys = required_keys.reject do |key|
    params.key?(key)
  end

  if missing_keys.any?
    raise("INVALID REQ - MISSING KEYS #{missing_keys}")
  end

  lookup_album(**params.to_h.symbolize_keys).to_json
end

# Renders HTML/CSS for the playlist player
# Javascript is not served here - rather, it's
# injected onto the page by background.js
# There was a reason this is necessary,
# but I can't remember it right now.
get '/player' do
  slim :player
end

# Used for developer only, to reset the cache
get '/clear_db' do
  $redis.flushdb
  { keys: $redis.keys }.to_json
end
