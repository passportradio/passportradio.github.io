var statusBar = (function(global, $, undefined) {

// cache Dom
var $status_btn = $(".status__icon");
var $tabsClass = $(".status__content");
var tabsClass = ".status__content";
var active_class = "status__content_active";
var $el_city_loc = $("#js_geo_city");
var $el_date = $(".widjet__title_icon-cldr");
var $add_event_btn = $(".status__btn-add");
var $status_form = $(".status__list");
var $data_comment = $status_form.find(".status__coment-input");
var $data_location = $status_form.find(".status__location-input");

// bind Event
$status_btn.on("click", toogleSlide);
$add_event_btn.on("click", addCustomEvent);

render();

function addCustomEvent(event) {
    var text = $data_comment.val();
    var location = $data_location.val();

    if(location == '') {
        location = $el_city_loc.text();
    };

    var data_event = {
        text: text,
        location: location,
    };

    if(data_event.text !== '') {
        events.emit('addCustomEvent', data_event);
        $data_comment.val('');
        $data_location.val('');
    }
}

function toogleSlide(e) {
    tasksApp.removeEachClass($tabsClass, active_class);
    $(this).siblings(tabsClass).addClass(active_class);
};

function render() {
    getGeolocation($el_city_loc);
    getDate($el_date);
}

function getGeolocation($el_push_data) {
    var objPos = {};

    if(navigator.geolocation){
        navigator.geolocation.getCurrentPosition(
            function(position) {
                objPos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                }

                $.ajax({
                    url: 'https:\/\/maps.googleapis.com\/maps\/api\/geocode\/json?latlng='+objPos.lat+','+objPos.lng+'&key=AIzaSyBp2KTyiJDFtXA9EL3d_wdg1_0MGo9DvYw',
                    success: function(data){
                    objPos.city = data.results[0].address_components[2].long_name;
                    $el_push_data.text(objPos.city);
                    },
                });

            },
            function(){
                $el_push_data.text("Не найдено");
            });
    } else {
        $el_push_data.text("Не поддерживается");
    }
}

function getDate($el) {
    var date = new Date();
    var monthNameArr = {
        rus: [
            "Январь",
            "Февраль",
            "Март",
            "Апрель",
            "Май",
            "Июнь",
            "Июль",
            "Август",
            "Сентябрь",
            "Октябрь",
            "Ноябрь",
            "Декабрь"
        ],
        eng: [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December"
        ]
    }

    var d = date.getDay();
    var m = monthNameArr.rus[date.getMonth()];
    var y = date.getFullYear();

    $el.text(m+" "+d+", "+y);
}

})(this, jQuery);
