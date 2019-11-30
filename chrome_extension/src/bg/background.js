// if you checked "fancy-settings" in extensionizr.com, uncomment this lines

// var settings = new Store("settings", {
//     "sample_setting": "This is how you use Store.js to remember values"
// });


// BACKEND_HOST = "https://bandcamp-utils-backend.herokuapp.com"
BACKEND_HOST = "http://localhost:4567"
PLAYLIST_KEY = "bandcamp_utils_playlist_items"

function lookupAlbum ({params}) {
  var url = new URL(`${BACKEND_HOST}/lookup_album`)
  Object.keys(params).forEach((key) => {
    url.searchParams.append(key, params[key])
  })

  return fetch(url.href).then(r => r.text())
}

function getPlaylistItems () {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([PLAYLIST_KEY], (result) => {
      resolve(result[PLAYLIST_KEY] || {content: []})
    })
  })
}

function addToPlaylist ({params}) {
  return new Promise((resolve, reject) => {
    getPlaylistItems().then((items) => {
      items.content.push(params)
      obj = {}
      obj[PLAYLIST_KEY] = items
      chrome.storage.local.set(obj, () => {
        resolve()
      })
    })
  })
}

//example of using a message handler from the inject scripts
chrome.extension.onMessage.addListener(
  function({params, msgType}, sender, sendResponse) {

    if (msgType == "lookupAlbum") {
      lookupAlbum({params})
      .then(response => {
        sendResponse(response);
      })
    } else if (msgType == "addToPlaylist") {
      addToPlaylist({params}).then(() => {
        sendResponse("ok")
    })
    } else {
      sendResponse("page is ready")
    }

    // Inform Chrome that we will make a delayed sendResponse
    // https://github.com/mozilla/webextension-polyfill/issues/130#issuecomment-484772327
    return true
  }
);

chrome.webNavigation.onCompleted.addListener(function(details) {
    chrome.storage.local.get(
      ['playlist_data'],
      ({playlist_data}) => {
        debugger
        if (
          (details.tabId == playlist_data.playlist_tab_id) &&
          details.url == `${BACKEND_HOST}/player`
          // new URL(details.url).host == new URL(playlist_data.playlist_host_url).host
        ) {
          debugger
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
    // chrome.tabs.executeScript(details.tabId, {
    //     code: ' if (document.body.innerText.indexOf("Cat") !=-1) {' +
    //           '     alert("Cat not found!");' +
    //           ' }'
    // });
}, {
    // url: [{
    //     // Runs on example.com, example.net, but also example.foo.com
    //     hostContains: '.example.'
    // }],
});
