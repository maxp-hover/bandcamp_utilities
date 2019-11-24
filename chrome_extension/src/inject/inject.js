State = {
  albums: {}
}

function lookupAlbum ({$presenterBox, href, album, artist}) {
  return new Promise((resolve, reject) => {
    stateKey = `${album}-${artist}`
    albumState = State.albums[stateKey]
    if (!albumState) { albumState = State.albums[stateKey] = {} }
    console.dir(stateKey)
    console.dir(State.albums)
    switch(albumState.lookupState) {
      case "loaded":
        console.log("loaded")
        resolve({$presenterBox, responseObj: albumState.data})
        break;
      case "pending":
        console.log("pending")
        // don't call resolve, a separate invocation of this method
        // is already running
        break;
      case undefined:
        console.log("undefined")
        State.albums[stateKey].lookupState = "pending"
        chrome.extension.sendMessage({href: href}, (apiResponse) => {
          responseObj = JSON.parse(apiResponse)
          if(responseObj == "undefined") { return } // TODO: remove
          State.albums[stateKey].lookupState = "loaded"
          console.log("finished loading")
          State.albums[stateKey].data = responseObj
          resolve({$presenterBox, responseObj})
        })
        break;
    }
  })
}

function showAlbumInfo ({$presenterBox, responseObj}) {
  $box = $(`<p>${responseObj.artist} : ${responseObj.album}</p>`)
  $presenterBox.append($box)
}

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

function addListeners () {
  $(".item").on("mouseenter", (e) => {
    // Need a single parent element
    // $el = $("<div>").append($(e.currentTarget))
    $presenterBox = $(e.currentTarget).filter(".item")
    $link = $presenterBox.find("a").eq(0)
    href = $link.attr("href")
    album = $link.find(".title").text()
    artist = $link.find(".artist").text().trim()

    lookupAlbum({$presenterBox, href, album, artist})
    .then(showAlbumInfo)
  })
}

waitForPageReady().then(addListeners)
