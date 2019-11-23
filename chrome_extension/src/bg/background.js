// if you checked "fancy-settings" in extensionizr.com, uncomment this lines

// var settings = new Store("settings", {
//     "sample_setting": "This is how you use Store.js to remember values"
// });


//example of using a message handler from the inject scripts
chrome.extension.onMessage.addListener(
  function(request, sender, sendResponse) {
  	// chrome.pageAction.show(sender.tab.id);
    fetch(`http://localhost:4567/album?url=${request.href}`)
    .then(r => r.text())
    .then(result => {
      // sendResponse("ASD");
      sendResponse(result);
    })

    // Inform Chrome that we will make a delayed sendResponse
    // https://github.com/mozilla/webextension-polyfill/issues/130#issuecomment-484772327
    return true
  }
);
