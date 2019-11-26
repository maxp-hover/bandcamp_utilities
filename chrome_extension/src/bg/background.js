// if you checked "fancy-settings" in extensionizr.com, uncomment this lines

// var settings = new Store("settings", {
//     "sample_setting": "This is how you use Store.js to remember values"
// });


//example of using a message handler from the inject scripts
chrome.extension.onMessage.addListener(
  function({params, msgType}, sender, sendResponse) {

    if (msgType == "lookupAlbum") {
      var url = new URL("http://localhost:4567/lookup_album")
      Object.keys(params).forEach((key) => {
        url.searchParams.append(key, params[key])
      })

    	// chrome.pageAction.show(sender.tab.id);

      fetch(url.href)
      .then(r => r.text())
      .then(result => {
        sendResponse(result);
      })
    } else if (msgType == "addToPlaylist") {
      sendResponse("added!")
    } else {
      sendResponse("page is ready")
    }

    // Inform Chrome that we will make a delayed sendResponse
    // https://github.com/mozilla/webextension-polyfill/issues/130#issuecomment-484772327
    return true
  }
);
