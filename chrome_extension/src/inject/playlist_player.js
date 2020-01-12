
// =======================================================
// Wait until the page is ready.
// TODO: can this be a shared definition?
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
// Global variables
// =======================================================

function setGlobals () {
  window.AlbumData = []
  window.$extensionBox = $("#extension-box")
  window.$loading_box = $("#loading-box")
  window.MusicPlayer = null
  window.$album_title = null
  window.$messageBox = $("#message-box")
  window.CurrentTrackIdx = 0
  window.$embed_box = $("#embed-box")
  window.$playlist_items = $("#playlist-box")
  window.$time_tracker = $("#time-tracker")
  window.$playBtn = null
  window.UserHasInteracted = false // Enables 'autoplay'
  window.$track_title = null
  window.total_time_formatted = null
  window.time_elapsed_current_song = 0
  window.time_elapsed_previous_songs = 0
  window.PLAYLIST_KEY = "bandcamp_utils_playlist_items"
}

// =======================================================
// Initialization function
// =======================================================

function initPage () {
  $(()=>{
    setGlobals()
    getAlbumData().then((albumData) => {
      $loading_box.remove()
      window.AlbumData = albumData
      window.$playBtn = AddPlayBtn()
      window.$skipBtn = AddSkipBtn()
      styleExtensionBox()
      window.MusicPlayer = addMusicPlayer($extensionBox, AlbumData)
      addTimeTracker()
      addMusicPlayerAlbumInfo()
      addMusicPlayerEventHandlers()
      addMusicPlayerAlbumInfo()
      addRedrawListener()
      LoadPlaylist()
      PlayTrack(0)
    })
  })
}

// =======================================================
// Other scripts can tell the player to redraw the playlist
// (if items were added or reordered).
// The message is received and processed here
// =======================================================

function addRedrawListener() {
  chrome.runtime.onMessage.addListener(
    function({params, msgType}, sender, sendResponse) {
      if (msgType == "RefreshPlaylist") {
        LoadPlaylist()
      }
    }
  )
}

// =======================================================
// Utility method for displaying a duration as a hour:minute:second string
// TODO: can there be a shared definition for this?
// =======================================================

function formatTime(seconds) {
  totalHours = Math.floor(seconds / 3600);
  totalMinutes = `${Math.floor((seconds % 3600) / 60)}`.padStart(2, 0);
  totalSeconds = `${seconds % 60}`.padStart(2, 0);
  if (totalHours > 0) {
    return `${totalHours}:${totalMinutes}:${totalSeconds}`
  } else {
    return `${totalMinutes}:${totalSeconds}`
  }
}

// =======================================================
// Adds a little DOM component which tracks the elapsed
// time of the current album. Does this by adding an
// ontimeupdate listener to the audio player.
// =======================================================

function addTimeTracker() {
  MusicPlayer.$player[0].ontimeupdate = () => {
    if (total_time_formatted == null) {
      window.total_time_formatted = formatTime(AlbumData.total_seconds)
    }
    window.time_elapsed_current_song = Math.floor(
      event.currentTarget.currentTime
    )
    elapsedTime = formatTime(time_elapsed_previous_songs + time_elapsed_current_song)
    $time_tracker.text(`${elapsedTime} / ${total_time_formatted}`)

  }
}

// =======================================================
// Loads the current playlist from local storage.
// TODO: use background.js?
// =======================================================

function getPlaylistItems () {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([PLAYLIST_KEY], (result) => {
      resolve(result[PLAYLIST_KEY] || {content: []})
    })
  })
}

// =======================================================
// Replaces the current playlist in local storage.
// TODO: use background.js?
// =======================================================

function setPlaylistItems (val) {
  return new Promise((resolve, reject) => {
    obj = {}
    obj[PLAYLIST_KEY] = val
    chrome.storage.local.set(obj, (result) => {
      chrome.ext
      resolve(result)
    })
  })
}

// =======================================================
// Reloads and redraws the playlist.
// Called when the player page receives a refresh command.
// =======================================================

function LoadPlaylist () {
  $playlist_items.empty()
  getPlaylistItems().then((items) => {

    // Reset the global variable
    window.CURRENT_PLAYLIST_ITEMS = {}
    items.content.forEach((item) => {
      window.CURRENT_PLAYLIST_ITEMS[`${item.artist} - ${item.album}`] = item
    })

    // Draw the playlist items on the page
    items.content.forEach((item) => {
      var $listItemContainer = $("<div>")
      $listItemDeleteBtn = $("<button>").text("X").css("display", "inline-block")
      $listItem = $("<div class='playlist-item'>")
        .text(`${formatTime(item.total_seconds)}: ${item.artist} - ${item.album}`)
        .css("display", "inline-block")

      $tagsInfo = $(`<div>`).addClass('tag-list')
      item.tags.forEach((tag) => {
        $tag = $(`<a>`)
          .addClass('tag')
          .attr("href", `http://bandcamp.com/tag/${tag}`)
          .text(tag)
        $tagsInfo.append($tag)
      })
      $listItem.append($tagsInfo)

      $listItemContainer.append($listItemDeleteBtn)
      $listItemContainer.append($listItem)

      $playlist_items.append($listItemContainer)

      $listItem.on('click', '.tag', (e) => {
        open(e.currentTarget.href)
      })

      $listItemDeleteBtn.on("click", (e) => {
        getPlaylistItems().then((items) => {
          setPlaylistItems(
            {
              content: items.content.filter((_item) => {
                return `${_item.artist} - ${_item.album}` !== `${item.artist} - ${item.album}`
              })
            }
          )
          $listItemContainer.remove();
        })
      })
    })

  })
}

// =======================================================
// Adds a button to start playing the playlist.
// =======================================================

function AddPlayBtn() {
  var $btn = $("<button id='start'>").text("START")
  $extensionBox.append($btn)
  $btn.on("click", (e) => {
    window.UserHasInteracted = true;
    MusicPlayer.$player.show()
    MusicPlayer.$player[0].play()
    $btn.remove()
  })
  return $btn
}

// =======================================================
// Adds a button to skip the current album.
// =======================================================

function AddSkipBtn() {
  var $btn = $("<button id='skip'>").text("SKIP")
  $extensionBox.append($btn)
  $btn.on("click", (e) => {
    if (Object.keys(CURRENT_PLAYLIST_ITEMS).length > 1) {
      gotoNextPlaylistItem()
    } else {
      alert("no more playlist items.")
    }
  })
  return $btn
}

// =======================================================
// Plays a track.
// Note that autoplay is typically disabled by the browser
// and so we must wait for the user to press a "play" button.
// Behind the scenes, this somehow alerts the browser
// that the user has "interacted" with the page, so
// subsequent .play calls will work.
// =======================================================

function PlayTrack(idx) {
  window.time_elapsed_previous_songs += time_elapsed_current_song
  window.time_elapsed_current_song = 0

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

    if (idx == 0) {
      $iframe = $("<iframe>")
        .css({width: '100vw', height: '100vh'})
        .attr("src", AlbumData.href)
      $embed_box.empty()
      $embed_box.prepend($iframe)
    }
  } else {
    gotoNextPlaylistItem()
  }
}

// =======================================================
// Looks up info for an album from background.js
// skip_cache: true is used here because we must get updated
// audio urls - we are actually going to play the tracks, now.
// Bandcamp cycles the urls so they won't work
// after sitting in the cache for a while.
// =======================================================

function lookupAlbum ({href, artist, album}) {
  return new Promise((resolve, reject) => {
    chrome.extension.sendMessage(
      {
        msgType: "lookupAlbum",
        params: {
          href:       href,
          artist:     artist,
          album:      album,
          skip_cache: true,
        }
      },
      (response) => {
        resolve(JSON.parse(response))
      }
    )
  })
}

// =======================================================
// Gets the first item from the playlist.
// Note that items are not removed from the playlist
// until they are done playing.
// =======================================================

function getAlbumData() {
  return new Promise((resolve, reject) => {
    getPlaylistItems().then((items) => {
      // setTimeout(() => {
        // debugger
        current = items.content[0]
        if (current) { lookupAlbum(current).then(resolve) }

      // }, 5000)
    })
  })
}

// =======================================================
// Shows a little text about the currently playing album.
// =======================================================

function addMusicPlayerAlbumInfo() {
  $album_title.text(`${AlbumData.artist} - ${AlbumData.album}`)
}

function addMusicPlayer ($extensionBox, AlbumData) {
  window.$album_title = $("<div class='album_title'>")
  window.$track_title = $("<div class='track_title'>")
  $extensionBox.append($track_title)
  $extensionBox.append($album_title)
  $player = $("<audio controls>")
  $source = $("<source>")
  $player.append($source)
  $extensionBox.append($player)
  $player.hide()
  return { $player, $source }
}

// =======================================================
// Adds an event handler on the audio player
// so we can know when to go to the next track.
// =======================================================

function addMusicPlayerEventHandlers () {
  MusicPlayer.$player[0].onended = () => {
    PlayTrack(CurrentTrackIdx + 1)
  }
}

// =======================================================
// Looks up the current playlist from local storage.
// TODO: use background.js?
// =======================================================

function getPlaylistItems () {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([PLAYLIST_KEY], (result) => {
      resolve(result[PLAYLIST_KEY] || {content: []})
    })
  })
}

// =======================================================
// Replaces the current playlist in localstorage.
// In the context of the playlist player, this occurs
// when the user skips / removes an album or when an album
// finishes playing.
// TODO: use background.js?
// =======================================================

function setPlaylistItems (val) {
  return new Promise((resolve, reject) => {
    obj = {}
    obj[PLAYLIST_KEY] = val
    chrome.storage.local.set(obj, (result) => {
      resolve(result)
    })
  })
}

// =======================================================
// Proceeds from one album to the next.
// Replaces the iframe content to the next album's url.
// =======================================================

function gotoNextPlaylistItem () {
  window.time_elapsed_previous_songs = 0
  window.time_elapsed_current_song = 0

  getPlaylistItems().then((items) => {
    remaining = items.content.slice(1,)
    setPlaylistItems({content: remaining}).then(() => {
      LoadPlaylist()
    })
    if (remaining.length > 0) {
      current = remaining[0]
      lookupAlbum(current).then((response) => {
        window.AlbumData = response
        window.total_time_formatted = formatTime(AlbumData.total_seconds)
        addMusicPlayerAlbumInfo()
        PlayTrack(0)
        $iframe = $("<iframe>")
          .css({width: '100vw', height: '100vh'})
          .attr("src", AlbumData.href)
        $embed_box.empty()
        $embed_box.prepend($iframe)
      })
    } else {
      $extensionBox.remove()
      $messageBox.text("No more playlist items.")
    }
  })
}

// =======================================================
// Adds some styles
// TODO: move this to CSS file?
// =======================================================

function styleExtensionBox() {
  $extensionBox.css({
    width: "100%",
    height: "300px",
    "overflow-y": "scroll",
    border: "5px solid black"
  })
}

// =======================================================
// Initialization
// =======================================================

waitForPageReady().then(initPage)
