var dashboardApp = (function(global, $, undefined) {

  $( ".column1, .column2, .column3"  ).sortable({
    connectWith: ".column"
  }).disableSelection();

})(this, jQuery);
