var response;

$('input#submit-query').click(function(e) {
	e.preventDefault();

	var start = $('input#start-node');
	var end = $('input#end-node');

	var node1 = start.val();
	var node2 = end.val();

	start.val('');
	end.val('');
	$('svg').remove();

	$.get(
		"/query",
		{'node1': node1, 'node2': node2},
		function(data) {
			console.log("successful query!");
			response = JSON.parse(data);
			drawGraph(response);
		});

});