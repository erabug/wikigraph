// this object will be populated once the user inputs two pages
// CODES = {
//             'node1': {'code': '', 'title': ''},
//             'node2': {'code': '', 'title': ''}
//         };
CODES = {};
// establish variables for the json response and the two image objects
var response;
var queryImages = {}; // an object to pass information to the graph
var imageURLs = []; // an array so it will retain order

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

pageNames.initialize(); // initialize the bloodhound

function clear_all() {
    
    // CODES = {
    //             'node1': {'code': '', 'title': ''},
    //             'node2': {'code': '', 'title': ''}
    //         };
    CODES = {};

    $('input#start-node').val('');
    $('input#end-node').val('');
    $('.details').html('');
    $('svg').remove();
    queryImages = {};
}

function clear_partial() {
    $('.details').html('');
    $('svg').remove();
    queryImages = {};
}

function getThumbnail(pageObject, pageKey) {
    var page = pageObject[pageKey];
    var title = page['title'];

    var thumbnail, thWidth, thHeight;
    if ('thumbnail' in page) { // if wikipedia query returned a thumbnail
        thumbnail = page['thumbnail']['source'];
        thWidth = page['thumbnail']['width'];
        thHeight = page['thumbnail']['height'];
    } else { // else returns grumpycat
        thumbnail = '../static/images/cat.jpg';
        thWidth = 100;
        thHeight = 100;
    }

    var response = {'title': title,
                    'thumbnail': thumbnail,
                    'width': thWidth,
                    'height': thHeight};
    return response;
}

function addImage(item, node) {
    queryImages[item.title] = {'url': item.thumbnail,
                               'id': node,
                               'height': item.height,
                               'width': item.width};
}

function addQueryImages(data) {

    var pageObject = data['query']['pages'];
    var htmlSnippets = {};

    Object.keys(pageObject).forEach(function(pageKey) {

        item = getThumbnail(pageObject, pageKey);

        if (item.title == CODES['node1']['title']) {node = 0;} else {node = 1;}

        html = makeHTMLSnippet(node, item.thumbnail, item.title);
        htmlSnippets[node] = html;

        addImage(item, node);
        imageURLs[node] = {'title': item.title,
                           'thumbnail': item.thumbnail};

    });
    return htmlSnippets;
}

function addPathImages(data, innerNodes) {

    var pageObject = data['query']['pages'];
    var counter = 1;

    Object.keys(pageObject).forEach(function(pageKey) {
        item = getThumbnail(pageObject, pageKey);
        addImage(item, counter);
        counter = counter + 1;
    });
   
}

function makeHTMLSnippet(node, thumbnail, title) {
    html = '<div class="page" id="page'+node.toString()+'">'+
           '<div class="squareimg"><img src='+thumbnail+'></div>';
           // +'<div class="page-title">'+title+'</div></div>';
    return html;
}

function makeQueryURL(numPages, pagesParams) {
    var queryURL = 'http://en.wikipedia.org/w/api.php' +
                   '?action=query&format=json&redirects&prop=pageimages&' +
                   'pithumbsize=100px&pilimit=' + numPages + '&titles=' +
                   pagesParams + '&callback=?';
    return queryURL;
}

function decodeInput(d, node) {
    CODES[node] = {'title': d.value, 'code': d.code.toString()};
}

function query() {
    clear_partial();
    var pagesParams = CODES['node1']['title'] + '|' + CODES['node2']['title'];
    var queryURL = makeQueryURL(numPages=2, pagesParams);
    // console.log('USER INPUT:', pagesParams);
    var path = $('.details');

    $.getJSON(
        queryURL, // get the start/end images from wikipedia API
        function(data) {

            var htmlSnippets = addQueryImages(data); 
            // for each item in the sorted list, append its html to the path div
            Object.keys(htmlSnippets).forEach(function(node) {
                path.append(htmlSnippets[node]);
            });
            // insert a load animation gif in between the two floating heads
            $('#page0').after('<div class="page arrow loading" id="arrow1"></div>');
                
        });

    $.get(
        '/query',
        {'node1': CODES['node1']['code'], 'node2': CODES['node2']['code']},
        function(data) {

            response = JSON.parse(data); // decode the JSON
            // $('.arrow').removeClass('loading'); // change arrow img
            path.html('');
            // $('.arrow').html("&#8594;");

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
                        // move the second query page to the last position
                        queryImages[CODES['node2']['title']]['id'] = response['path'].length - 1;
                        addPathImages(data, innerNodes); //updates queryImages
                        console.log('queryImages:',queryImages);

                        drawGraph(response['results']); // graph the results
                        // makeTooltip();

                    });
            } else {
                // make sure it will still graph results for two-node paths
                drawGraph(response['results']); // graph the results
            }

        });
}

$(document).ready(function(e) {
    clear_all();
});

$('input#random-query').click(function(e) {
    $.get('/random',
        function(data) {
            var n1 = data.results[0];
            var n2 = data.results[1];

            CODES['node1'] = {'title': n1.title, 'code': n1.code.toString()};
            CODES['node2'] = {'title': n2.title, 'code': n2.code.toString()};
            console.log("CODES", CODES);
            // insert it into the input?
            $('input#start-node').val(n1.title);
            $('input#end-node').val(n2.title);
            query();
        });
});

// event handler for the query submission
$('input#submit-query').click(function(e) {
	query();
});

// function makeTooltip() {
//     $('.node').click(function(e) {
//         console.log("click");
//     });
// }

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

$('input[type=text]').focus(function(){
    this.select();
});


