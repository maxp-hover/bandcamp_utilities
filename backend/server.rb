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

$redis = Redis.new(url: ENV["REDIS_URL"] || "redis://localhost:6379/2")

configure do
  enable :cross_origin
end

before do
  response.headers['Access-Control-Allow-Origin'] = '*'
end

def redis_key(artist:, album:)
  key = { artist: artist, album: album }.to_json
end

def redis_set(key, &blk)
  val = blk.call
  $redis.set(key, val.to_json)
  val
end

def redis_get_or_set(key, &blk)
  # byebug
  $redis.get(key)&.tap do |found_val|
    puts "CACHED".red
    return JSON.parse(found_val)
  end
  redis_set(key, &blk)
end

def get_soundscrape_data(href)
  data = JSON.parse(
    `python soundscrape/soundscrape_modified.py #{href}`
  )
  track_infos = data["trackinfo"].map do |track|
    track
  end
  {
    album: data["album_name"],
    artist: data["artist"],
    href: href,
    tags: data["genre"].split(" "),
    total_seconds: data["trackinfo"].sum do |track|
      track["duration"]
    end.to_i,
    tracks: data["trackinfo"].reject do |track|
      track["unreleased_track"]
    end.map do |track|
      {
        track_href: track["file"]["mp3-128"],
        name: track['title']
      }
    end
  }
end

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

get '/lookup_album' do
  required_keys = if params[:skip_cache]
    %w{href}
  else
    %w{href album artist}
  end
  valid_req = required_keys.all? do |key|
    params.key?(key)
  end

  byebug unless valid_req
  # raise("INVALID REQ") unless valid_req

  # unless valid_req
  #   puts "INVALID REQUEST".red
  #   return "undefined"
  # end
  lookup_album(**params.to_h.symbolize_keys).to_json
end

get '/player' do
  slim :player
end

get '/clear_db' do
  $redis.flushdb
  { keys: $redis.keys }.to_json
end
