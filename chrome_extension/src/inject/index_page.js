State = {
  albums: {}
}

function lookupAlbum ({$presenterBox, href, album, artist}) {
  return new Promise((resolve, reject) => {
    stateKey = `${album}-${artist}`
    albumState = State.albums[stateKey]
    if (!albumState) { albumState = State.albums[stateKey] = {} }

    if (!albumState.lookupState) {
      State.albums[stateKey].lookupState = "pending"
      params = {href, album, artist}
      msgType = "lookupAlbum"
      chrome.extension.sendMessage({params, msgType}, (apiResponse) => {
        responseObj = JSON.parse(apiResponse)
        if(responseObj == "undefined") { return } // TODO: remove
        State.albums[stateKey].lookupState = "loaded"
        console.log("finished loading")
        State.albums[stateKey].data = responseObj
        resolve({$presenterBox, responseObj})
      })
    }
  })
}

function addToPlaylist ({$presenterBox, responseObj}) {
  $presenterBox.find("extension-album-info-box").addClass("in-user-wishlist")
  chrome.extension.sendMessage(
    {
      params: responseObj,
      msgType: "addToPlaylist"
    },
    (apiResponse) => {
      if (apiResponse.error) {
        alert(apiResponse.error)
      } else {
        alert(`added ${responseObj.artist} - ${responseObj.album}`);
      }
    }
  )
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

function showAlbumInfo ({$presenterBox, responseObj}) {
  inWishlist = $presenterBox.find(".wishlist-msg")[0].offsetParent === null
  formattedTime = formatTime(responseObj.total_seconds)
  $box = $(`<div></div>`)
  $time = $(`<div class='time'>${formattedTime}</div>`)
  $box.append($time)
  $playlistBtn = $(`<button class='addToPlaylistBtn'>Add</button>>`)
  $box.append($playlistBtn)
  $playlistBtn.on("click", (e) => {
    addToPlaylist({$presenterBox, responseObj})
  })
  $box.append($(`<br>`))
  responseObj.tags.forEach((tag) => {
    tagLink = `https://bandcamp.com/tag/${tag.replace(" ", "-")}`
    $box.append($(`<a href='${tagLink}' class='tag'>${tag}</a>`))
  })
  $box.addClass("extension-album-info-box")
  if (inWishlist) { $box.addClass("in-user-wishlist") }
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
  $("body").on("mouseenter", ".item", (e) => {
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
