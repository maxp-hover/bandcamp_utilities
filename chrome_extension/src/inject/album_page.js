
// =======================================================
// Promise which delays execution until the page is ready
// =======================================================

function waitForPageReady () {
  return new Promise((resolve, reject) => {
    chrome.extension.sendMessage({}, function(response) {
      var readyStateCheckInterval = setInterval(function() {
        if (document.readyState === "complete") {
          clearInterval(readyStateCheckInterval);
          resolve()
        }
      }, 10)
    })
  })
}

// =======================================================
// Entry point, called when the page is ready.
// =======================================================

function Init () {
  LookupCurrentAlbum().then((data) => {
    AddButton(data)
  })
}

// =======================================================
// Gets basic info about the album by scraping the DOM.
// Sends a message to background.js to lookup more info.
// TODO: this can all be done client side
// =======================================================

function LookupCurrentAlbum() {
  return new Promise((resolve, reject) => {
    album = $("#name-section .trackTitle").text().trim()
    artist = $("#name-section [itemprop='byArtist'] a").text().trim()

    chrome.extension.sendMessage(
      {
        params: {
          href: location.href,
          album: album,
          artist: artist
        },
        msgType: "lookupAlbum"
      },
      (response) => { resolve(JSON.parse(response)) }
    )
  })
}

// =======================================================
// Makes a button to add this album to the playlist
// =======================================================

function AddButton (data) {
  $trackView = $(".trackView")
  $btn = $("<button>").text("add to playlist")
  $trackView.prepend($btn)
  $btn.on("click", (e) => {
    AddToPlaylist(data)
  })
}

// =======================================================
// Adds this album to the playlist.
// Sends a message to background.js
// =======================================================

function AddToPlaylist (data) {
  chrome.extension.sendMessage(
    {
      params: data,
      msgType: "addToPlaylist"
    },
    (response) => {
      alert(response)
    }
  )
}

// =======================================================
// Initialization code
// =======================================================

waitForPageReady().then(Init)
