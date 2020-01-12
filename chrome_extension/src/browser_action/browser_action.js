
// =======================================================
// Constants / Globals
// Must update BACKEND_HOST when deploying
// TODO: find a way around this
// =======================================================

PLAYLIST_KEY = "bandcamp_utils_playlist_items"
BACKEND_HOST = "http://localhost:9292"

window.PLAYER_TAB_ID = null
window.CURRENT_PLAYLIST_ITEMS = {}

$playlist_items = $("#playlist-items")

// =======================================================
// Gets the current playlist items from local storage
// TODO: call the background.js method instead?
// =======================================================

function getPlaylistItems () {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([PLAYLIST_KEY], (result) => {
      resolve(result[PLAYLIST_KEY] || {content: []})
    })
  })
}

// =======================================================
// Replaces the playlist object in local storage.
// Triggers SendRefreshCmd() to alert the player page.
// =======================================================

function setPlaylistItems (val) {
  return new Promise((resolve, reject) => {
    obj = {}
    obj[PLAYLIST_KEY] = val
    chrome.storage.local.set(obj, (result) => {
      SendRefreshCmd()
      resolve(result)
    })
  })
}

// =======================================================
// Sends a "RefreshPlaylist" command to background.js
// This will get forwarded to the player page.
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
// Replaces the playlist object in local storage
// according to the state in the DOM.
// This gets triggered when a user reorders the playlist.
// Sends the refresh command via setPlaylistIems
// =======================================================

function setPlaylistItemsFromList () {
  playlist_items = $(".playlist-item:not(.ui-sortable-placeholder)")
  newList = $.map(playlist_items, (item) => {
    return CURRENT_PLAYLIST_ITEMS[$(item).attr("album-artist")]
  })
  setPlaylistItems({content: newList})
}

// =======================================================
// Loads / reloads the playlist and draws it on the DOM.
// Adds event listeners.
// =======================================================

function LoadPlaylist () {
  $playlist_items.empty()
  getPlaylistItems().then((items) => {

    // Replace the value of the global constant
    window.CURRENT_PLAYLIST_ITEMS = {}
    items.content.forEach((item) => {
      CURRENT_PLAYLIST_ITEMS[`${item.artist} - ${item.album}`] = item
    })

    // Draw the playlist items on the page
    items.content.forEach((item) => {
      var $listItemContainer = $("<div>")
      $listItemDeleteBtn = $("<button>").text("X").css("display", "inline-block")
      $listItem = $("<div class='playlist-item'>")
        .text(`${formatTime(item.total_seconds)}: ${item.artist} - ${item.album}`)
        .attr("album-artist", `${item.artist} - ${item.album}`)
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
// Utility method for displaying a duration as a hour:minute:second string
// TODO: can this be moved to some shared location?
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
// Adds drag-n-drop to the playlist items list
// =======================================================

function addJquerySortable() {
  $(() => {
    console.log("here")
    $("#playlist-items").sortable({
      scroll: false,
      update: (e, ui) => {
        setPlaylistItemsFromList()
      }
    })
    $("#playlist-items").disableSelection()
  })
}

// =======================================================
// Event listener for the 'clear playlist' button
// =======================================================

$('#clear-playlist').on('click', (e) => {
  obj = {}
  obj[PLAYLIST_KEY] = {}
  chrome.storage.local.remove(PLAYLIST_KEY, (result) => {})
  SendRefreshCmd()
  LoadPlaylist()
});

// =======================================================
// Event listener for the 'start playlist' button
// Launches the player window and sets playlist_tab_id in localstorage.
// Javascript is injected by background.js
// =======================================================

$('#start-playlist').on('click', (e) => {
  if ($playlist_items.length > 0) {
    chrome.windows.create(
      {
        'url':    `${BACKEND_HOST}/player`,
        'type':   'normal',
        'width':  Math.floor(screen.availWidth  / 2),
        'height': Math.floor(screen.availHeight / 2),
        'left':   Math.floor(screen.availWidth  / 2),
        'top':    0
      },
      function(window) {
        tab = window.tabs[0]

        chrome.storage.local.set(
          {
            playlist_data: {
              playlist_tab_id: tab.id
            }
          },
          (result) => {}
        )

        // Dont need to do this here, it is done in background.js:
        // chrome.tabs.executeScript(tab.id, {file: 'src/inject/playlist_player.js'});
      }
    );
  }
});

////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
// INITIALIZATION CODE!!! //////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
LoadPlaylist()
addJquerySortable()
////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////



