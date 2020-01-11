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

function Init () {
  LookupCurrentAlbum().then((data) => {
    AddButton(data)
  })
}

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

function AddButton (data) {
  $trackView = $(".trackView")
  $btn = $("<button>").text("add to playlist")
  $trackView.prepend($btn)
  $btn.on("click", (e) => {
    AddToPlaylist(data)
  })
}

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

waitForPageReady().then(Init)
