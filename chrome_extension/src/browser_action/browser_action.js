// document.getElementById('title').addEventListener('click', (e) => {
//   debugger
// });

PLAYLIST_KEY = "bandcamp_utils_playlist_items"
$playlist_items = $("#playlist-items")
BACKEND_HOST = "http://localhost:4567"
CURRENT_PLAYLIST_ITEMS = {}
window.PLAYER_TAB_ID = null

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
      // Alert the player that the playlist has changed
      SendRefreshCmd()
      resolve(result)
    })
  })
}

function SendRefreshCmd() {
  chrome.storage.local.get(['playlist_data'], (data) => {
    if (!data.playlist_data) { return }
    chrome.tabs.sendMessage(
      data.playlist_data.playlist_tab_id,
      {params: {}, msgType: "RefreshPlaylist"}
    );
  })
}

function setPlaylistItemsFromList () {
  playlist_items = $(".playlist-item:not(.ui-sortable-placeholder)")
  newList = $.map(playlist_items, (item) => {
    return CURRENT_PLAYLIST_ITEMS[$(item).attr("album-artist")]
  })
  setPlaylistItems({content: newList})
}

function LoadPlaylist () {
  $playlist_items.empty()
  getPlaylistItems().then((items) => {

    // Caching them here for easy access, in case of jQuery sortable interaction
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
// });
}

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

$('#clear-playlist').on('click', (e) => {
  obj = {}
  obj[PLAYLIST_KEY] = {}
  chrome.storage.local.remove(PLAYLIST_KEY, (result) => {})
  SendRefreshCmd()
  LoadPlaylist()
});

$('#start-playlist').on('click', (e) => {
  if ($playlist_items.length > 0) {
    // $firstItem = $playlist_items.find(".playlist-item").eq(0)
    // url = $firstItem.text()
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
              // playlist_host_url: url
            }
          },
          (result) => {

          }
        )

        // Dont need to do this here:

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



