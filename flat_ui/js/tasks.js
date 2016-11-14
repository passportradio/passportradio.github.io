var tasksApp = (function(global, $, undefined){

    var data_tasks = {
      	"tasks": [{
      		"id": "1_todo",
      		"value": "Сходить в магазин",
      		"checked": "checked"
      	}, {
      		"id": "2_todo",
      		"value": "Помыть посуду",
      		"checked": ""
      	}, {
      		"id": "3_todo",
      		"value": "Приготовить ужин",
      		"checked": ""
      	}, {
      		"id": "4_todo",
      		"value": "Отремонтировать машину",
      		"checked": "checked"
      	}, {
      		"id": "5_todo",
      		"value": "Позвонить родителям",
      		"checked": "checked"
      	}, {
      		"id": "6_todo",
      		"value": "Сходить в спортзал",
      		"checked": ""
      	}]
    };
    var data_events = {
      	"events": [{
      		"location": "Москва",
      		"value": "Событие 1",
      	}, {
      		"location": "Москва",
      		"value": "Событие 2",
      	}, {
      		"location": "Москва",
      		"value": "Событие 3",
      	}]
    };

    // cache Dom
    var $tasks = $(".tasks");
    var $item_control = $('.tasks__control-item');
    var $item_content = $(".tasks__content-item");
    var data_attr_control = "data-task-control";
    var data_attr_content = "data-task-content";
    var control_activeClass = "tasks__control-item_active";
    var content_activeClass = "tasks__content-item_active";
    var $todo_list = $(".todo");
    var template_task = $("#template-task").html();
    var $todo_items = $(".todo__item");
    var task_canvas_class = "tasks__completed-pie";
    var $el_total_task_completed = $(".tasks__data-completed");
    var $el_input_task = $(".todo__add-input");
    var $events_list = $('.list-events');
    var template_event = $("#template-event").html();
    var $el_input_event = $(".list-events__add-input");
    var $geo_position = $("#js_geo_city");

    render();

    // bind Event
    $item_control.on("click", toogleTabs);
    $el_input_task.on('keyup', addTask);
    $el_input_event.on('keyup', addEvent);
    $tasks.on('click', '.todo__checkbox', toogleChecked);
    events.on('addCustomEvent', addNewEvent);

    function addNewEvent(data) {
        addEvent(null, data);
    }

    function toogleTabs(event) {
        var data_class = $(this).attr(data_attr_control);

        removeEachClass($item_control, control_activeClass);
        $(this).addClass(control_activeClass);

        removeEachClass($item_content, content_activeClass);
        $item_content.filter("["+data_attr_content+"="+data_class+"]").addClass(content_activeClass);

        getTaskCompleted();
    };

    function toogleChecked(event) {
        var $el = $(event.target);
        var el_id = parseInt($el.attr('id'))-1;

        if($el.prop("checked")) {
            data_tasks.tasks[el_id].checked = "checked";
        } else {
            data_tasks.tasks[el_id].checked = "";
        };
    };

    function addTask(event){
        var $el = $(event.target);


        if(event.keyCode == 13 && $el.val().length){
            data_tasks.tasks.push({
                "id": (data_tasks.tasks.length+1)+"_todo",
                "value": $el.val(),
                "checked": ""
            });
            $el.val("");
            render();
        }
        $el.closest($item_content).scrollTop($todo_list.height());
        return false;
    };

    function addEvent(event, data) {

        if(event) {
            var $el = $(event.target);
            if(event.keyCode == 13 && $el.val().length){
                data_events.events.push({
                    "location": $geo_position.text(),
                    "value": $el.val(),
                });
                $el.val("");
            }
            render();
            $el.closest($item_content).scrollTop($events_list.height());
        } else {
            data_events.events.push({
                "location": data.location,
                "value": data.text,
            });
            render();
        }
        return false;
    };

    function removeEachClass($selectors, class_remove) {
        $selectors.each(function(){
          if($(this).hasClass(class_remove)) {
            $(this).removeClass(class_remove);
          }
        });
    };

    function getTaskCompleted() {
        var item_completed = 0,
            totalItem = $(".todo__item").length,
            total_comoleted;

        $todo_list.find("input").each(function(){
          if($(this).is(':checked')) item_completed++;
        });

        total_completed = Math.floor(100/totalItem * item_completed);
        $el_total_task_completed.text(total_completed);
        drowChart(task_canvas_class, total_completed);
    }

    function drowChart(el_container, n_completed) {

        $(".chartjs-hidden-iframe").remove();

        var data = {
          datasets: [{
            data: [n_completed, 100-n_completed],
            backgroundColor: ["#14b9d6", "#fff"],
            pointHoverBackgroundColor: "#000"
          }],
          labels: ["Completed", "Pending"]
        };

        var options = {
          elements: {
            arc: { borderWidth: 0, }
          },
          responsive: false,
          legend: { display: false },
          tooltips: { enabled: false },
          cutoutPercentage: 80
        };

        var myChart = document.getElementsByClassName(el_container);
        var myDoughnutChart = new Chart(myChart, {
          type: 'doughnut',
          data: data,
          options: options
        });

        $(".tasks__completed-pie").attr({
            width: "200",
            height: "200"
        });

        console.log(myDoughnutChart);
    };

    function render() {
        $todo_list.html(Mustache.render(template_task, data_tasks));
        $events_list.html(Mustache.render(template_event, data_events));
        getTaskCompleted();
    }

    return {
        removeEachClass: removeEachClass,
    }

})(this, jQuery);
