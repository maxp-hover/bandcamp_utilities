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

function setGlobals () {
  window.AlbumData = []
  window.$extensionBox = $("#extension-box")
  window.$loading_box = $("#loading-box")
  window.MusicPlayer = null
  window.$album_title = null
  window.$messageBox = $("#message-box")
  window.CurrentTrackIdx = 0
  window.$embed_box = $("#embed-box")
  window.$playBtn = null
  window.UserHasInteracted = false // Enables 'autoplay'
  window.$track_title = null
  window.PLAYLIST_KEY = "bandcamp_utils_playlist_items"
}

function initPage () {
  $(()=>{
    setGlobals()
    getAlbumData().then((albumData) => {
      $loading_box.remove()
      window.AlbumData = albumData
      window.$playBtn = AddPlayBtn()
      styleExtensionBox()
      window.MusicPlayer = addMusicPlayer($extensionBox, AlbumData)
      addMusicPlayerAlbumInfo()
      addMusicPlayerEventHandlers()
      addMusicPlayerAlbumInfo()
      PlayTrack(0)
    })
  })
}

function AddPlayBtn() {
  $btn = $("<button>").text("START")
  $extensionBox.append($btn)
  $btn.on("click", (e) => {
    window.UserHasInteracted = true;
    MusicPlayer.$player.show()
    MusicPlayer.$player[0].play()
    $btn.remove()
  })
}

function PlayTrack(idx) {
  window.CurrentTrackIdx = idx
  currentTrack = AlbumData.tracks[idx]
  if (currentTrack) {
    MusicPlayer.$source.attr("src", currentTrack.track_href)
    $track_title.text(currentTrack.name)

    // Autoplay is diabled by chrome, so this wont work unless the user has interacted with the page.
    // That's the whole reason I'm using iframes and a persistent "host" page with the Audio player
    // https://developers.google.com/web/updates/2017/09/autoplay-policy-changes
    MusicPlayer.$player[0].load()
    if (UserHasInteracted) { MusicPlayer.$player[0].play() }

    $iframe = $("<iframe>").css({width: '100vw', height: '100vh'}).attr("src", AlbumData.href)
    $embed_box.empty()
    $embed_box.prepend($iframe)
  } else {
    gotoNextPlaylistItem()
  }
}

function getAlbumData() {
  return new Promise((resolve, reject) => {
    getPlaylistItems().then((items) => {
      // setTimeout(() => {
        // debugger
        current = items.content[0]
        if (current) {
          chrome.extension.sendMessage(
            {
              msgType: "lookupAlbum",
              params: {
                href: current.href,
                artist: current.artist,
                album: current.album,
                skip_cache: true,
              }
            },
            (response) => {
              resolve(JSON.parse(response))
            }
          )
        }

      // }, 5000)
    })
  })
}

function addMusicPlayerAlbumInfo() {
  $album_title.text(`${AlbumData.artist} - ${AlbumData.album}`)
}

function addMusicPlayer ($extensionBox, AlbumData) {
  window.$album_title = $("<div class='album_title'>")
  window.$track_title = $("<div class='track_title'>")
  $extensionBox.prepend($track_title)
  $extensionBox.prepend($album_title)
  $player = $("<audio controls>")
  $source = $("<source>")
  $player.append($source)
  $extensionBox.append($player)
  $player.hide()
  return { $player, $source }
}

function addMusicPlayerEventHandlers () {
  MusicPlayer.$player[0].onended = () => {
    // PlayTrack(CurrentTrackIdx + 1)
    gotoNextPlaylistItem()
  }
}

function getPlaylistItems () {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([PLAYLIST_KEY], (result) => {
      resolve(result[PLAYLIST_KEY] || {content: []})
    })
  })
}

function setPlaylistItems (val) {
  return new Promise((resolve, reject) => {
    obj = {}
    obj[PLAYLIST_KEY] = val
    chrome.storage.local.set(obj, (result) => {
      resolve(result)
    })
  })
}

function gotoNextPlaylistItem () {
  getPlaylistItems().then((items) => {
    remaining = items.content.slice(1,)
    setPlaylistItems({content: remaining})
    if (remaining.length > 0) {
      window.AlbumData = remaining[0]
      addMusicPlayerAlbumInfo()
      PlayTrack(0)
      $iframe = $("<iframe>").css({width: '100vw', height: '100vh'}).attr("src", AlbumData.href)
      $embed_box.empty()
      $embed_box.prepend($iframe)
    } else {
      $extensionBox.remove()
      $messageBox.text("No more playlist items.")
    }
  })
}

function styleExtensionBox() {
  $extensionBox.css({
    width: "100%",
    height: "100px",
    border: "5px solid black"
  })
}

waitForPageReady().then(initPage)
