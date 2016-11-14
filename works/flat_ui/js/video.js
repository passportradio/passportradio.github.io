var videoPlayer = (function(global, $, undefined){

  // cache Dom
  var $video = $(".js_video"),
      video = $video[0],
      $playpause = $(".js_playpause"),
      $playpausebig = $(".js_play"),
      $total = $(".v-player__total"),
      $buffered = $(".v-player__progress"),
      $progress = $(".v-player__current"),
      $dynamic = $(".vplayer__volume");

  // bind Events
      $playpause.add(video).on('click', tooglePause);
      $video.on("ended", videoStop);
      $video.on("timeupdate", updateBar);
      $total.on("click", moveProgress);
      $dynamic.on("click", videoMute);

  function togglePlayback() {
    if(video.paused) {
      video.play()
      $playpausebig.css("display", "none");
    } else {
      video.pause()
      $playpausebig.css("display", "block");
    };
  };

  function tooglePause() {
    if (video.paused) {
        togglePlayback();
        $playpause.text("");
    } else {
        togglePlayback();
        $playpause.text("");
    }
  };

  function togglePlayback() {
    if(video.paused) {
      video.play()
      $playpausebig.css("display", "none");
    } else {
      video.pause()
      $playpausebig.css("display", "block");
    };
  };

  function updateBar() {
    var progress = Math.floor(video.currentTime) / Math.floor(video.duration);
    $progress[0].style.width = Math.floor(progress * $total.width()) + "px";
  };


  function moveProgress(event) {
    var x = (event.pageX-$(event.target).offset().left)/$(event.target).width();
    video.currentTime = x * video.duration;
  };

  function videoMute() {
    var classes = event.target.getAttribute("class");

    if (new RegExp('\\bvplayer__volume_off\\b').test(classes)) {
        classes = classes.replace(" vplayer__volume_off", "");
    } else {
        classes = classes + " vplayer__volume_off";
    }

    event.target.setAttribute("class", classes);
    video.muted = !video.muted;
  };

  function videoStop() {
    video.pause();
    $playpause.text("");
  };

  return {
    videoMute: videoMute
  }

})(this, jQuery);
