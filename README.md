## Bandcamp Utils

This project is split into two parts - a chrome extension and a Sinatra backend.

---

### Backend - Setup

1. Make sure you have Ruby, Bundler, Python, Pip, and Redis installed.
2. `cd backend`
2. Install Ruby dependencies with `bundle install`.
3. Install Python dependencies with `pip install -r requirements.txt`
5. start server with `rackup`

### Frontend - Setup

No setup is necessary for the front end:

1. Go to `about://extensions`
2. Enable developer mode
3. Press "load unpacked extension" (button is on the top left of the screen)
4. Double click into the `chrome_extension/` directory and press OK

### Todos

- (X) Clean up code
- (X) Remove `clear_db` endpoint
- (X) Remove injection vulnerability
- (X) Add accounts system
- (X) Add backend for reviews system
- (X) get redis deployment working with heroku
- (X) auto add items to wishlist
- (X) implement designs from Thyphex
- (X) make it work with more bandcamp locations

### Backend - Deployment

**Note, this is not working currently, I need to update after adding the Redis dependency**

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

