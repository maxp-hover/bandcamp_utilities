// document.getElementById('title').addEventListener('click', (e) => {
//   debugger
// });

PLAYLIST_KEY = "bandcamp_utils_playlist_items"
$playlist_items = $("#playlist-items")
BACKEND_HOST = "http://localhost:4567"

function getPlaylistItems () {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([PLAYLIST_KEY], (result) => {
      resolve(result[PLAYLIST_KEY] || {content: []})
    })
  })
}

$('#load-playlist').on('click', (e) => {
  $playlist_items.empty()
  getPlaylistItems().then((items) => {
    (items.content).forEach((item) => {
      $li = $("<li class='playlist-item'>").text(item.href)
      $playlist_items.append($li)
    })
  })
});

$('#clear-playlist').on('click', (e) => {
  obj = {}
  obj[PLAYLIST_KEY] = {}
  chrome.storage.local.remove(PLAYLIST_KEY, (result) => {})
  debugger
});

$('#start-playlist').on('click', (e) => {
  if ($playlist_items.length > 0) {
    // $firstItem = $playlist_items.find(".playlist-item").eq(0)
    // url = $firstItem.text()
    chrome.windows.create(
      {
        'url':    `${BACKEND_HOST}/player`,
        'type':   'popup',
        'width':  Math.floor(screen.availWidth  / 2),
        'height': Math.floor(screen.availHeight / 2),
        'left':   Math.floor(screen.availWidth  / 2),
        'top':    0
      },
      function(window) {
        tab = window.tabs[0]

        debugger
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


// chrome.extension.sendMessage({params, msgType}, (apiResponse) => {
// })

// chrome.extension.onMessage.addListener(
//   function({params, msgType}, sender, sendResponse) {
//     debugger
//   }
// )

