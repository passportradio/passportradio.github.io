var clock = (function(global, $, undefined){

    function getTime() {

        var $el_hour = $(".clock__hour");
        var $el_min = $(".clock__min");
        var $el_sec = $(".clock__sec");

        var date = new Date();
        var h = date.getHours();
        var m = date.getMinutes();
        var s = date.getSeconds();

        if (h < 10) {h = "0"+h;}
        if (m < 10) {m = "0"+m;}
        if (s < 10) {s = "0"+s;}

        $el_hour.text(h);
        $el_min.text(m);
        $el_sec.text(s);
    }

    setInterval(getTime.bind(this), 1000);

})(this, jQuery);
