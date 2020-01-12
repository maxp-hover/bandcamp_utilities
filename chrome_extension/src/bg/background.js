
// =======================================================
// Constants - must update BACKEND_HOST when deploying
// TODO: find a way around this
// =======================================================

// BACKEND_HOST = "https://bandcamp-utils-backend.herokuapp.com"
BACKEND_HOST = "http://localhost:9292"
PLAYLIST_KEY = "bandcamp_utils_playlist_items"

// =======================================================
// Looks up an album's details from the backend
// =======================================================

function lookupAlbum ({params}) {
  var url = new URL(`${BACKEND_HOST}/lookup_album`)
  Object.keys(params).forEach((key) => {
    url.searchParams.append(key, params[key])
  })

  return fetch(url.href).then(r => r.text())
}

// =======================================================
// Looks up the current playlist items from local storage.
// =======================================================

function getPlaylistItems () {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([PLAYLIST_KEY], (result) => {
      resolve(result[PLAYLIST_KEY] || {content: []})
    })
  })
}

// =======================================================
// Sends a message to extension pages, instructing them
// to reload the playlist because it has changed.
// =======================================================

function SendRefreshCmd() {
  chrome.storage.local.get(['playlist_data'], (data) => {
    if (!data.playlist_data) { return }
    chrome.tabs.sendMessage(
      data.playlist_data.playlist_tab_id,
      {params: {}, msgType: "RefreshPlaylist"}
    );
  })
}

// =======================================================
// Adds an album to the playlist
// =======================================================

function addToPlaylist ({params}) {

  return new Promise((resolve, reject) => {
    getPlaylistItems().then((items) => {
      isDup = items.content.filter((item) => {
        return (
          item.album  == params.album &&
          item.artist == params.artist
        )
      }).length > 0
      if (isDup) {
        reject("already in playlist")
      } else {
        items.content.push(params)
        obj = {}
        obj[PLAYLIST_KEY] = items
        chrome.storage.local.set(obj, () => {
          SendRefreshCmd()
          resolve()
        })
      }
    })
  })
}

// =======================================================
// Message listener - receives messages from extension pages
// Messages can be of type:
// "lookupAlbum" or "addToPlaylist", or "pageReady"
// =======================================================

chrome.extension.onMessage.addListener(
  function({params, msgType}, sender, sendResponse) {

    if (msgType == "lookupAlbum") {
      lookupAlbum({params})
      .then(response => {
        sendResponse(response);
      })
    } else if (msgType == "addToPlaylist") {
      addToPlaylist({params})
      .then(() => {
        sendResponse("added")
      })
      .catch((err) => {
        sendResponse({error: "already in playlist"})
      })
    } else {
      // TODO: change this to require "pageReady" msgType
      sendResponse("page is ready")
    }

    // Inform Chrome that we will make a delayed sendResponse
    // https://github.com/mozilla/webextension-polyfill/issues/130#issuecomment-484772327
    return true
  }
);

// =======================================================
// Listener to inject the playlist_player script
// Checks the tabId of every page that's opened in the browser,
// and executes the script if it matches the playlist_tab_id
// in localstrage (this happens in browser_action.js)
// =======================================================

chrome.webNavigation.onCompleted.addListener(function(details) {
    chrome.storage.local.get(
      ['playlist_data'],
      ({playlist_data}) => {
        if (!playlist_data) { return }
        if (
          (details.tabId == playlist_data.playlist_tab_id) &&
          details.url == `${BACKEND_HOST}/player`
        ) {
          chrome.tabs.executeScript(
            details.tabId,
            {file: 'js/jquery/jquery.js'}
          );
          chrome.tabs.executeScript(
            details.tabId,
            {file: 'src/inject/playlist_player.js'}
          );
        }
      }
    )

}, {
  // TODO: should probably add some host restrictions:

  // url: [{
  //     // Runs on example.com, example.net, but also example.foo.com
  //     hostContains: '.example.'
  // }],
});
