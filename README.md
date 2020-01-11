## Bandcamp Utils

This project is split into two parts - a chrome extension and a Sinatra backend.

---

### Backend - Setup

1. Make sure you have Ruby, Bundler, Python, Pip, and Redis installed.
2. Install Ruby dependencies with `bundle install`.
3. Install Python dependencies with `pip install -r requirements.txt`
4. Start server with `rackup`

### Backend - Explanation

The backend provides three endpoints:

1. `/lookup_album` looks up artist/album/tracks for a bandcamp album. Can use Redis to cache.
2. `/player` returns a HTML page that hosts the music player (actual behavior is added by chrome extension)
3. `/clear_db` is a developer-only endpoint that clears Redis

### Backend - Deployment

It can be deployed to Heroku, if you follow these steps:

1. Make a new git repo and move the `backend/` folder there (add and commit everything).
2. Add the heroku remote
3. Setup buildpacks:

    ```
      heroku buildpacks:add heroku/ruby
      heroku buildpacks:add --index 1 heroku/python
      heroku buildpacks:set heroku/ruby
    ```

    _Note, that last line is necessary, to declare which one is the "primary" buildpack._

4. Deploy with `git push heroku master`

### Backend - Todos

- (X) Clean up code
- (X) Remove `clear_db` endpoint
- (X) Remove injection vulnerability
- (X) Add accounts system
- (X) Add backend for reviews system

### Frontend - Setup

No setup is necessary for the front end:

1. Go to `about://extensions`
2. Enable developer mode
3. Press "load unpacked extension" (button is on the top left of the screen)
4. Double click into the `chrome_extension/` directory and pres OK

### Frontend - Explanation

