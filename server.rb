require 'sinatra'
require 'active_support/all'
require 'byebug'
require 'json'
require 'sinatra/cross_origin'
require 'rest_client'
require 'nokogiri'
require 'redis'

$redis = Redis.new(url: ENV["REDIS_URL"] || "redis://localhost:6379/2")

configure do
  enable :cross_origin
end

before do
  response.headers['Access-Control-Allow-Origin'] = '*'
end

def redis_get_or_set(key, &blk)
  $redis.get(key)&.tap { |found_val| return JSON.parse(found_val) }
  val = blk.call
  $redis.set(key, val.to_json)
  val
end

def lookup_album(href:, album:, artist:)
  return if href == "undefined"
  key = { artist: artist, album: album }.to_json
  redis_get_or_set(key) do
    body = RestClient.get href
    doc = Nokogiri.parse body
    tags = doc.css("a.tag").map(&:text)
    # album_name = doc.css("#name-section .trackTitle").text.strip
    # artist_name = doc.css("#name-section [itemprop='byArtist']").text.strip
    total_seconds = 0
    tracks = doc.css(".track_list .track_row_view").map do |track|
      name = track.css(".title a").text.strip
      time = track.css(".title .time").text.strip
      next if time.blank? # not a streamable track!
      minutes, seconds = time.split(":").map(&:to_i)
      total_seconds += (seconds + (minutes * 60))
      {
        name: name,
        time: time,
      }
    end
    {
      tracks: tracks,
      total_seconds: total_seconds,
      album: album,
      artist: artist,
      tags: tags,
      href: href
    }
  end
end

get '/lookup_album' do
  album_attr_keys = %w{href artist album}
  album_attrs = params.slice *%w{href artist album}
  unless album_attr_keys.all?(&album_attrs.method(:key?))
    return "undefined".to_json
  end
  lookup_album(**album_attrs.to_h.symbolize_keys).to_json
end

get '/clear_db' do
  $redis.flushdb
  { keys: $redis.keys }.to_json
end
