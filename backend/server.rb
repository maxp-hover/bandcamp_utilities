require 'sinatra'
require 'active_support/all'
require 'pry-byebug'
require 'json'
require 'sinatra/cross_origin'
require 'rest_client'
require 'nokogiri'

configure do
  enable :cross_origin
end

before do
  response.headers['Access-Control-Allow-Origin'] = '*'
end

def get_album_attrs(url)
  return if url == "undefined"
  body = RestClient.get url
  doc = Nokogiri.parse body
  album_name = doc.css("#name-section .trackTitle").text.strip
  artist_name = doc.css("#name-section [itemprop='byArtist']").text.strip
  tracks = doc.css(".track_list .track_row_view").map do |track|
    name = track.css(".title a").text.strip
    time = track.css(".title .time").text.strip
    {
      name: name,
      time: time,
    }
  end
  {
    album: album_name,
    artist: artist_name,
    tracks: tracks
  }
end

get '/album' do
  url = params[:url]

  get_album_attrs(url).to_json
end
