// document.getElementById('title').addEventListener('click', (e) => {
//   debugger
// });

PLAYLIST_KEY = "bandcamp_utils_playlist_items"
$playlist_items = $("#playlist-items")

function getPlaylistItems () {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get([PLAYLIST_KEY], (result) => {
      resolve(result[PLAYLIST_KEY] || {content: []})
    })
  })
}

document.getElementById('load-playlist').addEventListener('click', (e) => {
  getPlaylistItems().then((items) => {
    (items.content).forEach((item) => {
      $li = $("<li>").text(item.href)
      $playlist_items.append($li)
    })
  })
});

document.getElementById('clear-playlist').addEventListener('click', (e) => {
  obj = {}
  obj[PLAYLIST_KEY] = {}
  chrome.storage.sync.remove(PLAYLIST_KEY, (result) => {})
});


// chrome.extension.sendMessage({params, msgType}, (apiResponse) => {
// })

// chrome.extension.onMessage.addListener(
//   function({params, msgType}, sender, sendResponse) {
//     debugger
//   }
// )

