$(function(){

/*--- Открытие модального окна ---*/
	var scrollbarWidth=function(){var a,b,c;if(c===undefined){a=$('<div style="width:50px;height:50px;overflow:auto"><div/></div>').appendTo('body');b=a.children();c=b.innerWidth()-b.height(99).innerWidth();a.remove()}return c};
		scrollbarWidth = scrollbarWidth();

	$(document).on('click', '#openWindowPay', function(event){
		$('.modal-window').addClass('open').animate({'opacity':'0.7'},300);
		$('.pay-window').addClass('open').animate({'opacity':'1'},300);
		$('body').css('overflow','hidden').bind('touchmove',function(){return false});

		if ( window.innerHeight < document.body.scrollHeight ) {
			$('body').css({paddingRight: scrollbarWidth});
		};
	});

	$(".modal-window, .pay-window-close").on('click', function(event){
			$('.pay-window,.modal-window').animate({'opacity':'0'},300);
			setTimeout(function(){
				$('.pay-window,.modal-window').removeClass('open');
				$('body').css('overflow','auto').unbind('touchmove');

				if ( window.innerHeight < document.body.scrollHeight ) {
					$('body').css({paddingRight: '0'});
				};
			}, 300);
	});


/*--- Перемещение рамки ---*/
	$(".subscription_choose input").on('click', function(event){

		var dataTarget = $(event.currentTarget).attr('data-checked');
		var border = $('.subscription_choose-border');

		function moveBorder(percent){
			border.css({
				'left' : percent+'%',
				});
		}
		switch (+dataTarget) {
		case 1:
		  moveBorder(10)
			break;
		case 2:
		  moveBorder(30)
			break;
		case 3:
		  moveBorder(50)
			break;
		case 4:
		  moveBorder(70)
			break;
		case 5:
		  moveBorder(90)
			break;
		}
	});
	
/*--- Пересчет сумм ---*/
	
	function totalMain(){
		var salesCheck = $('.subscription_choose input:checked ~ .subscription_time_off');
		var totalCheck = $('.subscription_choose input:checked ~ .subscription_time_total');
		$('.total-result').text($(totalCheck).text().replace(/(\d)(?=(\d\d\d)+([^\d]|$))/g, '$1 '));
		$('.total-off').text($(salesCheck).text());
		
		var numberTotal = totalCheck.text().replace(/\D/g, '');
		var numberSales = salesCheck.text().replace(/\D/g, '');
		var resultTotal = numberTotal-numberSales;
		resultTotal = '$'+resultTotal;
		resultTotal = resultTotal.replace(/(\d)(?=(\d\d\d)+([^\d]|$))/g, '$1 ');
		$('.pay-window-total-result').text(resultTotal);
		$('.pay-window-total-off').text($(salesCheck).text());
	}
	totalMain();
	
	function calculationCost (lisenses){

		var costOneLisenses = 15;
		var arrSales = $('.subscription_time .subscription_time_off');
		var arrTotal = $('.subscription_time .subscription_time_total');

		for(i = 0;arrSales.length > i;i++){
			$(arrSales[i]).text('$'+lisenses*$(arrSales[i]).attr('data-salesmonth')+' off');
		};
		for(i = 0;arrTotal.length > i;i++){
			$(arrTotal[i]).text('$'+lisenses*costOneLisenses*$(arrTotal[i]).attr('data-totalmonth'));
		};
		
	}
	
	$('#addLisenses, #delLisenses').on('click',function(event){
		function countLisenses(x){
			var count = $('#costLisenses').text();
			if(x.attr('id') == 'delLisenses' && count == '3') return count;
			if(x.attr('id') == 'delLisenses') return --count;
			if(x.attr('id') == 'addLisenses') return ++count;
		}
		var numberOfLisenses = countLisenses($(event.currentTarget));
		$('#costLisenses').text(numberOfLisenses);
		calculationCost(numberOfLisenses);
		
		//Сумма к оплате
		totalMain();
	});
	// Выбор скрока лицензии
	$('.subscription_time input').on('change', function(event){
			totalMain();
		});
		
	//Скрыть данные новой карты
		$('.newDataCard').css('display','none');
		$('.card-data').on('change', function(){
			var cardVal = $('input[name="select-card"]:checked').val();
			if(cardVal == 1){
				$('.newDataCard').slideUp(300);
			} else if(cardVal == 2){
				$('.newDataCard').slideDown(300);
			}
		});
/*---  Ограничение формы ---*/
	function onlyNumbers(elem){
		if (elem.value.match(/[^0-9]/g)) {
					elem.value = elem.value.replace(/[^0-9]/g, '');
			};
	};
	function noMoreNumbers(elem, max){
			if($(elem).val().length > max){
        $(elem).val($(elem).val().substr(0, max));
			};
	};
	function cardDataName(){
				return /^[a-zA-Z]{2,}\s[a-zA-Z]{2,}$/g.test($('.card-data-name').val()) === true
			};
	function maxNumbers(elem, max){
			if($(elem).val() > max){
        $(elem).val($(elem).val().length-1);
      };
	};
	function onlyS(elem){
		if (elem.value.match(/[^a-zA-Z]\s[a-zA-Z]/g)) {
					elem.value = elem.value.replace(/[^a-zA-Z]\s[a-zA-Z]/g, '');
			};
	};
	
	//Номер карты
	$(".card-data-number").bind("input", function() {
			onlyNumbers(this);
			noMoreNumbers(this,19);
	});
	//Месяц
	$(".card-data-month").bind("input", function() {
			onlyNumbers(this);
			noMoreNumbers(this,2);
			maxNumbers(this,12);
	});
	//Год
	$(".card-data-year").bind("input", function() {
			onlyNumbers(this);
			noMoreNumbers(this,2);
	});
	//CVV
	$(".card-data-cvv").bind("input", function() {
			onlyNumbers(this);
			noMoreNumbers(this,3);
	});
	$('.me-data-card').bind('click',function(){
		$('.card-data-btn-checkout').removeAttr("disabled");
	})
	$('.newDataCard,.card-data-new-card').bind("click change", function() {
			if(
					$('.card-data-number').val().length > 0 &&
					$('.card-data-month').val().length > 0 &&
					$('.card-data-year').val().length > 0 &&
					$('.card-data-cvv').val().length > 0 &&
					cardDataName() === true &&
					$('.reccurement-payment input').prop('checked') === true
					){
				$('.card-data-btn-checkout').removeAttr("disabled");
				}
				else{
					$('.card-data-btn-checkout').attr("disabled","disabled");
				};
		});
});