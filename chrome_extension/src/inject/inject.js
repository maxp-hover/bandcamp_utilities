chrome.extension.sendMessage({}, function(response) {
	var readyStateCheckInterval = setInterval(function() {
	if (
    document.readyState === "complete"
  ) {
		clearInterval(readyStateCheckInterval);
    cells = document.querySelectorAll(".item")
    cells.forEach((cell) => {
      cell.addEventListener("mouseenter", (e) => {
        link = e.currentTarget.querySelector(".item a")
        href = link.getAttribute("href")

        // chrome.runtime.sendMessage({greeting: "hello"}, function(response) {
        //   console.log(response.farewell);
        // });
        chrome.extension.sendMessage(
          {href: href},
          function(response) {
            responseObj = JSON.parse(response)
            if(responseObj == "undefined") { return }
            debugger
            // console.log(responseObj.data);
          }
        );
      })
    })
	}
	}, 10);
});
