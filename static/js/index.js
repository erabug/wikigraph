var response;

c = { 'node1': { 'code': '', 'title': '' },
      'node2': { 'code': '', 'title': '' } };

// tells typeahead how to handle the user input (e.g. the get request params)
var pageNames = new Bloodhound({
    datumTokenizer: function(d) {
        return Bloodhound.tokenizers.whitespace(d.value);
    },
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    limit: 30,
    remote: {
        url: '/page-names?query=%QUERY',
        filter: function(pageNames) {
            // Map the remote source JSON array to a JavaScript array
            return $.map(pageNames.results, function(page) {
                return {
                    value: page.title,
                    code: page.code
                };

            });
        }
    }
});

pageNames.initialize();

function clear_all() {
    $('input#start-node').val('');
    $('input#end-node').val('');
    $('.path').html('');
    $('svg').remove();
}

function makeHTMLSnippets(data, innerNodes) {

    var pageObject = data['query']['pages'];
    var htmlSnippets = {};

    Object.keys(pageObject).forEach(function(pageKey) {

        var page = pageObject[pageKey];
        var title = page['title'];

        var thumbnail;
        if ('thumbnail' in page) { // if wikipedia query returned a thumbnail
            thumbnail = page['thumbnail']['source'];
        } else { thumbnail = '../static/images/cat.jpg'; } // else returns grumpycat

        // two different ways to define node, based on whether it's an init query
        var node;
        if (innerNodes === null) {
            if (title == c['node1']['title']) { node = 1; } else { node = 2; }
        } else { node = innerNodes.indexOf(title); }

        html = '<div class="page" id="page'+node.toString()+'">'+
               '<div class="squareimg"><img src='+thumbnail+'></div>'+
               '<div class="page-title">'+title+'</div></div>';

        htmlSnippets[node] = html;

    });

    return htmlSnippets;
}

function makeQueryURL(numPages, pagesParams) {
    var queryURL = 'http://en.wikipedia.org/w/api.php' +
                   '?action=query&format=json&redirects&prop=pageimages&' +
                   'pithumbsize=100px&pilimit=' + numPages + '&titles=' +
                   pagesParams + '&callback=?';
    return queryURL;
}

function decodeInput(d, node) {
    c[node]['code'] = d.code.toString();
    c[node]['title'] = d.value;
}

$(document).ready(function(e) {
    clear_all();
});

// event handler for the query submission
$('input#submit-query').click(function(e) {

	e.preventDefault();
    clear_all();

    var pagesParams = c['node1']['title'] + '|' + c['node2']['title'];
    var queryURL = makeQueryURL(numPages=2, pagesParams);
    console.log('USER INPUT:', pagesParams);

    $.getJSON(
        queryURL,
        function(data) {

            var htmlSnippets = makeHTMLSnippets(data, null);
            var path = $('.path');
            // for each item in the sorted list, append its html to the path div
            Object.keys(htmlSnippets).forEach(function(node) {
                path.append(htmlSnippets[node]);
            });

            // insert a load animation gif in between the two floating heads
            $('#page1').after('<div class="page arrow loading" id="arrow1"></div>');
                
        });

	$.get(
		'/query',
		{'node1': c['node1']['code'], 'node2': c['node2']['code']},
		function(data) {

			response = JSON.parse(data); // decode the JSON
			drawGraph(response['results']); // graph the results
            $('.arrow').removeClass('loading'); // change arrow img

            console.log('RETURNED PATH:', response['path']);
            // // remove the start and end nodes from innerNodes
            var innerNodes = response['path'].slice(1, -1);

            if (0 < innerNodes.length) { // if there are intermediary nodes

                var numPages = innerNodes.length;
                var pagesParams;
                if (numPages > 1) {
                    pagesParams = innerNodes.join('|');
                } else { pagesParams = innerNodes; }

                var queryURL = makeQueryURL(numPages, pagesParams);

                $.getJSON(
                    queryURL,
                    function(data) {

                        var htmlSnippets = makeHTMLSnippets(data, innerNodes);

                        var stuff = '';
                        Object.keys(htmlSnippets).forEach(function(snippet, i) {
                            stuff = stuff+htmlSnippets[i];
                        });

                        $('#arrow1').after(stuff+'<div class="page arrow"></div>');
                        
                    });
            }
            
		});
    
});


// sets up the typeahead on the two input fields
$('.scrollable-dropdown-menu .typeahead').typeahead(null, {
    name: 'pageNames',
    displayKey: 'value',
    source: pageNames.ttAdapter()
});

// records the values chosen for each field as a global var
$('#start-node').on('typeahead:selected typeahead:autocompleted', function (e, d) {
    decodeInput(d, 'node1');
});

$('#end-node').on('typeahead:selected typeahead:autocompleted', function (e, d) {
    decodeInput(d, 'node2');
});